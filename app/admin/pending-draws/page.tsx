import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { type DrawRequest, DRAW_STATUS_COLORS } from "@/lib/types/database";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

export default async function PendingDrawsPage() {
  const supabase = await createClient();

  const [{ data: drawsData }, { data: projectsData }] = await Promise.all([
    supabase
      .from("draw_requests")
      .select("*")
      .in("status", ["draft", "submitted", "approved"])
      .order("created_at", { ascending: false }),
    supabase.from("projects").select("id, name, client_name"),
  ]);

  const draws: DrawRequest[] = drawsData ?? [];
  const projects = (projectsData ?? []) as { id: string; name: string; client_name: string | null }[];
  const projectMap = new Map(projects.map((p) => [p.id, p]));

  const totalAmount = draws.reduce((s, d) => s + (d.amount || 0), 0);

  const grouped = {
    draft: draws.filter((d) => d.status === "draft"),
    submitted: draws.filter((d) => d.status === "submitted"),
    approved: draws.filter((d) => d.status === "approved"),
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pending Draws</h1>
          <p className="mt-1 text-sm text-gray-500">
            {draws.length} draw{draws.length !== 1 ? "s" : ""} totaling{" "}
            {fmt(totalAmount)}
          </p>
        </div>
        <Link
          href="/admin/financials"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
        >
          View full financials &rarr;
        </Link>
      </div>

      {draws.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-500">No pending draw requests.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {(["draft", "submitted", "approved"] as const).map((status) => {
            const items = grouped[status];
            if (items.length === 0) return null;
            const label =
              status === "draft"
                ? "Draft — Needs Submission"
                : status === "submitted"
                ? "Submitted — Awaiting Approval"
                : "Approved — Awaiting Funding";
            return (
              <section key={status}>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
                  {label} ({items.length})
                </h2>
                <div className="space-y-2">
                  {items.map((draw) => {
                    const project = projectMap.get(draw.project_id);
                    return (
                      <Link
                        key={draw.id}
                        href={`/admin/projects/${draw.project_id}?tab=draws`}
                        className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 transition-colors hover:bg-gray-50"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">
                              Draw #{draw.draw_number}
                            </span>
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${DRAW_STATUS_COLORS[draw.status]}`}
                            >
                              {draw.status}
                            </span>
                          </div>
                          <p className="mt-0.5 truncate text-sm text-gray-500">
                            {project?.name ?? "Unknown project"}
                            {project?.client_name ? ` — ${project.client_name}` : ""}
                          </p>
                          {draw.description && (
                            <p className="mt-0.5 truncate text-xs text-gray-400">
                              {draw.description}
                            </p>
                          )}
                        </div>
                        <div className="ml-4 text-right">
                          <p className="text-sm font-semibold tabular-nums text-gray-900">
                            {fmt(draw.amount)}
                          </p>
                          {draw.submitted_date && (
                            <p className="text-xs text-gray-400">
                              Submitted{" "}
                              {new Date(draw.submitted_date).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
