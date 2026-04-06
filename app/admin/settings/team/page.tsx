"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
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
} from "lucide-react";
import toast from "react-hot-toast";
import { ROLE_OPTIONS, getRoleLabel, getRole } from "@/lib/roles";
import type { RoleSlug } from "@/lib/roles";

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

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Never";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const ROLE_BADGE_COLORS: Record<string, string> = {
  technical_director: "bg-purple-50 text-purple-700",
  owner: "bg-indigo-50 text-indigo-700",
  project_manager: "bg-blue-50 text-blue-700",
  office_manager: "bg-emerald-50 text-emerald-700",
  office_admin: "bg-gray-100 text-gray-700",
};

export default function TeamManagementPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [addForm, setAddForm] = useState({
    display_name: "",
    email: "",
    role: "office_admin" as string,
    title: "",
    phone: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchTeam = async () => {
    try {
      const res = await fetch("/api/admin/team");
      if (res.status === 403) {
        toast.error("You don't have permission to view team members");
        setLoading(false);
        return;
      }
      if (!res.ok) throw new Error();
      const data = await res.json();
      setMembers(data);
    } catch {
      toast.error("Failed to load team");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
  }, []);

  const handleAdd = async () => {
    if (!addForm.display_name || !addForm.email || !addForm.role) {
      toast.error("Name, email, and role are required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error ?? "Failed to add member");
      }
      toast.success("Team member added");
      setShowAddForm(false);
      setAddForm({ display_name: "", email: "", role: "office_admin", title: "", phone: "" });
      await fetchTeam();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add member");
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

  const handleUpdate = async (id: string) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/team/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error ?? "Failed to update");
      }
      toast.success("Member updated");
      setEditingId(null);
      await fetchTeam();
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
      toast.success(member.is_active ? "User deactivated" : "User activated");
      await fetchTeam();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update");
    }
  };

  const handleDelete = async (member: TeamMember) => {
    const confirmed = await new Promise<boolean>((resolve) => {
      toast(
        (t) => (
          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium">Permanently delete {member.display_name}? This cannot be undone.</p>
            <div className="flex gap-2">
              <button
                onClick={() => { toast.dismiss(t.id); resolve(true); }}
                className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-md hover:bg-red-700 transition-colors"
              >
                Yes, Delete
              </button>
              <button
                onClick={() => { toast.dismiss(t.id); resolve(false); }}
                className="px-3 py-1.5 bg-gray-600 text-white text-xs font-medium rounded-md hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ),
        { duration: Infinity }
      );
    });
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/admin/team/${member.id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error ?? "Failed to delete");
      }
      toast.success("Member deleted");
      await fetchTeam();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/settings" className="text-gray-400 hover:text-gray-600">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Team Members</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Manage users, roles, and access
            </p>
          </div>
        </div>
        <Button onClick={() => setShowAddForm(!showAddForm)}>
          <UserPlus className="w-4 h-4 mr-1.5" />
          Add Member
        </Button>
      </div>

      {/* Add Member Form */}
      {showAddForm && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">New Team Member</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <Input
                value={addForm.display_name}
                onChange={(e) => setAddForm((p) => ({ ...p, display_name: e.target.value }))}
                placeholder="Full name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <Input
                type="email"
                value={addForm.email}
                onChange={(e) => setAddForm((p) => ({ ...p, email: e.target.value }))}
                placeholder="user@company.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
              <Select
                options={ROLE_OPTIONS}
                value={addForm.role}
                onChange={(e) => setAddForm((p) => ({ ...p, role: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <Input
                value={addForm.title}
                onChange={(e) => setAddForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="e.g. Project Manager"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <Input
                value={addForm.phone}
                onChange={(e) => setAddForm((p) => ({ ...p, phone: e.target.value }))}
                placeholder="(801) 555-0100"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => setShowAddForm(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleAdd} isLoading={submitting}>
              <Plus className="w-4 h-4 mr-1" />
              Add Member
            </Button>
          </div>
        </div>
      )}

      {/* Role Legend */}
      <div className="flex flex-wrap gap-2">
        {ROLE_OPTIONS.map((r) => {
          const def = getRole(r.value);
          return (
            <div
              key={r.value}
              className="flex items-center gap-1.5 text-xs"
              title={def?.description}
            >
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium ${ROLE_BADGE_COLORS[r.value] ?? "bg-gray-100 text-gray-700"}`}>
                {r.label}
              </span>
              {def && <span className="text-gray-400">Lv{def.level}</span>}
            </div>
          );
        })}
      </div>

      {/* Members List */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {members.length === 0 ? (
          <div className="p-12 text-center">
            <Shield className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No team members</h3>
            <p className="mt-2 text-sm text-gray-500">Add your first team member above.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {members.map((member) => {
              const isEditing = editingId === member.id;

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
                        <Select
                          options={ROLE_OPTIONS}
                          value={editForm.role}
                          onChange={(e) => setEditForm((p) => ({ ...p, role: e.target.value }))}
                        />
                      </div>
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
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleUpdate(member.id)} isLoading={submitting}>
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
                        <img
                          src={member.avatar_url}
                          alt={member.display_name}
                          className="w-10 h-10 rounded-full object-cover border border-gray-200 flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                          {getInitials(member.display_name)}
                        </div>
                      )}

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-gray-900 truncate">
                            {member.display_name}
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
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
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
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => startEdit(member)}
                          className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleActive(member)}
                          className={`px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                            member.is_active
                              ? "text-amber-700 hover:bg-amber-50"
                              : "text-green-700 hover:bg-green-50"
                          }`}
                          title={member.is_active ? "Deactivate" : "Activate"}
                        >
                          {member.is_active ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(member)}
                          className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
