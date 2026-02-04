#!/usr/bin/env python3
"""
Table Extraction Validation Script
Compares extracted tables from database with source PDFs to measure accuracy
"""

import sys
import os
import json
import camelot
import pdfplumber
from typing import List, Dict, Any, Tuple
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

def load_env():
    """Load environment variables from .env.local"""
    env_path = Path(__file__).parent.parent / '.env.local'
    if env_path.exists():
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    os.environ[key] = value.strip('"').strip("'")

load_env()

try:
    from supabase import create_client
    SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
    SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

    if not SUPABASE_URL or not SUPABASE_KEY:
        raise ValueError("Missing Supabase credentials")

    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
except Exception as e:
    print(f"Error connecting to Supabase: {e}")
    sys.exit(1)


def extract_pdf_tables(pdf_path: str, page: int = None) -> List[Dict[str, Any]]:
    """
    Extract tables from PDF using same method as ingestion

    Args:
        pdf_path: Path to PDF file
        page: Specific page to extract (None for all pages)

    Returns:
        List of table dictionaries with data and metadata
    """
    tables = []

    try:
        # Try lattice method first (bordered tables)
        page_str = str(page) if page else 'all'
        camelot_tables = camelot.read_pdf(pdf_path, pages=page_str, flavor='lattice')

        # Fallback to stream method if no tables found
        if len(camelot_tables) == 0:
            camelot_tables = camelot.read_pdf(pdf_path, pages=page_str, flavor='stream')

        for idx, table in enumerate(camelot_tables):
            tables.append({
                'page': table.page,
                'index': idx + 1,
                'data': table.df.values.tolist(),
                'shape': table.df.shape,
                'accuracy': table.parsing_report.get('accuracy', 0.0),
                'whitespace': table.parsing_report.get('whitespace', 0.0),
                'method': 'lattice' if camelot_tables._tables[idx].flavor == 'lattice' else 'stream'
            })

    except Exception as e:
        print(f"Error extracting tables from PDF: {e}", file=sys.stderr)

    return tables


def get_db_tables(document_id: int = None) -> List[Dict[str, Any]]:
    """
    Fetch tables from database

    Args:
        document_id: Optional document ID to filter

    Returns:
        List of table records from database
    """
    try:
        query = supabase.table('tables').select('*')

        if document_id:
            query = query.eq('document_id', document_id)

        result = query.execute()
        return result.data

    except Exception as e:
        print(f"Error fetching tables from database: {e}")
        return []


def get_db_table_rows(table_id: str) -> List[Dict[str, Any]]:
    """
    Fetch table rows from database for a specific table

    Args:
        table_id: Table ID to fetch rows for

    Returns:
        List of table row records
    """
    try:
        result = supabase.table('table_rows').select('*').eq('table_id', table_id).execute()
        return result.data

    except Exception as e:
        print(f"Error fetching table rows: {e}")
        return []


def compare_table_structure(pdf_table: Dict, db_table: Dict, db_rows: List[Dict]) -> Dict[str, Any]:
    """
    Compare extracted PDF table with database table

    Returns:
        Dictionary with comparison metrics
    """
    pdf_rows, pdf_cols = pdf_table['shape']
    db_row_count = len(db_rows)

    # Calculate structural accuracy
    row_match = db_row_count == pdf_rows

    return {
        'pdf_shape': pdf_table['shape'],
        'db_row_count': db_row_count,
        'row_match': row_match,
        'extraction_accuracy': pdf_table['accuracy'],
        'method': pdf_table['method'],
        'page': pdf_table['page'],
    }


def validate_document_tables(document_id: int, pdf_path: str) -> Dict[str, Any]:
    """
    Validate all tables for a document

    Args:
        document_id: Database document ID
        pdf_path: Path to source PDF

    Returns:
        Validation report dictionary
    """
    print(f"\n{'='*70}")
    print(f"VALIDATING DOCUMENT {document_id}: {pdf_path}")
    print(f"{'='*70}\n")

    # Extract tables from PDF
    pdf_tables = extract_pdf_tables(pdf_path)
    print(f"📄 Found {len(pdf_tables)} tables in PDF")

    # Get tables from database
    db_tables = get_db_tables(document_id)
    print(f"💾 Found {len(db_tables)} tables in database")

    if len(pdf_tables) != len(db_tables):
        print(f"⚠️  WARNING: Table count mismatch!")

    # Compare each table
    results = []

    for idx, db_table in enumerate(db_tables):
        print(f"\n--- Table {idx + 1}: {db_table['table_name']} (Page {db_table['page']}) ---")
        print(f"Table ID: {db_table['table_id']}")
        print(f"Confidence: {db_table.get('confidence', 'N/A')}")

        # Find matching PDF table by page
        pdf_table = next(
            (t for t in pdf_tables if t['page'] == db_table['page'] and t['index'] == db_table.get('table_index_on_page', idx + 1)),
            None
        )

        if not pdf_table:
            print("❌ No matching PDF table found")
            results.append({
                'table_id': db_table['table_id'],
                'status': 'no_match',
                'error': 'PDF table not found'
            })
            continue

        # Get table rows
        db_rows = get_db_table_rows(db_table['table_id'])

        # Compare
        comparison = compare_table_structure(pdf_table, db_table, db_rows)

        print(f"PDF Shape: {comparison['pdf_shape']} (rows × cols)")
        print(f"DB Rows: {comparison['db_row_count']}")
        print(f"Extraction Method: {comparison['method']}")
        print(f"Camelot Accuracy: {comparison['extraction_accuracy']:.1f}%")

        if comparison['row_match']:
            print("✅ Row count matches")
        else:
            print(f"⚠️  Row count mismatch: PDF has {comparison['pdf_shape'][0]}, DB has {comparison['db_row_count']}")

        # Context lines
        context_above = db_table.get('context_above_lines', [])
        context_below = db_table.get('context_below_lines', [])

        if context_above:
            print(f"📝 Context above: {len(context_above)} lines")
            print(f"   → {context_above[0][:60]}..." if context_above else "")

        if context_below:
            print(f"📝 Context below: {len(context_below)} lines")

        results.append({
            'table_id': db_table['table_id'],
            'table_name': db_table['table_name'],
            'page': db_table['page'],
            'status': 'match' if comparison['row_match'] else 'mismatch',
            'confidence': db_table.get('confidence'),
            'comparison': comparison
        })

    # Summary
    print(f"\n{'='*70}")
    print("VALIDATION SUMMARY")
    print(f"{'='*70}")

    total = len(results)
    matched = sum(1 for r in results if r['status'] == 'match')
    accuracy = (matched / total * 100) if total > 0 else 0

    print(f"Total Tables: {total}")
    print(f"Matched: {matched}")
    print(f"Mismatched: {total - matched}")
    print(f"Overall Accuracy: {accuracy:.1f}%")

    avg_confidence = sum(r.get('confidence', 0) or 0 for r in results) / total if total > 0 else 0
    print(f"Average Extraction Confidence: {avg_confidence:.1f}%")

    return {
        'document_id': document_id,
        'pdf_path': pdf_path,
        'total_tables': total,
        'matched': matched,
        'accuracy': accuracy,
        'avg_confidence': avg_confidence,
        'results': results
    }


def main():
    """Main validation function"""

    # Get all documents
    try:
        result = supabase.table('documents').select('*').execute()
        documents = result.data
    except Exception as e:
        print(f"Error fetching documents: {e}")
        return

    if not documents:
        print("No documents found in database")
        return

    print(f"\nFound {len(documents)} document(s) in database\n")

    all_results = []

    for doc in documents:
        doc_id = doc['id']
        file_path = doc.get('file_path', '')

        # Check if file exists
        if not file_path or not os.path.exists(file_path):
            print(f"⚠️  Skipping document {doc_id}: File not found at {file_path}")
            continue

        # Validate this document
        validation = validate_document_tables(doc_id, file_path)
        all_results.append(validation)

    # Overall summary
    if all_results:
        print(f"\n{'='*70}")
        print("OVERALL VALIDATION SUMMARY")
        print(f"{'='*70}")

        total_tables = sum(r['total_tables'] for r in all_results)
        total_matched = sum(r['matched'] for r in all_results)
        overall_accuracy = (total_matched / total_tables * 100) if total_tables > 0 else 0
        overall_confidence = sum(r['avg_confidence'] for r in all_results) / len(all_results)

        print(f"Documents Validated: {len(all_results)}")
        print(f"Total Tables: {total_tables}")
        print(f"Total Matched: {total_matched}")
        print(f"Overall Accuracy: {overall_accuracy:.1f}%")
        print(f"Average Confidence: {overall_confidence:.1f}%")

        # Save report
        report_path = Path(__file__).parent.parent / 'table_validation_report.json'
        with open(report_path, 'w') as f:
            json.dump(all_results, f, indent=2, default=str)

        print(f"\n📊 Detailed report saved to: {report_path}")


if __name__ == "__main__":
    main()
