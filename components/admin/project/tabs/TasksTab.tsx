"use client";

import { useState, useEffect } from "react";
import { Check, Edit3, UserCircle, X } from "lucide-react";
import type { Task, TeamMember } from "@/lib/types/database";
import { confirmAction } from "@/lib/confirmAction";
import {
  Card as ShadCard, CardHeader, CardTitle, CardContent,
} from "@/components/ui/card";
import { EmptyState } from "@/components/admin/project/shared/Primitives";
import { EditOnly } from "@/components/admin/project/shared/EditContext";
import { fmtDate } from "@/components/admin/project/shared/format";

export function TasksTab({
  projectId,
  tasks,
  mutate,
  loading,
}: {
  projectId: string;
  tasks: Task[];
  mutate: (
    url: string,
    method: string,
    body?: Record<string, unknown>,
  ) => Promise<Response | undefined>;
  loading: boolean;
}) {
  const [newTitle, setNewTitle] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newAssignee, setNewAssignee] = useState("");
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [editTaskForm, setEditTaskForm] = useState({
    title: "",
    due_date: "",
    assigned_to: "",
  });

  useEffect(() => {
    fetch("/api/admin/team")
      .then((res) => res.json())
      .then((data) => { if (Array.isArray(data)) setTeamMembers(data); })
      .catch((err) => {
        console.warn("Failed to load team list", err);
      });
  }, []);

  function startEditTask(t: Task) {
    setEditingTask(t.id);
    setEditTaskForm({
      title: t.title,
      due_date: t.due_date ?? "",
      assigned_to: t.assigned_to ?? "",
    });
  }

  async function saveEditTask(id: string) {
    await mutate(`/api/admin/projects/${projectId}/tasks/${id}`, "PATCH", {
      title: editTaskForm.title,
      due_date: editTaskForm.due_date || null,
      assigned_to: editTaskForm.assigned_to || null,
    });
    setEditingTask(null);
  }

  async function addTask() {
    if (!newTitle.trim()) return;
    await mutate(`/api/admin/projects/${projectId}/tasks`, "POST", {
      title: newTitle.trim(),
      due_date: newDueDate || null,
      assigned_to: newAssignee || null,
      sort_order: tasks.length,
    });
    setNewTitle("");
    setNewDueDate("");
    setNewAssignee("");
  }

  async function toggleTask(t: Task) {
    await mutate(`/api/admin/projects/${projectId}/tasks/${t.id}`, "PATCH", {
      completed: !t.completed,
    });
  }

  async function deleteTask(id: string) {
    if (!(await confirmAction("Delete this task?"))) return;
    await mutate(`/api/admin/projects/${projectId}/tasks/${id}`, "DELETE");
  }

  const incomplete = tasks.filter((t) => !t.completed);
  const completed = tasks.filter((t) => t.completed);

  return (
    <ShadCard>
      <CardHeader>
        <CardTitle>Tasks</CardTitle>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 && (
          <EmptyState label="No tasks yet" />
        )}

        <div className="divide-y divide-gray-100">
          {incomplete.map((t) => (
            <div key={t.id}>
              {editingTask === t.id ? (
                <div className="bg-gray-50 rounded-lg p-3 my-2 space-y-3">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1">
                      <label className="block text-xs text-gray-600 font-medium mb-1">Title</label>
                      <input
                        value={editTaskForm.title}
                        onChange={(e) => setEditTaskForm({ ...editTaskForm, title: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 font-medium mb-1">Due Date</label>
                      <input
                        type="date"
                        value={editTaskForm.due_date}
                        onChange={(e) => setEditTaskForm({ ...editTaskForm, due_date: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 font-medium mb-1">Assign To</label>
                      <select
                        value={editTaskForm.assigned_to}
                        onChange={(e) => setEditTaskForm({ ...editTaskForm, assigned_to: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                      >
                        <option value="">Unassigned</option>
                        {teamMembers.map((m) => (
                          <option key={m.email} value={m.email}>{m.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      disabled={loading}
                      onClick={() => saveEditTask(t.id)}
                      className="bg-black text-white px-3 py-2 min-h-[36px] rounded-lg text-xs hover:bg-gray-800 disabled:opacity-50 cursor-pointer transition-colors"
                    >
                      {loading ? "Saving..." : "Save Changes"}
                    </button>
                    <button
                      onClick={() => setEditingTask(null)}
                      className="text-xs text-gray-600 px-3 py-2 min-h-[36px] border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 py-2.5">
                  <button
                    disabled={loading}
                    aria-label={`Mark "${t.title}" as complete`}
                    onClick={() => toggleTask(t)}
                    className="w-6 h-6 rounded border-2 border-gray-300 hover:border-black flex-shrink-0 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-gray-900">{t.title}</span>
                    {t.assigned_to && (
                      <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700">
                        <UserCircle className="w-3 h-3" />
                        {teamMembers.find((m) => m.email === t.assigned_to)?.name || t.assigned_to}
                      </span>
                    )}
                  </div>
                  {t.due_date && (
                    <span className="text-xs text-gray-500 shrink-0">{fmtDate(t.due_date)}</span>
                  )}
                  <EditOnly>
                  <button
                    disabled={loading}
                    aria-label={`Edit task "${t.title}"`}
                    onClick={() => startEditTask(t)}
                    className="text-gray-500 hover:text-blue-600 disabled:opacity-50 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    disabled={loading}
                    aria-label={`Delete task "${t.title}"`}
                    onClick={() => deleteTask(t.id)}
                    className="text-gray-500 hover:text-red-500 disabled:opacity-50 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  </EditOnly>
                </div>
              )}
            </div>
          ))}

          {completed.length > 0 && (
            <>
              {incomplete.length > 0 && (
                <div className="py-2">
                  <span className="text-xs text-gray-500 font-medium">
                    Completed ({completed.length})
                  </span>
                </div>
              )}
              {completed.map((t) => (
                <div key={t.id}>
                  {editingTask === t.id ? (
                    <div className="bg-gray-50 rounded-lg p-3 my-2 space-y-3">
                      <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1">
                          <label className="block text-xs text-gray-600 font-medium mb-1">Title</label>
                          <input
                            value={editTaskForm.title}
                            onChange={(e) => setEditTaskForm({ ...editTaskForm, title: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 font-medium mb-1">Due Date</label>
                          <input
                            type="date"
                            value={editTaskForm.due_date}
                            onChange={(e) => setEditTaskForm({ ...editTaskForm, due_date: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          disabled={loading}
                          onClick={() => saveEditTask(t.id)}
                          className="bg-black text-white px-3 py-2 min-h-[36px] rounded-lg text-xs hover:bg-gray-800 disabled:opacity-50 cursor-pointer transition-colors"
                        >
                          {loading ? "Saving..." : "Save Changes"}
                        </button>
                        <button
                          onClick={() => setEditingTask(null)}
                          className="text-xs text-gray-600 px-3 py-2 min-h-[36px] border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 py-2.5 border-l-4 border-l-green-400 pl-3">
                      <button
                        disabled={loading}
                        aria-label={`Mark "${t.title}" as incomplete`}
                        onClick={() => toggleTask(t)}
                        className="w-6 h-6 rounded border-2 border-green-500 bg-green-500 flex-shrink-0 flex items-center justify-center cursor-pointer min-h-[44px] min-w-[44px] transition-colors"
                      >
                        <Check className="w-3 h-3 text-white" />
                      </button>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-gray-500 line-through">
                          {t.title}
                        </span>
                        {t.assigned_to && (
                          <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                            <UserCircle className="w-3 h-3" />
                            {teamMembers.find((m) => m.email === t.assigned_to)?.name || t.assigned_to}
                          </span>
                        )}
                      </div>
                      {t.due_date && (
                        <span className="text-xs text-gray-500 shrink-0">
                          {fmtDate(t.due_date)}
                        </span>
                      )}
                      <EditOnly>
                      <button
                        disabled={loading}
                        aria-label={`Edit task "${t.title}"`}
                        onClick={() => startEditTask(t)}
                        className="text-gray-500 hover:text-blue-600 disabled:opacity-50 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        disabled={loading}
                        aria-label={`Delete task "${t.title}"`}
                        onClick={() => deleteTask(t.id)}
                        className="text-gray-500 hover:text-red-500 disabled:opacity-50 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      </EditOnly>
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>

        {/* Add task inline */}
        <ShadCard className="mt-4 bg-gray-50 border-dashed">
          <CardContent className="pt-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1">
                <label htmlFor="new-task-title" className="sr-only">Task title</label>
                <input
                  id="new-task-title"
                  placeholder="Add a task..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addTask()}
                />
              </div>
              <div>
                <label htmlFor="new-task-date" className="sr-only">Due date</label>
                <input
                  id="new-task-date"
                  type="date"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="new-task-assignee" className="sr-only">Assign to</label>
                <select
                  id="new-task-assignee"
                  value={newAssignee}
                  onChange={(e) => setNewAssignee(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <option value="">Assign to...</option>
                  {teamMembers.map((m) => (
                    <option key={m.email} value={m.email}>{m.name}</option>
                  ))}
                </select>
              </div>
              <button
                disabled={loading || !newTitle.trim()}
                onClick={addTask}
                className="bg-black text-white px-4 py-2.5 min-h-[44px] rounded-lg text-sm hover:bg-gray-800 disabled:opacity-50 cursor-pointer transition-colors"
              >
                {loading ? "Adding..." : "Add"}
              </button>
            </div>
          </CardContent>
        </ShadCard>
      </CardContent>
    </ShadCard>
  );
}
