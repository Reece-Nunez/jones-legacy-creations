import { z } from "zod";

/**
 * Newsletter subscribe form. Minimal on purpose — email is the only
 * thing we ask. Adding source/tags is the caller's job (the route
 * sets source based on where the form posted from, and tags are
 * empty for v1).
 */
export const subscribeFormSchema = z.object({
  email: z.string().email("Please enter a valid email"),
});

export const subscribeSubmissionSchema = subscribeFormSchema.extend({
  // Optional source override — defaults to 'footer' in the endpoint
  // if the form doesn't pass one. Lets the same endpoint serve other
  // signup placements later without API changes.
  source: z
    .enum([
      "footer",
      "homepage",
      "estimate_page",
      "construction_page",
      "real_estate_page",
      "interior_design_page",
      "lead_magnet",
      "blog",
      "other",
    ])
    .optional(),
  recaptchaToken: z.string().nullable().optional(),
  honeypot: z.string().max(0, "Bot detected").optional(),
});

export type SubscribeFormData = z.infer<typeof subscribeFormSchema>;
export type SubscribeSubmission = z.infer<typeof subscribeSubmissionSchema>;
