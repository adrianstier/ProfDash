# Research Bug Bash Report

## Critical Bugs

- **[apps/web/app/api/research/projects/[id]/experiments/[expId]/team/route.ts:122-128]** Schema-to-DB column mismatch on team assignment insert: The POST handler inserts a `project_id` field (line 125) that does not exist on the `experiment_team_assignments` table. Neither migration defines a `project_id` column on this table. Every team member creation will fail with a Postgres column-not-found error.

- **[supabase/migrations/20260129100000_research_projects.sql:129-146 vs 20260127000000_research_projects.sql:160-178]** Conflicting migration schemas for `experiment_team_assignments`: The 20260129 migration defines the table with `user_id UUID NOT NULL REFERENCES profiles(id)` and a `workspace_id` column. The 20260127 migration defines the same table with `personnel_id UUID NOT NULL REFERENCES personnel(id)` and no `workspace_id` column. All API routes and TypeScript types reference `personnel_id`. If the 20260129 migration is the one applied, every query referencing `personnel_id` will fail. If 20260127 is applied, `workspace_id` references will fail. This ambiguity means the entire team assignment feature is broken under one of the two schemas.

- **[apps/web/app/api/research/projects/[id]/experiments/[expId]/fieldwork/route.ts:120-126]** Missing `workspace_id` on fieldwork insert: The POST handler constructs `scheduleData` without including `workspace_id`, but the 20260129 migration defines `fieldwork_schedules` with `workspace_id UUID NOT NULL`. The experiment's `workspace_id` is fetched (line 86) but never passed through to the insert. If the newer migration is applied, every fieldwork creation will fail with a NOT NULL constraint violation.

- **[apps/web/app/api/research/projects/[id]/experiments/[expId]/team/route.ts:6-51]** Missing workspace membership check on team GET: The GET handler verifies the experiment belongs to the project but never checks that the requesting user is a member of the workspace. Any authenticated user who knows valid experiment/project UUIDs can enumerate all team assignments. The POST (lines 82-95) and DELETE (lines 200-214) handlers do check membership, making this an inconsistency that constitutes a real authorization bypass.

- **[apps/web/app/api/research/projects/[id]/experiments/[expId]/fieldwork/route.ts:9-64]** Missing workspace membership check on fieldwork GET: Same issue as team GET. The handler verifies experiment-project relationship but not workspace membership. Any authenticated user can read fieldwork schedules for any experiment they know the IDs of.

- **[apps/web/app/api/research/projects/[id]/permits/[permitId]/route.ts:6-39]** Missing workspace membership check on single-permit GET: The handler fetches and returns the permit without any workspace membership verification. Compare with PATCH (lines 69-82) and DELETE (lines 153-166) which both verify membership. Relies solely on RLS, but the explicit authorization gap is inconsistent and could expose data if RLS policies are misconfigured.

- **[supabase/migrations/20260127000000 + 20260129100000]** Duplicate conflicting migrations: Two separate SQL files both attempt to create the same five tables (`field_sites`, `experiments`, `permits`, `experiment_team_assignments`, `fieldwork_schedules`). The 20260127 migration uses `CREATE TABLE` (no `IF NOT EXISTS`), while 20260129 uses `CREATE TABLE IF NOT EXISTS`. Key schema differences include: experiment `lead_id` references `auth.users(id)` vs `profiles(id)`; permit status CHECK constraint in 20260129 adds `'submitted'`, `'rejected'`, `'revoked'` not in Zod schemas; experiment status CHECK in 20260129 adds `'cancelled'` not in TypeScript types; team assignments column name `personnel_id` vs `user_id`. Only one of these can be the actual production schema, creating uncertainty about what code actually works.

## Medium Issues

- **[apps/web/components/research/PermitModal.tsx:42]** Incorrect default permit type casing: The default `permit_type` is `"iacuc"` (lowercase) but the Zod `PermitTypeSchema` enum and database CHECK constraint both require `"IACUC"` (uppercase). Creating a new permit without changing the type will fail Zod validation, preventing permit creation for the most common permit type.

- **[apps/web/app/api/research/projects/[id]/experiments/[expId]/route.ts:90-173 + 175-236]** PATCH and DELETE do not verify experiment belongs to the URL's project: The `id` (projectId) parameter is extracted from the URL path but never used. The experiment is looked up only by `expId`. A user could craft a URL with a different project ID and still update or delete the experiment, bypassing project-level access controls. Same issue exists in the GET handler (line 10-87).

- **[apps/web/app/api/research/projects/[id]/experiments/route.ts:89-114]** N+1 query pattern: For every experiment in the project, three separate database queries are made (team count, fieldwork count, task count) via `Promise.all` inside a `.map()`. A project with 20 experiments generates 60 additional queries. Should use a single aggregation query or database-level counts.

- **[apps/web/app/api/research/projects/[id]/dashboard/route.ts:73-101]** Permit expiry logic counts already-expired permits as "expiring soon": The dashboard fetches permits with `.neq("status", "expired")` (line 77), but the `daysUntil` calculation (line 87) can produce negative values for permits whose `expiration_date` is in the past but whose `status` was never updated to `"expired"`. These are counted as "expiring" in the dashboard, which is misleading. There is no mechanism to auto-update permit status when expiration passes.

- **[apps/web/app/api/research/projects/[id]/permits/route.ts:66-77]** Status filter conflicts with includeExpired logic: When a user explicitly requests `status=expired` via query param AND `include_expired` is false (the default), the query applies both `.eq("status", "expired")` and `.neq("status", "expired")`, which always returns zero results.

- **[apps/web/components/research/TeamPanel.tsx:85]** Incomplete role grouping hides team members: The `roleOrder` array only contains `["lead", "co_lead", "contributor", "field_assistant"]`, omitting `"data_analyst"` and `"consultant"`. Team members assigned these roles are fetched from the API but never rendered in the grouped view, making them invisible in the UI.

- **[supabase/migrations/20260129100000_research_projects.sql:134-136 vs packages/shared/src/types/research.ts:280-286]** Mismatched team role enums between DB and TypeScript: Database CHECK constraint allows `'analyst'` and `'advisor'`, while TypeScript/Zod types define `'data_analyst'` and `'consultant'`. Inserting with the TypeScript values will violate the DB constraint; existing DB records with the DB values won't match TypeScript types.

- **[supabase/migrations/20260129100000_research_projects.sql:166-168 vs packages/shared/src/types/research.ts:351-356]** Missing `'postponed'` fieldwork status in TypeScript: The DB CHECK constraint allows `'postponed'` but the TypeScript `FieldworkStatus` type and Zod `FieldworkStatusSchema` don't include it. DB records with this status will fail TypeScript validation.

- **[apps/web/components/research/PermitAlertBanner.tsx:40]** Mutating sort on React Query cache data: `alertPermits.sort()` mutates the array in place. Since `alertPermits` is filtered from `permits` (sourced from React Query cache), this mutates cached data, potentially causing inconsistent renders. Should use `[...alertPermits].sort()` or `toSorted()`.

- **[apps/web/components/research/FieldworkModal.tsx:59-60]** Silent fallback to current date for empty date inputs: When `start_date` or `end_date` is an empty string, the ternary falls through to `new Date()` (today). The form has HTML `required` attributes, but this fallback masks missing dates during programmatic submission or if browser validation is bypassed, creating fieldwork with unintended dates.

- **[apps/web/app/api/research/projects/[id]/experiments/[expId]/fieldwork/route.ts:148-252 + 254-331]** PATCH and DELETE do not verify schedule's experiment belongs to the correct project: The `projectId` from the URL is extracted but never used in any query. Only `experimentId` is verified. A user could send requests to URLs with wrong project IDs and still modify/delete fieldwork schedules.

- **[apps/web/components/research/SiteManager.tsx:360-365]** Location emptiness check treats lat/lng of 0 as empty: The check `Object.keys(formData.location).some(k => formData.location[k])` uses truthiness, so `lat: 0` or `lng: 0` (valid coordinates at the equator/prime meridian) evaluate as falsy and are treated as empty. The entire location object would be sent as `{}` instead of the actual coordinates.

- **[apps/web/components/research/ExperimentModal.tsx:239]** Code field maxLength mismatch with schema: The HTML input has `maxLength={20}` but the Zod `CreateExperimentSchema` allows codes up to 50 characters. Codes created via the API directly could be up to 50 chars and then cannot be fully displayed or edited in the UI modal.

- **[packages/shared/src/schemas/research.ts:344]** `actual_cost` missing from create/update fieldwork schemas: The `CreateFieldworkScheduleBaseSchema` includes `budget_estimate` but not `actual_cost`. Since `UpdateFieldworkScheduleSchema` is derived from it, actual costs can never be set or updated through the API, even though the database column and TypeScript type both support it.

## Low / Code Quality

- **[apps/web/components/research/SiteSelect.tsx:36+46]** Double application of `className` prop: The `className` prop is applied to both the outer `<div>` (line 36) and the inner `<button>` (line 46), which could cause unexpected style conflicts.

- **[apps/web/lib/hooks/use-permits.ts:290-293]** `getDaysUntilExpiration` mutates passed Date objects: `expDate.setHours(0, 0, 0, 0)` modifies the Date in place. If a caller passes a Date instance rather than a string, the original is mutated. Same issue exists in `use-fieldwork.ts` at lines 242-244 (`isUpcomingFieldwork`) and 260-263 (`getDaysUntilFieldwork`).

- **[apps/web/app/api/research/projects/[id]/dashboard/route.ts:109-139]** Unsafe type cast for fieldwork data: `fieldwork = (fieldworkData ?? []) as typeof fieldwork` suppresses TypeScript type checking on the Supabase join result shape, hiding potential mismatches between the query result and the expected type.

- **[apps/web/app/api/research/projects/[id]/experiments/[expId]/team/route.ts:150-227]** DELETE handler permits any workspace member to delete assignments: The handler checks workspace membership but not role. Any member (including `limited` role) can delete team assignments. Other DELETE handlers (sites, experiments, permits) require `owner` or `admin` role.

- **[apps/web/app/api/research/projects/[id]/experiments/[expId]/fieldwork/route.ts:254-331]** DELETE handler permits any workspace member to delete schedules: Same issue -- no role-based permission check on fieldwork deletion, inconsistent with site/experiment/permit deletion patterns.

- **[packages/shared/src/schemas/research.ts:317-318]** Budget fields reject zero values: `z.number().positive()` on `budget_estimate` and `actual_cost` means a value of `0` fails validation. A zero-cost fieldwork trip or a "no budget" entry cannot be represented.

- **[apps/web/lib/hooks/use-experiment-team.ts:103-107 + use-fieldwork.ts:137-144]** Missing experiment detail cache invalidation: When team members or fieldwork schedules are added/removed, only the team/fieldwork list caches are invalidated. The experiment detail cache (which includes `team_count` and `fieldwork_count`) is not invalidated, causing stale count data in the UI until the experiment is explicitly refetched.

- **[apps/web/components/research/ResearchProjectDashboard.tsx:197]** Unused prop threading: `projectId` is passed to `OverviewTab` solely for `PermitAlertBanner`. Minor unnecessary prop drilling.

- **[supabase/migrations/20260129100000_research_projects.sql:59-61]** Experiment status CHECK includes `'cancelled'` not in TypeScript types: The DB allows `'cancelled'` for experiment status, but neither the TypeScript `ExperimentStatus` type nor the Zod `ExperimentStatusSchema` include it. Setting this status via the DB would cause validation failures on the frontend.

- **[apps/web/app/api/research/projects/[id]/dashboard/route.ts:143]** Minor: `let` used where `const` could suffice with restructured code. `uniqueTeamMembers` is declared with `let` (line 143) and reassigned conditionally (line 152), when a single `const` with conditional logic would be cleaner and match codebase conventions.

- **[supabase/migrations/20260129100000_research_projects.sql:94-95]** Permit type CHECK includes `'land_access'` not in TypeScript: The older migration's permit_type CHECK constraint includes `'land_access'` which doesn't appear in the TypeScript `PermitType` enum or Zod schema. If applied, DB records with this type would fail frontend validation.

## Summary

7 critical, 14 medium, 11 low
