#!/usr/bin/env python3
"""
Re-ingestion Script
Clears and re-ingests documents to match the current table schema
"""

import sys
import os
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


def clear_document_data(document_id: int):
    """
    Clear all extracted data for a document (tables, rows, chunks)

    Args:
        document_id: Document ID to clear
    """
    print(f"\n🗑️  Clearing data for document {document_id}...")

    try:
        # Get table IDs for this document first
        tables_result = supabase.table('tables').select('table_id').eq('document_id', document_id).execute()
        table_ids = [t['table_id'] for t in tables_result.data]

        # Delete table rows using table_id
        if table_ids:
            for table_id in table_ids:
                supabase.table('table_rows').delete().eq('table_id', table_id).execute()
            print(f"   ✓ Deleted table rows from {len(table_ids)} tables")
        else:
            print("   ✓ No table rows to delete")

        # Delete tables
        supabase.table('tables').delete().eq('document_id', document_id).execute()
        print("   ✓ Deleted tables")

        # Delete text chunks
        supabase.table('text_chunks').delete().eq('document_id', document_id).execute()
        print("   ✓ Deleted text chunks")

        # Delete ingestion logs
        supabase.table('ingestion_logs').delete().eq('document_id', document_id).execute()
        print("   ✓ Deleted ingestion logs")

        print("   ✅ Data cleared successfully")
        return True

    except Exception as e:
        print(f"   ❌ Error clearing data: {e}")
        return False


def reingest_document(document_id: int, pdf_path: str):
    """
    Re-ingest a document using the ingestion API

    Args:
        document_id: Document ID
        pdf_path: Path to PDF file
    """
    import requests

    print(f"\n📄 Re-ingesting document {document_id}: {pdf_path}")

    # Get document metadata
    try:
        doc_result = supabase.table('documents').select('*').eq('id', document_id).single().execute()
        doc = doc_result.data
    except Exception as e:
        print(f"   ❌ Error fetching document: {e}")
        return False

    # Call ingestion API
    try:
        response = requests.post(
            'http://localhost:3000/api/ingest',
            json={
                'filePath': pdf_path,
                'metadata': {
                    'fileName': doc['file_name'],
                    'displayName': doc['display_name'],
                    'date': doc['date'],
                    'tags': doc.get('tags', []),
                    'category': doc.get('category', 'uncategorized')
                }
            },
            timeout=300  # 5 minute timeout
        )

        if response.status_code == 200:
            result = response.json()
            print(f"   ✅ Ingestion successful!")
            print(f"   📊 Chunks extracted: {result.get('chunksExtracted', 'N/A')}")
            print(f"   📋 Tables extracted: {result.get('tablesExtracted', 'N/A')}")
            return True
        else:
            print(f"   ❌ Ingestion failed: {response.status_code}")
            print(f"   Error: {response.text}")
            return False

    except Exception as e:
        print(f"   ❌ Error calling ingestion API: {e}")
        return False


def main():
    """Main re-ingestion function"""

    print("="*70)
    print("DOCUMENT RE-INGESTION SCRIPT")
    print("="*70)
    print("\nThis will clear and re-ingest documents to fix schema mismatches.")
    print("Make sure the development server is running (npm run dev)\n")

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

    print(f"Found {len(documents)} document(s) in database\n")

    # Ask for confirmation
    response = input("Do you want to proceed with re-ingestion? (yes/no): ")
    if response.lower() not in ['yes', 'y']:
        print("Re-ingestion cancelled")
        return

    success_count = 0
    fail_count = 0

    for doc in documents:
        doc_id = doc['id']
        file_path = doc.get('file_path', '')

        # Check if file exists
        if not file_path or not os.path.exists(file_path):
            print(f"\n⚠️  Skipping document {doc_id}: File not found at {file_path}")
            fail_count += 1
            continue

        print(f"\n{'='*70}")
        print(f"Processing Document {doc_id}: {doc['display_name']}")
        print(f"{'='*70}")

        # Clear existing data
        if not clear_document_data(doc_id):
            print(f"❌ Failed to clear data for document {doc_id}")
            fail_count += 1
            continue

        # Re-ingest
        if reingest_document(doc_id, file_path):
            success_count += 1
        else:
            fail_count += 1

    # Summary
    print(f"\n{'='*70}")
    print("RE-INGESTION SUMMARY")
    print(f"{'='*70}")
    print(f"Total Documents: {len(documents)}")
    print(f"Successfully Re-ingested: {success_count}")
    print(f"Failed: {fail_count}")

    if success_count > 0:
        print(f"\n✅ Re-ingestion completed! Run the validation script to verify:")
        print(f"   python3 scripts/validate_tables.py")


if __name__ == "__main__":
    main()
