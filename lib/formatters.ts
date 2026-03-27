/**
 * Input formatting utilities for phone numbers, currency, etc.
 * These format values as the user types.
 */

/**
 * Format a phone number as (XXX) XXX-XXXX
 * Strips non-digits, then formats progressively as user types.
 */
export function formatPhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 10);

  if (digits.length === 0) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/**
 * Strip phone formatting back to digits for storage.
 */
export function unformatPhoneNumber(value: string): string {
  return value.replace(/\D/g, "").slice(0, 10);
}

/**
 * Format a number as currency: $1,234.56
 * Handles partial input gracefully (typing in progress).
 */
export function formatCurrencyInput(value: string): string {
  // Remove everything except digits and decimal point
  let cleaned = value.replace(/[^0-9.]/g, "");

  // Only allow one decimal point
  const parts = cleaned.split(".");
  if (parts.length > 2) {
    cleaned = parts[0] + "." + parts.slice(1).join("");
  }

  // Limit to 2 decimal places
  if (parts.length === 2 && parts[1].length > 2) {
    cleaned = parts[0] + "." + parts[1].slice(0, 2);
  }

  if (cleaned === "" || cleaned === ".") return "";

  // Format the integer part with commas
  const [intPart, decPart] = cleaned.split(".");
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  if (decPart !== undefined) {
    return `$${formattedInt}.${decPart}`;
  }

  return `$${formattedInt}`;
}

/**
 * Strip currency formatting back to a plain number string for storage.
 */
export function unformatCurrency(value: string): string {
  return value.replace(/[^0-9.]/g, "");
}

/**
 * Format a display-only currency value (not for input).
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

/**
 * Format a display-only currency value without cents.
 */
export function formatCurrencyWhole(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format square footage with commas: 2,500
 */
export function formatNumber(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("en-US");
}

/**
 * Strip number formatting back to digits.
 */
export function unformatNumber(value: string): string {
  return value.replace(/\D/g, "");
}
