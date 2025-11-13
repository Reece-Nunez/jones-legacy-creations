"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, ChevronDown } from "lucide-react";

export function WireframeNav() {
  const [isOpen, setIsOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);

  const services = [
    { name: "Real Estate", href: "/wireframe/real-estate" },
    { name: "Construction", href: "/wireframe/construction" },
    { name: "Interior Design & Staging", href: "/wireframe/interior-design" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b-4 border-gray-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo - Wireframe */}
          <Link href="/wireframe/home" className="flex items-center">
            <div className="border-4 border-gray-400 px-4 py-2">
              <span className="text-lg font-bold tracking-tight text-gray-800">
                [LOGO] Jones Legacy Creations
              </span>
            </div>
          </Link>

          {/* Desktop Navigation - Wireframe */}
          <div className="hidden md:flex items-center space-x-6">
            <Link
              href="/wireframe/home"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 border-2 border-transparent hover:border-gray-400 px-3 py-1"
            >
              Home
            </Link>

            {/* Services Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setServicesOpen(true)}
              onMouseLeave={() => setServicesOpen(false)}
            >
              <button className="text-sm font-medium text-gray-600 hover:text-gray-900 flex items-center gap-1 border-2 border-transparent hover:border-gray-400 px-3 py-1">
                Services
                <ChevronDown className="w-4 h-4" />
              </button>

              {servicesOpen && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-white border-4 border-gray-400">
                  {services.map((service) => (
                    <Link
                      key={service.href}
                      href={service.href}
                      className="block px-4 py-3 text-sm border-b-2 border-gray-300 hover:bg-gray-100"
                    >
                      {service.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <Link
              href="/wireframe/about"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 border-2 border-transparent hover:border-gray-400 px-3 py-1"
            >
              About
            </Link>
            <Link
              href="/wireframe/partners"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 border-2 border-transparent hover:border-gray-400 px-3 py-1"
            >
              Partners
            </Link>
            <Link
              href="/wireframe/contact"
              className="px-6 py-2 bg-white text-gray-800 text-sm font-bold border-4 border-gray-800"
            >
              Contact
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 border-2 border-gray-400"
            aria-label="Toggle menu"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="md:hidden bg-white border-t-4 border-gray-400">
          <div className="px-4 py-6 space-y-4">
            <Link
              href="/wireframe/home"
              className="block text-base font-medium border-b-2 border-gray-300 pb-2"
              onClick={() => setIsOpen(false)}
            >
              Home
            </Link>

            <div className="space-y-2">
              <div className="text-base font-bold text-gray-900 border-b-2 border-gray-300 pb-2">Services</div>
              <div className="pl-4 space-y-2">
                {services.map((service) => (
                  <Link
                    key={service.href}
                    href={service.href}
                    className="block text-sm text-gray-600 py-1"
                    onClick={() => setIsOpen(false)}
                  >
                    {service.name}
                  </Link>
                ))}
              </div>
            </div>

            <Link
              href="/wireframe/about"
              className="block text-base font-medium border-b-2 border-gray-300 pb-2"
              onClick={() => setIsOpen(false)}
            >
              About
            </Link>
            <Link
              href="/wireframe/partners"
              className="block text-base font-medium border-b-2 border-gray-300 pb-2"
              onClick={() => setIsOpen(false)}
            >
              Partners
            </Link>
            <Link
              href="/wireframe/contact"
              className="block w-full text-center px-6 py-3 bg-white text-gray-800 text-base font-bold border-4 border-gray-800"
              onClick={() => setIsOpen(false)}
            >
              Contact
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
