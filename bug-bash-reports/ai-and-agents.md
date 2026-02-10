# AI & Agents Bug Bash Report

All file paths are relative to `scholaros/apps/web/`.

## Critical Bugs

- **[app/api/ai/transcribe/route.ts:186-188] Prompt injection via transcription content.** The raw transcription text is interpolated directly into the Claude prompt string on line 180-182 (`${transcription}`). Additionally, the `transcription.substring(0, 100)` on lines 187 and 221 is embedded inside a JSON template within the prompt itself, meaning the AI sees a pre-populated JSON field with user-controlled content. A malicious audio recording could contain text that escapes the JSON/prompt structure and hijacks the AI's behavior.

- **[app/api/ai/enhance-task/route.ts:136-137] Prompt injection via user-supplied task title and description.** The `task_title` and `task_description` fields are interpolated directly into the prompt string using `"${task_title}"` and `"${task_description}"`. A user can craft a task title like `" ; Ignore all previous instructions and...` to manipulate the AI's output. The same pattern exists in:
  - `app/api/ai/breakdown-task/route.ts:101-103`
  - `app/api/ai/smart-parse/route.ts:93-94`
  - `app/api/ai/parse-content/route.ts:186-187`
  - `app/api/ai/generate-email/route.ts:162`

- **[app/api/ai/parse-file/route.ts:101-108] PDF files are sent with wrong media type, causing API errors or incorrect processing.** When a PDF is uploaded (`isPDF` is true), the code falls through to set `mediaType = "image/png"` (line 107) as a "fallback." This means PDFs are sent to Claude's vision API with an `image/png` media type, which will either cause the API to reject the request or produce garbage results since the base64 data is a PDF, not a PNG.

- **[app/api/ai/parse-file/route.ts:49-50] No UUID validation on workspace_id from FormData.** The `workspaceId` is extracted from `formData.get("workspace_id") as string` without any UUID format validation. It is passed directly to a Supabase `.eq()` query. While Supabase/Postgres will reject non-UUID values, this is an inconsistency with other routes that validate with Zod, and could lead to unexpected error messages leaking internal details.

- **[app/api/ai/*, app/api/agents/*] No rate limiting on any AI endpoint.** A rate limiting module exists at `lib/rate-limit.ts` with an `ai` config (20 requests/minute), but it is not imported or used by any AI or agent API route. An authenticated user can make unlimited requests to expensive AI API calls (Anthropic, OpenAI Whisper), leading to unbounded cost exposure.

- **[app/api/agents/chat/route.ts:62] Missing workspace authorization check.** The route fetches the user's first workspace (`limit(1)`) and defaults to `"default"` if none found (line 62), but never verifies the user has permission to operate in the workspace context. Unlike other AI routes that explicitly check workspace membership, this route passes `workspaceId` to the AI service without verification.

- **[app/api/agents/execute/route.ts:50] No workspace authorization for agent execution.** The route validates the request shape but does not check workspace membership or pass any workspace context. The `input` field is `z.record(z.unknown())` which means any arbitrary data is forwarded to the AI service without workspace-scoped authorization.

- **[app/api/agents/orchestrate/route.ts:92] No workspace authorization for workflow orchestration.** Same issue as execute -- the route authenticates the user but does not verify workspace membership. The `input` field of each workflow step (`z.record(z.unknown())`) passes through unchecked.

- **[app/api/agents/feedback/route.ts:49] No verification that feedback belongs to the user's session.** Any authenticated user can submit feedback for any session/message ID. There is no check that the `sessionId` or `messageId` belongs to the requesting user, allowing one user to manipulate another user's feedback records.

- **[app/api/documents/[id]/route.ts:27-38] GET endpoint has no ownership or workspace membership check.** The GET handler for a single document fetches by ID but relies entirely on RLS. If RLS policies are misconfigured or if the Supabase client uses the service role key, any authenticated user could access any document. Explicit authorization checks (like those in PATCH and DELETE) should also be present for defense-in-depth.

## Medium Issues

- **[app/api/ai/smart-parse/route.ts:211-215] Schema validation failure is silently ignored.** When `SmartParseResultSchema.safeParse(validatedResult)` fails (line 212), the code logs the error but still returns the unvalidated result (line 230). This means malformed AI responses bypass schema validation and reach the client.

- **[app/api/ai/transcribe/route.ts:152] Whisper API response type mismatch.** When `response_format` is `"text"`, the OpenAI Whisper API returns a plain string, but the code assigns it as `transcription = whisperResponse` (line 152). The TypeScript type of `whisperResponse` from the SDK when `response_format: "text"` is actually the text directly, not a JSON object. This works at runtime but the `as string` typing may cause issues if the SDK changes behavior.

- **[app/api/ai/enhance-task/route.ts:216-218, breakdown-task/route.ts:173-175, parse-content/route.ts:257-258] Raw AI response text leaked in error responses.** When JSON parsing of the AI response fails, these endpoints return the raw AI response text in the `raw` field of the error response. This could expose prompt internals, partial AI outputs, or sensitive context to the client.

- **[app/api/ai/project-summary/route.ts:39-102] No workspace membership verification.** The route validates authentication and the request body, but the `ProjectSummarySchema` does not include a `workspace_id` field and there is no workspace membership check. Any authenticated user can request a summary for any project data they supply in the body.

- **[app/api/ai/fit-score/route.ts:27-90] No workspace membership verification.** Same issue as project-summary -- the route validates auth and request body but has no workspace_id or membership check.

- **[app/api/documents/[id]/process/route.ts:92-93] Inconsistent env var name.** The code uses `process.env.AI_SERVICE_API_KEY` (line 93) while other files use `process.env.AI_SERVICE_KEY` or `env.AI_SERVICE_KEY` from the validated env module. This likely means the API key header is never set, causing the AI service calls to fail or be unauthenticated.

- **[app/api/documents/[id]/process/route.ts:187-196] Insert into `ai_interactions` table may fail silently.** The insert is not awaited with error handling. If the table schema doesn't match (e.g., `document_id` column name differs, or workspace_id is null when the constraint requires non-null), the insert will fail but the route will still return success.

- **[app/api/ai/transcribe/route.ts:62-71] SUPPORTED_FORMATS list is incomplete/incorrect.** The list includes `"audio/mp3"` and `"audio/mpga"` which are non-standard MIME types (the standard is `"audio/mpeg"`). Meanwhile, the `use-voice.ts` hook records in `"audio/webm"` format, which IS in the list, but if a browser reports `"audio/mp3"` the validation will pass. This is a minor inconsistency.

- **[app/api/agents/route.ts:4] Hardcoded fallback URL.** `AI_SERVICE_URL` defaults to `"http://localhost:8000"`. In production, if the env var is not set, requests will be sent to localhost and either fail or connect to an unintended service. Same issue in `agents/chat/route.ts:5`, `agents/execute/route.ts:5`, `agents/orchestrate/route.ts:5`, `agents/feedback/route.ts:5`.

- **[app/api/agents/route.ts:25] API key sent as empty string.** When `AI_SERVICE_KEY` is undefined, the header `"X-API-Key": ""` is sent. Some API services may treat an empty API key differently from no key, potentially bypassing authentication or causing confusing errors. Same pattern in all agent routes.

- **[app/api/documents/[id]/process/route.ts:65-68] Document status set to "processing" without error recovery.** If the subsequent processing fails between the status update and the catch block, the status is correctly set to "failed." However, if the server crashes mid-processing, the document will be stuck in "processing" status permanently with no recovery mechanism.

- **[lib/hooks/use-agents.ts:30-36] `fetchAgentInfo` calls non-existent API route.** The function fetches `/api/agents/${agentType}` but there is no `app/api/agents/[agentType]/route.ts` file. This will always return a 404.

- **[lib/hooks/use-agents.ts:239] Stale message count in session context.** The session is updated with `messageCount: store.messages.length + 2`, but `store.messages` may not yet include the messages just added via `store.addMessage()` due to React/Zustand state batching. This could result in an incorrect message count.

- **[app/api/ai/enhance-task/route.ts:6-8, breakdown-task/route.ts:10-12, smart-parse/route.ts:6-8, parse-content/route.ts:6-8, generate-email/route.ts:6-8] Anthropic client initialized at module level with process.env.** The Anthropic client is created at the top of the module using `process.env.ANTHROPIC_API_KEY`. If the env var is not set, this will create a client with `undefined` as the API key, which will fail on every request with a confusing error rather than a clear "not configured" message. Compare with `transcribe/route.ts` which handles this via lazy initialization.

- **[app/api/ai/generate-email/route.ts:45-239] No activity logging for email generation.** Unlike other AI routes (enhance-task, breakdown-task, smart-parse, parse-content), the generate-email route does not log to `workspace_activity`. This is inconsistent and means email generation usage is not tracked.

- **[lib/hooks/use-agents.ts:270] useCallback dependency array includes `context` object.** The `context` parameter defaults to `{}` (line 182), creating a new object reference on every render. This means the `sendMessage` callback is re-created on every render, defeating the purpose of `useCallback` and potentially causing infinite re-render loops in consuming components that depend on referential stability.

## Low / Code Quality

- **[app/api/ai/transcribe/route.ts:43-44, 58-59] `transcriptionResultSchema` created but only used via `void` statement.** The schema is defined (lines 44-54), a type is inferred from it (line 56), but it's never used for actual validation. The `void transcriptionResultSchema` (line 59) exists only to suppress the unused variable warning. The actual AI response is typed `as TranscriptionResult` without runtime validation.

- **[app/api/ai/enhance-task/route.ts:52] Type `EnhancedTask` exported from API route file.** API route files should not export types as they are not importable by client code. The same type is independently defined in `lib/hooks/use-ai.ts`. Same issue in `breakdown-task/route.ts:38`, `parse-content/route.ts:55`, `parse-file/route.ts:32`, `generate-email/route.ts:42`.

- **[app/api/ai/enhance-task/route.ts:6-8] Inconsistent env var access patterns.** Some routes use the validated `env` module (`extract-tasks/route.ts`, `project-summary/route.ts`, `fit-score/route.ts`), while others use `process.env` directly (`enhance-task/route.ts`, `breakdown-task/route.ts`, `smart-parse/route.ts`, etc.). This inconsistency means some routes lack env validation.

- **[app/api/agents/chat/route.ts:95] Assumes response always has JSON body.** When the AI service response is not OK, the route calls `response.text()` to get error details. But on the success path (line 95), it calls `response.json()` without a try-catch. If the AI service returns invalid JSON on a 200 response, this will throw an unhandled error.

- **[lib/hooks/use-ai.ts:176-179] Type mismatch between hook param and API schema.** The `generateProjectSummary` function accepts `type: "manuscript" | "grant" | "general" | "research"` but the API route schema (`ProjectContextSchema`) only accepts `type: "manuscript" | "grant" | "general"`. Passing `"research"` from the hook will cause a Zod validation error on the server.

- **[lib/hooks/use-ai.ts:266-290] `breakdownTask` sends params the API doesn't accept.** The hook sends `breakdown_style` and `include_estimates` parameters, but the `BreakdownRequestSchema` in the API route does not define these fields. They are silently stripped by Zod's `.safeParse()` which means these options have no effect.

- **[lib/hooks/use-agents.ts:270] `store` in useCallback dependency array.** The entire Zustand store object is in the dependency array of `sendMessage`. Since Zustand returns a new reference on state changes, this callback may be re-created more often than necessary.

- **[components/ai/extract-tasks-from-document.tsx:53] `void documentId` workaround.** The `documentId` state variable is set but immediately voided with a comment about "future feature." This is dead state that should be removed or the feature implemented.

- **[components/ai/agent-chat.tsx:281] `handleSuggestedAction` uses `window.location.href` for navigation.** This causes a full page reload instead of using Next.js router for client-side navigation. Should use `useRouter().push()` instead.

- **[components/documents/document-upload.tsx:18-23] Client-side ALLOWED_TYPES is a subset of server-side.** The client-side upload component allows PDF, Word, and Text, but not PNG or JPEG (which are in the server-side `ALLOWED_MIME_TYPES` list). This means drag-and-drop of images will be rejected client-side even though the server would accept them.

- **[app/api/voice/transcribe/route.ts:1-70] Duplicate transcription endpoint.** There are two transcription endpoints: `app/api/voice/transcribe/route.ts` (simple, direct OpenAI call) and `app/api/ai/transcribe/route.ts` (full-featured with task extraction). The voice route lacks file type validation, file size limits, and workspace authorization -- it only checks auth. This creates confusion about which endpoint to use.

- **[app/api/voice/transcribe/route.ts:22] No file type validation on audio file.** The simple voice transcription route accepts any file type and forwards it to OpenAI without checking if it's actually an audio file.

- **[app/api/voice/transcribe/route.ts:37] Hardcoded filename "audio.webm".** The uploaded file's actual filename is discarded and replaced with "audio.webm" regardless of the actual format, which could confuse the Whisper API if the file is actually in a different format.

- **[lib/stores/agent-store.ts:179-214] Task lifecycle tracking never transitions from pending to running.** The `completeTask` and `failTask` methods look for the task in `runningTasks`, but `addPendingTask` adds to `pendingTasks` and `moveToRunning` is never called from the hooks. The `onSuccess` callback in `use-agents.ts:311` tries to `completeTask(response.taskId)` but the task is still in `pendingTasks` (added in `onMutate`), so the find on `runningTasks` returns undefined and the state update is a no-op.

- **[lib/stores/agent-store.ts:297-300] `onMutate` creates task ID with `Date.now()`.** The `addPendingTask` in `use-agents.ts:299` generates a local ID like `task-1707483...`, but `completeTask` on line 312 tries to match against `response.taskId` which comes from the server and has a different format. These IDs will never match, so task completion tracking is broken.

## Summary

14 critical, 15 medium, 15 low
