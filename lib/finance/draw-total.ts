import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Recompute a draw request's amount from the payments behind its documents.
 *
 * A draw's total is derived, never typed in by hand: it's the sum of the
 * contractor payments whose invoice file is filed under that draw. Uploading a
 * document to a draw, assigning an existing one, and removing one all have to
 * agree on that sum, so the query lives here instead of being copied into each
 * route that moves a document.
 */
export async function recalcDrawTotal(
  supabase: SupabaseClient,
  projectId: string,
  drawId: string,
): Promise<number> {
  const { data: docs } = await supabase
    .from("documents")
    .select("file_url")
    .eq("draw_request_id", drawId);

  const fileUrls = (docs ?? [])
    .map((d: { file_url: string | null }) => d.file_url)
    .filter((url: string | null): url is string => Boolean(url));

  let total = 0;
  if (fileUrls.length > 0) {
    const { data: drawPayments } = await supabase
      .from("contractor_payments")
      .select("amount")
      .eq("project_id", projectId)
      .in("invoice_file_url", fileUrls);

    total = (drawPayments ?? []).reduce(
      (sum: number, p: { amount: number | null }) => sum + (p.amount || 0),
      0,
    );
  }

  await supabase.from("draw_requests").update({ amount: total }).eq("id", drawId);

  return total;
}
