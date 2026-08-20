import { createClient } from "@/lib/supabase/server";
import CompanyInsurance from "@/components/admin/CompanyInsurance";
import type { CompanyInsuranceDocument } from "@/lib/types/database";

export const metadata = {
  title: "Liability Insurance",
};

export default async function CompanyInsurancePage() {
  const supabase = await createClient();

  // RLS (admin_only) is what actually gates this — contractors get an empty
  // list rather than company policy numbers.
  const { data } = await supabase
    .from("company_insurance_documents")
    .select("*")
    .order("expiration_date", { ascending: true, nullsFirst: false });

  return (
    <CompanyInsurance
      initialDocs={(data ?? []) as CompanyInsuranceDocument[]}
    />
  );
}
