import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LoginForm from "@/components/admin/LoginForm";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;

  // If already signed in, redirect to admin
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // Already signed in with an active profile → straight to admin. (Matches
    // the middleware profile gate; contractors land here too and are routed to
    // their project by the /admin page.)
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("is_active")
      .eq("auth_id", user.id)
      .maybeSingle();

    if (profile?.is_active) {
      redirect(next || "/admin");
    }
  }

  return <LoginForm error={error} next={next} />;
}
