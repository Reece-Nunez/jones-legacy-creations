import { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { signFromPublicUrl } from "@/lib/supabase/signedUrl";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { SelectionApprovalForm } from "@/components/SelectionApprovalForm";

export const metadata: Metadata = {
  title: "Review Selection | Jones Legacy Creations",
  robots: { index: false, follow: false },
};

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

export default async function ReviewSelectionPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // Service-role read (admin-only table, client not logged in); token is the
  // trust boundary. Same model as /submit-invoice.
  const supabase = createAdminClient();
  const { data: sel } = await supabase
    .from("selection_approvals")
    .select(
      "title, selection_name, description, location, cost_impact, image_url, disclaimer_text, client_name, status, projects(name)"
    )
    .eq("token", token)
    .single();

  if (!sel) {
    return (
      <StatusCard
        title="This link is invalid or has expired"
        message="Please contact Jones Legacy Creations for a new link."
      />
    );
  }
  if (sel.status === "approved" || sel.status === "declined") {
    return (
      <StatusCard
        title="This selection has already been decided"
        message="Thank you — no further action is needed."
      />
    );
  }

  const projectName = (sel.projects as { name?: string } | null)?.name ?? "your project";

  // Mint a short-lived signed URL so the client can view the private photo.
  const imageUrl = sel.image_url
    ? await signFromPublicUrl(sel.image_url, "project-documents", 600)
    : null;

  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-gray-50 py-12 px-4">
        <SelectionApprovalForm
          token={token}
          projectName={projectName}
          title={sel.title}
          selectionName={sel.selection_name}
          description={sel.description}
          location={sel.location}
          costImpact={sel.cost_impact != null ? Number(sel.cost_impact) : null}
          disclaimerText={sel.disclaimer_text ?? ""}
          imageUrl={imageUrl}
          clientName={sel.client_name}
        />
      </main>
      <Footer />
    </>
  );
}
