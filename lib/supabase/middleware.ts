import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the session — this keeps the user signed in
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isApiAdmin = path.startsWith("/api/admin");
  const isPageAdmin =
    path.startsWith("/admin") && !path.startsWith("/admin/login");

  // Protect /admin pages and /api/admin/* routes
  if (isApiAdmin || isPageAdmin) {
    if (!user) {
      if (isApiAdmin) {
        return NextResponse.json(
          { error: "Not authenticated" },
          { status: 401 }
        );
      }
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("next", path);
      return NextResponse.redirect(url);
    }

    // Authorization gate: the user must have an ACTIVE profile row. Both staff
    // and contractors are provisioned in user_profiles (and linked by email on
    // first login), so this is self-serve — no env allowlist / redeploy needed
    // to grant a new contractor access. An authenticated Google account with no
    // profile (or a deactivated one) is rejected here.
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("is_active")
      .eq("auth_id", user.id)
      .maybeSingle();

    if (!profile || !profile.is_active) {
      if (isApiAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("error", "unauthorized");
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
