"use client";

import { Check, ChevronRight } from "lucide-react";
import { Card as ShadCard, CardContent } from "@/components/ui/card";
import { EditOnly } from "@/components/admin/project/shared/EditContext";
import {
  setupChecklist,
  setupProgress,
  stepHref,
  type SetupCounts,
  type SetupProject,
} from "@/lib/projects/setup-checklist";

/**
 * What still needs doing on this job, and why each thing matters.
 *
 * The help assistant answers questions; this one raises them. Someone in their
 * first week doesn't know Job Costs exists, so they never think to ask about
 * it — a checklist built from the project's real state names the gap for them.
 *
 * Steps navigate rather than instruct: each one is a link to the screen where
 * the work happens, the same trick that makes the help panel worth using.
 *
 * Disappears entirely once every step is done. It is onboarding, not a
 * permanent scoreboard, and a panel that only ever reads "6 of 6" is furniture.
 * Staff only — a contractor cannot do any of these.
 */
export function ProjectSetupChecklist({
  project,
  counts,
  onSelectTab,
}: {
  project: SetupProject;
  counts: SetupCounts;
  /** Switch panels in place; falls back to a link when not supplied. */
  onSelectTab?: (tab: string) => void;
}) {
  const steps = setupChecklist(project, counts);
  const { done, total, complete, remaining } = setupProgress(steps);

  if (complete) return null;

  return (
    <EditOnly>
      <ShadCard className="mb-4 border-l-4 border-l-indigo-500">
        <CardContent className="p-4">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="text-sm font-semibold text-gray-900">Finish setting up this job</h3>
            <span className="text-xs tabular-nums text-gray-500">
              {done} of {total} done
            </span>
          </div>

          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all"
              style={{ width: `${Math.round((done / total) * 100)}%` }}
            />
          </div>

          <ul className="mt-3 space-y-1">
            {remaining.map((step) => {
              const href = stepHref(step, project.id);
              const body = (
                <>
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-gray-300" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-gray-900">{step.label}</span>
                    <span className="block text-xs leading-relaxed text-gray-500">{step.why}</span>
                  </span>
                  <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                </>
              );

              // Panel steps switch tabs in place; the rest are real navigations
              // to the edit screen, which is a different page.
              return (
                <li key={step.key}>
                  {step.tab && onSelectTab ? (
                    <button
                      type="button"
                      onClick={() => onSelectTab(step.tab as string)}
                      className="flex w-full items-start gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-gray-50 cursor-pointer"
                    >
                      {body}
                    </button>
                  ) : (
                    <a
                      href={href}
                      className="flex w-full items-start gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-gray-50 cursor-pointer"
                    >
                      {body}
                    </a>
                  )}
                </li>
              );
            })}
          </ul>

          {done > 0 && (
            <p className="mt-2 flex items-center gap-1.5 px-2 text-xs text-gray-400">
              <Check className="h-3.5 w-3.5 text-green-600" />
              {done === 1 ? "1 step already done" : `${done} steps already done`}
            </p>
          )}
        </CardContent>
      </ShadCard>
    </EditOnly>
  );
}
