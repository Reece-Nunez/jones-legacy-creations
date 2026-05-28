/**
 * GET /api/unsubscribe?token=<unsubscribe_token>
 *
 * One-click unsubscribe — no login, no confirmation page. Sets the
 * subscriber's status to 'unsubscribed' and renders a tiny confirmation
 * page so the user knows it worked.
 *
 * Token comes from the unsubscribe_token column populated on insert
 * (32-char hex). Brute-forcing the namespace is not realistic; if it
 * ever became one we'd switch to signed JWTs.
 */

import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

function page(message: string, ok: boolean) {
  return new Response(
    `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${ok ? "Unsubscribed" : "Unsubscribe"} — Jones Legacy Creations</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
         margin: 0; padding: 64px 24px; background: #f5f5f0; color: #1a1a1a; }
  .card { max-width: 480px; margin: 0 auto; background: #fff;
          border: 1px solid rgba(0,0,0,0.1); padding: 40px; }
  h1 { font-family: Georgia, serif; font-style: italic; font-size: 28px;
       margin: 0 0 16px; }
  p  { font-size: 15px; line-height: 1.6; color: #4a4a4a; margin: 0 0 16px; }
  a  { color: #1a1a1a; text-decoration: underline; }
  .ok    { border-left: 3px solid #10b981; padding-left: 16px; }
  .error { border-left: 3px solid #ef4444; padding-left: 16px; }
</style>
</head>
<body>
  <div class="card ${ok ? "ok" : "error"}">
    <h1>${ok ? "You're unsubscribed." : "Something went wrong."}</h1>
    <p>${message}</p>
    <p><a href="https://www.joneslegacycreations.com">Back to joneslegacycreations.com</a></p>
  </div>
</body>
</html>`,
    {
      status: ok ? 200 : 400,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    },
  );
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return page("Missing token. Use the link from your email.", false);
  }

  const supabase = createAdminClient();
  const { data: row, error } = await supabase
    .from("email_subscribers")
    .select("id, status, email")
    .eq("unsubscribe_token", token)
    .maybeSingle();

  if (error || !row) {
    return page(
      "That unsubscribe link isn't valid. If you keep getting our emails, reply to any of them and we'll remove you manually.",
      false,
    );
  }

  if (row.status === "unsubscribed") {
    return page(
      `<strong>${row.email}</strong> was already unsubscribed. You won't hear from us again.`,
      true,
    );
  }

  await supabase
    .from("email_subscribers")
    .update({
      status: "unsubscribed",
      unsubscribed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id);

  return page(
    `We've removed <strong>${row.email}</strong> from our list. Sorry to see you go — if there's something we could do better, drop us a note at <a href="mailto:office@joneslegacycreations.com">office@joneslegacycreations.com</a>.`,
    true,
  );
}
