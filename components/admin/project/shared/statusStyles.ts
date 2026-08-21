import type { DrawRequestStatus } from "@/lib/types/database";

/**
 * Status accent colours for draw and payment rows.
 *
 * NOTE: these emit `border-l-*` colour stripes. That's a pattern worth
 * revisiting — a coloured side-stripe is decorative rather than semantic, and
 * the status is already stated in words by the badge beside it. Left as-is
 * during the file split so the visual result is unchanged; changing status
 * affordances belongs in its own pass.
 */

export function drawLeftBorder(status: DrawRequestStatus): string {
  switch (status) {
    case "funded": return "border-l-green-500";
    case "denied": return "border-l-red-500";
    case "approved": return "border-l-blue-500";
    case "submitted": return "border-l-yellow-500";
    default: return "border-l-gray-300";
  }
}

export function paymentLeftBorder(status: string): string {
  if (status === "reimbursed" || status === "paid_from_draw") return "border-l-green-500";
  if (status === "paid_personal") return "border-l-indigo-400";
  return "border-l-yellow-500";
}
