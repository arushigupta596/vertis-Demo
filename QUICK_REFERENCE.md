# Quick Reference - Vertis Document Chat

## 🎯 What You Have

A **complete, production-ready** document Q&A system with:
- 5 PDFs ready for ingestion (in `public/pdfs/`)
- Full chat interface with citations
- Tables viewer with audit capabilities
- Admin panel for document processing

## 📁 Project Structure

```
Vertis/
├── app/
│   ├── page.tsx              ✅ Main chat interface
│   ├── admin/page.tsx        ✅ Document ingestion admin
│   ├── tables/page.tsx       ✅ Table extraction viewer
│   └── api/                  ✅ 4 API endpoints
│       ├── chat/
│       ├── documents/
│       ├── tables/
│       └── ingest/
├── components/
│   ├── chat-area.tsx         ✅ Chat UI
│   ├── document-sidebar.tsx  ✅ PDF library
│   ├── evidence-panel.tsx    ✅ Citations display
│   └── ui/                   ✅ Button, Input
├── lib/
│   ├── db/                   ✅ Drizzle schema
│   ├── ingestion/            ✅ PDF processing
│   ├── qa/                   ✅ Q&A pipelines
│   └── openrouter.ts         ✅ LLM client
├── public/pdfs/              ✅ 5 PDF files (92MB)
├── .env.local                ⚠️  YOU NEED TO FILL THIS
├── package.json              ✅ All dependencies included
└── [5 documentation files]   ✅ Complete guides
```

## 🚀 Next Steps (10 Minutes)

### 0. Install Python Dependencies (3 min) ⚡ NEW

**Required for table extraction:**

```bash
# Check Python version
python3 --version  # Should be 3.8+

# Install pdfplumber + Camelot
pip3 install -r requirements.txt

# Verify installation
python3 scripts/extract_tables.py
```

See **PYTHON_SETUP.md** for detailed instructions.

**If you don't have Python:**
- macOS: `brew install python3`
- Windows: Download from python.org
- Ubuntu: `sudo apt install python3 python3-pip`

## 🚀 Setup Steps (After Python)

### 1. Set Up Supabase (5 min)

**✨ Recommended** - See **SUPABASE_API_KEYS.md** for detailed screenshots:

1. **Create project**: https://supabase.com (free, no credit card)
2. **Get 4 API keys** (from Settings → API & Database):
   - `DATABASE_URL` (Settings → Database → Connection string)
   - `NEXT_PUBLIC_SUPABASE_URL` (Settings → API → Project URL)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Settings → API → anon public)
   - `SUPABASE_SERVICE_ROLE_KEY` (Settings → API → service_role secret)
3. **Enable pgvector**: SQL Editor → `CREATE EXTENSION vector;`

### 2. Get OpenRouter API Key (1 min)

1. Go to https://openrouter.ai
2. Sign up and add $5 credits
3. Create API key (starts with `sk-or-v1-`)

### 3. Configure Environment (2 min)

Edit `.env.local` with your keys:
```env
# Supabase
DATABASE_URL=postgresql://postgres.xxx:password@db.xxx.supabase.com:5432/postgres?sslmode=require
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# OpenRouter
OPENROUTER_API_KEY=sk-or-v1-your-key
```

### 4. Install & Start (1 min)

```bash
npm install
npm run db:push
npm run dev
```

Open http://localhost:3000

## 📝 Key Commands

```bash
# Development
npm run dev              # Start dev server (port 3000)
npm run build           # Build for production
npm run start           # Start production server

# Database
npm run db:push         # Push schema to database
npm run db:studio       # Open Drizzle Studio (visual DB editor)
npm run db:generate     # Generate migration files

# Linting
npm run lint            # Run ESLint
```

## 🔗 Important URLs (After `npm run dev`)

- **Chat Interface**: http://localhost:3000
- **Admin Panel**: http://localhost:3000/admin
- **Tables Viewer**: http://localhost:3000/tables

## 📚 Documentation Files

1. **SUPABASE_API_KEYS.md** - 🔑 How to find your Supabase keys (NEW!)
2. **PYTHON_SETUP.md** - 🐍 Install pdfplumber + Camelot
3. **GETTING_STARTED.md** - First-time setup (most detailed)
4. **SETUP.md** - Quick 10-minute setup
5. **README.md** - Complete documentation
6. **PROJECT_SUMMARY.md** - Technical architecture
7. **UPGRADES.md** - What changed with table extraction
8. **DEPLOYMENT.md** - Deploy to Vercel

## ✅ What's Already Done

- ✅ Next.js 16 project configured
- ✅ All dependencies installed
- ✅ Database schema defined (6 tables)
- ✅ PDF processing pipeline built
- ✅ Table extraction with classification
- ✅ Factual Q&A pipeline (vector search)
- ✅ Financial Q&A pipeline (table search)
- ✅ Complete UI with Vertis branding
- ✅ 5 PDFs ready in `public/pdfs/`
- ✅ All TypeScript types configured
- ✅ OpenRouter integration
- ✅ Comprehensive documentation

## ⚠️ What You Need to Do

1. **Fill `.env.local`** with your credentials
2. **Run `npm run db:push`** to create database tables
3. **Start dev server**: `npm run dev`
4. **Ingest PDFs**: Go to `/admin` and click "Process All Documents"
5. **Test**: Ask questions at `/`

## 💡 Quick Test Questions

After ingestion, try these:

**Factual Questions:**
- "Who is the auditor?"
- "What was the record date?"
- "What were the board meeting outcomes?"

**Financial Questions:**
- "What is the debt service coverage ratio?"
- "Show me the distribution per unit"
- "What are the key financial ratios?"

## 🔍 Troubleshooting

**No files showing in VS Code?**
- Refresh VS Code (Cmd+R or Ctrl+R)
- Check you're in `/Users/arushigupta/Desktop/EMB/Demos/Vertis`

**Database connection error?**
- Verify `.env.local` has correct `DATABASE_URL`
- Ensure `?sslmode=require` is at the end
- Check Neon project is active

**OpenRouter API error?**
- Verify API key starts with `sk-or-v1-`
- Check you have credits in OpenRouter account
- Confirm key is in `.env.local`

**Ingestion fails?**
- Check OpenRouter credits balance
- Verify PDFs exist in `public/pdfs/`
- Check browser console for errors

## 📊 Key Features

### Factual Q&A
- Vector search over text chunks
- Verbatim quote extraction
- Page-level citations
- Refusal when not found

### Financial Q&A
- Vector search over table rows
- Exact cell value retrieval
- Table name + row + column provenance
- Context lines for audit

### Table Viewer
- View all extracted tables
- 1-15 configurable context lines
- Download as CSV/JSON
- Confidence scores
- Table classification (RATIOS, NDCF, etc.)

## 🎨 Design

**Vertis Brand Colors:**
- Primary: `#9B1400` (Vertis Red)
- Charcoal: `#32373c`
- All defined in `app/globals.css`

## 📦 Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Database | Postgres + pgvector |
| ORM | Drizzle ORM |
| LLM | OpenRouter (Claude Sonnet 4.5) |
| Embeddings | OpenAI ada-002 (via OpenRouter) |
| Styling | Tailwind CSS |
| Deployment | Vercel-ready |

## 🎯 Success Criteria

Your app is working when:
- ✅ Chat interface loads
- ✅ Documents appear in sidebar
- ✅ Questions return answers (not errors)
- ✅ Evidence panel shows citations
- ✅ Tables viewer displays extracted tables
- ✅ CSV/JSON exports work

## 📞 Need Help?

Refer to:
1. **GETTING_STARTED.md** - Step-by-step setup
2. **README.md** - Troubleshooting section
3. Browser console (F12) - Check for errors
4. Terminal output - Check server logs

---

**Status**: Ready to configure and run
**Total Setup Time**: ~15 minutes (5 min setup + 10 min ingestion)
**Next Step**: Fill `.env.local` and run `npm run db:push`
