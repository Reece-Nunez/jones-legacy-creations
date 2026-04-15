/**
 * QuickBooks OAuth 2.0 helpers
 * Handles token exchange, refresh, and Supabase storage.
 */

import { createClient } from "@/lib/supabase/server";

const CLIENT_ID = process.env.QUICKBOOKS_CLIENT_ID!;
const CLIENT_SECRET = process.env.QUICKBOOKS_CLIENT_SECRET!;
const REDIRECT_URI = process.env.QUICKBOOKS_REDIRECT_URI!;

// Use sandbox for dev, production otherwise
const IS_SANDBOX = process.env.QUICKBOOKS_SANDBOX !== "false";

export const QBO_SCOPES = [
  "com.intuit.quickbooks.accounting",
  "openid",
  "profile",
  "email",
].join(" ");

export const QBO_BASE_URL = IS_SANDBOX
  ? "https://sandbox-quickbooks.api.intuit.com"
  : "https://quickbooks.api.intuit.com";

// ─── Intuit discovery document ───────────────────────────────────────────────
// Intuit best practice: fetch the latest OAuth 2.0 endpoints from the
// OpenID Connect discovery document rather than hardcoding them.
// Cached in-memory per serverless function instance (refetched on cold start).

const DISCOVERY_URL =
  "https://developer.api.intuit.com/.well-known/openid_configuration";

// Fallback values in case discovery fetch fails
const FALLBACK_AUTH_ENDPOINT = "https://appcenter.intuit.com/connect/oauth2";
const FALLBACK_TOKEN_ENDPOINT =
  "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";

interface DiscoveryDocument {
  authorization_endpoint: string;
  token_endpoint: string;
}

let discoveryCache: DiscoveryDocument | null = null;

async function getDiscovery(): Promise<DiscoveryDocument> {
  if (discoveryCache) return discoveryCache;

  try {
    const res = await fetch(DISCOVERY_URL, { next: { revalidate: 3600 } });
    if (!res.ok) throw new Error(`Discovery fetch failed: ${res.status}`);
    const doc = await res.json();
    discoveryCache = {
      authorization_endpoint: doc.authorization_endpoint,
      token_endpoint: doc.token_endpoint,
    };
    return discoveryCache;
  } catch (err) {
    console.warn("[QBO] Discovery document fetch failed, using fallback endpoints:", err);
    return {
      authorization_endpoint: FALLBACK_AUTH_ENDPOINT,
      token_endpoint: FALLBACK_TOKEN_ENDPOINT,
    };
  }
}

// ─── URL builders ────────────────────────────────────────────────────────────

export async function buildAuthUrl(state: string): Promise<string> {
  const { authorization_endpoint } = await getDiscovery();
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: "code",
    scope: QBO_SCOPES,
    redirect_uri: REDIRECT_URI,
    state,
  });
  return `${authorization_endpoint}?${params.toString()}`;
}

// ─── Token exchange ───────────────────────────────────────────────────────────

export interface QBOTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;          // seconds until access token expires
  x_refresh_token_expires_in: number; // seconds until refresh token expires
}

function basicAuth() {
  return Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");
}

export async function exchangeCode(
  code: string,
  realmId: string
): Promise<QBOTokens> {
  const { token_endpoint } = await getDiscovery();
  const res = await fetch(token_endpoint, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth()}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`QBO token exchange failed: ${err}`);
  }

  return res.json();
}

export async function refreshAccessToken(
  refreshToken: string
): Promise<QBOTokens> {
  const { token_endpoint } = await getDiscovery();
  const res = await fetch(token_endpoint, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth()}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`QBO token refresh failed: ${err}`);
  }

  return res.json();
}

// ─── Supabase token storage ───────────────────────────────────────────────────

export interface StoredTokens {
  access_token: string;
  refresh_token: string;
  realm_id: string;
  expires_at: string;
  refresh_token_expires_at: string;
}

export async function saveTokens(
  tokens: QBOTokens,
  realmId: string
): Promise<void> {
  const supabase = await createClient();
  const now = Date.now();

  const row = {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    realm_id: realmId,
    expires_at: new Date(now + tokens.expires_in * 1000).toISOString(),
    refresh_token_expires_at: new Date(
      now + tokens.x_refresh_token_expires_in * 1000
    ).toISOString(),
  };

  // Delete any existing row first (singleton pattern)
  await supabase.from("quickbooks_tokens").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  const { error } = await supabase.from("quickbooks_tokens").insert(row);
  if (error) throw new Error(`Failed to save QB tokens: ${error.message}`);
}

export async function getStoredTokens(): Promise<StoredTokens | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("quickbooks_tokens")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data as StoredTokens;
}

export async function clearTokens(): Promise<void> {
  const supabase = await createClient();
  await supabase.from("quickbooks_tokens").delete().neq("id", "00000000-0000-0000-0000-000000000000");
}

/**
 * Returns a valid access token, refreshing if it's within 5 minutes of expiry.
 * Throws if no tokens are stored or refresh token is expired.
 */
export async function getValidAccessToken(): Promise<{
  accessToken: string;
  realmId: string;
}> {
  const stored = await getStoredTokens();
  if (!stored) throw new Error("QuickBooks not connected");

  const expiresAt = new Date(stored.expires_at).getTime();
  const refreshExpiresAt = new Date(stored.refresh_token_expires_at).getTime();
  const now = Date.now();

  if (now >= refreshExpiresAt) {
    await clearTokens();
    throw new Error("QuickBooks refresh token expired — please reconnect");
  }

  // Refresh if access token expires within 5 minutes
  if (expiresAt - now < 5 * 60 * 1000) {
    const fresh = await refreshAccessToken(stored.refresh_token);
    await saveTokens(fresh, stored.realm_id);
    return { accessToken: fresh.access_token, realmId: stored.realm_id };
  }

  return { accessToken: stored.access_token, realmId: stored.realm_id };
}
