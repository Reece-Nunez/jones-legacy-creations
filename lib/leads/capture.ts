/**
 * Lead capture — single entry point used by every public form route
 * (contact, construction, real-estate, interior-design, and any future
 * lead-magnet endpoint).
 *
 * Why this lives in its own module:
 *   • All form routes need to dual-write (DB insert + Resend email).
 *     The DB insert MUST happen first — if Resend fails mid-send,
 *     we still have the lead.
 *   • All form routes need to capture UTM / referrer / user-agent
 *     from the request so we can attribute lead origin later
 *     ("which campaign drove this lead?").
 *   • Hands the inserted row's `id` back so the route can store it
 *     against the GA4 / Meta Pixel events for end-to-end attribution.
 *
 * Failure mode: if the Supabase insert fails (RLS misconfig, DB down,
 * etc.), captureLead logs and returns null. Callers should keep going
 * and still send the email — losing analytics is bad, losing the
 * customer email is worse. The opposite isn't true (Resend failure
 * with no DB row = total loss).
 */

import { createAdminClient } from "@/lib/supabase/admin";

export type LeadSource =
  | "contact"
  | "construction"
  | "real_estate"
  | "interior_design"
  | "newsletter"
  | "other";

export interface CaptureLeadInput {
  source: LeadSource;
  /** The request the form POSTed from. We pull UTM params (if the
   *  form forwarded them in headers/body), referrer, and user-agent
   *  off it for attribution. */
  request: Request;
  /** Common fields that almost every form has. Any combination is
   *  allowed — newsletter signup only fills `email`, full contact
   *  form fills everything. */
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
  subject?: string | null;
  message?: string | null;
  /** Original form payload. We store this verbatim so source-specific
   *  fields (project_type, square_footage, listing_id, etc.) are
   *  preserved without schema migrations. */
  rawPayload: Record<string, unknown>;
}

export interface CapturedLead {
  id: string;
}

function getHeader(request: Request, name: string): string | null {
  return request.headers.get(name);
}

/**
 * Best-effort client IP. Vercel / Cloudflare / generic proxies put it
 * in different headers; we check each. Returns null if none present
 * (local dev, direct connection) so the DB INET column doesn't choke.
 */
function getClientIp(request: Request): string | null {
  const candidates = [
    getHeader(request, "x-forwarded-for")?.split(",")[0]?.trim(),
    getHeader(request, "x-real-ip"),
    getHeader(request, "cf-connecting-ip"),
  ];
  for (const ip of candidates) {
    if (ip && ip.length > 0) return ip;
  }
  return null;
}

/**
 * Pull UTM params and referrer from either the request URL, the
 * Referer header, or the raw_payload (forms that explicitly forward
 * them — see /lib/leads/client.ts which reads them from window
 * sessionStorage). First non-empty value wins.
 */
function extractAttribution(
  request: Request,
  rawPayload: Record<string, unknown>,
) {
  const url = new URL(request.url);
  const payload = rawPayload as Record<string, string | undefined>;
  return {
    utm_source:
      (payload.utm_source as string) ||
      url.searchParams.get("utm_source") ||
      null,
    utm_medium:
      (payload.utm_medium as string) ||
      url.searchParams.get("utm_medium") ||
      null,
    utm_campaign:
      (payload.utm_campaign as string) ||
      url.searchParams.get("utm_campaign") ||
      null,
    referrer:
      (payload.referrer as string) ||
      getHeader(request, "referer") ||
      null,
  };
}

/**
 * Insert one lead. Returns the new id on success, null on failure
 * (logged). Callers MUST keep going on null — sending the Resend
 * email is more important than the analytics row.
 */
export async function captureLead(
  input: CaptureLeadInput,
): Promise<CapturedLead | null> {
  try {
    const supabase = createAdminClient();
    const attribution = extractAttribution(input.request, input.rawPayload);

    const { data, error } = await supabase
      .from("leads")
      .insert({
        source: input.source,
        full_name: input.fullName ?? null,
        email: input.email ?? null,
        phone: input.phone ?? null,
        subject: input.subject ?? null,
        message: input.message ?? null,
        raw_payload: input.rawPayload,
        utm_source: attribution.utm_source,
        utm_medium: attribution.utm_medium,
        utm_campaign: attribution.utm_campaign,
        referrer: attribution.referrer,
        user_agent: getHeader(input.request, "user-agent"),
        ip_address: getClientIp(input.request),
      })
      .select("id")
      .single();

    if (error) {
      console.error("[captureLead] DB insert failed:", {
        source: input.source,
        error: error.message,
      });
      return null;
    }
    return { id: data.id };
  } catch (e) {
    console.error("[captureLead] threw:", e);
    return null;
  }
}
