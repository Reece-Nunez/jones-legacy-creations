// ── Role & Permission System ──────────────────────────────────────────────────
// To add a new role: add it to ROLES, define its permissions, and run the
// DB migration to update the check constraint on user_profiles.role.

export type RoleSlug =
  | "technical_director"
  | "owner"
  | "project_manager"
  | "office_manager"
  | "office_admin"
  | "contractor";

/** The role slug for external, project-scoped subcontractor logins. */
export const CONTRACTOR_ROLE: RoleSlug = "contractor";

export interface RoleDefinition {
  slug: RoleSlug;
  label: string;
  description: string;
  level: number; // Higher = more access. Used for "can this user edit that user" checks.
  permissions: Set<Permission>;
}

// ── Permissions ───────────────────────────────────────────────────────────────
// Granular capabilities. Add new ones here as the app grows.
export type Permission =
  // Dashboard
  | "dashboard:view"
  // Projects
  | "projects:view"
  | "projects:create"
  | "projects:edit"
  | "projects:delete"
  // Quotes
  | "quotes:view"
  | "quotes:create"
  | "quotes:edit"
  | "quotes:delete"
  | "quotes:send"
  // Estimates
  | "estimates:view"
  | "estimates:manage"
  // Contractors
  | "contractors:view"
  | "contractors:create"
  | "contractors:edit"
  | "contractors:delete"
  // Financials
  | "financials:view"
  | "financials:manage"
  // Team / Users
  | "team:view"
  | "team:manage"
  | "team:delete"
  // Website / marketing surface: blog posts, testimonials, real-estate
  // listings, construction showcases, email subscribers. Deliberately does
  // NOT cover Leads — see CONSTRUCTION_PERMISSIONS.
  | "website:view"
  | "website:manage"
  // Contractor access (manage project-scoped contractor logins + grants)
  | "access:manage"
  // Settings
  | "settings:view"
  | "settings:edit";

// ── Permission Groups ─────────────────────────────────────────────────────────
const ALL_PERMISSIONS: Permission[] = [
  "dashboard:view",
  "projects:view", "projects:create", "projects:edit", "projects:delete",
  "quotes:view", "quotes:create", "quotes:edit", "quotes:delete", "quotes:send",
  "estimates:view", "estimates:manage",
  "contractors:view", "contractors:create", "contractors:edit", "contractors:delete",
  "financials:view", "financials:manage",
  "team:view", "team:manage", "team:delete",
  "website:view", "website:manage",
  "access:manage",
  "settings:view", "settings:edit",
];

/** Everything except user administration (team management + contractor access) */
const STANDARD_PERMISSIONS: Permission[] = ALL_PERMISSIONS.filter(
  (p) => !p.startsWith("team:") && p !== "access:manage"
);

/**
 * Construction-side only. Project Managers run jobs; they don't run the
 * marketing site and don't administer the company.
 *
 * Excluded: website:* (blog, testimonials, listings, showcases, subscribers),
 * settings:* (company address, license, integrations), and the team:* /
 * access:manage user administration already withheld by STANDARD_PERMISSIONS.
 *
 * Leads are deliberately NOT excluded. They arrive from the public site but a
 * large share are construction intake and estimate requests a PM needs to act
 * on, so they stay on the construction side of the line.
 */
const CONSTRUCTION_PERMISSIONS: Permission[] = STANDARD_PERMISSIONS.filter(
  (p) => !p.startsWith("website:") && !p.startsWith("settings:")
);

/**
 * A project-scoped contractor: read-only visibility into their granted
 * project(s). Limited writes (document upload, task status) are enforced by
 * RLS + specific API routes, not by these coarse permission gates.
 */
const CONTRACTOR_PERMISSIONS: Permission[] = [
  "dashboard:view",
  "projects:view",
  "financials:view",
  "estimates:view",
  "quotes:view",
];

// ── Role Definitions ──────────────────────────────────────────────────────────
// Owner, Technical Director, and Office Manager can manage users (including
// contractor logins); Project Manager and Office Admin cannot. `canManageRole`
// (level check) additionally prevents anyone from editing/deleting a user at a
// higher level than their own, so Office Manager (60) can administer PMs (50)
// and Office Admins (20) but never Owner/TD (100).
//
// Project Manager is the one role scoped by feature area rather than by
// administrative reach: construction only, no website surface, no settings.
//
// `contractor` is an external, project-scoped login — not staff. It carries
// read-only view permissions; its data access is confined to granted projects
// by RLS (see the contractor_project_access migration), NOT by these gates.

export const ROLES: Record<RoleSlug, RoleDefinition> = {
  technical_director: {
    slug: "technical_director",
    label: "Technical Director",
    description: "Full system access including team management.",
    level: 100,
    permissions: new Set(ALL_PERMISSIONS),
  },
  owner: {
    slug: "owner",
    label: "Owner",
    description: "Full system access including team management.",
    level: 100,
    permissions: new Set(ALL_PERMISSIONS),
  },
  project_manager: {
    slug: "project_manager",
    label: "Project Manager",
    description:
      "Construction side only — projects, quotes, estimates, contractors, financials, and leads. No website content, company settings, or user management.",
    level: 50,
    permissions: new Set(CONSTRUCTION_PERMISSIONS),
  },
  office_manager: {
    slug: "office_manager",
    // Level 60 (was 40) so they outrank Project Managers. They are expected to
    // add users and grant contractor access, and canManageRole is a level
    // comparison — at 40 they held team:manage but still couldn't edit or
    // delete a PM (50), which made "adding users" only half work. Still below
    // Owner/TD (100), so they can't touch those two.
    label: "Office Manager",
    description: "Full access including user and contractor-access management.",
    level: 60,
    permissions: new Set(ALL_PERMISSIONS),
  },
  office_admin: {
    slug: "office_admin",
    label: "Office Administrator",
    description: "Full access to all features except user management.",
    level: 20,
    permissions: new Set(STANDARD_PERMISSIONS),
  },
  contractor: {
    slug: "contractor",
    label: "Contractor",
    description: "External subcontractor — read-only access to assigned project(s) only.",
    level: 10,
    permissions: new Set(CONTRACTOR_PERMISSIONS),
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Ordered STAFF roles for the team assignment dropdown (highest level first).
 * Excludes `contractor`, which is provisioned through the contractor-access
 * flow with a project picker, not the plain role dropdown.
 */
export const ROLE_OPTIONS = Object.values(ROLES)
  .filter((r) => r.slug !== CONTRACTOR_ROLE)
  .sort((a, b) => b.level - a.level)
  .map((r) => ({ value: r.slug, label: r.label }));

/** True if the role is the external project-scoped contractor login. */
export function isContractor(role: string): boolean {
  return role === CONTRACTOR_ROLE;
}

/** True if the role may manage contractor logins + project access grants. */
export function canManageAccess(role: string): boolean {
  return hasPermission(role, "access:manage");
}

/** Check if a role has a specific permission */
export function hasPermission(role: string, permission: Permission): boolean {
  const def = ROLES[role as RoleSlug];
  if (!def) return false;
  return def.permissions.has(permission);
}

/** Check if roleA can manage roleB (same or higher level) */
export function canManageRole(managerRole: string, targetRole: string): boolean {
  const manager = ROLES[managerRole as RoleSlug];
  const target = ROLES[targetRole as RoleSlug];
  if (!manager || !target) return false;
  return manager.level >= target.level;
}

/** Get role definition safely */
export function getRole(slug: string): RoleDefinition | null {
  return ROLES[slug as RoleSlug] ?? null;
}

/** Get display label for a role */
export function getRoleLabel(slug: string): string {
  return ROLES[slug as RoleSlug]?.label ?? slug;
}

/** All role slugs as array (for DB constraints) */
export const ALL_ROLE_SLUGS: RoleSlug[] = Object.keys(ROLES) as RoleSlug[];
