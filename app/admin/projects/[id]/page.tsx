import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isContractor } from "@/lib/roles";
import ProjectDetail from "@/components/admin/ProjectDetail";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Contractors get a read-only view of their project (upload + task status
  // stay enabled); staff get full edit controls. RLS enforces this server-side
  // regardless — readOnly just hides the staff-only affordances.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let readOnly = false;
  if (user) {
    const { data: me } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("auth_id", user.id)
      .maybeSingle();
    readOnly = !!me && isContractor(me.role);
  }

  const [
    { data: project },
    { data: payments },
    { data: permits },
    { data: documents },
    { data: tasks },
    { data: budgetLineItems },
    { data: drawRequests },
    { data: activityLog },
    { data: contractors },
    { data: miscCharges },
    { data: loanLedger },
    { data: settlements },
    { data: changeOrders },
    { data: selections },
    { data: bidRequests },
  ] = await Promise.all([
    supabase.from("projects").select("*").eq("id", id).single(),
    supabase
      .from("contractor_payments")
      .select("*")
      .eq("project_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("permits")
      .select("*")
      .eq("project_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("documents")
      .select("*")
      .eq("project_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("tasks")
      .select("*")
      .eq("project_id", id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("budget_line_items")
      .select("*")
      .eq("project_id", id),
    supabase
      .from("draw_requests")
      .select("*")
      .eq("project_id", id)
      .order("draw_number", { ascending: true }),
    supabase
      .from("activity_log")
      .select("*")
      .eq("project_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.from("contractors").select("*").order("name"),
    supabase
      .from("project_misc_charges")
      .select("*")
      .eq("project_id", id)
      .order("charge_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true }),
    supabase
      .from("loan_ledger")
      .select("*")
      .eq("project_id", id)
      .order("entry_date", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("project_settlements")
      .select("*")
      .eq("project_id", id)
      .order("settlement_date", { ascending: true }),
    supabase
      .from("change_orders")
      .select("*, document:documents(file_url, name)")
      .eq("project_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("selection_approvals")
      .select("*, document:documents(file_url, name)")
      .eq("project_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("bid_requests")
      .select("*, document:documents(file_url, name)")
      .eq("project_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (!project) {
    notFound();
  }

  return (
    <ProjectDetail
      readOnly={readOnly}
      project={project}
      payments={payments ?? []}
      permits={permits ?? []}
      documents={documents ?? []}
      tasks={tasks ?? []}
      budgetLineItems={[...(budgetLineItems ?? [])].sort((a, b) => a.line_number.localeCompare(b.line_number, undefined, { numeric: true }))}
      drawRequests={drawRequests ?? []}
      activityLog={activityLog ?? []}
      contractors={contractors ?? []}
      miscCharges={miscCharges ?? []}
      loanLedger={loanLedger ?? []}
      settlements={settlements ?? []}
      changeOrders={changeOrders ?? []}
      selections={selections ?? []}
      bidRequests={bidRequests ?? []}
    />
  );
}
