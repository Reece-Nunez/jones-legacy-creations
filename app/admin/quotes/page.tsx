import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { QuotesList } from "@/components/admin/quotes/QuotesList";

export default async function QuotesPage() {
  const supabase = await createClient();
  const { data: quotes } = await supabase
    .from("quotes")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quotes</h1>
          <p className="text-sm text-gray-500 mt-1">
            Create and manage construction estimates and proposals
          </p>
        </div>
        <Link
          href="/admin/quotes/new"
          className="inline-flex items-center justify-center px-6 py-3 bg-black text-white text-sm font-medium rounded-full hover:bg-gray-800 transition-colors"
        >
          New Quote
        </Link>
      </div>
      <QuotesList quotes={quotes ?? []} />
    </div>
  );
}
