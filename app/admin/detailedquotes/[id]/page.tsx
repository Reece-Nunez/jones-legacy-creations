import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { QuoteDetail } from "@/components/admin/quotes/QuoteDetail";

export default async function DetailedQuoteDetailPage({
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

  return <QuoteDetail quoteId={id} initialQuote={quote} />;
}
