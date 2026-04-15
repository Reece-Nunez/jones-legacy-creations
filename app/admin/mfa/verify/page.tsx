"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ShieldCheck, Loader2, AlertCircle } from "lucide-react";
import Image from "next/image";

function MFAVerifyInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/admin";

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // On mount: list factors and create a challenge
  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const totp = factors?.totp?.[0];
      if (!totp) {
        // No MFA factor — send them through
        router.replace(next);
        return;
      }
      setFactorId(totp.id);
      const { data: challenge, error: challengeErr } =
        await supabase.auth.mfa.challenge({ factorId: totp.id });
      if (challengeErr || !challenge) {
        setError("Failed to initiate MFA challenge. Please try signing in again.");
        return;
      }
      setChallengeId(challenge.id);
      inputRef.current?.focus();
    }
    init();
  }, [next, router]);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!factorId || !challengeId || code.length !== 6) return;
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: verifyErr } = await supabase.auth.mfa.verify({
      factorId,
      challengeId,
      code,
    });

    if (verifyErr) {
      setError("Invalid code. Please check your authenticator app and try again.");
      setCode("");
      setLoading(false);
      inputRef.current?.focus();
      return;
    }

    router.replace(next);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-100 px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl bg-white p-8 shadow-lg">
          <div className="mb-6 flex justify-center">
            <Image
              src="/logo-transparent.png"
              alt="Jones Legacy Creations"
              width={160}
              height={48}
              className="h-12 w-auto"
              priority
            />
          </div>

          <div className="mb-6 flex flex-col items-center gap-2 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
              <ShieldCheck className="h-6 w-6 text-blue-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Two-Factor Authentication</h1>
            <p className="text-sm text-gray-500">
              Enter the 6-digit code from your authenticator app.
            </p>
          </div>

          {error && (
            <div className="mb-4 flex items-start gap-2.5 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-4">
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-center text-2xl font-mono tracking-widest text-gray-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
            <button
              type="submit"
              disabled={loading || code.length !== 6 || !challengeId}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 px-6 py-3 text-sm font-medium text-white shadow-sm transition-all hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck className="h-4 w-4" />
              )}
              {loading ? "Verifying…" : "Verify"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function MFAVerifyPage() {
  return (
    <Suspense fallback={null}>
      <MFAVerifyInner />
    </Suspense>
  );
}
