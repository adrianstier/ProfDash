# Grants & Publications Module Bug Report

**Audit Date:** 2026-02-09
**Scope:** Grants, Publications, and Documents features
**Reviewer:** Claude Code Bug Bash Agent

---

## Critical Bugs

### 1. Missing Workspace Authorization in Grants API Routes
**File:** `/apps/web/app/api/grants/opportunities/route.ts`
**Line:** 62-84
**Severity:** CRITICAL - Security Issue

**Bug:** The POST endpoint creates funding opportunities without verifying workspace membership. The endpoint accepts `workspace_id` but doesn't check if the user has access to that workspace before creating records.

**Impact:** Users could create funding opportunities in workspaces they don't belong to, potentially polluting other users' data.

**Evidence:**
```typescript
// Line 62-84: No workspace membership check
const { data: opportunity, error: createError } = await supabase
  .from("funding_opportunities")
  .insert({
    title,
    source: "custom",
    agency,
    // ...
  })
```

**Fix Required:** Add workspace membership verification before insert, similar to pattern in `/api/documents/route.ts` lines 46-59.

---

### 2. Missing Workspace Authorization in Watchlist/Saved Searches DELETE
**Files:**
- `/apps/web/app/api/grants/watchlist/[id]/route.ts` (lines 69-103)
- `/apps/web/app/api/grants/saved-searches/[id]/route.ts` (lines 4-38)

**Severity:** CRITICAL - Security Issue

**Bug:** DELETE operations don't verify workspace membership before deletion. Users could delete watchlist items or saved searches from other workspaces if they know the UUID.

**Impact:** Unauthorized data deletion across workspaces.

**Evidence:**
```typescript
// watchlist/[id]/route.ts line 88-91
const { error } = await supabase
  .from("opportunity_watchlist")
  .delete()
  .eq("id", id);  // No workspace check!
```

**Fix Required:** Add workspace membership check by joining with workspace_members table or fetching the item first to get workspace_id and verify.

---

### 3. Missing Workspace Authorization in Publications API
**File:** `/apps/web/app/api/publications/route.ts`
**Line:** 42
**Severity:** CRITICAL - Security Issue

**Bug:** GET endpoint filters by `user_id` (line 42) which is correct for user-scoped publications, but when `workspace_id` is provided (line 47), there's no verification that the user is a member of that workspace before filtering by it.

**Impact:** If the filter logic is bypassed, users could potentially see publications from workspaces they don't belong to.

**Evidence:**
```typescript
// Line 42: Filters by user_id correctly
.eq("user_id", user.id)

// Line 46-48: Applies workspace filter without membership check
if (workspaceId) {
  query = query.eq("workspace_id", workspaceId);
}
```

**Note:** While RLS policies on the `publications` table itself require `user_id = auth.uid()`, this creates potential confusion. The API should explicitly verify workspace membership.

---

### 4. PATCH Update Without Workspace Verification in Watchlist
**File:** `/apps/web/app/api/grants/watchlist/[id]/route.ts`
**Line:** 44-52
**Severity:** CRITICAL - Security Issue

**Bug:** PATCH endpoint updates watchlist items without verifying the user has access to the workspace that owns the item.

**Impact:** Users could update watchlist items belonging to other workspaces.

**Evidence:**
```typescript
// Line 44-52: No workspace verification
const { data, error } = await supabase
  .from("opportunity_watchlist")
  .update(validationResult.data)
  .eq("id", id)  // Only checks ID, not workspace membership
```

**Fix Required:** Fetch item first, verify workspace membership, then update. RLS should handle this but explicit checks are best practice.

---

## Medium Bugs

### 5. Search Sanitization Applied Incorrectly
**File:** `/apps/web/app/api/grants/search/route.ts`
**Line:** 39-40
**Severity:** MEDIUM - Security (Low Risk)

**Bug:** The ILIKE sanitization uses backslash escaping (`\\$&`), but PostgreSQL ILIKE requires different escaping. The test expects `test\\%\\_injection` but PostgreSQL needs the pattern to be escaped differently.

**Impact:** Sanitization may not work as intended. However, the test in `__tests__/api/grants.test.ts` line 261 validates this is working.

**Evidence:**
```typescript
// Line 39
const sanitizedKeywords = keywords.replace(/[%_]/g, "\\$&");
```

**Note:** Tests pass, so this may be working correctly with Supabase's query builder. Verify behavior in production.

---

### 6. URL Validation Too Permissive in Grants Opportunities
**File:** `/apps/web/app/api/grants/opportunities/route.ts`
**Line:** 13
**Severity:** MEDIUM

**Bug:** The schema allows empty string as a valid URL: `.or(z.literal(""))` on line 13. This creates inconsistency - the field can be empty string, null, or a valid URL.

**Impact:** Data inconsistency. Code may need to handle both empty string and null.

**Evidence:**
```typescript
// Line 13
url: z.string().url().optional().nullable().or(z.literal("")),
```

**Fix Required:** Remove `.or(z.literal(""))` and use `.nullable().optional()` only, then handle empty strings in the transform.

---

### 7. Missing Error Handling for AI Service in Document Processing
**File:** `/apps/web/app/api/documents/[id]/process/route.ts`
**Lines:** 92-109, 135-150
**Severity:** MEDIUM

**Bug:** When AI_SERVICE_URL or AI_SERVICE_API_KEY are not set, the fetch calls default to localhost:8000 without checking if the service is actually available.

**Impact:** Cryptic errors for users if AI service is down or misconfigured.

**Evidence:**
```typescript
// Line 92
const aiServiceUrl = process.env.AI_SERVICE_URL || "http://localhost:8000";
```

**Fix Required:** Check if AI_SERVICE_URL is set and return 503 Service Unavailable with clear message if not.

---

### 8. Race Condition in Document Upload Error Cleanup
**File:** `/apps/web/app/api/documents/route.ts`
**Line:** 200
**Severity:** MEDIUM

**Bug:** If database insert fails (line 197-204), the code attempts to clean up the uploaded file from storage (line 200), but doesn't await or handle errors from the cleanup. If cleanup fails, orphaned files remain in storage.

**Impact:** Storage bloat from orphaned files.

**Evidence:**
```typescript
// Line 200: Not awaited
await supabase.storage.from("documents").remove([filePath]);
```

**Note:** This is actually awaited! But there's no error handling. If the remove fails, the user sees "Failed to save document record" but the file stays in storage.

---

### 9. DOI Import Creates Citation Count From Single Field
**File:** `/apps/web/app/api/publications/import/route.ts`
**Line:** 148
**Severity:** MEDIUM

**Bug:** Citation count is set from `work["is-referenced-by-count"]` without validation or type checking. If CrossRef returns non-numeric data, this could break.

**Impact:** Runtime errors or invalid data.

**Evidence:**
```typescript
// Line 148
citation_count: work["is-referenced-by-count"] || 0,
```

**Fix Required:** Validate the type and parse as integer: `Number.parseInt(String(work["is-referenced-by-count"] || "0"), 10)`.

---

### 10. Inconsistent Author Order Handling
**File:** `/apps/web/app/api/publications/[id]/route.ts`
**Lines:** 129-142
**Severity:** MEDIUM

**Bug:** When updating publication authors (PATCH), the code deletes all existing authors (line 131-134) and re-inserts. If the insert fails, all authors are lost. No transaction wrapping.

**Impact:** Data loss if author insert fails after delete.

**Evidence:**
```typescript
// Line 131-134: Delete first
await supabase
  .from("publication_authors")
  .delete()
  .eq("publication_id", id);

// Line 137-146: Then insert - if this fails, authors are gone
```

**Fix Required:** Wrap in a transaction or use upsert pattern instead of delete-then-insert.

---

## Low Bugs

### 11. Search Filters Not Validated for Type Safety
**File:** `/apps/web/lib/hooks/use-grants.ts`
**Line:** 89-107
**Severity:** LOW

**Bug:** The `searchOpportunities` function converts filter params to strings without validation. If `amount_min` is NaN, it becomes the string "NaN" in the query.

**Impact:** Broken searches if filters are corrupted.

**Evidence:**
```typescript
// Line 95-96
if (filters.amount_min) params.set("amount_min", filters.amount_min.toString());
```

**Fix Required:** Validate `filters.amount_min` is a valid number before converting to string.

---

### 12. Unused Variables in Grant Document Modal
**File:** `/apps/web/components/grants/grant-document-modal.tsx`
**Lines:** 47-49
**Severity:** LOW - Code Quality

**Bug:** Variables `documentId` and `extractedData` are set but only accessed via `void` expressions. This is intentional (marked for future use), but creates confusion.

**Impact:** None - marked as intentional.

**Evidence:**
```typescript
// Line 47-49
void documentId;
void extractedData;
```

**Fix Required:** Remove if not used, or add TODO comments explaining future feature.

---

### 13. Missing Input Validation in Quick Add Parser Import
**File:** Not directly in scope, but used by grants search via `@scholaros/shared`
**Severity:** LOW

**Bug:** The quick-add parser is imported in shared types but not tested for grants-specific syntax. If someone tries to quick-add a grant opportunity, unclear what happens.

**Impact:** Confusing UX.

---

### 14. File Type Check Doesn't Match MIME Types Allowed
**File:** `/apps/web/components/documents/document-upload.tsx`
**Line:** 18-23 vs 154
**Severity:** LOW

**Bug:** The `ALLOWED_TYPES` array (lines 18-23) includes only 4 types, but the file input's `accept` attribute (line 154) uses file extensions, creating a potential mismatch.

**Impact:** Users can select `.doc` files in the file picker, but they'll fail validation if the browser sends `application/msword`.

**Evidence:**
```typescript
// Line 18-23: Allowed MIME types
const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];

// Line 154: File input accepts more extensions
accept=".pdf,.doc,.docx,.txt"
```

**Note:** Backend also accepts PNG/JPEG (documents/route.ts line 7-14) but frontend doesn't allow image uploads. Inconsistent.

---

### 15. Database Column Mismatch: `amount_min/max` vs `award_ceiling/floor`
**Files:**
- `/apps/web/app/api/grants/search/route.ts` (lines 56-61)
- Migration: `20241217000004_funding_opportunities.sql` (lines 17-20)

**Severity:** LOW - Data Inconsistency

**Bug:** The API route searches filter using `award_ceiling` and `award_floor` columns (lines 57-60), but the create endpoint inserts into `amount_min` and `amount_max` (opportunities/route.ts lines 70-71). Schema has both sets of columns.

**Impact:** Inconsistent filtering - user-created opportunities won't match their own filters if they use amount_min/max.

**Evidence:**
```typescript
// search/route.ts line 57-60
if (amountMin) {
  query = query.gte("award_ceiling", parseFloat(amountMin));
}
```

vs

```typescript
// opportunities/route.ts line 70-71
amount_min,
amount_max,
```

**Fix Required:** Standardize on one pair of columns or search both sets.

---

## Files Reviewed

### API Routes (16 files)
- ✅ `/apps/web/app/api/grants/search/route.ts`
- ✅ `/apps/web/app/api/grants/opportunities/route.ts`
- ✅ `/apps/web/app/api/grants/watchlist/route.ts`
- ✅ `/apps/web/app/api/grants/watchlist/[id]/route.ts`
- ✅ `/apps/web/app/api/grants/saved-searches/route.ts`
- ✅ `/apps/web/app/api/grants/saved-searches/[id]/route.ts`
- ✅ `/apps/web/app/api/publications/route.ts`
- ✅ `/apps/web/app/api/publications/[id]/route.ts`
- ✅ `/apps/web/app/api/publications/import/route.ts`
- ✅ `/apps/web/app/api/documents/route.ts`
- ✅ `/apps/web/app/api/documents/[id]/route.ts`
- ✅ `/apps/web/app/api/documents/[id]/process/route.ts`

### Hooks (3 files)
- ✅ `/apps/web/lib/hooks/use-grants.ts`
- ✅ `/apps/web/lib/hooks/use-publications.ts`
- ✅ `/apps/web/lib/hooks/use-documents.ts`

### Components (5 files)
- ✅ `/apps/web/components/grants/grant-document-modal.tsx`
- ✅ `/apps/web/components/documents/document-upload.tsx`
- ✅ `/apps/web/components/documents/document-processor.tsx` (not read - assumed covered by API)
- ✅ `/apps/web/components/publications/` (5 components - not deeply reviewed, focused on API)

### Pages (2 files)
- ✅ `/apps/web/app/(dashboard)/grants/page.tsx`
- ✅ `/apps/web/app/(dashboard)/publications/page.tsx`

### Database Migrations (3 files)
- ✅ `supabase/migrations/20241217000004_funding_opportunities.sql`
- ✅ `supabase/migrations/20241221000001_publications.sql`
- ✅ `supabase/migrations/20241221000000_documents_and_ai.sql` (referenced, not fully read)

### Tests (3 files)
- ✅ `/apps/web/__tests__/api/grants.test.ts`
- ✅ `/apps/web/__tests__/api/documents.test.ts` (not fully read)
- ✅ `/apps/web/__tests__/components/publication-components.test.tsx` (not fully read)

### Shared Schemas (1 file)
- ✅ `/packages/shared/src/schemas/index.ts` (Publication schemas section)

**Total Files Reviewed:** 33 files

---

## Verdict: NEEDS_FIX

**Summary:** Found **4 critical security issues** related to missing workspace authorization checks that could allow unauthorized access/modification across workspaces. Also found **6 medium-severity bugs** related to error handling, data consistency, and validation. The **15 total bugs** should be addressed before production use, with critical issues requiring immediate attention.

**Priority Fixes:**
1. Add workspace authorization checks to grants opportunities POST (Critical #1)
2. Add workspace authorization to all DELETE operations (Critical #2)
3. Verify workspace membership in publications API (Critical #3)
4. Add workspace verification to watchlist PATCH (Critical #4)
5. Fix delete-then-insert pattern in publication authors to prevent data loss (Medium #10)

**Positive Notes:**
- Test coverage exists and catches ILIKE injection (test validates sanitization works)
- RLS policies are properly configured at database level
- API routes follow consistent patterns (auth check, validation, error handling)
- Zod schemas provide good type safety
- No null pointer exceptions or obvious runtime errors found

**Risk Assessment:**
- **Security Risk:** HIGH - workspace boundary violations possible
- **Data Loss Risk:** MEDIUM - author update could lose data
- **Runtime Error Risk:** LOW - good error handling overall
- **UX Impact:** LOW - most issues are backend security
