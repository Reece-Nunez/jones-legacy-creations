"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Building2 } from "lucide-react";

interface GalleryPhoto {
  id: string;
  file_url: string;
  name: string;
}

interface GalleryProject {
  id: string;
  slug?: string;
  name: string;
  city: string | null;
  state: string | null;
  description: string | null;
  photos: GalleryPhoto[];
}

export function GalleryContent({ projects }: { projects: GalleryProject[] }) {
  return (
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
            Quality craftsmanship delivered with care and attention to detail.
            Tap any project for more details.
          </p>
        </motion.div>

        {projects.length === 0 ? (
          <div className="text-center py-20">
            <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">
              Photos coming soon — check back after our next build!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {projects.map((project, index) => {
              const card = (
                <div className="group">
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
                        View Project ({project.photos.length}{" "}
                        photo{project.photos.length === 1 ? "" : "s"})
                      </div>
                    </div>
                    <div className="p-6">
                      {(project.city || project.state) && (
                        <div className="text-sm text-gray-600 mb-2">
                          {[project.city, project.state]
                            .filter(Boolean)
                            .join(", ")}
                        </div>
                      )}
                      <h2 className="text-2xl font-serif font-bold text-gray-900 mb-2">
                        {project.name}
                      </h2>
                      {project.description && (
                        <p className="text-gray-700 text-sm line-clamp-2 leading-relaxed">
                          {project.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );

              return (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  {project.slug ? (
                    <Link
                      href={`/services/construction/projects/${project.slug}`}
                      className="block"
                    >
                      {card}
                    </Link>
                  ) : (
                    card
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
