import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const ImportDOISchema = z.object({
  doi: z.string().min(1, "DOI is required").regex(/^(https?:\/\/(dx\.)?doi\.org\/)?10\.\d{4,}\/.+$/, "Invalid DOI format (expected 10.XXXX/... or https://doi.org/10.XXXX/...)"),
  workspace_id: z.string().uuid().optional(),
});

interface CrossRefAuthor {
  given?: string;
  family?: string;
  sequence?: string;
  affiliation?: { name: string }[];
  ORCID?: string;
}

interface CrossRefWork {
  DOI: string;
  title?: string[];
  abstract?: string;
  type?: string;
  author?: CrossRefAuthor[];
  "container-title"?: string[];
  volume?: string;
  issue?: string;
  page?: string;
  published?: { "date-parts"?: number[][] };
  "published-print"?: { "date-parts"?: number[][] };
  "published-online"?: { "date-parts"?: number[][] };
  URL?: string;
  "is-referenced-by-count"?: number;
  ISSN?: string[];
  subject?: string[];
}

// Map CrossRef type to our publication type
function mapCrossRefType(type: string): string {
  const typeMap: Record<string, string> = {
    "journal-article": "journal-article",
    "proceedings-article": "conference-paper",
    "book-chapter": "book-chapter",
    book: "book",
    "posted-content": "preprint",
    dissertation: "thesis",
    report: "report",
  };
  return typeMap[type] || "other";
}

// Extract year from CrossRef date
function extractYear(work: CrossRefWork): number | null {
  const dateParts =
    work.published?.["date-parts"]?.[0] ||
    work["published-print"]?.["date-parts"]?.[0] ||
    work["published-online"]?.["date-parts"]?.[0];

  if (dateParts && dateParts[0]) {
    return dateParts[0];
  }
  return null;
}

// POST /api/publications/import - Import publication from DOI
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validationResult = ImportDOISchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { doi, workspace_id } = validationResult.data;

    // Clean DOI (remove URL prefix if present)
    const cleanDoi = doi.replace(/^https?:\/\/(dx\.)?doi\.org\//, "").trim();

    // Check if publication with this DOI already exists
    const { data: existing } = await supabase
      .from("publications")
      .select("id")
      .eq("user_id", user.id)
      .eq("doi", cleanDoi)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "Publication with this DOI already exists", existingId: existing.id },
        { status: 409 }
      );
    }

    // Fetch metadata from CrossRef API
    const crossRefResponse = await fetch(
      `https://api.crossref.org/works/${encodeURIComponent(cleanDoi)}`,
      {
        headers: {
          "User-Agent": "ScholarOS/1.0 (mailto:support@scholaros.app)",
        },
      }
    );

    if (!crossRefResponse.ok) {
      if (crossRefResponse.status === 404) {
        return NextResponse.json(
          { error: "DOI not found in CrossRef" },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: "Failed to fetch DOI metadata" },
        { status: 502 }
      );
    }

    const crossRefData = await crossRefResponse.json();
    const work: CrossRefWork = crossRefData.message;

    // Extract publication data
    const publicationData = {
      user_id: user.id,
      workspace_id: workspace_id || null,
      title: work.title?.[0] || "Untitled",
      abstract: work.abstract || null,
      publication_type: mapCrossRefType(work.type || "other"),
      status: "published" as const,
      journal: work["container-title"]?.[0] || null,
      volume: work.volume || null,
      issue: work.issue || null,
      pages: work.page || null,
      year: extractYear(work),
      doi: cleanDoi,
      url: work.URL || `https://doi.org/${cleanDoi}`,
      citation_count: work["is-referenced-by-count"] || 0,
      keywords: work.subject || [],
      metadata: {
        crossref_type: work.type,
        issn: work.ISSN,
        imported_at: new Date().toISOString(),
      },
    };

    // Create the publication
    const { data: publication, error } = await supabase
      .from("publications")
      .insert(publicationData)
      .select()
      .single();

    if (error) {
      console.error("Error creating publication:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Add authors
    if (work.author && work.author.length > 0) {
      const authors = work.author.map((author, index) => {
        const name = [author.given, author.family].filter(Boolean).join(" ") || "Unknown Author";
        const isFirst = author.sequence === "first" || index === 0;

        return {
          publication_id: publication.id,
          name,
          affiliation: author.affiliation?.[0]?.name || null,
          orcid: author.ORCID?.replace("http://orcid.org/", "") || null,
          author_order: index + 1,
          author_role: isFirst ? "first" : "middle",
          is_corresponding: false,
        };
      });

      const { error: authorsError } = await supabase
        .from("publication_authors")
        .insert(authors);

      if (authorsError) {
        console.error("Error adding authors:", authorsError);
      }
    }

    // Fetch the complete publication with authors
    const { data: completePublication } = await supabase
      .from("publications")
      .select(`
        *,
        publication_authors(
          id,
          personnel_id,
          name,
          email,
          affiliation,
          orcid,
          author_order,
          author_role,
          is_corresponding
        )
      `)
      .eq("id", publication.id)
      .single();

    return NextResponse.json(completePublication, { status: 201 });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
