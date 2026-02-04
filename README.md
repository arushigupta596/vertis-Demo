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

1. Upload PDFs via admin panel
2. Text extraction using pdfplumber
3. Table extraction using Camelot
4. Embedding generation using OpenAI
5. Storage in Supabase with pgvector

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
