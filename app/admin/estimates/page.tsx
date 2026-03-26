import { createClient } from "@/lib/supabase/server";
import { type Estimate } from "@/lib/types/database";
import EstimatesClient from "./EstimatesClient";

export default async function AdminEstimatesPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("estimates")
    .select("*")
    .order("created_at", { ascending: false });

  const estimates: Estimate[] = data ?? [];

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="rounded-xl bg-red-50 border border-red-200 p-6 text-center">
          <p className="text-red-700">Failed to load estimates: {error.message}</p>
        </div>
      </div>
    );
  }

  return <EstimatesClient initialEstimates={estimates} />;
}
