import { describe, it, expect } from "vitest";
import {
  ROLES,
  hasPermission,
  canManageRole,
  ROLE_OPTIONS,
  ALL_ROLE_SLUGS,
  type Permission,
} from "./roles";

const FULL_ACCESS = ["technical_director", "owner", "office_manager"] as const;

describe("role permissions", () => {
  it("gives Owner and Technical Director everything", () => {
    for (const slug of ["owner", "technical_director"] as const) {
      for (const p of ["team:manage", "access:manage", "website:manage", "settings:edit", "financials:manage"] as Permission[]) {
        expect(hasPermission(slug, p), `${slug} should have ${p}`).toBe(true);
      }
    }
  });

  it("gives Office Manager the same permission set as the owners", () => {
    // They grant contractor access and add users, so they need the full set.
    for (const p of ROLES.owner.permissions) {
      expect(hasPermission("office_manager", p), `office_manager missing ${p}`).toBe(true);
    }
  });

  describe("Project Manager — construction only", () => {
    it("keeps the construction surface", () => {
      for (const p of [
        "dashboard:view",
        "projects:view", "projects:create", "projects:edit", "projects:delete",
        "quotes:view", "quotes:send",
        "estimates:manage",
        "contractors:edit",
        "financials:view", "financials:manage",
      ] as Permission[]) {
        expect(hasPermission("project_manager", p), `PM should have ${p}`).toBe(true);
      }
    });

    it("loses the website surface", () => {
      expect(hasPermission("project_manager", "website:view")).toBe(false);
      expect(hasPermission("project_manager", "website:manage")).toBe(false);
    });

    it("loses company settings entirely", () => {
      expect(hasPermission("project_manager", "settings:view")).toBe(false);
      expect(hasPermission("project_manager", "settings:edit")).toBe(false);
    });

    it("still has no user administration", () => {
      for (const p of ["team:view", "team:manage", "team:delete", "access:manage"] as Permission[]) {
        expect(hasPermission("project_manager", p)).toBe(false);
      }
    });
  });

  it("keeps the website surface for office_admin", () => {
    // Office Admin runs marketing content; only user administration is withheld.
    expect(hasPermission("office_admin", "website:manage")).toBe(true);
    expect(hasPermission("office_admin", "settings:edit")).toBe(true);
    expect(hasPermission("office_admin", "team:manage")).toBe(false);
  });

  it("leaves contractors read-only and off the website surface", () => {
    expect(hasPermission("contractor", "website:view")).toBe(false);
    expect(hasPermission("contractor", "projects:edit")).toBe(false);
    expect(hasPermission("contractor", "projects:view")).toBe(true);
  });

  it("denies unknown roles everything", () => {
    expect(hasPermission("wat", "projects:view")).toBe(false);
    expect(hasPermission("", "dashboard:view")).toBe(false);
  });
});

describe("canManageRole", () => {
  it("lets Office Manager administer Project Managers", () => {
    // The point of the level bump: at 40 they held team:manage but couldn't
    // actually edit or delete a PM (50).
    expect(canManageRole("office_manager", "project_manager")).toBe(true);
    expect(canManageRole("office_manager", "office_admin")).toBe(true);
    expect(canManageRole("office_manager", "contractor")).toBe(true);
  });

  it("still keeps Office Manager away from Owner and Technical Director", () => {
    expect(canManageRole("office_manager", "owner")).toBe(false);
    expect(canManageRole("office_manager", "technical_director")).toBe(false);
  });

  it("lets the owners manage everyone", () => {
    for (const target of ALL_ROLE_SLUGS) {
      expect(canManageRole("owner", target), `owner should manage ${target}`).toBe(true);
      expect(canManageRole("technical_director", target)).toBe(true);
    }
  });

  it("does not let a PM manage anyone at or above their level", () => {
    expect(canManageRole("project_manager", "office_manager")).toBe(false);
    expect(canManageRole("project_manager", "owner")).toBe(false);
  });

  it("returns false for unknown roles on either side", () => {
    expect(canManageRole("nope", "owner")).toBe(false);
    expect(canManageRole("owner", "nope")).toBe(false);
  });
});

describe("ROLE_OPTIONS", () => {
  it("excludes contractor and is ordered by descending level", () => {
    expect(ROLE_OPTIONS.map((o) => o.value)).not.toContain("contractor");
    const levels = ROLE_OPTIONS.map((o) => ROLES[o.value as keyof typeof ROLES].level);
    expect(levels).toEqual([...levels].sort((a, b) => b - a));
  });

  it("puts Office Manager above Project Manager after the bump", () => {
    const slugs = ROLE_OPTIONS.map((o) => o.value);
    expect(slugs.indexOf("office_manager")).toBeLessThan(slugs.indexOf("project_manager"));
  });
});

describe("full-access roles agree with each other", () => {
  it("has an identical permission set across TD, owner, office_manager", () => {
    const sets = FULL_ACCESS.map((r) => [...ROLES[r].permissions].sort().join(","));
    expect(new Set(sets).size).toBe(1);
  });
});
