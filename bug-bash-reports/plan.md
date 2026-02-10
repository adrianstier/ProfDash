# Bug Bash Plan

## Baseline
- Typecheck: PASS (clean)
- Tests: 72 files, 2384 tests, all passing
- Build: Clean

## Scope Splits (6 parallel agents)

### 1. auth-middleware
Auth flow, middleware, workspace management, invites, RLS patterns.
- `app/api/auth/`, `app/api/workspaces/`, `app/(auth)/`
- `lib/supabase/`, `middleware.ts`
- `lib/stores/workspace-store.ts`
- Focus: auth bypass, missing workspace membership checks, token handling, invite flow

### 2. tasks-core
Task CRUD, recurring tasks, bulk operations, templates, kanban board.
- `app/api/tasks/`, `app/api/task-templates/`, `app/api/templates/`
- `components/tasks/`, `lib/hooks/use-tasks.ts`, `lib/hooks/use-task-templates.ts`
- `lib/hooks/use-realtime-tasks.ts`, `lib/stores/task-store.ts`
- `lib/utils/recurrence.ts`, `lib/utils/task-grouping.ts`
- Focus: data races in optimistic updates, recurring task edge cases, bulk op validation

### 3. projects-research
Projects, milestones, phases, workstreams, research experiments, permits, fieldwork.
- `app/api/projects/`, `app/api/research/`
- `components/projects/`, `components/research/`
- `lib/hooks/use-projects.ts`, `use-project-hierarchy.ts`, `use-experiments.ts`, `use-permits.ts`, `use-fieldwork.ts`, `use-field-sites.ts`, `use-experiment-team.ts`
- Focus: project hierarchy integrity, research CRUD correctness, permit expiry logic

### 4. ai-agents
AI routes, agent framework, smart parse, voice, document processing.
- `app/api/ai/`, `app/api/agents/`, `app/api/voice/`, `app/api/documents/`
- `components/ai/`, `components/voice/`, `components/documents/`
- `lib/hooks/use-ai.ts`, `use-agents.ts`, `use-smart-parse.ts`, `use-voice.ts`, `use-documents.ts`
- `lib/stores/agent-store.ts`
- Focus: error handling on AI failures, prompt injection, response parsing, streaming bugs

### 5. collab-ux
Chat, messages, activity, presence, search, analytics, onboarding, calendar, learning.
- `app/api/messages/`, `app/api/activity/`, `app/api/presence/`, `app/api/search/`, `app/api/analytics/`, `app/api/onboarding/`, `app/api/calendar/`
- `components/chat/`, `components/activity/`, `components/presence/`, `components/search/`, `components/analytics/`, `components/onboarding/`, `components/learning/`, `components/collaboration/`, `components/layout/`
- `lib/hooks/use-chat.ts`, `use-search.ts`, `use-presence.ts`, `use-activity.ts`, `use-analytics*.ts`, `use-onboarding.ts`, `use-calendar.ts`
- `lib/realtime/`, `lib/stores/chat-store.ts`, `lib/stores/analytics-store.ts`
- Focus: realtime race conditions, search injection, analytics event integrity, presence staleness

### 6. grants-pubs-shared
Grants, publications, personnel, shared package types/schemas.
- `app/api/grants/`, `app/api/publications/`, `app/api/personnel/`
- `components/grants/`, `components/publications/`, `components/personnel/`
- `lib/hooks/use-grants.ts`, `use-publications.ts`, `use-personnel.ts`
- `packages/shared/src/` (types, schemas, utils)
- Focus: grant search/scoring correctness, publication import parsing, schema/type mismatches

## Agent Instructions
Each scope agent should:
1. Read all API routes in scope — check auth, validation, error handling, RLS
2. Read hooks — check optimistic updates, error recovery, query invalidation
3. Read components — check prop types, state management, edge cases
4. Look for: security issues, data races, unhandled errors, dead code, logic bugs
5. Write findings to `bug-bash-reports/<scope>.md` with severity (CRITICAL/HIGH/MEDIUM/LOW)
6. Fix CRITICAL and HIGH bugs directly when safe to do so
7. Report anything that needs cross-module coordination as BLOCKED

## Review Phase
After all scope agents complete, a review agent will:
1. Read all reports
2. Check for cross-cutting issues
3. Run typecheck + tests to verify fixes
4. Write summary to `bug-bash-reports/summary.md`
