import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { type Permit, PERMIT_STATUS_COLORS } from "@/lib/types/database";

function daysBetween(a: string, b: Date) {
  return Math.floor((b.getTime() - new Date(a).getTime()) / 86_400_000);
}

export default async function PendingPermitsPage() {
  const supabase = await createClient();

  const [{ data: permitsData }, { data: projectsData }] = await Promise.all([
    supabase
      .from("permits")
      .select("*")
      .eq("status", "applied")
      .order("applied_date", { ascending: true }),
    supabase.from("projects").select("id, name, client_name"),
  ]);

  const permits: Permit[] = permitsData ?? [];
  const projects = (projectsData ?? []) as { id: string; name: string; client_name: string | null }[];
  const projectMap = new Map(projects.map((p) => [p.id, p]));
  const now = new Date();

  return (
    <div>
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pending Permits</h1>
          <p className="mt-1 text-sm text-gray-500">
            {permits.length} permit{permits.length !== 1 ? "s" : ""} awaiting
            approval
          </p>
        </div>
      </div>

      {permits.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-500">No pending permits.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {permits.map((permit) => {
            const project = projectMap.get(permit.project_id);
            const daysWaiting = permit.applied_date
              ? daysBetween(permit.applied_date, now)
              : 0;
            const isLong = daysWaiting > 30;

            return (
              <Link
                key={permit.id}
                href={`/admin/projects/${permit.project_id}`}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 transition-colors hover:bg-gray-50"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">
                      {permit.permit_type}
                    </span>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${PERMIT_STATUS_COLORS[permit.status]}`}
                    >
                      {permit.status}
                    </span>
                    {permit.permit_number && (
                      <span className="text-xs text-gray-400">
                        #{permit.permit_number}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-sm text-gray-500">
                    {project?.name ?? "Unknown project"}
                    {project?.client_name ? ` — ${project.client_name}` : ""}
                  </p>
                  {permit.notes && (
                    <p className="mt-0.5 truncate text-xs text-gray-400">
                      {permit.notes}
                    </p>
                  )}
                </div>
                <div className="ml-4 text-right">
                  <p
                    className={`text-sm font-semibold tabular-nums ${
                      isLong ? "text-orange-600" : "text-gray-600"
                    }`}
                  >
                    {daysWaiting} day{daysWaiting !== 1 ? "s" : ""}
                  </p>
                  {permit.applied_date && (
                    <p className="text-xs text-gray-400">
                      Applied{" "}
                      {new Date(permit.applied_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
