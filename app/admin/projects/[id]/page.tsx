import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProjectDetail from "@/components/admin/ProjectDetail";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    { data: project },
    { data: invoices },
    { data: payments },
    { data: permits },
    { data: documents },
    { data: tasks },
    { data: drawRequests },
    { data: activityLog },
    { data: contractors },
  ] = await Promise.all([
    supabase.from("projects").select("*").eq("id", id).single(),
    supabase
      .from("invoices")
      .select("*")
      .eq("project_id", id)
      .order("created_at", { ascending: false }),
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
  ]);

  if (!project) {
    notFound();
  }

  return (
    <ProjectDetail
      project={project}
      invoices={invoices ?? []}
      payments={payments ?? []}
      permits={permits ?? []}
      documents={documents ?? []}
      tasks={tasks ?? []}
      drawRequests={drawRequests ?? []}
      activityLog={activityLog ?? []}
      contractors={contractors ?? []}
    />
  );
}
