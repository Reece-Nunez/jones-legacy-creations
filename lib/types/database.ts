export type ProjectStatus =
  | "lead"
  | "estimate_sent"
  | "approved"
  | "waiting_on_permit"
  | "in_progress"
  | "waiting_on_payment"
  | "completed"
  | "archived";

export type ProjectType = "residential" | "commercial" | "renovation" | "interior_design" | "other";
export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue";
export type PaymentStatus = "pending" | "paid";
export type PermitStatus = "not_applied" | "applied" | "approved" | "denied" | "expired";
export type DrawRequestStatus = "draft" | "submitted" | "approved" | "funded" | "denied";
export type DocumentCategory = "contract" | "permit" | "invoice" | "photo" | "plan" | "draw_request" | "general";
export type EstimateStatus = "new" | "reviewed" | "converted" | "declined";

export interface Contractor {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  trade: string;
  license_number: string | null;
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
  start_date: string | null;
  end_date: string | null;
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
  line_item_number: number | null;
  vendor: string | null;
  doc_type: string | null;
  created_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  completed: boolean;
  due_date: string | null;
  sort_order: number;
  created_at: string;
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
  other: "Other",
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
  "Steel/Welding",
  "Cabinetry",
  "Tile",
  "Insulation",
  "Windows/Doors",
  "Siding",
  "Fencing",
  "Other",
] as const;

// Cost ranges for the bid estimator (per sq ft)
export const COST_RANGES: Record<string, { min: number; max: number }> = {
  new_home: { min: 150, max: 350 },
  kitchen_remodel: { min: 100, max: 250 },
  bathroom_remodel: { min: 120, max: 300 },
  addition: { min: 150, max: 300 },
  deck_patio: { min: 25, max: 75 },
  garage: { min: 40, max: 80 },
  commercial_buildout: { min: 75, max: 200 },
  interior_design: { min: 15, max: 50 },
  whole_home_renovation: { min: 100, max: 250 },
  other: { min: 50, max: 150 },
};

export const PROJECT_TYPE_OPTIONS = [
  { value: "new_home", label: "New Home Construction" },
  { value: "kitchen_remodel", label: "Kitchen Remodel" },
  { value: "bathroom_remodel", label: "Bathroom Remodel" },
  { value: "addition", label: "Home Addition" },
  { value: "deck_patio", label: "Deck / Patio" },
  { value: "garage", label: "Garage" },
  { value: "commercial_buildout", label: "Commercial Build-out" },
  { value: "interior_design", label: "Interior Design & Staging" },
  { value: "whole_home_renovation", label: "Whole Home Renovation" },
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
