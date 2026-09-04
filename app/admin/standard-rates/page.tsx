import { createClient } from "@/lib/supabase/server";
import StandardRatesManager from "@/components/admin/StandardRatesManager";
import type { Contractor, StandardTradeRate } from "@/lib/types/database";

export const metadata = {
  title: "Standard Prices",
};

export default async function StandardRatesPage() {
  const supabase = await createClient();

  // RLS (admin_only) is the real gate here — this is Blake's cost basis, not
  // something a contractor should be able to read.
  const [{ data: rates }, { data: contractors }] = await Promise.all([
    supabase
      .from("standard_trade_rates")
      .select("*, contractor:contractors(id, name, company)")
      .order("trade_name"),
    supabase.from("contractors").select("id, name, company").order("name"),
  ]);

  return (
    <StandardRatesManager
      initialRates={(rates ?? []) as StandardTradeRate[]}
      contractors={(contractors ?? []) as Pick<Contractor, "id" | "name" | "company">[]}
    />
  );
}
