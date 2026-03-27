import { updateSession } from "@/lib/supabase/middleware";
import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  // Handle OAuth code exchange on ANY page (Supabase may redirect code to root)
  const code = request.nextUrl.searchParams.get("code");
  if (code) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.searchParams.delete("code");
    redirectUrl.pathname = "/admin";

    let response = NextResponse.redirect(redirectUrl);
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
            // Recreate redirect with updated cookies
            response = NextResponse.redirect(redirectUrl);
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Return the response that has the session cookies attached
      return response;
    }
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/",
    "/auth/callback",
  ],
};
