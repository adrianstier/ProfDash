import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const keywords = searchParams.get("keywords");
    const agency = searchParams.get("agency");
    const fundingType = searchParams.get("funding_type");
    const amountMin = searchParams.get("amount_min");
    const amountMax = searchParams.get("amount_max");
    const deadlineFrom = searchParams.get("deadline_from");
    const deadlineTo = searchParams.get("deadline_to");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);
    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
      .from("funding_opportunities")
      .select("*", { count: "exact" });

    // Full-text search on title and description
    // Sanitize keywords to prevent injection
    if (keywords) {
      const sanitizedKeywords = keywords.replace(/[%_]/g, "\\$&");
      query = query.or(`title.ilike.%${sanitizedKeywords}%,description.ilike.%${sanitizedKeywords}%`);
    }

    // Filter by agency
    // Sanitize agency to prevent injection
    if (agency) {
      const sanitizedAgency = agency.replace(/[%_]/g, "\\$&");
      query = query.ilike("agency", `%${sanitizedAgency}%`);
    }

    // Filter by funding type
    if (fundingType) {
      query = query.eq("funding_instrument_type", fundingType);
    }

    // Filter by amount range
    // award_ceiling >= amountMin means the grant could fund at least the minimum
    if (amountMin) {
      query = query.gte("award_ceiling", parseFloat(amountMin));
    }
    // award_ceiling <= amountMax means the grant's max doesn't exceed user's budget
    if (amountMax) {
      query = query.lte("award_ceiling", parseFloat(amountMax));
    }

    // Filter by deadline range
    if (deadlineFrom) {
      query = query.gte("deadline", deadlineFrom);
    }
    if (deadlineTo) {
      query = query.lte("deadline", deadlineTo);
    }

    // Only show opportunities with future deadlines by default
    const today = new Date().toISOString().split("T")[0];
    if (!deadlineFrom && !deadlineTo) {
      query = query.or(`deadline.gte.${today},deadline.is.null`);
    }

    // Order by deadline (soonest first), then by created_at
    query = query
      .order("deadline", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error("Search error:", error);
      return NextResponse.json({ error: "Failed to search opportunities" }, { status: 500 });
    }

    return NextResponse.json({
      opportunities: data || [],
      total: count || 0,
      page,
      limit,
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
