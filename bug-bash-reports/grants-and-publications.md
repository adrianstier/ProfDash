# Grants & Publications Bug Bash Report

## Critical Bugs

- [apps/web/app/api/grants/opportunities/route.ts:62-76] **RLS blocks all custom opportunity creation.** The `funding_opportunities` table has NO INSERT policy for regular users (only a SELECT policy with `USING(TRUE)`). The migration comment says "Only service role can insert/update/delete funding opportunities." But this POST route uses the standard Supabase client (not the service role key), so every insert will silently fail with a Supabase RLS error. The entire "create custom opportunity" feature is non-functional.

- [apps/web/app/api/grants/search/route.ts:56-61] **Amount range filter queries wrong columns for custom opportunities.** The search filters on `award_ceiling` and `award_floor`, but the opportunities POST route inserts amount data into `amount_min` and `amount_max` columns. Custom-created opportunities will never match amount range filters because their `award_ceiling`/`award_floor` columns are always NULL. This creates a data inconsistency where user-created opportunities are invisible to amount-based search.

- [apps/web/app/api/grants/watchlist/route.ts:59-128, saved-searches/route.ts:68-119] **No workspace membership verification in API routes.** The POST routes for watchlist and saved-searches accept a `workspace_id` from the request body but never verify the authenticated user is a member of that workspace at the application level. They rely entirely on RLS, which is a single layer of defense. If RLS policies are ever misconfigured or bypassed, any authenticated user could write to any workspace's watchlist or saved searches.

- [apps/web/app/api/grants/watchlist/[id]/route.ts:44-52] **Watchlist PATCH does not scope update to user's workspace.** The update query only filters by `id` (`.eq("id", id)`), relying solely on RLS for authorization. There is no `workspace_id` scoping, so if RLS were ever weakened, any user could update any watchlist item. Defense-in-depth would require checking `created_by` or `workspace_id` membership.

- [apps/web/app/api/grants/watchlist/[id]/route.ts:88-91] **Watchlist DELETE does not scope delete to user's workspace.** Same issue as PATCH -- the delete only filters by `id` with no workspace or creator verification at the application level.

- [apps/web/app/api/grants/saved-searches/[id]/route.ts:23-26] **Saved search DELETE does not scope to user's workspace.** Same pattern: `.delete().eq("id", id)` with no workspace or creator check. Additionally, this route does not even check if the deletion was successful (e.g., 0 rows affected means item didn't exist or wasn't authorized, but no feedback is given).

- [apps/web/app/api/publications/route.ts:110] **Authors extracted from unvalidated raw body, not from Zod-validated data.** In the POST handler, `const { authors } = body` reads authors from the raw request body rather than from `validationResult.data`. The `CreatePublicationSchema` does not include an `authors` field, so the authors array is never validated by Zod. An attacker could inject arbitrary fields into author objects (e.g., `publication_id` to link authors to other users' publications) since the spread operator (`...author`) on line 129-133 passes all properties through to the insert.

- [apps/web/app/api/publications/[id]/route.ts:109, 129-146] **Same unvalidated authors vulnerability in PATCH handler.** The `authors` array is destructured from `body` (unvalidated) and spread directly into the database insert. The `UpdatePublicationSchema` is `CreatePublicationSchema.partial()`, which also has no `authors` field, so arbitrary properties can be injected.

## Medium Issues

- [apps/web/app/api/publications/route.ts:62, 77] **Publication count is always null.** The `.select(...)` call does not pass `{ count: "exact" }`, so the `count` variable destructured from the query result is always `null`. The response returns `{ data: publications, count }` with a null count, breaking any pagination UI that relies on total count. Meanwhile, the grants search route correctly uses `{ count: "exact" }`.

- [apps/web/app/api/grants/search/route.ts:27-29] **Negative offset when page=0.** If `page=0` is passed as a query parameter, `parseInt("0", 10)` returns `0`, so `offset = (0 - 1) * limit = -limit`. This produces a negative value passed to `.range()`, which will likely cause a Supabase error. No validation ensures `page >= 1`.

- [apps/web/app/api/grants/search/route.ts:56-60] **NaN propagation in amount filters.** If `amount_min` or `amount_max` query params contain non-numeric strings like `"abc"`, `parseFloat("abc")` returns `NaN`. Passing `NaN` to `.gte()` / `.lte()` will produce unexpected query behavior or errors. No validation is performed on these numeric parameters.

- [apps/web/app/api/grants/search/route.ts:28] **Limit of 0 produces empty or negative range.** `Math.min(parseInt("0", 10), 100)` = 0. This results in `.range(offset, offset - 1)` which is an invalid range. No minimum limit is enforced.

- [apps/web/app/api/grants/search/route.ts:36-48] **No Zod validation on search query parameters.** Unlike other grant API routes, the search route manually parses query parameters without any schema validation. This leads to the NaN and negative offset issues above. The saved-searches route defines a `GrantSearchQuerySchema` that could be reused here.

- [apps/web/app/api/publications/import/route.ts:90] **Incomplete DOI sanitization.** The regex `doi.replace(/^https?:\/\/(dx\.)?doi\.org\//, "")` only strips `http(s)://doi.org/` and `http(s)://dx.doi.org/` prefixes. It does not handle other DOI URL formats like `https://www.doi.org/...` or DOI proxy services. More importantly, the cleaned DOI is directly interpolated into the CrossRef API URL, and while `encodeURIComponent` is used on line 109, a malicious DOI containing path traversal sequences could potentially reach unintended CrossRef endpoints.

- [apps/web/app/api/publications/import/route.ts:108-115] **No timeout on CrossRef API fetch.** The `fetch()` call to `api.crossref.org` has no timeout configured. If CrossRef is slow or unresponsive, the API route will hang until the platform's default timeout (which could be 10+ seconds on Vercel), degrading user experience and potentially exhausting serverless function concurrency.

- [apps/web/app/api/publications/import/route.ts:171-183] **DOI import sets all non-first authors to role "middle".** Line 181 assigns `author_role: isFirst ? "first" : "middle"`, never assigning "last" or "senior" to the final author. In academic conventions, the last author is typically the senior/PI author. This produces incorrect metadata for imported publications.

- [apps/web/app/api/publications/[id]/route.ts:129-151] **Non-atomic author replacement in PATCH.** The delete-then-insert pattern for updating authors is not wrapped in a transaction. If the insert fails after the delete succeeds (e.g., due to a validation error in one author), all existing authors are lost with no way to recover them.

- [apps/web/app/api/publications/route.ts:128-142, publications/[id]/route.ts:129-146] **author_order uses `||` instead of `??` for falsy check.** `author.author_order || index + 1` treats `0` as falsy. While the DB constraint requires `author_order >= 1`, using `||` instead of `??` masks the real value and silently changes it. If a client sends `author_order: 0`, it becomes `index + 1` instead of failing validation.

- [lib/hooks/use-grants.ts:95-96] **amount_min and amount_max of 0 are silently omitted.** `if (filters.amount_min)` is falsy when the value is `0`. A user searching for grants with a minimum amount of $0 would have that filter silently dropped. Should use `!= null` or `!== undefined` check.

- [lib/hooks/use-grants.ts:157-165] **removeFromWatchlist tries to parse JSON on error from 204 response.** The DELETE endpoint returns a 204 No Content. In the error path, `const error = await response.json()` would fail if the server returned an error without a JSON body (e.g., a 500 with no body), causing an unhandled exception that masks the original error.

- [lib/hooks/use-grants.ts:195-203] **deleteSavedSearch has same JSON parsing issue on error.** Same pattern as removeFromWatchlist.

- [components/publications/add-publication-modal.tsx:116] **target_deadline serialization sends Date object through JSON.** `target_deadline: targetDeadline ? new Date(targetDeadline) : undefined` creates a Date object that gets serialized to an ISO string via `JSON.stringify()`. While this works because Zod's `z.coerce.date()` can parse ISO strings, the intent is unclear and it would be cleaner to send the string directly. Not broken, but fragile.

- [components/publications/publication-pipeline.tsx:54-78] **Drag-and-drop uses native HTML DnD API instead of @dnd-kit.** The app has `@dnd-kit` as a dependency (per CLAUDE.md), but the publication pipeline uses native `onDragStart`/`onDragOver`/`onDrop` events. This lacks accessibility support (keyboard navigation, screen reader announcements), visual drag feedback, and touch device support. The tasks Kanban board likely uses @dnd-kit, creating an inconsistency.

- [components/publications/import-doi-modal.tsx:44-53] **Import success display crashes when publication_authors is undefined.** The expression `result.publication_authors?.map(...).slice(0, 3).join(", ") + (result.publication_authors && result.publication_authors.length > 3 ? " et al." : "")` -- if `publication_authors` is undefined, the first part evaluates to `undefined`, and string concatenation with `+` produces `"undefined"` or `"undefinedet al."` as the author display string.

- [apps/web/app/api/grants/opportunities/route.ts:87-103] **Watchlist add failure is silently swallowed.** If `add_to_watchlist` is true and the watchlist insert fails, the error is only logged but the client gets a 201 response with the opportunity data. The user sees "success" but the opportunity was never added to the watchlist. No indication is given to the client.

## Low / Code Quality

- [components/grants/grant-document-modal.tsx:43-49] **Suppressed unused variables with `void`.** Lines 48-49 use `void documentId; void extractedData;` to suppress TypeScript unused variable warnings. The comment says "Used for future feature" but these variables are set but never read. This is dead code that should be removed or the feature implemented.

- [apps/web/app/api/grants/search/route.ts:1-100] **No Zod schema for search parameters.** Unlike all other grant routes that use Zod schemas for input validation, the search route manually parses query parameters with no schema validation. This is inconsistent with the codebase pattern.

- [apps/web/app/api/publications/[id]/route.ts:212] **DELETE returns 200 with body instead of 204.** The publication DELETE handler returns `NextResponse.json({ success: true }, { status: 200 })`, while the grants watchlist and saved-searches DELETE handlers correctly return `new NextResponse(null, { status: 204 })`. This is inconsistent.

- [lib/hooks/use-publications.ts:146] **queryKeys uses type assertion for filters.** `queryKeys.publications.list((filters ?? {}) as Record<string, unknown>)` uses a type assertion to cast filters. This loses type safety and could mask future type errors.

- [components/publications/add-publication-modal.tsx:234] **Author list uses array index as React key.** `key={index}` on the author mapping (line 234 in add-publication, line 280 in edit-publication) can cause incorrect rendering when authors are reordered or deleted, since React may reuse DOM nodes incorrectly.

- [components/publications/edit-publication-modal.tsx:280] **Same array index key issue in edit modal.**

- [components/publications/edit-publication-modal.tsx:4] **Unused imports: Save and ExternalLink.** `Save` is used in the button, and `ExternalLink` is used in the DOI link. On re-check, both are actually used. However, the import of `Users` and `Loader2` -- `Users` is used for the authors label and `Loader2` for the loading state, so these are all used. No actual unused imports found.

- [components/publications/import-doi-modal.tsx:57-59] **Hardcoded 2-second timeout before closing.** The `setTimeout(() => { handleClose(); onSuccess?.(); }, 2000)` is a UX concern -- if the user clicks something during this delay, it can cause unexpected behavior. If the component unmounts before the timeout fires, it could cause a state update on an unmounted component warning.

- [apps/web/app/api/publications/import/route.ts:172] **isFirst variable conflates sequence data and array position.** `const isFirst = author.sequence === "first" || index === 0` means the first author in the array is always marked as "first" even if CrossRef says their sequence is "additional". This could produce incorrect role assignments for papers where authors are not returned in positional order.

- [apps/web/app/api/grants/opportunities/route.ts:13] **Empty string allowed for URL.** The schema has `.or(z.literal(""))` for the URL field, which means an empty string bypasses the `.url()` validation. On line 73, `url: url || null` converts empty string to null, so this is handled, but the schema is misleading.

- [apps/web/app/api/publications/route.ts:42] **Publications query filters by user_id but not workspace_id first.** The query always filters `.eq("user_id", user.id)` and optionally adds `.eq("workspace_id", workspaceId)`. Since workspace_id is applied after the user_id filter, publications without a workspace (workspace_id is NULL) are always included. This may or may not be intended behavior.

## Summary

7 critical, 14 medium, 10 low
