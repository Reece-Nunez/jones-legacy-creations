import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  type ProjectStatus,
  type Project,
  type Invoice,
  type ContractorPayment,
  type DrawRequest,
  type Permit,
  type Task,
  type Estimate,
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_COLORS,
} from "@/lib/types/database";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  FileText,
  FolderKanban,
  Inbox,
  ReceiptText,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";

// ── Helpers ─────────────────────────────────────────────────

const fmt = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

const fmtFull = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);

function daysBetween(dateStr: string, now: Date): number {
  const d = new Date(dateStr);
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function daysUntil(dateStr: string, now: Date): number {
  const d = new Date(dateStr);
  return Math.floor((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function endOfWeek(now: Date): Date {
  const end = new Date(now);
  const day = end.getDay();
  const diff = day === 0 ? 0 : 7 - day;
  end.setDate(end.getDate() + diff);
  end.setHours(23, 59, 59, 999);
  return end;
}

// ── Types for action items ──────────────────────────────────

type ActionPriority = "red" | "orange" | "yellow" | "blue";

interface ActionItem {
  id: string;
  priority: ActionPriority;
  label: string;
  sublabel: string;
  detail: string;
  href: string;
  quickAction?: { label: string; href: string };
}

const PRIORITY_BORDER: Record<ActionPriority, string> = {
  red: "border-l-red-500",
  orange: "border-l-orange-500",
  yellow: "border-l-yellow-400",
  blue: "border-l-blue-400",
};

const PRIORITY_DOT: Record<ActionPriority, string> = {
  red: "bg-red-500",
  orange: "bg-orange-500",
  yellow: "bg-yellow-400",
  blue: "bg-blue-400",
};

// ── Main Component ──────────────────────────────────────────

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: statusFilter } = await searchParams;
  const supabase = await createClient();
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const weekEnd = endOfWeek(now);
  const weekEndStr = weekEnd.toISOString().split("T")[0];
  const sevenDaysOut = new Date(now);
  sevenDaysOut.setDate(sevenDaysOut.getDate() + 7);
  const sevenDaysOutStr = sevenDaysOut.toISOString().split("T")[0];

  // Month boundaries for cash flow
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .split("T")[0];

  // ── Fetch all data in parallel ────────────────────────────
  const [
    projectsRes,
    invoicesRes,
    paymentsRes,
    permitsRes,
    tasksRes,
    drawsRes,
    estimatesRes,
  ] = await Promise.all([
    supabase
      .from("projects")
      .select("*")
      .order("updated_at", { ascending: false }),
    supabase.from("invoices").select("*"),
    supabase.from("contractor_payments").select("*"),
    supabase.from("permits").select("*"),
    supabase.from("tasks").select("*"),
    supabase.from("draw_requests").select("*"),
    supabase
      .from("estimates")
      .select("*")
      .in("status", ["new", "reviewed"])
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const projects: Project[] = projectsRes.data ?? [];
  const invoices: Invoice[] = invoicesRes.data ?? [];
  const payments: ContractorPayment[] = paymentsRes.data ?? [];
  const permits: Permit[] = permitsRes.data ?? [];
  const tasks: Task[] = tasksRes.data ?? [];
  const draws: DrawRequest[] = drawsRes.data ?? [];
  const estimates: Estimate[] = estimatesRes.data ?? [];

  // ── Project lookup map ────────────────────────────────────
  const projectMap = new Map<string, Project>();
  for (const p of projects) projectMap.set(p.id, p);
  const projectName = (id: string) => projectMap.get(id)?.name ?? "Unknown";

  // ── Quick stats ───────────────────────────────────────────
  const activeProjects = projects.filter(
    (p) => p.status !== "archived" && p.status !== "completed"
  );

  // Tasks due this week
  const tasksDueThisWeek = tasks.filter(
    (t) => !t.completed && t.due_date && t.due_date <= weekEndStr && t.due_date >= today
  );

  // Overdue items (invoices + tasks)
  const overdueInvoices = invoices.filter(
    (i) =>
      i.status === "overdue" ||
      (i.status !== "paid" && i.due_date && i.due_date < today)
  );
  const overdueTasks = tasks.filter(
    (t) => !t.completed && t.due_date && t.due_date < today
  );
  const overdueCount = overdueInvoices.length + overdueTasks.length;

  // Cash flow this month
  const paidThisMonth = invoices
    .filter((i) => i.status === "paid" && i.paid_date && i.paid_date >= monthStart && i.paid_date <= monthEnd)
    .reduce((s, i) => s + (i.amount || 0), 0);
  const spentThisMonth = payments
    .filter((p) => p.status === "paid" && p.paid_date && p.paid_date >= monthStart && p.paid_date <= monthEnd)
    .reduce((s, p) => s + (p.amount || 0), 0);
  const cashFlow = paidThisMonth - spentThisMonth;

  // ── Build Action Items ────────────────────────────────────
  const actionItems: ActionItem[] = [];

  // Overdue invoices
  for (const inv of overdueInvoices) {
    const proj = projectMap.get(inv.project_id);
    const daysOver = inv.due_date ? daysBetween(inv.due_date, now) : 0;
    actionItems.push({
      id: `inv-${inv.id}`,
      priority: "red",
      label: `Invoice #${inv.invoice_number} overdue`,
      sublabel: proj?.client_name ?? "Unknown client",
      detail: `${fmtFull(inv.amount)} — ${daysOver} day${daysOver !== 1 ? "s" : ""} overdue`,
      href: `/admin/projects/${inv.project_id}`,
    });
  }

  // Contractor payments due within 7 days
  const upcomingPayments = payments.filter(
    (p) => p.status === "pending" && p.due_date && p.due_date <= sevenDaysOutStr && p.due_date >= today
  );
  for (const pay of upcomingPayments) {
    const days = daysUntil(pay.due_date!, now);
    actionItems.push({
      id: `pay-${pay.id}`,
      priority: days <= 2 ? "orange" : "yellow",
      label: `Payment to ${pay.contractor_name}`,
      sublabel: projectName(pay.project_id),
      detail: `${fmtFull(pay.amount)} — due ${days === 0 ? "today" : `in ${days} day${days !== 1 ? "s" : ""}`}`,
      href: `/admin/projects/${pay.project_id}`,
    });
  }

  // Overdue contractor payments
  const overduePayments = payments.filter(
    (p) => p.status === "pending" && p.due_date && p.due_date < today
  );
  for (const pay of overduePayments) {
    const daysOver = daysBetween(pay.due_date!, now);
    actionItems.push({
      id: `pay-over-${pay.id}`,
      priority: "red",
      label: `Overdue payment to ${pay.contractor_name}`,
      sublabel: projectName(pay.project_id),
      detail: `${fmtFull(pay.amount)} — ${daysOver} day${daysOver !== 1 ? "s" : ""} overdue`,
      href: `/admin/projects/${pay.project_id}`,
    });
  }

  // Tasks due this week
  for (const task of tasksDueThisWeek) {
    const days = daysUntil(task.due_date!, now);
    actionItems.push({
      id: `task-${task.id}`,
      priority: days <= 1 ? "orange" : "yellow",
      label: task.title,
      sublabel: projectName(task.project_id),
      detail: days === 0 ? "Due today" : days === 1 ? "Due tomorrow" : `Due in ${days} days`,
      href: `/admin/projects/${task.project_id}`,
    });
  }

  // Overdue tasks
  for (const task of overdueTasks) {
    const daysOver = daysBetween(task.due_date!, now);
    actionItems.push({
      id: `task-over-${task.id}`,
      priority: "red",
      label: task.title,
      sublabel: projectName(task.project_id),
      detail: `${daysOver} day${daysOver !== 1 ? "s" : ""} overdue`,
      href: `/admin/projects/${task.project_id}`,
    });
  }

  // Permits pending (applied)
  const pendingPermits = permits.filter((p) => p.status === "applied");
  for (const permit of pendingPermits) {
    const daysWaiting = permit.applied_date
      ? daysBetween(permit.applied_date, now)
      : 0;
    actionItems.push({
      id: `permit-${permit.id}`,
      priority: daysWaiting > 30 ? "orange" : "yellow",
      label: `Permit: ${permit.permit_type}`,
      sublabel: projectName(permit.project_id),
      detail: `Waiting ${daysWaiting} day${daysWaiting !== 1 ? "s" : ""}`,
      href: `/admin/projects/${permit.project_id}`,
    });
  }

  // Draw requests needing action
  const actionableDraws = draws.filter(
    (d) => d.status === "draft" || d.status === "submitted"
  );
  for (const draw of actionableDraws) {
    actionItems.push({
      id: `draw-${draw.id}`,
      priority: draw.status === "submitted" ? "blue" : "yellow",
      label: `Draw #${draw.draw_number} — ${draw.status === "draft" ? "needs submission" : "submitted, awaiting approval"}`,
      sublabel: projectName(draw.project_id),
      detail: fmtFull(draw.amount),
      href: `/admin/projects/${draw.project_id}`,
    });
  }

  // Sort: red first, then orange, yellow, blue
  const priorityOrder: Record<ActionPriority, number> = {
    red: 0,
    orange: 1,
    yellow: 2,
    blue: 3,
  };
  actionItems.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  // ── Financial snapshot ────────────────────────────────────
  const unpaidInvoices = invoices.filter((i) => i.status !== "paid");
  const unpaidTotal = unpaidInvoices.reduce((s, i) => s + (i.amount || 0), 0);

  const pendingPaymentsAll = payments.filter((p) => p.status === "pending");
  const pendingPaymentsTotal = pendingPaymentsAll.reduce(
    (s, p) => s + (p.amount || 0),
    0
  );

  const pendingDrawsTotal = actionableDraws.reduce(
    (s, d) => s + (d.amount || 0),
    0
  );

  // ── Projects grid data ───────────────────────────────────
  const statusCounts: Record<string, number> = {};
  for (const p of projects) {
    statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
  }

  const unpaidByProject: Record<string, number> = {};
  for (const inv of unpaidInvoices) {
    unpaidByProject[inv.project_id] = (unpaidByProject[inv.project_id] || 0) + 1;
  }

  const pendingPaymentsByProject: Record<string, number> = {};
  for (const p of pendingPaymentsAll) {
    pendingPaymentsByProject[p.project_id] =
      (pendingPaymentsByProject[p.project_id] || 0) + 1;
  }

  const tasksByProject: Record<string, { total: number; completed: number }> = {};
  for (const t of tasks) {
    if (!tasksByProject[t.project_id]) {
      tasksByProject[t.project_id] = { total: 0, completed: 0 };
    }
    tasksByProject[t.project_id].total++;
    if (t.completed) tasksByProject[t.project_id].completed++;
  }

  // Filter projects
  let filteredProjects = [...projects];
  if (statusFilter) {
    filteredProjects = filteredProjects.filter((p) => p.status === statusFilter);
  }

  // Sort: active first, then by updated_at desc
  filteredProjects.sort((a, b) => {
    const aActive = a.status !== "archived" && a.status !== "completed";
    const bActive = b.status !== "archived" && b.status !== "completed";
    if (aActive !== bActive) return aActive ? -1 : 1;
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });

  const allStatuses = Object.keys(PROJECT_STATUS_LABELS) as ProjectStatus[];

  function filterUrl(params: { status?: string }) {
    const sp = new URLSearchParams();
    if (params.status) sp.set("status", params.status);
    const qs = sp.toString();
    return `/admin${qs ? `?${qs}` : ""}`;
  }

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">

        {/* ────────────────────────────────────────────────── */}
        {/* 1. GREETING + QUICK STATS                         */}
        {/* ────────────────────────────────────────────────── */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            {getGreeting()}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Here&apos;s what&apos;s happening across your projects.
          </p>
        </div>

        {/* Quick Stats Bar */}
        <div className="mb-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <div className="rounded-xl bg-white p-4 shadow-sm sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50">
                <FolderKanban className="h-5 w-5 text-indigo-600" />
              </div>
              <span className="text-sm font-medium text-gray-500">
                Active Projects
              </span>
            </div>
            <p className="mt-3 text-2xl font-bold text-gray-900 sm:text-3xl">
              {activeProjects.length}
            </p>
          </div>

          <div className="rounded-xl bg-white p-4 shadow-sm sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50">
                <CalendarClock className="h-5 w-5 text-amber-600" />
              </div>
              <span className="text-sm font-medium text-gray-500">
                Due This Week
              </span>
            </div>
            <p className="mt-3 text-2xl font-bold text-gray-900 sm:text-3xl">
              {tasksDueThisWeek.length}
            </p>
          </div>

          <div className="rounded-xl bg-white p-4 shadow-sm sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <span className="text-sm font-medium text-gray-500">
                Overdue Items
              </span>
            </div>
            <p className={`mt-3 text-2xl font-bold sm:text-3xl ${overdueCount > 0 ? "text-red-600" : "text-gray-900"}`}>
              {overdueCount}
            </p>
          </div>

          <div className="rounded-xl bg-white p-4 shadow-sm sm:p-6">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${cashFlow >= 0 ? "bg-emerald-50" : "bg-red-50"}`}>
                {cashFlow >= 0 ? (
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-red-600" />
                )}
              </div>
              <span className="text-sm font-medium text-gray-500">
                Cash Flow
              </span>
            </div>
            <p className={`mt-3 text-2xl font-bold sm:text-3xl ${cashFlow >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {fmt(cashFlow)}
            </p>
            <p className="mt-1 text-xs text-gray-400">This month</p>
          </div>
        </div>

        {/* ────────────────────────────────────────────────── */}
        {/* 2. NEEDS ATTENTION                                */}
        {/* ────────────────────────────────────────────────── */}
        <section className="mb-8">
          <div className="mb-4 flex items-center gap-2">
            <Inbox className="h-5 w-5 text-gray-700" />
            <h2 className="text-lg font-bold text-gray-900">Needs Attention</h2>
            {actionItems.length > 0 && (
              <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                {actionItems.length}
              </span>
            )}
          </div>

          {actionItems.length === 0 ? (
            <div className="flex items-center gap-4 rounded-xl border border-emerald-200 bg-emerald-50 p-6">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="font-semibold text-emerald-800">
                  You&apos;re all caught up!
                </p>
                <p className="text-sm text-emerald-600">
                  No overdue items or pending actions right now.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {actionItems.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`group flex items-center gap-4 rounded-xl border-l-4 bg-white p-4 shadow-sm transition-shadow hover:shadow-md ${PRIORITY_BORDER[item.priority]}`}
                >
                  <div
                    className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${PRIORITY_DOT[item.priority]}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 group-hover:text-indigo-600">
                      {item.label}
                    </p>
                    <p className="text-sm text-gray-500">
                      {item.sublabel}
                    </p>
                  </div>
                  <div className="hidden shrink-0 text-right sm:block">
                    <p className="text-sm font-medium text-gray-700">
                      {item.detail}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-gray-300 transition-colors group-hover:text-indigo-500" />
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* ────────────────────────────────────────────────── */}
        {/* 3. FINANCIAL SNAPSHOT                              */}
        {/* ────────────────────────────────────────────────── */}
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-bold text-gray-900">
            Financial Snapshot
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Money Coming In */}
            <div className="rounded-xl bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                </div>
                <h3 className="font-semibold text-gray-900">Money Coming In</h3>
              </div>
              <p className="text-2xl font-bold text-emerald-600 sm:text-3xl">
                {fmt(unpaidTotal)}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                {unpaidInvoices.length} unpaid invoice{unpaidInvoices.length !== 1 ? "s" : ""} outstanding
              </p>
              {overdueInvoices.length > 0 && (
                <p className="mt-2 text-sm font-medium text-red-600">
                  {overdueInvoices.length} overdue
                </p>
              )}
            </div>

            {/* Money Going Out */}
            <div className="rounded-xl bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50">
                  <TrendingDown className="h-5 w-5 text-orange-600" />
                </div>
                <h3 className="font-semibold text-gray-900">Money Going Out</h3>
              </div>
              <div className="flex items-baseline gap-4">
                <div>
                  <p className="text-2xl font-bold text-orange-600 sm:text-3xl">
                    {fmt(pendingPaymentsTotal)}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    {pendingPaymentsAll.length} pending payment{pendingPaymentsAll.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              {pendingDrawsTotal > 0 && (
                <p className="mt-3 border-t border-gray-100 pt-3 text-sm text-gray-500">
                  <span className="font-medium text-gray-700">{fmt(pendingDrawsTotal)}</span>{" "}
                  in pending draw requests
                </p>
              )}
            </div>
          </div>
        </section>

        {/* ────────────────────────────────────────────────── */}
        {/* 4. PROJECTS GRID                                  */}
        {/* ────────────────────────────────────────────────── */}
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-bold text-gray-900">Projects</h2>

          {/* Filter Pills */}
          <div className="mb-5 flex flex-wrap gap-2">
            <Link
              href={filterUrl({})}
              className={`min-h-[44px] rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                !statusFilter
                  ? "bg-gray-900 text-white"
                  : "bg-white text-gray-600 shadow-sm hover:bg-gray-100"
              }`}
            >
              All ({projects.length})
            </Link>
            {allStatuses.map((s) =>
              (statusCounts[s] || 0) > 0 ? (
                <Link
                  key={s}
                  href={filterUrl({ status: s })}
                  className={`min-h-[44px] rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    statusFilter === s
                      ? "bg-gray-900 text-white"
                      : "bg-white text-gray-600 shadow-sm hover:bg-gray-100"
                  }`}
                >
                  {PROJECT_STATUS_LABELS[s]} ({statusCounts[s]})
                </Link>
              ) : null
            )}
          </div>

          {/* Grid */}
          {filteredProjects.length === 0 ? (
            <div className="rounded-xl bg-white p-12 text-center shadow-sm">
              <FolderKanban className="mx-auto h-10 w-10 text-gray-300" />
              <p className="mt-4 text-lg font-medium text-gray-500">
                No projects found
              </p>
              <p className="mt-1 text-sm text-gray-400">
                {statusFilter
                  ? "Try adjusting your filters."
                  : "Create your first project to get started."}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProjects.map((project) => {
                const unpaidCount = unpaidByProject[project.id] || 0;
                const pendingPayCount = pendingPaymentsByProject[project.id] || 0;
                const taskData = tasksByProject[project.id];
                const taskTotal = taskData?.total ?? 0;
                const taskCompleted = taskData?.completed ?? 0;
                const taskPercent =
                  taskTotal > 0
                    ? Math.round((taskCompleted / taskTotal) * 100)
                    : 0;

                return (
                  <Link
                    key={project.id}
                    href={`/admin/projects/${project.id}`}
                    className="group rounded-xl bg-white p-5 shadow-sm transition-shadow hover:shadow-md sm:p-6"
                  >
                    {/* Header */}
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600">
                        {project.name}
                      </h3>
                      <span
                        className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                          PROJECT_STATUS_COLORS[project.status]
                        }`}
                      >
                        {PROJECT_STATUS_LABELS[project.status]}
                      </span>
                    </div>

                    {/* Client + Location */}
                    <div className="flex items-center gap-1.5 text-sm text-gray-500">
                      <Users className="h-3.5 w-3.5" />
                      <span>{project.client_name}</span>
                    </div>

                    {(project.city || project.state) && (
                      <p className="mt-1 text-sm text-gray-400">
                        {[project.city, project.state]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    )}

                    {/* Value */}
                    {project.estimated_value != null && (
                      <p className="mt-2 text-lg font-bold text-gray-900">
                        {fmt(project.estimated_value)}
                      </p>
                    )}

                    {/* Task Progress */}
                    {taskTotal > 0 && (
                      <div className="mt-3">
                        <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
                          <span>
                            {taskCompleted}/{taskTotal} tasks
                          </span>
                          <span>{taskPercent}%</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className="h-full rounded-full bg-indigo-500 transition-all"
                            style={{ width: `${taskPercent}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Indicators */}
                    {(unpaidCount > 0 || pendingPayCount > 0) && (
                      <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-3">
                        {unpaidCount > 0 && (
                          <span className="flex items-center gap-1 text-xs font-medium text-orange-600">
                            <FileText className="h-3.5 w-3.5" />
                            {unpaidCount} unpaid
                          </span>
                        )}
                        {pendingPayCount > 0 && (
                          <span className="flex items-center gap-1 text-xs font-medium text-red-600">
                            <CreditCard className="h-3.5 w-3.5" />
                            {pendingPayCount} pending
                          </span>
                        )}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* ────────────────────────────────────────────────── */}
        {/* 5. RECENT ESTIMATES                               */}
        {/* ────────────────────────────────────────────────── */}
        {estimates.length > 0 && (
          <section>
            <div className="mb-4 flex items-center gap-2">
              <ReceiptText className="h-5 w-5 text-gray-700" />
              <h2 className="text-lg font-bold text-gray-900">
                Recent Estimates
              </h2>
              <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                {estimates.length}
              </span>
            </div>

            <div className="space-y-2">
              {estimates.map((est) => (
                <div
                  key={est.id}
                  className="flex items-center gap-4 rounded-xl bg-white p-4 shadow-sm"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                    <ClipboardCheck className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900">
                      {est.client_name}
                    </p>
                    <p className="text-sm text-gray-500">{est.project_type}</p>
                  </div>
                  <div className="hidden text-right sm:block">
                    {est.estimated_min != null && est.estimated_max != null ? (
                      <p className="text-sm font-medium text-gray-700">
                        {fmt(est.estimated_min)} &ndash; {fmt(est.estimated_max)}
                      </p>
                    ) : est.budget_range ? (
                      <p className="text-sm font-medium text-gray-700">
                        {est.budget_range}
                      </p>
                    ) : null}
                    <p className="text-xs text-gray-400">
                      {new Date(est.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                      est.status === "new"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {est.status === "new" ? "New" : "Reviewed"}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
