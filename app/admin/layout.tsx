import AdminShell from "@/components/admin/AdminShell";
import { PwaInstallBanner } from "@/components/admin/PwaInstallBanner";
import { AdminThemeProvider } from "@/components/admin/AdminThemeProvider";
import { createClient } from "@/lib/supabase/server";

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
      <AdminShell role={role}>
        {children}
        <PwaInstallBanner />
      </AdminShell>
    </AdminThemeProvider>
  );
}
