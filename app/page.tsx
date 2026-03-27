import Link from "next/link";
import Image from "next/image";
import { ArrowRight, CheckCircle2, Shield, Clock, Users } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/Button";
import { FadeIn, FadeInView } from "@/components/HomeAnimations";

const companies = [
  {
    id: "construction",
    name: "Jones Custom Homes",
    subtitle: "Custom Construction",
    description: "From concept to completion, we deliver exceptional construction projects on time and within budget.",
    iconAlt: "House blueprint icon representing Jones Custom Homes construction services",
    icon: "/JONES CUSTOM HOMES ICON (2).svg",
    href: "/services/construction",
    features: ["Residential Construction", "Commercial Projects", "Renovations", "Project Management"],
  },
  {
    id: "realty",
    name: "Blake Jones Realty",
    subtitle: "Real Estate Services",
    description: "Find your dream property or let us help you sell. Expert guidance through every step.",
    iconAlt: "Property key icon representing Blake Jones Realty real estate services",
    icon: "/JONES REALTY ICON (2).svg",
    href: "/services/real-estate",
    features: ["Property Search", "Market Analysis", "Buyer/Seller Representation", "Investment Consulting"],
  },
  {
    id: "interiors",
    name: "Interiors By Jones",
    subtitle: "Design & Staging",
    description: "Transform spaces with professional interior design and staging services that captivate.",
    iconAlt: "Interior design palette icon representing Interiors By Jones design and staging services",
    icon: "/JONES Interior Design & Staging ICON (2).svg",
    href: "/services/interior-design",
    features: ["Interior Design", "Home Staging", "Space Planning", "Color Consultation"],
  },
];

const stats = [
  { value: "100+", label: "Projects Completed" },
  { value: "10+", label: "Years Experience" },
  { value: "98%", label: "Client Satisfaction" },
  { value: "50+", label: "Industry Partners" },
];

const trustPoints = [
  {
    icon: Shield,
    title: "Licensed & Insured",
    description: "Fully licensed general contractor with comprehensive insurance coverage for your peace of mind.",
  },
  {
    icon: Clock,
    title: "On Time & On Budget",
    description: "We respect your timeline and investment with transparent scheduling and cost management.",
  },
  {
    icon: Users,
    title: "Local Expertise",
    description: "Deep roots in Southern Utah with over a decade of trusted relationships and community involvement.",
  },
  {
    icon: CheckCircle2,
    title: "Quality Guaranteed",
    description: "Every project is backed by our commitment to craftsmanship and client satisfaction.",
  },
];

export default function HomePage() {
  return (
    <>
      <Navigation />

      {/* Hero Section */}
      <section className="min-h-screen bg-gradient-to-br from-slate-50 to-white pt-24 pb-32 flex flex-col justify-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn className="text-center mb-16">
            <h1 className="text-4xl md:text-6xl font-serif font-bold text-slate-950 mb-4">
              Building Legacies,
              <br />
              <span className="text-slate-600">One Project at a Time</span>
            </h1>
            <p className="text-gray-700 text-lg leading-relaxed max-w-2xl mx-auto mb-8">
              Three specialized brands working together to deliver your complete home journey in Southern Utah.
            </p>
            <Link href="/estimate">
              <Button size="lg" className="bg-sky-700 hover:bg-sky-800 text-white shadow-sm min-h-[44px]">
                Get a Free Estimate
                <ArrowRight className="w-5 h-5 ml-2" aria-hidden="true" />
              </Button>
            </Link>
          </FadeIn>

          {/* Staggered glass cards */}
          <div className="relative flex flex-col md:flex-row justify-center items-center gap-8 md:gap-12">
            {companies.map((company, i) => (
              <Link
                key={company.id}
                href={company.href}
                className="w-full md:w-[340px] min-h-[44px]"
                aria-label={`Learn more about ${company.name} — ${company.subtitle}`}
              >
                <FadeIn delay={i * 0.15}>
                  <div
                    className={`h-full bg-gradient-to-br from-slate-900 via-gray-900 to-zinc-900 backdrop-blur-xl border border-white/10 rounded-3xl p-8
                      ${i === 1 ? "md:z-20 md:scale-110 hover:md:scale-[1.15]" : "md:z-10 hover:md:scale-105"}
                      hover:border-white/20 transition-all duration-500 group cursor-pointer`}
                  >
                    <div className="w-20 h-20 flex items-center justify-center mb-6">
                      <Image src={company.icon} alt={company.iconAlt} width={56} height={56} />
                    </div>
                    <h2 className="text-2xl font-serif font-bold text-white mb-1">{company.name}</h2>
                    <p className="text-white/70 text-sm mb-4">{company.subtitle}</p>
                    <p className="text-white/80 text-sm leading-relaxed mb-6">{company.description}</p>
                    <ul className="space-y-2 mb-6">
                      {company.features.slice(0, 3).map((f) => (
                        <li key={f} className="text-white/75 text-sm flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-white rounded-full flex-shrink-0" aria-hidden="true" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <span className="inline-flex items-center gap-2 text-white font-medium text-sm group-hover:gap-3 transition-all">
                      Learn More <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </span>
                  </div>
                </FadeIn>
              </Link>
            ))}
          </div>

        </div>
      </section>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" aria-hidden="true" />

      {/* Why Choose Us Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeInView className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-slate-950 mb-4">
              Why Choose Jones Legacy Creations
            </h2>
            <p className="text-gray-700 text-lg leading-relaxed max-w-2xl mx-auto">
              With deep roots in Southern Utah, we bring integrity, expertise, and a personal touch to every project.
            </p>
          </FadeInView>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {trustPoints.map((point, index) => (
              <FadeInView key={point.title} delay={index * 0.1}>
                <div className="text-center p-6 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center rounded-full bg-sky-100 text-sky-700">
                    <point.icon className="w-6 h-6" aria-hidden="true" />
                  </div>
                  <h3 className="text-lg font-serif font-bold text-slate-900 mb-2">{point.title}</h3>
                  <p className="text-gray-700 text-sm leading-relaxed">{point.description}</p>
                </div>
              </FadeInView>
            ))}
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" aria-hidden="true" />

      {/* Stats Section */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeInView className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-slate-950 mb-4">
              Trusted Across Southern Utah
            </h2>
          </FadeInView>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <FadeInView key={stat.label} delay={index * 0.1} className="text-center">
                <div className="text-4xl md:text-5xl font-bold font-serif text-slate-950 mb-2">
                  {stat.value}
                </div>
                <div className="text-gray-700 text-sm md:text-base leading-relaxed">
                  {stat.label}
                </div>
              </FadeInView>
            ))}
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent" aria-hidden="true" />

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-gray-900 to-black text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <FadeInView>
            <h2 className="text-4xl md:text-5xl font-serif font-bold mb-6">
              Ready to Start Your Next Project?
            </h2>
            <p className="text-xl text-gray-300 leading-relaxed max-w-2xl mx-auto mb-10">
              Let&apos;s discuss how we can help bring your vision to life.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/estimate">
                <Button size="lg" className="bg-sky-700 hover:bg-sky-800 text-white shadow-sm min-h-[44px] w-full sm:w-auto">
                  Get a Free Estimate
                  <ArrowRight className="w-5 h-5 ml-2" aria-hidden="true" />
                </Button>
              </Link>
              <Link href="/contact">
                <Button size="lg" variant="secondary" className="min-h-[44px] w-full sm:w-auto">
                  Get in Touch
                  <ArrowRight className="w-5 h-5 ml-2" aria-hidden="true" />
                </Button>
              </Link>
            </div>
          </FadeInView>
        </div>
      </section>

      <Footer />
    </>
  );
}
