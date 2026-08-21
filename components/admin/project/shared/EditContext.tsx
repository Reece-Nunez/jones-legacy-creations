"use client";

import { createContext, useContext } from "react";

/**
 * Whether the current viewer may edit this project.
 *
 * Contractors get a read-only view of their project. Rather than thread a flag
 * through every tab and button, we expose `canEdit` via context: AddButton and
 * EditOnly self-hide when it's false, and the mutate() helper refuses staff
 * writes as a backstop. Defaults to true so staff (no provider override needed
 * in theory) and any stray usage stay fully editable.
 *
 * Data access is enforced by RLS regardless; this only hides controls.
 */
export const ProjectEditContext = createContext<boolean>(true);

export function useCanEditProject(): boolean {
  return useContext(ProjectEditContext);
}

/** Renders its children only when the viewer may edit (hidden for contractors). */
export function EditOnly({ children }: { children: React.ReactNode }) {
  return useCanEditProject() ? <>{children}</> : null;
}
