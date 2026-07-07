"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Shield,
  Loader2,
  UserPlus,
  HardHat,
  FolderOpen,
} from "lucide-react";
import toast from "react-hot-toast";
import { ROLE_OPTIONS, getRoleLabel, getRole, isContractor } from "@/lib/roles";
import { formatDate as fmtDate } from "@/lib/formatters";
import { confirmAction } from "@/lib/confirmAction";

interface TeamMember {
  id: string;
  auth_id: string;
  display_name: string;
  email: string;
  avatar_url: string | null;
  role: string;
  phone: string | null;
  title: string | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
}

interface ProjectOption {
  id: string;
  name: string;
}

type UserFilter = "all" | "staff" | "contractor";

function getInitials(name: string): string {
  return (
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?"
  );
}

function formatDate(dateStr: string | null): string {
  return fmtDate(dateStr) ?? "Never";
}

const ROLE_BADGE_COLORS: Record<string, string> = {
  technical_director: "bg-purple-50 text-purple-700",
  owner: "bg-indigo-50 text-indigo-700",
  project_manager: "bg-blue-50 text-blue-700",
  office_manager: "bg-emerald-50 text-emerald-700",
  office_admin: "bg-gray-100 text-gray-700",
  contractor: "bg-orange-50 text-orange-700",
};

export default function UsersAndAccessPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  // Map of contractor user_profile_id → assigned project ids.
  const [grants, setGrants] = useState<Record<string, string[]>>({});
  // Whether the caller can manage contractor access (drives the contractor UI).
  const [canManageContractors, setCanManageContractors] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<UserFilter>("all");

  const [showAddStaff, setShowAddStaff] = useState(false);
  const [showAddContractor, setShowAddContractor] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  // Contractor whose project assignments are being edited, + the working set.
  const [editingGrantsId, setEditingGrantsId] = useState<string | null>(null);
  const [grantDraft, setGrantDraft] = useState<string[]>([]);

  const [addStaffForm, setAddStaffForm] = useState({
    display_name: "",
    email: "",
    role: "office_admin" as string,
    title: "",
    phone: "",
  });
  const [addContractorForm, setAddContractorForm] = useState({
    display_name: "",
    email: "",
    phone: "",
    project_ids: [] as string[],
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const teamRes = await fetch("/api/admin/team");
      if (teamRes.status === 403) {
        toast.error("You don't have permission to view users");
        setLoading(false);
        return;
      }
      if (!teamRes.ok) throw new Error();
      setMembers(await teamRes.json());

      // Contractor access data is a separate permission (access:manage). If the
      // caller lacks it we still show the staff list, just without contractor
      // management.
      const accessRes = await fetch("/api/admin/contractor-access");
      if (accessRes.ok) {
        const { grants: grantRows, projects: projectRows } = await accessRes.json();
        const byUser: Record<string, string[]> = {};
        for (const g of grantRows as { user_profile_id: string; project_id: string }[]) {
          (byUser[g.user_profile_id] ??= []).push(g.project_id);
        }
        setGrants(byUser);
        setProjects(projectRows);
        setCanManageContractors(true);
      }
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const projectName = useCallback(
    (id: string) => projects.find((p) => p.id === id)?.name ?? "Unknown project",
    [projects]
  );

  // ── Staff add / edit (via /api/admin/team) ────────────────────────────────
  const handleAddStaff = async () => {
    if (!addStaffForm.display_name || !addStaffForm.email || !addStaffForm.role) {
      toast.error("Name, email, and role are required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addStaffForm),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error ?? "Failed to add member");
      }
      toast.success("Team member added");
      setShowAddStaff(false);
      setAddStaffForm({ display_name: "", email: "", role: "office_admin", title: "", phone: "" });
      await fetchAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add member");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Contractor add (via /api/admin/contractor-access) ─────────────────────
  const handleAddContractor = async () => {
    if (!addContractorForm.display_name || !addContractorForm.email) {
      toast.error("Name and email are required");
      return;
    }
    if (addContractorForm.project_ids.length === 0) {
      toast.error("Assign at least one project");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/contractor-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addContractorForm),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error ?? "Failed to add contractor");
      }
      toast.success("Contractor added — they can now sign in with Google");
      setShowAddContractor(false);
      setAddContractorForm({ display_name: "", email: "", phone: "", project_ids: [] });
      await fetchAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add contractor");
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (member: TeamMember) => {
    setEditingId(member.id);
    setEditForm({
      display_name: member.display_name,
      email: member.email,
      role: member.role,
      title: member.title || "",
      phone: member.phone || "",
    });
  };

  const handleUpdate = async (member: TeamMember) => {
    setSubmitting(true);
    try {
      // Contractors have no assignable staff role — only edit their profile
      // fields, never the role select.
      const payload = isContractor(member.role)
        ? {
            display_name: editForm.display_name,
            email: editForm.email,
            phone: editForm.phone,
          }
        : editForm;
      const res = await fetch(`/api/admin/team/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error ?? "Failed to update");
      }
      toast.success("User updated");
      setEditingId(null);
      await fetchAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (member: TeamMember) => {
    try {
      const res = await fetch(`/api/admin/team/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !member.is_active }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error ?? "Failed to update");
      }
      toast.success(member.is_active ? "Access revoked" : "Access restored");
      await fetchAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update");
    }
  };

  const handleDelete = async (member: TeamMember) => {
    const confirmed = await confirmAction(
      `Permanently delete ${member.display_name || member.email}? This removes their login and cannot be undone.`
    );
    if (!confirmed) return;
    try {
      // Contractors are deleted through the access endpoint (access:manage);
      // staff through the team endpoint (team:delete).
      const url = isContractor(member.role)
        ? `/api/admin/contractor-access/${member.id}`
        : `/api/admin/team/${member.id}`;
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error ?? "Failed to delete");
      }
      toast.success("User deleted");
      await fetchAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete");
    }
  };

  // ── Contractor project assignments ────────────────────────────────────────
  const startEditGrants = (member: TeamMember) => {
    setEditingGrantsId(member.id);
    setGrantDraft(grants[member.id] ?? []);
  };

  const toggleGrantDraft = (projectId: string) => {
    setGrantDraft((prev) =>
      prev.includes(projectId) ? prev.filter((p) => p !== projectId) : [...prev, projectId]
    );
  };

  const saveGrants = async (member: TeamMember) => {
    if (grantDraft.length === 0) {
      toast.error("A contractor must be assigned at least one project");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/contractor-access/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_ids: grantDraft }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error ?? "Failed to update projects");
      }
      toast.success("Project access updated");
      setEditingGrantsId(null);
      await fetchAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update projects");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleAddContractorProject = (projectId: string) => {
    setAddContractorForm((prev) => ({
      ...prev,
      project_ids: prev.project_ids.includes(projectId)
        ? prev.project_ids.filter((p) => p !== projectId)
        : [...prev.project_ids, projectId],
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  const visibleMembers = members.filter((m) => {
    if (filter === "staff") return !isContractor(m.role);
    if (filter === "contractor") return isContractor(m.role);
    return true;
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/admin/settings" className="text-gray-400 hover:text-gray-600">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Users &amp; Access</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Everyone who can sign in — staff and project contractors
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {canManageContractors && (
            <Button
              variant="outline"
              onClick={() => {
                setShowAddContractor((v) => !v);
                setShowAddStaff(false);
              }}
            >
              <HardHat className="w-4 h-4 mr-1.5" />
              Add Contractor
            </Button>
          )}
          <Button
            onClick={() => {
              setShowAddStaff((v) => !v);
              setShowAddContractor(false);
            }}
          >
            <UserPlus className="w-4 h-4 mr-1.5" />
            Add Staff
          </Button>
        </div>
      </div>

      {/* Add Staff Form */}
      {showAddStaff && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">New Staff Member</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <Input
                value={addStaffForm.display_name}
                onChange={(e) => setAddStaffForm((p) => ({ ...p, display_name: e.target.value }))}
                placeholder="Full name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <Input
                type="email"
                value={addStaffForm.email}
                onChange={(e) => setAddStaffForm((p) => ({ ...p, email: e.target.value }))}
                placeholder="user@company.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
              <Select
                options={ROLE_OPTIONS}
                value={addStaffForm.role}
                onChange={(e) => setAddStaffForm((p) => ({ ...p, role: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <Input
                value={addStaffForm.title}
                onChange={(e) => setAddStaffForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="e.g. Project Manager"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <Input
                value={addStaffForm.phone}
                onChange={(e) => setAddStaffForm((p) => ({ ...p, phone: e.target.value }))}
                placeholder="(801) 555-0100"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => setShowAddStaff(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleAddStaff} isLoading={submitting}>
              <Plus className="w-4 h-4 mr-1" />
              Add Staff
            </Button>
          </div>
        </div>
      )}

      {/* Add Contractor Form */}
      {showAddContractor && canManageContractors && (
        <div className="bg-white rounded-lg border border-orange-200 shadow-sm p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-2">
            <HardHat className="w-4 h-4 text-orange-600" />
            New Contractor Login
          </h3>
          <p className="text-xs text-gray-500 mb-4">
            They sign in with the Google account on this email and see only the
            projects you assign.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <Input
                value={addContractorForm.display_name}
                onChange={(e) =>
                  setAddContractorForm((p) => ({ ...p, display_name: e.target.value }))
                }
                placeholder="Full name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Google email *
              </label>
              <Input
                type="email"
                value={addContractorForm.email}
                onChange={(e) => setAddContractorForm((p) => ({ ...p, email: e.target.value }))}
                placeholder="contractor@gmail.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <Input
                value={addContractorForm.phone}
                onChange={(e) => setAddContractorForm((p) => ({ ...p, phone: e.target.value }))}
                placeholder="(801) 555-0100"
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assign projects *
            </label>
            {projects.length === 0 ? (
              <p className="text-sm text-gray-400">No projects available.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto rounded-lg border border-gray-200 p-3">
                {projects.map((p) => (
                  <label
                    key={p.id}
                    className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer py-1"
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      checked={addContractorForm.project_ids.includes(p.id)}
                      onChange={() => toggleAddContractorProject(p.id)}
                    />
                    <span className="truncate">{p.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => setShowAddContractor(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleAddContractor} isLoading={submitting}>
              <Plus className="w-4 h-4 mr-1" />
              Add Contractor
            </Button>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex rounded-lg border border-gray-300 overflow-hidden w-fit">
        {(["all", "staff", "contractor"] as UserFilter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
              filter === f
                ? "bg-gray-900 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            } ${f !== "all" ? "border-l border-gray-300" : ""}`}
            style={{ minHeight: 40 }}
          >
            {f === "all" ? "Everyone" : f === "staff" ? "Staff" : "Contractors"}
          </button>
        ))}
      </div>

      {/* Members List */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {visibleMembers.length === 0 ? (
          <div className="p-12 text-center">
            <Shield className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No users found</h3>
            <p className="mt-2 text-sm text-gray-500">
              {filter === "contractor"
                ? "Add a contractor to give them scoped project access."
                : "Add your first user above."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {visibleMembers.map((member) => {
              const isEditing = editingId === member.id;
              const isEditingGrants = editingGrantsId === member.id;
              const contractor = isContractor(member.role);
              const assigned = grants[member.id] ?? [];

              return (
                <div key={member.id} className="p-4 sm:px-6">
                  {isEditing ? (
                    /* Edit mode */
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <Input
                          value={editForm.display_name}
                          onChange={(e) => setEditForm((p) => ({ ...p, display_name: e.target.value }))}
                          placeholder="Name"
                        />
                        <Input
                          value={editForm.email}
                          onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                          placeholder="Email"
                        />
                        {contractor ? (
                          <Input
                            value={editForm.phone}
                            onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))}
                            placeholder="Phone"
                          />
                        ) : (
                          <Select
                            options={ROLE_OPTIONS}
                            value={editForm.role}
                            onChange={(e) => setEditForm((p) => ({ ...p, role: e.target.value }))}
                          />
                        )}
                      </div>
                      {!contractor && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <Input
                            value={editForm.title}
                            onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
                            placeholder="Title"
                          />
                          <Input
                            value={editForm.phone}
                            onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))}
                            placeholder="Phone"
                          />
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleUpdate(member)} isLoading={submitting}>
                          <Check className="w-4 h-4 mr-1" />
                          Save
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setEditingId(null)}>
                          <X className="w-4 h-4 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* View mode */
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      {member.avatar_url ? (
                        <Image
                          src={member.avatar_url}
                          alt={member.display_name}
                          width={40}
                          height={40}
                          className="w-10 h-10 rounded-full object-cover border border-gray-200 flex-shrink-0"
                        />
                      ) : (
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0 ${
                            contractor ? "bg-orange-500" : "bg-slate-800"
                          }`}
                        >
                          {contractor ? <HardHat className="w-5 h-5" /> : getInitials(member.display_name)}
                        </div>
                      )}

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-gray-900 truncate">
                            {member.display_name || member.email}
                          </span>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              ROLE_BADGE_COLORS[member.role] ?? "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {getRoleLabel(member.role)}
                          </span>
                          {!member.is_active && (
                            <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                              Inactive
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500 flex-wrap">
                          <span>{member.email}</span>
                          {member.title && (
                            <>
                              <span className="text-gray-300">&middot;</span>
                              <span>{member.title}</span>
                            </>
                          )}
                          <span className="text-gray-300">&middot;</span>
                          <span>Last login: {formatDate(member.last_login_at)}</span>
                        </div>
                        {/* Contractor project assignments */}
                        {contractor && (
                          <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                            <FolderOpen className="w-3.5 h-3.5 text-gray-400" />
                            {assigned.length === 0 ? (
                              <span className="text-xs text-amber-600">No projects assigned</span>
                            ) : (
                              assigned.map((pid) => (
                                <span
                                  key={pid}
                                  className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700"
                                >
                                  {projectName(pid)}
                                </span>
                              ))
                            )}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {contractor && canManageContractors && (
                          <button
                            type="button"
                            onClick={() => startEditGrants(member)}
                            className="min-h-[44px] px-3 py-2 text-xs font-medium text-indigo-700 rounded-lg hover:bg-indigo-50 transition-colors"
                            title="Manage project access"
                          >
                            Projects
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => startEdit(member)}
                          className="h-11 w-11 inline-flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                          title="Edit"
                          aria-label={`Edit ${member.display_name || member.email}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleActive(member)}
                          className={`min-h-[44px] px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                            member.is_active
                              ? "text-amber-700 hover:bg-amber-50"
                              : "text-green-700 hover:bg-green-50"
                          }`}
                          title={member.is_active ? "Revoke access" : "Restore access"}
                        >
                          {member.is_active ? "Revoke" : "Restore"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(member)}
                          className="h-11 w-11 inline-flex items-center justify-center text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                          title="Delete"
                          aria-label={`Delete ${member.display_name || member.email}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Manage project access panel */}
                  {isEditingGrants && (
                    <div className="mt-4 rounded-lg border border-indigo-200 bg-indigo-50/40 p-4">
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">
                        Projects for {member.display_name || member.email}
                      </h4>
                      {projects.length === 0 ? (
                        <p className="text-sm text-gray-400">No projects available.</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                          {projects.map((p) => (
                            <label
                              key={p.id}
                              className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer py-1"
                            >
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                checked={grantDraft.includes(p.id)}
                                onChange={() => toggleGrantDraft(p.id)}
                              />
                              <span className="truncate">{p.name}</span>
                            </label>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2 mt-3">
                        <Button size="sm" onClick={() => saveGrants(member)} isLoading={submitting}>
                          <Check className="w-4 h-4 mr-1" />
                          Save
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setEditingGrantsId(null)}>
                          <X className="w-4 h-4 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Role Legend */}
      <div className="flex flex-wrap gap-2">
        {[...ROLE_OPTIONS, { value: "contractor", label: "Contractor" }].map((r) => {
          const def = getRole(r.value);
          return (
            <div key={r.value} className="flex items-center gap-1.5 text-xs" title={def?.description}>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium ${
                  ROLE_BADGE_COLORS[r.value] ?? "bg-gray-100 text-gray-700"
                }`}
              >
                {r.label}
              </span>
              {def && <span className="text-gray-400">Lv{def.level}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
