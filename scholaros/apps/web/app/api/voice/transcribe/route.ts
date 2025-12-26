import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// OpenAI Whisper API endpoint
const OPENAI_API_URL = "https://api.openai.com/v1/audio/transcriptions";

export async function POST(request: Request) {
  try {
    // Verify authentication
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the audio file from the request
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File;

    if (!audioFile) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }

    // Get API key from environment
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error("OpenAI API key not configured");
      return NextResponse.json({ error: "Voice transcription not configured" }, { status: 500 });
    }

    // Prepare FormData for OpenAI API
    const openAIFormData = new FormData();
    openAIFormData.append("file", audioFile, "audio.webm");
    openAIFormData.append("model", "whisper-1");
    openAIFormData.append("language", "en");
    openAIFormData.append("response_format", "json");

    // Call OpenAI Whisper API
    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
      body: openAIFormData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("OpenAI API error:", errorData);
      return NextResponse.json(
        { error: errorData.error?.message || "Transcription failed" },
        { status: response.status }
      );
    }

    const result = await response.json();

    return NextResponse.json({ text: result.text });
  } catch (error) {
    console.error("Transcription error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
