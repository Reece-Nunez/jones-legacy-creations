import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { COST_RANGES, PROJECT_TYPE_OPTIONS } from "@/lib/types/database";
import Anthropic from "@anthropic-ai/sdk";
import { Resend } from "resend";

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
          referenceData = `\n\nREAL SALE PRICES FROM THIS BUILDER (use these as primary reference):\n`;
          for (const p of realProjects) {
            referenceData += `- ${p.name} (${p.project_type})`;
            if (p.sale_price) referenceData += `: Sold for $${p.sale_price.toLocaleString()}`;
            else if (p.contract_value) referenceData += `: Contract value $${p.contract_value.toLocaleString()}`;
            else if (p.estimated_value) referenceData += `: Estimated at $${p.estimated_value.toLocaleString()}`;
            if (p.description) referenceData += ` — ${p.description}`;
            referenceData += `\n`;
          }
          referenceData += `\nIMPORTANT: The estimate you provide is what the CLIENT would pay — the sale price, NOT the builder's internal cost. This builder's new homes in Southern Utah sell for $200-220+/sq ft. A 2,500 sq ft home sells for around $500,000-$550,000+. Base your estimates on these real sale prices.\n`;
        }

        const client = new Anthropic({ apiKey });
        const response = await client.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1024,
          messages: [
            {
              role: "user",
              content: `You are providing a project cost estimate for a potential client of Jones Legacy Creations, a custom home builder in Southern Utah (Hurricane, St. George area).

IMPORTANT: You are estimating what the CLIENT will pay for the project — this is the SALE PRICE, not the builder's internal cost. This includes the builder's materials, labor, overhead, and profit margin.

Project Details:
- Type: ${project_type}
- Description: ${description}
- Square Footage: ${sqft || "Not specified"}
- Bedrooms: ${bedrooms || "N/A"}
- Bathrooms: ${bathrooms || "N/A"}
- Finish Level: ${finish_level || "Standard"}
- Flooring: ${flooring_preference || "No preference"}
- Countertops: ${countertop_preference || "No preference"}
- Cabinets: ${cabinet_preference || "No preference"}
- Client's Budget: ${budget_range || "Not specified"}
- Timeline: ${timeline || "Not specified"}
- Location: ${city || "Southern Utah"}, ${state || "UT"}
${referenceData}
Return ONLY a JSON object:
{
  "min": 500000,
  "max": 575000,
  "breakdown": "A brief 3-5 line breakdown explaining the estimate to the client. Be friendly and professional. Mention what drives the price range (finish level, materials, site conditions). Reference Southern Utah market if relevant. Don't mention builder costs or margins — this is what the client pays."
}

Southern Utah new home construction in 2026 sells at $200-250+/sq ft depending on finish level and features. Renovations and remodels are typically $150-300/sq ft. Do NOT lowball — these are premium custom builds, not tract homes.

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

    // Send admin notification email
    if (process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const notifyEmails = (process.env.ADMIN_ALLOWED_EMAILS || "")
          .split(",")
          .map((e) => e.trim())
          .filter(Boolean);
        if (notifyEmails.length > 0) {
          const projectLabel =
            PROJECT_TYPE_OPTIONS.find((o) => o.value === project_type)?.label ||
            project_type;
          await resend.emails.send({
            from: "Jones Legacy Creations <noreply@joneslegacycreations.com>",
            to: notifyEmails,
            subject: `New Estimate Request from ${client_name}`,
            html: `
              <h2>New Estimate Request</h2>
              <p><strong>${client_name}</strong> submitted an estimate request.</p>
              <table style="border-collapse:collapse;width:100%;max-width:500px;">
                <tr><td style="padding:8px;color:#666;">Project Type</td><td style="padding:8px;font-weight:600;">${projectLabel}</td></tr>
                <tr><td style="padding:8px;color:#666;">Location</td><td style="padding:8px;">${city || "Southern Utah"}, ${state || "UT"}</td></tr>
                ${sqft ? `<tr><td style="padding:8px;color:#666;">Square Footage</td><td style="padding:8px;">${sqft.toLocaleString()} sq ft</td></tr>` : ""}
                ${bedrooms ? `<tr><td style="padding:8px;color:#666;">Bedrooms</td><td style="padding:8px;">${bedrooms}</td></tr>` : ""}
                ${bathrooms ? `<tr><td style="padding:8px;color:#666;">Bathrooms</td><td style="padding:8px;">${bathrooms}</td></tr>` : ""}
                ${finish_level ? `<tr><td style="padding:8px;color:#666;">Finish Level</td><td style="padding:8px;">${finish_level}</td></tr>` : ""}
                <tr><td style="padding:8px;color:#666;">AI Estimate</td><td style="padding:8px;font-weight:600;">${aiEstimateMin ? `$${aiEstimateMin.toLocaleString()} — $${aiEstimateMax?.toLocaleString()}` : "Pending"}</td></tr>
                <tr><td style="padding:8px;color:#666;">Phone</td><td style="padding:8px;">${body.client_phone || "Not provided"}</td></tr>
                <tr><td style="padding:8px;color:#666;">Email</td><td style="padding:8px;">${client_email}</td></tr>
              </table>
              <p style="margin-top:16px;color:#666;">${description}</p>
              <p style="margin-top:24px;">
                <a href="https://www.joneslegacycreations.com/admin/estimates" style="background:#0369A1;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">View in Admin</a>
              </p>
            `,
          });
        }
      } catch (emailErr) {
        console.error("Failed to send notification email:", emailErr);
      }
    }

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
