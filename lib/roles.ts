// ── Role & Permission System ──────────────────────────────────────────────────
// To add a new role: add it to ROLES, define its permissions, and run the
// DB migration to update the check constraint on user_profiles.role.

export type RoleSlug =
  | "technical_director"
  | "owner"
  | "project_manager"
  | "office_manager"
  | "office_admin";

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
  // Settings
  | "settings:view"
  | "settings:edit";

// ── All permissions (convenience) ─────────────────────────────────────────────
const ALL_PERMISSIONS: Permission[] = [
  "dashboard:view",
  "projects:view", "projects:create", "projects:edit", "projects:delete",
  "quotes:view", "quotes:create", "quotes:edit", "quotes:delete", "quotes:send",
  "estimates:view", "estimates:manage",
  "contractors:view", "contractors:create", "contractors:edit", "contractors:delete",
  "financials:view", "financials:manage",
  "team:view", "team:manage", "team:delete",
  "settings:view", "settings:edit",
];

// ── Role Definitions ──────────────────────────────────────────────────────────
// Ordered by level descending (highest access first).

export const ROLES: Record<RoleSlug, RoleDefinition> = {
  technical_director: {
    slug: "technical_director",
    label: "Technical Director",
    description: "Full system access. Same as Owner.",
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
    description: "Manages projects, quotes, contractors, and financials.",
    level: 50,
    permissions: new Set<Permission>([
      "dashboard:view",
      "projects:view", "projects:create", "projects:edit",
      "quotes:view", "quotes:create", "quotes:edit", "quotes:send",
      "estimates:view", "estimates:manage",
      "contractors:view", "contractors:create", "contractors:edit",
      "financials:view", "financials:manage",
      "settings:view",
    ]),
  },
  office_manager: {
    slug: "office_manager",
    label: "Office Manager",
    description: "Manages day-to-day operations, financials, and contractors.",
    level: 40,
    permissions: new Set<Permission>([
      "dashboard:view",
      "projects:view", "projects:create", "projects:edit",
      "quotes:view", "quotes:create", "quotes:edit", "quotes:send",
      "estimates:view", "estimates:manage",
      "contractors:view", "contractors:create", "contractors:edit",
      "financials:view", "financials:manage",
      "settings:view",
    ]),
  },
  office_admin: {
    slug: "office_admin",
    label: "Office Administrator",
    description: "View access to projects, quotes, and estimates. Limited editing.",
    level: 20,
    permissions: new Set<Permission>([
      "dashboard:view",
      "projects:view",
      "quotes:view",
      "estimates:view",
      "contractors:view",
      "financials:view",
      "settings:view",
    ]),
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Ordered list of roles for dropdowns (highest level first) */
export const ROLE_OPTIONS = Object.values(ROLES)
  .sort((a, b) => b.level - a.level)
  .map((r) => ({ value: r.slug, label: r.label }));

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
