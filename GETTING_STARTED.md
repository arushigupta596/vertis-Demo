# Getting Started with Vertis Document Chat

## Prerequisites Checklist

Before you begin, ensure you have:

- ✅ Node.js 18+ installed
- ✅ npm or yarn installed
- ✅ Neon or Supabase PostgreSQL account
- ✅ OpenRouter API account with credits

## Step-by-Step Setup

### Step 1: Create Neon Database

1. Go to https://neon.tech and sign up
2. Click "Create Project"
3. Choose a project name (e.g., "vertis-doc-chat")
4. Select region (choose closest to your location)
5. Wait for project creation
6. Copy the connection string (should look like):
   ```
   postgresql://username:password@ep-xyz-abc.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

7. **Enable pgvector extension**:
   - Click "SQL Editor" in Neon dashboard
   - Run this command:
     ```sql
     CREATE EXTENSION IF NOT EXISTS vector;
     ```
   - You should see: `CREATE EXTENSION`

### Step 2: Get OpenRouter API Key

1. Go to https://openrouter.ai and sign up
2. Click "Keys" in the sidebar
3. Click "Create Key"
4. Name it "vertis-doc-chat"
5. Copy the key (starts with `sk-or-v1-`)
6. Add credits:
   - Click "Credits" in sidebar
   - Add at least $5 (sufficient for ~1500 questions)

### Step 3: Install & Configure

1. **Navigate to project**:
   ```bash
   cd /Users/arushigupta/Desktop/EMB/Demos/vertis-doc-chat
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Create `.env.local` file**:
   ```bash
   touch .env.local
   ```

4. **Add your credentials** (open `.env.local` in editor):
   ```env
   DATABASE_URL=postgresql://username:password@ep-xyz.neon.tech/neondb?sslmode=require
   OPENROUTER_API_KEY=sk-or-v1-your-actual-key-here
   OPENROUTER_EMBED_MODEL=openai/text-embedding-ada-002
   OPENROUTER_LLM_MODEL=anthropic/claude-3.5-sonnet
   ```

5. **Push database schema**:
   ```bash
   npm run db:push
   ```

   Expected output:
   ```
   ✓ Pulling schema from database
   ✓ Generating migrations
   ✓ Pushing schema to database
   ✓ Done!
   ```

### Step 4: Start Development Server

```bash
npm run dev
```

You should see:
```
   ▲ Next.js 16.1.6
   - Local:        http://localhost:3000

✓ Starting...
✓ Ready in 2.3s
```

Open http://localhost:3000 in your browser.

### Step 5: Ingest Documents

1. **Go to admin page**: http://localhost:3000/admin

2. **Click "Process All Documents"**

3. **Wait for processing** (10-15 minutes total):
   - Each PDF takes 2-3 minutes
   - You'll see progress indicators
   - Status changes: pending → processing → completed

4. **Verify completion**:
   - All 5 documents should show "Completed" status
   - If any fail, click "Retry" button

### Step 6: Test the System

1. **Go to chat page**: http://localhost:3000

2. **Try factual questions**:
   - "Who is the auditor?"
   - "What was the record date?"
   - "What were the outcomes of the board meeting?"

3. **Try financial questions**:
   - "What is the debt service coverage ratio?"
   - "Show me the distribution per unit"
   - "What are the financial ratios?"

4. **Verify evidence**:
   - Check right panel for citations
   - Verify page numbers are shown
   - For financial questions, check table names and values

### Step 7: Explore Tables Viewer

1. **Go to tables page**: http://localhost:3000/tables

2. **Select a document** from the left panel

3. **Select a page** or view all pages

4. **Click on a table** to view:
   - Extracted table grid
   - Context lines above and below
   - Metadata (type, unit, confidence)

5. **Try exports**:
   - Click "CSV" to download table as CSV
   - Click "JSON" to download full metadata

## Verification Checklist

After setup, verify each component:

- [ ] Database connection works (no errors when running `npm run db:push`)
- [ ] Dev server starts without errors
- [ ] Admin page loads at http://localhost:3000/admin
- [ ] All 5 PDFs show in admin page
- [ ] Ingestion completes successfully (all "Completed" status)
- [ ] Chat page loads at http://localhost:3000
- [ ] Documents appear in left sidebar
- [ ] Questions return answers (not errors)
- [ ] Evidence panel shows citations
- [ ] Tables viewer shows extracted tables
- [ ] CSV/JSON exports work

## Common Setup Issues

### Issue: `DATABASE_URL is required`

**Solution**: Ensure `.env.local` exists and has valid `DATABASE_URL`

```bash
# Check if file exists
ls -la .env.local

# Verify content
cat .env.local
```

### Issue: `Failed to connect to database`

**Solutions**:
1. Verify connection string is correct (copy again from Neon)
2. Ensure `?sslmode=require` is at the end
3. Check Neon project is active (not paused)

### Issue: `OPENROUTER_API_KEY is required`

**Solution**: Verify key is in `.env.local` and starts with `sk-or-v1-`

### Issue: Ingestion fails with "Rate limit exceeded"

**Solution**: OpenRouter free tier has rate limits
- Wait 60 seconds between documents
- Upgrade to paid tier for faster ingestion
- Check OpenRouter dashboard for rate limit info

### Issue: Ingestion fails with "Insufficient credits"

**Solution**: Add credits to OpenRouter account
- Go to https://openrouter.ai
- Click "Credits"
- Add $5 minimum

### Issue: No tables extracted from PDFs

**Solution**: Tables rely on PDF formatting
- Check if PDFs have actual tables (not images of tables)
- View extracted tables in Tables Viewer to verify
- Confidence scores below 0.5 indicate poor extraction

### Issue: Questions return "Not available in the provided documents"

**Possible causes**:
1. Ingestion didn't complete successfully
2. Question is too specific or uses different wording
3. Information truly isn't in the documents

**Debug steps**:
- Check ingestion logs in admin page
- Try rephrasing the question
- Verify information exists by checking Tables Viewer

## Next Steps

Now that you're set up:

1. **Read the README**: Full documentation at [README.md](./README.md)
2. **Check Project Summary**: Architecture details at [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md)
3. **Test thoroughly**: Try 20-30 questions to understand capabilities
4. **Deploy to production**: See README for Vercel deployment

## Getting Help

If you encounter issues:

1. Check the troubleshooting sections in:
   - This guide (above)
   - [SETUP.md](./SETUP.md)
   - [README.md](./README.md)

2. Verify your environment:
   ```bash
   # Check Node version
   node --version  # Should be 18+

   # Check npm version
   npm --version

   # Verify .env.local exists
   cat .env.local
   ```

3. Check browser console for errors (F12 in Chrome)

4. Check terminal output for server errors

## Success! 🎉

If all steps completed successfully, you now have:

- ✅ A working document Q&A system
- ✅ 5 ingested PDFs ready for querying
- ✅ Factual and financial question answering
- ✅ Table extraction and auditing capabilities
- ✅ Full citation tracking

Start asking questions and exploring your documents!
