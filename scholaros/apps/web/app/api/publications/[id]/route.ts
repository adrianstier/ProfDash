import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { UpdatePublicationSchema } from "@scholaros/shared";

// GET /api/publications/[id] - Get single publication
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
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
        ),
        publication_projects(
          id,
          project_id,
          projects:project_id(id, title, type, status)
        ),
        publication_grants(
          id,
          project_id,
          watchlist_id,
          grant_number,
          agency,
          grant_title,
          acknowledgment_text
        )
      `)
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Publication not found" }, { status: 404 });
      }
      console.error("Error fetching publication:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Sort authors by author_order
    if (data.publication_authors) {
      data.publication_authors.sort(
        (a: { author_order: number }, b: { author_order: number }) => a.author_order - b.author_order
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/publications/[id] - Update publication
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validationResult = UpdatePublicationSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    // Separate authors from publication data
    const { authors } = body;

    // Update publication
    const { error } = await supabase
      .from("publications")
      .update(validationResult.data)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Publication not found" }, { status: 404 });
      }
      console.error("Error updating publication:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Update authors if provided
    if (authors && Array.isArray(authors)) {
      // Delete existing authors
      await supabase
        .from("publication_authors")
        .delete()
        .eq("publication_id", id);

      // Insert new authors
      if (authors.length > 0) {
        const authorsWithPublicationId = authors.map((author: { name: string; author_order?: number }, index: number) => ({
          ...author,
          publication_id: id,
          author_order: author.author_order || index + 1,
        }));

        const { error: authorsError } = await supabase
          .from("publication_authors")
          .insert(authorsWithPublicationId);

        if (authorsError) {
          console.error("Error updating authors:", authorsError);
        }
      }
    }

    // Fetch the complete updated publication
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
      .eq("id", id)
      .single();

    return NextResponse.json(completePublication);
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/publications/[id] - Delete publication
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabase
      .from("publications")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error deleting publication:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
