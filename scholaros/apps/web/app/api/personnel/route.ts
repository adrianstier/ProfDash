import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { PersonnelRoleSchema } from "@scholaros/shared";

const CreatePersonnelSchema = z.object({
  name: z.string().min(1, "Name is required"),
  role: PersonnelRoleSchema,
  workspace_id: z.string().uuid().optional(),
  year: z.number().int().min(1).max(10).optional().nullable(),
  funding: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// GET /api/personnel - List all personnel
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
    const role = searchParams.get("role");

    let query = supabase
      .from("personnel")
      .select("*")
      .eq("user_id", user.id)
      .order("name", { ascending: true });

    if (workspaceId) {
      query = query.eq("workspace_id", workspaceId);
    }

    if (role && PersonnelRoleSchema.safeParse(role).success) {
      query = query.eq("role", role);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching personnel:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
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

// POST /api/personnel - Create new personnel
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
    const validationResult = CreatePersonnelSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("personnel")
      .insert({
        ...validationResult.data,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating personnel:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
