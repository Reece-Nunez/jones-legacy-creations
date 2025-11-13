"use client";

import { WireframeNav } from "@/components/WireframeNav";
import { Building2, Hammer, ClipboardCheck, Award, Shield, Clock } from "lucide-react";

export default function WireframeConstructionPage() {
  return (
    <div className="bg-gray-100">
      <WireframeNav />

      {/* Hero */}
      <section className="pt-32 pb-16 bg-white border-b-8 border-gray-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="wireframe-label mb-4">[CONSTRUCTION SERVICE PAGE]</div>
            <div className="w-20 h-20 border-4 border-gray-800 mx-auto mb-6 flex items-center justify-center">
              <Building2 className="w-10 h-10" />
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6 border-4 border-dashed border-gray-400 p-6 inline-block">
              Construction Services
            </h1>
            <div className="border-4 border-dashed border-gray-300 p-6 max-w-3xl mx-auto">
              <p className="text-xl text-gray-600">
                From new builds to renovations, we deliver exceptional construction projects with precision and care.
              </p>
            </div>
          </div>

          <div className="wireframe-label text-center mb-4">[SERVICE FEATURES]</div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6 max-w-4xl mx-auto">
            {[
              { icon: Hammer, text: "Expert Craftsmanship" },
              { icon: ClipboardCheck, text: "Project Management" },
              { icon: Award, text: "Quality Guaranteed" },
              { icon: Shield, text: "Licensed & Insured" },
              { icon: Clock, text: "On-Time Delivery" },
            ].map((feature, i) => (
              <div key={i} className="border-4 border-gray-400 p-4 text-center bg-white">
                <feature.icon className="w-6 h-6 md:w-8 md:h-8 mx-auto mb-2" />
                <p className="text-xs md:text-sm font-medium">{feature.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Form Preview */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="wireframe-label text-center mb-8">[CONSTRUCTION PROJECT INTAKE FORM]</div>

          <div className="text-center mb-12 border-4 border-dashed border-gray-300 p-8">
            <h2 className="text-4xl font-bold mb-4">Tell Us About Your Construction Project</h2>
            <p className="text-lg text-gray-600">
              Provide detailed information about your project so we can give you an accurate quote and timeline.
            </p>
          </div>

          <div className="space-y-8">
            {/* Contact Info */}
            <div className="border-4 border-gray-400 p-6 bg-gray-50">
              <div className="wireframe-label mb-4">[SECTION 1: CONTACT]</div>
              <h3 className="text-2xl font-bold mb-6 border-b-2 border-gray-400 pb-2">Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {["Full Name *", "Email *", "Phone *", "Company Name"].map((field, i) => (
                  <div key={i} className="border-2 border-gray-400 p-3 bg-white">
                    <div className="text-xs font-bold mb-2 text-gray-600">{field}</div>
                    <div className="h-8 bg-gray-100" />
                  </div>
                ))}
              </div>
            </div>

            {/* Project Type */}
            <div className="border-4 border-gray-400 p-6 bg-gray-50">
              <div className="wireframe-label mb-4">[SECTION 2: PROJECT TYPE]</div>
              <h3 className="text-2xl font-bold mb-6 border-b-2 border-gray-400 pb-2">Project Type</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border-2 border-gray-400 p-3 bg-white">
                  <div className="text-xs font-bold mb-2 text-gray-600">Project Category *</div>
                  <div className="h-8 bg-gray-100" />
                  <p className="text-xs text-gray-500 mt-2">(Residential/Commercial/Industrial/Mixed-Use)</p>
                </div>
                <div className="border-2 border-gray-400 p-3 bg-white">
                  <div className="text-xs font-bold mb-2 text-gray-600">Project Type *</div>
                  <div className="h-8 bg-gray-100" />
                  <p className="text-xs text-gray-500 mt-2">(New Construction/Renovation/Addition/etc.)</p>
                </div>
              </div>
            </div>

            {/* Property Info */}
            <div className="border-4 border-gray-400 p-6 bg-gray-50">
              <div className="wireframe-label mb-4">[SECTION 3: PROPERTY INFORMATION]</div>
              <h3 className="text-2xl font-bold mb-6 border-b-2 border-gray-400 pb-2">Property Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2 border-2 border-gray-400 p-3 bg-white">
                  <div className="text-xs font-bold mb-2 text-gray-600">Property Address</div>
                  <div className="h-8 bg-gray-100" />
                </div>
                {["City *", "State *", "Zip Code", "Property Ownership *"].map((field, i) => (
                  <div key={i} className="border-2 border-gray-400 p-3 bg-white">
                    <div className="text-xs font-bold mb-2 text-gray-600">{field}</div>
                    <div className="h-8 bg-gray-100" />
                  </div>
                ))}
              </div>
            </div>

            {/* Project Details */}
            <div className="border-4 border-gray-400 p-6 bg-gray-50">
              <div className="wireframe-label mb-4">[SECTION 4: PROJECT DETAILS]</div>
              <h3 className="text-2xl font-bold mb-6 border-b-2 border-gray-400 pb-2">Project Details</h3>
              <div className="space-y-6">
                <div className="border-2 border-gray-400 p-3 bg-white">
                  <div className="text-xs font-bold mb-2 text-gray-600">Project Scope & Description *</div>
                  <div className="h-32 bg-gray-100" />
                  <p className="text-xs text-gray-500 mt-2">[Large text area for detailed description]</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {["Square Footage", "Number of Floors", "Number of Rooms"].map((field, i) => (
                    <div key={i} className="border-2 border-gray-400 p-3 bg-white">
                      <div className="text-xs font-bold mb-2 text-gray-600">{field}</div>
                      <div className="h-8 bg-gray-100" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Budget & Timeline */}
            <div className="border-4 border-gray-400 p-6 bg-gray-50">
              <div className="wireframe-label mb-4">[SECTION 5: BUDGET & TIMELINE]</div>
              <h3 className="text-2xl font-bold mb-6 border-b-2 border-gray-400 pb-2">Budget & Timeline</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {["Estimated Budget Range *", "Project Timeline *", "Preferred Start Date", "Required Completion"].map((field, i) => (
                  <div key={i} className="border-2 border-gray-400 p-3 bg-white">
                    <div className="text-xs font-bold mb-2 text-gray-600">{field}</div>
                    <div className="h-8 bg-gray-100" />
                  </div>
                ))}
              </div>
            </div>

            {/* Permits & Compliance */}
            <div className="border-4 border-gray-400 p-6 bg-gray-50">
              <div className="wireframe-label mb-4">[SECTION 6: PERMITS & COMPLIANCE]</div>
              <h3 className="text-2xl font-bold mb-6 border-b-2 border-gray-400 pb-2">Permits & Compliance</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {["Building Permits", "Architectural Plans", "Zoning Compliance"].map((field, i) => (
                  <div key={i} className="border-2 border-gray-400 p-3 bg-white">
                    <div className="text-xs font-bold mb-2 text-gray-600">{field}</div>
                    <div className="h-8 bg-gray-100" />
                  </div>
                ))}
              </div>
            </div>

            {/* Work Areas */}
            <div className="border-4 border-gray-400 p-6 bg-gray-50">
              <div className="wireframe-label mb-4">[SECTION 7: SPECIFIC WORK REQUIRED]</div>
              <h3 className="text-2xl font-bold mb-6 border-b-2 border-gray-400 pb-2">Specific Work Required</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  "Foundation Work",
                  "Framing Work",
                  "Roofing Work",
                  "Electrical Work",
                  "Plumbing Work",
                  "HVAC Work",
                  "Interior Finishing",
                  "Exterior Finishing",
                ].map((field, i) => (
                  <div key={i} className="border-2 border-gray-400 p-3 bg-white">
                    <div className="text-xs font-bold mb-2 text-gray-600">{field}</div>
                    <div className="h-8 bg-gray-100" />
                  </div>
                ))}
              </div>
            </div>

            {/* Additional Sections Summary */}
            <div className="border-4 border-dashed border-gray-300 p-8 text-center bg-white">
              <div className="wireframe-label mb-4">[ADDITIONAL SECTIONS]</div>
              <div className="space-y-2 text-gray-600">
                <p>▪ Materials & Quality Preferences</p>
                <p>▪ Demolition Requirements</p>
                <p>▪ Special Features (Accessibility, Energy Efficiency, Smart Home)</p>
                <p>▪ Site Conditions</p>
                <p>▪ Additional Services (Design, Engineering, Project Management)</p>
                <p>▪ Insurance & Financing</p>
                <p>▪ Additional Notes</p>
              </div>
            </div>

            {/* Submit */}
            <div className="flex justify-center pt-6">
              <div className="border-4 border-gray-800 px-12 py-4 bg-white">
                <span className="font-bold text-lg">SUBMIT PROJECT REQUEST</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Projects Showcase Section */}
      <section className="py-20 bg-gray-50 border-b-8 border-gray-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="wireframe-label text-center mb-8">[PROJECTS PORTFOLIO SECTION]</div>

          <div className="text-center mb-16 border-4 border-dashed border-gray-300 p-8">
            <h2 className="text-4xl font-bold mb-4">Featured Projects</h2>
            <p className="text-lg text-gray-600">
              See our completed and ongoing construction projects
            </p>
          </div>

          {/* Project Categories Filter */}
          <div className="wireframe-label text-center mb-4">[PROJECT FILTER BUTTONS]</div>
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            {["All Projects", "Residential", "Commercial", "Renovation", "New Build"].map((filter, i) => (
              <div key={i} className="border-2 border-gray-800 px-6 py-2 hover:bg-gray-800 hover:text-white">
                <span className="font-medium text-sm">{filter}</span>
              </div>
            ))}
          </div>

          {/* Projects Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { title: "Modern Family Home", category: "Residential - New Build", status: "Completed", location: "Austin, TX" },
              { title: "Downtown Office Complex", category: "Commercial - New Build", status: "Completed", location: "Dallas, TX" },
              { title: "Historic Home Renovation", category: "Residential - Renovation", status: "Completed", location: "Houston, TX" },
              { title: "Retail Shopping Center", category: "Commercial - New Build", status: "Ongoing", location: "San Antonio, TX" },
              { title: "Luxury Estate Addition", category: "Residential - Addition", status: "Completed", location: "Plano, TX" },
              { title: "Industrial Warehouse", category: "Commercial - New Build", status: "Ongoing", location: "Fort Worth, TX" },
            ].map((project, i) => (
              <a
                key={i}
                href={`/wireframe/construction/projects/project-${i + 1}`}
                className="group border-4 border-gray-400 bg-white overflow-hidden hover:border-gray-800 transition-colors cursor-pointer"
              >
                <div className="wireframe-label p-2">[PROJECT CARD {i + 1}]</div>

                {/* Project Image Placeholder */}
                <div className="aspect-[4/3] bg-gradient-to-br from-gray-200 to-gray-300 relative border-t-4 border-gray-400">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Building2 className="w-16 h-16 text-gray-400" />
                  </div>
                  {/* Status Badge */}
                  <div className={`absolute top-4 right-4 px-3 py-1 text-xs font-bold ${
                    project.status === "Ongoing" ? "bg-yellow-400 text-gray-900" : "bg-green-400 text-gray-900"
                  }`}>
                    {project.status}
                  </div>
                </div>

                {/* Project Details */}
                <div className="p-6 border-t-4 border-gray-400">
                  <div className="text-xs text-gray-500 mb-2">{project.category}</div>
                  <h3 className="text-xl font-bold mb-2 group-hover:underline">{project.title}</h3>
                  <div className="border-2 border-dashed border-gray-300 p-3 bg-gray-50 mb-3">
                    <div className="h-12" />
                    <p className="text-xs text-gray-500 mt-2">[Project description]</p>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{project.location}</span>
                    <span className="font-bold group-hover:underline">VIEW PROJECT →</span>
                  </div>
                </div>
              </a>
            ))}
          </div>

          {/* View All Projects Button */}
          <div className="text-center mt-12">
            <div className="border-4 border-gray-800 px-8 py-4 inline-block">
              <span className="font-bold">VIEW ALL PROJECTS →</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
