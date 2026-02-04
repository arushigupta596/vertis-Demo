# 🚀 Deploying Vertis Document Chat to Vercel

**Complete Guide for Production Deployment**

---

## 📋 Prerequisites

Before deploying, ensure you have:

✅ GitHub account (to push your code)  
✅ Vercel account (sign up at https://vercel.com)  
✅ Supabase project (already configured)  
✅ OpenRouter API key (already have it)  

---

## 🔧 Step 1: Prepare Your Repository

### 1.1 Initialize Git (if not already done)

```bash
cd /Users/arushigupta/Desktop/EMB/Demos/Vertis
git init
```

### 1.2 Create .gitignore

```bash
cat > .gitignore << 'GITIGNORE'
# Dependencies
node_modules/
.pnp
.pnp.js

# Production
/build
/.next/
/out/

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Python
venv/
*.pyc
__pycache__/

# Testing
/coverage

# Misc
.DS_Store
*.pem

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Local Vercel
.vercel

# Drizzle (not needed for Supabase deployment)
drizzle/
GITIGNORE
```

### 1.3 Commit Your Code

```bash
git add .
git commit -m "Initial commit: Vertis Document Chat app"
```

### 1.4 Push to GitHub

```bash
# Create a new repository on GitHub (https://github.com/new)
# Then run:
git remote add origin https://github.com/YOUR_USERNAME/vertis-doc-chat.git
git branch -M main
git push -u origin main
```

---

## 🌐 Step 2: Deploy to Vercel

### 2.1 Connect GitHub to Vercel

1. Go to https://vercel.com/new
2. Click **"Import Git Repository"**
3. Select your GitHub repository: `vertis-doc-chat`
4. Click **"Import"**

### 2.2 Configure Build Settings

Vercel will auto-detect Next.js. Verify these settings:

- **Framework Preset**: Next.js
- **Build Command**: `npm run build`
- **Output Directory**: `.next` (default)
- **Install Command**: `npm install`
- **Node Version**: 18.x or higher

### 2.3 Configure Environment Variables

Click **"Environment Variables"** and add these:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
OPENROUTER_API_KEY

**Important**: Set all environment variables for **Production**, **Preview**, and **Development** environments.

### 2.4 Deploy

Click **"Deploy"** button!

Vercel will:
1. Install dependencies
2. Build your Next.js app
3. Deploy to production
4. Provide you with a URL (e.g., `vertis-doc-chat.vercel.app`)

---

## ⚙️ Step 3: Post-Deployment Configuration

### 3.1 Verify Deployment

Once deployed, visit your Vercel URL and check:

✅ Homepage loads  
✅ Documents appear in sidebar  
✅ Suggested questions visible  
✅ Chat functionality works  
✅ Tables API returns data  

### 3.2 Test Chat Functionality

Try these test questions:
- "Who is the auditor?" (factual)
- "What are the financial ratios?" (financial)

### 3.3 Check API Routes

Test these endpoints:
```
https://your-app.vercel.app/api/documents
https://your-app.vercel.app/api/tables?documentId=6
https://your-app.vercel.app/api/chat
```

---

## 🔐 Step 4: Security & Environment Variables

### 4.1 Update Supabase RLS (Row Level Security)

If needed, add RLS policies in Supabase SQL Editor:

```sql
-- Allow public read access to documents
CREATE POLICY "Public read access" ON documents
  FOR SELECT USING (true);

-- Allow public read access to tables
CREATE POLICY "Public read access" ON tables
  FOR SELECT USING (true);

-- Allow public read access to text_chunks
CREATE POLICY "Public read access" ON text_chunks
  FOR SELECT USING (true);

-- Allow public read access to table_rows
CREATE POLICY "Public read access" ON table_rows
  FOR SELECT USING (true);
```

### 4.2 Secure Your API Keys

**Important**: Never commit `.env.local` to Git!

The `.gitignore` file already excludes it, but double-check:
```bash
git status
# Should NOT show .env.local
```

---

## 📊 Step 5: Monitor & Optimize

### 5.1 Enable Analytics

In Vercel Dashboard:
1. Go to your project
2. Click **"Analytics"** tab
3. Enable Web Analytics (free)

### 5.2 Check Function Logs

To debug API issues:
1. Go to **"Functions"** tab in Vercel
2. Check logs for `/api/chat`, `/api/documents`, etc.

### 5.3 Performance Optimization

Already configured in `vercel.json`:
- API routes have 60s timeout
- Next.js optimizations enabled

---

## 🔄 Step 6: Continuous Deployment

### Automatic Deployments

Once connected to GitHub, Vercel will automatically deploy:

- **Main branch** → Production deployment
- **Other branches** → Preview deployments
- **Pull requests** → Preview deployments

### Manual Deployment

To deploy manually:
```bash
npx vercel --prod
```

---

## 🐛 Troubleshooting

### Issue 1: Build Fails

**Error**: `Module not found`

**Solution**: 
```bash
# Locally test build
npm run build

# If successful, commit and push
git add .
git commit -m "Fix build"
git push
```

### Issue 2: API Routes Timeout

**Error**: Function execution timeout

**Solution**: 
- Already set to 60s in `vercel.json`
- If still timing out, consider caching embeddings

### Issue 3: Environment Variables Not Working

**Solution**:
1. Go to Vercel Dashboard → Settings → Environment Variables
2. Verify all variables are set for all environments
3. Redeploy: Deployments → Click ⋯ → Redeploy

### Issue 4: Python Scripts Not Running

**Note**: Vercel doesn't support Python execution in serverless functions.

**Solution**: 
- Document ingestion should be done locally or via separate service
- Only the Next.js frontend + API routes run on Vercel
- Supabase database already has the data from local ingestion

---

## 📁 Important Files

### Files for Vercel Deployment

- `vercel.json` - Vercel configuration
- `.vercelignore` - Files to exclude from deployment
- `.gitignore` - Files to exclude from Git
- `package.json` - Dependencies and scripts
- `next.config.ts` - Next.js configuration

### Files NOT Deployed

- `venv/` - Python virtual environment (local only)
- `scripts/` - Python scripts (run locally for ingestion)
- `.env.local` - Environment variables (use Vercel dashboard instead)
- Documentation files (except README.md)

---

## ✅ Deployment Checklist

Before deploying, ensure:

- [ ] Code pushed to GitHub
- [ ] `.gitignore` excludes `.env.local`
- [ ] All environment variables added to Vercel
- [ ] Supabase database has documents and tables
- [ ] Local build works: `npm run build`
- [ ] No hardcoded secrets in code

After deploying:

- [ ] Homepage loads correctly
- [ ] Documents API returns data
- [ ] Tables API returns data
- [ ] Chat functionality works
- [ ] Evidence panel displays
- [ ] Suggested questions clickable

---

## 🎯 Production URL

After deployment, your app will be available at:

```
https://vertis-doc-chat.vercel.app
```

Or your custom domain if configured.

---

## 🔄 Updating Your Deployment

To deploy changes:

```bash
# Make your changes
git add .
git commit -m "Update: description of changes"
git push

# Vercel automatically deploys!
```

---

## 📚 Additional Resources

- **Vercel Docs**: https://vercel.com/docs
- **Next.js Deployment**: https://nextjs.org/docs/deployment
- **Supabase Docs**: https://supabase.com/docs
- **OpenRouter Docs**: https://openrouter.ai/docs

---

## 🎊 You're Ready to Deploy!

Follow the steps above to deploy your Vertis Document Chat to Vercel.

**Estimated Deployment Time**: 5-10 minutes

**Cost**: Free tier (Vercel Hobby plan)

Good luck! 🚀
