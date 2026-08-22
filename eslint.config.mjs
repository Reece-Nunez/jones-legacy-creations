import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * Money math belongs in lib/finance, and only there.
 *
 * lib/finance/project-financials.ts opens by saying so, in prose, with the
 * reason: the dashboard and the financials page each grew their own reducer
 * and disagreed, and one project showed roughly $90k more profit than it had.
 * The comment did not hold. ProjectDetail.tsx re-derived totalCosts inline
 * anyway and it shipped, then the same class of bug reappeared in the cash
 * flow tally.
 *
 * So the rule is enforced rather than requested. These selectors catch a
 * `.reduce()` over the well-known money collections, in both the bare
 * (`payments.reduce`) and chained (`draws.filter(...).reduce`) forms.
 *
 * If you hit this: add the calculation to lib/finance and import it. If it
 * genuinely does not belong there, the disable comment needs a sentence
 * explaining why the number cannot drift from the canonical one.
 */
const MONEY_COLLECTIONS =
  "^(payments|allPayments|projPayments|contractorPayments|draws|allDraws|projDraws|drawRequests|miscCharges|allMiscCharges|projMisc|loanLedger|allLoanLedger|projLedger|settlements|allSettlements)$";

// Deliberately only the whole-collection form (`payments.reduce(...)`), not
// the filtered form (`payments.filter(...).reduce(...)`). A filtered subset is
// usually a local display total — one draw's line items — and flagging those
// makes the rule noisy enough to get switched off. A total over the entire
// collection is the dangerous one: it is a headline figure that must agree
// with the dashboard and the financials page, and it is exactly the shape the
// inline totalCosts bug took.
const NO_INLINE_MONEY_MATH = [
  {
    // `[arguments.1.value=0]` keeps this to numeric accumulation. Without it
    // the rule also flags `draws.reduce<Record<...>>(fn, {})`, which groups
    // documents by draw and is not money math at all.
    selector: `CallExpression[callee.property.name='reduce'][callee.object.name=/${MONEY_COLLECTIONS}/][arguments.1.value=0]`,
    message:
      "Money math belongs in lib/finance. This totals an entire money collection, which must agree with the dashboard and financials page — import the calculation instead. See the header of lib/finance/project-financials.ts.",
  },
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Agent worktrees are full checkouts, build output and all. Linting them
    // produced ~25,000 findings and buried every real one, which makes
    // `npm run lint` something nobody runs — and a rule nobody runs is not a
    // rule. They are scratch copies; the real files are linted in place.
    ".claude/**",
    // Vendored design-sync tooling, untracked and not ours to lint.
    ".ds-sync/**",
  ]),
  {
    files: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": ["error", ...NO_INLINE_MONEY_MATH],
    },
  },
  {
    // An underscore prefix marks a binding that exists for its position, not
    // its value: a route handler's unused `request`, a destructured field kept
    // to document the shape. Without this they're indistinguishable from
    // genuine dead code, so the real ones get lost in the noise.
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
        },
      ],
    },
  },
]);

export default eslintConfig;
