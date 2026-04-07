import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Simple in-memory rate limit map: token -> last submit timestamp
const recentSubmissions = new Map<string, number>();

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const token = formData.get("token") as string | null;
  const file = formData.get("file") as File | null;
  const amountStr = formData.get("amount") as string | null;
  const description = formData.get("description") as string | null;
  const referenceNumber = formData.get("reference_number") as string | null;
  const w9File = formData.get("w9_file") as File | null;

  if (!token) {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }

  if (!file || file.size === 0) {
    return NextResponse.json({ error: "File is required" }, { status: 400 });
  }

  // Rate limit: prevent double-tap (same token within 60 seconds)
  const now = Date.now();
  const lastSubmit = recentSubmissions.get(token);
  if (lastSubmit && now - lastSubmit < 60_000) {
    return NextResponse.json(
      { error: "Please wait before submitting again." },
      { status: 429 }
    );
  }

  // Validate token
  const { data: tokenRecord, error: tokenError } = await supabase
    .from("invoice_upload_tokens")
    .select("*")
    .eq("token", token)
    .eq("active", true)
    .single();

  if (tokenError || !tokenRecord) {
    return NextResponse.json(
      { error: "Invalid or expired upload link." },
      { status: 403 }
    );
  }

  // Upload file to Supabase storage
  const filePath = `payments/${tokenRecord.project_id}/${Date.now()}-${file.name}`;
  const { error: uploadError } = await supabase.storage
    .from("project-documents")
    .upload(filePath, file, { contentType: file.type });

  if (uploadError) {
    return NextResponse.json(
      { error: "Failed to upload file. Please try again." },
      { status: 500 }
    );
  }

  const { data: urlData } = supabase.storage
    .from("project-documents")
    .getPublicUrl(filePath);

  const amount = amountStr ? parseFloat(amountStr) : 0;

  // Build description with reference number if provided
  let fullDescription = description || "Invoice uploaded by contractor";
  if (referenceNumber) {
    fullDescription = `[Ref: ${referenceNumber}] ${fullDescription}`;
  }

  // Insert contractor payment
  const { data: payment, error: paymentError } = await supabase
    .from("contractor_payments")
    .insert({
      project_id: tokenRecord.project_id,
      contractor_id: tokenRecord.contractor_id,
      contractor_name: tokenRecord.contractor_name,
      description: fullDescription,
      amount: isNaN(amount) ? 0 : amount,
      status: "pending",
      invoice_file_url: urlData.publicUrl,
      invoice_file_name: file.name,
    })
    .select()
    .single();

  if (paymentError) {
    return NextResponse.json(
      { error: "Failed to save invoice record." },
      { status: 500 }
    );
  }

  // Upload W9 if provided and contractor exists
  if (w9File && w9File.size > 0 && tokenRecord.contractor_id) {
    const w9Path = `w9s/${tokenRecord.contractor_id}/${Date.now()}-${w9File.name}`;
    const { error: w9UploadError } = await supabase.storage
      .from("project-documents")
      .upload(w9Path, w9File, { contentType: w9File.type });

    if (!w9UploadError) {
      const { data: w9UrlData } = supabase.storage
        .from("project-documents")
        .getPublicUrl(w9Path);

      await supabase
        .from("contractors")
        .update({ w9_file_url: w9UrlData.publicUrl, w9_file_name: w9File.name })
        .eq("id", tokenRecord.contractor_id);
    }
  }

  // Log activity
  await supabase.from("activity_log").insert({
    project_id: tokenRecord.project_id,
    action: "invoice_uploaded",
    description: `Contractor ${tokenRecord.contractor_name} uploaded an invoice`,
  });

  // Mark rate limit
  recentSubmissions.set(token, Date.now());

  // Clean up old entries periodically (prevent memory leak)
  if (recentSubmissions.size > 1000) {
    const cutoff = Date.now() - 120_000;
    for (const [k, v] of recentSubmissions) {
      if (v < cutoff) recentSubmissions.delete(k);
    }
  }

  return NextResponse.json(payment, { status: 201 });
}
