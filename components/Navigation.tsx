"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X, ChevronDown, Settings } from "lucide-react";

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [isCompact, setIsCompact] = useState(true);
  const [servicesOpen, setServicesOpen] = useState(false);
  const pathname = usePathname();
  // Compact mode at top of page, full navbar on scroll
  useEffect(() => {
    setIsCompact(window.scrollY <= 100);
    const handleScroll = () => {
      setIsCompact(window.scrollY <= 100);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const services = [
    { name: "Real Estate", href: "/services/real-estate" },
    { name: "Construction", href: "/services/construction" },
    { name: "Interior Design & Staging", href: "/services/interior-design" },
  ];

  const isActive = (href: string) => pathname === href;
  const isServiceActive = services.some((s) => pathname === s.href);

  return (
    <nav
      aria-label="Main navigation"
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isCompact
          ? "bg-black/30 backdrop-blur-sm"
          : "bg-white/95 backdrop-blur-md shadow-lg"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`flex justify-between items-center transition-all duration-500 ${
          isCompact ? "h-14" : "h-28"
        }`}>
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <Image
              src="/logo-transparent.png"
              alt="Jones Legacy Creations"
              width={152}
              height={152}
              className={`object-contain transition-all duration-500 ${
                isCompact ? "h-12 w-10" : "h-48 w-40"
              }`}
              priority
            />
          </Link>

          {/* Desktop Navigation */}
          <div className={`hidden md:flex items-center transition-all duration-500 ${
            isCompact ? "space-x-4" : "space-x-8"
          }`}>
            <Link
              href="/"
              className={`text-sm font-medium transition-colors duration-150 ${
                isCompact
                  ? "text-white/90 hover:text-white"
                  : isActive("/") ? "text-gray-900" : "text-gray-700 hover:text-gray-900"
              }`}
              {...(isActive("/") ? { "aria-current": "page" as const } : {})}
            >
              Home
            </Link>

            {/* Services Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setServicesOpen(true)}
              onMouseLeave={() => setServicesOpen(false)}
            >
              <button
                className={`text-sm font-medium transition-colors duration-150 flex items-center gap-1 py-2 ${
                  isCompact
                    ? "text-white/90 hover:text-white"
                    : isServiceActive ? "text-gray-900" : "text-gray-700 hover:text-gray-900"
                }`}
                aria-expanded={servicesOpen}
                aria-haspopup="true"
                onClick={() => setServicesOpen(!servicesOpen)}
              >
                Services
                <ChevronDown className="w-4 h-4" />
              </button>

              {/* Invisible bridge to prevent gap-induced mouseLeave */}
              <div className="absolute top-full left-0 h-2 w-64" />

              <div
                role="menu"
                aria-label="Services"
                className={`absolute top-full left-0 pt-2 transition-all duration-200 ${
                  servicesOpen ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-2 pointer-events-none"
                }`}
              >
              <div className="w-64 bg-white border border-gray-200 shadow-xl rounded-lg overflow-hidden">
                {services.map((service) => (
                  <Link
                    key={service.href}
                    href={service.href}
                    role="menuitem"
                    className={`block px-4 py-3 text-sm hover:bg-gray-50 transition-colors duration-150 ${
                      isActive(service.href) ? "text-gray-900 bg-gray-50" : "text-gray-700"
                    }`}
                    {...(isActive(service.href) ? { "aria-current": "page" as const } : {})}
                  >
                    {service.name}
                  </Link>
                ))}
              </div>
              </div>
            </div>

            <Link
              href="/about"
              className={`text-sm font-medium transition-colors duration-150 ${
                isCompact
                  ? "text-white/90 hover:text-white"
                  : isActive("/about") ? "text-gray-900" : "text-gray-700 hover:text-gray-900"
              }`}
              {...(isActive("/about") ? { "aria-current": "page" as const } : {})}
            >
              About
            </Link>
            <Link
              href="/estimate"
              className={`text-white text-sm font-medium rounded-full hover:bg-sky-800 transition-all duration-500 ${
                isCompact ? "px-4 py-1.5 bg-sky-700/80" : "px-6 py-3 bg-sky-700"
              }`}
              {...(isActive("/estimate") ? { "aria-current": "page" as const } : {})}
            >
              Free Estimate
            </Link>
            <Link
              href="/contact"
              className={`text-white text-sm font-medium rounded-full transition-all duration-500 ${
                isCompact ? "px-4 py-1.5 bg-white/20 hover:bg-white/30" : "px-6 py-3 bg-black hover:bg-gray-800"
              }`}
              {...(isActive("/contact") ? { "aria-current": "page" as const } : {})}
            >
              Contact
            </Link>
            <Link
              href="/admin"
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors duration-150 ${
                isCompact ? "text-white/60 hover:text-white" : "text-gray-500 hover:text-gray-900"
              }`}
              title="Admin"
              aria-label="Admin panel"
              {...(isActive("/admin") ? { "aria-current": "page" as const } : {})}
            >
              <Settings className="w-4 h-4" />
              Admin
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`md:hidden h-11 w-11 flex items-center justify-center rounded-lg transition-colors duration-150 ${
              isCompact ? "text-white hover:bg-white/10" : "text-gray-900 hover:bg-gray-100"
            }`}
            aria-label="Toggle menu"
            aria-expanded={isOpen}
            aria-controls="mobile-menu"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div
        id="mobile-menu"
        className={`md:hidden bg-white border-t border-gray-200 overflow-hidden transition-all duration-300 ${
          isOpen ? "max-h-screen opacity-100" : "max-h-0 opacity-0"
        }`}
        style={{ overscrollBehavior: "contain", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="px-4 py-6 space-y-4">
          <Link
            href="/"
            className={`block w-full py-3 text-base font-medium transition-colors duration-150 ${
              isActive("/") ? "text-gray-900" : "text-gray-700 hover:text-gray-900"
            }`}
            onClick={() => setIsOpen(false)}
            {...(isActive("/") ? { "aria-current": "page" as const } : {})}
          >
            Home
          </Link>

          <div className="space-y-2">
            <div className="text-base font-medium text-gray-900 py-3">Services</div>
            <div className="pl-4 space-y-2">
              {services.map((service) => (
                <Link
                  key={service.href}
                  href={service.href}
                  className={`block w-full py-3 text-sm transition-colors duration-150 ${
                    isActive(service.href) ? "text-gray-900" : "text-gray-600 hover:text-gray-900"
                  }`}
                  onClick={() => setIsOpen(false)}
                  {...(isActive(service.href) ? { "aria-current": "page" as const } : {})}
                >
                  {service.name}
                </Link>
              ))}
            </div>
          </div>

          <Link
            href="/about"
            className={`block w-full py-3 text-base font-medium transition-colors duration-150 ${
              isActive("/about") ? "text-gray-900" : "text-gray-700 hover:text-gray-900"
            }`}
            onClick={() => setIsOpen(false)}
            {...(isActive("/about") ? { "aria-current": "page" as const } : {})}
          >
            About
          </Link>
          <Link
            href="/estimate"
            className="block w-full text-center px-6 py-3 bg-sky-700 text-white text-base font-medium rounded-full hover:bg-sky-800 transition-colors duration-150"
            onClick={() => setIsOpen(false)}
            {...(isActive("/estimate") ? { "aria-current": "page" as const } : {})}
          >
            Free Estimate
          </Link>
          <Link
            href="/contact"
            className="block w-full text-center px-6 py-3 bg-black text-white text-base font-medium rounded-full hover:bg-gray-800 transition-colors duration-150"
            onClick={() => setIsOpen(false)}
            {...(isActive("/contact") ? { "aria-current": "page" as const } : {})}
          >
            Contact
          </Link>
          <Link
            href="/admin"
            className="flex items-center justify-center gap-2 w-full py-3 text-base font-medium text-gray-700 border border-gray-300 rounded-full hover:bg-gray-50 transition-colors duration-150"
            onClick={() => setIsOpen(false)}
            aria-label="Admin panel"
            {...(isActive("/admin") ? { "aria-current": "page" as const } : {})}
          >
            <Settings className="w-4 h-4" />
            Admin Login
          </Link>
        </div>
      </div>
    </nav>
  );
}
