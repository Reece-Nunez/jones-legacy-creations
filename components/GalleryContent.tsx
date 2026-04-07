"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { X, ChevronLeft, ChevronRight, Building2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface GalleryPhoto {
  id: string;
  file_url: string;
  name: string;
}

interface GalleryProject {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  description: string | null;
  photos: GalleryPhoto[];
}

export function GalleryContent({ projects }: { projects: GalleryProject[] }) {
  const [selectedProject, setSelectedProject] = useState<GalleryProject | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  return (
    <>
      {/* Header section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-gray-900 mb-4">
              Our Work
            </h1>
            <p className="text-xl text-gray-700 max-w-3xl mx-auto leading-relaxed">
              Quality craftsmanship delivered with care and attention to detail
            </p>
          </motion.div>

          {projects.length === 0 ? (
            <div className="text-center py-20">
              <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">Photos coming soon — check back after our next build!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {projects.map((project, index) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="group cursor-pointer"
                  onClick={() => setSelectedProject(project)}
                >
                  <div className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 group-hover:scale-[1.02]">
                    <div className="aspect-[4/3] bg-gradient-to-br from-gray-200 to-gray-300 relative overflow-hidden">
                      <Image
                        src={project.photos[0].file_url}
                        alt={`${project.name} - cover photo`}
                        fill
                        sizes="(max-width: 768px) 100vw, 50vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300" />
                      <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        View Photos ({project.photos.length})
                      </div>
                    </div>
                    <div className="p-6">
                      {(project.city || project.state) && (
                        <div className="text-sm text-gray-600 mb-2">
                          {[project.city, project.state].filter(Boolean).join(", ")}
                        </div>
                      )}
                      <h2 className="text-2xl font-serif font-bold text-gray-900 mb-2">{project.name}</h2>
                      {project.description && (
                        <p className="text-gray-700 text-sm line-clamp-2 leading-relaxed">{project.description}</p>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Project Detail Modal */}
      <AnimatePresence>
        {selectedProject && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 overflow-y-auto"
            onClick={() => setSelectedProject(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto my-8 relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedProject(null)}
                className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center bg-white/90 hover:bg-white rounded-full shadow-lg transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Cover Image */}
              <div className="aspect-[16/9] bg-gradient-to-br from-gray-200 to-gray-300 relative">
                <Image
                  src={selectedProject.photos[0].file_url}
                  alt={`${selectedProject.name} cover photo`}
                  fill
                  sizes="(max-width: 768px) 100vw, 896px"
                  className="object-cover"
                />
              </div>

              {/* Content */}
              <div className="p-8">
                {(selectedProject.city || selectedProject.state) && (
                  <div className="text-sm text-gray-600 mb-2">
                    {[selectedProject.city, selectedProject.state].filter(Boolean).join(", ")}
                  </div>
                )}
                <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 mb-4">{selectedProject.name}</h2>
                {selectedProject.description && (
                  <p className="text-lg text-gray-700 mb-6 leading-relaxed">{selectedProject.description}</p>
                )}

                {/* Photo Grid */}
                {selectedProject.photos.length > 1 && (
                  <div className="mb-8">
                    <h3 className="text-lg font-bold mb-4">Gallery ({selectedProject.photos.length} photos)</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {selectedProject.photos.map((photo, index) => (
                        <div
                          key={photo.id}
                          className="aspect-[4/3] relative rounded-2xl overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => setLightboxIndex(index)}
                        >
                          <Image
                            src={photo.file_url}
                            alt={photo.name}
                            fill
                            sizes="(max-width: 768px) 50vw, 33vw"
                            className="object-cover hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* CTA */}
                <div className="bg-gray-50 rounded-xl p-6 text-center">
                  <h3 className="text-xl font-serif font-bold text-gray-900 mb-2">Interested in a Similar Build?</h3>
                  <p className="text-gray-700 mb-4 leading-relaxed">
                    Love this project? Let us know and we can discuss how to bring your vision to life.
                  </p>
                  <Link href="/estimate" onClick={() => setSelectedProject(null)}>
                    <Button size="lg">
                      Request an Estimate
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </Link>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lightbox */}
      <AnimatePresence>
        {selectedProject && lightboxIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 p-4"
            onClick={() => setLightboxIndex(null)}
          >
            <button
              onClick={() => setLightboxIndex(null)}
              className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center text-white/80 hover:text-white cursor-pointer"
              aria-label="Close lightbox"
            >
              <X className="w-6 h-6" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(i => i !== null && i > 0 ? i - 1 : selectedProject.photos.length - 1); }}
              className="absolute left-4 z-10 w-10 h-10 flex items-center justify-center text-white/80 hover:text-white cursor-pointer"
              aria-label="Previous photo"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
            <motion.div
              key={lightboxIndex}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="relative max-w-5xl max-h-[85vh] w-full h-full flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={selectedProject.photos[lightboxIndex].file_url}
                alt={selectedProject.photos[lightboxIndex].name}
                fill
                sizes="100vw"
                className="object-contain"
              />
            </motion.div>
            <button
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(i => i !== null && i < selectedProject.photos.length - 1 ? i + 1 : 0); }}
              className="absolute right-4 z-10 w-10 h-10 flex items-center justify-center text-white/80 hover:text-white cursor-pointer"
              aria-label="Next photo"
            >
              <ChevronRight className="w-8 h-8" />
            </button>
            <div className="absolute bottom-4 text-white/60 text-sm">
              {lightboxIndex + 1} / {selectedProject.photos.length}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
