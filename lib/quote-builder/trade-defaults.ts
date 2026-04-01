// ── Default Trade Line Items per Job Type ───────────────────────────────────
// Based on Blake's actual quote spreadsheets (Curtis Addition, Dixie Springs Takeover)

import type { JobTypeSlug } from "@/lib/types/quotes";

export interface TradeLineItem {
  trade: string;
  cost: number;
  isOwnerPurchase?: boolean;
  note?: string;
}

export interface JobTypeTradeDefaults {
  trades: Array<{ trade: string; note?: string }>;
  includeOwnerPurchases: boolean;
}

export const JOB_TYPE_TRADE_DEFAULTS: Record<JobTypeSlug, JobTypeTradeDefaults> = {
  new_construction: {
    includeOwnerPurchases: true,
    trades: [
      { trade: "Plans/Engineering" },
      { trade: "Permitting" },
      { trade: "Dirtwork/Excavation" },
      { trade: "Concrete/Foundation" },
      { trade: "Lumber" },
      { trade: "Trusses" },
      { trade: "Framing Labor" },
      { trade: "Roofing" },
      { trade: "Stucco/Siding" },
      { trade: "Stone/Masonry" },
      { trade: "Windows" },
      { trade: "Doors/Trim" },
      { trade: "Insulation" },
      { trade: "Electrical (Rough-In)" },
      { trade: "Electrical (Finish)" },
      { trade: "Plumbing (Rough-In)" },
      { trade: "Plumbing (Finish)" },
      { trade: "HVAC (Rough-In)" },
      { trade: "HVAC (Finish)" },
      { trade: "Drywall" },
      { trade: "Paint" },
      { trade: "Flooring" },
      { trade: "Tile" },
      { trade: "Cabinets" },
      { trade: "Countertops" },
      { trade: "Appliances" },
      { trade: "Glass Shower Door" },
      { trade: "Hardware/Fixtures" },
      { trade: "Landscaping" },
      { trade: "Driveway/Flatwork" },
      { trade: "Garage Door" },
      { trade: "Cleanup/Dumpster" },
      { trade: "Porta Potty" },
    ],
  },

  takeover: {
    includeOwnerPurchases: true,
    trades: [
      { trade: "Pre Construction Clean" },
      { trade: "Fix Existing Materials" },
      { trade: "Demolition/Removal" },
      { trade: "Roofing" },
      { trade: "Stucco/Siding" },
      { trade: "Insulation" },
      { trade: "Drywall" },
      { trade: "Paint" },
      { trade: "Flooring" },
      { trade: "Doors" },
      { trade: "Trim" },
      { trade: "Cabinets" },
      { trade: "Countertops" },
      { trade: "Tile" },
      { trade: "Glass Shower Door" },
      { trade: "Finish Plumbing" },
      { trade: "Finish Electrical" },
      { trade: "Finish HVAC" },
      { trade: "Hardware/Fixtures" },
      { trade: "Appliances" },
      { trade: "Concrete/Flatwork" },
      { trade: "Landscaping" },
      { trade: "Cleanup/Dumpster" },
    ],
  },

  addition: {
    includeOwnerPurchases: true,
    trades: [
      { trade: "Plans/Engineering" },
      { trade: "Permitting" },
      { trade: "Dirtwork" },
      { trade: "Plumbing" },
      { trade: "Concrete" },
      { trade: "Lumber" },
      { trade: "Trusses" },
      { trade: "Framing Labor" },
      { trade: "HVAC" },
      { trade: "Electrical" },
      { trade: "Roofing" },
      { trade: "Insulation" },
      { trade: "Drywall" },
      { trade: "Stucco/Siding" },
      { trade: "Tile" },
      { trade: "Trim/Doors" },
      { trade: "Trim Install" },
      { trade: "Paint" },
      { trade: "Carpet" },
      { trade: "Glass Shower Door" },
      { trade: "Flooring" },
      { trade: "Cabinets" },
      { trade: "Countertops" },
      { trade: "Hardware/Fixtures" },
      { trade: "Cleanup/Dumpster" },
    ],
  },

  remodel: {
    includeOwnerPurchases: true,
    trades: [
      { trade: "Demolition" },
      { trade: "Framing" },
      { trade: "Plumbing" },
      { trade: "Electrical" },
      { trade: "HVAC" },
      { trade: "Insulation" },
      { trade: "Drywall" },
      { trade: "Paint" },
      { trade: "Flooring" },
      { trade: "Tile" },
      { trade: "Cabinets" },
      { trade: "Countertops" },
      { trade: "Glass Shower Door" },
      { trade: "Trim/Doors" },
      { trade: "Hardware/Fixtures" },
      { trade: "Appliances" },
      { trade: "Cleanup/Dumpster" },
    ],
  },

  shop_storage: {
    includeOwnerPurchases: false,
    trades: [
      { trade: "Plans/Engineering" },
      { trade: "Permitting" },
      { trade: "Site Prep/Grading" },
      { trade: "Concrete/Slab" },
      { trade: "Metal Building/Materials" },
      { trade: "Erection Labor" },
      { trade: "Roofing" },
      { trade: "Electrical" },
      { trade: "Plumbing", note: "Optional" },
      { trade: "Insulation", note: "Optional" },
      { trade: "Overhead Doors" },
      { trade: "Man Doors" },
      { trade: "Windows" },
      { trade: "Driveway/Apron" },
      { trade: "Cleanup" },
    ],
  },

  repair_punch: {
    includeOwnerPurchases: false,
    trades: [
      { trade: "Labor" },
      { trade: "Materials" },
      { trade: "Trip Charge", note: "If applicable" },
      { trade: "Dumpster", note: "If applicable" },
    ],
  },
};
