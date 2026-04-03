"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FolderOpen,
  Plus,
  Users,
  DollarSign,
  Calculator,
  ClipboardList,
  Banknote,
  FileCheck,
  Globe,
  ExternalLink,
  Menu,
  X,
  LogOut,
  Settings,
  UserCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useEnsureProfile } from "@/lib/hooks/useEnsureProfile";
import { Sheet, SheetTrigger, SheetContent } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import SearchBar from "./SearchBar";

const navLinks = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard, exact: true },
  { label: "Projects", href: "/admin/projects", icon: FolderOpen, badgeKey: "details" },
  { label: "Contractors & Vendors", href: "/admin/contractors", icon: Users, badgeKey: "w9" },
  { label: "Financials", href: "/admin/financials", icon: DollarSign },
  {
    label: "Estimates",
    href: "/admin/estimates",
    icon: Calculator,
    badgeKey: "estimates",
  },
  {
    label: "Quotes",
    href: "/admin/quotes",
    icon: ClipboardList,
    badgeKey: "quotes",
  },
];

// Bottom tab bar items for mobile (max 5 for thumb-friendly sizing)
const mobileTabLinks = [
  { label: "Home", href: "/admin", icon: LayoutDashboard, exact: true },
  { label: "Projects", href: "/admin/projects", icon: FolderOpen, badgeKey: "details" },
  { label: "Contacts", href: "/admin/contractors", icon: Users, badgeKey: "w9" },
  { label: "Money", href: "/admin/financials", icon: DollarSign },
  { label: "Estimates", href: "/admin/estimates", icon: Calculator, badgeKey: "estimates" },
];

const quickLinks = [
  {
    label: "Pending Draws",
    href: "/admin/financials",
    icon: Banknote,
  },
  {
    label: "Pending Permits",
    href: "/admin",
    icon: FileCheck,
  },
  {
    label: "Back to Site",
    href: "/",
    icon: Globe,
    external: true,
  },
];

export default function AdminShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  useEnsureProfile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [newEstimateCount, setNewEstimateCount] = useState(0);
  const [missingW9Count, setMissingW9Count] = useState(0);
  const [missingDetailsCount, setMissingDetailsCount] = useState(0);
  const [draftQuoteCount, setDraftQuoteCount] = useState(0);

  useEffect(() => {
    const supabase = createClient();

    async function fetchBadgeCounts() {
      const [{ count: estimateCount }, { count: w9Count }, { count: detailsCount }, { count: quoteCount }] = await Promise.all([
        supabase
          .from("estimates")
          .select("*", { count: "exact", head: true })
          .eq("status", "new"),
        supabase
          .from("contractors")
          .select("*", { count: "exact", head: true })
          .eq("type", "contractor")
          .eq("w9_required", true)
          .is("w9_file_url", null),
        supabase
          .from("projects")
          .select("*", { count: "exact", head: true })
          .is("square_footage", null)
          .not("status", "in", '("completed","archived")'),
        supabase
          .from("quotes")
          .select("*", { count: "exact", head: true })
          .in("status", ["draft", "in_progress"]),
      ]);
      setNewEstimateCount(estimateCount ?? 0);
      setMissingW9Count(w9Count ?? 0);
      setMissingDetailsCount(detailsCount ?? 0);
      setDraftQuoteCount(quoteCount ?? 0);
    }

    fetchBadgeCounts();

    const interval = setInterval(fetchBadgeCounts, 30000);
    return () => clearInterval(interval);
  }, [pathname]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
  }

  function isActive(href: string, exact?: boolean) {
    if (exact) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  }

  function renderBadge(badgeKey?: string) {
    if (badgeKey === "estimates" && newEstimateCount > 0) {
      return (
        <span className="ml-auto flex items-center gap-1.5">
          <span className="flex h-2 w-2">
            <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
          </span>
          <span className="text-xs text-red-400">{newEstimateCount}</span>
        </span>
      );
    }
    if (badgeKey === "w9" && missingW9Count > 0) {
      return (
        <span className="ml-auto flex items-center gap-1.5">
          <span className="flex h-2 w-2">
            <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
          </span>
          <span className="text-xs text-amber-400">{missingW9Count}</span>
        </span>
      );
    }
    if (badgeKey === "details" && missingDetailsCount > 0) {
      return (
        <span className="ml-auto flex items-center gap-1.5">
          <span className="flex h-2 w-2">
            <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-yellow-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-yellow-500" />
          </span>
          <span className="text-xs text-yellow-400">{missingDetailsCount}</span>
        </span>
      );
    }
    if (badgeKey === "quotes" && draftQuoteCount > 0) {
      return (
        <span className="ml-auto flex items-center gap-1.5">
          <span className="flex h-2 w-2">
            <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-indigo-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-500" />
          </span>
          <span className="text-xs text-indigo-400">{draftQuoteCount}</span>
        </span>
      );
    }
    return null;
  }

  function renderMobileBadgeDot(badgeKey?: string) {
    if (badgeKey === "estimates" && newEstimateCount > 0) {
      return (
        <span className="absolute -top-0.5 -right-1 flex h-2 w-2">
          <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
        </span>
      );
    }
    if (badgeKey === "w9" && missingW9Count > 0) {
      return (
        <span className="absolute -top-0.5 -right-1 flex h-2 w-2">
          <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
        </span>
      );
    }
    if (badgeKey === "details" && missingDetailsCount > 0) {
      return (
        <span className="absolute -top-0.5 -right-1 flex h-2 w-2">
          <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-yellow-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-yellow-500" />
        </span>
      );
    }
    if (badgeKey === "quotes" && draftQuoteCount > 0) {
      return (
        <span className="absolute -top-0.5 -right-1 flex h-2 w-2">
          <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-indigo-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-500" />
        </span>
      );
    }
    return null;
  }

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex items-center px-4 py-4">
        <Link
          href="/admin"
          className="transition-opacity duration-150 hover:opacity-80"
        >
          <Image
            src="/logo-transparent.png"
            alt="Jones Legacy Creations"
            width={180}
            height={54}
            className="h-12 w-auto brightness-0 invert"
            priority
          />
        </Link>
      </div>

      {/* Search */}
      <SearchBar />

      {/* Quick-create CTAs */}
      <div className="px-3 mb-2 space-y-1.5">
        <Link
          href="/admin/projects/new"
          onClick={() => setSidebarOpen(false)}
          className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 active:bg-indigo-700"
          style={{ minHeight: 44 }}
        >
          <Plus className="h-4 w-4" />
          New Project
        </Link>
        <Link
          href="/admin/quotes/new"
          onClick={() => setSidebarOpen(false)}
          className="flex items-center justify-center gap-2 rounded-lg bg-slate-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-600 active:bg-slate-800"
          style={{ minHeight: 44 }}
        >
          <Plus className="h-4 w-4" />
          New Quote
        </Link>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 space-y-1" aria-label="Admin navigation">
        {navLinks.map((link) => {
          const Icon = link.icon;
          const active = isActive(link.href, link.exact);
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setSidebarOpen(false)}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 min-h-[44px] text-sm font-medium transition-colors duration-150 ${
                active
                  ? "bg-slate-700/80 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {link.label}
              {renderBadge(link.badgeKey)}
            </Link>
          );
        })}

        {/* Divider */}
        <Separator className="!my-4 bg-slate-700" />

        {/* Quick Links */}
        <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Quick Links
        </p>
        {quickLinks.map((link) => {
          const Icon = link.icon;
          return link.external ? (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 min-h-[44px] text-sm font-medium text-slate-400 transition-colors duration-150 hover:bg-slate-800 hover:text-white"
            >
              <Icon className="h-5 w-5 shrink-0" />
              {link.label}
              <ExternalLink className="ml-auto h-3.5 w-3.5 text-slate-600" />
            </a>
          ) : (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 min-h-[44px] text-sm font-medium text-slate-400 transition-colors duration-150 hover:bg-slate-800 hover:text-white"
            >
              <Icon className="h-5 w-5 shrink-0" />
              {link.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 space-y-1">
        <Separator className="bg-slate-700 !mb-3" />
        <Link
          href="/admin/profile"
          onClick={() => setSidebarOpen(false)}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 min-h-[44px] text-sm font-medium text-slate-400 transition-colors duration-150 hover:bg-slate-800 hover:text-white"
        >
          <UserCircle className="h-5 w-5 shrink-0" />
          Profile
        </Link>
        <Link
          href="/admin/settings"
          onClick={() => setSidebarOpen(false)}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 min-h-[44px] text-sm font-medium text-slate-400 transition-colors duration-150 hover:bg-slate-800 hover:text-white"
        >
          <Settings className="h-5 w-5 shrink-0" />
          Settings
        </Link>
        <button
          onClick={handleSignOut}
          aria-label="Sign out"
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 min-h-[44px] text-sm font-medium text-slate-400 transition-colors duration-150 hover:bg-slate-800 hover:text-white"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          Sign Out
        </button>
        <p className="px-3 pt-2 text-xs text-slate-500">
          &copy; {new Date().getFullYear()} Jones Legacy Creations
        </p>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col overflow-y-auto bg-slate-900 lg:flex">
        {sidebarContent}
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Mobile top bar — compact, app-like */}
        <div className="sticky top-0 z-20 bg-white dark:bg-gray-900 shadow-sm lg:hidden">
          <div className="flex h-14 items-center justify-between px-4">
            <div className="flex items-center gap-3">
              <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SheetTrigger
                  render={
                    <button
                      aria-expanded={sidebarOpen}
                      aria-controls="mobile-sidebar"
                      className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200 transition-colors"
                    />
                  }
                >
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Open menu</span>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 bg-slate-900 p-0 overflow-hidden" showCloseButton={false}>
                  {/* Close button */}
                  <button
                    onClick={() => setSidebarOpen(false)}
                    className="absolute right-3 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-lg text-slate-400 hover:text-white"
                  >
                    <X className="h-5 w-5" />
                  </button>
                  <div className="flex flex-col h-full overflow-y-auto overscroll-contain">
                    {sidebarContent}
                  </div>
                </SheetContent>
              </Sheet>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200 tracking-tight">JLC Admin</span>
            </div>
            {/* Mobile search toggle area */}
            <div className="flex items-center gap-1">
              <Link
                href="/admin/projects/new"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-white shadow-sm active:bg-indigo-700 transition-colors"
                aria-label="New Project"
              >
                <Plus className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Page content — extra bottom padding on mobile for tab bar */}
        <main className="p-4 pb-24 sm:p-6 sm:pb-6 lg:pb-6">{children}</main>
      </div>

      {/* Mobile bottom tab bar — iOS/Android app style */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-30 border-t border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg lg:hidden safe-bottom"
        aria-label="Mobile navigation"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="flex items-stretch justify-around">
          {mobileTabLinks.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.href, link.exact);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex flex-1 flex-col items-center gap-0.5 py-2 pt-2.5 text-[10px] font-medium transition-colors ${
                  active
                    ? "text-indigo-600"
                    : "text-gray-400 active:text-gray-600"
                }`}
                style={{ minHeight: 52 }}
              >
                <span className="relative">
                  <Icon className={`h-5 w-5 ${active ? "text-indigo-600" : "text-gray-400"}`} />
                  {renderMobileBadgeDot(link.badgeKey)}
                </span>
                <span>{link.label}</span>
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-b-full bg-indigo-600" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
