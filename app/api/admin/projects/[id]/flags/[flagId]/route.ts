import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/requireAdmin";
import { flagFieldFor } from "@/lib/documents/flag-fields";
import { parseNumber, parseDate } from "@/lib/documents/flag-compare";

/**
 * Accept or reject one flag.
 *
 * Accepting writes the document's value onto the record. The field is looked up
 * in the allow-list again here rather than trusted from the stored row: the
 * check that ran when the flag was created and the check that runs when it is
 * applied are the same check, so a row edited in the database between the two
 * still can't reach a column the feature was never meant to write.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; flagId: string }> }
) {
  const { id, flagId } = await params;
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;
  const { supabase, profile } = gate;

  const { action } = await request.json().catch(() => ({}));
  if (action !== "accept" && action !== "reject") {
    return NextResponse.json({ error: "action must be 'accept' or 'reject'" }, { status: 400 });
  }

  const { data: flag, error: readError } = await supabase
    .from("document_flags")
    .select("*")
    .eq("id", flagId)
    .eq("project_id", id)
    .single();

  if (readError || !flag) {
    return NextResponse.json({ error: "Flag not found" }, { status: 404 });
  }
  if (flag.status !== "open") {
    return NextResponse.json({ error: "This flag has already been reviewed" }, { status: 409 });
  }

  if (action === "accept") {
    const field = flagFieldFor(flag.target_table, flag.target_field);
    if (!field) {
      return NextResponse.json(
        { error: "This flag points at a field that can't be edited here." },
        { status: 400 },
      );
    }

    let value: string | number | null;
    if (field.type === "number") {
      value = parseNumber(flag.suggested_value);
    } else if (field.type === "date") {
      value = parseDate(flag.suggested_value);
    } else {
      value = flag.suggested_value;
    }
    if (value === null) {
      return NextResponse.json(
        { error: "The suggested value can't be stored in that field." },
        { status: 400 },
      );
    }

    // Scoped to the project on both tables, so accepting a flag can only ever
    // touch a record belonging to the project it was raised on.
    const { error: writeError } = await supabase
      .from(field.table)
      .update({ [field.column]: value })
      .eq("id", flag.target_id)
      .eq(field.table === "projects" ? "id" : "project_id", id);

    if (writeError) {
      return NextResponse.json({ error: writeError.message }, { status: 400 });
    }

    await supabase.from("activity_log").insert({
      project_id: id,
      action: "document_flag_accepted",
      description: `${field.label}: "${flag.current_value ?? "(blank)"}" → "${flag.suggested_value}" from a reviewed document`,
    });
  }

  const { data, error } = await supabase
    .from("document_flags")
    .update({
      status: action === "accept" ? "accepted" : "rejected",
      resolved_at: new Date().toISOString(),
      resolved_by: profile.id,
    })
    .eq("id", flagId)
    .eq("project_id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}
