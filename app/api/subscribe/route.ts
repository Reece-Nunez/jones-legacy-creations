/**
 * POST /api/subscribe
 *
 * Single-opt-in newsletter signup. Same spam protection as the other
 * public forms. Idempotent on email — re-submitting an already-active
 * email returns success without inserting (or re-activates a
 * previously-unsubscribed row).
 *
 * Dual-writes to the leads table too with source='newsletter' so
 * footer signups show up in /admin/leads alongside the form-based
 * leads — Blake doesn't have to check two places.
 */

import { Resend } from "resend";
import { NextResponse } from "next/server";
import { checkSpamProtection } from "@/lib/spam-protection";
import { subscribeSubmissionSchema } from "@/lib/schemas/subscribe";
import { createAdminClient } from "@/lib/supabase/admin";
import { captureLead } from "@/lib/leads/capture";

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://www.joneslegacycreations.com";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parseResult = subscribeSubmissionSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.flatten() },
        { status: 400 },
      );
    }

    const { recaptchaToken, honeypot, ...data } = parseResult.data;
    const email = data.email.trim().toLowerCase();
    const source = data.source || "footer";

    const spamCheck = await checkSpamProtection({
      request,
      recaptchaToken,
      recaptchaAction: "subscribe",
      honeypotValue: honeypot,
      contentCheck: {
        // Subscribe form has no name/message, so just pass the email
        // as the name field for the basic-content check.
        name: email,
        message: email,
        minMessageWords: 1,
      },
    });

    if (!spamCheck.passed) {
      return NextResponse.json(
        { error: "Unable to process request" },
        { status: 429 },
      );
    }

    const supabase = createAdminClient();

    // Pull UTM / attribution off the request the same way captureLead
    // does, so dashboards can see "this subscriber came from a Facebook
    // ad" later.
    const url = new URL(request.url);
    const utm_source = url.searchParams.get("utm_source") || null;
    const utm_medium = url.searchParams.get("utm_medium") || null;
    const utm_campaign = url.searchParams.get("utm_campaign") || null;
    const referrer = request.headers.get("referer") || null;
    const user_agent = request.headers.get("user-agent") || null;
    const ip_address =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      null;

    // Upsert by lowered-email. If the row exists and was unsubscribed,
    // reactivate it. If it exists and is active, no-op (still return
    // success so the user never sees an error for "already subscribed").
    const { data: existing } = await supabase
      .from("email_subscribers")
      .select("id, status")
      .eq("email", email)
      .maybeSingle();

    let subscriberId: string | null = existing?.id ?? null;

    if (existing) {
      if (existing.status === "unsubscribed") {
        await supabase
          .from("email_subscribers")
          .update({
            status: "active",
            unsubscribed_at: null,
            updated_at: new Date().toISOString(),
            source,
          })
          .eq("id", existing.id);
      }
      // Active / pending — leave as-is, treat the resubmission as a
      // no-op success. Idempotent UX.
    } else {
      const { data: inserted, error } = await supabase
        .from("email_subscribers")
        .insert({
          email,
          status: "active",
          source,
          utm_source,
          utm_medium,
          utm_campaign,
          referrer,
          user_agent,
          ip_address,
        })
        .select("id")
        .single();

      if (error) {
        console.error("[subscribe] insert failed:", error);
        return NextResponse.json(
          { error: "Unable to subscribe right now" },
          { status: 500 },
        );
      }
      subscriberId = inserted.id;

      // Mirror into the leads table so newsletter signups appear in
      // /admin/leads. captureLead handles its own logging on failure
      // — don't block the user-facing response on it.
      await captureLead({
        source: "newsletter",
        request,
        email,
        rawPayload: { email, signupSource: source },
      });
    }

    // Confirmation email — best-effort. RESEND_API_KEY may be missing
    // in dev environments.
    if (process.env.RESEND_API_KEY && subscriberId) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const { data: subRow } = await supabase
        .from("email_subscribers")
        .select("unsubscribe_token")
        .eq("id", subscriberId)
        .single();
      const unsubscribeUrl = subRow
        ? `${BASE_URL}/api/unsubscribe?token=${subRow.unsubscribe_token}`
        : null;

      try {
        await resend.emails.send({
          from: "Jones Legacy Creations <noreply@joneslegacycreations.com>",
          to: email,
          subject: "You're on the list",
          html: `
            <p>Thanks for signing up. You'll hear from us when we have
               something worth sharing — new builds, market updates from
               Hurricane / St. George, and the occasional behind-the-scenes
               look at our projects.</p>
            <p>No spam, just the good stuff. Promise.</p>
            <p>— Jones Legacy Creations</p>
            ${
              unsubscribeUrl
                ? `<p style="margin-top:32px; font-size:12px; color:#888;">
                     Want out? <a href="${unsubscribeUrl}">Unsubscribe</a>
                   </p>`
                : ""
            }
          `,
        });
      } catch (e) {
        // Confirmation email failure shouldn't fail the signup. Log
        // and keep going.
        console.warn("[subscribe] confirmation email failed:", e);
      }
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[subscribe] threw:", e);
    return NextResponse.json(
      { error: "Unable to subscribe right now" },
      { status: 500 },
    );
  }
}
