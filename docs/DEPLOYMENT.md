# ScholarOS Deployment Guide

This guide covers deploying ScholarOS to production environments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Architecture Overview](#architecture-overview)
3. [Quick Start](#quick-start)
4. [Supabase Setup](#supabase-setup)
5. [Vercel Deployment](#vercel-deployment)
6. [AI Service Deployment](#ai-service-deployment)
7. [Environment Variables](#environment-variables)
8. [Google Calendar Setup](#google-calendar-setup)
9. [Post-Deployment Checklist](#post-deployment-checklist)
10. [Monitoring & Maintenance](#monitoring--maintenance)
11. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before deploying, ensure you have:

| Requirement | Version | Purpose |
|-------------|---------|---------|
| Node.js | 20.0.0+ | Build and development |
| pnpm | 9.15.0+ | Package management |
| Supabase CLI | Latest | Database management |
| Git | Latest | Version control |

**Accounts Required:**

- [Supabase](https://supabase.com) - Database, Auth, Storage (free tier available)
- [Vercel](https://vercel.com) - Hosting (free tier available)
- [Google Cloud Console](https://console.cloud.google.com) - Calendar integration (optional)
- [Anthropic](https://anthropic.com) - AI features (optional)

---

## Architecture Overview

```
                              ┌─────────────────────────────────┐
                              │         End Users               │
                              │    (Browser / Mobile Web)       │
                              └───────────────┬─────────────────┘
                                              │
                                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Vercel Edge Network                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                      Next.js 15 Application                              ││
│  │                                                                          ││
│  │  • Server Components (SSR)                                               ││
│  │  • API Routes (/api/*)                                                   ││
│  │  • Middleware (Auth)                                                     ││
│  │  • Static Assets                                                         ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
               ┌─────────────────────┼─────────────────────┐
               │                     │                     │
               ▼                     ▼                     ▼
┌──────────────────────┐  ┌──────────────────┐  ┌──────────────────────────┐
│     Supabase         │  │   AI Service     │  │     External APIs        │
│                      │  │   (Optional)     │  │                          │
│  • PostgreSQL        │  │  • Railway       │  │  • Google Calendar       │
│  • Auth              │  │  • Render        │  │  • Grants.gov            │
│  • Storage           │  │  • Fly.io        │  │  • NIH RePORTER          │
│  • Realtime          │  │                  │  │  • Anthropic Claude      │
│  • Row Level Security│  │  FastAPI +       │  │                          │
└──────────────────────┘  │  Python 3.11     │  └──────────────────────────┘
                          └──────────────────┘
```

---

## Quick Start

For experienced developers, here's the fastest path to deployment:

```bash
# 1. Clone and install
git clone https://github.com/yourusername/profdash.git
cd profdash/scholaros
pnpm install

# 2. Set up Supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push

# 3. Configure environment (copy and edit)
cp .env.example apps/web/.env.local
# Edit with your Supabase URL and keys

# 4. Deploy to Vercel
vercel

# 5. Set environment variables in Vercel dashboard

# 6. Redeploy
vercel --prod
```

---

## Supabase Setup

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **New Project**
3. Fill in:
   - **Name**: `scholaros` (or your preferred name)
   - **Database Password**: Generate a strong password (save it!)
   - **Region**: Choose closest to your users
4. Wait for project to provision (~2 minutes)

### 2. Get API Credentials

1. Go to **Project Settings** > **API**
2. Copy these values:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (keep secret!)

### 3. Run Database Migrations

**Option A: Using Supabase CLI (Recommended)**

```bash
# Install CLI
npm install -g supabase

# Login
supabase login

# Link to your project
cd scholaros
supabase link --project-ref YOUR_PROJECT_REF

# Push all migrations
supabase db push
```

**Option B: Manual SQL Execution**

If you can't use the CLI, run migrations manually in the SQL Editor:

1. Go to **SQL Editor** in Supabase dashboard
2. Run each migration file in order:

```
supabase/migrations/
├── 20241217000000_initial_schema.sql         # 1st - Core tables
├── 20241217000001_workspace_invites.sql      # 2nd - Workspaces
├── 20241217000002_project_milestones_notes.sql # 3rd - Projects
├── 20241217000003_calendar_integrations.sql  # 4th - Calendar
├── 20241217000004_funding_opportunities.sql  # 5th - Grants
├── 20241219000000_fix_task_workspace_rls.sql # 6th - RLS fixes
├── 20241221000000_documents_and_ai.sql       # 7th - AI/Docs
├── 20241221000001_publications.sql           # 8th - Publications
└── 20241221100000_agent_framework.sql        # 9th - Agents
```

### 4. Configure Authentication

1. Go to **Authentication** > **Providers**
2. Enable **Email** provider (default)
3. Go to **Authentication** > **URL Configuration**
4. Set:
   - **Site URL**: `https://your-domain.com`
   - **Redirect URLs**: Add these patterns:
     ```
     https://your-domain.com/**
     http://localhost:3000/**
     ```

### 5. Configure Email Templates (Optional)

1. Go to **Authentication** > **Email Templates**
2. Customize templates for:
   - Confirm signup
   - Invite user
   - Reset password

### 6. Verify RLS is Enabled

1. Go to **Table Editor**
2. Click on each table (tasks, projects, workspaces, etc.)
3. Verify the **RLS Enabled** badge is visible
4. If not, click **Enable RLS** in the table settings

---

## Vercel Deployment

### 1. Connect Repository

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **Add New...** > **Project**
3. Import your GitHub/GitLab repository
4. Configure:
   - **Framework Preset**: Next.js
   - **Root Directory**: `scholaros`

### 2. Configure Build Settings

In **Build & Development Settings**:

| Setting | Value |
|---------|-------|
| Build Command | `pnpm build` |
| Output Directory | `apps/web/.next` |
| Install Command | `pnpm install` |
| Development Command | `pnpm dev` |

### 3. Add Environment Variables

In **Environment Variables**, add:

```env
# Required - Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Required - App URL
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app

# Optional - Google Calendar
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx
GOOGLE_REDIRECT_URI=https://your-domain.vercel.app/api/auth/google/callback

# Optional - AI Service
AI_SERVICE_URL=https://your-ai-service.com
AI_SERVICE_API_KEY=your-internal-api-key
ANTHROPIC_API_KEY=sk-ant-xxx
```

### 4. Deploy

1. Click **Deploy**
2. Wait for build to complete (~2-3 minutes)
3. Your app is now live at `https://your-project.vercel.app`

### 5. Configure Custom Domain (Optional)

1. Go to **Project Settings** > **Domains**
2. Add your custom domain
3. Configure DNS as instructed:
   - **A Record**: Point to Vercel IP
   - **CNAME**: Point subdomain to `cname.vercel-dns.com`
4. Wait for DNS propagation (~10 minutes to 48 hours)

---

## AI Service Deployment

The AI service is optional but enables task extraction, project summaries, and grant fit scoring.

### Option 1: Railway (Recommended)

Railway provides simple Docker deployment with generous free tier.

1. Go to [railway.app](https://railway.app) and sign in
2. Click **New Project** > **Deploy from GitHub repo**
3. Select your repository
4. In **Settings**:
   - **Root Directory**: `scholaros/services/ai`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add **Variables**:
   ```env
   ANTHROPIC_API_KEY=sk-ant-xxx
   API_KEY=your-internal-api-key
   CORS_ORIGINS=https://your-domain.vercel.app
   ```
6. Deploy!

### Option 2: Render

1. Go to [render.com](https://render.com) and sign in
2. Click **New** > **Web Service**
3. Connect your repository
4. Configure:
   - **Name**: `scholaros-ai`
   - **Root Directory**: `scholaros/services/ai`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables
6. Deploy

### Option 3: Fly.io

```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Navigate to AI service
cd scholaros/services/ai

# Create app
fly launch

# Set secrets
fly secrets set ANTHROPIC_API_KEY=sk-ant-xxx
fly secrets set API_KEY=your-internal-api-key
fly secrets set CORS_ORIGINS=https://your-domain.vercel.app

# Deploy
fly deploy
```

### Option 4: Docker Self-Host

```bash
cd scholaros/services/ai

# Build image
docker build -t scholaros-ai .

# Run container
docker run -d \
  --name scholaros-ai \
  -p 8000:8000 \
  -e ANTHROPIC_API_KEY=sk-ant-xxx \
  -e API_KEY=your-internal-api-key \
  -e CORS_ORIGINS=https://your-domain.com \
  scholaros-ai
```

### Option 5: Skip AI Service

If you don't need AI features, simply don't configure `AI_SERVICE_URL`. The app will gracefully degrade - AI features will show as unavailable.

---

## Environment Variables

### Complete Reference

#### Required Variables

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Supabase Dashboard > Settings > API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public anon key | Supabase Dashboard > Settings > API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Supabase Dashboard > Settings > API |

#### Google Calendar (Optional)

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `GOOGLE_CLIENT_ID` | OAuth client ID | Google Cloud Console > APIs > Credentials |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret | Google Cloud Console > APIs > Credentials |
| `GOOGLE_REDIRECT_URI` | OAuth callback URL | Your domain + `/api/auth/google/callback` |

#### AI Service (Optional)

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `AI_SERVICE_URL` | URL to AI microservice | Your AI service deployment |
| `AI_SERVICE_API_KEY` | Internal API key | Generate a secure random string |
| `ANTHROPIC_API_KEY` | Anthropic API key | console.anthropic.com |

#### AI Service Configuration (for services/ai)

| Variable | Description | Default |
|----------|-------------|---------|
| `ANTHROPIC_API_KEY` | Anthropic API key | Required |
| `API_KEY` | Internal authentication | Required |
| `CORS_ORIGINS` | Allowed origins (comma-separated) | `*` |
| `LOG_LEVEL` | Logging level | `INFO` |

### Environment File Template

Create `scholaros/apps/web/.env.local`:

```env
# ===========================================
# REQUIRED - Supabase
# ===========================================
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ===========================================
# OPTIONAL - Google Calendar Integration
# ===========================================
GOOGLE_CLIENT_ID=YOUR_CLIENT_ID.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-YOUR_SECRET
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

# ===========================================
# OPTIONAL - AI Features
# ===========================================
AI_SERVICE_URL=http://localhost:8000
AI_SERVICE_API_KEY=your-secure-api-key
ANTHROPIC_API_KEY=sk-ant-api03-...

# ===========================================
# OPTIONAL - App Configuration
# ===========================================
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Google Calendar Setup

### 1. Create Google Cloud Project

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Click **Select Project** > **New Project**
3. Name it `ScholarOS` (or similar)
4. Click **Create**

### 2. Enable Google Calendar API

1. Go to **APIs & Services** > **Library**
2. Search for "Google Calendar API"
3. Click **Enable**

### 3. Configure OAuth Consent Screen

1. Go to **APIs & Services** > **OAuth consent screen**
2. Choose **External** user type (unless you have Google Workspace)
3. Fill in:
   - **App name**: ScholarOS
   - **User support email**: Your email
   - **Developer contact**: Your email
4. Click **Save and Continue**
5. Add scopes:
   - `https://www.googleapis.com/auth/calendar.readonly`
   - `https://www.googleapis.com/auth/calendar.events.readonly`
6. Add test users (for development)

### 4. Create OAuth Credentials

1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth client ID**
3. Choose **Web application**
4. Name: `ScholarOS Web`
5. Add **Authorized redirect URIs**:
   - Development: `http://localhost:3000/api/auth/google/callback`
   - Production: `https://your-domain.com/api/auth/google/callback`
6. Click **Create**
7. Copy **Client ID** and **Client Secret**

### 5. Publish App (for Production)

1. Go to **OAuth consent screen**
2. Click **Publish App**
3. Confirm to move from testing to production

> **Note**: Publishing is required for users outside your test users list.

---

## Post-Deployment Checklist

### Security Verification

- [ ] RLS policies are enabled on all tables in Supabase
- [ ] Environment variables are set (not hardcoded in code)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is not exposed in client-side code
- [ ] CORS is configured correctly for AI service
- [ ] Email confirmation is enabled in Supabase Auth (recommended)
- [ ] Rate limiting is active

### Functionality Testing

- [ ] User registration works
- [ ] User login works
- [ ] Password reset emails are sent
- [ ] Creating a workspace succeeds
- [ ] Creating tasks succeeds
- [ ] Tasks are isolated to workspaces (RLS test)
- [ ] Google Calendar connection works (if configured)
- [ ] AI features work (if AI service deployed)
- [ ] Quick-add parsing works correctly

### Performance Verification

- [ ] Page load times are acceptable (<3s)
- [ ] Core Web Vitals pass in Vercel Analytics
- [ ] Database indexes are in place

### Monitoring Setup

- [ ] Vercel Analytics enabled
- [ ] Error tracking configured (Sentry recommended)
- [ ] Database monitoring in Supabase Dashboard

---

## Monitoring & Maintenance

### Vercel Monitoring

**Enable Analytics:**
1. Go to Vercel Project > Analytics
2. Enable Web Analytics
3. View Core Web Vitals, traffic, and performance

**View Logs:**
1. Go to Vercel Project > Deployments
2. Click on a deployment
3. View **Runtime Logs** for function execution

### Supabase Monitoring

**Database Health:**
1. Go to Supabase Dashboard > Database
2. Check **Database** health indicators
3. View **Slow Queries** in the SQL Editor

**API Usage:**
1. Go to **Settings** > **Usage**
2. Monitor API calls, bandwidth, storage

**Real-time Logs:**
1. Go to **Logs** in sidebar
2. Filter by service (API, Auth, Database)

### AI Service Monitoring

```bash
# Check health endpoint
curl https://your-ai-service.com/health

# View logs (Railway)
railway logs

# View logs (Render)
# Check Render dashboard

# View logs (Docker)
docker logs scholaros-ai
```

### Database Maintenance

```sql
-- Check table sizes
SELECT
  relname as table_name,
  pg_size_pretty(pg_total_relation_size(relid)) as total_size
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC;

-- Check slow queries
SELECT * FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 20;

-- Vacuum tables (usually automatic in Supabase)
VACUUM ANALYZE tasks;
VACUUM ANALYZE projects;
```

### Backup Strategy

**Supabase Automatic Backups:**
- Free tier: 7-day retention
- Pro tier: 30-day retention + Point-in-Time Recovery

**Manual Backup:**
```bash
# Export with pg_dump
pg_dump postgresql://postgres:password@db.xxx.supabase.co:5432/postgres > backup.sql
```

---

## Troubleshooting

### Common Issues

#### "Invalid Supabase URL" Error

**Cause**: Incorrect or missing `NEXT_PUBLIC_SUPABASE_URL`

**Solution**:
1. Check the URL starts with `https://`
2. Verify it matches your Supabase project URL exactly
3. Ensure there's no trailing slash

#### Google Calendar Connection Fails

**Cause**: Redirect URI mismatch

**Solution**:
1. Check `GOOGLE_REDIRECT_URI` exactly matches what's in Google Console
2. Ensure you've added both development and production URLs
3. Check for trailing slashes or protocol mismatches

#### AI Features Return Errors

**Cause**: AI service unreachable or misconfigured

**Solution**:
1. Verify `AI_SERVICE_URL` is accessible
2. Check AI service logs for errors
3. Verify `AI_SERVICE_API_KEY` matches on both sides
4. Test AI service directly:
   ```bash
   curl -X POST https://your-ai-service.com/health
   ```

#### Tasks/Projects Not Showing

**Cause**: RLS policies blocking access

**Solution**:
1. Check user is authenticated (not logged out)
2. Verify user is a member of the workspace
3. Check RLS policies in Supabase:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'tasks';
   ```
4. Temporarily disable RLS to test (dev only):
   ```sql
   ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
   ```

#### Build Fails on Vercel

**Cause**: Various - check build logs

**Common Solutions**:
1. Ensure `pnpm-lock.yaml` is committed
2. Check Node.js version matches (20+)
3. Verify all environment variables are set
4. Clear Vercel cache and redeploy

#### Database Connection Errors

**Cause**: Network or credential issues

**Solution**:
1. Check Supabase project is not paused (free tier pauses after inactivity)
2. Verify credentials are correct
3. Check Supabase status: [status.supabase.com](https://status.supabase.com)

### Getting Help

1. Check existing docs:
   - [PROGRESS.md](./PROGRESS.md) for implementation status
   - [API.md](./API.md) for endpoint reference
   - [ARCHITECTURE.md](./ARCHITECTURE.md) for system design

2. Search issues on GitHub

3. Open a new issue with:
   - Clear description of the problem
   - Steps to reproduce
   - Error messages and logs
   - Environment details (browser, OS)

---

## Scaling Considerations

### Database Scaling

| Usage Level | Recommendation |
|-------------|----------------|
| < 1000 users | Supabase Free tier |
| 1000-10000 users | Supabase Pro tier |
| 10000+ users | Supabase Team/Enterprise |

**Optimizations:**
- Add indexes for frequently queried columns
- Use connection pooling (built into Supabase)
- Consider read replicas for heavy read workloads

### AI Service Scaling

| Usage Level | Recommendation |
|-------------|----------------|
| < 100 req/day | Single instance |
| 100-1000 req/day | Auto-scaling (Railway/Render) |
| 1000+ req/day | Multiple instances + caching |

**Optimizations:**
- Cache AI responses for repeated queries
- Implement request queuing for high-traffic
- Monitor and set Anthropic API spending limits

### Web Application Scaling

Vercel automatically scales on Pro plan. For optimization:

- Enable Vercel Analytics to identify bottlenecks
- Use ISR (Incremental Static Regeneration) where appropriate
- Implement client-side caching with TanStack Query
- Use edge caching for static assets

---

*Deployment Guide Version: 2.0*
*Last Updated: January 2025*
