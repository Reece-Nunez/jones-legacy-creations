import { requirePagePermission } from "@/lib/auth/requirePagePermission";

/**
 * Guards /admin/settings and /admin/settings/team.
 *
 * The settings page itself is a client component, so it can't run the
 * server-side check inline — the guard lives here instead, where it also
 * covers the team page. Every role that can administer users also holds
 * settings:view, so one permission covers both; Project Managers hold
 * neither and land back on the dashboard.
 */
export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePagePermission("settings:view");
  return <>{children}</>;
}
