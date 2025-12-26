import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { CreatePublicationSchema } from "@scholaros/shared";

// GET /api/publications - List all publications
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspace_id");
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const year = searchParams.get("year");
    const limit = parseInt(searchParams.get("limit") || "100", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    let query = supabase
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
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (workspaceId) {
      query = query.eq("workspace_id", workspaceId);
    }

    if (status) {
      query = query.eq("status", status);
    }

    if (type) {
      query = query.eq("publication_type", type);
    }

    if (year) {
      query = query.eq("year", parseInt(year, 10));
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching publications:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Sort authors by author_order
    const publications = data?.map((pub) => ({
      ...pub,
      publication_authors: pub.publication_authors?.sort(
        (a: { author_order: number }, b: { author_order: number }) => a.author_order - b.author_order
      ),
    }));

    return NextResponse.json({ data: publications, count });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/publications - Create new publication
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
    const validationResult = CreatePublicationSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { authors } = body;

    // Create publication
    const { data: publication, error } = await supabase
      .from("publications")
      .insert({
        ...validationResult.data,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating publication:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Add authors if provided
    if (authors && Array.isArray(authors) && authors.length > 0) {
      const authorsWithPublicationId = authors.map((author: { name: string; author_order?: number }, index: number) => ({
        ...author,
        publication_id: publication.id,
        author_order: author.author_order || index + 1,
      }));

      const { error: authorsError } = await supabase
        .from("publication_authors")
        .insert(authorsWithPublicationId);

      if (authorsError) {
        console.error("Error adding authors:", authorsError);
        // Don't fail the whole request, just log the error
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
