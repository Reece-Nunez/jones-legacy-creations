"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { ArrowLeft, X, ChevronLeft, ChevronRight } from "lucide-react";

const S3_BASE_URL = "https://jones-legacy-creations.s3.us-east-1.amazonaws.com/interior/";

type Category = "All" | "Bedrooms" | "Kitchens" | "Living Rooms" | "Bathrooms" | "Other";

interface PortfolioImage {
  filename: string;
  category: Category;
  description?: string;
  rotate?: number;
  ext?: string;
  project?: string;
}

const portfolioImages: PortfolioImage[] = [
  // Bedrooms
  { filename: "bedroom-1", category: "Bedrooms", description: "Serene bedroom retreat", rotate: 90 },
  { filename: "bedroom-2", category: "Bedrooms", description: "Modern bedroom styling" },
  { filename: "bedroom-3", category: "Bedrooms", description: "Cozy bedroom design" },
  { filename: "bedroom-4", category: "Bedrooms", description: "Contemporary bedroom" },
  { filename: "bedroom-5", category: "Bedrooms", description: "Sophisticated bedroom space" },
  { filename: "bedroom-6", category: "Bedrooms", description: "Stylish bedroom interior" },
  { filename: "bedroom-7", category: "Bedrooms", description: "Comfortable bedroom retreat" },
  { filename: "bedroom-8", category: "Bedrooms", description: "Refined bedroom styling" },

  // Kitchens
  { filename: "kitchen-1", category: "Kitchens", description: "Stunning kitchen transformation" },
  { filename: "kitchen-2", category: "Kitchens", description: "Modern kitchen design" },
  { filename: "kitchen-3", category: "Kitchens", description: "Sleek contemporary kitchen" },
  { filename: "kitchen-4", category: "Kitchens", description: "Gourmet kitchen space" },
  { filename: "kitchen-5", category: "Kitchens", description: "Custom kitchen cabinetry" },
  { filename: "kitchen-6", category: "Kitchens", description: "Elegant kitchen styling" },
  { filename: "kitchen-7", category: "Kitchens", description: "Functional kitchen design" },
  { filename: "kitchen-8", category: "Kitchens", description: "Sophisticated kitchen" },
  { filename: "kitchen-9", category: "Kitchens", description: "Stylish kitchen interior" },
  { filename: "kitchen-10", category: "Kitchens", description: "Contemporary kitchen space" },
  { filename: "kitchen-11", category: "Kitchens", description: "Designer kitchen" },
  { filename: "kitchen-12", category: "Kitchens", description: "Modern kitchen styling" },
  { filename: "kitchen-13", category: "Kitchens", description: "Luxury kitchen design" },

  // Living Rooms
  { filename: "living-room-1", category: "Living Rooms", description: "Inviting living room space" },
  { filename: "living-room-2", category: "Living Rooms", description: "Modern living room design" },
  { filename: "living-room-3", category: "Living Rooms", description: "Elegant living area" },
  { filename: "living-room-4", category: "Living Rooms", description: "Comfortable living space" },
  { filename: "living-room-5", category: "Living Rooms", description: "Sophisticated living room" },
  { filename: "living-room-6", category: "Living Rooms", description: "Contemporary living area" },
  { filename: "living-room-7", category: "Living Rooms", description: "Designer living room" },
  { filename: "living-room-8", category: "Living Rooms", description: "Beautiful living area" },
  { filename: "living-room-9", category: "Living Rooms", description: "Modern living space" },
  { filename: "living-room-10", category: "Living Rooms", description: "Refined living room" },
  { filename: "living-room-11", category: "Living Rooms", description: "Elegant living design" },
  { filename: "living-room-12", category: "Living Rooms", description: "Luxury living room" },
  { filename: "living-room-13", category: "Living Rooms", description: "Stylish living room design" },
  { filename: "living-room-14", category: "Living Rooms", description: "Contemporary living room" },
  { filename: "living-room-15", category: "Living Rooms", description: "Designer living space" },
  { filename: "living-room-16", category: "Living Rooms", description: "Beautiful living room" },
  { filename: "living-room-17", category: "Living Rooms", description: "Elegant living interior" },
  { filename: "living-room-18", category: "Living Rooms", description: "Premium living room design" },

  // Bathrooms
  { filename: "bathroom-1", category: "Bathrooms", description: "Spa-like bathroom retreat" },
  { filename: "bathroom-2", category: "Bathrooms", description: "Luxury bathroom styling" },
  { filename: "bathroom-3", category: "Bathrooms", description: "Elegant bathroom space" },
  { filename: "bathroom-4", category: "Bathrooms", description: "Contemporary bathroom" },

  // Other
  { filename: "other-1", category: "Other", description: "Charming nursery design" },
  { filename: "other-2", category: "Other", description: "Stunning outdoor space" },
  { filename: "other-3", category: "Other", description: "Custom interior styling" },

  // Rolling Rock Drive - Bedrooms
  { filename: "rolling-rock-drive-bedroom-1", category: "Bedrooms", description: "Rolling Rock Drive bedroom", ext: "jpeg", project: "Rolling Rock Drive" },
  { filename: "rolling-rock-drive-bedroom-2", category: "Bedrooms", description: "Rolling Rock Drive bedroom styling", ext: "jpeg", project: "Rolling Rock Drive" },
  { filename: "rolling-rock-drive-bedroom-3", category: "Bedrooms", description: "Rolling Rock Drive cozy bedroom", ext: "jpeg", project: "Rolling Rock Drive" },
  { filename: "rolling-rock-drive-bedroom-4", category: "Bedrooms", description: "Rolling Rock Drive bedroom retreat", ext: "jpeg", project: "Rolling Rock Drive" },
  { filename: "rolling-rock-drive-bedroom-5", category: "Bedrooms", description: "Rolling Rock Drive master bedroom", ext: "jpeg", project: "Rolling Rock Drive" },

  // Rolling Rock Drive - Bathrooms
  { filename: "rolling-rock-drive-bathroom-1", category: "Bathrooms", description: "Rolling Rock Drive bathroom", ext: "jpeg", project: "Rolling Rock Drive" },
  { filename: "rolling-rock-drive-bathroom-2", category: "Bathrooms", description: "Rolling Rock Drive bathroom styling", ext: "jpeg", project: "Rolling Rock Drive" },
  { filename: "rolling-rock-drive-bathroom-3", category: "Bathrooms", description: "Rolling Rock Drive spa bathroom", ext: "jpeg", project: "Rolling Rock Drive" },
  { filename: "rolling-rock-drive-bathroom-4", category: "Bathrooms", description: "Rolling Rock Drive bathroom retreat", ext: "jpeg", project: "Rolling Rock Drive" },
  { filename: "rolling-rock-drive-bathroom-5", category: "Bathrooms", description: "Rolling Rock Drive modern bathroom", ext: "jpeg", project: "Rolling Rock Drive" },

  // Rolling Rock Drive - Kitchens
  { filename: "rolling-rock-drive-kitchen-1", category: "Kitchens", description: "Rolling Rock Drive kitchen", ext: "jpeg", project: "Rolling Rock Drive" },
  { filename: "rolling-rock-drive-kitchen-2", category: "Kitchens", description: "Rolling Rock Drive kitchen styling", ext: "jpeg", project: "Rolling Rock Drive" },
  { filename: "rolling-rock-drive-kitchen-3", category: "Kitchens", description: "Rolling Rock Drive modern kitchen", ext: "jpeg", project: "Rolling Rock Drive" },
  { filename: "rolling-rock-drive-kitchen-4", category: "Kitchens", description: "Rolling Rock Drive kitchen design", ext: "jpeg", project: "Rolling Rock Drive" },
  { filename: "rolling-rock-drive-kitchen-5", category: "Kitchens", description: "Rolling Rock Drive gourmet kitchen", ext: "jpeg", project: "Rolling Rock Drive" },
  { filename: "rolling-rock-drive-kitchen-6", category: "Kitchens", description: "Rolling Rock Drive kitchen space", ext: "jpeg", project: "Rolling Rock Drive" },
  { filename: "rolling-rock-drive-kitchen-7", category: "Kitchens", description: "Rolling Rock Drive custom kitchen", ext: "jpeg", project: "Rolling Rock Drive" },
  { filename: "rolling-rock-drive-kitchen-8", category: "Kitchens", description: "Rolling Rock Drive elegant kitchen", ext: "jpeg", project: "Rolling Rock Drive" },
  { filename: "rolling-rock-drive-kitchen-9", category: "Kitchens", description: "Rolling Rock Drive luxury kitchen", ext: "jpeg", project: "Rolling Rock Drive" },

  // Rolling Rock Drive - Living Rooms
  { filename: "rolling-rock-drive-living-room-1", category: "Living Rooms", description: "Rolling Rock Drive living room", ext: "jpeg", project: "Rolling Rock Drive" },

  // Rolling Rock Drive - Other
  { filename: "rolling-rock-drive-other-1", category: "Other", description: "Rolling Rock Drive interior", ext: "jpeg", project: "Rolling Rock Drive" },
  { filename: "rolling-rock-drive-other-2", category: "Other", description: "Rolling Rock Drive design detail", ext: "jpeg", project: "Rolling Rock Drive" },

  // Enterprise
  { filename: "enterprise-living-room-1", category: "Living Rooms", description: "Enterprise great room with stone fireplace", project: "Enterprise" },
  { filename: "enterprise-living-room-2", category: "Living Rooms", description: "Enterprise open-concept living area", project: "Enterprise" },
  { filename: "enterprise-kitchen-1", category: "Kitchens", description: "Enterprise kitchen with custom island", project: "Enterprise" },
  { filename: "enterprise-kitchen-2", category: "Kitchens", description: "Enterprise kitchen details", project: "Enterprise" },
  { filename: "enterprise-bedroom-1", category: "Bedrooms", description: "Enterprise master bedroom", project: "Enterprise" },
  { filename: "enterprise-bathroom-1", category: "Bathrooms", description: "Enterprise spa bathroom", project: "Enterprise" },
  { filename: "enterprise-other-1", category: "Other", description: "Enterprise dining and entry", project: "Enterprise" },
];

export default function GalleryPage() {
  return (
    <Suspense>
      <GalleryContent />
    </Suspense>
  );
}

function GalleryContent() {
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category");
  const initialCategory: Category = categoryParam && ["Bedrooms", "Kitchens", "Living Rooms", "Bathrooms", "Other"].includes(categoryParam)
    ? (categoryParam as Category)
    : "All";
  const [activeCategory, setActiveCategory] = useState<Category>(initialCategory);
  const [lightboxImage, setLightboxImage] = useState<PortfolioImage | null>(null);

  const categories: Category[] = ["All", "Bedrooms", "Kitchens", "Living Rooms", "Bathrooms", "Other"];

  const filteredImages = activeCategory === "All"
    ? portfolioImages
    : portfolioImages.filter(img => img.category === activeCategory);

  // Lightbox navigation
  const currentImageIndex = lightboxImage ? filteredImages.findIndex(img => img.filename === lightboxImage.filename) : -1;

  const goToNextImage = () => {
    if (currentImageIndex < filteredImages.length - 1) {
      setLightboxImage(filteredImages[currentImageIndex + 1]);
    }
  };

  const goToPrevImage = () => {
    if (currentImageIndex > 0) {
      setLightboxImage(filteredImages[currentImageIndex - 1]);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setLightboxImage(null);
    } else if (e.key === 'ArrowRight') {
      goToNextImage();
    } else if (e.key === 'ArrowLeft') {
      goToPrevImage();
    }
  };

  return (
    <>
      <Navigation />

      <main style={{ background: "var(--hm-paper)", color: "var(--hm-ink)" }}>
      {/* Header */}
      <section
        aria-label="Gallery header"
        style={{ background: "var(--hm-paper)" }}
      >
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 pt-32 pb-12 lg:pt-40">
          <Link
            href="/services/interior-design"
            className="inline-flex items-center gap-1.5 mb-10 font-mono uppercase transition-colors hover:text-[var(--hm-accent)]"
            style={{
              fontSize: "var(--hm-text-meta)",
              letterSpacing: "0.18em",
              color: "var(--hm-ink-3)",
            }}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to interior design
          </Link>
          <p
            className="font-mono uppercase mb-6"
            style={{
              fontSize: "var(--hm-text-meta)",
              letterSpacing: "0.22em",
              color: "var(--hm-ink-3)",
            }}
          >
            Interiors By Jones · Full archive
          </p>
          <h1
            className="font-serif font-normal italic"
            style={{
              fontSize: "clamp(2.75rem, 7vw, 6rem)",
              lineHeight: 0.97,
              color: "var(--hm-ink)",
              letterSpacing: "-0.02em",
            }}
          >
            The full gallery.
          </h1>
          <p
            className="mt-6 font-sans"
            style={{
              fontSize: "var(--hm-text-lede)",
              color: "var(--hm-ink-2)",
              lineHeight: 1.55,
              maxWidth: "55ch",
            }}
          >
            Every interior and staging project on file. Filter by room or
            browse the whole archive.
          </p>
        </div>
      </section>

      <section
        aria-label="Interior design photo gallery"
        style={{ background: "var(--hm-paper)" }}
      >
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 pb-20">
          {/* Filter tabs — mono-caps chips with hairline borders */}
          <div
            className="flex flex-wrap gap-2 mb-8"
            role="tablist"
            aria-label="Filter gallery by room category"
          >
            {categories.map((category) => {
              const active = activeCategory === category;
              return (
                <button
                  key={category}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveCategory(category)}
                  className="inline-flex items-center justify-center font-mono uppercase border transition-colors duration-200"
                  style={{
                    fontSize: "var(--hm-text-meta)",
                    letterSpacing: "0.15em",
                    padding: "0.625rem 1rem",
                    minHeight: 40,
                    whiteSpace: "nowrap",
                    borderColor: active
                      ? "var(--hm-ink)"
                      : "var(--hm-rule-thick)",
                    background: active ? "var(--hm-ink)" : "transparent",
                    color: active ? "var(--hm-paper)" : "var(--hm-ink)",
                  }}
                >
                  {category}
                </button>
              );
            })}
          </div>

          <p
            className="font-mono uppercase mb-10"
            style={{
              fontSize: "10px",
              letterSpacing: "0.22em",
              color: "var(--hm-ink-3)",
            }}
          >
            {filteredImages.length}{" "}
            {filteredImages.length === 1 ? "image" : "images"}
          </p>

          {/* Image Gallery */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeCategory}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8"
            >
              {filteredImages.map((image) => (
                <div
                  key={image.filename}
                  className="group cursor-pointer flex flex-col h-full"
                  style={{
                    background: "var(--hm-paper)",
                    border: "1px solid var(--hm-rule)",
                    transition: "border-color var(--hm-dur-short) var(--hm-ease-out)",
                  }}
                  onClick={() => setLightboxImage(image)}
                  role="button"
                  tabIndex={0}
                  aria-label={`View ${image.description || image.category + " design"} in full size`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setLightboxImage(image);
                    }
                  }}
                >
                  <div
                    className="aspect-[4/3] relative overflow-hidden"
                    style={{ background: "var(--hm-paper-3)" }}
                  >
                    <Image
                      src={`${S3_BASE_URL}${image.filename}.${image.ext || "webp"}`}
                      alt={image.description || `${image.category} interior design project`}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover"
                      style={image.rotate ? { transform: `rotate(${image.rotate}deg)` } : undefined}
                      loading="lazy"
                    />
                  </div>
                  <div className="p-5 sm:p-6 flex flex-col gap-2 flex-1">
                    <p
                      className="font-mono uppercase"
                      style={{
                        fontSize: "10px",
                        letterSpacing: "0.22em",
                        color: "var(--hm-ink-3)",
                      }}
                    >
                      {image.category}
                      {image.project && (
                        <span className="ml-2">· {image.project}</span>
                      )}
                    </p>
                    <p
                      className="font-serif italic"
                      style={{
                        fontSize: "var(--hm-text-body)",
                        color: "var(--hm-ink)",
                        lineHeight: 1.3,
                      }}
                    >
                      {image.description}
                    </p>
                  </div>
                </div>
              ))}
            </motion.div>
          </AnimatePresence>

          {filteredImages.length === 0 && (
            <div
              className="px-8 py-16 mt-4"
              style={{
                background: "var(--hm-paper-2)",
                borderTop: "1px solid var(--hm-rule)",
                borderBottom: "1px solid var(--hm-rule)",
              }}
            >
              <p
                className="font-serif italic"
                style={{
                  fontSize: "var(--hm-text-h3)",
                  color: "var(--hm-ink)",
                  lineHeight: 1.3,
                }}
              >
                No images in this category yet.
              </p>
            </div>
          )}
        </div>
      </section>
      </main>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {lightboxImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4"
            role="dialog"
            aria-modal="true"
            aria-label={`Viewing ${lightboxImage.description || lightboxImage.category + ' design'} - ${currentImageIndex + 1} of ${filteredImages.length}`}
            onClick={() => setLightboxImage(null)}
            onKeyDown={handleKeyDown}
            tabIndex={0}
          >
            {/* Close Button */}
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute top-4 right-4 z-50 w-12 h-12 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full transition-colors min-h-[44px] min-w-[44px]"
              aria-label="Close lightbox"
            >
              <X aria-hidden="true" className="w-6 h-6 text-white" />
            </button>

            {/* Previous Button */}
            {currentImageIndex > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goToPrevImage();
                }}
                className="absolute left-4 z-50 w-12 h-12 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full transition-colors min-h-[44px] min-w-[44px]"
                aria-label="Previous image"
              >
                <ChevronLeft aria-hidden="true" className="w-6 h-6 text-white" />
              </button>
            )}

            {/* Next Button */}
            {currentImageIndex < filteredImages.length - 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goToNextImage();
                }}
                className="absolute right-4 z-50 w-12 h-12 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full transition-colors min-h-[44px] min-w-[44px]"
                aria-label="Next image"
              >
                <ChevronRight aria-hidden="true" className="w-6 h-6 text-white" />
              </button>
            )}

            {/* Image Container */}
            <div
              className="relative max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative w-full h-full">
                <Image
                  src={`${S3_BASE_URL}${lightboxImage.filename}.${lightboxImage.ext || "webp"}`}
                  alt={lightboxImage.description || `${lightboxImage.category} interior design project`}
                  fill
                  className="object-contain"
                  style={lightboxImage.rotate ? { transform: `rotate(${lightboxImage.rotate}deg)` } : undefined}
                  priority
                />
              </div>

              {/* Image Info */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                <div className="text-white">
                  <div className="text-sm mb-1">{lightboxImage.category}</div>
                  <p className="text-lg">{lightboxImage.description}</p>
                  <p className="text-sm text-gray-300 mt-2">
                    {currentImageIndex + 1} / {filteredImages.length}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Footer />
    </>
  );
}
