#!/usr/bin/env python3
"""
Extract text from PDF using pdfplumber
Returns JSON with full text, page count, and per-page text
"""

import sys
import json
import pdfplumber
from typing import Dict, List, Any


def extract_text_from_pdf(pdf_path: str) -> Dict[str, Any]:
    """
    Extract text from PDF file using pdfplumber

    Args:
        pdf_path: Path to PDF file

    Returns:
        Dictionary with:
        - text: Full PDF text (all pages concatenated)
        - page_count: Number of pages
        - pages: List of {page: int, text: str}
    """
    pages_data = []
    full_text_parts = []

    with pdfplumber.open(pdf_path) as pdf:
        page_count = len(pdf.pages)

        for i, page in enumerate(pdf.pages, start=1):
            # Extract text from page
            page_text = page.extract_text() or ""

            pages_data.append({
                "page": i,
                "text": page_text
            })

            full_text_parts.append(page_text)

    # Combine all pages with page breaks
    full_text = "\n\n".join(full_text_parts)

    return {
        "text": full_text,
        "page_count": page_count,
        "pages": pages_data
    }


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Missing PDF path argument"}))
        sys.exit(1)

    pdf_path = sys.argv[1]

    try:
        result = extract_text_from_pdf(pdf_path)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
