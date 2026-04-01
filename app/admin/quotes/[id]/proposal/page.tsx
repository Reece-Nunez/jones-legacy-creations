import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { ClientProposal } from "@/components/admin/quotes/ClientProposal";

export default async function ProposalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: quote } = await supabase
    .from("quotes")
    .select("*")
    .eq("id", id)
    .single();

  if (!quote) notFound();

  return <ClientProposal quoteId={id} initialQuote={quote} />;
}
