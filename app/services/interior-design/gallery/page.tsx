"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/Button";
import { ArrowLeft, X, ChevronLeft, ChevronRight } from "lucide-react";

const S3_BASE_URL = "https://jones-legacy-creations.s3.us-east-1.amazonaws.com/interior/";

type Category = "All" | "Bedrooms" | "Kitchens" | "Living Rooms" | "Bathrooms" | "Other";

interface PortfolioImage {
  id: number;
  category: Category;
  description?: string;
  rotate?: number;
}

const portfolioImages: PortfolioImage[] = [
  // Bedrooms
  { id: 11, category: "Bedrooms", description: "Serene bedroom retreat", rotate: 90 },
  { id: 15, category: "Bedrooms", description: "Modern bedroom styling" },
  { id: 17, category: "Bedrooms", description: "Cozy bedroom design" },
  { id: 24, category: "Bedrooms", description: "Contemporary bedroom" },
  { id: 37, category: "Bedrooms", description: "Sophisticated bedroom space" },
  { id: 41, category: "Bedrooms", description: "Stylish bedroom interior" },
  { id: 44, category: "Bedrooms", description: "Comfortable bedroom retreat" },
  { id: 45, category: "Bedrooms", description: "Refined bedroom styling" },

  // Kitchens
  { id: 2, category: "Kitchens", description: "Stunning kitchen transformation" },
  { id: 3, category: "Kitchens", description: "Modern kitchen design" },
  { id: 5, category: "Kitchens", description: "Sleek contemporary kitchen" },
  { id: 9, category: "Kitchens", description: "Gourmet kitchen space" },
  { id: 10, category: "Kitchens", description: "Custom kitchen cabinetry" },
  { id: 13, category: "Kitchens", description: "Elegant kitchen styling" },
  { id: 19, category: "Kitchens", description: "Functional kitchen design" },
  { id: 22, category: "Kitchens", description: "Sophisticated kitchen" },
  { id: 32, category: "Kitchens", description: "Stylish kitchen interior" },
  { id: 33, category: "Kitchens", description: "Contemporary kitchen space" },
  { id: 38, category: "Kitchens", description: "Designer kitchen" },
  { id: 51, category: "Kitchens", description: "Modern kitchen styling" },
  { id: 53, category: "Kitchens", description: "Luxury kitchen design" },

  // Living Rooms
  { id: 4, category: "Living Rooms", description: "Inviting living room space" },
  { id: 8, category: "Living Rooms", description: "Modern living room design" },
  { id: 12, category: "Living Rooms", description: "Elegant living area" },
  { id: 14, category: "Living Rooms", description: "Comfortable living space" },
  { id: 16, category: "Living Rooms", description: "Sophisticated living room" },
  { id: 23, category: "Living Rooms", description: "Contemporary living area" },
  { id: 28, category: "Living Rooms", description: "Designer living room" },
  { id: 29, category: "Living Rooms", description: "Beautiful living area" },
  { id: 30, category: "Living Rooms", description: "Modern living space" },
  { id: 34, category: "Living Rooms", description: "Refined living room" },
  { id: 35, category: "Living Rooms", description: "Elegant living design" },
  { id: 36, category: "Living Rooms", description: "Luxury living room" },
  { id: 49, category: "Living Rooms", description: "Stylish living room design" },
  { id: 50, category: "Living Rooms", description: "Contemporary living room" },
  { id: 58, category: "Living Rooms", description: "Designer living space" },
  { id: 60, category: "Living Rooms", description: "Beautiful living room" },
  { id: 61, category: "Living Rooms", description: "Elegant living interior" },
  { id: 62, category: "Living Rooms", description: "Premium living room design" },

  // Bathrooms
  { id: 6, category: "Bathrooms", description: "Spa-like bathroom retreat" },
  { id: 18, category: "Bathrooms", description: "Luxury bathroom styling" },
  { id: 46, category: "Bathrooms", description: "Elegant bathroom space" },
  { id: 47, category: "Bathrooms", description: "Contemporary bathroom" },

  // Other
  { id: 42, category: "Other", description: "Charming nursery design" },
  { id: 43, category: "Other", description: "Stunning outdoor space" },
  { id: 56, category: "Other", description: "Custom interior styling" },
];

export default function GalleryPage() {
  const [activeCategory, setActiveCategory] = useState<Category>("All");
  const [lightboxImage, setLightboxImage] = useState<PortfolioImage | null>(null);

  const categories: Category[] = ["All", "Bedrooms", "Kitchens", "Living Rooms", "Bathrooms", "Other"];

  const filteredImages = activeCategory === "All"
    ? portfolioImages
    : portfolioImages.filter(img => img.category === activeCategory);

  // Lightbox navigation
  const currentImageIndex = lightboxImage ? filteredImages.findIndex(img => img.id === lightboxImage.id) : -1;

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

      {/* Header Section */}
      <section className="pt-32 pb-12 bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <Link href="/services/interior-design" className="inline-flex items-center text-gray-600 hover:text-black transition-colors mb-8">
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Interior Design
            </Link>
            <h1 className="text-5xl md:text-6xl font-serif font-bold mb-6">
              Full Gallery
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl">
              Explore our complete collection of interior designs and staging projects
            </p>
          </motion.div>
        </div>
      </section>

      {/* Gallery Section */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Category Filter Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-wrap justify-center gap-3 mb-12"
          >
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`px-6 py-3 rounded-full font-medium transition-all duration-300 ${
                  activeCategory === category
                    ? "bg-black text-white shadow-lg"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-gray-200"
                }`}
              >
                {category}
              </button>
            ))}
          </motion.div>

          {/* Image Count */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-gray-500 mb-8"
          >
            Showing {filteredImages.length} {filteredImages.length === 1 ? 'image' : 'images'}
          </motion.p>

          {/* Image Gallery */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeCategory}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            >
              {filteredImages.map((image, index) => (
                <motion.div
                  key={image.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.05 }}
                  className="group"
                >
                  <div
                    className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-shadow duration-300 cursor-pointer"
                    onClick={() => setLightboxImage(image)}
                  >
                    <div className="aspect-[4/3] relative overflow-hidden">
                      <Image
                        src={`${S3_BASE_URL}image${image.id}.webp`}
                        alt={image.description || `${image.category} design`}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        style={image.rotate ? { transform: `rotate(${image.rotate}deg)` } : undefined}
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300" />
                    </div>
                    <div className="p-6">
                      <div className="text-sm text-gray-500 mb-2">{image.category}</div>
                      <p className="text-gray-700">{image.description}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>

          {filteredImages.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No images in this category yet.</p>
            </div>
          )}

          {/* Back Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-center mt-16"
          >
            <Link href="/services/interior-design">
              <Button size="lg" variant="outline">
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Interior Design
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {lightboxImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4"
            onClick={() => setLightboxImage(null)}
            onKeyDown={handleKeyDown}
            tabIndex={0}
          >
            {/* Close Button */}
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute top-4 right-4 z-50 w-12 h-12 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full transition-colors"
              aria-label="Close lightbox"
            >
              <X className="w-6 h-6 text-white" />
            </button>

            {/* Previous Button */}
            {currentImageIndex > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goToPrevImage();
                }}
                className="absolute left-4 z-50 w-12 h-12 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                aria-label="Previous image"
              >
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>
            )}

            {/* Next Button */}
            {currentImageIndex < filteredImages.length - 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goToNextImage();
                }}
                className="absolute right-4 z-50 w-12 h-12 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                aria-label="Next image"
              >
                <ChevronRight className="w-6 h-6 text-white" />
              </button>
            )}

            {/* Image Container */}
            <div
              className="relative max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative w-full h-full">
                <Image
                  src={`${S3_BASE_URL}image${lightboxImage.id}.webp`}
                  alt={lightboxImage.description || `${lightboxImage.category} design`}
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
