/**
 * The property attributes shown on the overview card and offered by the permit
 * extractor. Shared so the two can't disagree about which fields exist or what
 * they're called.
 */
export const PROPERTY_FIELD_LABELS: Record<string, string> = {
  square_footage: "Square Footage",
  stories: "Stories",
  bedrooms: "Bedrooms",
  bathrooms: "Bathrooms",
  garage_spaces: "Garage Spaces",
  finish_level: "Finish Level",
  lot_size: "Lot Size",
  flooring_preference: "Flooring",
  countertop_preference: "Countertops",
  cabinet_preference: "Cabinets",
  project_type: "Project Type",
};

export const PROPERTY_FIELDS = Object.keys(
  PROPERTY_FIELD_LABELS,
) as (keyof typeof PROPERTY_FIELD_LABELS)[];
