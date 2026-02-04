# Quick Setup Guide

This guide will get you running in 10 minutes.

## Prerequisites

1. **Neon Database** (free tier works):
   - Go to https://neon.tech
   - Sign up and create a new project
   - Copy the connection string
   - Enable pgvector: Run `CREATE EXTENSION vector;` in Neon SQL Editor

2. **OpenRouter API Key**:
   - Go to https://openrouter.ai
   - Sign up and add credits ($5 minimum)
   - Create API key
   - Copy the key (starts with `sk-or-v1-`)

## Setup Steps

### 1. Install Dependencies

```bash
cd vertis-doc-chat
npm install
```

### 2. Configure Environment

Create `.env.local`:

```env
DATABASE_URL=postgresql://user:password@ep-xyz.neon.tech/neondb?sslmode=require
OPENROUTER_API_KEY=sk-or-v1-your-key-here
```

### 3. Initialize Database

```bash
npm run db:push
```

This creates all tables. You should see:
```
✓ Pushing schema changes to database
✓ Done!
```

### 4. Start Dev Server

```bash
npm run dev
```

Open http://localhost:3000

### 5. Ingest Documents

1. Go to http://localhost:3000/admin
2. Click "Process All Documents"
3. Wait 10-15 minutes (5 PDFs × 2-3 min each)

### 6. Test

Go to http://localhost:3000 and ask:

**Factual Questions:**
- "Who is the auditor?"
- "What is the record date?"

**Financial Questions:**
- "What is the debt service coverage ratio?"
- "Show me the distribution per unit"

## Troubleshooting

### Database Connection Failed

Check your Neon connection string:
- Must include `?sslmode=require` at the end
- Verify it works by testing in Neon SQL Editor

### OpenRouter API Error

- Ensure you have credits in your OpenRouter account
- Check the key starts with `sk-or-v1-`
- Rate limits: 10 requests/minute on free tier

### Ingestion Stuck

- Check browser console for errors
- Verify PDFs exist in `public/pdfs/`
- Ensure pgvector extension is installed

## Next Steps

- View extracted tables at http://localhost:3000/tables
- Customize table context lines (1-15)
- Download tables as CSV/JSON for validation

## Production Deployment

See [README.md](./README.md) for full deployment instructions with Vercel.
