import { z } from 'zod';

// Base schema for form validation (client + server)
export const constructionFormSchema = z.object({
  // Personal Information
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  company: z.string().optional(),

  // Project Type
  projectType: z.string().min(1, "Please select a project type"),
  projectCategory: z.string().min(1, "Please select a project category"),

  // Property Information
  propertyAddress: z.string().optional(),
  propertyCity: z.string().min(1, "Please enter a city"),
  propertyState: z.string().min(2, "Please enter a state"),
  propertyZipCode: z.string().optional(),
  propertyOwnership: z.string().min(1, "Please select property ownership status"),

  // Project Details
  projectScope: z.string().min(1, "Please describe your project"),
  squareFootage: z.string().optional(),
  numberOfFloors: z.string().optional(),
  numberOfRooms: z.string().optional(),

  // Budget & Timeline
  estimatedBudget: z.string().min(1, "Please select a budget range"),
  projectTimeline: z.string().min(1, "Please select a timeline"),
  startDate: z.string().optional(),
  completionDate: z.string().optional(),

  // Specific Requirements
  buildingPermits: z.string().optional(),
  architecturalPlans: z.string().optional(),
  zoningCompliance: z.string().optional(),

  // Materials & Finishes
  materialsPreference: z.string().optional(),
  qualityLevel: z.string().optional(),
  sustainabilityPreference: z.string().optional(),

  // Specific Work Areas
  foundationWork: z.string().optional(),
  framingWork: z.string().optional(),
  roofingWork: z.string().optional(),
  electricalWork: z.string().optional(),
  plumbingWork: z.string().optional(),
  hvacWork: z.string().optional(),
  interiorFinishing: z.string().optional(),
  exteriorFinishing: z.string().optional(),

  // Demolition
  demolitionRequired: z.string().optional(),
  demolitionScope: z.string().optional(),

  // Accessibility & Special Features
  accessibilityFeatures: z.string().optional(),
  energyEfficiency: z.string().optional(),
  smartHomeIntegration: z.string().optional(),

  // Site Conditions
  siteAccessibility: z.string().optional(),
  utilityConnections: z.string().optional(),
  soilConditions: z.string().optional(),

  // Additional Services
  designServices: z.string().optional(),
  engineeringServices: z.string().optional(),
  projectManagement: z.string().optional(),

  // Insurance & Financing
  hasInsurance: z.string().optional(),
  financingNeeded: z.string().optional(),

  // Additional Information
  additionalNotes: z.string().optional(),
  howDidYouHear: z.string().optional(),
  howDidYouHearOther: z.string().optional(),
  attachments: z.string().optional(),
});

// Extended schema with spam protection fields (server only)
export const constructionSubmissionSchema = constructionFormSchema.extend({
  recaptchaToken: z.string().optional(),
  honeypot: z.string().max(0, "Bot detected").optional(),
});

export type ConstructionFormData = z.infer<typeof constructionFormSchema>;
export type ConstructionSubmission = z.infer<typeof constructionSubmissionSchema>;
