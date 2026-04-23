import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractReceiptData } from "@/lib/extract-receipt";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; paymentId: string }> },
) {
  const { id, paymentId } = await params;
  const supabase = await createClient();

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "File is required" }, { status: 400 });
  }

  const { data: payment, error: fetchErr } = await supabase
    .from("contractor_payments")
    .select("id, amount")
    .eq("id", paymentId)
    .eq("project_id", id)
    .single();

  if (fetchErr || !payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  const storagePath = `${id}/receipts/${Date.now()}-${file.name}`;
  const { error: uploadError } = await supabase.storage
    .from("project-documents")
    .upload(storagePath, file, { contentType: file.type });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: urlData } = supabase.storage
    .from("project-documents")
    .getPublicUrl(storagePath);
  const fileUrl = urlData.publicUrl;

  const buffer = await file.arrayBuffer();
  const ai = await extractReceiptData(buffer, file.type, file.name);

  const amountMismatch =
    ai.amount != null && Math.abs(ai.amount - Number(payment.amount)) > 0.01;

  const nowIso = new Date().toISOString();
  const paidDate = ai.payment_date || nowIso.split("T")[0];

  const { data: updated, error: updateErr } = await supabase
    .from("contractor_payments")
    .update({
      receipt_file_url: fileUrl,
      receipt_file_name: file.name,
      receipt_uploaded_at: nowIso,
      payment_method: ai.payment_method,
      paid_from_draw_date: paidDate,
      status: "paid_from_draw",
    })
    .eq("id", paymentId)
    .eq("project_id", id)
    .select()
    .single();

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({
    payment: updated,
    ai_extracted: ai,
    amount_mismatch: amountMismatch,
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; paymentId: string }> },
) {
  const { id, paymentId } = await params;
  const supabase = await createClient();

  const { error } = await supabase
    .from("contractor_payments")
    .update({
      receipt_file_url: null,
      receipt_file_name: null,
      receipt_uploaded_at: null,
      payment_method: null,
    })
    .eq("id", paymentId)
    .eq("project_id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
