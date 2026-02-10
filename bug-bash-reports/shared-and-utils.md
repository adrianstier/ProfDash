# Shared & Utils Bug Bash Report

## Critical Bugs

- [apps/web/lib/crypto.ts:77-82] **Encrypted data with colons in plaintext is misidentified as unencrypted.** The `decryptToken` function splits on `:` and checks `parts.length !== 3`. If the plaintext (stored unencrypted in dev mode) contains exactly two colons (e.g., a URL like `https://example.com:8080/path`), it will be parsed as encrypted data, causing a decryption crash. The `isEncrypted` helper on line 105-106 has the same flaw: any string with exactly 2 colons is considered "encrypted" (e.g., `"a:b:c"`). This could cause production errors when transitioning from dev (unencrypted) to production (encrypted) if legacy unencrypted tokens contain colons.

- [apps/web/lib/crypto.ts:18-31] **No key length validation on the encryption key buffer.** `getEncryptionKey()` calls `Buffer.from(keyHex, "hex")` without verifying the resulting buffer is exactly 32 bytes. The env schema validates 64 hex chars, but `env.ts` makes `TOKEN_ENCRYPTION_KEY` optional, and `crypto.ts` reads directly from `process.env` (bypassing the env validation entirely). If someone sets a non-hex or short string, `Buffer.from(keyHex, "hex")` silently produces a shorter buffer, which would cause AES-256-GCM to either throw a cryptic error or use an undersized key.

- [apps/web/lib/rate-limit.ts:44-88] **Rate limiter is trivially bypassable in production.** The rate limiter is in-memory (`Map`), but Next.js on Vercel runs serverless functions -- each invocation may run in a different instance with its own memory space. The rate limit store is never shared, so rate limits are effectively not enforced in production. The comment acknowledges this ("For production, consider using Redis"), but this is deployed to Vercel, meaning the rate limiter provides a false sense of security.

- [apps/web/lib/rate-limit.ts:116-118] **Rate limit identifier uses attacker-controlled `x-forwarded-for` header.** An unauthenticated attacker can set arbitrary `x-forwarded-for` headers to bypass IP-based rate limiting. Each request with a different `x-forwarded-for` value gets its own rate limit bucket. This is a common bypass that should be mitigated by trusting only the first entry set by the trusted proxy (Vercel), but even then, the in-memory store issue renders it moot.

- [apps/web/lib/crypto.ts:41-47] **Plaintext tokens stored in database in dev mode.** When `TOKEN_ENCRYPTION_KEY` is not set, `encryptToken` returns the raw plaintext OAuth token. If dev data is ever promoted to production, or if a dev database is accessed, sensitive OAuth tokens (Google Calendar access/refresh tokens) are exposed in plain text. There is no flag stored to indicate whether the token was encrypted or not, so `decryptToken` uses the fragile colon-counting heuristic.

## Medium Issues

- [packages/shared/src/types/agents.ts:40-45] **Naming collision: `TaskStatus` redefined in agents.ts.** The agents module defines its own `TaskStatus` type (`"pending" | "running" | "completed" | "failed" | "cancelled"`) which conflicts with the core `TaskStatus` from `types/index.ts` (`"todo" | "progress" | "done"`). Since `types/index.ts` re-exports `agents.ts` on line 2, whichever export wins depends on declaration order. TypeScript will use the last export, meaning the agent `TaskStatus` silently shadows the core task `TaskStatus`. Any consumer importing `TaskStatus` from the shared package will get the agent version, not the task version.

- [packages/shared/src/schemas/index.ts:757-780] **Activity schema has more actions than the TypeScript type.** The `ActivityActionSchema` Zod enum includes extra entries like `"phase_created"`, `"phase_started"`, `"phase_completed"`, `"phase_blocked"`, `"workstream_created"`, `"workstream_updated"`, `"deliverable_created"`, `"deliverable_completed"`, `"role_assigned"`, `"template_applied"` that are not present in the `ActivityAction` TypeScript type in `types/chat.ts:133-159`. The `ACTIVITY_ACTION_CONFIG` map in chat.ts also doesn't have entries for these actions, so calling `ACTIVITY_ACTION_CONFIG[action]` for a phase/workstream/deliverable/template action would return `undefined`, likely causing UI rendering errors.

- [packages/shared/src/utils/index.ts:208-214] **`isOverdue` mutates the input Date object.** The function calls `d.setHours(0, 0, 0, 0)` on line 213 which mutates the caller's `Date` if a `Date` object was passed directly (not a string). This is a side-effect bug: calling `isOverdue(someDate)` permanently changes the time portion of `someDate` to midnight. The `isDueToday` function at line 217 does NOT have this mutation, making the behavior inconsistent.

- [apps/web/lib/utils/recurrence.ts:89-91] **`parseRRule` does not validate BYDAY values.** The BYDAY values are cast directly: `result.byDay = value.split(",") as DayOfWeek[]`. If the RRULE string contains invalid day codes (e.g., `BYDAY=XX,YY`), they will be accepted and treated as valid `DayOfWeek` values, causing downstream logic (like `JS_DAY_TO_RRULE` lookups) to silently produce wrong results or undefined behavior.

- [apps/web/lib/utils/recurrence.ts:92-98] **UNTIL date parsing ignores timezone and uses local time.** The UNTIL value in RRULE is supposed to be UTC (e.g., `20261231T235959Z`), but the parser creates a Date using `new Date(year, month, day)` which creates a local-time date. This could cause off-by-one day errors near midnight depending on the user's timezone.

- [apps/web/lib/utils/recurrence.ts:237-269] **Weekly recurrence with BYDAY generates incorrect occurrences for intervals > 1.** The `getNextOccurrences` function uses `current.getDay() === startDate.getDay()` to detect week boundaries (line 246), but this check is fragile: it triggers when the current day-of-week matches the start date's day-of-week, not when a full week has elapsed. If `startDate` is a Wednesday and BYDAY includes WE, the interval skip would happen after processing Wednesday each week, potentially skipping days that should be checked (TH, FR, SA, SU, MO, TU) before the interval adjustment.

- [apps/web/lib/utils/recurrence.ts:313-327] **`matchesRecurrence` for WEEKLY with BYDAY has incorrect week-interval check.** Line 324 computes `diffWeeks = Math.floor(diffDays / 7)` and checks `diffWeeks % interval === 0`, but this doesn't account for the actual week boundary relative to the start date. For example, if the start date is a Wednesday and the check date is a Friday 2 days later, `diffDays = 2`, `diffWeeks = 0`, `0 % 2 === 0` is true, which may incorrectly match for interval=2 (every other week).

- [packages/shared/src/schemas/index.ts:361-363] **`CreateProjectPhaseAssignmentSchema` refinement check is insufficient.** The refinement checks `data.role_id !== undefined || data.user_id !== undefined`, but both fields accept `.nullable().optional()`. A user could pass `{ phase_id: "...", role_id: null, user_id: null }` which passes the refinement (both are `!== undefined`) but results in an assignment with no role and no user, which is semantically invalid.

- [packages/shared/src/schemas/index.ts:121] **Project `stage` schema allows any string, no cross-validation with `type`.** The `stage` field is `z.string().nullable().optional()` with no enum constraint. A manuscript project could have a grant stage value (like `"closeout"`) and vice versa. The TypeScript type at least narrows it to `ManuscriptStage | GrantStage | string`, but the Zod schema provides no runtime validation of stage-type correspondence.

- [apps/web/lib/env.ts:82] **Unsafe type assertion on client-side env validation.** The function `validateEnv()` returns `parsed.data as z.infer<typeof serverEnvSchema>`, but on the client side, `parsed.data` is actually `z.infer<typeof clientEnvSchema>` (missing server-only fields like `SUPABASE_SERVICE_ROLE_KEY`). Accessing `env.SUPABASE_SERVICE_ROLE_KEY` on the client will be `undefined` at runtime but typed as `string | undefined` (which is technically fine), but the assertion is still misleading and could cause confusion.

- [apps/web/lib/utils/recurrence.ts:329-335] **Monthly recurrence matching fails for month-end dates.** If a monthly recurring task starts on the 31st, `start.getDate() !== check.getDate()` will fail for months with 30 or fewer days. For example, a task starting Jan 31 with monthly recurrence would never match Feb 28 or Apr 30 -- it simply skips those months silently.

- [packages/shared/src/schemas/index.ts:228-231] **CreateRecurringTaskSchema `category` and `priority` are loose strings.** Lines 228-229 use `z.string().optional()` for both `category` and `priority`, rather than reusing `TaskCategorySchema` and `TaskPrioritySchema`. This means invalid categories/priorities like `"foo"` would pass Zod validation but fail when used as a `TaskCategory` or `TaskPriority`.

- [packages/shared/src/schemas/index.ts:244-249] **UpdateRecurrenceSchema allows empty updates.** The inner `updates` object has all fields optional, meaning `{ scope: "all", updates: {} }` passes validation but performs no changes. This could cause silent no-ops at the API level.

- [packages/shared/src/utils/index.ts:156-170] **`getNextDayOfWeek` returns today when `daysUntil === 0`.** If you type `mon` on a Monday, `daysUntil` is 0, so it returns today's date. This could be intentional (the comment says "allow same-day scheduling"), but it means typing the current day name sets the due date to TODAY, not next week. For a quick-add meant for future scheduling, this is arguably wrong behavior -- "set a task for Monday" on a Monday likely means next Monday.

## Low / Code Quality

- [packages/shared/src/types/index.ts:14-20] **`Subtask` type references `TaskPriority` before it is defined.** The `Subtask` interface on line 18 uses `TaskPriority` which is defined on line 23. This works in TypeScript due to hoisting, but it makes the code harder to read. The type file should define base types before composite types.

- [packages/shared/src/utils/index.ts:252-288] **`PRIORITY_LABELS` and `CATEGORY_LABELS` duplicated between `utils/index.ts` and `constants.ts`.** Both `packages/shared/src/utils/index.ts` (lines 237-268) and `apps/web/lib/constants.ts` (lines 75-100) define `PRIORITY_LABELS` and `CATEGORY_LABELS` with identical content. This creates maintenance drift risk -- if one is updated, the other must be updated too.

- [apps/web/lib/utils/academic-patterns.ts:287-289] **Regex patterns have no ReDoS protection.** While the patterns in `ACADEMIC_PATTERNS` are relatively simple and unlikely to cause catastrophic backtracking, several use `\s*` between word boundaries (e.g., `literature\s*review`) on arbitrary user input. The 1000-char length guard on line 262 provides some protection, but for defense in depth, the regex patterns should be reviewed for nested quantifiers.

- [packages/shared/src/utils/index.ts:229-233] **`generateSlug` produces empty string for non-alphanumeric input.** `generateSlug("!!!")` returns `""`, which would fail the `CreateWorkspaceSchema` slug validation (min 1 char). The function doesn't guard against this edge case.

- [apps/web/lib/utils/duplicate-detection.ts:21] **Substring containment returns 0.85 regardless of length ratio.** `"a".includes("a very long completely different string")` would never happen, but `"write NSF grant report".includes("write")` returns true and gives 0.85 similarity, which seems too high for a 5-letter match in a 24-character string. This could cause many false positive duplicate detections.

- [apps/web/lib/utils/task-grouping.ts:70-77] **`isWithinDays` excludes today itself.** The function checks `date > today` (strict), meaning a task due today is not "within N days". This is likely intentional for the Today page grouping, but the function name is misleading -- it really means "within the next N days, excluding today."

- [apps/web/lib/migration/import-v1-data.ts:243] **`parseImportData` accepts arbitrary JSON without schema validation.** The function calls `JSON.parse(jsonString)` and trusts the result has `tasks` and `projects` arrays. Malformed data (e.g., `{ tasks: [{ id: 123, title: null }] }`) would be accepted and could cause downstream crashes during conversion.

- [apps/web/lib/realtime/workspace-channel.ts:53] **Supabase client created in constructor, not lazily.** `private supabase = createClient()` is called when the `WorkspaceChannel` class is instantiated, even if it's never connected. Since `getWorkspaceChannel` caches instances in a singleton map, this is minor, but it means a new Supabase client is created per workspace channel rather than sharing one.

- [packages/shared/src/schemas/index.ts:829] **SmartParse subtask min estimated_minutes differs from SubtaskSchema.** `SmartParseSubtaskSchema` on line 829 uses `z.number().min(5).max(480)` while the main `SubtaskSchema` on line 15 uses `z.number().min(1).max(480)`. This inconsistency means a 3-minute subtask estimate from smart parse would be rejected, but manually creating the same subtask is fine.

- [apps/web/lib/search/search-ranking.ts:26-36] **`RANKING_WEIGHTS` duplicates `DEFAULT_RANKING_WEIGHTS` from analytics types.** The same weight values are defined in both `apps/web/lib/search/search-ranking.ts` and `packages/shared/src/types/analytics.ts:263-273`. If one is tuned, the other would not change.

- [packages/shared/src/schemas/research.ts:317-318] **Fieldwork budget validation rejects zero values.** `budget_estimate` and `actual_cost` use `z.number().positive()` which rejects `0`. A fieldwork trip with no cost (e.g., local site visit) cannot be accurately represented. It must be `null` or a positive number, but never `0`.

- [packages/shared/src/types/index.ts:46] **`Task.workspace_id` is optional, but most RLS queries filter on it.** The type marks `workspace_id` as optional (`workspace_id?: string`), but RLS policies require it for access control. A task created without a `workspace_id` would potentially be inaccessible or bypass workspace-scoped queries.

- [apps/web/lib/utils/recurrence.ts:114] **`generateRRule` silently drops `interval: 1`.** Line 114 checks `rule.interval && rule.interval > 1`, so `interval: 1` is never written to the RRULE string. While `INTERVAL=1` is the default per RFC 5545, the round-trip `parseRRule -> generateRRule` loses the explicit `interval: 1` value, which could confuse string equality comparisons.

## Summary

5 critical, 13 medium, 13 low
