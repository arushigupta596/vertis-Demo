# Supabase Setup Guide

This guide shows how to set up the Vertis Document Chat with **Supabase** for storing tokens, tables, and context.

## Why Supabase?

Supabase provides:
- ✅ PostgreSQL with pgvector extension
- ✅ Free tier with 500MB database storage
- ✅ Built-in dashboard for SQL queries
- ✅ Automatic backups
- ✅ Connection pooling included
- ✅ No credit card required for free tier

## Step 1: Create Supabase Project

1. **Go to Supabase**: https://supabase.com

2. **Sign up** (if you don't have an account)

3. **Create a new project**:
   - Click "New Project"
   - Organization: Create new or select existing
   - Name: `vertis-doc-chat`
   - Database Password: Generate a strong password (save it!)
   - Region: Choose closest to you
   - Pricing Plan: **Free** (sufficient for this project)

4. **Wait for project creation** (1-2 minutes)

## Step 2: Enable pgvector Extension

1. **Go to SQL Editor** in Supabase dashboard

2. **Run this command**:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

3. **Verify it worked**:
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'vector';
   ```

   You should see one row returned.

## Step 3: Get Connection String

1. **Go to Project Settings** (gear icon in sidebar)

2. **Click "Database"** in the left menu

3. **Find "Connection string"** section

4. **Select "URI" mode**

5. **Copy the connection string** - it looks like:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.abcdefghijklmno.supabase.co:5432/postgres
   ```

6. **Replace `[YOUR-PASSWORD]`** with your actual database password

7. **Add SSL mode** to the end:
   ```
   postgresql://postgres:your-password@db.xyz.supabase.co:5432/postgres?sslmode=require
   ```

## Step 4: Configure Project

1. **Edit `.env.local`** in your project:
   ```env
   DATABASE_URL=postgresql://postgres:your-password@db.xyz.supabase.co:5432/postgres?sslmode=require
   OPENROUTER_API_KEY=sk-or-v1-your-key-here
   OPENROUTER_EMBED_MODEL=openai/text-embedding-ada-002
   OPENROUTER_LLM_MODEL=anthropic/claude-3.5-sonnet
   ```

2. **Save the file**

## Step 5: Create Database Schema

Run this command to create all tables:

```bash
npm run db:push
```

You should see:
```
✓ Pulling schema from database
✓ Generating migrations
✓ Pushing schema to database
✓ Done!
```

## Step 6: Verify Tables in Supabase

1. **Go to Supabase dashboard**

2. **Click "Table Editor"** in sidebar

3. **You should see 6 new tables**:
   - `documents`
   - `text_chunks`
   - `tables`
   - `table_rows`
   - `chat_messages`
   - `ingestion_logs`

4. **Check vector columns**:
   - Click on `text_chunks` table
   - You should see an `embedding` column with type `vector(1536)`
   - Same for `table_rows` table

## Understanding Your Data Storage

### What Gets Stored in Supabase

**Text Chunks** (`text_chunks` table):
- Chunked text from PDFs (500 chars each)
- Vector embeddings (1536 dimensions per chunk)
- Page numbers for citation
- Used for **factual Q&A**

**Tables** (`tables` table):
- Extracted table metadata
- Raw table grids (2D arrays)
- **Context lines above and below** (configurable 1-15)
- Table classification (RATIOS, NDCF, etc.)
- Unit detection (₹ millions, %, times)
- Confidence scores

**Table Rows** (`table_rows` table):
- Normalized table data (row-label, column-label, value)
- Vector embeddings for semantic search
- Exact cell values (no calculations)
- Used for **financial Q&A**

**Documents** (`documents` table):
- PDF metadata (name, date, tags, category)
- File paths
- Page counts

**Chat Messages** (`chat_messages` table):
- Conversation history
- Question types (factual/financial)
- Citations and metadata

**Ingestion Logs** (`ingestion_logs` table):
- Processing status
- Error tracking
- Chunks and tables extracted counts

### Storage Estimates

For 5 PDFs (~100 pages each):

| Data Type | Count | Size per Item | Total |
|-----------|-------|---------------|-------|
| Text chunks | ~500 | 6KB (text + embedding) | ~3MB |
| Table metadata | ~50 | 10KB (with context) | ~500KB |
| Table rows | ~500 | 6KB (with embedding) | ~3MB |
| Documents | 5 | 1KB | 5KB |
| **Total** | | | **~7MB** |

**Supabase Free Tier**: 500MB storage → enough for **70+ documents**

## Step 7: Test Connection

```bash
npm run dev
```

Open http://localhost:3000

If you see no errors, your Supabase connection is working!

## Step 8: Ingest Documents

1. **Go to admin page**: http://localhost:3000/admin

2. **Click "Process All Documents"**

3. **Watch the progress** - each PDF takes 2-3 minutes

4. **Verify in Supabase**:
   - Go to Supabase Table Editor
   - Check `documents` table → should have 5 rows
   - Check `text_chunks` table → should have ~500 rows
   - Check `tables` table → should have ~50 rows
   - Check `table_rows` table → should have ~500 rows

## Supabase Dashboard Features

### SQL Editor

Run custom queries:

```sql
-- Check how many chunks per document
SELECT document_name, COUNT(*) as chunks
FROM text_chunks
GROUP BY document_name;

-- View all extracted tables
SELECT document_name, page, table_name, confidence
FROM tables
ORDER BY confidence DESC;

-- See financial data
SELECT table_name, row_label, column_label, value, unit
FROM table_rows
WHERE table_name = 'RATIOS'
LIMIT 10;
```

### Table Editor

- Browse all data visually
- Filter and search rows
- Edit data manually (for testing)
- View relationships

### Logs

- Monitor all database queries
- Check for slow queries
- Debug connection issues

### API

Supabase provides auto-generated REST API, but we use direct Postgres connection for better control.

## Advanced: Connection Pooling

For production with high traffic:

1. **Use Supabase Pooler** (included free):
   ```env
   DATABASE_URL=postgresql://postgres:password@db.xyz.supabase.co:6543/postgres?sslmode=require
   ```
   Note: Port `6543` instead of `5432`

2. **Benefits**:
   - Better performance under load
   - Automatic connection reuse
   - No connection limit issues

## Monitoring in Supabase

### Check Database Usage

1. **Go to Project Settings → Database**

2. **View**:
   - Storage used (should be <10MB for 5 docs)
   - Active connections
   - Query performance

### Set Up Alerts

1. **Go to Project Settings → Database**

2. **Enable alerts for**:
   - High storage usage (>400MB on free tier)
   - Connection limits
   - Slow queries

## Backup Strategy

### Automatic Backups

Supabase free tier includes:
- **Daily automatic backups** (7 days retention)
- Point-in-time recovery (PITR) on paid tier

### Manual Backups

Export your data:

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Export database
supabase db dump -f backup.sql
```

## Comparing Neon vs Supabase

| Feature | Supabase | Neon |
|---------|----------|------|
| Free Storage | 500MB | 3GB |
| Free Compute | Unlimited | 100 hours/month |
| Dashboard | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| Connection Pooling | ✅ Included | ✅ Included |
| pgvector | ✅ | ✅ |
| Backups | 7 days | 7 days |
| **Recommendation** | Better for this project | Better for larger data |

## Troubleshooting

### Connection Error: "password authentication failed"

**Solution**: Double-check password in connection string
```bash
# Test connection
psql "postgresql://postgres:your-password@db.xyz.supabase.co:5432/postgres"
```

### Error: "extension vector does not exist"

**Solution**: Enable pgvector
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Slow Queries

**Solutions**:
1. Check indexes are created (automatic with `npm run db:push`)
2. Use connection pooler (port 6543)
3. Monitor query performance in Supabase dashboard

### Storage Limit Reached

**Solutions**:
1. Delete old chat messages: `DELETE FROM chat_messages WHERE created_at < NOW() - INTERVAL '30 days';`
2. Upgrade to paid tier ($25/month for 8GB)
3. Use smaller documents or reduce chunk size

## Cost Estimation

### Free Tier (Sufficient for This Project)
- Storage: 500MB
- Compute: Unlimited
- Egress: 2GB/month
- **Cost**: $0/month

### Pro Tier (If You Need More)
- Storage: 8GB
- Compute: Unlimited
- Egress: 50GB/month
- Daily backups: 7 days
- **Cost**: $25/month

### Expected Usage (5 Documents, 100 Questions/Day)
- Storage: ~7MB (well within free tier)
- Compute: ~1000 queries/day (unlimited)
- Egress: ~10MB/day (well within free tier)

**Recommendation**: Start with **free tier**, upgrade if needed.

## Production Deployment with Supabase

When deploying to Vercel:

1. **Use production Supabase project** (not the same as dev)

2. **Set environment variables in Vercel**:
   ```
   DATABASE_URL=postgresql://postgres:pass@db.xyz.supabase.co:5432/postgres?sslmode=require
   ```

3. **Use connection pooler for production**:
   ```
   DATABASE_URL=postgresql://postgres:pass@db.xyz.supabase.co:6543/postgres?sslmode=require
   ```
   Note: Port `6543` for pooling

4. **Enable Row Level Security (RLS)** in Supabase:
   ```sql
   -- Only if you add authentication later
   ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
   ```

## Next Steps

1. ✅ Supabase project created
2. ✅ pgvector enabled
3. ✅ Connection string configured
4. ✅ Schema pushed to database
5. ⏳ **Run ingestion**: http://localhost:3000/admin
6. ⏳ **Test queries**: http://localhost:3000

## Support

- **Supabase Docs**: https://supabase.com/docs
- **Supabase Discord**: https://discord.supabase.com
- **This Project Docs**: See README.md

---

**You're now using Supabase for all storage!**
- Tokens (embeddings) ✅
- Tables (financial data) ✅
- Context (text chunks) ✅
