import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ProjectStatus } from "@/lib/types/database";

export async function GET() {
  const supabase = await createClient();

  const [projectsRes, invoicesRes, paymentsRes, tasksRes] = await Promise.all([
    supabase.from("projects").select("*").order("updated_at", { ascending: false }),
    supabase.from("invoices").select("id, project_id, amount, status"),
    supabase.from("contractor_payments").select("id, project_id, amount, status"),
    supabase.from("tasks").select("id, project_id, completed"),
  ]);

  if (projectsRes.error) {
    return NextResponse.json({ error: projectsRes.error.message }, { status: 500 });
  }

  const projects = projectsRes.data || [];
  const invoices = invoicesRes.data || [];
  const payments = paymentsRes.data || [];
  const tasks = tasksRes.data || [];

  // Calculate per-project counts
  const projectsWithCounts = projects.map((project) => {
    const projectInvoices = invoices.filter((i) => i.project_id === project.id);
    const projectPayments = payments.filter((p) => p.project_id === project.id);
    const projectTasks = tasks.filter((t) => t.project_id === project.id);

    return {
      ...project,
      unpaid_invoices_count: projectInvoices.filter((i) => i.status !== "paid").length,
      unpaid_invoices_total: projectInvoices
        .filter((i) => i.status !== "paid")
        .reduce((sum, i) => sum + i.amount, 0),
      pending_payments_count: projectPayments.filter((p) => p.status === "pending").length,
      pending_tasks_count: projectTasks.filter((t) => !t.completed).length,
      total_tasks_count: projectTasks.length,
    };
  });

  // Totals
  const totalUnpaidInvoices = invoices
    .filter((i) => i.status !== "paid")
    .reduce((sum, i) => sum + i.amount, 0);

  const totalPendingPayments = payments
    .filter((p) => p.status === "pending")
    .reduce((sum, p) => sum + p.amount, 0);

  // Status counts
  const statusCounts = projects.reduce(
    (acc, p) => {
      acc[p.status as ProjectStatus] = (acc[p.status as ProjectStatus] || 0) + 1;
      return acc;
    },
    {} as Record<ProjectStatus, number>
  );

  return NextResponse.json({
    projects: projectsWithCounts,
    total_unpaid_invoices: totalUnpaidInvoices,
    total_pending_payments: totalPendingPayments,
    status_counts: statusCounts,
  });
}
