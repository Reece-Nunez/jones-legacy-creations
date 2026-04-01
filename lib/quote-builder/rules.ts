// ── Quote Builder: Business Rules Engine ──

import type {
  JobTypeSlug,
  Quote,
  QuoteItem,
  RiskFlagType,
  RiskSeverity,
  AllowanceCategory,
} from '@/lib/types/quotes';

// ── Rule Action Types ──

export type RuleAction =
  | { type: 'add_risk_flag'; flag_type: RiskFlagType; severity: RiskSeverity; description: string }
  | { type: 'set_min_contingency'; min_pct: number }
  | { type: 'require_upload'; category: string; label: string }
  | { type: 'add_exclusion'; text: string; category: string }
  | { type: 'mark_preliminary' }
  | { type: 'create_followup_task'; title: string; description: string }
  | { type: 'set_status'; status: string }
  | { type: 'show_section'; section_id: string }
  | { type: 'require_field'; field_key: string };

export interface QuoteRule {
  id: string;
  name: string;
  description: string;
  condition: (quote: Quote, items?: QuoteItem[]) => boolean;
  actions: RuleAction[];
  priority: number;
}

// ── Helper: safely read job_type_inputs fields ──

function fd(quote: Quote, key: string): unknown {
  return (quote.job_type_inputs as Record<string, unknown>)?.[key];
}

function fdStr(quote: Quote, key: string): string {
  const v = fd(quote, key);
  return typeof v === 'string' ? v : '';
}

function fdBool(quote: Quote, key: string): boolean {
  return fd(quote, key) === true;
}

// Also read top-level quote fields
function quoteField(quote: Quote, key: string): unknown {
  return (quote as unknown as Record<string, unknown>)[key];
}

function quoteStr(quote: Quote, key: string): string {
  const v = quoteField(quote, key);
  return typeof v === 'string' ? v : '';
}

// ── Quote Rules ──

export const QUOTE_RULES: QuoteRule[] = [
  {
    id: 'takeover_requirements',
    name: 'Takeover Requirements',
    description: 'Takeover projects require photo documentation, higher contingency, and carry inherent risk.',
    priority: 1,
    condition: (quote) => quote.job_type_slug === 'takeover',
    actions: [
      { type: 'require_upload', category: 'photo', label: 'Site Condition Photos' },
      { type: 'set_min_contingency', min_pct: 10 },
      { type: 'add_risk_flag', flag_type: 'takeover_risk', severity: 'warning', description: 'Takeover project — increased risk due to unknown previous work quality. Warranty limitations apply to previously completed phases.' },
    ],
  },
  {
    id: 'occupied_home_risk',
    name: 'Occupied Home Risk',
    description: 'Occupied properties require additional care, scheduling constraints, and dust/noise mitigation.',
    priority: 2,
    condition: (quote) => quoteStr(quote, 'occupied_or_vacant') === 'occupied',
    actions: [
      { type: 'add_risk_flag', flag_type: 'occupied_home', severity: 'warning', description: 'Occupied property — schedule around occupants, protect finished areas, manage dust and noise.' },
    ],
  },
  {
    id: 'no_plans_preliminary',
    name: 'No Plans — Preliminary Estimate',
    description: 'Without plans the estimate is preliminary and subject to significant change.',
    priority: 3,
    condition: (quote) => quoteStr(quote, 'plans_available') === 'no',
    actions: [
      { type: 'mark_preliminary' },
      { type: 'add_risk_flag', flag_type: 'no_plans', severity: 'warning', description: 'No construction plans available — this estimate is preliminary and will require revision once plans are developed.' },
    ],
  },
  {
    id: 'permit_unknown_followup',
    name: 'Permit Status Unknown — Followup',
    description: 'Unknown permit status needs investigation before work can begin.',
    priority: 4,
    condition: (quote) => quoteStr(quote, 'permit_status') === 'unknown',
    actions: [
      { type: 'create_followup_task', title: 'Verify permit status', description: 'Contact the local building department to verify permit status, required inspections, and any outstanding violations for this property.' },
      { type: 'add_risk_flag', flag_type: 'permit_unknown', severity: 'info', description: 'Permit status is unknown — needs verification with the building department before starting work.' },
    ],
  },
  {
    id: 'structural_changes_engineering',
    name: 'Structural Changes Require Engineering',
    description: 'Structural modifications on a remodel require a licensed engineer review.',
    priority: 5,
    condition: (quote) => quote.job_type_slug === 'remodel' && fdBool(quote, 'structural_changes'),
    actions: [
      { type: 'add_risk_flag', flag_type: 'engineering_needed', severity: 'critical', description: 'Structural changes planned — a licensed structural engineer must review and stamp plans before work begins.' },
      { type: 'require_field', field_key: 'engineering_allowance' },
    ],
  },
  {
    id: 'fire_suppression_compliance',
    name: 'Fire Suppression Compliance',
    description: 'Fire suppression triggers additional compliance fields.',
    priority: 6,
    condition: (quote) => fdBool(quote, 'fire_suppression_required'),
    actions: [
      { type: 'show_section', section_id: 'fire_suppression_compliance' },
    ],
  },
  {
    id: 'unknown_conditions_exclusion',
    name: 'Unknown Conditions Exclusion Language',
    description: 'Takeover projects with unknown conditions allowance need explicit exclusion language.',
    priority: 7,
    condition: (quote) => {
      const allowance = fd(quote, 'unknown_conditions_allowance');
      return quote.job_type_slug === 'takeover' && typeof allowance === 'number' && allowance > 0;
    },
    actions: [
      { type: 'add_exclusion', text: 'Costs to remedy concealed or unknown conditions that exceed the stated Unknown Conditions Allowance are excluded from this estimate and will be addressed via change order.', category: 'conditions' },
    ],
  },
  {
    id: 'vendor_quotes_pending',
    name: 'Vendor Quotes Pending',
    description: 'Quote contains items awaiting sub/vendor bids.',
    priority: 8,
    condition: (_quote, items) =>
      items?.some(
        (item: QuoteItem) => item.is_vendor_quote_required && item.vendor_quote_status === 'pending'
      ) ?? false,
    actions: [
      { type: 'set_status', status: 'pending_sub_bids' },
    ],
  },
  {
    id: 'asbestos_lead_risk',
    name: 'Asbestos / Lead Risk',
    description: 'Possible or confirmed hazardous materials require abatement protocols.',
    priority: 9,
    condition: (quote) => {
      const risk = fdStr(quote, 'asbestos_lead_risk');
      return risk === 'possible' || risk === 'confirmed';
    },
    actions: [
      { type: 'add_risk_flag', flag_type: 'asbestos_lead', severity: 'critical', description: 'Possible or confirmed asbestos / lead-based paint — professional testing and licensed abatement may be required before demolition.' },
    ],
  },
  {
    id: 'weather_exposure_takeover',
    name: 'Weather Exposure — Takeover',
    description: 'Takeover site with weather damage noted in visible damage assessment.',
    priority: 10,
    condition: (quote) => {
      if (quote.job_type_slug !== 'takeover') return false;
      const damage = fdStr(quote, 'visible_damage').toLowerCase();
      return damage.includes('weather') || damage.includes('rain') || damage.includes('snow') || damage.includes('water') || damage.includes('moisture') || damage.includes('rot');
    },
    actions: [
      { type: 'add_risk_flag', flag_type: 'weather_exposure', severity: 'warning', description: 'Weather-related damage noted on takeover site — additional inspection and remediation of moisture intrusion, rot, or mold may be required.' },
    ],
  },
  {
    id: 'new_construction_all_sections',
    name: 'New Construction — Show All Sections',
    description: 'New construction quotes display all finish selection sections.',
    priority: 11,
    condition: (quote) => quote.job_type_slug === 'new_construction',
    actions: [
      { type: 'show_section', section_id: 'exterior_finishes' },
      { type: 'show_section', section_id: 'interior_finishes' },
      { type: 'show_section', section_id: 'mep_systems' },
    ],
  },
  {
    id: 'allowance_based_label',
    name: 'Allowance-Based Items Label',
    description: 'Quote contains allowance-based items — final cost may vary based on owner selections.',
    priority: 12,
    condition: (_quote, items) =>
      items?.some((item: QuoteItem) => item.is_allowance) ?? false,
    actions: [
      { type: 'add_risk_flag', flag_type: 'unknown_conditions', severity: 'info', description: 'This quote contains allowance-based items. Final cost may vary based on actual owner selections. Overages or credits will be handled via change order.' },
    ],
  },
];

// ── Rule Evaluation Engine ──

export interface RuleEvaluationResult {
  riskFlags: Array<{ flag_type: RiskFlagType; severity: RiskSeverity; description: string }>;
  actions: RuleAction[];
  warnings: string[];
}

export function evaluateRules(quote: Quote, items?: QuoteItem[]): RuleEvaluationResult {
  const riskFlags: RuleEvaluationResult['riskFlags'] = [];
  const actions: RuleAction[] = [];
  const warnings: string[] = [];

  const sortedRules = [...QUOTE_RULES].sort((a, b) => a.priority - b.priority);

  for (const rule of sortedRules) {
    try {
      if (!rule.condition(quote, items)) continue;

      for (const action of rule.actions) {
        actions.push(action);

        switch (action.type) {
          case 'add_risk_flag':
            riskFlags.push({
              flag_type: action.flag_type,
              severity: action.severity,
              description: action.description,
            });
            break;

          case 'mark_preliminary':
            warnings.push('This estimate is marked PRELIMINARY and subject to revision.');
            break;

          case 'set_min_contingency':
            warnings.push(`Minimum contingency set to ${action.min_pct}% for this job type.`);
            break;

          case 'set_status':
            warnings.push(`Quote status should be set to "${action.status}".`);
            break;

          case 'create_followup_task':
            warnings.push(`Follow-up required: ${action.title}`);
            break;

          case 'require_upload':
            warnings.push(`Required upload: ${action.label}`);
            break;

          case 'require_field':
            warnings.push(`Required field: ${action.field_key}`);
            break;

          case 'add_exclusion':
          case 'show_section':
            break;
        }
      }
    } catch {
      warnings.push(`Rule "${rule.id}" failed to evaluate — skipping.`);
    }
  }

  return { riskFlags, actions, warnings };
}

// ── Default Exclusions by Job Type ──

export const DEFAULT_EXCLUSIONS: Record<JobTypeSlug, string[]> = {
  new_construction: [
    'Landscaping beyond rough grade',
    'Window treatments / blinds',
    'Furniture and decorating',
    'Security / alarm system',
    'Solar panels',
    'Fencing',
    'Swimming pool / spa',
    'Owner-supplied materials installation warranty',
    'Utility company fees and deposits',
    'HOA architectural review fees',
    'Soil testing / geotechnical survey (unless specified)',
    'Tree removal beyond building footprint',
    'Retaining walls (unless specified)',
    'Mailbox',
    'Temporary power pole (owner responsibility)',
    'Curtain rods and window hardware',
    'Exterior decorative lighting beyond allowance',
  ],

  remodel: [
    'Asbestos / lead abatement (unless specified)',
    'Structural engineering fees (unless specified)',
    'Furniture moving / storage',
    'Temporary housing / relocation costs',
    'Damage to existing finishes beyond work area',
    'Pest / termite treatment',
    'Mold remediation (unless specified)',
    'Upgrading existing systems to current code beyond work scope',
    'Matching existing finishes outside work area',
    'Appliance installation (unless specified)',
    'Window treatments',
    'Painting outside of remodel area',
  ],

  takeover: [
    'Warranty on previously completed work',
    'Liability for concealed defects in existing work',
    'Code corrections for previous builder\'s work (unless estimated)',
    'Removal of abandoned materials not identified in estimate',
    'Re-engineering of previous structural work',
    'Correction of survey / property line issues',
    'Previously-pulled permit transfer fees',
    'Cost overruns due to undiscovered conditions beyond allowance',
    'Previous builder\'s unpaid vendor liens',
    'Temporary weatherization beyond initial assessment',
    'Legal fees related to previous builder disputes',
  ],

  addition: [
    'Matching existing finishes outside immediate tie-in area',
    'Structural engineering fees (unless specified)',
    'Furniture moving / storage',
    'Landscaping restoration beyond immediate work area',
    'Utility capacity upgrades by utility company',
    'HOA architectural review fees',
    'Tree removal',
    'Fence relocation',
    'Damage to existing landscaping outside work zone',
  ],

  shop_storage: [
    'Utility company fees and meter deposits',
    'Septic system',
    'Well drilling',
    'Grading beyond building pad',
    'Fencing',
    'Interior finish-out beyond specified scope',
    'Specialized shop equipment installation',
    'Compressed air piping',
    'Vehicle lifts and pit work',
    'Fire suppression (unless specified)',
  ],

  repair_punch: [
    'Matching finishes not commercially available',
    'Code upgrades beyond repair scope',
    'Damage discovered behind walls or under floors',
    'Pest / termite damage remediation',
    'Mold remediation',
    'Root cause investigation (unless specified)',
    'Warranty on pre-existing conditions',
  ],
};

// ── Default Allowance Packages ──

export interface AllowancePackageConfig {
  name: string;
  description: string;
  applicable_job_types: JobTypeSlug[];
  items: Array<{ category: AllowanceCategory; description: string; amount: number }>;
}

export const DEFAULT_ALLOWANCE_PACKAGES: AllowancePackageConfig[] = [
  {
    name: 'Standard New Construction',
    description: 'Builder-grade selections suitable for entry-level and spec homes.',
    applicable_job_types: ['new_construction'],
    items: [
      { category: 'cabinets', description: 'Cabinets', amount: 15_000 },
      { category: 'countertops', description: 'Countertops', amount: 5_000 },
      { category: 'flooring', description: 'Flooring', amount: 12_000 },
      { category: 'appliances', description: 'Appliances', amount: 5_000 },
      { category: 'lighting', description: 'Lighting Fixtures', amount: 3_000 },
      { category: 'plumbing_fixtures', description: 'Plumbing Fixtures', amount: 3_000 },
      { category: 'tile', description: 'Tile', amount: 4_000 },
      { category: 'hardware', description: 'Hardware', amount: 1_500 },
      { category: 'landscaping', description: 'Landscaping', amount: 5_000 },
    ],
  },
  {
    name: 'Mid-Range New Construction',
    description: 'Upgraded selections for custom and semi-custom homes.',
    applicable_job_types: ['new_construction'],
    items: [
      { category: 'cabinets', description: 'Cabinets', amount: 25_000 },
      { category: 'countertops', description: 'Countertops', amount: 10_000 },
      { category: 'flooring', description: 'Flooring', amount: 20_000 },
      { category: 'appliances', description: 'Appliances', amount: 10_000 },
      { category: 'lighting', description: 'Lighting Fixtures', amount: 6_000 },
      { category: 'plumbing_fixtures', description: 'Plumbing Fixtures', amount: 5_000 },
      { category: 'tile', description: 'Tile', amount: 8_000 },
      { category: 'hardware', description: 'Hardware', amount: 3_000 },
      { category: 'landscaping', description: 'Landscaping', amount: 10_000 },
    ],
  },
  {
    name: 'Basic Remodel',
    description: 'Standard allowances for kitchen and bathroom remodels.',
    applicable_job_types: ['remodel'],
    items: [
      { category: 'cabinets', description: 'Cabinets', amount: 8_000 },
      { category: 'countertops', description: 'Countertops', amount: 3_500 },
      { category: 'flooring', description: 'Flooring', amount: 6_000 },
      { category: 'lighting', description: 'Lighting', amount: 1_500 },
      { category: 'plumbing_fixtures', description: 'Plumbing Fixtures', amount: 2_000 },
      { category: 'tile', description: 'Tile', amount: 2_500 },
      { category: 'hardware', description: 'Hardware', amount: 800 },
    ],
  },
];
