/**
 * The company's social accounts, in one place.
 *
 * These URLs previously lived in the footer, the JSON-LD sameAs list, and each
 * service page's "Follow along" row independently, which is how the Interior
 * Design Facebook page ended up in the footer but not on the interior page.
 * One list, several renderers.
 */

/** Which side of the business an account belongs to. */
export type SocialBrand = "construction" | "interior";

export type SocialPlatform = "instagram" | "facebook";

export interface SocialAccount {
  brand: SocialBrand;
  platform: SocialPlatform;
  /**
   * Accessible name for the link. Icon-only links have no visible text, so
   * this is the only thing a screen reader announces — it needs to say both
   * whose account it is and which platform.
   */
  label: string;
  href: string;
}

/** Short brand name, used as a group heading when every account is shown. */
export const SOCIAL_BRAND_LABELS: Record<SocialBrand, string> = {
  construction: "Custom Homes",
  interior: "Interior Design",
};

export const SOCIAL_ACCOUNTS: SocialAccount[] = [
  {
    brand: "construction",
    platform: "instagram",
    label: "Jones Custom Homes on Instagram",
    href: "https://www.instagram.com/jonescustomhomes/",
  },
  {
    brand: "construction",
    platform: "facebook",
    label: "Jones Custom Homes on Facebook",
    href: "https://www.facebook.com/profile.php?id=61593245056980",
  },
  {
    brand: "interior",
    platform: "instagram",
    label: "Interiors by JCH on Instagram",
    href: "https://www.instagram.com/interiors.by.jch/",
  },
  {
    brand: "interior",
    platform: "facebook",
    label: "Jones Legacy Creations Interior Design on Facebook",
    href: "https://www.facebook.com/profile.php?id=61575767564467",
  },
];

/** Brands in display order, for grouped rendering. */
export const SOCIAL_BRANDS: SocialBrand[] = ["construction", "interior"];

/**
 * Accounts for one side of the business, or all of them when no brand is
 * given. Pages that aren't brand-specific (home, about, contact) and Real
 * Estate — which has no accounts of its own — fall through to all.
 */
export function socialsFor(brand?: SocialBrand): SocialAccount[] {
  if (!brand) return SOCIAL_ACCOUNTS;
  return SOCIAL_ACCOUNTS.filter((account) => account.brand === brand);
}

/** Every profile URL, for schema.org sameAs. */
export const SOCIAL_PROFILE_URLS: string[] = SOCIAL_ACCOUNTS.map((a) => a.href);
