import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeAddress, normalizeText } from "./flag-compare";

/**
 * Jones Custom Homes' own details, so they are never proposed as a project's.
 *
 * The builder's name and office address appear on nearly every document that
 * passes through the system — as the bill-to block on a vendor invoice, the
 * applicant on a permit, the contractor on an agreement. Read literally, a
 * document "says" the address is 1786 South 920 West, Hurricane, and the party
 * is Jones Custom Homes. Accepting that replaces the job site with the office
 * and the homeowner with the builder, which is exactly what the first scan of
 * Chelsey Lot 27 proposed doing.
 *
 * The kind rules in document-kind.ts stop most of this by keeping invoices
 * away from project fields entirely. This is the backstop for the kinds that
 * legitimately do carry a site address — a permit, a contract, a set of plans
 * — where the builder's own address is on the page next to the site's and
 * either could be picked up.
 */

export type OwnIdentity = {
  /** Company and owner names that must never become a client name. */
  names: string[];
  /** Street addresses that must never become a project address. */
  addresses: string[];
  /** Cities, ZIPs, phones and emails belonging to the company. */
  values: string[];
};

export const EMPTY_IDENTITY: OwnIdentity = { names: [], addresses: [], values: [] };

/**
 * Names that identify the builder regardless of what the settings row says.
 * Kept as a floor so a blank or half-filled company_settings row doesn't
 * silently disable the protection.
 */
const ALWAYS_OURS = ["jones custom homes", "jones legacy creations", "blake jones"];

export async function loadOwnIdentity(supabase: SupabaseClient): Promise<OwnIdentity> {
  const names = [...ALWAYS_OURS];
  const addresses: string[] = [];
  const values: string[] = [];

  const { data } = await supabase
    .from("company_settings")
    .select("company_name, company_address, company_city, company_state, company_zip, company_phone, company_email")
    .limit(1)
    .maybeSingle();

  if (data) {
    push(names, data.company_name);
    push(addresses, data.company_address);
    // City, state and ZIP are weak signals on their own — Peach Springs is
    // genuinely in Hurricane, the same town as the office — so these are only
    // suppressed alongside a strong match. See isOwnSecondaryValue.
    push(values, data.company_city);
    push(values, data.company_zip);
    push(values, data.company_state);
    push(values, data.company_phone);
    push(values, data.company_email);
  }

  return { names, addresses, values };
}

function push(list: string[], value: unknown) {
  if (typeof value === "string" && value.trim()) list.push(value.trim().toLowerCase());
}

/**
 * Is this value one of ours?
 *
 * Matching is containment in both directions: a document may render the
 * company as "Jones Custom Homes LLC" or "JONES CUSTOM HOMES, INC." and a
 * bill-to line as "Jones Custom Homes — Attn: Blake", none of which equal the
 * stored name exactly.
 */
export function isOwnIdentity(
  identity: OwnIdentity,
  fieldColumn: string,
  suggested: string,
): boolean {
  const value = normalizeText(suggested);
  if (!value) return false;

  if (fieldColumn === "client_name" || fieldColumn === "name" || fieldColumn === "lender_name") {
    return identity.names.some((own) => {
      const ours = normalizeText(own);
      return ours.length > 0 && (value.includes(ours) || ours.includes(value));
    });
  }

  if (fieldColumn === "address") {
    const asAddress = normalizeAddress(suggested);
    return identity.addresses.some((own) => {
      const ours = normalizeAddress(own);
      return ours.length > 0 && (asAddress.includes(ours) || ours.includes(asAddress));
    });
  }

  if (fieldColumn === "client_email" || fieldColumn === "client_phone") {
    return identity.values.some((own) => normalizeText(own) === value);
  }

  return false;
}

/**
 * A value that is ours, but too weak to act on by itself.
 *
 * The office city and ZIP are only evidence of the bill-to block when they
 * turn up beside our street address or our company name — a project really can
 * be in the same town as the office. Callers pass these only once a strong
 * match has already been found on the same document.
 */
export function isOwnSecondaryValue(
  identity: OwnIdentity,
  fieldColumn: string,
  suggested: string,
): boolean {
  if (fieldColumn !== "city" && fieldColumn !== "state" && fieldColumn !== "zip") return false;
  const value = normalizeText(suggested);
  return value.length > 0 && identity.values.some((own) => normalizeText(own) === value);
}
