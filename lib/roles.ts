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
  "access:manage",
  "settings:view", "settings:edit",
];

/** Everything except user administration (team management + contractor access) */
const STANDARD_PERMISSIONS: Permission[] = ALL_PERMISSIONS.filter(
  (p) => !p.startsWith("team:") && p !== "access:manage"
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
// Staff roles differ mainly in user-administration reach. Owner, Technical
// Director, and Office Manager can manage users (including contractor logins);
// Project Manager and Office Admin cannot. `canManageRole` (level check) still
// prevents anyone from editing/deleting a user at a higher level than their own,
// so Office Manager (40) can never touch Owner/TD (100) or PMs (50).
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
    description: "Full access to all features except user management.",
    level: 50,
    permissions: new Set(STANDARD_PERMISSIONS),
  },
  office_manager: {
    slug: "office_manager",
    label: "Office Manager",
    description: "Full access including user and contractor-access management.",
    level: 40,
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
