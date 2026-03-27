import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { COST_RANGES } from "@/lib/types/database";
import Anthropic from "@anthropic-ai/sdk";

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

    // Extract new fields
    const {
      bedrooms,
      bathrooms,
      finish_level,
      flooring_preference,
      countertop_preference,
      cabinet_preference,
      city,
      state,
      budget_range,
      timeline,
    } = body;

    const insertData = {
      client_name: body.client_name,
      client_email: body.client_email,
      client_phone: body.client_phone || null,
      project_type: body.project_type,
      description: body.description,
      address: body.address || null,
      city: city || null,
      state: state || "UT",
      zip: body.zip || null,
      square_footage: sqft,
      budget_range: budget_range || null,
      timeline: timeline || null,
      estimated_min,
      estimated_max,
      bedrooms: bedrooms || null,
      bathrooms: bathrooms || null,
      finish_level: finish_level || null,
      flooring_preference: flooring_preference || null,
      countertop_preference: countertop_preference || null,
      cabinet_preference: cabinet_preference || null,
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

    const estimateRecord = data;

    // AI estimate generation
    let aiEstimateMin = estimated_min;
    let aiEstimateMax = estimated_max;
    let aiBreakdown = "";

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey) {
      try {
        // Pull real project data to ground the AI in Blake's actual costs
        const { data: realProjects } = await supabase
          .from("projects")
          .select("name, project_type, estimated_value, contract_value, sale_price, status, description")
          .in("status", ["completed", "in_progress", "waiting_on_payment"])
          .not("contract_value", "is", null)
          .order("created_at", { ascending: false })
          .limit(10);

        // Pull actual contractor payment totals per project for real cost data
        const { data: paymentTotals } = await supabase
          .from("contractor_payments")
          .select("project_id, amount, status");

        const costByProject: Record<string, number> = {};
        if (paymentTotals) {
          for (const p of paymentTotals) {
            costByProject[p.project_id] = (costByProject[p.project_id] || 0) + (p.amount || 0);
          }
        }

        let referenceData = "";
        if (realProjects && realProjects.length > 0) {
          referenceData = `\n\nREAL PROJECT DATA FROM THIS BUILDER (use these as primary reference for pricing):\n`;
          for (const p of realProjects) {
            const actualCost = costByProject[p.name] || p.contract_value || p.estimated_value;
            referenceData += `- ${p.name} (${p.project_type}): Build cost $${actualCost?.toLocaleString() || "unknown"}`;
            if (p.sale_price) referenceData += `, Sale price $${p.sale_price.toLocaleString()}`;
            if (p.description) referenceData += ` — ${p.description}`;
            referenceData += `\n`;
          }
          referenceData += `\nIMPORTANT: Base your estimates primarily on this builder's actual project costs above. These are REAL numbers from their business in Southern Utah. New home construction for this builder runs approximately $160-180/sq ft for standard finishes.\n`;
        }

        const client = new Anthropic({ apiKey });
        const response = await client.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1024,
          messages: [
            {
              role: "user",
              content: `You are a construction cost estimator for Jones Legacy Creations, a builder in Southern Utah (Hurricane, St. George area). Give a realistic cost estimate for this project.

Project Type: ${project_type}
Description: ${description}
Square Footage: ${sqft || "Not specified"}
Bedrooms: ${bedrooms || "N/A"}
Bathrooms: ${bathrooms || "N/A"}
Finish Level: ${finish_level || "Standard"}
Flooring: ${flooring_preference || "No preference"}
Countertops: ${countertop_preference || "No preference"}
Cabinets: ${cabinet_preference || "No preference"}
Budget Range: ${budget_range || "Not specified"}
Timeline: ${timeline || "Not specified"}
Location: ${city || "Southern Utah"}, ${state || "UT"}
${referenceData}
Return ONLY a JSON object:
{
  "min": 150000,
  "max": 200000,
  "breakdown": "A brief 3-5 line breakdown explaining the estimate. Include major cost categories and why the range exists. Keep it friendly and professional. Reference Southern Utah market conditions."
}

Be realistic based on this builder's actual costs. Do NOT underestimate. Construction costs in Southern Utah in 2026 are higher than national averages. For new homes, this builder's costs run $160-180+/sq ft depending on finish level.

Return ONLY valid JSON.`,
            },
          ],
        });

        const text = response.content
          .filter(
            (b): b is Anthropic.Messages.TextBlock => b.type === "text"
          )
          .map((b) => b.text)
          .join("");

        const parsed = JSON.parse(
          text
            .replace(/```json\n?/g, "")
            .replace(/```\n?/g, "")
            .trim()
        );
        aiEstimateMin = parsed.min;
        aiEstimateMax = parsed.max;
        aiBreakdown = parsed.breakdown || "";
      } catch (e) {
        console.error("AI estimate error:", e);
      }
    }

    // Update the estimate record with AI data
    await supabase
      .from("estimates")
      .update({
        ai_estimate_min: aiEstimateMin,
        ai_estimate_max: aiEstimateMax,
        ai_breakdown: aiBreakdown,
        estimated_min: aiEstimateMin,
        estimated_max: aiEstimateMax,
      })
      .eq("id", estimateRecord.id);

    return NextResponse.json(
      {
        success: true,
        estimated_min: aiEstimateMin ?? estimateRecord.estimated_min,
        estimated_max: aiEstimateMax ?? estimateRecord.estimated_max,
        budget_range: estimateRecord.budget_range,
        ai_estimate_min: aiEstimateMin,
        ai_estimate_max: aiEstimateMax,
        ai_breakdown: aiBreakdown,
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
