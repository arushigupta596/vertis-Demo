#!/usr/bin/env python3
"""
PDF Table Extraction using pdfplumber + Camelot
Supports lattice (primary) and stream (fallback) methods
"""

import sys
import json
import pdfplumber
import camelot
from typing import List, Dict, Any, Optional

def extract_context_lines(pdf_path: str, page_num: int, bbox: tuple, lines_count: int = 3) -> Dict[str, List[str]]:
    """
    Extract context lines above and below a table using pdfplumber text coordinates

    Args:
        pdf_path: Path to PDF file
        page_num: Page number (1-indexed)
        bbox: Bounding box (x0, y0, x1, y1)
        lines_count: Number of lines to extract above/below

    Returns:
        Dictionary with 'above' and 'below' lists of text lines
    """
    context = {'above': [], 'below': []}

    try:
        with pdfplumber.open(pdf_path) as pdf:
            if page_num > len(pdf.pages):
                return context

            page = pdf.pages[page_num - 1]

            # Get all text with coordinates
            words = page.extract_words(x_tolerance=3, y_tolerance=3)

            # Group words into lines by y-coordinate
            lines = []
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

            # Find lines above table (y < bbox[1])
            table_top_y = bbox[1]
            above_lines = [l for l in lines if l['y'] < table_top_y]
            above_lines.sort(key=lambda l: l['y'], reverse=True)
            context['above'] = [l['text'] for l in above_lines[:lines_count]]
            context['above'].reverse()  # Correct order

            # Find lines below table (y > bbox[3])
            table_bottom_y = bbox[3]
            below_lines = [l for l in lines if l['y'] > table_bottom_y]
            below_lines.sort(key=lambda l: l['y'])
            context['below'] = [l['text'] for l in below_lines[:lines_count]]

    except Exception as e:
        print(f"Error extracting context: {e}", file=sys.stderr)

    return context


def classify_table(table_data: List[List[str]], context_above: List[str]) -> str:
    """
    Classify table type based on content and context
    """
    all_text = ' '.join(context_above + [' '.join(row) for row in table_data]).lower()

    patterns = [
        ('RATIOS', ['ratio', 'coverage', 'debt service', 'icr']),
        ('NDCF', ['ndcf', 'net distributable cash flow']),
        ('DISTRIBUTION', ['distribution', 'per unit', 'dpu']),
        ('P&L', ['profit', 'loss', 'income', 'revenue', 'expenses']),
        ('BALANCE_SHEET', ['assets', 'liabilities', 'equity', 'balance sheet']),
    ]

    for name, keywords in patterns:
        if any(kw in all_text for kw in keywords):
            return name

    return 'UNKNOWN'


def detect_unit(table_data: List[List[str]], context_above: List[str]) -> Optional[str]:
    """
    Detect unit from table content and context
    """
    all_text = ' '.join(context_above + [' '.join(row) for row in table_data])

    unit_patterns = [
        ('₹ millions', ['₹ million', 'INR million', 'Rs. million']),
        ('₹ lakhs', ['₹ lakh', 'INR lakh', 'Rs. lakh']),
        ('₹ crores', ['₹ crore', 'INR crore', 'Rs. crore']),
        ('%', ['%', 'percent', 'percentage']),
        ('times', ['times', ' x ']),
        ('INR', ['₹', 'INR', 'Rs.']),
    ]

    for unit, patterns in unit_patterns:
        if any(p.lower() in all_text.lower() for p in patterns):
            return unit

    return None


def extract_periods(header_row: List[str]) -> List[str]:
    """
    Extract period labels from table header
    """
    periods = []

    for cell in header_row:
        if any(keyword in cell.lower() for keyword in ['quarter', 'year', 'month', 'fy', 'ended', '202']):
            periods.append(cell)

    return periods


def calculate_confidence(table_data: List[List[str]]) -> float:
    """
    Calculate confidence score for extracted table
    """
    if len(table_data) < 2:
        return 0.0

    score = 0.5  # Base score

    # More rows = higher confidence
    if len(table_data) >= 5:
        score += 0.1
    if len(table_data) >= 10:
        score += 0.1

    # Consistent column count
    col_counts = [len(row) for row in table_data]
    avg_cols = sum(col_counts) / len(col_counts)
    variance = sum((c - avg_cols) ** 2 for c in col_counts) / len(col_counts)

    if variance < 1:
        score += 0.2
    elif variance < 2:
        score += 0.1

    # Numeric data presence
    numeric_cells = sum(1 for row in table_data for cell in row if any(c.isdigit() for c in cell))
    total_cells = sum(len(row) for row in table_data)
    numeric_ratio = numeric_cells / total_cells if total_cells > 0 else 0

    if numeric_ratio > 0.3:
        score += 0.1

    return min(score, 1.0)


def extract_tables_from_pdf(pdf_path: str, context_lines_count: int = 3) -> Dict[str, Any]:
    """
    Extract all tables from PDF using Camelot (lattice + stream fallback)

    Args:
        pdf_path: Path to PDF file
        context_lines_count: Number of context lines to extract above/below each table

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

        # Try lattice method first (primary)
        try:
            lattice_tables = camelot.read_pdf(
                pdf_path,
                pages='all',
                flavor='lattice',
                line_scale=40,
                strip_text='\n'
            )

            for idx, table in enumerate(lattice_tables):
                page_num = table.page

                # Get bounding box
                bbox = (
                    table._bbox[0],
                    table._bbox[1],
                    table._bbox[2],
                    table._bbox[3]
                )

                # Extract context lines
                context = extract_context_lines(pdf_path, page_num, bbox, context_lines_count)

                # Convert table to list of lists
                table_data = table.df.values.tolist()

                # Skip empty tables
                if len(table_data) < 2:
                    continue

                # Classify and extract metadata
                table_name = classify_table(table_data, context['above'])
                unit = detect_unit(table_data, context['above'])
                periods = extract_periods(table_data[0] if table_data else [])
                confidence = calculate_confidence(table_data)

                # Add accuracy score from Camelot
                if hasattr(table, 'accuracy'):
                    confidence = (confidence + table.accuracy / 100) / 2

                result['tables'].append({
                    'page': page_num,
                    'table_index_on_page': idx,
                    'table_name': table_name,
                    'unit': unit,
                    'periods': periods,
                    'raw_table_grid': table_data,
                    'context_above_lines': context['above'],
                    'context_below_lines': context['below'],
                    'confidence': confidence,
                    'extraction_method': 'lattice'
                })

        except Exception as e:
            result['errors'].append(f"Lattice extraction error: {str(e)}")

        # Fallback to stream method if lattice found no tables or failed
        if len(result['tables']) == 0:
            try:
                stream_tables = camelot.read_pdf(
                    pdf_path,
                    pages='all',
                    flavor='stream',
                    edge_tol=50,
                    row_tol=10,
                    strip_text='\n'
                )

                for idx, table in enumerate(stream_tables):
                    page_num = table.page

                    # Get bounding box
                    bbox = (
                        table._bbox[0],
                        table._bbox[1],
                        table._bbox[2],
                        table._bbox[3]
                    )

                    # Extract context lines
                    context = extract_context_lines(pdf_path, page_num, bbox, context_lines_count)

                    # Convert table to list of lists
                    table_data = table.df.values.tolist()

                    # Skip empty tables
                    if len(table_data) < 2:
                        continue

                    # Classify and extract metadata
                    table_name = classify_table(table_data, context['above'])
                    unit = detect_unit(table_data, context['above'])
                    periods = extract_periods(table_data[0] if table_data else [])
                    confidence = calculate_confidence(table_data)

                    # Add accuracy score from Camelot
                    if hasattr(table, 'accuracy'):
                        confidence = (confidence + table.accuracy / 100) / 2

                    result['tables'].append({
                        'page': page_num,
                        'table_index_on_page': idx,
                        'table_name': table_name,
                        'unit': unit,
                        'periods': periods,
                        'raw_table_grid': table_data,
                        'context_above_lines': context['above'],
                        'context_below_lines': context['below'],
                        'confidence': confidence,
                        'extraction_method': 'stream'
                    })

            except Exception as e:
                result['errors'].append(f"Stream extraction error: {str(e)}")

    except Exception as e:
        result['success'] = False
        result['errors'].append(f"Fatal error: {str(e)}")

    return result


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({'success': False, 'error': 'PDF path required'}))
        sys.exit(1)

    pdf_path = sys.argv[1]
    context_lines = int(sys.argv[2]) if len(sys.argv) > 2 else 3

    result = extract_tables_from_pdf(pdf_path, context_lines)
    print(json.dumps(result, ensure_ascii=False))
