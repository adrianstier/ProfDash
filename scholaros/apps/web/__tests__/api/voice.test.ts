/**
 * Voice Transcribe API Route Tests
 *
 * Tests for POST /api/voice/transcribe
 *
 * Uses custom Request with mocked formData() to work around jsdom's
 * lack of multipart/form-data parsing support.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const mockSupabase = {
  auth: { getUser: vi.fn() },
  from: vi.fn(),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

const MOCK_USER = { id: "user-123", email: "test@example.com" };

/**
 * Create a Request with a mocked formData() method.
 */
function createMockFormDataRequest(
  url: string,
  fields: Record<string, string | File>
): Request {
  const request = new Request(url, { method: "POST" });
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (typeof value === "string") {
      fd.append(key, value);
    } else {
      fd.append(key, value);
    }
  }
  // Override formData to return our pre-built FormData
  Object.defineProperty(request, "formData", {
    value: () => Promise.resolve(fd),
  });
  return request;
}

describe("Voice Transcribe API - POST /api/voice/transcribe", () => {
  let originalApiKey: string | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    originalApiKey = process.env.OPENAI_API_KEY;
  });

  afterEach(() => {
    if (originalApiKey !== undefined) {
      process.env.OPENAI_API_KEY = originalApiKey;
    } else {
      delete process.env.OPENAI_API_KEY;
    }
  });

  it("should return 401 when unauthenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    const { POST } = await import("@/app/api/voice/transcribe/route");

    const request = createMockFormDataRequest(
      "http://localhost/api/voice/transcribe",
      {
        audio: new File(["fake-audio"], "recording.webm", {
          type: "audio/webm",
        }),
      }
    );
    const response = await POST(request);
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("should return 400 when no audio file is provided", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });

    const { POST } = await import("@/app/api/voice/transcribe/route");

    // No "audio" field
    const request = createMockFormDataRequest(
      "http://localhost/api/voice/transcribe",
      { other_field: "not audio" }
    );
    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("No audio file provided");
  });

  it("should return 500 when OPENAI_API_KEY is not configured", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });

    delete process.env.OPENAI_API_KEY;

    const { POST } = await import("@/app/api/voice/transcribe/route");

    const request = createMockFormDataRequest(
      "http://localhost/api/voice/transcribe",
      {
        audio: new File(["fake-audio"], "recording.webm", {
          type: "audio/webm",
        }),
      }
    );
    const response = await POST(request);
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Voice transcription not configured");
  });

  it("should call OpenAI API and return transcription on success", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });

    process.env.OPENAI_API_KEY = "test-api-key-123";

    const savedFetch = globalThis.fetch;
    const mockOpenAIFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ text: "Transcribed text here" }),
    } as Response);
    globalThis.fetch = mockOpenAIFetch;

    try {
      const { POST } = await import("@/app/api/voice/transcribe/route");

      const request = createMockFormDataRequest(
        "http://localhost/api/voice/transcribe",
        {
          audio: new File(["fake-audio"], "recording.webm", {
            type: "audio/webm",
          }),
        }
      );
      const response = await POST(request);
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.text).toBe("Transcribed text here");

      expect(mockOpenAIFetch).toHaveBeenCalledWith(
        "https://api.openai.com/v1/audio/transcriptions",
        expect.objectContaining({
          method: "POST",
          headers: { Authorization: "Bearer test-api-key-123" },
        })
      );
    } finally {
      globalThis.fetch = savedFetch;
    }
  });

  it("should forward OpenAI API error messages", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });

    process.env.OPENAI_API_KEY = "test-api-key-123";

    const savedFetch = globalThis.fetch;
    const mockOpenAIFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: () => Promise.resolve({ error: { message: "Rate limited" } }),
    } as unknown as Response);
    globalThis.fetch = mockOpenAIFetch;

    try {
      const { POST } = await import("@/app/api/voice/transcribe/route");

      const request = createMockFormDataRequest(
        "http://localhost/api/voice/transcribe",
        {
          audio: new File(["fake-audio"], "recording.webm", {
            type: "audio/webm",
          }),
        }
      );
      const response = await POST(request);
      expect(response.status).toBe(429);
      const body = await response.json();
      expect(body.error).toBe("Rate limited");
    } finally {
      globalThis.fetch = savedFetch;
    }
  });

  it("should handle non-JSON OpenAI error gracefully", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });

    process.env.OPENAI_API_KEY = "test-api-key-123";

    const savedFetch = globalThis.fetch;
    const mockOpenAIFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      json: () => Promise.reject(new Error("Not JSON")),
    } as unknown as Response);
    globalThis.fetch = mockOpenAIFetch;

    try {
      const { POST } = await import("@/app/api/voice/transcribe/route");

      const request = createMockFormDataRequest(
        "http://localhost/api/voice/transcribe",
        {
          audio: new File(["fake-audio"], "recording.webm", {
            type: "audio/webm",
          }),
        }
      );
      const response = await POST(request);
      expect(response.status).toBe(502);
      const body = await response.json();
      expect(body.error).toBe("Transcription failed");
    } finally {
      globalThis.fetch = savedFetch;
    }
  });
});
