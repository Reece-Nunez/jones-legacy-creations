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

  const [{ data: contractor }, { data: payments }] = await Promise.all([
    supabase.from("contractors").select("*").eq("id", id).single(),
    supabase
      .from("contractor_payments")
      .select("*, projects:project_id(id, name)")
      .eq("contractor_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (!contractor) {
    notFound();
  }

  return (
    <ContractorDetail
      contractor={contractor}
      payments={payments ?? []}
    />
  );
}
