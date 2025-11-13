"use client";

import Link from "next/link";
import { Building2, Home, Palette, FileText, Users, Mail, ArrowRight } from "lucide-react";

export default function WireframeIndexPage() {
  const wireframes = [
    {
      title: "Home Page",
      href: "/wireframe/home",
      icon: Home,
      description: "Main landing page with hero, stats, services overview, and CTAs",
      sections: ["Hero Section", "Statistics Bar", "Services Cards", "Call to Action"],
    },
    {
      title: "About Page",
      href: "/wireframe/about",
      icon: FileText,
      description: "Company story, values, timeline, and team information",
      sections: ["Company Story", "Core Values", "Timeline", "Why Choose Us"],
    },
    {
      title: "Real Estate Service",
      href: "/wireframe/real-estate",
      icon: Home,
      description: "Comprehensive property intake form with 50+ fields",
      sections: ["Contact Info", "Property Type", "Location", "Budget", "Features", "Timeline"],
    },
    {
      title: "Construction Service",
      href: "/wireframe/construction",
      icon: Building2,
      description: "Detailed construction project intake form + Projects showcase with detail pages",
      sections: ["Project Details", "Budget/Timeline", "Permits", "Work Areas", "Materials", "Featured Projects Gallery"],
    },
    {
      title: "Interior Design Service",
      href: "/wireframe/interior-design",
      icon: Palette,
      description: "Service showcase with portfolio and process",
      sections: ["Services Overview", "Design Process", "Portfolio Gallery"],
    },
    {
      title: "Partners Page",
      href: "/wireframe/partners",
      icon: Users,
      description: "Partner network showcase with categories",
      sections: ["Partner Benefits", "Categories", "Partner Profiles"],
    },
    {
      title: "Contact Page",
      href: "/wireframe/contact",
      icon: Mail,
      description: "Contact form and information",
      sections: ["Contact Info Cards", "Contact Form", "Quick Service Links"],
    },
  ];

  return (
    <div className="min-h-screen bg-gray-200 p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-12">
        <div className="bg-white border-8 border-gray-800 p-12 text-center">
          <div className="border-4 border-gray-400 inline-block px-8 py-4 mb-6">
            <span className="text-3xl font-bold">[LOGO] Jones Legacy Creations</span>
          </div>
          <h1 className="text-6xl font-bold mb-6">Website Wireframes</h1>
          <div className="max-w-3xl mx-auto border-4 border-dashed border-gray-400 p-6">
            <p className="text-xl text-gray-700">
              This is a wireframe preview showing the structure and layout of all website pages. Click on any page below to view its detailed wireframe.
            </p>
          </div>
          <div className="mt-8 text-sm text-gray-600 space-y-2">
            <p><strong>Purpose:</strong> To show page structure, layout, and content organization</p>
            <p><strong>Note:</strong> Final design will include images, colors, and polished styling</p>
          </div>
        </div>
      </div>

      {/* Wireframe Pages Grid */}
      <section className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {wireframes.map((page, index) => (
            <Link key={page.href} href={page.href}>
              <div className="bg-white border-4 border-gray-400 hover:border-gray-800 p-8 h-full transition-all cursor-pointer">
                <div className="wireframe-label mb-4">[PAGE {index + 1}]</div>

                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 border-4 border-gray-800 flex items-center justify-center flex-shrink-0">
                    <page.icon className="w-8 h-8" />
                  </div>
                  <h2 className="text-2xl font-bold">{page.title}</h2>
                </div>

                <div className="border-2 border-dashed border-gray-300 p-4 mb-4 bg-gray-50">
                  <p className="text-gray-700 text-sm">{page.description}</p>
                </div>

                <div className="border-t-2 border-gray-300 pt-4">
                  <div className="text-xs font-bold text-gray-600 mb-2">PAGE SECTIONS:</div>
                  <ul className="space-y-1">
                    {page.sections.map((section, i) => (
                      <li key={i} className="text-xs text-gray-600 flex items-start gap-2">
                        <span className="inline-block w-1 h-1 bg-gray-600 rounded-full mt-1.5 flex-shrink-0" />
                        {section}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6 border-2 border-gray-800 px-4 py-2 inline-flex items-center gap-2 hover:bg-gray-800 hover:text-white transition-colors">
                  <span className="text-sm font-bold">VIEW WIREFRAME</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Instructions */}
      <div className="max-w-7xl mx-auto mt-12">
        <div className="bg-white border-4 border-gray-800 p-8">
          <h2 className="text-2xl font-bold mb-4 border-b-2 border-gray-400 pb-2">
            How to Use These Wireframes
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border-2 border-dashed border-gray-300 p-4">
              <h3 className="font-bold mb-2">What Wireframes Show:</h3>
              <ul className="space-y-1 text-sm text-gray-700">
                <li>• Page layout and structure</li>
                <li>• Content organization</li>
                <li>• Navigation flow</li>
                <li>• Form fields and sections</li>
                <li>• General placement of elements</li>
              </ul>
            </div>
            <div className="border-2 border-dashed border-gray-300 p-4">
              <h3 className="font-bold mb-2">What's Coming in Final Design:</h3>
              <ul className="space-y-1 text-sm text-gray-700">
                <li>• Professional imagery and graphics</li>
                <li>• Black & white color scheme</li>
                <li>• Smooth animations and transitions</li>
                <li>• Polished typography</li>
                <li>• Interactive elements</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
