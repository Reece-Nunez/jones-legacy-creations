"use client";

import { cn } from "@/lib/utils";
import { AlertTriangle, Info, AlertOctagon } from "lucide-react";
import type { RiskSeverity } from "@/lib/types/quotes";
import { RISK_SEVERITY_COLORS } from "@/lib/types/quotes";
import type { LucideIcon } from "lucide-react";

interface RiskFlag {
  flag_type: string;
  severity: RiskSeverity;
  description: string;
}

interface RiskFlagPanelProps {
  flags: RiskFlag[];
}

const SEVERITY_ICONS: Record<RiskSeverity, LucideIcon> = {
  info: Info,
  warning: AlertTriangle,
  critical: AlertOctagon,
};

const SEVERITY_LABELS: Record<RiskSeverity, string> = {
  info: "Info",
  warning: "Warning",
  critical: "Critical",
};

export function RiskFlagPanel({ flags }: RiskFlagPanelProps) {
  if (flags.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-base font-semibold text-gray-900">Risk Flags</h3>
      <div className="space-y-2">
        {flags.map((flag, index) => {
          const Icon = SEVERITY_ICONS[flag.severity];

          return (
            <div
              key={`${flag.flag_type}-${index}`}
              className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 flex items-start gap-3"
            >
              <div
                className={cn(
                  "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                  RISK_SEVERITY_COLORS[flag.severity]
                )}
              >
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
                      RISK_SEVERITY_COLORS[flag.severity]
                    )}
                  >
                    {SEVERITY_LABELS[flag.severity]}
                  </span>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {flag.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
