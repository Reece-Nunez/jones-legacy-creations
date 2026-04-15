import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [paymentsResult, webhookResult] = await Promise.all([
    supabase
      .from("contractor_payments")
      .select("id, contractor_name, amount, qbo_sync_error, project_id")
      .not("qbo_sync_error", "is", null),
    supabase
      .from("qbo_webhook_events")
      .select("id, entity_type, entity_id, operation, error, processed_at")
      .not("error", "is", null)
      .order("processed_at", { ascending: false })
      .limit(10),
  ]);

  const failedPayments = paymentsResult.data ?? [];
  const recentWebhookErrors = webhookResult.data ?? [];

  return NextResponse.json({
    failedPayments: {
      count: failedPayments.length,
      items: failedPayments,
    },
    recentWebhookErrors,
  });
}
