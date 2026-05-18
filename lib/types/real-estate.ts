export type ListingStatus = "draft" | "active" | "pending" | "sold" | "archived";
export type PropertyType =
  | "single_family"
  | "townhome"
  | "condo"
  | "land"
  | "multi_family"
  | "other";

export interface RealEstateListing {
  id: string;
  address: string;
  city: string;
  state: string;
  zip: string | null;
  price: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  square_footage: number | null;
  lot_size: string | null;
  property_type: PropertyType | null;
  mls_url: string | null;
  cover_photo_url: string | null;
  description: string | null;
  status: ListingStatus;
  sort_order: number;
  featured: boolean;
  listed_at: string | null;
  created_at: string;
  updated_at: string;
}

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  single_family: "Single Family",
  townhome: "Townhome",
  condo: "Condo",
  land: "Land",
  multi_family: "Multi-Family",
  other: "Other",
};

export const LISTING_STATUS_LABELS: Record<ListingStatus, string> = {
  draft: "Draft",
  active: "Active",
  pending: "Pending",
  sold: "Sold",
  archived: "Archived",
};

export const LISTING_STATUS_COLORS: Record<ListingStatus, string> = {
  draft: "bg-gray-100 text-gray-700",
  active: "bg-green-100 text-green-700",
  pending: "bg-amber-100 text-amber-700",
  sold: "bg-blue-100 text-blue-700",
  archived: "bg-gray-100 text-gray-500",
};
