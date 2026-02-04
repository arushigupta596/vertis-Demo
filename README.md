# Vertis Document Chat

An intelligent document Q&A application built with Next.js, Supabase, and AI-powered question answering.

## Features

- 📄 **Document Management** - Upload and manage PDF documents
- 💬 **Dual-Pipeline Q&A** - Factual (text-based) and Financial (table-based) question answering
- 🔍 **Vector Search** - Semantic search using pgvector and OpenAI embeddings
- 📊 **Table Extraction** - Automatic table detection and extraction from PDFs
- 🎯 **Suggested Questions** - 10 pre-configured questions to get started
- 📱 **Responsive Design** - Works on desktop and mobile

## Tech Stack

- **Frontend**: Next.js 16, React, TypeScript, TailwindCSS
- **Backend**: Supabase (PostgreSQL + pgvector)
- **AI/ML**: OpenRouter API (Claude Sonnet 3.5, OpenAI embeddings)
- **PDF Processing**: pdfplumber, Camelot (Python)
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.11+
- Supabase account
- OpenRouter API key

### Installation

1. Clone the repository:
```bash
git clone https://github.com/YOUR_USERNAME/vertis-doc-chat.git
cd vertis-doc-chat
```

2. Install dependencies:
```bash
npm install
```

3. Set up Python environment:
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

4. Configure environment variables:
```bash
cp .env.example .env.local
# Edit .env.local with your credentials
```

5. Run the development server:
```bash
npm run dev
```

Visit http://localhost:3000

## Deployment

See [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) for complete deployment instructions.

Quick deploy to Vercel:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/vertis-doc-chat)

## Environment Variables

Required environment variables:

- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `OPENROUTER_API_KEY` - OpenRouter API key

## Project Structure

```
vertis-doc-chat/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── admin/             # Admin panel
│   └── tables/            # Tables viewer
├── components/            # React components
├── lib/                   # Utilities and helpers
│   ├── db/               # Database client
│   ├── ingestion/        # Document ingestion
│   └── qa/               # Q&A logic
├── scripts/              # Python scripts
│   ├── extract_text.py
│   └── extract_tables.py
└── public/               # Static files
```

## Features Overview

### Suggested Questions

- **Factual Questions** (from text chunks):
  - Who is the auditor?
  - What is the registered office address?
  - Key board meeting decisions?
  - Who are the directors?
  - What are the risk factors?

- **Financial Questions** (from tables):
  - What are the financial ratios?
  - What is the distribution amount?
  - NDCF for current period?
  - Debt service coverage ratio?
  - Profit and loss statement?

### Document Ingestion

The document ingestion pipeline consists of several stages that extract both text chunks and structured tables from PDF documents.

#### 1. Text Chunk Extraction (pdfplumber)

The text extraction process uses **pdfplumber** to extract text content with precise spatial coordinates:

**Methodology:**
- **Page-by-page extraction**: Each PDF page is processed individually to maintain context
- **Coordinate-based extraction**: Text is extracted with x, y coordinates (bounding boxes) for precise location tracking
- **Character-level analysis**: pdfplumber analyzes individual characters, words, and lines with their positions
- **Layout preservation**: Maintains reading order and spatial relationships between text elements

**Chunking Strategy:**
- Text is split into manageable chunks for vector search (typically 500-1000 characters)
- Chunks maintain semantic boundaries (paragraphs, sections)
- Each chunk stores:
  - `content`: The actual text content
  - `page_number`: Source page in the PDF
  - `x`, `y`: Top-left coordinates of the chunk
  - `width`, `height`: Dimensions of the text bounding box
  - `embedding`: OpenAI embedding vector (1536 dimensions)

**Implementation** (`scripts/extract_text.py`):
```python
# Extract text with coordinates from each page
for page in pdf.pages:
    text = page.extract_text()
    # Get bounding box coordinates
    bbox = page.bbox  # (x0, y0, x1, y1)
    # Store chunk with spatial metadata
```

#### 2. Table Extraction (Camelot)

The table extraction process uses **Camelot** with a dual-method approach for maximum accuracy:

**Methodology:**
- **Primary Method - Lattice**: Detects tables with visible borders/lines
  - Analyzes ruling lines and cell boundaries
  - Works best for well-formatted tables with clear gridlines
  - Higher accuracy for structured financial statements

- **Fallback Method - Stream**: Detects borderless tables using whitespace
  - Analyzes text positioning and alignment
  - Captures tables without visible borders
  - Useful for text-based tabular data

**Context Line Extraction:**
- **Pre-table context**: Extracts 2-3 lines before each table
  - Captures table titles, headers, and contextual information
  - Uses bounding box coordinates to identify proximity
  - Stores as `context_before` for enhanced table understanding

- **Post-table context**: Extracts lines immediately after tables
  - Captures footnotes, explanatory notes, and continuations
  - Stored as `context_after` metadata

**Table Processing Pipeline:**
```python
# Try lattice method first (for bordered tables)
tables = camelot.read_pdf(pdf_path, pages='all', flavor='lattice')

if len(tables) == 0:
    # Fallback to stream method (for borderless tables)
    tables = camelot.read_pdf(pdf_path, pages='all', flavor='stream')

# For each detected table:
# 1. Extract table data as 2D array
# 2. Identify header rows
# 3. Extract context lines using bounding boxes
# 4. Generate embeddings for each row
# 5. Store in table_rows with JSONB cells
```

**Row Storage Structure:**
Each table row is stored with:
- `table_id`: Reference to parent table
- `row_index`: Position in the table
- `cells`: JSONB array of cell values `["cell1", "cell2", ...]`
- `raw_text`: Concatenated text for embedding
- `embedding`: OpenAI embedding vector
- `context_before`, `context_after`: Surrounding text for better understanding

#### 3. Embedding Generation

- **Model**: OpenAI `text-embedding-ada-002` (1536 dimensions)
- **Applied to**: Both text chunks and table rows
- **Purpose**: Enable semantic similarity search using cosine distance

#### 4. Vector Storage

- **Database**: Supabase PostgreSQL with pgvector extension
- **Similarity Search**: Cosine similarity for finding relevant chunks/rows
- **Indexing**: Vector indexes for efficient search at scale

### Question Answering

- Automatic classification (factual vs financial)
- Vector similarity search
- Context retrieval with provenance
- LLM-powered answer generation
- Verbatim citations

## License

MIT

## Contributing

Contributions welcome! Please open an issue or PR.

## Support

For issues or questions, please open a GitHub issue.
