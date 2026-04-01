// ── Quote Builder Type Definitions ──────────────────────────────────────────

// ── Enum Types (type unions) ───────────────────────────────────────────────

export type JobTypeSlug =
  | "new_construction"
  | "takeover"
  | "addition"
  | "remodel"
  | "shop_storage"
  | "repair_punch";

export type EstimateStage = "ballpark" | "detailed" | "final";

export type QuoteStatus =
  | "draft"
  | "in_progress"
  | "pending_sub_bids"
  | "review"
  | "sent"
  | "accepted"
  | "declined"
  | "expired"
  | "revised";

export type OccupancyStatus = "occupied" | "vacant" | "unknown";

export type PlansAvailable = "yes" | "no" | "partial";

export type EngineeringAvailable = "yes" | "no" | "needed";

export type QuotePermitStatus =
  | "not_needed"
  | "not_applied"
  | "applied"
  | "approved"
  | "unknown";

export type UtilitiesStatus = "available" | "partial" | "none" | "unknown";

export type CostCategorySlug =
  | "preconstruction"
  | "sitework"
  | "concrete_foundation"
  | "framing"
  | "roofing"
  | "exterior_envelope"
  | "doors_windows"
  | "plumbing"
  | "electrical"
  | "hvac"
  | "insulation_drywall"
  | "cabinets_millwork"
  | "countertops"
  | "flooring"
  | "tile_showers"
  | "paint"
  | "fixtures_hardware"
  | "appliances"
  | "finish_carpentry"
  | "cleanup_punch"
  | "permits_fees"
  | "allowances"
  | "vendor_quotes"
  | "overhead"
  | "profit"
  | "contingency";

export type ItemUnit =
  | "ea"
  | "sf"
  | "lf"
  | "sy"
  | "hr"
  | "day"
  | "ls"
  | "ton"
  | "cy"
  | "gal";

export type VendorQuoteStatus = "not_needed" | "pending" | "received" | "expired";

export type ExclusionCategory =
  | "scope"
  | "conditions"
  | "warranty"
  | "liability"
  | "schedule"
  | "other";

export type AllowanceCategory =
  | "cabinets"
  | "countertops"
  | "flooring"
  | "appliances"
  | "lighting"
  | "plumbing_fixtures"
  | "tile"
  | "hardware"
  | "landscaping"
  | "driveway_flatwork"
  | "other";

export type RiskFlagType =
  | "occupied_home"
  | "no_plans"
  | "structural_changes"
  | "unknown_conditions"
  | "asbestos_lead"
  | "permit_unknown"
  | "takeover_risk"
  | "code_issues"
  | "weather_exposure"
  | "engineering_needed"
  | "fire_suppression";

export type RiskSeverity = "info" | "warning" | "critical";

export type VendorQuoteRequestStatus =
  | "requested"
  | "received"
  | "accepted"
  | "declined"
  | "expired";

export type QuoteFileCategory =
  | "photo"
  | "plan"
  | "vendor_quote"
  | "inspection"
  | "engineering"
  | "permit"
  | "other";

export type QuoteOutputType = "proposal" | "summary" | "detailed";

export type TakeoverPhase =
  | "sitework"
  | "footings_foundation"
  | "slab"
  | "framing"
  | "roofing"
  | "windows_exterior_doors"
  | "wrb_weather_barrier"
  | "rough_plumbing"
  | "rough_electrical"
  | "rough_hvac"
  | "insulation"
  | "drywall"
  | "cabinets"
  | "tile"
  | "flooring"
  | "trim"
  | "paint"
  | "fixtures"
  | "finals_punch";

export type TakeoverPhaseStatus =
  | "not_started"
  | "in_progress"
  | "complete"
  | "unknown"
  | "deficient_needs_rework";

// ── Helper Types ───────────────────────────────────────────────────────────

export interface PricingControls {
  labor_burden_pct: number;
  overhead_pct: number;
  profit_pct: number;
  contingency_pct: number;
  sales_tax_pct: number;
  permit_allowance: number;
  dumpster_allowance: number;
  equipment_allowance: number;
  cleanup_allowance: number;
}

export interface AllowanceItem {
  category: AllowanceCategory;
  description: string;
  amount: number;
}

export interface QuoteTemplateSectionConfig {
  slug: CostCategorySlug;
  name: string;
  sort_order: number;
  visible_to_client: boolean;
  default_items?: TemplateLineItem[];
}

export interface TemplateLineItem {
  description: string;
  quantity?: number;
  unit?: ItemUnit;
  is_allowance?: boolean;
  is_vendor_quote_required?: boolean;
}

export interface PaymentScheduleItem {
  milestone: string;
  description: string;
  percentage: number;
  amount?: number;
}

// ── Job-Type-Specific Input Types ──────────────────────────────────────────

export interface NewConstructionInputs {
  lot_size?: string;
  slope_grading_difficulty?: "flat" | "moderate" | "steep" | "extreme";
  septic_or_sewer?: "septic" | "sewer" | "unknown";
  well_or_city_water?: "well" | "city" | "unknown";
  power_hookup_distance?: string;
  driveway_length?: string;
  driveway_type?: string;
  heated_sqft?: number;
  garage_sqft?: number;
  porch_patio_sqft?: number;
  number_of_stories?: number;
  beds?: number;
  baths?: number;
  ceiling_height?: string;
  foundation_type?: "slab" | "crawlspace" | "basement" | "pier";
  roof_type?: string;
  roof_pitch?: string;
  siding_type?: string;
  window_package_level?: "standard" | "mid_range" | "premium";
  flooring_by_area?: Record<string, string>;
  cabinet_level?: "stock" | "semi_custom" | "custom";
  countertop_material?: string;
  plumbing_fixture_package?: "standard" | "mid_range" | "premium";
  lighting_package?: "standard" | "mid_range" | "premium";
  appliance_package?: "standard" | "mid_range" | "premium";
  insulation_level?: "standard" | "upgraded" | "spray_foam";
  hvac_type?: string;
  hvac_zones?: number;
  electrical_service_size?: number;
  fire_suppression_required?: boolean;
  survey_allowance?: number;
  engineering_allowance?: number;
  permit_allowance_amount?: number;
}

export interface TakeoverInputs {
  reason_stopped?: string;
  current_permit_status?: string;
  inspection_status?: string;
  available_plans_docs?: string;
  material_onsite?: string;
  visible_damage?: string;
  suspected_code_issues?: string;
  rework_required?: boolean;
  demolition_removal_needed?: boolean;
  third_party_inspection_needed?: boolean;
  engineer_review_needed?: boolean;
  unknown_conditions_allowance?: number;
  warranty_limitation_acknowledged?: boolean;
  phase_audit?: Record<TakeoverPhase, TakeoverPhaseStatus>;
}

export interface AdditionInputs {
  existing_structure_age?: string;
  tie_in_complexity?: "simple" | "moderate" | "complex";
  roof_tie_in?: "simple" | "moderate" | "complex";
  foundation_tie_in?: "simple" | "moderate" | "complex";
  matching_exterior_difficulty?: "easy" | "moderate" | "difficult" | "unavailable";
  matching_interior_difficulty?: "easy" | "moderate" | "difficult";
  existing_system_capacity?: "adequate" | "needs_upgrade" | "unknown";
  occupied_home_premium?: boolean;
  temporary_weather_protection?: boolean;
  demolition_scope?: string;
}

export interface RemodelInputs {
  remodel_type?: "kitchen" | "bathroom" | "whole_house" | "basement" | "other";
  demo_scope?: string;
  structural_changes?: boolean;
  walls_moving?: boolean;
  plumbing_relocation?: boolean;
  electrical_upgrade?: boolean;
  hvac_changes?: boolean;
  asbestos_lead_risk?: "none" | "possible" | "confirmed";
  dust_containment?: boolean;
  occupied_during_remodel?: boolean;
  hidden_damage_contingency?: number;
  finish_allowances?: number;
}

export interface ShopStorageInputs {
  width?: number;
  length?: number;
  height?: number;
  slab_thickness?: number;
  insulation?: boolean;
  electrical_package?: "none" | "basic" | "full";
  lighting_package?: "none" | "basic" | "full";
  plumbing?: boolean;
  rollup_doors?: { count: number; size: string }[];
  man_doors?: number;
  windows?: number;
  mezzanine?: boolean;
  site_prep?: string;
  drive_apron_flatwork?: string;
  exterior_finish?: string;
}

export interface RepairPunchInputs {
  scope_type?: "repair" | "punch_list" | "finish_out";
  labor_only?: boolean;
  punch_list_items?: string[];
  urgency?: "standard" | "urgent" | "emergency";
  materials_allowance?: number;
  site_access_limitations?: string;
  minimum_service_charge?: number;
  trip_charge?: number;
  estimated_days?: number;
}

// ── Database Record Interfaces ─────────────────────────────────────────────

export interface QuoteJobType {
  id: string;
  slug: JobTypeSlug;
  name: string;
  description: string | null;
  sort_order: number;
  active: boolean;
  created_at: string;
}

export interface QuoteTemplate {
  id: string;
  job_type_slug: JobTypeSlug;
  name: string;
  description: string | null;
  sections: QuoteTemplateSectionConfig[];
  default_exclusions: string[];
  default_allowances: AllowanceItem[];
  default_pricing_controls: PricingControls;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Quote {
  id: string;
  quote_number: string;
  project_id: string | null;
  job_type_slug: JobTypeSlug;
  template_id: string | null;
  estimate_stage: EstimateStage;
  status: QuoteStatus;

  // Client & project info
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  project_name: string;
  address: string | null;
  city: string | null;
  county: string | null;
  state: string | null;
  zip: string | null;
  parcel_lot_info: string | null;

  // Site conditions
  occupied_or_vacant: OccupancyStatus | null;
  financing_required: boolean | null;
  target_start_date: string | null;
  desired_completion_date: string | null;
  plans_available: PlansAvailable | null;
  engineering_available: EngineeringAvailable | null;
  permit_status: QuotePermitStatus | null;
  utilities_status: UtilitiesStatus | null;

  // Scope
  owner_supplied_materials: string | null;
  scope_summary: string | null;
  included_scope: string | null;
  excluded_scope: string | null;
  notes: string | null;

  // Pricing controls
  labor_burden_pct: number;
  overhead_pct: number;
  profit_pct: number;
  contingency_pct: number;
  sales_tax_pct: number;
  permit_allowance: number;
  dumpster_allowance: number;
  equipment_allowance: number;
  cleanup_allowance: number;

  // Calculated totals
  subtotal: number;
  total_materials: number;
  total_labor: number;
  total_subcontractor: number;
  total_equipment: number;
  overhead_amount: number;
  profit_amount: number;
  contingency_amount: number;
  tax_amount: number;
  grand_total: number;

  // Terms
  valid_through_date: string | null;
  payment_schedule: PaymentScheduleItem[] | null;
  change_order_language: string | null;

  // Job-type-specific inputs
  job_type_inputs: Record<string, unknown>;

  // Revisions
  revision_number: number;
  parent_quote_id: string | null;

  // Metadata
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuoteSection {
  id: string;
  quote_id: string;
  category_slug: CostCategorySlug;
  name: string;
  sort_order: number;
  is_visible_to_client: boolean;
  subtotal: number;
  notes: string | null;
  created_at: string;
}

export interface QuoteItem {
  id: string;
  quote_id: string;
  section_id: string;
  description: string;
  quantity: number;
  unit: ItemUnit;
  material_cost: number;
  labor_cost: number;
  equipment_cost: number;
  subcontractor_cost: number;
  markup_pct: number;
  tax: number;
  total: number;
  notes: string | null;
  is_internal_only: boolean;
  is_allowance: boolean;
  is_vendor_quote_required: boolean;
  vendor_quote_status: VendorQuoteStatus;
  sort_order: number;
  created_at: string;
}

export interface QuoteExclusion {
  id: string;
  quote_id: string;
  exclusion_text: string;
  category: ExclusionCategory;
  sort_order: number;
  created_at: string;
}

export interface ExclusionLibraryItem {
  id: string;
  text: string;
  category: ExclusionCategory;
  applicable_job_types: JobTypeSlug[];
  active: boolean;
  sort_order: number;
  created_at: string;
}

export interface QuoteAllowance {
  id: string;
  quote_id: string;
  category: AllowanceCategory;
  description: string;
  amount: number;
  notes: string | null;
  sort_order: number;
  created_at: string;
}

export interface AllowancePackage {
  id: string;
  name: string;
  description: string | null;
  items: AllowanceItem[];
  applicable_job_types: JobTypeSlug[];
  active: boolean;
  created_at: string;
}

export interface QuoteVendorQuote {
  id: string;
  quote_id: string;
  quote_item_id: string | null;
  contractor_id: string | null;
  vendor_name: string;
  scope_description: string;
  amount: number;
  status: VendorQuoteRequestStatus;
  received_date: string | null;
  expiry_date: string | null;
  file_url: string | null;
  file_name: string | null;
  notes: string | null;
  created_at: string;
}

export interface QuoteRiskFlag {
  id: string;
  quote_id: string;
  flag_type: RiskFlagType;
  severity: RiskSeverity;
  description: string;
  resolved: boolean;
  resolution_notes: string | null;
  created_at: string;
}

export interface QuoteRevision {
  id: string;
  quote_id: string;
  revision_number: number;
  changed_by: string;
  change_summary: string;
  snapshot: unknown;
  created_at: string;
}

export interface QuoteFile {
  id: string;
  quote_id: string;
  name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  category: QuoteFileCategory;
  notes: string | null;
  created_at: string;
}

export interface QuoteOutput {
  id: string;
  quote_id: string;
  revision_number: number;
  output_type: QuoteOutputType;
  content: unknown;
  pdf_url: string | null;
  sent_to_client: boolean;
  sent_date: string | null;
  created_at: string;
}

// ── Label & Color Constants ────────────────────────────────────────────────

export const JOB_TYPE_LABELS: Record<JobTypeSlug, string> = {
  new_construction: "New Construction",
  takeover: "Takeover",
  addition: "Addition",
  remodel: "Remodel",
  shop_storage: "Shop / Storage",
  repair_punch: "Repair / Punch",
};

export const JOB_TYPE_ICONS: Record<JobTypeSlug, string> = {
  new_construction: "Building2",
  takeover: "AlertTriangle",
  addition: "PlusSquare",
  remodel: "Hammer",
  shop_storage: "Warehouse",
  repair_punch: "Wrench",
};

export const ESTIMATE_STAGE_LABELS: Record<EstimateStage, string> = {
  ballpark: "Ballpark",
  detailed: "Detailed",
  final: "Final",
};

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: "Draft",
  in_progress: "In Progress",
  pending_sub_bids: "Pending Sub Bids",
  review: "Review",
  sent: "Sent",
  accepted: "Accepted",
  declined: "Declined",
  expired: "Expired",
  revised: "Revised",
};

export const QUOTE_STATUS_COLORS: Record<QuoteStatus, string> = {
  draft: "bg-gray-100 text-gray-700",
  in_progress: "bg-blue-100 text-blue-700",
  pending_sub_bids: "bg-yellow-100 text-yellow-700",
  review: "bg-purple-100 text-purple-700",
  sent: "bg-indigo-100 text-indigo-700",
  accepted: "bg-green-100 text-green-700",
  declined: "bg-red-100 text-red-700",
  expired: "bg-orange-100 text-orange-700",
  revised: "bg-slate-100 text-slate-500",
};

export const COST_CATEGORY_LABELS: Record<CostCategorySlug, string> = {
  preconstruction: "Preconstruction",
  sitework: "Sitework",
  concrete_foundation: "Concrete & Foundation",
  framing: "Framing",
  roofing: "Roofing",
  exterior_envelope: "Exterior Envelope",
  doors_windows: "Doors & Windows",
  plumbing: "Plumbing",
  electrical: "Electrical",
  hvac: "HVAC",
  insulation_drywall: "Insulation & Drywall",
  cabinets_millwork: "Cabinets & Millwork",
  countertops: "Countertops",
  flooring: "Flooring",
  tile_showers: "Tile & Showers",
  paint: "Paint",
  fixtures_hardware: "Fixtures & Hardware",
  appliances: "Appliances",
  finish_carpentry: "Finish Carpentry",
  cleanup_punch: "Cleanup & Punch",
  permits_fees: "Permits & Fees",
  allowances: "Allowances",
  vendor_quotes: "Vendor Quotes",
  overhead: "Overhead",
  profit: "Profit",
  contingency: "Contingency",
};

export const ITEM_UNIT_LABELS: Record<ItemUnit, string> = {
  ea: "Each",
  sf: "Sq Ft",
  lf: "Lin Ft",
  sy: "Sq Yd",
  hr: "Hour",
  day: "Day",
  ls: "Lump Sum",
  ton: "Ton",
  cy: "Cu Yd",
  gal: "Gallon",
};

export const RISK_SEVERITY_COLORS: Record<RiskSeverity, string> = {
  info: "bg-blue-100 text-blue-700",
  warning: "bg-yellow-100 text-yellow-700",
  critical: "bg-red-100 text-red-700",
};

export const TAKEOVER_PHASE_LABELS: Record<TakeoverPhase, string> = {
  sitework: "Sitework",
  footings_foundation: "Footings & Foundation",
  slab: "Slab",
  framing: "Framing",
  roofing: "Roofing",
  windows_exterior_doors: "Windows & Exterior Doors",
  wrb_weather_barrier: "WRB / Weather Barrier",
  rough_plumbing: "Rough Plumbing",
  rough_electrical: "Rough Electrical",
  rough_hvac: "Rough HVAC",
  insulation: "Insulation",
  drywall: "Drywall",
  cabinets: "Cabinets",
  tile: "Tile",
  flooring: "Flooring",
  trim: "Trim",
  paint: "Paint",
  fixtures: "Fixtures",
  finals_punch: "Finals & Punch",
};

export const TAKEOVER_PHASE_STATUS_LABELS: Record<TakeoverPhaseStatus, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  complete: "Complete",
  unknown: "Unknown",
  deficient_needs_rework: "Deficient / Needs Rework",
};

export const ALLOWANCE_CATEGORY_LABELS: Record<AllowanceCategory, string> = {
  cabinets: "Cabinets",
  countertops: "Countertops",
  flooring: "Flooring",
  appliances: "Appliances",
  lighting: "Lighting",
  plumbing_fixtures: "Plumbing Fixtures",
  tile: "Tile",
  hardware: "Hardware",
  landscaping: "Landscaping",
  driveway_flatwork: "Driveway & Flatwork",
  other: "Other",
};

// ── Default Cost Categories ────────────────────────────────────────────────

export const DEFAULT_COST_CATEGORIES = [
  { slug: "preconstruction", name: "Preconstruction", sort_order: 1 },
  { slug: "sitework", name: "Sitework", sort_order: 2 },
  { slug: "concrete_foundation", name: "Concrete & Foundation", sort_order: 3 },
  { slug: "framing", name: "Framing", sort_order: 4 },
  { slug: "roofing", name: "Roofing", sort_order: 5 },
  { slug: "exterior_envelope", name: "Exterior Envelope", sort_order: 6 },
  { slug: "doors_windows", name: "Doors & Windows", sort_order: 7 },
  { slug: "plumbing", name: "Plumbing", sort_order: 8 },
  { slug: "electrical", name: "Electrical", sort_order: 9 },
  { slug: "hvac", name: "HVAC", sort_order: 10 },
  { slug: "insulation_drywall", name: "Insulation & Drywall", sort_order: 11 },
  { slug: "cabinets_millwork", name: "Cabinets & Millwork", sort_order: 12 },
  { slug: "countertops", name: "Countertops", sort_order: 13 },
  { slug: "flooring", name: "Flooring", sort_order: 14 },
  { slug: "tile_showers", name: "Tile & Showers", sort_order: 15 },
  { slug: "paint", name: "Paint", sort_order: 16 },
  { slug: "fixtures_hardware", name: "Fixtures & Hardware", sort_order: 17 },
  { slug: "appliances", name: "Appliances", sort_order: 18 },
  { slug: "finish_carpentry", name: "Finish Carpentry", sort_order: 19 },
  { slug: "cleanup_punch", name: "Cleanup & Punch", sort_order: 20 },
  { slug: "permits_fees", name: "Permits & Fees", sort_order: 21 },
  { slug: "allowances", name: "Allowances", sort_order: 22 },
  { slug: "vendor_quotes", name: "Vendor Quotes", sort_order: 23 },
  { slug: "overhead", name: "Overhead", sort_order: 24 },
  { slug: "profit", name: "Profit", sort_order: 25 },
  { slug: "contingency", name: "Contingency", sort_order: 26 },
] as const;

// ── Form Option Arrays ─────────────────────────────────────────────────────

export const JOB_TYPE_OPTIONS = [
  { value: "new_construction", label: "New Construction" },
  { value: "takeover", label: "Takeover" },
  { value: "addition", label: "Addition" },
  { value: "remodel", label: "Remodel" },
  { value: "shop_storage", label: "Shop / Storage" },
  { value: "repair_punch", label: "Repair / Punch" },
] as const;

export const ESTIMATE_STAGE_OPTIONS = [
  { value: "ballpark", label: "Ballpark" },
  { value: "detailed", label: "Detailed" },
  { value: "final", label: "Final" },
] as const;

export const OCCUPANCY_OPTIONS = [
  { value: "occupied", label: "Occupied" },
  { value: "vacant", label: "Vacant" },
  { value: "unknown", label: "Unknown" },
] as const;

export const PLANS_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "partial", label: "Partial" },
] as const;

export const ENGINEERING_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "needed", label: "Needed" },
] as const;

export const PERMIT_STATUS_OPTIONS = [
  { value: "not_needed", label: "Not Needed" },
  { value: "not_applied", label: "Not Applied" },
  { value: "applied", label: "Applied" },
  { value: "approved", label: "Approved" },
  { value: "unknown", label: "Unknown" },
] as const;

export const UTILITIES_STATUS_OPTIONS = [
  { value: "available", label: "Available" },
  { value: "partial", label: "Partial" },
  { value: "none", label: "None" },
  { value: "unknown", label: "Unknown" },
] as const;
