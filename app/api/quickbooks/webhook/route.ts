/**
 * POST /api/quickbooks/webhook
 *
 * Receives real-time event notifications from QuickBooks Online.
 * Verifies the intuit-signature HMAC-SHA256 header before processing.
 *
 * Events handled:
 *   BillPayment Delete/Void → ACH failure / reversal
 *     - Resets contractor_payment status back to "pending"
 *     - Removes bill_payment from entity map (allows retry)
 *     - Logs to activity_log
 *
 * Setup in QBO Developer Portal:
 *   1. Go to your app → Webhooks
 *   2. Set endpoint URL to https://yourdomain.com/api/quickbooks/webhook
 *   3. Subscribe to: BillPayment (Create, Update, Delete), Bill (Update)
 *   4. Copy the Verifier Token → QUICKBOOKS_WEBHOOK_VERIFIER_TOKEN in your env
 */

import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

const VERIFIER_TOKEN = process.env.QUICKBOOKS_WEBHOOK_VERIFIER_TOKEN;

// ─── Signature verification ───────────────────────────────────────────────────

function verifySignature(rawBody: string, signature: string): boolean {
  if (!VERIFIER_TOKEN) {
    // No token configured — log loudly and reject. Never skip in production.
    console.error(
      "[QBO Webhook] QUICKBOOKS_WEBHOOK_VERIFIER_TOKEN is not set. " +
      "All webhook requests will be rejected. Set this env var to enable webhooks."
    );
    return false;
  }
  const expected = createHmac("sha256", VERIFIER_TOKEN)
    .update(rawBody)
    .digest("base64");
  return expected === signature;
}

// ─── QBO payload types ────────────────────────────────────────────────────────

interface QBOWebhookEntity {
  name: string;       // "BillPayment" | "Bill" | "Vendor" | ...
  id: string;         // QBO entity Id
  operation: string;  // "Create" | "Update" | "Delete" | "Void" | "Merge"
  lastUpdated: string;
}

interface QBOEventNotification {
  realmId: string;
  dataChangeEvent: {
    entities: QBOWebhookEntity[];
  };
}

interface QBOWebhookPayload {
  eventNotifications: QBOEventNotification[];
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("intuit-signature") ?? "";

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: QBOWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // QBO expects a 200 response within a few seconds.
  // Process events inline — serverless functions handle this fine.
  const supabase = createAdminClient();

  for (const notification of payload.eventNotifications ?? []) {
    const { realmId, dataChangeEvent } = notification;
    const entities = dataChangeEvent?.entities ?? [];

    for (const entity of entities) {
      let processingError: string | null = null;

      try {
        if (
          entity.name === "BillPayment" &&
          (entity.operation === "Delete" || entity.operation === "Void")
        ) {
          await handleBillPaymentVoid(supabase, entity.id, realmId);
        }
        // Future: handle Bill updates, Vendor updates, etc.
      } catch (err) {
        processingError = err instanceof Error ? err.message : String(err);
        console.error(`[QBO Webhook] Failed to process ${entity.name} ${entity.id}:`, err);
      }

      // Log every event — success or failure — for the audit trail
      await supabase.from("qbo_webhook_events").insert({
        realm_id: realmId,
        entity_type: entity.name,
        entity_id: entity.id,
        operation: entity.operation,
        payload: entity,
        error: processingError,
      }).catch((e) => {
        console.error("[QBO Webhook] Failed to log event:", e);
      });
    }
  }

  return NextResponse.json({ received: true });
}

// ─── Event handlers ───────────────────────────────────────────────────────────

async function handleBillPaymentVoid(
  supabase: ReturnType<typeof createAdminClient>,
  qboPaymentId: string,
  realmId: string
) {
  // Find the local contractor_payment this QBO BillPayment maps to
  const { data: entityMap } = await supabase
    .from("quickbooks_entity_map")
    .select("local_id")
    .eq("entity_type", "bill_payment")
    .eq("qbo_id", qboPaymentId)
    .eq("realm_id", realmId)
    .maybeSingle();

  if (!entityMap) {
    // Not a payment we created — ignore silently
    return;
  }

  const contractorPaymentId = entityMap.local_id;

  // Fetch payment details for the activity log
  const { data: payment } = await supabase
    .from("contractor_payments")
    .select("id, project_id, contractor_name, amount")
    .eq("id", contractorPaymentId)
    .maybeSingle();

  if (!payment) return;

  // Reset to pending so Blake can retry
  await supabase
    .from("contractor_payments")
    .update({ status: "pending", paid_date: null })
    .eq("id", contractorPaymentId);

  // Remove from entity map so a new BillPayment can be created on retry
  await supabase
    .from("quickbooks_entity_map")
    .delete()
    .eq("entity_type", "bill_payment")
    .eq("qbo_id", qboPaymentId)
    .eq("realm_id", realmId);

  // Log it so Blake can see what happened in the project activity feed
  if (payment.project_id) {
    const amount = payment.amount
      ? `$${Number(payment.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
      : "Payment";
    await supabase.from("activity_log").insert({
      project_id: payment.project_id,
      action: "payment_failed",
      description: `${amount} to ${payment.contractor_name} was reversed in QuickBooks (ACH failure or void) — payment reset to pending`,
    });
  }
}
