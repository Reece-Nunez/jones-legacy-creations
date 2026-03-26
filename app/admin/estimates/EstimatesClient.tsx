"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ClipboardCheck, Inbox } from "lucide-react";
import {
  type Estimate,
  type EstimateStatus,
  ESTIMATE_STATUS_COLORS,
} from "@/lib/types/database";
import EstimateCard from "@/components/admin/EstimateCard";

const STATUS_FILTERS: { value: EstimateStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "new", label: "New" },
  { value: "reviewed", label: "Reviewed" },
  { value: "converted", label: "Converted" },
  { value: "declined", label: "Declined" },
];

interface Props {
  initialEstimates: Estimate[];
}

export default function EstimatesClient({ initialEstimates }: Props) {
  const router = useRouter();
  const [filter, setFilter] = useState<EstimateStatus | "all">("all");

  const filtered =
    filter === "all"
      ? initialEstimates
      : initialEstimates.filter((e) => e.status === filter);

  const statusCounts: Record<string, number> = { all: initialEstimates.length };
  for (const e of initialEstimates) {
    statusCounts[e.status] = (statusCounts[e.status] || 0) + 1;
  }

  const handleUpdate = useCallback(() => {
    router.refresh();
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
              <ClipboardCheck className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Estimates</h1>
              <p className="text-sm text-gray-500">
                {initialEstimates.length} total estimate
                {initialEstimates.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="mb-6 flex flex-wrap gap-2">
          {STATUS_FILTERS.map((sf) => {
            const count = statusCounts[sf.value] || 0;
            const active = filter === sf.value;
            return (
              <button
                key={sf.value}
                type="button"
                onClick={() => setFilter(sf.value)}
                className={`min-h-[44px] rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-gray-900 text-white"
                    : "bg-white text-gray-600 shadow-sm hover:bg-gray-100"
                }`}
              >
                {sf.label}{" "}
                <span className={active ? "text-gray-300" : "text-gray-400"}>
                  ({count})
                </span>
              </button>
            );
          })}
        </div>

        {/* Estimate Cards */}
        {filtered.length === 0 ? (
          <div className="rounded-xl bg-white p-12 text-center shadow-sm">
            <Inbox className="mx-auto h-10 w-10 text-gray-300" />
            <p className="mt-4 text-lg font-medium text-gray-500">
              No estimates found
            </p>
            <p className="mt-1 text-sm text-gray-400">
              {filter !== "all"
                ? "Try a different filter."
                : "Estimates from the public form will appear here."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((estimate) => (
              <EstimateCard
                key={estimate.id}
                estimate={estimate}
                onUpdate={handleUpdate}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
