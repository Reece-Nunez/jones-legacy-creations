import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();

  if (!q || q.length < 2) {
    return NextResponse.json(
      { projects: [], contractors: [], invoices: [], estimates: [] }
    );
  }

  const supabase = await createClient();
  const pattern = `%${q}%`;

  const [projectsRes, contractorsRes, invoicesRes, estimatesRes] =
    await Promise.all([
      supabase
        .from("projects")
        .select("id, name, client_name, client_email, address, city, status, description")
        .or(
          `name.ilike.${pattern},client_name.ilike.${pattern},client_email.ilike.${pattern},address.ilike.${pattern},city.ilike.${pattern},description.ilike.${pattern}`
        )
        .order("updated_at", { ascending: false })
        .limit(5),

      supabase
        .from("contractors")
        .select("id, name, company, email, trade")
        .or(
          `name.ilike.${pattern},company.ilike.${pattern},email.ilike.${pattern},trade.ilike.${pattern}`
        )
        .order("updated_at", { ascending: false })
        .limit(5),

      supabase
        .from("invoices")
        .select("id, project_id, invoice_number, description, amount, status, projects(name)")
        .or(
          `invoice_number.ilike.${pattern},description.ilike.${pattern}`
        )
        .order("created_at", { ascending: false })
        .limit(5),

      supabase
        .from("estimates")
        .select("id, client_name, client_email, project_type, description, status")
        .or(
          `client_name.ilike.${pattern},client_email.ilike.${pattern},description.ilike.${pattern}`
        )
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

  // Return first error encountered, if any
  const firstError =
    projectsRes.error || contractorsRes.error || invoicesRes.error || estimatesRes.error;

  if (firstError) {
    return NextResponse.json({ error: firstError.message }, { status: 500 });
  }

  return NextResponse.json({
    projects: projectsRes.data ?? [],
    contractors: contractorsRes.data ?? [],
    invoices: invoicesRes.data ?? [],
    estimates: estimatesRes.data ?? [],
  });
}
