import { createClient } from "@/lib/supabase/server";
import DDSetupForm from "./DDSetupForm";
import Image from "next/image";

export default async function DirectDepositPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // Preview mode — show form with placeholder data, no token validation
  if (token === "PREVIEW_TOKEN") {
    return (
      <DDSetupForm
        token={token}
        contractorName="Alex Johnson"
        companyName="Jones Legacy Creations"
        preview
      />
    );
  }

  const supabase = await createClient();

  const { data: invite } = await supabase
    .from("dd_invite_tokens")
    .select("id, contractor_name, contractor_email, expires_at, used_at")
    .eq("token", token)
    .maybeSingle();

  // Token not found
  if (!invite) {
    return <InvalidToken reason="This invite link is invalid or does not exist." />;
  }

  // Already used
  if (invite.used_at) {
    return <InvalidToken reason="This invite link has already been used. Contact your project manager if you need a new one." />;
  }

  // Expired
  if (new Date(invite.expires_at) < new Date()) {
    return <InvalidToken reason="This invite link has expired (links are valid for 24 hours). Contact your project manager to request a new one." />;
  }

  return (
    <DDSetupForm
      token={token}
      contractorName={invite.contractor_name}
      companyName="Jones Legacy Creations"
    />
  );
}

function InvalidToken({ reason }: { reason: string }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="bg-gray-900 px-8 py-6 text-center">
            <Image
              src="/logo-transparent.png"
              alt="Jones Legacy Creations"
              width={160}
              height={48}
              className="mx-auto h-12 w-auto"
              style={{ filter: "brightness(0) invert(1)" }}
            />
          </div>
          <div className="px-8 py-10 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-3">Link Unavailable</h1>
            <p className="text-sm text-gray-500 leading-relaxed">{reason}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
