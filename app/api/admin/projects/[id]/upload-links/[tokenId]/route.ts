import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; tokenId: string }> }
) {
  const { id, tokenId } = await params;
  const supabase = await createClient();

  const { error } = await supabase
    .from("invoice_upload_tokens")
    .update({ active: false })
    .eq("id", tokenId)
    .eq("project_id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
