export type ProjectStatus =
  | "lead"
  | "estimate_sent"
  | "approved"
  | "waiting_on_permit"
  | "in_progress"
  | "waiting_on_payment"
  | "completed"
  | "archived";

export type ProjectType = "residential" | "commercial" | "renovation" | "interior_design" | "new_home" | "takeover" | "addition" | "garage" | "deck_patio" | "other";
export type FinishLevel = "budget" | "standard" | "mid_range" | "high_end";
export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue";
export type PaymentStatus = "pending" | "paid";
export type PermitStatus = "not_applied" | "applied" | "approved" | "denied" | "expired";
export type DrawRequestStatus = "draft" | "submitted" | "approved" | "funded" | "denied";
export type DocumentCategory = "contract" | "permit" | "invoice" | "photo" | "plan" | "draw_request" | "general";
export type EstimateStatus = "new" | "reviewed" | "converted" | "declined";

export type ContractorType = "contractor" | "vendor";

export interface Contractor {
  id: string;
  type: ContractorType;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  trade: string;
  license_number: string | null;
  w9_required: boolean;
  w9_file_url: string | null;
  w9_file_name: string | null;
  vendor_category: string | null;
  account_number: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  name: string;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  status: ProjectStatus;
  project_type: ProjectType;
  description: string | null;
  notes: string | null;
  estimated_value: number | null;
  contract_value: number | null;
  sale_price: number | null;
  lender_name: string | null;
  loan_amount: number | null;
  down_payment: number | null;
  down_payment_percent: number | null;
  interest_rate: number | null;
  origination_fee_percent: number | null;
  loan_start_date: string | null;
  is_cash_job: boolean;
  start_date: string | null;
  end_date: string | null;
  square_footage: number | null;
  stories: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  garage_spaces: number | null;
  finish_level: FinishLevel | null;
  lot_size: string | null;
  flooring_preference: string | null;
  countertop_preference: string | null;
  cabinet_preference: string | null;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  project_id: string;
  invoice_number: string;
  description: string | null;
  amount: number;
  status: InvoiceStatus;
  due_date: string | null;
  paid_date: string | null;
  created_at: string;
}

export interface ContractorPayment {
  id: string;
  project_id: string;
  contractor_id: string | null;
  contractor_name: string;
  description: string | null;
  amount: number;
  status: PaymentStatus;
  due_date: string | null;
  paid_date: string | null;
  invoice_file_url: string | null;
  invoice_file_name: string | null;
  created_at: string;
}

export interface DrawRequest {
  id: string;
  project_id: string;
  draw_number: number;
  description: string | null;
  amount: number;
  status: DrawRequestStatus;
  submitted_date: string | null;
  funded_date: string | null;
  notes: string | null;
  created_at: string;
}

export interface ProjectPhase {
  id: string;
  project_id: string;
  sort_order: number;
  name: string;
  weight: number;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
}

export const DEFAULT_PROJECT_PHASES = [
  { sort_order: 1,  name: "Pre-Construction & Permitting",      weight: 2  },
  { sort_order: 2,  name: "Site Work & Excavation",             weight: 8  },
  { sort_order: 3,  name: "Foundation",                         weight: 10 },
  { sort_order: 4,  name: "Framing",                            weight: 15 },
  { sort_order: 5,  name: "Roofing & Exterior Rough",           weight: 8  },
  { sort_order: 6,  name: "Windows & Exterior Doors",           weight: 5  },
  { sort_order: 7,  name: "MEP Rough-In (Plumbing, Electrical, HVAC)", weight: 19 },
  { sort_order: 8,  name: "Insulation",                         weight: 3  },
  { sort_order: 9,  name: "Drywall",                            weight: 5  },
  { sort_order: 10, name: "Interior Finishes",                  weight: 14 },
  { sort_order: 11, name: "Fixture Trim-Out & Appliances",      weight: 6  },
  { sort_order: 12, name: "Exterior Finishes & Landscaping",    weight: 5  },
] as const;

export interface Permit {
  id: string;
  project_id: string;
  permit_type: string;
  permit_number: string | null;
  status: PermitStatus;
  applied_date: string | null;
  approved_date: string | null;
  expiry_date: string | null;
  notes: string | null;
  file_url: string | null;
  file_name: string | null;
  created_at: string;
}

export interface Document {
  id: string;
  project_id: string;
  name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  category: DocumentCategory;
  draw_request_id: string | null;
  line_item_number: string | null;
  vendor: string | null;
  doc_type: string | null;
  contractor_id: string | null;
  is_public: boolean;
  created_at: string;
}

export interface BudgetLineItem {
  id: string;
  project_id: string;
  line_number: string;
  description: string;
  budgeted_amount: number;
  notes: string | null;
  is_owner_purchase: boolean;
  owner_purchased: boolean;
  created_at: string;
  updated_at: string;
}

export interface DrawLineItem {
  number: string;
  description: string;
  phase: string;
  weight: number;
}

// Weights derived from 12 NAHB phases, split evenly among line items in each phase.
// Items 1 (LAND) and 29 (CONTINGENCY) are excluded — not construction milestones.
export const DRAW_LINE_ITEM_WEIGHTS: DrawLineItem[] = [
  // Phase 1 — Pre-Construction & Permitting (2% ÷ 3 = 0.67 each)
  { number: "2",   description: "PLANS",                    phase: "Pre-Construction & Permitting",    weight: 0.67 },
  { number: "3",   description: "ENGINEERING",               phase: "Pre-Construction & Permitting",    weight: 0.67 },
  { number: "4",   description: "PERMITTING",                phase: "Pre-Construction & Permitting",    weight: 0.67 },
  // Phase 2 — Site Work & Excavation (8% ÷ 2 = 4 each)
  { number: "26",  description: "PORTA POTTY",               phase: "Site Work & Excavation",           weight: 4    },
  { number: "27",  description: "DUMPSTER",                  phase: "Site Work & Excavation",           weight: 4    },
  // Phase 3 — Foundation (10%)
  { number: "5a",  description: "SLAB",                      phase: "Foundation",                       weight: 10   },
  // Phase 4 — Framing (15% ÷ 3 = 5 each)
  { number: "7",   description: "LUMBER",                    phase: "Framing",                          weight: 5    },
  { number: "8",   description: "FRAMING LABOR",             phase: "Framing",                          weight: 5    },
  { number: "9",   description: "TRUSSES",                   phase: "Framing",                          weight: 5    },
  // Phase 5 — Roofing & Exterior Rough (8% ÷ 3 = 2.67 each)
  { number: "10",  description: "ROOFING",                   phase: "Roofing & Exterior Rough",         weight: 2.67 },
  { number: "11",  description: "STUCCO",                    phase: "Roofing & Exterior Rough",         weight: 2.67 },
  { number: "12",  description: "STONE",                     phase: "Roofing & Exterior Rough",         weight: 2.67 },
  // Phase 6 — Windows & Exterior Doors (5%)
  { number: "13",  description: "WINDOWS",                   phase: "Windows & Exterior Doors",         weight: 5    },
  // Phase 7 — MEP Rough-In (19% ÷ 3 = 6.33 each)
  { number: "6a",  description: "PLUMBING (ROUGH-IN)",       phase: "MEP Rough-In",                     weight: 6.33 },
  { number: "16a", description: "ELECTRICAL (ROUGH-IN)",     phase: "MEP Rough-In",                     weight: 6.33 },
  { number: "17a", description: "HVAC (ROUGH-IN)",           phase: "MEP Rough-In",                     weight: 6.33 },
  // Phase 8 — Insulation (3%)
  { number: "15",  description: "INSULATION",                phase: "Insulation",                       weight: 3    },
  // Phase 9 — Drywall (5%)
  { number: "18",  description: "SHEETROCK",                 phase: "Drywall",                          weight: 5    },
  // Phase 10 — Interior Finishes (14% ÷ 5 = 2.8 each)
  { number: "14",  description: "DOORS/TRIM",                phase: "Interior Finishes",                weight: 2.8  },
  { number: "19",  description: "PAINT",                     phase: "Interior Finishes",                weight: 2.8  },
  { number: "20",  description: "FLOORING",                  phase: "Interior Finishes",                weight: 2.8  },
  { number: "21",  description: "CABINETS",                  phase: "Interior Finishes",                weight: 2.8  },
  { number: "22",  description: "COUNTERTOPS",               phase: "Interior Finishes",                weight: 2.8  },
  // Phase 11 — Fixture Trim-Out & Appliances (6% ÷ 4 = 1.5 each)
  { number: "6b",  description: "PLUMBING (FINISH)",         phase: "Fixture Trim-Out & Appliances",    weight: 1.5  },
  { number: "16b", description: "ELECTRICAL (FINISH)",       phase: "Fixture Trim-Out & Appliances",    weight: 1.5  },
  { number: "17b", description: "HVAC (FINISH)",             phase: "Fixture Trim-Out & Appliances",    weight: 1.5  },
  { number: "24",  description: "APPLIANCES",                phase: "Fixture Trim-Out & Appliances",    weight: 1.5  },
  // Phase 12 — Exterior Finishes & Landscaping (5% ÷ 4 = 1.25 each)
  { number: "5b",  description: "FINISH CONCRETE/DRIVEWAY",  phase: "Exterior Finishes & Landscaping",  weight: 1.25 },
  { number: "23",  description: "LANDSCAPING",               phase: "Exterior Finishes & Landscaping",  weight: 1.25 },
  { number: "25",  description: "METAL STAIRCASE",           phase: "Exterior Finishes & Landscaping",  weight: 1.25 },
  { number: "28",  description: "GARAGE DOOR",               phase: "Exterior Finishes & Landscaping",  weight: 1.25 },
];

export const DEFAULT_BUDGET_LINE_ITEMS = [
  { line_number: "1", description: "LAND" },
  { line_number: "2", description: "PLANS" },
  { line_number: "3", description: "ENGINEERING" },
  { line_number: "4", description: "PERMITTING" },
  { line_number: "5a", description: "SLAB" },
  { line_number: "5b", description: "FINISH CONCRETE/DRIVEWAY" },
  { line_number: "6a", description: "PLUMBING (ROUGH-IN)" },
  { line_number: "6b", description: "PLUMBING (FINISH)" },
  { line_number: "7", description: "LUMBER" },
  { line_number: "8", description: "FRAMING LABOR" },
  { line_number: "9", description: "TRUSSES" },
  { line_number: "10", description: "ROOFING" },
  { line_number: "11", description: "STUCCO" },
  { line_number: "12", description: "STONE" },
  { line_number: "13", description: "WINDOWS" },
  { line_number: "14", description: "DOORS/TRIM" },
  { line_number: "15", description: "INSULATION" },
  { line_number: "16a", description: "ELECTRICAL (ROUGH-IN)" },
  { line_number: "16b", description: "ELECTRICAL (FINISH)" },
  { line_number: "17a", description: "HVAC (ROUGH-IN)" },
  { line_number: "17b", description: "HVAC (FINISH)" },
  { line_number: "18", description: "SHEETROCK" },
  { line_number: "19", description: "PAINT" },
  { line_number: "20", description: "FLOORING" },
  { line_number: "21", description: "CABINETS" },
  { line_number: "22", description: "COUNTERTOPS" },
  { line_number: "23", description: "LANDSCAPING" },
  { line_number: "24", description: "APPLIANCES" },
  { line_number: "25", description: "METAL STAIRCASE" },
  { line_number: "26", description: "PORTA POTTY" },
  { line_number: "27", description: "DUMPSTER" },
  { line_number: "28", description: "GARAGE DOOR" },
  { line_number: "29", description: "CONTINGENCY" },
] as const;

export interface Task {
  id: string;
  project_id: string;
  title: string;
  completed: boolean;
  due_date: string | null;
  assigned_to: string | null;
  sort_order: number;
  created_at: string;
}

export interface TeamMember {
  email: string;
  name: string;
}

export interface ActivityLogEntry {
  id: string;
  project_id: string;
  action: string;
  description: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface InvoiceUploadToken {
  id: string;
  token: string;
  project_id: string;
  contractor_id: string;
  project_name: string;
  contractor_name: string;
  active: boolean;
  created_at: string;
}

export interface Estimate {
  id: string;
  client_name: string;
  client_email: string;
  client_phone: string | null;
  project_type: string;
  description: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  square_footage: number | null;
  budget_range: string | null;
  timeline: string | null;
  estimated_min: number | null;
  estimated_max: number | null;
  bedrooms: string | null;
  bathrooms: string | null;
  finish_level: string | null;
  flooring_preference: string | null;
  countertop_preference: string | null;
  cabinet_preference: string | null;
  ai_estimate_min: number | null;
  ai_estimate_max: number | null;
  ai_breakdown: string | null;
  status: EstimateStatus;
  project_id: string | null;
  notes: string | null;
  created_at: string;
}

// ── Display helpers ──────────────────────────────────────────

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  lead: "Lead",
  estimate_sent: "Estimate Sent",
  approved: "Approved",
  waiting_on_permit: "Waiting on Permit",
  in_progress: "In Progress",
  waiting_on_payment: "Waiting on Payment",
  completed: "Completed",
  archived: "Archived",
};

export const PROJECT_STATUS_COLORS: Record<ProjectStatus, string> = {
  lead: "bg-gray-100 text-gray-700",
  estimate_sent: "bg-blue-100 text-blue-700",
  approved: "bg-green-100 text-green-700",
  waiting_on_permit: "bg-yellow-100 text-yellow-700",
  in_progress: "bg-indigo-100 text-indigo-700",
  waiting_on_payment: "bg-orange-100 text-orange-700",
  completed: "bg-emerald-100 text-emerald-700",
  archived: "bg-slate-100 text-slate-500",
};

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  residential: "Residential",
  commercial: "Commercial",
  renovation: "Renovation",
  interior_design: "Interior Design",
  new_home: "New Custom Home",
  takeover: "Takeover",
  addition: "Home Addition",
  garage: "Garage",
  deck_patio: "Deck / Patio",
  other: "Other",
};

export const FINISH_LEVEL_LABELS: Record<FinishLevel, string> = {
  budget: "Budget",
  standard: "Standard",
  mid_range: "Mid-Range",
  high_end: "High-End",
};

export const INVOICE_STATUS_COLORS: Record<InvoiceStatus, string> = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  paid: "bg-green-100 text-green-700",
  overdue: "bg-red-100 text-red-700",
};

export const PERMIT_STATUS_COLORS: Record<PermitStatus, string> = {
  not_applied: "bg-gray-100 text-gray-700",
  applied: "bg-blue-100 text-blue-700",
  approved: "bg-green-100 text-green-700",
  denied: "bg-red-100 text-red-700",
  expired: "bg-orange-100 text-orange-700",
};

export const DRAW_STATUS_COLORS: Record<DrawRequestStatus, string> = {
  draft: "bg-gray-100 text-gray-700",
  submitted: "bg-blue-100 text-blue-700",
  approved: "bg-green-100 text-green-700",
  funded: "bg-emerald-100 text-emerald-700",
  denied: "bg-red-100 text-red-700",
};

export const ESTIMATE_STATUS_COLORS: Record<EstimateStatus, string> = {
  new: "bg-blue-100 text-blue-700",
  reviewed: "bg-yellow-100 text-yellow-700",
  converted: "bg-green-100 text-green-700",
  declined: "bg-gray-100 text-gray-500",
};

export const TRADES = [
  "General",
  "Plumbing",
  "Electrical",
  "HVAC",
  "Framing",
  "Roofing",
  "Concrete",
  "Drywall",
  "Painting",
  "Flooring",
  "Landscaping",
  "Excavation",
  "Engineering",
  "Steel/Welding",
  "Cabinetry",
  "Tile",
  "Insulation",
  "Windows/Doors",
  "Siding",
  "Fencing",
  "Other",
] as const;

export const DEFAULT_VENDOR_CATEGORIES = [
  "Lumber & Building Materials",
  "Hardware & Fasteners",
  "Plumbing Supply",
  "Electrical Supply",
  "HVAC Supply",
  "Concrete & Masonry",
  "Roofing Supply",
  "Paint & Coatings",
  "Flooring Supply",
  "Appliances",
  "Windows & Doors",
  "Equipment Rental",
  "Tool Supply",
  "Landscaping Supply",
  "Insulation & Drywall",
  "Cabinetry & Countertops",
  "Safety & PPE",
  "Waste & Disposal",
  "Other",
] as const;

// Cost ranges for the bid estimator (per sq ft)
export const COST_RANGES: Record<string, { min: number; max: number }> = {
  new_home: { min: 150, max: 350 },
  takeover: { min: 150, max: 350 },
  addition: { min: 150, max: 300 },
  garage: { min: 40, max: 80 },
  deck_patio: { min: 25, max: 75 },
  other: { min: 50, max: 150 },
};

export const PROJECT_TYPE_OPTIONS = [
  { value: "new_home", label: "New Custom Home" },
  { value: "takeover", label: "Takeover" },
  { value: "addition", label: "Home Addition" },
  { value: "garage", label: "Garage" },
  { value: "deck_patio", label: "Deck / Patio" },
  { value: "other", label: "Other" },
] as const;

export const BUDGET_RANGES = [
  "Under $10,000",
  "$10,000 - $25,000",
  "$25,000 - $50,000",
  "$50,000 - $100,000",
  "$100,000 - $250,000",
  "$250,000 - $500,000",
  "$500,000+",
] as const;

export const TIMELINE_OPTIONS = [
  "ASAP",
  "1-3 months",
  "3-6 months",
  "6-12 months",
  "12+ months",
  "Flexible",
] as const;
