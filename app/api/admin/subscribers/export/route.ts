/**
 * GET /api/admin/subscribers/export — CSV of subscribers.
 *
 * Filter via ?status=active|all|... and ?source=footer|... to mirror
 * the on-page filter. Returns a CSV with the fields most useful for
 * importing into an ESP (Mailchimp / Resend / ConvertKit): email,
 * status, source, joined date, plus utm_source/medium/campaign for
 * tag-based segmentation on the receiving end.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/requireAdmin";

function esc(v: string | null | undefined): string {
  const s = (v ?? "").toString();
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(request: NextRequest) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;
  const { supabase } = gate;

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const source = url.searchParams.get("source");

  let query = supabase
    .from("email_subscribers")
    .select(
      "email, status, source, utm_source, utm_medium, utm_campaign, created_at, unsubscribed_at",
    )
    .order("created_at", { ascending: false });

  if (status && status !== "all") query = query.eq("status", status);
  if (source) query = query.eq("source", source);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const lines = [
    [
      "email",
      "status",
      "source",
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "joined_at",
      "unsubscribed_at",
    ].join(","),
    ...(data ?? []).map((r) =>
      [
        esc(r.email),
        esc(r.status),
        esc(r.source),
        esc(r.utm_source),
        esc(r.utm_medium),
        esc(r.utm_campaign),
        esc(r.created_at),
        esc(r.unsubscribed_at),
      ].join(","),
    ),
  ];

  const today = new Date().toISOString().slice(0, 10);
  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="subscribers_${today}.csv"`,
    },
  });
}
