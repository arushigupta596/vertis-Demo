#!/usr/bin/env python3
"""
Enhanced table extraction with OCR fallback
First tries Camelot, then uses OCR for pages with no or few tables
"""

import sys
import json
from extract_tables import extract_tables_from_pdf
from ocr_tables import extract_tables_with_ocr


def extract_tables_hybrid(pdf_path: str, context_lines_count: int = 20,
                          min_tables_per_page: int = 1) -> dict:
    """
    Extract tables using Camelot first, then OCR for pages with insufficient tables

    Args:
        pdf_path: Path to PDF file
        context_lines_count: Number of context lines (default 20 for OCR)
        min_tables_per_page: Minimum tables expected per page

    Returns:
        Combined results from both methods
    """
    result = {
        'success': True,
        'tables': [],
        'page_count': 0,
        'errors': [],
        'extraction_stats': {
            'camelot_tables': 0,
            'ocr_tables': 0,
            'pages_with_ocr': []
        }
    }

    # Step 1: Try Camelot extraction
    print("Step 1: Extracting tables with Camelot...", file=sys.stderr)
    camelot_result = extract_tables_from_pdf(pdf_path, min(context_lines_count, 3))

    if not camelot_result['success']:
        result['errors'].extend(camelot_result['errors'])

    result['page_count'] = camelot_result['page_count']
    result['tables'] = camelot_result.get('tables', [])
    result['extraction_stats']['camelot_tables'] = len(result['tables'])

    # Step 2: Identify pages with no or few tables
    pages_with_tables = {}
    for table in result['tables']:
        page = table['page']
        pages_with_tables[page] = pages_with_tables.get(page, 0) + 1

    # Find pages that need OCR
    pages_for_ocr = []
    for page_num in range(1, result['page_count'] + 1):
        tables_on_page = pages_with_tables.get(page_num, 0)
        if tables_on_page < min_tables_per_page:
            pages_for_ocr.append(page_num)

    # Step 3: Apply OCR to pages with insufficient tables
    if pages_for_ocr:
        print(f"Step 2: Applying OCR to {len(pages_for_ocr)} pages: {pages_for_ocr}", file=sys.stderr)

        ocr_result = extract_tables_with_ocr(pdf_path, pages_for_ocr, context_lines_count)

        if ocr_result['success']:
            ocr_tables = ocr_result.get('tables', [])
            result['tables'].extend(ocr_tables)
            result['extraction_stats']['ocr_tables'] = len(ocr_tables)
            result['extraction_stats']['pages_with_ocr'] = pages_for_ocr
        else:
            result['errors'].extend(ocr_result['errors'])

    # Step 4: Sort tables by page and index
    result['tables'].sort(key=lambda t: (t['page'], t.get('table_index_on_page', 0)))

    print(f"Extraction complete: {result['extraction_stats']['camelot_tables']} Camelot + "
          f"{result['extraction_stats']['ocr_tables']} OCR = {len(result['tables'])} total tables",
          file=sys.stderr)

    return result


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({'success': False, 'error': 'PDF path required'}))
        sys.exit(1)

    pdf_path = sys.argv[1]
    context_lines = int(sys.argv[2]) if len(sys.argv) > 2 else 20

    result = extract_tables_hybrid(pdf_path, context_lines)
    print(json.dumps(result, ensure_ascii=False))
