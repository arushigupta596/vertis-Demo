#!/usr/bin/env python3
"""
OCR-based table extraction for tables missed by Camelot
Uses Tesseract OCR to extract tables from PDF pages
"""

import sys
import json
import pdfplumber
from PIL import Image
import pytesseract
import pdf2image
from typing import List, Dict, Any, Optional
import re


def get_page_text_lines(pdf_path: str, page_num: int) -> List[Dict[str, Any]]:
    """
    Extract all text lines from a PDF page with coordinates

    Args:
        pdf_path: Path to PDF file
        page_num: Page number (1-indexed)

    Returns:
        List of text lines with y-coordinates
    """
    lines = []

    try:
        with pdfplumber.open(pdf_path) as pdf:
            if page_num > len(pdf.pages):
                return lines

            page = pdf.pages[page_num - 1]

            # Get all text with coordinates
            words = page.extract_words(x_tolerance=3, y_tolerance=3)

            # Group words into lines by y-coordinate
            current_line = []
            current_y = None
            tolerance = 5  # pixels

            for word in sorted(words, key=lambda w: (w['top'], w['x0'])):
                if current_y is None or abs(word['top'] - current_y) > tolerance:
                    if current_line:
                        lines.append({
                            'text': ' '.join([w['text'] for w in current_line]),
                            'y': current_y
                        })
                    current_line = [word]
                    current_y = word['top']
                else:
                    current_line.append(word)

            # Add last line
            if current_line:
                lines.append({
                    'text': ' '.join([w['text'] for w in current_line]),
                    'y': current_y
                })

    except Exception as e:
        print(f"Error extracting text lines: {e}", file=sys.stderr)

    return lines


def get_context_lines(lines: List[Dict[str, Any]], target_y: float,
                      lines_count: int = 20, direction: str = 'above') -> List[str]:
    """
    Get context lines above or below a target y-coordinate

    Args:
        lines: List of text lines with y-coordinates
        target_y: Target y-coordinate
        lines_count: Number of lines to extract
        direction: 'above' or 'below'

    Returns:
        List of context lines
    """
    if direction == 'above':
        context_lines = [l for l in lines if l['y'] < target_y]
        context_lines.sort(key=lambda l: l['y'], reverse=True)
        result = [l['text'] for l in context_lines[:lines_count]]
        result.reverse()  # Correct order
        return result
    else:  # below
        context_lines = [l for l in lines if l['y'] > target_y]
        context_lines.sort(key=lambda l: l['y'])
        return [l['text'] for l in context_lines[:lines_count]]


def detect_table_regions_with_ocr(pdf_path: str, page_num: int, dpi: int = 300) -> List[Dict[str, Any]]:
    """
    Use OCR to detect potential table regions on a page

    Args:
        pdf_path: Path to PDF file
        page_num: Page number (1-indexed)
        dpi: Resolution for image conversion

    Returns:
        List of detected table regions with OCR text
    """
    table_regions = []

    try:
        # Convert PDF page to image
        images = pdf2image.convert_from_path(
            pdf_path,
            first_page=page_num,
            last_page=page_num,
            dpi=dpi
        )

        if not images:
            return table_regions

        image = images[0]

        # Perform OCR with layout preservation
        ocr_data = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT)

        # Detect table-like structures (blocks with multiple columns)
        # Group text by blocks
        blocks = {}
        for i in range(len(ocr_data['text'])):
            if int(ocr_data['conf'][i]) > 30:  # Confidence threshold
                block_num = ocr_data['block_num'][i]
                if block_num not in blocks:
                    blocks[block_num] = {
                        'texts': [],
                        'left': ocr_data['left'][i],
                        'top': ocr_data['top'][i],
                        'width': ocr_data['width'][i],
                        'height': ocr_data['height'][i]
                    }

                text = ocr_data['text'][i].strip()
                if text:
                    blocks[block_num]['texts'].append(text)
                    # Update bounding box
                    right = ocr_data['left'][i] + ocr_data['width'][i]
                    bottom = ocr_data['top'][i] + ocr_data['height'][i]
                    blocks[block_num]['width'] = max(blocks[block_num]['width'],
                                                     right - blocks[block_num]['left'])
                    blocks[block_num]['height'] = max(blocks[block_num]['height'],
                                                      bottom - blocks[block_num]['top'])

        # Filter blocks that look like tables (multiple rows/columns of data)
        for block_num, block_data in blocks.items():
            texts = block_data['texts']

            # Heuristic: Tables have numbers, multiple items, structured layout
            has_numbers = any(re.search(r'\d', t) for t in texts)
            has_multiple_items = len(texts) >= 6

            if has_numbers and has_multiple_items:
                # Combine all text from this block
                block_text = ' | '.join(texts)

                table_regions.append({
                    'page': page_num,
                    'bbox': (
                        block_data['left'],
                        block_data['top'],
                        block_data['left'] + block_data['width'],
                        block_data['top'] + block_data['height']
                    ),
                    'ocr_text': block_text,
                    'confidence': 0.6,  # OCR-based extraction has medium confidence
                    'extraction_method': 'ocr'
                })

    except Exception as e:
        print(f"Error in OCR table detection: {e}", file=sys.stderr)

    return table_regions


def extract_tables_with_ocr(pdf_path: str,
                            pages_to_process: Optional[List[int]] = None,
                            context_lines_count: int = 20,
                            document_id: int = 0) -> Dict[str, Any]:
    """
    Extract tables using OCR for pages where Camelot failed

    Args:
        pdf_path: Path to PDF file
        pages_to_process: List of page numbers to process (1-indexed), or None for all
        context_lines_count: Number of context lines to extract above/below
        document_id: Document ID to include in table IDs for uniqueness

    Returns:
        Dictionary with extracted tables and metadata
    """
    result = {
        'success': True,
        'tables': [],
        'page_count': 0,
        'errors': []
    }

    try:
        # Get page count
        with pdfplumber.open(pdf_path) as pdf:
            result['page_count'] = len(pdf.pages)

            # Determine which pages to process
            if pages_to_process is None:
                pages_to_process = list(range(1, len(pdf.pages) + 1))

        # Process each page
        for page_num in pages_to_process:
            print(f"Processing page {page_num} with OCR...", file=sys.stderr)

            # Get all text lines for context extraction
            all_lines = get_page_text_lines(pdf_path, page_num)

            # Detect table regions with OCR
            table_regions = detect_table_regions_with_ocr(pdf_path, page_num)

            for idx, region in enumerate(table_regions):
                # Use center of bbox for context extraction
                center_y = (region['bbox'][1] + region['bbox'][3]) / 2

                # Extract context lines
                context_above = get_context_lines(all_lines, region['bbox'][1],
                                                 context_lines_count, 'above')
                context_below = get_context_lines(all_lines, region['bbox'][3],
                                                 context_lines_count, 'below')

                # Classify table (simplified)
                table_name = classify_ocr_table(region['ocr_text'], context_above)

                # Create unique table ID with document ID
                table_id = f"doc{document_id}_ocr_p{page_num}_t{idx}"

                result['tables'].append({
                    'page': page_num,
                    'table_id': table_id,
                    'table_index_on_page': idx,
                    'table_name': table_name,
                    'ocr_text': region['ocr_text'],
                    'context_above_lines': context_above,
                    'context_below_lines': context_below,
                    'confidence': region['confidence'],
                    'extraction_method': 'ocr'
                })

    except Exception as e:
        result['success'] = False
        result['errors'].append(f"OCR extraction error: {str(e)}")

    return result


def classify_ocr_table(text: str, context_above: List[str]) -> str:
    """
    Classify OCR table type based on content
    """
    all_text = ' '.join(context_above + [text]).lower()

    patterns = [
        ('RATIOS', ['ratio', 'coverage', 'debt service', 'icr']),
        ('NDCF', ['ndcf', 'net distributable cash flow']),
        ('DISTRIBUTION', ['distribution', 'per unit', 'dpu']),
        ('P&L', ['profit', 'loss', 'income', 'revenue', 'expenses']),
        ('BALANCE_SHEET', ['assets', 'liabilities', 'equity', 'balance sheet']),
        ('FINANCIAL', ['financial', 'statement', 'quarter', 'year']),
    ]

    for name, keywords in patterns:
        if any(kw in all_text for kw in keywords):
            return name

    return 'UNKNOWN'


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({'success': False, 'error': 'PDF path required'}))
        sys.exit(1)

    pdf_path = sys.argv[1]

    # Optional: pages to process (comma-separated)
    pages_to_process = None
    if len(sys.argv) > 2 and sys.argv[2]:
        try:
            pages_to_process = [int(p.strip()) for p in sys.argv[2].split(',')]
        except:
            pass

    # Context lines count
    context_lines = int(sys.argv[3]) if len(sys.argv) > 3 else 20

    # Document ID
    document_id = int(sys.argv[4]) if len(sys.argv) > 4 else 0

    result = extract_tables_with_ocr(pdf_path, pages_to_process, context_lines, document_id)
    print(json.dumps(result, ensure_ascii=False))
