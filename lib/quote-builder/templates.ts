// ── Quote Builder: Form Templates & Job Type Configurations ──

import type { JobTypeSlug, CostCategorySlug } from '@/lib/types/quotes';

// ── Field & Section Config Interfaces ──

export interface FormFieldConfig {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'boolean' | 'textarea' | 'date' | 'currency' | 'percentage' | 'phase_audit';
  options?: { value: string; label: string }[];
  required?: boolean;
  placeholder?: string;
  helpText?: string;
  defaultValue?: unknown;
  min?: number;
  max?: number;
  step?: number;
  conditional?: { field: string; value: unknown; operator?: 'eq' | 'neq' | 'gt' | 'lt' | 'in' };
  group?: string;
}

export interface FormSectionConfig {
  id: string;
  title: string;
  description?: string;
  fields: FormFieldConfig[];
  conditional?: { field: string; value: unknown; operator?: 'eq' | 'neq' | 'gt' | 'lt' | 'in' };
}

export interface JobTypeFormConfig {
  jobType: JobTypeSlug;
  sections: FormSectionConfig[];
  requiredUploads?: { category: string; label: string; required: boolean }[];
  defaultCostCategories: CostCategorySlug[];
  minContingencyPct?: number;
}

// ── All Cost Categories ──

const ALL_COST_CATEGORIES: CostCategorySlug[] = [
  'preconstruction', 'sitework', 'concrete_foundation', 'framing', 'roofing',
  'exterior_envelope', 'doors_windows', 'plumbing', 'electrical', 'hvac',
  'insulation_drywall', 'cabinets_millwork', 'countertops', 'flooring',
  'tile_showers', 'paint', 'fixtures_hardware', 'appliances', 'finish_carpentry',
  'cleanup_punch', 'permits_fees', 'allowances', 'vendor_quotes',
  'overhead', 'profit', 'contingency',
];

// ── Universal Intake Sections (all job types) ──

export const UNIVERSAL_INTAKE_SECTIONS: FormSectionConfig[] = [
  {
    id: 'project_info',
    title: 'Project Info',
    fields: [
      { key: 'client_name', label: 'Client Name', type: 'text', required: true, placeholder: 'Full name' },
      { key: 'client_email', label: 'Client Email', type: 'text', placeholder: 'email@example.com' },
      { key: 'client_phone', label: 'Client Phone', type: 'text', placeholder: '(801) 555-0100' },
      { key: 'project_name', label: 'Project Name', type: 'text', required: true, placeholder: 'e.g. Smith Residence' },
      { key: 'address', label: 'Street Address', type: 'text', placeholder: '123 Main St' },
      { key: 'city', label: 'City', type: 'text', placeholder: 'Provo' },
      { key: 'county', label: 'County', type: 'text', placeholder: 'Utah County' },
      { key: 'state', label: 'State', type: 'text', defaultValue: 'UT' },
      { key: 'zip', label: 'ZIP Code', type: 'text', placeholder: '84601' },
      { key: 'parcel_lot_info', label: 'Parcel / Lot Info', type: 'text', placeholder: 'Lot #, parcel ID, subdivision' },
    ],
  },
  {
    id: 'site_conditions',
    title: 'Site Conditions',
    fields: [
      {
        key: 'occupied_or_vacant',
        label: 'Occupied or Vacant',
        type: 'select',
        options: [
          { value: 'occupied', label: 'Occupied' },
          { value: 'vacant', label: 'Vacant' },
          { value: 'partially_occupied', label: 'Partially Occupied' },
        ],
      },
      { key: 'financing_required', label: 'Financing / Draw Schedule Required', type: 'boolean', helpText: 'Does the client need a construction loan draw schedule?' },
      {
        key: 'plans_available',
        label: 'Plans Available',
        type: 'select',
        options: [
          { value: 'yes', label: 'Yes — full plan set' },
          { value: 'partial', label: 'Partial plans' },
          { value: 'no', label: 'No plans' },
        ],
      },
      {
        key: 'engineering_available',
        label: 'Engineering Available',
        type: 'select',
        options: [
          { value: 'yes', label: 'Yes — stamped' },
          { value: 'partial', label: 'Partial / unsigned' },
          { value: 'no', label: 'No engineering' },
        ],
      },
      {
        key: 'permit_status',
        label: 'Permit Status',
        type: 'select',
        options: [
          { value: 'not_applied', label: 'Not Applied' },
          { value: 'applied', label: 'Applied — pending' },
          { value: 'approved', label: 'Approved' },
          { value: 'expired', label: 'Expired' },
          { value: 'unknown', label: 'Unknown' },
        ],
      },
      {
        key: 'utilities_status',
        label: 'Utilities Status',
        type: 'select',
        options: [
          { value: 'available', label: 'Available at site' },
          { value: 'needs_hookup', label: 'Needs hookup / extension' },
          { value: 'none', label: 'No utilities' },
          { value: 'unknown', label: 'Unknown' },
        ],
      },
    ],
  },
  {
    id: 'schedule',
    title: 'Schedule',
    fields: [
      { key: 'target_start_date', label: 'Target Start Date', type: 'date' },
      { key: 'desired_completion_date', label: 'Desired Completion Date', type: 'date' },
    ],
  },
  {
    id: 'scope',
    title: 'Scope',
    fields: [
      { key: 'scope_summary', label: 'Scope Summary', type: 'textarea', placeholder: 'Brief description of the overall project scope' },
      { key: 'included_scope', label: 'Included Scope', type: 'textarea', placeholder: 'List work items included in this quote' },
      { key: 'excluded_scope', label: 'Excluded Scope', type: 'textarea', placeholder: 'List work items explicitly excluded' },
      { key: 'owner_supplied_materials', label: 'Owner-Supplied Materials', type: 'textarea', placeholder: 'Materials the owner will supply directly' },
      { key: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Additional notes or special conditions' },
    ],
  },
];

// ── Pricing Controls Section ──

export const PRICING_CONTROLS_SECTION: FormSectionConfig = {
  id: 'pricing_controls',
  title: 'Pricing Controls',
  description: 'Markup, tax, and allowance settings applied to the quote total.',
  fields: [
    { key: 'labor_burden_pct', label: 'Labor Burden %', type: 'percentage', defaultValue: 0, min: 0, max: 100, step: 0.5, helpText: 'Workers comp, payroll taxes, benefits' },
    { key: 'overhead_pct', label: 'Overhead %', type: 'percentage', defaultValue: 10, min: 0, max: 50, step: 0.5 },
    { key: 'profit_pct', label: 'Profit %', type: 'percentage', defaultValue: 10, min: 0, max: 50, step: 0.5 },
    { key: 'contingency_pct', label: 'Contingency %', type: 'percentage', defaultValue: 5, min: 0, max: 25, step: 0.5 },
    { key: 'sales_tax_pct', label: 'Sales Tax %', type: 'percentage', defaultValue: 0, min: 0, max: 15, step: 0.125 },
    { key: 'permit_allowance', label: 'Permit Allowance', type: 'currency', defaultValue: 0, min: 0 },
    { key: 'dumpster_allowance', label: 'Dumpster Allowance', type: 'currency', defaultValue: 0, min: 0 },
    { key: 'equipment_allowance', label: 'Equipment Allowance', type: 'currency', defaultValue: 0, min: 0 },
    { key: 'cleanup_allowance', label: 'Cleanup Allowance', type: 'currency', defaultValue: 0, min: 0 },
  ],
};

// ── Job Type Form Configurations ──

export const JOB_TYPE_CONFIGS: Record<JobTypeSlug, JobTypeFormConfig> = {

  // ── NEW CONSTRUCTION ──
  new_construction: {
    jobType: 'new_construction',
    defaultCostCategories: [...ALL_COST_CATEGORIES],
    sections: [
      {
        id: 'land_site',
        title: 'Land & Site',
        fields: [
          { key: 'lot_size', label: 'Lot Size', type: 'text', placeholder: 'e.g. 0.25 acres, 10,890 sqft' },
          {
            key: 'slope_grading_difficulty',
            label: 'Slope / Grading Difficulty',
            type: 'select',
            options: [
              { value: 'flat', label: 'Flat' },
              { value: 'moderate', label: 'Moderate' },
              { value: 'steep', label: 'Steep' },
              { value: 'extreme', label: 'Extreme' },
            ],
          },
          {
            key: 'septic_or_sewer',
            label: 'Septic or Sewer',
            type: 'select',
            options: [
              { value: 'sewer', label: 'City Sewer' },
              { value: 'septic', label: 'Septic System' },
              { value: 'unknown', label: 'Unknown' },
            ],
          },
          {
            key: 'well_or_city_water',
            label: 'Well or City Water',
            type: 'select',
            options: [
              { value: 'city', label: 'City Water' },
              { value: 'well', label: 'Well' },
              { value: 'unknown', label: 'Unknown' },
            ],
          },
          { key: 'power_hookup_distance', label: 'Power Hookup Distance', type: 'text', placeholder: 'e.g. at lot line, 200 ft' },
          { key: 'driveway_length', label: 'Driveway Length', type: 'text', placeholder: 'e.g. 60 ft' },
          {
            key: 'driveway_type',
            label: 'Driveway Type',
            type: 'select',
            options: [
              { value: 'concrete', label: 'Concrete' },
              { value: 'asphalt', label: 'Asphalt' },
              { value: 'gravel', label: 'Gravel' },
              { value: 'dirt', label: 'Dirt' },
            ],
          },
        ],
      },
      {
        id: 'building_basics',
        title: 'Building Basics',
        fields: [
          { key: 'heated_sqft', label: 'Heated Sq Ft', type: 'number', min: 0, placeholder: 'e.g. 2400' },
          { key: 'garage_sqft', label: 'Garage Sq Ft', type: 'number', min: 0, placeholder: 'e.g. 600' },
          { key: 'porch_patio_sqft', label: 'Porch / Patio Sq Ft', type: 'number', min: 0 },
          {
            key: 'number_of_stories',
            label: 'Number of Stories',
            type: 'select',
            options: [
              { value: '1', label: '1 Story' },
              { value: '1.5', label: '1.5 Story' },
              { value: '2', label: '2 Story' },
              { value: '3', label: '3 Story' },
            ],
          },
          { key: 'beds', label: 'Bedrooms', type: 'number', min: 0 },
          { key: 'baths', label: 'Bathrooms', type: 'number', min: 0, step: 0.5 },
          {
            key: 'ceiling_height',
            label: 'Ceiling Height',
            type: 'select',
            options: [
              { value: '8ft', label: '8 ft' },
              { value: '9ft', label: '9 ft' },
              { value: '10ft', label: '10 ft' },
              { value: '12ft', label: '12 ft' },
              { value: 'custom', label: 'Custom' },
            ],
          },
        ],
      },
      {
        id: 'structure',
        title: 'Structure',
        fields: [
          {
            key: 'foundation_type',
            label: 'Foundation Type',
            type: 'select',
            options: [
              { value: 'slab', label: 'Slab on Grade' },
              { value: 'crawlspace', label: 'Crawlspace' },
              { value: 'basement', label: 'Basement' },
              { value: 'pier', label: 'Pier / Post' },
            ],
          },
          {
            key: 'roof_type',
            label: 'Roof Type',
            type: 'select',
            options: [
              { value: 'composition', label: 'Composition Shingle' },
              { value: 'metal', label: 'Metal' },
              { value: 'tile', label: 'Tile' },
              { value: 'flat', label: 'Flat / TPO' },
            ],
          },
          {
            key: 'roof_pitch',
            label: 'Roof Pitch',
            type: 'select',
            options: [
              { value: 'low', label: 'Low (2:12 – 4:12)' },
              { value: 'standard', label: 'Standard (5:12 – 8:12)' },
              { value: 'steep', label: 'Steep (9:12+)' },
            ],
          },
          {
            key: 'siding_type',
            label: 'Siding / Exterior Cladding',
            type: 'select',
            options: [
              { value: 'stucco', label: 'Stucco' },
              { value: 'stone', label: 'Stone' },
              { value: 'brick', label: 'Brick' },
              { value: 'hardie', label: 'HardiePlank' },
              { value: 'vinyl', label: 'Vinyl' },
              { value: 'wood', label: 'Wood' },
              { value: 'mixed', label: 'Mixed / Combination' },
            ],
          },
        ],
      },
      {
        id: 'exterior_finishes',
        title: 'Exterior Finishes',
        fields: [
          {
            key: 'window_package_level',
            label: 'Window Package Level',
            type: 'select',
            options: [
              { value: 'builder', label: 'Builder Grade' },
              { value: 'mid', label: 'Mid-Range' },
              { value: 'premium', label: 'Premium' },
              { value: 'custom', label: 'Custom / Specialty' },
            ],
          },
          { key: 'exterior_doors_count', label: 'Exterior Doors Count', type: 'number', min: 0 },
          { key: 'garage_doors', label: 'Garage Doors', type: 'text', placeholder: 'e.g. 2x 16ft insulated' },
        ],
      },
      {
        id: 'interior_finishes',
        title: 'Interior Finishes',
        fields: [
          {
            key: 'flooring_preference',
            label: 'Flooring Preference',
            type: 'select',
            options: [
              { value: 'lvp', label: 'LVP / Vinyl Plank' },
              { value: 'hardwood', label: 'Hardwood' },
              { value: 'tile', label: 'Tile' },
              { value: 'carpet', label: 'Carpet' },
              { value: 'mixed', label: 'Mixed' },
            ],
          },
          {
            key: 'cabinet_level',
            label: 'Cabinet Level',
            type: 'select',
            options: [
              { value: 'stock', label: 'Stock' },
              { value: 'semi_custom', label: 'Semi-Custom' },
              { value: 'custom', label: 'Custom' },
            ],
          },
          {
            key: 'countertop_material',
            label: 'Countertop Material',
            type: 'select',
            options: [
              { value: 'laminate', label: 'Laminate' },
              { value: 'quartz', label: 'Quartz' },
              { value: 'granite', label: 'Granite' },
              { value: 'marble', label: 'Marble' },
              { value: 'butcher_block', label: 'Butcher Block' },
            ],
          },
          {
            key: 'plumbing_fixture_package',
            label: 'Plumbing Fixture Package',
            type: 'select',
            options: [
              { value: 'builder', label: 'Builder Grade' },
              { value: 'mid', label: 'Mid-Range' },
              { value: 'premium', label: 'Premium' },
            ],
          },
          {
            key: 'lighting_package',
            label: 'Lighting Package',
            type: 'select',
            options: [
              { value: 'builder', label: 'Builder Grade' },
              { value: 'mid', label: 'Mid-Range' },
              { value: 'premium', label: 'Premium' },
              { value: 'custom', label: 'Custom / Designer' },
            ],
          },
          {
            key: 'appliance_package',
            label: 'Appliance Package',
            type: 'select',
            options: [
              { value: 'standard', label: 'Standard' },
              { value: 'mid', label: 'Mid-Range' },
              { value: 'premium', label: 'Premium' },
              { value: 'owner_supplied', label: 'Owner-Supplied' },
            ],
          },
        ],
      },
      {
        id: 'mep_systems',
        title: 'MEP Systems',
        fields: [
          {
            key: 'hvac_type',
            label: 'HVAC Type',
            type: 'select',
            options: [
              { value: 'central', label: 'Central Forced Air' },
              { value: 'mini_split', label: 'Mini-Split' },
              { value: 'radiant', label: 'Radiant / In-Floor' },
              { value: 'geothermal', label: 'Geothermal' },
            ],
          },
          { key: 'hvac_zones', label: 'HVAC Zones', type: 'number', min: 1, defaultValue: 1 },
          {
            key: 'electrical_service_size',
            label: 'Electrical Service Size',
            type: 'select',
            options: [
              { value: '100', label: '100 Amp' },
              { value: '200', label: '200 Amp' },
              { value: '400', label: '400 Amp' },
            ],
          },
          {
            key: 'insulation_level',
            label: 'Insulation Level',
            type: 'select',
            options: [
              { value: 'code_minimum', label: 'Code Minimum' },
              { value: 'above_code', label: 'Above Code' },
              { value: 'high_performance', label: 'High Performance / Spray Foam' },
            ],
          },
          {
            key: 'fire_suppression_required',
            label: 'Fire Suppression Required',
            type: 'boolean',
            helpText: 'Required for homes over 5,000 sqft in some jurisdictions',
          },
        ],
      },
      {
        id: 'fire_suppression_compliance',
        title: 'Fire Suppression Compliance',
        conditional: { field: 'fire_suppression_required', value: true },
        fields: [
          { key: 'sprinkler_system_type', label: 'Sprinkler System Type', type: 'text', placeholder: 'e.g. NFPA 13D residential' },
          { key: 'fire_alarm_monitoring', label: 'Fire Alarm / Monitoring', type: 'boolean' },
        ],
      },
      {
        id: 'compliance',
        title: 'Compliance',
        fields: [
          { key: 'survey_allowance', label: 'Survey Allowance', type: 'currency', min: 0 },
          { key: 'engineering_allowance', label: 'Engineering Allowance', type: 'currency', min: 0 },
          { key: 'permit_allowance_amount', label: 'Permit Allowance', type: 'currency', min: 0 },
        ],
      },
    ],
  },

  // ── TAKEOVER ──
  takeover: {
    jobType: 'takeover',
    defaultCostCategories: [...ALL_COST_CATEGORIES],
    minContingencyPct: 10,
    requiredUploads: [
      { category: 'photo', label: 'Site Condition Photos', required: true },
    ],
    sections: [
      {
        id: 'previous_work_assessment',
        title: 'Previous Work Assessment',
        fields: [
          { key: 'reason_stopped', label: 'Reason Previous Builder Stopped', type: 'textarea', required: true, placeholder: 'e.g. Financial issues, disputes, abandonment' },
          {
            key: 'current_permit_status',
            label: 'Current Permit Status',
            type: 'select',
            options: [
              { value: 'active', label: 'Active' },
              { value: 'expired', label: 'Expired' },
              { value: 'revoked', label: 'Revoked' },
              { value: 'none', label: 'No Permit Found' },
              { value: 'unknown', label: 'Unknown' },
            ],
          },
          { key: 'inspection_status', label: 'Last Inspection Status', type: 'textarea', placeholder: 'e.g. Passed framing, failed rough-in electrical' },
          {
            key: 'available_plans_docs',
            label: 'Plans & Docs Available',
            type: 'select',
            options: [
              { value: 'yes', label: 'Yes — full set' },
              { value: 'no', label: 'No documents' },
              { value: 'partial', label: 'Partial documents' },
            ],
          },
        ],
      },
      {
        id: 'site_condition',
        title: 'Site Condition',
        fields: [
          { key: 'material_onsite', label: 'Material On Site', type: 'textarea', placeholder: 'Describe usable materials left on site' },
          { key: 'visible_damage', label: 'Visible Damage', type: 'textarea', placeholder: 'Weather damage, vandalism, deterioration' },
          { key: 'suspected_code_issues', label: 'Suspected Code Issues', type: 'textarea', placeholder: 'Any visible code violations or concerns' },
        ],
      },
      {
        id: 'risk_assessment',
        title: 'Risk Assessment',
        fields: [
          { key: 'rework_required', label: 'Rework Required', type: 'boolean', helpText: 'Does previous work need to be torn out and redone?' },
          { key: 'demolition_removal_needed', label: 'Demolition / Removal Needed', type: 'boolean' },
          { key: 'third_party_inspection_needed', label: 'Third-Party Inspection Needed', type: 'boolean' },
          { key: 'engineer_review_needed', label: 'Engineer Review Needed', type: 'boolean' },
          { key: 'unknown_conditions_allowance', label: 'Unknown Conditions Allowance', type: 'currency', min: 0, helpText: 'Dollar amount reserved for undiscovered conditions' },
          { key: 'warranty_limitation_acknowledged', label: 'Warranty Limitation Acknowledged', type: 'boolean', required: true, helpText: 'Client acknowledges limited warranty on previous builder\'s work' },
        ],
      },
      {
        id: 'phase_completion_audit',
        title: 'Phase Completion Audit',
        description: 'Audit each construction phase to assess completion percentage and condition.',
        fields: [
          { key: 'phase_audit', label: 'Phase Completion Audit', type: 'phase_audit', helpText: 'Rate each of the 19 construction phases for completion and condition' },
        ],
      },
    ],
  },

  // ── ADDITION ──
  addition: {
    jobType: 'addition',
    defaultCostCategories: [
      'preconstruction', 'sitework', 'concrete_foundation', 'framing', 'roofing',
      'exterior_envelope', 'doors_windows', 'plumbing', 'electrical', 'hvac',
      'insulation_drywall', 'flooring', 'paint', 'finish_carpentry',
      'cleanup_punch', 'permits_fees', 'overhead', 'profit', 'contingency',
    ],
    sections: [
      {
        id: 'existing_structure',
        title: 'Existing Structure',
        fields: [
          { key: 'existing_structure_age', label: 'Existing Structure Age (years)', type: 'number', min: 0 },
          {
            key: 'tie_in_complexity',
            label: 'Tie-In Complexity',
            type: 'select',
            options: [
              { value: 'simple', label: 'Simple — single wall' },
              { value: 'moderate', label: 'Moderate — multiple tie-ins' },
              { value: 'complex', label: 'Complex — structural modifications' },
            ],
          },
          {
            key: 'roof_tie_in',
            label: 'Roof Tie-In',
            type: 'select',
            options: [
              { value: 'extend', label: 'Extend existing roof' },
              { value: 'new_ridge', label: 'New ridgeline' },
              { value: 'separate', label: 'Separate roof structure' },
              { value: 'flat', label: 'Flat / low-slope tie-in' },
            ],
          },
          {
            key: 'foundation_tie_in',
            label: 'Foundation Tie-In',
            type: 'select',
            options: [
              { value: 'match', label: 'Match existing foundation' },
              { value: 'different', label: 'Different foundation type' },
              { value: 'slab_to_crawl', label: 'Slab-to-crawlspace transition' },
            ],
          },
        ],
      },
      {
        id: 'matching_integration',
        title: 'Matching & Integration',
        fields: [
          {
            key: 'matching_exterior_difficulty',
            label: 'Matching Exterior Difficulty',
            type: 'select',
            options: [
              { value: 'easy', label: 'Easy — common materials' },
              { value: 'moderate', label: 'Moderate — custom match needed' },
              { value: 'difficult', label: 'Difficult — discontinued / specialty' },
            ],
          },
          {
            key: 'matching_interior_difficulty',
            label: 'Matching Interior Difficulty',
            type: 'select',
            options: [
              { value: 'easy', label: 'Easy — standard finishes' },
              { value: 'moderate', label: 'Moderate — custom match needed' },
              { value: 'difficult', label: 'Difficult — specialty finishes' },
            ],
          },
          {
            key: 'existing_system_capacity',
            label: 'Existing System Capacity',
            type: 'select',
            options: [
              { value: 'adequate', label: 'Adequate — can support addition' },
              { value: 'marginal', label: 'Marginal — may need upgrade' },
              { value: 'insufficient', label: 'Insufficient — upgrade required' },
              { value: 'unknown', label: 'Unknown — needs evaluation' },
            ],
          },
        ],
      },
      {
        id: 'site_considerations',
        title: 'Site Considerations',
        fields: [
          { key: 'occupied_home_premium', label: 'Occupied Home Premium', type: 'boolean', helpText: 'Additional cost for working around occupied home' },
          { key: 'temporary_weather_protection', label: 'Temporary Weather Protection Needed', type: 'boolean', helpText: 'Tarps, temporary walls during tie-in' },
          { key: 'demolition_scope', label: 'Demolition Scope', type: 'textarea', placeholder: 'Walls, roof sections, foundation to remove' },
        ],
      },
    ],
  },

  // ── REMODEL ──
  remodel: {
    jobType: 'remodel',
    defaultCostCategories: [
      'preconstruction', 'concrete_foundation', 'framing', 'insulation_drywall',
      'cabinets_millwork', 'countertops', 'flooring', 'tile_showers', 'paint',
      'fixtures_hardware', 'plumbing', 'electrical', 'hvac', 'doors_windows',
      'cleanup_punch', 'permits_fees', 'overhead', 'profit', 'contingency',
    ],
    sections: [
      {
        id: 'remodel_scope',
        title: 'Remodel Scope',
        fields: [
          {
            key: 'remodel_type',
            label: 'Remodel Type',
            type: 'select',
            options: [
              { value: 'kitchen', label: 'Kitchen' },
              { value: 'bathroom', label: 'Bathroom' },
              { value: 'whole_house', label: 'Whole House' },
              { value: 'basement', label: 'Basement Finish' },
              { value: 'other', label: 'Other' },
            ],
          },
          { key: 'demo_scope', label: 'Demo Scope', type: 'textarea', placeholder: 'Describe what needs to be demolished' },
          { key: 'structural_changes', label: 'Structural Changes', type: 'boolean', helpText: 'Removing or modifying load-bearing walls' },
          { key: 'walls_moving', label: 'Walls Moving', type: 'boolean', helpText: 'Any walls being relocated or removed' },
        ],
      },
      {
        id: 'systems',
        title: 'Systems',
        fields: [
          { key: 'plumbing_relocation', label: 'Plumbing Relocation', type: 'boolean', helpText: 'Moving drain lines, supply lines, or fixtures' },
          { key: 'electrical_upgrade', label: 'Electrical Upgrade', type: 'boolean', helpText: 'Panel upgrade or significant rewiring' },
          { key: 'hvac_changes', label: 'HVAC Changes', type: 'boolean', helpText: 'Ductwork rerouting, new zones, or equipment changes' },
        ],
      },
      {
        id: 'risk_conditions',
        title: 'Risk & Conditions',
        fields: [
          {
            key: 'asbestos_lead_risk',
            label: 'Asbestos / Lead Risk',
            type: 'select',
            options: [
              { value: 'none', label: 'None — post-1980 construction' },
              { value: 'unlikely', label: 'Unlikely — but possible' },
              { value: 'possible', label: 'Possible — pre-1980 construction' },
              { value: 'confirmed', label: 'Confirmed — testing positive' },
            ],
          },
          { key: 'dust_containment', label: 'Dust Containment Required', type: 'boolean', helpText: 'ZipWall, negative air, HEPA filtration' },
          { key: 'occupied_during_remodel', label: 'Occupied During Remodel', type: 'boolean', helpText: 'Family living in home during construction' },
          { key: 'hidden_damage_contingency', label: 'Hidden Damage Contingency', type: 'currency', min: 0, helpText: 'Allowance for damage found behind walls / under floors' },
        ],
      },
      {
        id: 'selections',
        title: 'Selections',
        fields: [
          { key: 'finish_allowances', label: 'Finish Allowances', type: 'currency', min: 0, helpText: 'Total allowance budget for owner selections' },
        ],
      },
    ],
  },

  // ── SHOP / STORAGE ──
  shop_storage: {
    jobType: 'shop_storage',
    defaultCostCategories: [
      'preconstruction', 'sitework', 'concrete_foundation', 'framing',
      'roofing', 'exterior_envelope', 'doors_windows', 'insulation_drywall',
      'electrical', 'plumbing', 'cleanup_punch', 'permits_fees',
      'overhead', 'profit', 'contingency',
    ],
    sections: [
      {
        id: 'building_dimensions',
        title: 'Building Dimensions',
        fields: [
          { key: 'width', label: 'Width (ft)', type: 'number', min: 0 },
          { key: 'length', label: 'Length (ft)', type: 'number', min: 0 },
          { key: 'height', label: 'Eave Height (ft)', type: 'number', min: 0 },
          {
            key: 'slab_thickness',
            label: 'Slab Thickness',
            type: 'select',
            options: [
              { value: '4in', label: '4 inch' },
              { value: '5in', label: '5 inch' },
              { value: '6in', label: '6 inch' },
            ],
          },
        ],
      },
      {
        id: 'shop_systems',
        title: 'Systems',
        fields: [
          { key: 'insulation', label: 'Insulation', type: 'boolean' },
          {
            key: 'electrical_package',
            label: 'Electrical Package',
            type: 'select',
            options: [
              { value: 'none', label: 'None' },
              { value: 'basic', label: 'Basic (lights + outlets)' },
              { value: 'full', label: 'Full (sub-panel, 220V, welding outlets)' },
            ],
          },
          {
            key: 'lighting_package',
            label: 'Lighting Package',
            type: 'select',
            options: [
              { value: 'none', label: 'None' },
              { value: 'basic', label: 'Basic LED' },
              { value: 'full', label: 'Full (high bay, task, exterior)' },
            ],
          },
          { key: 'plumbing', label: 'Plumbing', type: 'boolean', helpText: 'Sink, hose bib, floor drain' },
        ],
      },
      {
        id: 'openings',
        title: 'Openings',
        fields: [
          { key: 'rollup_doors_count', label: 'Roll-Up Doors Count', type: 'number', min: 0 },
          { key: 'rollup_door_size', label: 'Roll-Up Door Size', type: 'text', placeholder: 'e.g. 10x10, 12x14' },
          { key: 'man_doors', label: 'Man Doors', type: 'number', min: 0 },
          { key: 'windows', label: 'Windows', type: 'number', min: 0 },
        ],
      },
      {
        id: 'extras',
        title: 'Extras',
        fields: [
          { key: 'mezzanine', label: 'Mezzanine / Loft', type: 'boolean' },
          { key: 'site_prep', label: 'Site Prep', type: 'textarea', placeholder: 'Grading, fill, compaction needs' },
          { key: 'drive_apron_flatwork', label: 'Drive Apron / Flatwork', type: 'textarea', placeholder: 'Apron size, sidewalks, pad extensions' },
          {
            key: 'exterior_finish',
            label: 'Exterior Finish',
            type: 'select',
            options: [
              { value: 'metal', label: 'Metal Panels' },
              { value: 'stucco', label: 'Stucco' },
              { value: 'hardie', label: 'HardiePlank' },
              { value: 'block', label: 'CMU Block' },
              { value: 'mixed', label: 'Mixed' },
            ],
          },
        ],
      },
    ],
  },

  // ── REPAIR / PUNCH ──
  repair_punch: {
    jobType: 'repair_punch',
    defaultCostCategories: [
      'preconstruction', 'flooring', 'paint', 'fixtures_hardware',
      'electrical', 'plumbing', 'cleanup_punch',
      'overhead', 'profit', 'contingency',
    ],
    sections: [
      {
        id: 'repair_scope',
        title: 'Scope',
        fields: [
          {
            key: 'scope_type',
            label: 'Scope Type',
            type: 'select',
            options: [
              { value: 'repair', label: 'Repair' },
              { value: 'punch_list', label: 'Punch List' },
              { value: 'finish_out', label: 'Finish Out' },
            ],
          },
          { key: 'labor_only', label: 'Labor Only', type: 'boolean', helpText: 'No materials — labor and skill only' },
          { key: 'punch_list_items', label: 'Punch List Items', type: 'textarea', placeholder: 'List each item line by line' },
          {
            key: 'urgency',
            label: 'Urgency',
            type: 'select',
            options: [
              { value: 'standard', label: 'Standard' },
              { value: 'urgent', label: 'Urgent (1-3 day response)' },
              { value: 'emergency', label: 'Emergency (same day)' },
            ],
          },
        ],
      },
      {
        id: 'repair_pricing',
        title: 'Pricing',
        fields: [
          { key: 'materials_allowance', label: 'Materials Allowance', type: 'currency', min: 0 },
          { key: 'minimum_service_charge', label: 'Minimum Service Charge', type: 'currency', min: 0 },
          { key: 'trip_charge', label: 'Trip Charge', type: 'currency', min: 0 },
          { key: 'estimated_days', label: 'Estimated Days', type: 'number', min: 0, step: 0.5 },
        ],
      },
      {
        id: 'access',
        title: 'Access',
        fields: [
          { key: 'site_access_limitations', label: 'Site Access Limitations', type: 'textarea', placeholder: 'Gate codes, restricted hours, HOA rules, etc.' },
        ],
      },
    ],
  },
};
