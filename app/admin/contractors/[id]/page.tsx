import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ContractorDetail from "@/components/admin/ContractorDetail";

export default async function ContractorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: contractor }, { data: payments }, { data: projects }, { data: assignments }, { data: insuranceDocs }] = await Promise.all([
    supabase.from("contractors").select("*").eq("id", id).single(),
    supabase
      .from("contractor_payments")
      .select("*, projects:project_id(id, name)")
      .eq("contractor_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("projects")
      .select("id, name")
      .order("name"),
    supabase
      .from("project_contractors")
      .select("project_id, projects:project_id(id, name)")
      .eq("contractor_id", id),
    supabase
      .from("contractor_insurance_documents")
      .select("*")
      .eq("contractor_id", id)
      .order("expiration_date", { ascending: true, nullsFirst: false }),
  ]);

  if (!contractor) {
    notFound();
  }

  return (
    <ContractorDetail
      contractor={contractor}
      payments={payments ?? []}
      allProjects={projects ?? []}
      projectAssignments={assignments ?? []}
      insuranceDocs={insuranceDocs ?? []}
    />
  );
}
