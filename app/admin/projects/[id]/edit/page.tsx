import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProjectForm from "@/components/admin/ProjectForm";
import { Project, ProjectSettlement } from "@/lib/types/database";
import { saleClosingCostsFromSettlement } from "@/lib/finance/project-financials";

interface EditProjectPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditProjectPage({
  params,
}: EditProjectPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: project, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !project) {
    notFound();
  }

  // Once a sale settlement is recorded, its itemised costs supersede the
  // manual sale_closing_costs estimate in the profit formula. The form needs
  // to know so it doesn't present an input that no longer affects anything.
  const { data: settlements } = await supabase
    .from("project_settlements")
    .select("*")
    .eq("project_id", id)
    .eq("settlement_type", "sale")
    .order("settlement_date", { ascending: false })
    .limit(1);

  const settlement = (settlements as ProjectSettlement[] | null)?.[0];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <ProjectForm
        project={project as Project}
        settlementClosingCosts={
          settlement ? saleClosingCostsFromSettlement(settlement) : null
        }
      />
    </div>
  );
}
