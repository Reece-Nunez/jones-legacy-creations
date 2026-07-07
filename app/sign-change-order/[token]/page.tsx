import { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { ChangeOrderSignForm } from "@/components/ChangeOrderSignForm";

export const metadata: Metadata = {
  title: "Sign Change Order | Jones Legacy Creations",
  robots: { index: false, follow: false },
};

// Read on each request; never cache a signing link.
export const dynamic = "force-dynamic";

function StatusCard({ title, message }: { title: string; message: string }) {
  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm p-8 text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">{title}</h1>
          <p className="text-gray-500">{message}</p>
        </div>
      </main>
      <Footer />
    </>
  );
}

export default async function SignChangeOrderPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // The change_orders table is admin-only under RLS and the signer is not logged
  // in, so we read with the service-role client. The random token is the trust
  // boundary — same model as the /submit-invoice flow.
  const supabase = createAdminClient();
  const { data: co } = await supabase
    .from("change_orders")
    .select(
      "title, description, reason, cost_delta, schedule_impact_days, consent_text, client_name, status, projects(name)"
    )
    .eq("token", token)
    .single();

  if (!co) {
    return (
      <StatusCard
        title="This link is invalid or has expired"
        message="Please contact Jones Legacy Creations for a new link."
      />
    );
  }
  if (co.status === "void") {
    return (
      <StatusCard
        title="This change order was cancelled"
        message="Please contact Jones Legacy Creations if you have questions."
      />
    );
  }
  if (co.status === "signed") {
    return (
      <StatusCard
        title="This change order has already been signed"
        message="Thank you — no further action is needed."
      />
    );
  }

  const projectName = (co.projects as { name?: string } | null)?.name ?? "your project";

  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-gray-50 py-12 px-4">
        <ChangeOrderSignForm
          token={token}
          projectName={projectName}
          title={co.title}
          description={co.description}
          reason={co.reason}
          costDelta={Number(co.cost_delta) || 0}
          scheduleImpactDays={Number(co.schedule_impact_days) || 0}
          consentText={co.consent_text ?? ""}
          clientName={co.client_name}
        />
      </main>
      <Footer />
    </>
  );
}
