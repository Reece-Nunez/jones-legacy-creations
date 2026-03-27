import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("contractor_payments")
    .select("*")
    .eq("project_id", id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const contentType = request.headers.get("content-type") || "";

  let contractor_id: string | null = null;
  let contractor_name: string;
  let description: string;
  let amount: number;
  let due_date: string | null = null;
  let invoice_file_url: string | null = null;
  let invoice_file_name: string | null = null;

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    contractor_id = (formData.get("contractor_id") as string) || null;
    contractor_name = formData.get("contractor_name") as string;
    description = (formData.get("description") as string) || "";
    amount = parseFloat(formData.get("amount") as string);
    due_date = (formData.get("due_date") as string) || null;

    const file = formData.get("invoice_file") as File | null;
    if (file && file.size > 0) {
      const fileName = `payments/${id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("project-documents")
        .upload(fileName, file, { contentType: file.type });

      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from("project-documents")
          .getPublicUrl(fileName);
        invoice_file_url = urlData.publicUrl;
        invoice_file_name = file.name;
      }
    }
  } else {
    const body = await request.json();
    contractor_id = body.contractor_id || null;
    contractor_name = body.contractor_name;
    description = body.description || "";
    amount = body.amount;
    due_date = body.due_date || null;
  }

  if (contractor_id === "" || contractor_id === "other") contractor_id = null;

  const { data, error } = await supabase
    .from("contractor_payments")
    .insert({
      project_id: id,
      contractor_id,
      contractor_name,
      description,
      amount,
      due_date: due_date || null,
      invoice_file_url,
      invoice_file_name,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data, { status: 201 });
}
