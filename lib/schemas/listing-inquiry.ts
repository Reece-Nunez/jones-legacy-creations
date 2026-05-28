/**
 * Minimal schema for the "inquire about THIS specific listing" form
 * on real-estate listing detail pages. Intentionally lighter than the
 * full real-estate intake (which asks 30+ questions about preferences
 * to feed the broader buy/sell flow) — this is a 4-field quick-grab
 * for someone who already knows what property they want to see.
 */

import { z } from "zod";

export const listingInquiryFormSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  message: z.string().min(1, "Please add a short message"),
  // Context fields — populated by the form component, not the user.
  // Lets the inbox / leads page know exactly which listing the
  // inquiry is about without parsing the message.
  listingId: z.string().uuid("Invalid listing id"),
  listingAddress: z.string().min(1),
});

export const listingInquirySubmissionSchema = listingInquiryFormSchema.extend({
  recaptchaToken: z.string().nullable().optional(),
  honeypot: z.string().max(0, "Bot detected").optional(),
});

export type ListingInquiryFormData = z.infer<typeof listingInquiryFormSchema>;
export type ListingInquirySubmission = z.infer<
  typeof listingInquirySubmissionSchema
>;
