/**
 * Conversion event firing helper — single function the forms call on
 * success. Fires both GA4 (`generate_lead` standard event) and the
 * Meta Pixel (`Lead` standard event) when each is loaded, so there's
 * no per-form duplication.
 *
 * Safe to call when neither pixel is loaded: the gtag / fbq globals
 * are checked before firing.
 *
 * GA4 `generate_lead` is one of the recommended standard events —
 * it shows up automatically in GA4's "Conversions" report once
 * marked as a conversion in the dashboard.
 *
 * Meta `Lead` is the standard event used for ad-side optimization
 * ("show ads to people most likely to convert as a Lead"). Including
 * value + currency makes the event compatible with ROAS reporting if
 * Blake ever attaches average-deal-value.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface LeadEventParams {
  /** Which form fired the event. Becomes the GA4 `lead_source` event
   *  parameter; visible in GA4's debug view and aggregable in
   *  Explore reports. */
  source: string;
  /** Optional: the leads.id we just inserted, so analytics events can
   *  be cross-referenced against the row in Supabase. */
  leadId?: string | null;
  /** Optional: an estimated value for ROAS calculations. For
   *  construction/real-estate this is huge (~$200K avg sale → 2%
   *  margin to Reece → $4K/lead), so even a rough value helps Meta's
   *  auction algorithm prioritize ad spend correctly. */
  value?: number;
  currency?: string;
}

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    fbq?: (...args: any[]) => void;
  }
}

/**
 * Fire a lead-conversion event to every analytics surface that's loaded.
 * Call from the form-success branch on the client (not the server).
 */
export function trackLead(params: LeadEventParams): void {
  if (typeof window === "undefined") return;

  const value = params.value ?? 0;
  const currency = params.currency ?? "USD";

  // GA4 — `generate_lead` is a recommended event:
  //   https://developers.google.com/analytics/devguides/collection/ga4/reference/events
  try {
    window.gtag?.("event", "generate_lead", {
      lead_source: params.source,
      lead_id: params.leadId ?? undefined,
      value,
      currency,
    });
  } catch (e) {
    // Don't break the form if analytics throws.
    console.warn("[trackLead] gtag failed:", e);
  }

  // Meta Pixel — `Lead` standard event:
  //   https://developers.facebook.com/docs/meta-pixel/reference#standard-events
  try {
    window.fbq?.("track", "Lead", {
      content_name: params.source,
      content_category: params.source,
      value,
      currency,
    });
  } catch (e) {
    console.warn("[trackLead] fbq failed:", e);
  }
}
