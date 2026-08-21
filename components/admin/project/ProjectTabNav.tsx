"use client";

import {
  LayoutDashboard,
  Wallet,
  CheckSquare,
  FileText,
  FolderOpen,
} from "lucide-react";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  type ProjectTabGroup,
  type ProjectTabGroupKey,
  type ProjectTabRule,
} from "@/lib/projects/tabs";

/**
 * Two-level project navigation: category row on top, panels below.
 *
 * Replaces a single horizontally-scrolling strip of fourteen peer tabs where
 * five of them were money. The scroll strip needed arrow buttons and a
 * scroll-into-view effect just to reach its own contents, and four "quick
 * action" buttons had been added above it so the least-used tabs were
 * findable at all. Grouping removes the need for all three.
 *
 * The panel row is still the real Base UI tab list, so panel keys, keyboard
 * behaviour, and `?tab=` links are unchanged. The group row is a plain button
 * row: selecting a group jumps to that group's first panel.
 */

const GROUP_ICONS: Record<ProjectTabGroupKey, React.ElementType> = {
  overview: LayoutDashboard,
  money: Wallet,
  work: CheckSquare,
  client: FileText,
  files: FolderOpen,
};

export interface NavPanel extends ProjectTabRule {
  label: string;
  icon: React.ElementType;
}

export function ProjectTabNav({
  groups,
  activePanel,
  onSelectPanel,
}: {
  groups: ProjectTabGroup<NavPanel>[];
  activePanel: string;
  onSelectPanel: (panelKey: string) => void;
}) {
  const activeGroup =
    groups.find((g) => g.panels.some((p) => p.key === activePanel)) ?? groups[0];

  return (
    <div className="border-b border-gray-200">
      <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Project sections">
        {groups.map((group) => {
          const Icon = GROUP_ICONS[group.key];
          const isActive = group.key === activeGroup?.key;
          return (
            <button
              key={group.key}
              type="button"
              onClick={() => onSelectPanel(group.panels[0].key)}
              aria-pressed={isActive}
              className={`inline-flex items-center gap-2 rounded-t-lg px-3 py-2 text-sm font-medium min-h-[44px] transition-colors ${
                isActive
                  ? "bg-white text-gray-900 border border-b-0 border-gray-200"
                  : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              <Icon className="w-4 h-4" />
              {group.label}
            </button>
          );
        })}
      </div>

      {activeGroup && activeGroup.panels.length > 1 && (
        <TabsList
          variant="line"
          className="justify-start flex-wrap !h-auto border-b-0 pt-1 pb-0 w-full bg-transparent"
        >
          {activeGroup.panels.map((panel) => {
            const Icon = panel.icon;
            return (
              <TabsTrigger
                key={panel.key}
                value={panel.key}
                className="flex-shrink-0 flex-grow-0 px-3 py-2"
              >
                <Icon className="w-4 h-4" />
                <span>{panel.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>
      )}
    </div>
  );
}
