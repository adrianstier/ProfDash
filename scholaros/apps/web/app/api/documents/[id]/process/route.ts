import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const ProcessRequestSchema = z.object({
  extraction_type: z.enum([
    "grant_opportunity",
    "grant_application",
    "cv_resume",
    "budget",
    "timeline",
    "tasks",
    "general",
  ]),
  // Optional context to help AI understand the document
  context: z.string().optional(),
});

// POST - Process document with AI
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get document
  const { data: document, error: fetchError } = await supabase
    .from("documents")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  // Verify ownership
  if (document.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = ProcessRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { extraction_type, context } = parsed.data;

  // Update status to processing
  await supabase
    .from("documents")
    .update({ status: "processing" })
    .eq("id", id);

  try {
    // Download file content from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("documents")
      .download(document.file_path);

    if (downloadError || !fileData) {
      throw new Error("Failed to download file");
    }

    // For text files, we can process directly
    // For PDFs and other formats, we need to call the AI service
    let textContent = "";

    if (document.mime_type === "text/plain") {
      textContent = await fileData.text();
    } else {
      // Convert file to base64 for AI service
      const arrayBuffer = await fileData.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");

      // Call AI service to extract text
      const aiServiceUrl = process.env.AI_SERVICE_URL || "http://localhost:8000";
      const aiApiKey = process.env.AI_SERVICE_API_KEY;

      const extractResponse = await fetch(
        `${aiServiceUrl}/api/documents/extract-text`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(aiApiKey ? { "X-API-Key": aiApiKey } : {}),
          },
          body: JSON.stringify({
            file_base64: base64,
            mime_type: document.mime_type,
            filename: document.original_filename,
          }),
        }
      );

      if (!extractResponse.ok) {
        const errorData = await extractResponse.json().catch(() => ({}));
        throw new Error(
          errorData.detail || `AI service error: ${extractResponse.status}`
        );
      }

      const extractResult = await extractResponse.json();
      textContent = extractResult.text;

      // Update document with extracted text and page count
      await supabase
        .from("documents")
        .update({
          extracted_text: textContent,
          page_count: extractResult.page_count || null,
        })
        .eq("id", id);
    }

    // Now process the text based on extraction type
    const aiServiceUrl = process.env.AI_SERVICE_URL || "http://localhost:8000";
    const aiApiKey = process.env.AI_SERVICE_API_KEY;

    const analyzeResponse = await fetch(
      `${aiServiceUrl}/api/documents/analyze`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(aiApiKey ? { "X-API-Key": aiApiKey } : {}),
        },
        body: JSON.stringify({
          text: textContent,
          extraction_type,
          context: context || null,
          filename: document.original_filename,
        }),
      }
    );

    if (!analyzeResponse.ok) {
      const errorData = await analyzeResponse.json().catch(() => ({}));
      throw new Error(
        errorData.detail || `AI analysis error: ${analyzeResponse.status}`
      );
    }

    const analysisResult = await analyzeResponse.json();

    // Store extraction result
    const { data: extraction, error: extractionError } = await supabase
      .from("document_extractions")
      .insert({
        document_id: id,
        extraction_type,
        model_used: analysisResult.model_used || "unknown",
        prompt_version: analysisResult.prompt_version || null,
        extracted_data: analysisResult.data,
        confidence_score: analysisResult.confidence || null,
      })
      .select()
      .single();

    if (extractionError) {
      console.error("Error saving extraction:", extractionError);
      throw new Error("Failed to save extraction results");
    }

    // Update document status to completed
    await supabase
      .from("documents")
      .update({ status: "completed" })
      .eq("id", id);

    // Log AI interaction
    await supabase.from("ai_interactions").insert({
      workspace_id: document.workspace_id,
      user_id: user.id,
      feature: "document_parsing",
      document_id: id,
      request_summary: `Parse ${document.original_filename} as ${extraction_type}`,
      response_summary: `Extracted ${Object.keys(analysisResult.data || {}).length} fields`,
      model_used: analysisResult.model_used,
      tokens_used: analysisResult.tokens_used || null,
    });

    return NextResponse.json({
      success: true,
      extraction,
      data: analysisResult.data,
    });
  } catch (error) {
    console.error("Document processing error:", error);

    // Update document status to failed
    await supabase
      .from("documents")
      .update({
        status: "failed",
        error_message: error instanceof Error ? error.message : "Unknown error",
      })
      .eq("id", id);

    return NextResponse.json(
      {
        error: "Failed to process document",
        details: error instanceof Error ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
