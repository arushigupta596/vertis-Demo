# Deployment Guide - Vercel

This guide covers deploying Vertis Document Chat to Vercel for production use.

## Pre-Deployment Checklist

Before deploying, ensure:

- [ ] Local development works perfectly
- [ ] All 5 PDFs have been ingested successfully locally
- [ ] Database schema is finalized (run `npm run db:push`)
- [ ] Environment variables are documented
- [ ] Code is pushed to GitHub repository

## Step 1: Prepare GitHub Repository

1. **Initialize git** (if not already done):
   ```bash
   cd /Users/arushigupta/Desktop/EMB/Demos/vertis-doc-chat
   git init
   git add .
   git commit -m "Initial commit: Vertis Document Chat"
   ```

2. **Create GitHub repository**:
   - Go to https://github.com/new
   - Name: `vertis-doc-chat`
   - Keep it private (contains business logic)
   - Don't initialize with README (we have one)

3. **Push to GitHub**:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/vertis-doc-chat.git
   git branch -M main
   git push -u origin main
   ```

## Step 2: Set Up Production Database

### Option A: Use Existing Neon Database

If you want to keep the same database from development:

1. Your current Neon database already has the schema
2. Data from local ingestion is already there
3. Skip to Step 3

### Option B: Create New Production Database

If you want a separate production database:

1. Go to https://neon.tech
2. Create a new project: "vertis-doc-chat-prod"
3. Copy the connection string
4. Run migrations:
   ```bash
   DATABASE_URL="your-new-connection-string" npm run db:push
   ```
5. **Note**: You'll need to re-ingest all PDFs in production

## Step 3: Deploy to Vercel

1. **Go to Vercel**: https://vercel.com

2. **Import project**:
   - Click "Add New" → "Project"
   - Import your GitHub repository
   - Select `vertis-doc-chat`

3. **Configure build settings**:
   - Framework Preset: Next.js
   - Root Directory: `./`
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`

4. **Add environment variables**:
   Click "Environment Variables" and add:

   ```
   DATABASE_URL=your-neon-connection-string
   OPENROUTER_API_KEY=sk-or-v1-your-key
   OPENROUTER_EMBED_MODEL=openai/text-embedding-ada-002
   OPENROUTER_LLM_MODEL=anthropic/claude-3.5-sonnet
   ```

   **Important**: Use production database URL, not localhost!

5. **Deploy**:
   - Click "Deploy"
   - Wait 2-3 minutes for build
   - You'll get a URL like: `https://vertis-doc-chat.vercel.app`

## Step 4: Post-Deployment Tasks

### 4.1 Verify Deployment

1. **Visit your Vercel URL**
2. Check that the homepage loads
3. Verify no console errors (F12 → Console)

### 4.2 Ingest Documents (If Using New DB)

If you created a new production database:

1. Go to `https://your-app.vercel.app/admin`
2. Click "Process All Documents"
3. Wait 10-15 minutes
4. Verify all show "Completed"

**Note**: If using the same database from dev, your data is already there.

### 4.3 Test Production

1. Go to `https://your-app.vercel.app`
2. Ask a factual question
3. Ask a financial question
4. Verify citations appear
5. Check Tables Viewer: `https://your-app.vercel.app/tables`

## Step 5: Configure Custom Domain (Optional)

1. **In Vercel dashboard**:
   - Go to project settings
   - Click "Domains"
   - Add your domain (e.g., `docs.vertis.co.in`)

2. **Update DNS records**:
   - Add CNAME record pointing to `cname.vercel-dns.com`
   - Wait for DNS propagation (5-60 minutes)

3. **Update OpenRouter config**:
   - Add environment variable: `NEXT_PUBLIC_APP_URL=https://docs.vertis.co.in`
   - Redeploy

## Monitoring & Maintenance

### Vercel Analytics

1. **Enable Analytics**:
   - Go to project in Vercel
   - Click "Analytics" tab
   - Enable Web Analytics

2. **Monitor**:
   - Response times
   - Error rates
   - Traffic patterns

### Database Monitoring

1. **Neon Dashboard**:
   - Monitor connection count
   - Check storage usage
   - Review query performance

2. **Set up alerts**:
   - Connection limit warnings
   - Storage capacity alerts

### Cost Monitoring

1. **OpenRouter**:
   - Monitor daily spend
   - Set up budget alerts
   - Expected: $0.10-0.50/day for light usage

2. **Neon**:
   - Track compute hours (Free tier: 100 hours/month)
   - Monitor storage (Free tier: 3GB)

3. **Vercel**:
   - Track bandwidth usage
   - Monitor function execution time

## Scaling Considerations

### For Heavy Usage (1000+ questions/day)

1. **Upgrade Neon**:
   - Move to Pro plan ($19/month)
   - Enable connection pooling
   - Consider read replicas

2. **Optimize OpenRouter**:
   - Cache frequent questions
   - Batch embed requests
   - Use cheaper models where possible

3. **Vercel Scaling**:
   - Pro plan if needed ($20/month)
   - Edge middleware for caching
   - ISR for static content

### For Large Document Sets (50+ PDFs)

1. **Partition tables**:
   - Split by date ranges
   - Create document categories
   - Use database partitioning

2. **Optimize vector search**:
   - Use HNSW indexes
   - Limit search scope by document ID
   - Increase chunk size to reduce vectors

## Security Best Practices

### Environment Variables

- ✅ Never commit `.env.local` to git
- ✅ Use Vercel environment variables UI
- ✅ Rotate API keys periodically
- ✅ Use different keys for dev/prod

### Database Security

- ✅ Use SSL connections (`?sslmode=require`)
- ✅ Restrict Neon IP allowlist (if needed)
- ✅ Regular backups enabled
- ✅ Monitor for unusual queries

### API Rate Limiting

Consider adding rate limiting to API routes:

```typescript
// Add to route.ts files
import { rateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  const identifier = req.ip ?? 'anonymous';
  const { success } = await rateLimit(identifier);

  if (!success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    );
  }

  // ... rest of handler
}
```

## Backup Strategy

### Database Backups

1. **Neon automatic backups**:
   - Enabled by default
   - 7-day retention on free tier
   - 30-day retention on paid tier

2. **Manual exports**:
   ```bash
   # Export schema
   npm run db:generate

   # Export data (pg_dump)
   pg_dump $DATABASE_URL > backup.sql
   ```

3. **Schedule**: Weekly manual exports recommended

### Document Backups

- Keep original PDFs in version control or cloud storage
- PDFs in `public/pdfs/` are deployed with app
- Consider separate backup of PDF files

## Rollback Procedure

If deployment fails:

1. **Instant Rollback**:
   - Go to Vercel dashboard
   - Click "Deployments"
   - Find last working deployment
   - Click "⋮" → "Promote to Production"

2. **Database Rollback**:
   - Neon: Restore from backup in dashboard
   - Or: Run previous migration file

3. **Verify**:
   - Test chat functionality
   - Check tables viewer
   - Verify documents load

## Production Checklist

Before announcing to users:

- [ ] All environment variables set correctly
- [ ] Database schema deployed (`db:push`)
- [ ] All PDFs ingested successfully
- [ ] Test factual questions return correct answers
- [ ] Test financial questions show table values
- [ ] Citations include page numbers
- [ ] Tables Viewer shows all extracted tables
- [ ] CSV/JSON exports work
- [ ] No console errors on any page
- [ ] Custom domain configured (if applicable)
- [ ] Analytics enabled
- [ ] Backup strategy in place
- [ ] Rate limiting configured (recommended)

## Support & Troubleshooting

### Common Production Issues

**Issue**: Database connection timeouts

**Solution**:
- Enable connection pooling in Neon
- Use `?poolTimeout=30` in DATABASE_URL
- Upgrade to Neon Pro for higher limits

**Issue**: OpenRouter API errors

**Solution**:
- Verify API key is correct
- Check credits balance
- Monitor rate limits
- Add retry logic for transient errors

**Issue**: Slow query responses

**Solution**:
- Check vector search performance
- Verify indexes are created
- Consider caching frequent queries
- Monitor OpenRouter API latency

### Getting Help

1. **Vercel Support**: https://vercel.com/support
2. **Neon Support**: https://neon.tech/docs/introduction
3. **OpenRouter Discord**: Check OpenRouter website

## Maintenance Schedule

**Weekly**:
- [ ] Review error logs in Vercel
- [ ] Check OpenRouter spend
- [ ] Monitor database storage

**Monthly**:
- [ ] Review analytics data
- [ ] Test ingestion pipeline
- [ ] Update dependencies (`npm update`)
- [ ] Review and optimize costs

**Quarterly**:
- [ ] Rotate API keys
- [ ] Audit user access
- [ ] Review backup integrity
- [ ] Test disaster recovery

## Success Metrics

Track these KPIs:

- **Availability**: Target 99.9% uptime
- **Response Time**: Target <5 seconds p95
- **Accuracy**: Target >95% correct answers
- **Usage**: Track questions per day
- **Costs**: Monitor monthly spend

---

**Deployment Status**: Ready for production
**Last Updated**: February 2026
**Maintainer**: Development Team
