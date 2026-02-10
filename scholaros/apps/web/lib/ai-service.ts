/**
 * Helper to resolve the AI service URL safely.
 *
 * In production, the env var MUST be set — calling code should return 503
 * when this function returns null.
 * In development/test, falls back to localhost:8000.
 */
export function getAIServiceURL(): string | null {
  const url = process.env.AI_SERVICE_URL;
  if (url) return url;
  if (process.env.NODE_ENV === "production") return null;
  return "http://localhost:8000";
}
