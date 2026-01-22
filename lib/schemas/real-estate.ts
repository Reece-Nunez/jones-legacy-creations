import { z } from 'zod';

// Base schema for form validation (client + server)
export const realEstateFormSchema = z.object({
  // Personal Information
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),

  // Property Type
  propertyType: z.string().min(1, "Please select a property type"),
  serviceType: z.string().min(1, "Please select a service type"),

  // Location Preferences
  preferredCity: z.string().min(1, "Please select a city"),
  preferredNeighborhood: z.string().optional(),
  preferredState: z.string().min(2, "State is required"),
  preferredZipCode: z.string().optional(),

  // Budget
  budgetRange: z.string().min(1, "Please select a budget range"),

  // Property Features
  bedrooms: z.string().min(1, "Please select number of bedrooms"),
  bathrooms: z.string().min(1, "Please select number of bathrooms"),
  squareFootage: z.string().optional(),
  lotSize: z.string().optional(),
  yearBuilt: z.string().optional(),

  // Garage & Parking
  garageSpaces: z.string().optional(),
  parkingType: z.string().optional(),

  // Property Style
  architecturalStyle: z.string().optional(),
  stories: z.string().optional(),

  // Interior Features
  kitchenStyle: z.string().optional(),
  flooringType: z.string().optional(),
  hasBasement: z.string().optional(),
  hasAttic: z.string().optional(),
  hasFireplace: z.string().optional(),

  // Exterior Features
  exteriorMaterial: z.string().optional(),
  roofType: z.string().optional(),
  hasPool: z.string().optional(),
  hasDeck: z.string().optional(),
  hasPatio: z.string().optional(),

  // Systems & Utilities
  heatingType: z.string().optional(),
  coolingType: z.string().optional(),
  hasSmartHome: z.string().optional(),
  hasSolarPanels: z.string().optional(),

  // Additional Features
  mustHaveFeatures: z.string().optional(),
  niceToHaveFeatures: z.string().optional(),
  dealBreakers: z.string().optional(),

  // Timeline
  moveInTimeline: z.string().min(1, "Please select a timeline"),

  // Additional Information
  additionalNotes: z.string().optional(),
  howDidYouHear: z.string().min(1, "Please select how you heard about us"),
  howDidYouHearOther: z.string().optional(),
});

// Extended schema with spam protection fields (server only)
export const realEstateSubmissionSchema = realEstateFormSchema.extend({
  recaptchaToken: z.string().optional(),
  honeypot: z.string().max(0, "Bot detected").optional(),
});

export type RealEstateFormData = z.infer<typeof realEstateFormSchema>;
export type RealEstateSubmission = z.infer<typeof realEstateSubmissionSchema>;
