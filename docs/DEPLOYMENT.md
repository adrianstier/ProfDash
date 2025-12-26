# ScholarOS Deployment Guide

This guide covers deploying ScholarOS to production environments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Architecture Overview](#architecture-overview)
3. [Supabase Setup](#supabase-setup)
4. [Vercel Deployment](#vercel-deployment)
5. [AI Service Deployment](#ai-service-deployment)
6. [Environment Variables](#environment-variables)
7. [Google Calendar Setup](#google-calendar-setup)
8. [Post-Deployment Checklist](#post-deployment-checklist)
9. [Monitoring & Maintenance](#monitoring--maintenance)

---

## Prerequisites

Before deploying, ensure you have:

- Node.js 18+ installed locally
- pnpm package manager (`npm install -g pnpm`)
- A [Supabase](https://supabase.com) account (free tier available)
- A [Vercel](https://vercel.com) account (free tier available)
- A [Google Cloud Console](https://console.cloud.google.com) project (for calendar integration)
- An [Anthropic](https://anthropic.com) or [OpenAI](https://openai.com) API key (for AI features)

---

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Web Client    │────▶│   Vercel Edge   │────▶│    Supabase     │
│   (Next.js)     │     │   (Next.js)     │     │   (Database)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌─────────────────┐
                        │   AI Service    │
                        │   (FastAPI)     │
                        └─────────────────┘
```

Components:
- **Web Client**: Next.js 15 application hosted on Vercel
- **Database**: Supabase PostgreSQL with Row Level Security
- **AI Service**: Python FastAPI microservice (can be self-hosted or deployed to Railway/Render)

---

## Supabase Setup

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your project URL and anon key from Project Settings > API

### 2. Run Database Migrations

The migrations are located in `scholaros/supabase/migrations/`. Apply them in order:

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Push migrations
supabase db push
```

Alternatively, run the SQL files manually in the Supabase SQL Editor:

1. `20241217000000_initial_schema.sql` - Base tables (profiles, tasks)
2. `20241217000001_workspace_invites.sql` - Workspaces and invites
3. `20241217000002_project_milestones_notes.sql` - Projects system
4. `20241217000003_calendar_integrations.sql` - Calendar connections
5. `20241217000004_funding_opportunities.sql` - Grants system

### 3. Configure Authentication

In Supabase Dashboard:

1. Go to **Authentication > Providers**
2. Enable **Email** provider
3. (Optional) Configure email templates in **Authentication > Email Templates**
4. Add your production URL to **Authentication > URL Configuration**:
   - Site URL: `https://your-domain.com`
   - Redirect URLs: `https://your-domain.com/**`

### 4. Enable Row Level Security

RLS is already configured in the migrations. Verify policies are active:

1. Go to **Table Editor**
2. Click on each table
3. Ensure "RLS Enabled" badge is visible

---

## Vercel Deployment

### 1. Connect Repository

1. Go to [vercel.com](https://vercel.com) and import your GitHub repository
2. Select the `scholaros` directory as the root directory
3. Framework preset: **Next.js**

### 2. Configure Build Settings

```
Build Command: pnpm build
Output Directory: apps/web/.next
Install Command: pnpm install
Root Directory: scholaros
```

### 3. Add Environment Variables

In Vercel Project Settings > Environment Variables, add:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx
GOOGLE_REDIRECT_URI=https://your-domain.com/api/auth/google/callback
AI_SERVICE_URL=https://your-ai-service.com
AI_SERVICE_API_KEY=your-internal-api-key
```

### 4. Deploy

Click **Deploy**. Vercel will build and deploy your application.

### 5. Configure Custom Domain (Optional)

1. Go to **Project Settings > Domains**
2. Add your custom domain
3. Configure DNS as instructed

---

## AI Service Deployment

The AI service is a Python FastAPI application that handles task extraction, project summaries, and grant fit scoring.

### Option 1: Railway

1. Create a new project on [railway.app](https://railway.app)
2. Connect your GitHub repository
3. Set the root directory to `scholaros/services/ai`
4. Add environment variables:
   ```
   LLM_PROVIDER=anthropic
   ANTHROPIC_API_KEY=sk-ant-xxx
   API_KEY=your-internal-api-key
   ```
5. Railway will auto-detect the Dockerfile and deploy

### Option 2: Render

1. Create a new Web Service on [render.com](https://render.com)
2. Connect your repository
3. Set:
   - Root Directory: `scholaros/services/ai`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Add environment variables

### Option 3: Docker Self-Host

```bash
cd scholaros/services/ai

# Build image
docker build -t scholaros-ai .

# Run container
docker run -d \
  -p 8000:8000 \
  -e LLM_PROVIDER=anthropic \
  -e ANTHROPIC_API_KEY=sk-ant-xxx \
  -e API_KEY=your-internal-api-key \
  scholaros-ai
```

### Option 4: Local Development Only

If you don't need AI features in production, you can skip this step. AI features will gracefully degrade when the service is unavailable.

---

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJ...` |

### Google Calendar Integration

| Variable | Description | Example |
|----------|-------------|---------|
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | `xxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | `GOCSPX-xxx` |
| `GOOGLE_REDIRECT_URI` | OAuth callback URL | `https://your-domain.com/api/auth/google/callback` |

### AI Service

| Variable | Description | Example |
|----------|-------------|---------|
| `AI_SERVICE_URL` | URL to AI service | `https://your-ai-service.com` |
| `AI_SERVICE_API_KEY` | Internal API key for AI service | `your-secret-key` |

### AI Service Environment (services/ai)

| Variable | Description | Example |
|----------|-------------|---------|
| `LLM_PROVIDER` | LLM provider to use | `anthropic` or `openai` |
| `ANTHROPIC_API_KEY` | Anthropic API key | `sk-ant-xxx` |
| `OPENAI_API_KEY` | OpenAI API key (if using OpenAI) | `sk-xxx` |
| `API_KEY` | Internal authentication key | `your-secret-key` |

---

## Google Calendar Setup

### 1. Create Google Cloud Project

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable the **Google Calendar API**:
   - Go to **APIs & Services > Library**
   - Search for "Google Calendar API"
   - Click **Enable**

### 2. Configure OAuth Consent Screen

1. Go to **APIs & Services > OAuth consent screen**
2. Choose **External** user type
3. Fill in required fields:
   - App name: "ScholarOS"
   - User support email: your email
   - Developer contact: your email
4. Add scopes:
   - `https://www.googleapis.com/auth/calendar.readonly`
   - `https://www.googleapis.com/auth/calendar.events.readonly`
5. Add test users during development

### 3. Create OAuth Credentials

1. Go to **APIs & Services > Credentials**
2. Click **Create Credentials > OAuth client ID**
3. Application type: **Web application**
4. Name: "ScholarOS Web"
5. Authorized redirect URIs:
   - Development: `http://localhost:3000/api/auth/google/callback`
   - Production: `https://your-domain.com/api/auth/google/callback`
6. Copy the Client ID and Client Secret

### 4. Publish App (for production)

1. Go to **OAuth consent screen**
2. Click **Publish App** to move from testing to production
3. This allows any Google user to connect their calendar

---

## Post-Deployment Checklist

### Security

- [ ] Verify RLS policies are enabled on all tables
- [ ] Ensure environment variables are set correctly
- [ ] Check that API keys are not exposed in client-side code
- [ ] Configure CORS for AI service to only allow your domain
- [ ] Set up Supabase Auth email confirmation (recommended)

### Functionality

- [ ] Test user registration and login
- [ ] Create a workspace and verify data isolation
- [ ] Add tasks and projects
- [ ] Test Google Calendar connection (if configured)
- [ ] Test AI features (if AI service deployed)
- [ ] Verify pagination works on large lists
- [ ] Test accessibility with keyboard navigation

### Performance

- [ ] Enable Vercel Analytics (optional)
- [ ] Check Core Web Vitals in Vercel dashboard
- [ ] Verify database indexes are in place
- [ ] Test with multiple concurrent users

---

## Monitoring & Maintenance

### Vercel Monitoring

- **Analytics**: Enable in Vercel dashboard for traffic insights
- **Logs**: View function logs in Vercel dashboard
- **Error Tracking**: Consider integrating Sentry

### Supabase Monitoring

- **Database Health**: Check in Supabase dashboard
- **API Usage**: Monitor in Project Settings > Usage
- **Logs**: View in Database > Logs

### AI Service Monitoring

- Monitor logs from your hosting provider
- Set up health check endpoint: `GET /health`
- Monitor LLM API costs in Anthropic/OpenAI dashboard

### Database Maintenance

```sql
-- Check table sizes
SELECT
  relname as table,
  pg_size_pretty(pg_total_relation_size(relid)) as size
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC;

-- Vacuum tables periodically (Supabase does this automatically)
VACUUM ANALYZE tasks;
VACUUM ANALYZE projects;
```

### Backup Strategy

Supabase provides automatic daily backups on paid plans. For additional safety:

1. Enable Point-in-Time Recovery (Pro plan)
2. Export data periodically using pg_dump or the export feature
3. Store backups in a separate location

---

## Troubleshooting

### Common Issues

**"Invalid Supabase URL" error**
- Verify `NEXT_PUBLIC_SUPABASE_URL` is set correctly
- Ensure it starts with `https://`

**Google Calendar connection fails**
- Check redirect URI matches exactly in Google Console
- Verify both `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set

**AI features return errors**
- Verify `AI_SERVICE_URL` is accessible from your Vercel deployment
- Check AI service logs for detailed error messages
- Ensure API key matches between Next.js and AI service

**Tasks/Projects not showing**
- Check browser console for API errors
- Verify RLS policies allow read access
- Ensure user is authenticated

### Getting Help

- Check the [PROGRESS.md](./PROGRESS.md) for current status
- Review [API.md](./API.md) for endpoint documentation
- Open an issue on GitHub for bugs

---

## Scaling Considerations

### Database

- Supabase Free tier: 500MB database, 2GB bandwidth
- Upgrade to Pro for larger workloads
- Add indexes for frequently queried columns

### AI Service

- Consider caching AI responses for repeated queries
- Implement request queuing for high-traffic scenarios
- Monitor LLM costs and set spending limits

### Web Application

- Vercel automatically scales on the Pro plan
- Consider edge caching for static assets
- Use ISR (Incremental Static Regeneration) for appropriate pages
