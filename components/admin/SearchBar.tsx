"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  FolderOpen,
  Users,
  FileText,
  Calculator,
  Loader2,
} from "lucide-react";
import type { ProjectStatus } from "@/lib/types/database";
import {
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_COLORS,
} from "@/lib/types/database";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ProjectResult {
  id: string;
  name: string;
  client_name: string;
  status: ProjectStatus;
}

interface ContractorResult {
  id: string;
  name: string;
  trade: string;
}

interface InvoiceResult {
  id: string;
  project_id: string;
  invoice_number: string;
  amount: number;
  status: string;
  projects: { name: string } | null;
}

interface EstimateResult {
  id: string;
  client_name: string;
  project_type: string;
  status: string;
}

interface SearchResults {
  projects: ProjectResult[];
  contractors: ContractorResult[];
  invoices: InvoiceResult[];
  estimates: EstimateResult[];
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

interface FlatItem {
  href: string;
  label: string;
}

function flattenResults(results: SearchResults): FlatItem[] {
  const items: FlatItem[] = [];
  results.projects.forEach((p) =>
    items.push({ href: `/admin/projects/${p.id}`, label: p.name })
  );
  results.contractors.forEach((c) =>
    items.push({ href: `/admin/contractors/${c.id}`, label: c.name })
  );
  results.invoices.forEach((i) =>
    items.push({
      href: `/admin/projects/${i.project_id}`,
      label: i.invoice_number,
    })
  );
  results.estimates.forEach((e) =>
    items.push({ href: `/admin/estimates/${e.id}`, label: e.client_name })
  );
  return items;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  /* ---- Close on outside click ---- */
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  /* ---- Debounced fetch ---- */
  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults(null);
      setIsOpen(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/admin/search?q=${encodeURIComponent(q.trim())}`
      );
      if (!res.ok) throw new Error("Search failed");
      const data: SearchResults = await res.json();
      setResults(data);
      setIsOpen(true);
      setActiveIndex(-1);
    } catch {
      setResults(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  function handleChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 300);
  }

  /* ---- Keyboard navigation ---- */
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
      return;
    }

    if (!isOpen || !results) return;

    const items = flattenResults(results);
    if (items.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1));
    } else if (e.key === "Enter" && activeIndex >= 0 && activeIndex < items.length) {
      e.preventDefault();
      closeAndNavigate(items[activeIndex].href);
    }
  }

  function closeAndNavigate(href: string) {
    setIsOpen(false);
    setQuery("");
    setResults(null);
    router.push(href);
  }

  /* ---- Determine if dropdown has any results ---- */
  const hasResults =
    results &&
    (results.projects.length > 0 ||
      results.contractors.length > 0 ||
      results.invoices.length > 0 ||
      results.estimates.length > 0);

  /* ---- Track flat index for keyboard highlight ---- */
  let flatIndex = -1;

  return (
    <div ref={containerRef} className="relative px-3 py-3">
      {/* Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => {
            if (results) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search everything..."
          className="w-full rounded-lg bg-slate-800 py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-400 outline-none ring-1 ring-slate-700 transition-shadow focus:ring-2 focus:ring-blue-500"
          aria-label="Global search"
          aria-expanded={isOpen}
          role="combobox"
          aria-controls="search-results"
          aria-autocomplete="list"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
        )}
      </div>

      {/* Results dropdown */}
      {isOpen && (
        <div
          id="search-results"
          role="listbox"
          className="absolute left-3 right-3 top-full z-50 mt-1 max-h-[70vh] overflow-y-auto rounded-xl bg-white shadow-xl ring-1 ring-black/5"
        >
          {!hasResults && !isLoading && (
            <div className="px-4 py-6 text-center text-sm text-gray-500">
              No results found
            </div>
          )}

          {/* Projects */}
          {results && results.projects.length > 0 && (
            <div>
              <div className="flex items-center gap-2 px-4 pb-1 pt-3">
                <FolderOpen className="h-3.5 w-3.5 text-gray-400" />
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Projects
                </span>
              </div>
              {results.projects.map((project) => {
                flatIndex++;
                const idx = flatIndex;
                return (
                  <Link
                    key={project.id}
                    href={`/admin/projects/${project.id}`}
                    onClick={() => {
                      setIsOpen(false);
                      setQuery("");
                      setResults(null);
                    }}
                    role="option"
                    aria-selected={activeIndex === idx}
                    className={`flex min-h-[44px] items-center gap-3 px-4 py-3 transition-colors ${
                      activeIndex === idx ? "bg-gray-100" : "hover:bg-gray-50"
                    }`}
                  >
                    <FolderOpen className="h-4 w-4 shrink-0 text-gray-400" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {project.name}
                      </p>
                      <p className="truncate text-xs text-gray-500">
                        {project.client_name}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                        PROJECT_STATUS_COLORS[project.status] ?? ""
                      }`}
                    >
                      {PROJECT_STATUS_LABELS[project.status] ?? project.status}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Contractors */}
          {results && results.contractors.length > 0 && (
            <div>
              <div className="flex items-center gap-2 border-t border-gray-100 px-4 pb-1 pt-3">
                <Users className="h-3.5 w-3.5 text-gray-400" />
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Contractors
                </span>
              </div>
              {results.contractors.map((contractor) => {
                flatIndex++;
                const idx = flatIndex;
                return (
                  <Link
                    key={contractor.id}
                    href={`/admin/contractors/${contractor.id}`}
                    onClick={() => {
                      setIsOpen(false);
                      setQuery("");
                      setResults(null);
                    }}
                    role="option"
                    aria-selected={activeIndex === idx}
                    className={`flex min-h-[44px] items-center gap-3 px-4 py-3 transition-colors ${
                      activeIndex === idx ? "bg-gray-100" : "hover:bg-gray-50"
                    }`}
                  >
                    <Users className="h-4 w-4 shrink-0 text-gray-400" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {contractor.name}
                      </p>
                      <p className="truncate text-xs text-gray-500">
                        {contractor.trade}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Invoices */}
          {results && results.invoices.length > 0 && (
            <div>
              <div className="flex items-center gap-2 border-t border-gray-100 px-4 pb-1 pt-3">
                <FileText className="h-3.5 w-3.5 text-gray-400" />
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Invoices
                </span>
              </div>
              {results.invoices.map((invoice) => {
                flatIndex++;
                const idx = flatIndex;
                const projectName =
                  invoice.projects?.name ?? "Unknown Project";
                return (
                  <Link
                    key={invoice.id}
                    href={`/admin/projects/${invoice.project_id}`}
                    onClick={() => {
                      setIsOpen(false);
                      setQuery("");
                      setResults(null);
                    }}
                    role="option"
                    aria-selected={activeIndex === idx}
                    className={`flex min-h-[44px] items-center gap-3 px-4 py-3 transition-colors ${
                      activeIndex === idx ? "bg-gray-100" : "hover:bg-gray-50"
                    }`}
                  >
                    <FileText className="h-4 w-4 shrink-0 text-gray-400" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {invoice.invoice_number}
                      </p>
                      <p className="truncate text-xs text-gray-500">
                        {projectName}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-medium text-gray-700">
                      {formatCurrency(invoice.amount)}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Estimates */}
          {results && results.estimates.length > 0 && (
            <div>
              <div className="flex items-center gap-2 border-t border-gray-100 px-4 pb-1 pt-3">
                <Calculator className="h-3.5 w-3.5 text-gray-400" />
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Estimates
                </span>
              </div>
              {results.estimates.map((estimate) => {
                flatIndex++;
                const idx = flatIndex;
                return (
                  <Link
                    key={estimate.id}
                    href={`/admin/estimates/${estimate.id}`}
                    onClick={() => {
                      setIsOpen(false);
                      setQuery("");
                      setResults(null);
                    }}
                    role="option"
                    aria-selected={activeIndex === idx}
                    className={`flex min-h-[44px] items-center gap-3 px-4 py-3 transition-colors ${
                      activeIndex === idx ? "bg-gray-100" : "hover:bg-gray-50"
                    }`}
                  >
                    <Calculator className="h-4 w-4 shrink-0 text-gray-400" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {estimate.client_name}
                      </p>
                      <p className="truncate text-xs text-gray-500">
                        {estimate.project_type}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
