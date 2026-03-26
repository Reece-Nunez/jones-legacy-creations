import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { COST_RANGES } from "@/lib/types/database";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const { client_name, client_email, project_type, description } = body;
    if (!client_name || !client_email || !project_type || !description) {
      return NextResponse.json(
        { error: "Missing required fields: client_name, client_email, project_type, description" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(client_email)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Basic rate limiting: check if same email submitted in last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recentEstimates } = await supabase
      .from("estimates")
      .select("id")
      .eq("client_email", client_email)
      .gte("created_at", oneHourAgo);

    if (recentEstimates && recentEstimates.length > 0) {
      return NextResponse.json(
        { error: "You've already submitted a request recently. Please wait before submitting another." },
        { status: 429 }
      );
    }

    // Calculate estimated range
    const sqft = body.square_footage ? Number(body.square_footage) : null;
    const costRange = COST_RANGES[project_type] || COST_RANGES.other;
    let estimated_min: number | null = null;
    let estimated_max: number | null = null;

    if (sqft && sqft > 0) {
      estimated_min = costRange.min * sqft;
      estimated_max = costRange.max * sqft;
    }

    const insertData = {
      client_name: body.client_name,
      client_email: body.client_email,
      client_phone: body.client_phone || null,
      project_type: body.project_type,
      description: body.description,
      address: body.address || null,
      city: body.city || null,
      state: body.state || "UT",
      zip: body.zip || null,
      square_footage: sqft,
      budget_range: body.budget_range || null,
      timeline: body.timeline || null,
      estimated_min,
      estimated_max,
      status: "new" as const,
    };

    const { data, error } = await supabase
      .from("estimates")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      {
        success: true,
        estimated_min: data.estimated_min,
        estimated_max: data.estimated_max,
        budget_range: data.budget_range,
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}
