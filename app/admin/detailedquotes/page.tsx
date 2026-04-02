import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { QuotesList } from "@/components/admin/quotes/QuotesList";

export default async function DetailedQuotesPage() {
  const supabase = await createClient();
  const { data: quotes } = await supabase
    .from("quotes")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Detailed Quotes</h1>
          <p className="text-sm text-gray-500 mt-1">
            Advanced quote builder with sections, allowances, exclusions, and vendor quotes
          </p>
        </div>
        <Link
          href="/admin/quotes"
          className="inline-flex items-center justify-center px-6 py-3 bg-gray-100 text-gray-700 text-sm font-medium rounded-full hover:bg-gray-200 transition-colors"
        >
          Back to Quotes
        </Link>
      </div>
      <QuotesList quotes={quotes ?? []} detailBasePath="/admin/detailedquotes" />
    </div>
  );
}
