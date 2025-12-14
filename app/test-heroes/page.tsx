"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ChevronLeft, ChevronRight, Home, Building2, Palette, X } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/Button";
import { useState } from "react";

const companies = [
  {
    id: "construction",
    name: "Jones Custom Homes",
    subtitle: "Custom Construction",
    description: "From concept to completion, we deliver exceptional construction projects on time and within budget.",
    icon: "/JONES CUSTOM HOMES ICON (2).svg",
    href: "/services/construction",
    color: "from-amber-900 to-stone-900",
    bgImage: "/construction-bg.jpg",
    features: ["Residential Construction", "Commercial Projects", "Renovations", "Project Management"],
  },
  {
    id: "realty",
    name: "Blake Jones Realty",
    subtitle: "Real Estate Services",
    description: "Find your dream property or let us help you sell. Expert guidance through every step.",
    icon: "/JONES REALTY ICON (2).svg",
    href: "/services/real-estate",
    color: "from-slate-800 to-zinc-900",
    bgImage: "/realty-bg.jpg",
    features: ["Property Search", "Market Analysis", "Buyer/Seller Representation", "Investment Consulting"],
  },
  {
    id: "interiors",
    name: "Interiors By Jones",
    subtitle: "Design & Staging",
    description: "Transform spaces with professional interior design and staging services that captivate.",
    icon: "/JONES Interior Design & Staging ICON (2).svg",
    href: "/services/interior-design",
    color: "from-neutral-800 to-stone-900",
    bgImage: "/interiors-bg.jpg",
    features: ["Interior Design", "Home Staging", "Space Planning", "Color Consultation"],
  },
];

// Option 1: Bento Grid Layout
function BentoGridHero() {
  return (
    <section className="min-h-screen bg-gradient-to-br from-gray-50 to-white pt-20 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-6xl font-serif font-bold mb-4">
            Building Legacies,
            <span className="text-gray-500"> One Project at a Time</span>
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Three brands, one seamless experience for your complete home journey.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 auto-rows-[200px] md:auto-rows-[220px]">
          {/* Construction - Large tile */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="md:col-span-2 md:row-span-2 relative group cursor-pointer overflow-hidden rounded-3xl bg-gradient-to-br from-stone-900 to-amber-950"
          >
            <div className="absolute inset-0 bg-[url('/construction/haven-hideaway/exterior-1.jpg')] bg-cover bg-center opacity-40 group-hover:opacity-50 group-hover:scale-105 transition-all duration-700" />
            <div className="relative h-full p-8 flex flex-col justify-between">
              <div className="w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <Image src="/JONES CUSTOM HOMES ICON (2).svg" alt="" width={40} height={40} />
              </div>
              <div>
                <h3 className="text-3xl md:text-4xl font-serif font-bold text-white mb-2">Jones Custom Homes</h3>
                <p className="text-white/70 mb-4 max-w-md">Build your dream home with expert craftsmanship and attention to every detail.</p>
                <span className="inline-flex items-center gap-2 text-white font-medium group-hover:gap-3 transition-all">
                  Explore Construction <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </div>
          </motion.div>

          {/* Realty - Medium tile */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="relative group cursor-pointer overflow-hidden rounded-3xl bg-gradient-to-br from-slate-800 to-zinc-900"
          >
            <div className="absolute inset-0 bg-[url('/real-estate-bg.jpg')] bg-cover bg-center opacity-30 group-hover:opacity-40 group-hover:scale-105 transition-all duration-700" />
            <div className="relative h-full p-6 flex flex-col justify-between">
              <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <Image src="/JONES REALTY ICON (2).svg" alt="" width={32} height={32} />
              </div>
              <div>
                <h3 className="text-xl font-serif font-bold text-white mb-1">Blake Jones Realty</h3>
                <span className="inline-flex items-center gap-1 text-white/70 text-sm group-hover:text-white transition-colors">
                  Find Your Home <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          </motion.div>

          {/* Interiors - Medium tile */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="relative group cursor-pointer overflow-hidden rounded-3xl bg-gradient-to-br from-neutral-800 to-stone-900"
          >
            <div className="absolute inset-0 bg-[url('/interior-design/gallery-1.jpg')] bg-cover bg-center opacity-30 group-hover:opacity-40 group-hover:scale-105 transition-all duration-700" />
            <div className="relative h-full p-6 flex flex-col justify-between">
              <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <Image src="/JONES Interior Design & Staging ICON (2).svg" alt="" width={32} height={32} />
              </div>
              <div>
                <h3 className="text-xl font-serif font-bold text-white mb-1">Interiors By Jones</h3>
                <span className="inline-flex items-center gap-1 text-white/70 text-sm group-hover:text-white transition-colors">
                  Transform Spaces <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex justify-center mt-12 gap-4"
        >
          <Button size="lg">Start Your Project <ArrowRight className="w-4 h-4 ml-2" /></Button>
          <Button size="lg" variant="secondary">Learn More</Button>
        </motion.div>
      </div>
    </section>
  );
}

// Option 2: Interactive Spotlight Hero
function SpotlightHero() {
  const [active, setActive] = useState(0);
  const company = companies[active];

  return (
    <section className="min-h-screen relative overflow-hidden">
      {/* Background */}
      <AnimatePresence mode="wait">
        <motion.div
          key={active}
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7 }}
          className={`absolute inset-0 bg-gradient-to-br ${company.color}`}
        />
      </AnimatePresence>

      <div className="absolute inset-0 bg-black/40" />

      <div className="relative z-10 min-h-screen flex flex-col justify-center items-center px-4 pt-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <p className="text-white/60 text-sm uppercase tracking-widest mb-4">Jones Legacy Creations</p>
          <h1 className="text-4xl md:text-6xl font-serif font-bold text-white mb-4">
            Building Legacies,
            <br />
            <span className="text-white/70">One Project at a Time</span>
          </h1>
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-2xl"
          >
            <div className="w-20 h-20 mx-auto mb-6 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <Image src={company.icon} alt="" width={50} height={50} />
            </div>
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-white mb-2">{company.name}</h2>
            <p className="text-white/60 mb-2">{company.subtitle}</p>
            <p className="text-white/80 mb-6">{company.description}</p>
            <Button size="lg" variant="secondary">
              Explore {company.name.split(" ")[0]} <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </motion.div>
        </AnimatePresence>

        {/* Company Selector */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex gap-4">
          {companies.map((c, i) => (
            <button
              key={c.id}
              onClick={() => setActive(i)}
              className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                active === i
                  ? "bg-white scale-110 shadow-xl"
                  : "bg-white/10 backdrop-blur-sm hover:bg-white/20"
              }`}
            >
              <Image
                src={c.icon}
                alt={c.name}
                width={36}
                height={36}
                className={active === i ? "" : "brightness-0 invert"}
              />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

// Option 3: Glassmorphism Cards
function GlassmorphismHero() {
  return (
    <section className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-900 via-stone-900 to-zinc-900">
      {/* Decorative background elements */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-amber-500/20 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-stone-500/20 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl md:text-6xl font-serif font-bold text-white mb-4">
            Building Legacies,
            <br />
            <span className="text-white/60">One Project at a Time</span>
          </h1>
          <p className="text-white/50 max-w-xl mx-auto">
            Three specialized brands working together to deliver your complete home journey.
          </p>
        </motion.div>

        {/* Staggered glass cards */}
        <div className="relative flex flex-col md:flex-row justify-center items-center gap-6 md:gap-0">
          {companies.map((company, i) => (
            <motion.div
              key={company.id}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.15 }}
              className={`w-full md:w-[340px] bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8
                ${i === 1 ? "md:-mx-4 md:z-20 md:scale-105" : "md:z-10"}
                hover:bg-white/10 hover:border-white/20 transition-all duration-500 group cursor-pointer`}
            >
              <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-6">
                <Image src={company.icon} alt="" width={40} height={40} />
              </div>
              <h3 className="text-2xl font-serif font-bold text-white mb-1">{company.name}</h3>
              <p className="text-white/50 text-sm mb-4">{company.subtitle}</p>
              <p className="text-white/70 text-sm mb-6">{company.description}</p>
              <ul className="space-y-2 mb-6">
                {company.features.slice(0, 3).map((f) => (
                  <li key={f} className="text-white/60 text-sm flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-white/40 rounded-full" />
                    {f}
                  </li>
                ))}
              </ul>
              <span className="inline-flex items-center gap-2 text-white font-medium text-sm group-hover:gap-3 transition-all">
                Learn More <ArrowRight className="w-4 h-4" />
              </span>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex justify-center mt-16 gap-4"
        >
          <Button size="lg">Start Your Project <ArrowRight className="w-4 h-4 ml-2" /></Button>
        </motion.div>
      </div>
    </section>
  );
}

// Option 4: Horizontal Scroll Showcase
function HorizontalScrollHero() {
  return (
    <section className="min-h-screen bg-black pt-20">
      <div className="h-screen flex flex-col">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-8 px-4"
        >
          <h1 className="text-3xl md:text-5xl font-serif font-bold text-white mb-2">
            Building Legacies, <span className="text-white/50">One Project at a Time</span>
          </h1>
          <p className="text-white/40 text-sm">Scroll horizontally to explore our brands</p>
        </motion.div>

        <div className="flex-1 overflow-x-auto snap-x snap-mandatory scrollbar-hide">
          <div className="flex h-full">
            {companies.map((company, i) => (
              <motion.div
                key={company.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.2 }}
                className={`min-w-[100vw] md:min-w-[60vw] h-full snap-center flex-shrink-0 relative group`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${company.color}`} />
                <div className="absolute inset-4 md:inset-8 border border-white/10 rounded-3xl overflow-hidden">
                  <div className="h-full flex flex-col justify-between p-8 md:p-12">
                    <div className="w-20 h-20 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                      <Image src={company.icon} alt="" width={50} height={50} />
                    </div>
                    <div>
                      <p className="text-white/40 text-sm uppercase tracking-wider mb-2">{company.subtitle}</p>
                      <h2 className="text-4xl md:text-6xl font-serif font-bold text-white mb-4">{company.name}</h2>
                      <p className="text-white/70 max-w-md mb-8">{company.description}</p>
                      <Button variant="secondary" size="lg">
                        Explore <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// Option 5: Hover Reveal Panels
function HoverPanelsHero() {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <section className="min-h-screen bg-black pt-20">
      <div className="h-screen flex flex-col">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-8 px-4"
        >
          <h1 className="text-3xl md:text-5xl font-serif font-bold text-white mb-2">
            Building Legacies, <span className="text-white/50">One Project at a Time</span>
          </h1>
          <p className="text-white/40 text-sm">Hover to explore</p>
        </motion.div>

        <div className="flex-1 flex">
          {companies.map((company, i) => (
            <motion.div
              key={company.id}
              initial={{ opacity: 0 }}
              animate={{
                opacity: 1,
                flex: hovered === null ? 1 : hovered === i ? 2 : 0.5
              }}
              transition={{ duration: 0.5 }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              className={`relative cursor-pointer overflow-hidden border-r border-white/10 last:border-r-0`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${company.color} transition-opacity duration-500 ${
                hovered === i ? "opacity-100" : "opacity-70"
              }`} />

              <div className="relative h-full flex flex-col items-center justify-center p-8 text-center">
                <motion.div
                  animate={{ scale: hovered === i ? 1.1 : 1 }}
                  className="w-16 h-16 md:w-20 md:h-20 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-6"
                >
                  <Image src={company.icon} alt="" width={40} height={40} />
                </motion.div>

                <h3 className={`text-xl md:text-3xl font-serif font-bold text-white mb-2 transition-all duration-300 ${
                  hovered !== null && hovered !== i ? "opacity-50" : ""
                }`}>
                  {hovered === i ? company.name : company.name.split(" ")[0]}
                </h3>

                <AnimatePresence>
                  {hovered === i && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <p className="text-white/50 text-sm mb-2">{company.subtitle}</p>
                      <p className="text-white/70 text-sm max-w-xs mb-6">{company.description}</p>
                      <Button variant="secondary" size="sm">
                        Explore <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Option 6: Minimal Logo Strip
function MinimalLogoHero() {
  return (
    <section className="min-h-screen bg-white pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Hero */}
        <div className="min-h-[60vh] flex flex-col justify-center items-center text-center py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-gray-400 text-sm uppercase tracking-widest mb-6">Jones Legacy Creations</p>
            <h1 className="text-5xl md:text-7xl font-serif font-bold mb-6">
              Building Legacies,
              <br />
              <span className="text-gray-400">One Project at a Time</span>
            </h1>
            <p className="text-gray-600 max-w-xl mx-auto mb-12">
              Three specialized brands working seamlessly together to deliver your complete home journey.
            </p>

            {/* Logo Strip */}
            <div className="flex justify-center items-center gap-8 md:gap-16 mb-12">
              {companies.map((company, i) => (
                <motion.div
                  key={company.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="flex flex-col items-center gap-2 group cursor-pointer"
                >
                  <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-gray-100 flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                    <Image src={company.icon} alt={company.name} width={36} height={36} />
                  </div>
                  <span className="text-xs text-gray-400 group-hover:text-gray-600 transition-colors hidden md:block">
                    {company.name.split(" ")[0]}
                  </span>
                </motion.div>
              ))}
            </div>

            <div className="flex gap-4 justify-center">
              <Button size="lg">Start Your Project <ArrowRight className="w-4 h-4 ml-2" /></Button>
              <Button size="lg" variant="secondary">Learn More</Button>
            </div>
          </motion.div>
        </div>

        {/* Detailed Cards Below */}
        <div className="grid md:grid-cols-3 gap-6 pb-20">
          {companies.map((company, i) => (
            <motion.div
              key={company.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group cursor-pointer"
            >
              <div className="aspect-[4/3] rounded-2xl bg-gray-100 mb-4 overflow-hidden relative">
                <div className={`absolute inset-0 bg-gradient-to-br ${company.color} opacity-90`} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Image src={company.icon} alt="" width={60} height={60} className="opacity-30" />
                </div>
              </div>
              <h3 className="text-xl font-serif font-bold mb-1 group-hover:text-gray-600 transition-colors">{company.name}</h3>
              <p className="text-gray-500 text-sm mb-2">{company.subtitle}</p>
              <p className="text-gray-600 text-sm">{company.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function TestHeroesPage() {
  const [viewing, setViewing] = useState<number | null>(null);

  const options = [
    { name: "Bento Grid", component: BentoGridHero, description: "Asymmetric grid layout with featured main tile" },
    { name: "Interactive Spotlight", component: SpotlightHero, description: "Single hero that transforms based on selection" },
    { name: "Glassmorphism Cards", component: GlassmorphismHero, description: "Frosted glass cards over dark gradient" },
    { name: "Horizontal Scroll", component: HorizontalScrollHero, description: "Full-page cards with snap scrolling" },
    { name: "Hover Reveal Panels", component: HoverPanelsHero, description: "Expandable vertical panels on hover" },
    { name: "Minimal Logo Strip", component: MinimalLogoHero, description: "Clean hero with logo bar and cards below" },
  ];

  // Full-screen preview mode
  if (viewing !== null) {
    const Option = options[viewing].component;
    return (
      <div className="relative">
        <button
          onClick={() => setViewing(null)}
          className="fixed top-24 right-6 z-50 bg-black text-white px-4 py-2 rounded-full flex items-center gap-2 hover:bg-gray-800 transition-colors shadow-xl"
        >
          <X className="w-4 h-4" /> Close Preview
        </button>
        <Navigation />
        <Option />
      </div>
    );
  }

  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-gray-50 pt-24 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-serif font-bold mb-4">Hero Section Options</h1>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Click on any option below to preview it full-screen. Each design showcases the three companies in a different modern style.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {options.map((option, i) => {
              const Preview = option.component;
              return (
                <motion.div
                  key={option.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  onClick={() => setViewing(i)}
                  className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-shadow cursor-pointer group border border-gray-200"
                >
                  <div className="aspect-video relative overflow-hidden bg-gray-100">
                    <div className="absolute inset-0 scale-[0.25] origin-top-left w-[400%] h-[400%] pointer-events-none">
                      <Preview />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
                      <span className="text-white font-medium flex items-center gap-2">
                        Preview Full Screen <ArrowRight className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-lg">Option {i + 1}: {option.name}</h3>
                    </div>
                    <p className="text-gray-600 text-sm">{option.description}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <div className="mt-12 text-center">
            <Link href="/">
              <Button variant="secondary">
                <ChevronLeft className="w-4 h-4 mr-2" /> Back to Current Homepage
              </Button>
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
