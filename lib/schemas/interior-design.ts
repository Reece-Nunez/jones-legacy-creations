import { z } from 'zod';

// Base schema for form validation (client + server)
export const interiorDesignFormSchema = z.object({
  // Personal Information
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),

  // Service Type
  serviceType: z.string().min(1, "Please select a service type"),

  // Property Information
  propertyAddress: z.string().optional(),
  propertyCity: z.string().min(1, "Please enter a city"),
  propertyState: z.string().min(2, "Please enter a state"),
  propertyZipCode: z.string().optional(),

  // Project Details
  squareFootage: z.string().optional(),
  numberOfRooms: z.string().optional(),
  projectDescription: z.string().min(1, "Please describe your project"),

  // Budget & Timeline
  estimatedBudget: z.string().min(1, "Please select a budget range"),
  projectTimeline: z.string().min(1, "Please select a timeline"),

  // Style Preferences
  stylePreference: z.string().optional(),
  colorPreferences: z.string().optional(),

  // Additional Information
  additionalNotes: z.string().optional(),
  howDidYouHear: z.string().optional(),
});

// Extended schema with spam protection fields (server only)
export const interiorDesignSubmissionSchema = interiorDesignFormSchema.extend({
  recaptchaToken: z.string().optional(),
  honeypot: z.string().max(0, "Bot detected").optional(),
});

export type InteriorDesignFormData = z.infer<typeof interiorDesignFormSchema>;
export type InteriorDesignSubmission = z.infer<typeof interiorDesignSubmissionSchema>;
