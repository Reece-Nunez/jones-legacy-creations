import AdminShell from "@/components/admin/AdminShell";
import { PwaInstallBanner } from "@/components/admin/PwaInstallBanner";
import { AdminThemeProvider } from "@/components/admin/AdminThemeProvider";
import { createClient } from "@/lib/supabase/server";
import { HelpPanel } from "@/components/admin/HelpPanel";
import { isContractor } from "@/lib/roles";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Resolve the signed-in user's role so the shell can render a scoped nav for
  // contractors (their project only) vs. the full staff nav. Null on the login
  // page / unauthenticated, where the shell sits under the login overlay.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let role: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("auth_id", user.id)
      .maybeSingle();
    role = profile?.role ?? null;
  }

  return (
    <AdminThemeProvider>
      {/* Hide the reCAPTCHA badge inside the admin app.
        *
        * Google injects .grecaptcha-badge into <body> when a public form loads
        * the script, and nothing takes it back out on a client-side navigation
        * — the public site links straight to /admin, so the badge rides along.
        * It is fixed at bottom-right and lands directly under the help button.
        *
        * Hiding rather than moving: no admin form uses reCAPTCHA, so there is
        * nothing being protected here and nothing to attribute. On the public
        * site, where it is actually doing a job, the badge is untouched.
        *
        * This <style> unmounts with the layout, so navigating back out to the
        * public site restores it. */}
      <style>{`.grecaptcha-badge { visibility: hidden; }`}</style>
      <AdminShell role={role}>
        {children}
        <PwaInstallBanner />
        {/* Staff only. The help assistant's app map describes panels a
            contractor login cannot reach, so offering it there would mostly
            produce directions to screens they don't have. */}
        {role && !isContractor(role) && <HelpPanel />}
      </AdminShell>
    </AdminThemeProvider>
  );
}
