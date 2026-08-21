import { formatDate as sharedFormatDate } from "@/lib/formatters";

/**
 * Display formatters local to the project detail page.
 *
 * Both render an em-dash placeholder rather than "0" or blank for missing
 * values, so an unknown date and a genuinely empty field read the same way
 * down a column.
 */

export const fmtDate = (d: string | null) => sharedFormatDate(d) ?? "--";

export const fmtFileSize = (bytes: number | null) => {
  if (!bytes) return "--";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
