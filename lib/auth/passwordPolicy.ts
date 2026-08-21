/**
 * Password rules for self-service password changes.
 *
 * Shared deliberately: the change-password form renders these as a live
 * checklist, and the API route re-checks the same list before calling
 * Supabase. Client-side validation alone would be a suggestion, not a rule.
 *
 * Note this is a floor, not a ceiling — Supabase's own project-level minimum
 * still applies on top.
 */

export interface PasswordRule {
  /** Stable key for React lists and API error payloads. */
  id: string;
  /** Shown next to the live indicator, so it reads as an instruction. */
  label: string;
  test: (password: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  {
    id: "length",
    label: "More than 6 characters",
    test: (pw) => pw.length > 6,
  },
  {
    id: "uppercase",
    label: "At least one capital letter",
    test: (pw) => /[A-Z]/.test(pw),
  },
  {
    id: "special",
    label: "At least one special character",
    // Anything that isn't a letter or digit. Broad on purpose: punctuation,
    // symbols, and non-ASCII all count, so we never reject a strong password
    // for using a character that wasn't on some hand-written list.
    test: (pw) => /[^A-Za-z0-9]/.test(pw),
  },
];

export interface RuleResult extends Pick<PasswordRule, "id" | "label"> {
  met: boolean;
}

/** Per-rule pass/fail, in display order — drives the live checklist. */
export function evaluatePassword(password: string): RuleResult[] {
  return PASSWORD_RULES.map(({ id, label, test }) => ({
    id,
    label,
    met: test(password),
  }));
}

export function isPasswordValid(password: string): boolean {
  return PASSWORD_RULES.every((rule) => rule.test(password));
}

/** Labels of the rules a password fails, for a server-side error message. */
export function passwordProblems(password: string): string[] {
  return PASSWORD_RULES.filter((rule) => !rule.test(password)).map(
    (rule) => rule.label,
  );
}
