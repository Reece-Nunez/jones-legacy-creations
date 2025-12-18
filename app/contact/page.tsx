"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Mail, Phone, MapPin, Clock } from "lucide-react";

const contactSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  subject: z.string().min(1, "Please select a subject"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

type ContactFormData = z.infer<typeof contactSchema>;

export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
  });

  const onSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to send form');
      }

      toast.success("Thank you for your message! We'll get back to you within 24 hours.");
      reset();
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error("There was an error sending your message. Please try again or email us at office@joneslegacycreations.com.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const contactInfo = [
    {
      icon: Mail,
      title: "Email",
      content: "office@joneslegacycreations.com",
      link: "mailto:office@joneslegacycreations.com",
    },
    {
      icon: MapPin,
      title: "Location",
      content: "Hurricane, Utah\nServing all of Southern Utah",
      link: null,
    },
    {
      icon: Clock,
      title: "Business Hours",
      content: "Available anytime - give us a call!",
      link: null,
    },
  ];

  return (
    <>
      <Navigation />

      {/* Hero Section */}
      <section className="pt-32 pb-16 bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <h1 className="text-5xl md:text-6xl font-serif font-bold mb-6">
              Get In Touch
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Ready to start your next project? Have questions? We&apos;d love to hear from you.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Contact Info Cards */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {contactInfo.map((info, index) => (
              <motion.div
                key={info.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-gray-50 p-6 rounded-xl text-center"
              >
                <div className="inline-flex items-center justify-center w-12 h-12 bg-black text-white rounded-full mb-4">
                  <info.icon className="w-6 h-6" />
                </div>
                <h3 className="font-bold mb-2">{info.title}</h3>
                {info.link ? (
                  <a
                    href={info.link}
                    className="text-gray-600 hover:text-black transition-colors text-xs"
                  >
                    {info.content}
                  </a>
                ) : (
                  <p className="text-gray-600 text-sm whitespace-pre-line">{info.content}</p>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-serif font-bold mb-4">
              Send Us a Message
            </h2>
            <p className="text-lg text-gray-600">
              Fill out the form below and we&apos;ll get back to you as soon as possible.
            </p>
          </motion.div>

          <motion.form
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Full Name"
                {...register("fullName")}
                error={errors.fullName?.message}
                required
              />
              <Input
                label="Email Address"
                type="email"
                {...register("email")}
                error={errors.email?.message}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Phone Number"
                type="tel"
                {...register("phone")}
                error={errors.phone?.message}
                required
              />
              <Select
                label="Subject"
                {...register("subject")}
                error={errors.subject?.message}
                options={[
                  { value: "real-estate", label: "Real Estate Inquiry" },
                  { value: "construction", label: "Construction Project" },
                  { value: "interior-design", label: "Interior Design/Staging" },
                  { value: "partnership", label: "Partnership Inquiry" },
                  { value: "general", label: "General Question" },
                  { value: "other", label: "Other" },
                ]}
                required
              />
            </div>

            <Textarea
              label="Message"
              placeholder="Tell us about your project or question..."
              {...register("message")}
              error={errors.message?.message}
              rows={6}
              required
            />

            <div className="flex justify-center pt-4">
              <Button type="submit" size="lg" isLoading={isSubmitting} className="min-w-64">
                Send Message
              </Button>
            </div>
          </motion.form>
        </div>
      </section>

      {/* Department Contacts Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-serif font-bold mb-4">
              Contact Our Teams Directly
            </h2>
            <p className="text-lg text-gray-600">
              Reach out to the specific department for your needs
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              viewport={{ once: true }}
              className="bg-white p-8 rounded-xl border-2 border-gray-200"
            >
              <h3 className="text-2xl font-serif font-bold mb-3">
                Real Estate
              </h3>
              <p className="text-gray-600 mb-4">
                Blake Realty - Buying, selling, and property inquiries
              </p>
              <div className="space-y-2">
                <a
                  href="tel:+14352889807"
                  className="flex items-center gap-2 text-gray-600 hover:text-black transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  <span>(435) 288-9807</span>
                </a>
                <a
                  href="mailto:blakerealty@joneslegacycreations.com"
                  className="flex items-center gap-2 text-gray-600 hover:text-black transition-colors text-sm"
                >
                  <Mail className="w-4 h-4 flex-shrink-0" />
                  <span>blakerealty@joneslegacycreations.com</span>
                </a>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              viewport={{ once: true }}
              className="bg-white p-8 rounded-xl border-2 border-gray-200"
            >
              <h3 className="text-2xl font-serif font-bold mb-3">
                Construction
              </h3>
              <p className="text-gray-600 mb-4">
                Jones Custom Homes - New builds and renovations
              </p>
              <div className="space-y-2">
                <a
                  href="tel:+14354148701"
                  className="flex items-center gap-2 text-gray-600 hover:text-black transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  <span>(435) 414-8701</span>
                </a>
                <a
                  href="mailto:jch@joneslegacycreations.com"
                  className="flex items-center gap-2 text-gray-600 hover:text-black transition-colors text-sm"
                >
                  <Mail className="w-4 h-4 flex-shrink-0" />
                  <span>jch@joneslegacycreations.com</span>
                </a>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              viewport={{ once: true }}
              className="bg-white p-8 rounded-xl border-2 border-gray-200"
            >
              <h3 className="text-2xl font-serif font-bold mb-3">
                Interior Design
              </h3>
              <p className="text-gray-600 mb-4">
                Design consultations and home staging services
              </p>
              <div className="space-y-2">
                <a
                  href="tel:+18017357089"
                  className="flex items-center gap-2 text-gray-600 hover:text-black transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  <span>(801) 735-7089</span>
                </a>
                <a
                  href="mailto:interiors@joneslegacycreations.com"
                  className="flex items-center gap-2 text-gray-600 hover:text-black transition-colors text-sm"
                >
                  <Mail className="w-4 h-4 flex-shrink-0" />
                  <span>interiors@joneslegacycreations.com</span>
                </a>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Quick Links Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-serif font-bold mb-4">
              Or Get Started Directly
            </h2>
            <p className="text-lg text-gray-600">
              Jump straight to the service you need
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <motion.a
              href="/services/real-estate#contact-form"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              viewport={{ once: true }}
              className="group bg-gray-50 p-8 rounded-xl border-2 border-gray-200 hover:border-black transition-all hover:shadow-lg"
            >
              <h3 className="text-2xl font-serif font-bold mb-3 group-hover:text-gray-700">
                Real Estate Intake
              </h3>
              <p className="text-gray-600 mb-4">
                Tell us about your dream home or property needs
              </p>
              <span className="text-sm font-medium group-hover:underline">
                Start Form →
              </span>
            </motion.a>

            <motion.a
              href="/services/construction#contact-form"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              viewport={{ once: true }}
              className="group bg-gray-50 p-8 rounded-xl border-2 border-gray-200 hover:border-black transition-all hover:shadow-lg"
            >
              <h3 className="text-2xl font-serif font-bold mb-3 group-hover:text-gray-700">
                Construction Intake
              </h3>
              <p className="text-gray-600 mb-4">
                Describe your construction or renovation project
              </p>
              <span className="text-sm font-medium group-hover:underline">
                Start Form →
              </span>
            </motion.a>

            <motion.a
              href="/services/interior-design#contact-form"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              viewport={{ once: true }}
              className="group bg-gray-50 p-8 rounded-xl border-2 border-gray-200 hover:border-black transition-all hover:shadow-lg"
            >
              <h3 className="text-2xl font-serif font-bold mb-3 group-hover:text-gray-700">
                Design Consultation
              </h3>
              <p className="text-gray-600 mb-4">
                Explore interior design and home staging services
              </p>
              <span className="text-sm font-medium group-hover:underline">
                Start Form →
              </span>
            </motion.a>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
