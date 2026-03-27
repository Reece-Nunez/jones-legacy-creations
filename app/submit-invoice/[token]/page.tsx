import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { ContractorInvoiceUpload } from "@/components/ContractorInvoiceUpload";

export const metadata: Metadata = {
  title: "Submit Invoice | Jones Legacy Creations",
  robots: { index: false, follow: false },
};

export default async function SubmitInvoicePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();

  const { data: tokenRecord, error } = await supabase
    .from("invoice_upload_tokens")
    .select("*")
    .eq("token", token)
    .eq("active", true)
    .single();

  if (error || !tokenRecord) {
    return (
      <>
        <Navigation />
        <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-sm p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              This link is invalid or has expired
            </h1>
            <p className="text-gray-500">
              Please contact Jones Legacy Creations for a new upload link.
            </p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-gray-50 py-12 px-4">
        <ContractorInvoiceUpload
          token={token}
          projectName={tokenRecord.project_name}
          contractorName={tokenRecord.contractor_name}
        />
      </main>
      <Footer />
    </>
  );
}
