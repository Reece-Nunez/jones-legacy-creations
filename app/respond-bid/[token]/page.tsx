import { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { BidResponseForm } from "@/components/BidResponseForm";

export const metadata: Metadata = {
  title: "Respond to Bid Request | Jones Legacy Creations",
  robots: { index: false, follow: false },
};

// Read on each request; never cache a response link.
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

export default async function RespondBidPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // bid_requests is admin-only under RLS and the contractor is not logged in, so
  // we read with the service-role client. The random token is the trust boundary
  // — same model as /sign-change-order.
  const supabase = createAdminClient();
  const { data: bid } = await supabase
    .from("bid_requests")
    .select(
      "id, title, scope_description, custom_message, terms_text, contractor_name, status, projects(name)"
    )
    .eq("token", token)
    .single();

  if (!bid) {
    return (
      <StatusCard
        title="This link is invalid or has expired"
        message="Please contact Jones Legacy Creations for a new link."
      />
    );
  }
  if (bid.status === "void") {
    return (
      <StatusCard
        title="This bid request was cancelled"
        message="Please contact Jones Legacy Creations if you have questions."
      />
    );
  }
  if (bid.status === "submitted") {
    return (
      <StatusCard
        title="Your bid is in"
        message="Thank you — Jones Legacy Creations is reviewing it and will get back to you."
      />
    );
  }
  if (bid.status === "accepted" || bid.status === "completed") {
    return (
      <StatusCard
        title="Your bid was accepted"
        message="Thank you — we'll contact you for scheduling. No further action is needed."
      />
    );
  }
  if (bid.status === "rejected") {
    return (
      <StatusCard
        title="This bid wasn't selected"
        message="Thank you for your bid. We'll keep you in mind for future work."
      />
    );
  }
  if (bid.status === "passed") {
    return (
      <StatusCard
        title="You passed on this one"
        message="Thank you for letting us know. No further action is needed."
      />
    );
  }

  // First open of a live request — flip sent → viewed so staff can see it landed.
  if (bid.status === "sent") {
    await supabase
      .from("bid_requests")
      .update({ status: "viewed", updated_at: new Date().toISOString() })
      .eq("id", bid.id)
      .eq("status", "sent"); // guard against racing the accept submit
  }

  const projectName = (bid.projects as { name?: string } | null)?.name ?? "your project";

  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-gray-50 py-12 px-4">
        <BidResponseForm
          token={token}
          projectName={projectName}
          title={bid.title}
          scopeDescription={bid.scope_description}
          customMessage={bid.custom_message}
          termsText={bid.terms_text ?? ""}
          contractorName={bid.contractor_name}
        />
      </main>
      <Footer />
    </>
  );
}
