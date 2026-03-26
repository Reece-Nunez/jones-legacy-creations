"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  PlusCircle,
  Users,
  DollarSign,
  Calculator,
  AlertCircle,
  FileCheck,
  ExternalLink,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import SearchBar from "./SearchBar";

const navLinks = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard, exact: true },
  { label: "New Project", href: "/admin/projects/new", icon: PlusCircle },
  { label: "Contractors", href: "/admin/contractors", icon: Users },
  { label: "Financials", href: "/admin/financials", icon: DollarSign },
  {
    label: "Estimates",
    href: "/admin/estimates",
    icon: Calculator,
    badge: true,
  },
];

const quickLinks = [
  {
    label: "Unpaid Invoices",
    href: "/admin?filter=unpaid",
    icon: AlertCircle,
  },
  {
    label: "Pending Permits",
    href: "/admin?filter=permits",
    icon: FileCheck,
  },
  {
    label: "Get an Estimate",
    href: "/estimate",
    icon: ExternalLink,
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
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex items-center px-4 py-4">
        <Link href="/admin">
          <Image
            src="/jones-legacy-creations-logo-new.svg"
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

      {/* Nav links */}
      <nav className="flex-1 px-3 space-y-1">
        {navLinks.map((link) => {
          const Icon = link.icon;
          const active = isActive(link.href, link.exact);
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-slate-700 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {link.label}
              {link.badge && (
                <span className="ml-auto h-2 w-2 rounded-full bg-red-500" />
              )}
            </Link>
          );
        })}

        {/* Divider */}
        <div className="my-4 border-t border-slate-700" />

        {/* Quick Links */}
        <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
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
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
            >
              <Icon className="h-5 w-5 shrink-0" />
              {link.label}
              <ExternalLink className="ml-auto h-3.5 w-3.5 text-slate-500" />
            </a>
          ) : (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
            >
              <Icon className="h-5 w-5 shrink-0" />
              {link.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 space-y-3">
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          Sign Out
        </button>
        <p className="px-3 text-xs text-slate-500">
          &copy; {new Date().getFullYear()} Jones Legacy Creations
        </p>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 transition-opacity lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-slate-900 transition-transform duration-200 ease-in-out lg:hidden ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Close button */}
        <button
          onClick={() => setSidebarOpen(false)}
          className="absolute right-3 top-4 rounded-md p-1 text-slate-400 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-slate-900 lg:flex">
        {sidebarContent}
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Mobile top bar */}
        <div className="sticky top-0 z-20 bg-white shadow-sm lg:hidden">
          <div className="flex h-14 items-center px-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100"
            >
              <Menu className="h-6 w-6" />
            </button>
            <Image
              src="/jones-legacy-creations-logo-new.svg"
              alt="Jones Legacy Creations"
              width={140}
              height={42}
              className="ml-3 h-8 w-auto"
            />
          </div>
          <div className="border-t border-gray-100 bg-slate-900 px-1">
            <SearchBar />
          </div>
        </div>

        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
