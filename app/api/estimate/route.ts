import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { COST_RANGES, PROJECT_TYPE_OPTIONS } from "@/lib/types/database";
import { Resend } from "resend";
import { checkSpamProtection } from "@/lib/spam-protection";
import {
  generateEstimateWithAI,
  EstimateAIError,
  type EstimateInput,
} from "@/lib/ai/estimate-generator";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { client_name, client_email, project_type, description } = body;
    if (!client_name || !client_email || !project_type || !description) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: client_name, client_email, project_type, description",
        },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(client_email)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    // Spam protection: IP rate limit + content validation, plus optional
    // honeypot / reCAPTCHA if the client sent them. Matches the pattern
    // used by /api/contact and /api/construction.
    const spamCheck = await checkSpamProtection({
      request,
      recaptchaToken: body.recaptchaToken,
      recaptchaAction: "estimate_form",
      honeypotValue: body.honeypot,
      contentCheck: {
        name: client_name,
        message: description,
        minMessageWords: 3,
      },
    });

    if (!spamCheck.passed) {
      console.log("[estimate] spam check failed:", spamCheck.error);
      return NextResponse.json(
        { error: "Unable to process request" },
        { status: 429 }
      );
    }

    // Public form — service-role client bypasses RLS.
    const supabase = createAdminClient();

    // Second-layer rate limit: same email within the last hour gets bounced.
    // (IP rate limit above catches bursts; this catches resubmits across IPs.)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recentEstimates, error: recentLookupError } = await supabase
      .from("estimates")
      .select("id")
      .eq("client_email", client_email)
      .gte("created_at", oneHourAgo);

    if (recentLookupError) {
      console.error("[estimate] recent-estimate lookup failed:", recentLookupError);
    }

    if (recentEstimates && recentEstimates.length > 0) {
      return NextResponse.json(
        {
          error:
            "You've already submitted a request recently. Please wait before submitting another.",
        },
        { status: 429 }
      );
    }

    // Static fallback: $/sqft × sqft. Used both as the initial seed
    // (in case AI fails) and as a sanity-check rail by the AI generator.
    const sqft = body.square_footage ? Number(body.square_footage) : null;
    const costRange = COST_RANGES[project_type] || COST_RANGES.other;
    const fallbackMin = sqft && sqft > 0 ? costRange.min * sqft : null;
    const fallbackMax = sqft && sqft > 0 ? costRange.max * sqft : null;

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
      estimated_min: fallbackMin,
      estimated_max: fallbackMax,
      bedrooms: bedrooms || null,
      bathrooms: bathrooms || null,
      finish_level: finish_level || null,
      flooring_preference: flooring_preference || null,
      countertop_preference: countertop_preference || null,
      cabinet_preference: cabinet_preference || null,
      status: "new" as const,
    };

    const { data: estimateRecord, error } = await supabase
      .from("estimates")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // AI estimate. If anything goes wrong, record the error against the
    // row so Blake can see in /admin/estimates which rows fell back to
    // the static $/sqft multiplier — no more silent degradation.
    let aiEstimateMin: number | null = null;
    let aiEstimateMax: number | null = null;
    let aiBreakdown = "";
    let aiError: string | null = null;

    const aiInput: EstimateInput = {
      project_type,
      description,
      square_footage: sqft,
      bedrooms: bedrooms || null,
      bathrooms: bathrooms || null,
      finish_level: finish_level || null,
      flooring_preference: flooring_preference || null,
      countertop_preference: countertop_preference || null,
      cabinet_preference: cabinet_preference || null,
      budget_range: budget_range || null,
      timeline: timeline || null,
      city: city || null,
      state: state || null,
    };

    try {
      const ai = await generateEstimateWithAI(aiInput);
      aiEstimateMin = ai.min;
      aiEstimateMax = ai.max;
      aiBreakdown = ai.breakdown;
    } catch (e) {
      if (e instanceof EstimateAIError) {
        aiError = `[${e.stage}] ${e.message}`;
      } else {
        aiError = e instanceof Error ? e.message : "Unknown AI error";
      }
      console.error("[estimate] AI generation failed:", aiError);
    }

    // The number we ship to the client: AI estimate when it succeeded,
    // static $/sqft fallback otherwise.
    const finalMin = aiEstimateMin ?? fallbackMin;
    const finalMax = aiEstimateMax ?? fallbackMax;

    const { error: updateErr } = await supabase
      .from("estimates")
      .update({
        ai_estimate_min: aiEstimateMin,
        ai_estimate_max: aiEstimateMax,
        ai_breakdown: aiBreakdown,
        ai_error: aiError,
        estimated_min: finalMin,
        estimated_max: finalMax,
      })
      .eq("id", estimateRecord.id);

    if (updateErr) {
      // Don't fail the request — the user already has their estimate in-hand
      // via the response. But surface it: without this, /admin/estimates
      // shows the static fallback while the user saw AI numbers.
      console.error(
        `[estimate] failed to persist AI results to estimate ${estimateRecord.id}:`,
        updateErr
      );
    }

    // Admin notification email
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
                <tr><td style="padding:8px;color:#666;">Estimate</td><td style="padding:8px;font-weight:600;">${finalMin ? `$${finalMin.toLocaleString()} — $${finalMax?.toLocaleString()}` : "Pending"}${aiError ? ' <span style="color:#b45309;">(AI failed, using $/sqft fallback)</span>' : ""}</td></tr>
                <tr><td style="padding:8px;color:#666;">Phone</td><td style="padding:8px;">${body.client_phone || "Not provided"}</td></tr>
                <tr><td style="padding:8px;color:#666;">Email</td><td style="padding:8px;">${client_email}</td></tr>
              </table>
              <p style="margin-top:16px;color:#666;">${description}</p>
              ${aiError ? `<p style="margin-top:16px;padding:12px;background:#fef3c7;border-left:3px solid #b45309;color:#92400e;"><strong>AI fallback note:</strong> ${aiError}</p>` : ""}
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
        estimated_min: finalMin,
        estimated_max: finalMax,
        budget_range: estimateRecord.budget_range,
        ai_estimate_min: aiEstimateMin,
        ai_estimate_max: aiEstimateMax,
        ai_breakdown: aiBreakdown,
      },
      { status: 201 }
    );
  } catch (e) {
    console.error("[estimate] route error:", e);
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}
