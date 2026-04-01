# Quote Builder - Architecture & Design Document

**Project:** Jones Legacy Creations - Construction Estimating System
**Date:** April 1, 2026
**Status:** Design Complete - Ready for Implementation
**Stack:** Next.js (App Router) + Supabase + Tailwind CSS

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Recommended Architecture](#2-recommended-architecture)
3. [Database Schema](#3-database-schema)
4. [Dynamic Form Schema Strategy](#4-dynamic-form-schema-strategy)
5. [Job-Type Field Matrix](#5-job-type-field-matrix)
6. [Rules Engine Logic](#6-rules-engine-logic)
7. [Cost Structure / Estimate Engine](#7-cost-structure--estimate-engine)
8. [Quote Output Structure](#8-quote-output-structure)
9. [Exclusions + Allowances Library](#9-exclusions--allowances-library)
10. [UI Component Plan](#10-ui-component-plan)
11. [API Endpoints](#11-api-endpoints)
12. [MVP Roadmap](#12-mvp-roadmap)

---

## 1. Executive Summary

The Quote Builder is a modular, job-type-driven construction estimating system for Blake's general contracting business. It handles the full lifecycle of construction estimates -- from initial ballpark numbers on a phone call to detailed final proposals ready for client signature.

**What it does:**

- Supports **6 job types**: New Construction, Takeover, Addition, Remodel, Shop/Storage, Repair/Punch List
- Handles **3 estimate stages**: Ballpark (quick rough number), Detailed (line-item breakdown), Final (locked, vendor-confirmed pricing)
- Supports **3 pricing modes**: Rule-based (calculated from inputs), Allowance-based (placeholder amounts for unfinalized selections), Vendor pass-through (actual sub/vendor bids inserted as-is)
- Produces **two views**: Internal estimate (full cost breakdown, risk flags, vendor statuses) and Client-facing proposal (summarized, professional, printable)
- Tracks **revisions**: Every save creates a snapshot so Blake can see what changed and when

**Why it matters:**

Blake currently builds estimates in spreadsheets. This system gives him a structured workflow that catches missing information, flags risks specific to each job type (especially takeovers), and produces consistent professional proposals. It lives inside his existing PM system so quotes can convert directly into managed projects.

**Integration points:**

- Links to existing `projects` table when a quote is accepted
- References existing `contractors` table for vendor quote tracking
- Follows the existing `/app/admin/` routing pattern and `AdminShell` layout
- Uses the same Supabase client patterns already in the codebase

---

## 2. Recommended Architecture

### High-Level Architecture

The Quote Builder sits alongside the existing PM system as a peer module. It does not replace or modify any existing functionality.

```
+------------------------------------------------------------------+
|                        AdminShell Layout                          |
|                                                                   |
|  +-------------------+  +-------------------------------------+  |
|  |   Existing PM     |  |         Quote Builder Module        |  |
|  |                   |  |                                     |  |
|  |  - Projects       |  |  +-------------+  +-------------+  |  |
|  |  - Contractors    |  |  | FormEngine  |  | EstimateEng |  |  |
|  |  - Financials     |  |  | (dynamic    |  | (cost calc, |  |  |
|  |  - Estimates      |  |  |  forms from |  |  markups,   |  |  |
|  |  - Documents      |  |  |  templates) |  |  totals)    |  |  |
|  |                   |  |  +-------------+  +-------------+  |  |
|  |                   |  |  +-------------+  +-------------+  |  |
|  |                   |  |  | RulesEngine |  | OutputGen   |  |  |
|  |                   |  |  | (risk flags,|  | (internal & |  |  |
|  |                   |  |  |  warnings,  |  |  client     |  |  |
|  |                   |  |  |  status)    |  |  views)     |  |  |
|  |                   |  |  +-------------+  +-------------+  |  |
|  |                   |  |  +-------------------------------+  |  |
|  |                   |  |  | RevisionManager               |  |  |
|  |                   |  |  | (snapshots, diffs, history)    |  |  |
|  |                   |  |  +-------------------------------+  |  |
|  +-------------------+  +-------------------------------------+  |
|                                                                   |
|  +-------------------------------------------------------------+ |
|  |                    Supabase (Shared DB)                       | |
|  |  projects | contractors | quotes | quote_sections | ...      | |
|  +-------------------------------------------------------------+ |
+------------------------------------------------------------------+
```

### Data Flow

```
Step 1: User selects job type
         |
         v
Step 2: Load template config (JSON) for that job type
         |
         v
Step 3: User selects estimate stage (ballpark / detailed / final)
         |  - Controls which sections are required vs optional
         v
Step 4: Universal intake fields rendered and saved to quote record
         |  - Client info, site conditions, schedule, scope
         v
Step 5: Job-type-specific fields rendered from template config
         |  - Saved to quote.job_type_inputs (JSONB column)
         v
Step 6: Cost sections auto-populated from template
         |  - User fills/edits line items per category
         v
Step 7: Rules engine evaluates all inputs
         |  - Produces risk flags, status changes, warnings
         |  - Runs on save and on-demand
         v
Step 8: Estimate engine calculates totals
         |  - Line items -> section subtotals -> overall totals
         |  - Applies overhead, profit, contingency, tax
         v
Step 9: Internal estimate summary displayed to Blake
         |  - Full detail: all line items, flags, vendor statuses
         v
Step 10: User generates client proposal
         |  - Summarized by category (no line-item detail)
         |  - Saved to quote_outputs table
         v
Step 11: Revision snapshot created on each save
          - Full quote state stored as JSONB in quote_revisions
```

### Separation of Concerns: Internal vs Client

| Aspect | Internal Estimate (Blake) | Client Proposal |
|--------|--------------------------|-----------------|
| **Line items** | Full detail with quantities, unit costs | Summarized by category only |
| **Cost breakdown** | Material / labor / sub / equipment per item | Single total per category |
| **Markup** | Visible percentages and amounts | Hidden -- baked into totals |
| **Risk flags** | Displayed with severity badges | Not shown |
| **Vendor quote status** | Tracked per item | Not shown |
| **Allowances** | Marked internally | Labeled "Allowance" for client |
| **Exclusions** | Full list with categories | Clean list, professional language |
| **Notes** | Internal notes, warnings, TODOs | Scope description only |
| **Overhead/Profit** | Broken out separately | Combined into total |
| **Contingency** | Shown as percentage and amount | May be shown or hidden (Blake's choice) |

### Key Modules

| Module | Location | Responsibility |
|--------|----------|----------------|
| **FormEngine** | `lib/quotes/form-engine.ts` | Reads template configs, resolves conditional fields, provides field definitions to UI components |
| **EstimateEngine** | `lib/quotes/estimate-engine.ts` | Calculates line item totals, section subtotals, overhead, profit, contingency, tax, grand total |
| **RulesEngine** | `lib/quotes/rules-engine.ts` | Evaluates business rules against quote data, produces risk flags and status change recommendations |
| **OutputGenerator** | `lib/quotes/output-generator.ts` | Transforms internal quote data into client-facing proposal format |
| **RevisionManager** | `lib/quotes/revision-manager.ts` | Creates snapshots on save, tracks change summaries, supports diff between revisions |

---

## 3. Database Schema

**Migration file:** `supabase/migrations/20260401_quote_builder.sql`

### Table Reference

#### `quote_job_types`

**Purpose:** Reference table for the 6 supported job types.

| Field | Type | Notes |
|-------|------|-------|
| `id` | uuid | PK |
| `slug` | text | Unique identifier: `new_construction`, `takeover`, `addition`, `remodel`, `shop_storage`, `repair_punch` |
| `name` | text | Display name |
| `description` | text | Short description shown in job type selector |
| `sort_order` | integer | Display order |
| `active` | boolean | Soft delete |

**Relationships:** Referenced by `quotes.job_type_slug` and `quote_templates.job_type_slug`.

---

#### `quote_templates`

**Purpose:** Stores the JSON configuration that defines which form sections and fields appear for each job type. Controls default exclusions, allowances, and pricing controls.

| Field | Type | Notes |
|-------|------|-------|
| `id` | uuid | PK |
| `job_type_slug` | text | FK to `quote_job_types.slug` |
| `name` | text | Template name (e.g., "Standard New Construction") |
| `sections` | jsonb | Full form configuration -- sections, fields, conditions |
| `default_exclusions` | jsonb | Array of exclusion texts auto-loaded for this job type |
| `default_allowances` | jsonb | Array of default allowance items |
| `default_pricing_controls` | jsonb | Default overhead%, profit%, contingency% values |
| `active` | boolean | Soft delete |

**Relationships:** One template per job type (expandable to multiple). Referenced by `quotes.template_id`.

---

#### `quotes`

**Purpose:** The main quote/estimate record. Contains all universal intake fields, pricing controls, calculated totals, and the JSONB column for job-type-specific inputs.

| Field | Type | Notes |
|-------|------|-------|
| `id` | uuid | PK |
| `quote_number` | text | Auto-generated: `QTE-YYYY-0001` |
| `project_id` | uuid | FK to `projects` (nullable -- quote can exist before project) |
| `job_type_slug` | text | FK to `quote_job_types.slug` |
| `template_id` | uuid | FK to `quote_templates` |
| `estimate_stage` | text | `ballpark` / `detailed` / `final` |
| `status` | text | `draft` / `in_progress` / `pending_sub_bids` / `review` / `sent` / `accepted` / `declined` / `expired` / `revised` |
| `revision_number` | integer | Increments on each revision |
| `parent_quote_id` | uuid | Self-referencing FK for revised quotes |
| Client fields | text | `client_name`, `client_email`, `client_phone` |
| Address fields | text | `project_name`, `address`, `city`, `county`, `state`, `zip`, `parcel_lot_info` |
| Site conditions | text/bool | `occupied_or_vacant`, `financing_required`, `plans_available`, `engineering_available`, `permit_status`, `utilities_status` |
| Schedule fields | date | `target_start_date`, `desired_completion_date` |
| Scope fields | text | `scope_summary`, `included_scope`, `excluded_scope`, `owner_supplied_materials`, `notes` |
| Pricing controls | numeric | `labor_burden_pct`, `overhead_pct`, `profit_pct`, `contingency_pct`, `sales_tax_pct` |
| Fixed allowances | numeric | `permit_allowance`, `dumpster_allowance`, `equipment_allowance`, `cleanup_allowance` |
| Calculated totals | numeric | `subtotal`, `total_materials`, `total_labor`, `total_subcontractor`, `total_equipment`, `overhead_amount`, `profit_amount`, `contingency_amount`, `tax_amount`, `grand_total` |
| Output fields | various | `valid_through_date`, `payment_schedule` (jsonb), `change_order_language` |
| `job_type_inputs` | jsonb | All job-type-specific field values (see Section 4) |

**Key enums:**
- `estimate_stage`: `ballpark`, `detailed`, `final`
- `status`: `draft`, `in_progress`, `pending_sub_bids`, `review`, `sent`, `accepted`, `declined`, `expired`, `revised`
- `occupied_or_vacant`: `occupied`, `vacant`, `unknown`
- `plans_available`: `yes`, `no`, `partial`
- `engineering_available`: `yes`, `no`, `needed`
- `permit_status`: `not_needed`, `not_applied`, `applied`, `approved`, `unknown`
- `utilities_status`: `available`, `partial`, `none`, `unknown`

**Relationships:** Belongs to `projects` (optional), `quote_job_types`, `quote_templates`. Has many `quote_sections`, `quote_exclusions`, `quote_allowances`, `quote_vendor_quotes`, `quote_risk_flags`, `quote_revisions`, `quote_files`, `quote_outputs`.

---

#### `quote_sections`

**Purpose:** Cost category groupings within a quote (e.g., "Framing", "Plumbing", "Electrical"). Each section contains line items.

| Field | Type | Notes |
|-------|------|-------|
| `id` | uuid | PK |
| `quote_id` | uuid | FK to `quotes` (cascade delete) |
| `category_slug` | text | Machine-readable category identifier |
| `name` | text | Display name |
| `sort_order` | integer | Display order |
| `is_visible_to_client` | boolean | Whether section total shows in client proposal |
| `subtotal` | numeric | Calculated sum of line items |
| `notes` | text | Internal notes for this section |

**Relationships:** Belongs to `quotes`. Has many `quote_items`.

---

#### `quote_items`

**Purpose:** Individual line items within a cost section. The atomic unit of pricing.

| Field | Type | Notes |
|-------|------|-------|
| `id` | uuid | PK |
| `quote_id` | uuid | FK to `quotes` (cascade delete) |
| `section_id` | uuid | FK to `quote_sections` (cascade delete) |
| `description` | text | What the item is |
| `quantity` | numeric(10,2) | How many |
| `unit` | text | `ea`, `sf`, `lf`, `sy`, `hr`, `day`, `ls`, `ton`, `cy`, `gal` |
| `material_cost` | numeric | Material cost per unit |
| `labor_cost` | numeric | Labor cost per unit |
| `equipment_cost` | numeric | Equipment cost per unit |
| `subcontractor_cost` | numeric | Sub cost per unit |
| `markup_pct` | numeric | Markup percentage on this item |
| `tax` | numeric | Calculated tax amount |
| `total` | numeric | Calculated total for this line |
| `is_internal_only` | boolean | Hidden from client output |
| `is_allowance` | boolean | Labeled as allowance in client output |
| `is_vendor_quote_required` | boolean | Needs a vendor/sub bid |
| `vendor_quote_status` | text | `not_needed`, `pending`, `received`, `expired` |
| `sort_order` | integer | Display order within section |

**Relationships:** Belongs to `quotes` and `quote_sections`. May have `quote_vendor_quotes`.

---

#### `quote_exclusions`

**Purpose:** Specific exclusions attached to a quote. Sourced from library or custom-entered.

| Field | Type | Notes |
|-------|------|-------|
| `quote_id` | uuid | FK to `quotes` |
| `exclusion_text` | text | The exclusion statement |
| `category` | text | `scope`, `conditions`, `warranty`, `liability`, `schedule` |

---

#### `exclusion_library`

**Purpose:** Reusable exclusion templates. Categorized and tagged by applicable job types.

| Field | Type | Notes |
|-------|------|-------|
| `text` | text | The exclusion statement |
| `category` | text | Category grouping |
| `applicable_job_types` | text[] | Array of job type slugs this applies to |
| `active` | boolean | Soft delete |

**Relationships:** Standalone reference table. Not directly linked to quotes -- exclusions are copied into `quote_exclusions`.

---

#### `quote_allowances`

**Purpose:** Allowance line items on a quote. Represent placeholder amounts for selections the client has not yet finalized.

| Field | Type | Notes |
|-------|------|-------|
| `quote_id` | uuid | FK to `quotes` |
| `category` | text | e.g., `cabinets`, `flooring`, `lighting` |
| `description` | text | What the allowance covers |
| `amount` | numeric | Dollar amount |
| `notes` | text | Internal notes |

---

#### `allowance_packages`

**Purpose:** Pre-defined sets of allowances that can be loaded onto a quote as a starting point.

| Field | Type | Notes |
|-------|------|-------|
| `name` | text | Package name |
| `items` | jsonb | Array of `{category, description, amount}` |
| `applicable_job_types` | text[] | Which job types this package applies to |

**Relationships:** Standalone reference table.

---

#### `quote_vendor_quotes`

**Purpose:** Tracks bids received from subcontractors and vendors for specific items or scopes.

| Field | Type | Notes |
|-------|------|-------|
| `quote_id` | uuid | FK to `quotes` |
| `quote_item_id` | uuid | FK to `quote_items` (optional -- can be general scope) |
| `contractor_id` | uuid | FK to `contractors` (optional -- can be external vendor) |
| `vendor_name` | text | Vendor/sub name (for external vendors not in contractors table) |
| `scope_description` | text | What they are bidding on |
| `amount` | numeric | Their bid amount |
| `status` | text | `requested`, `received`, `accepted`, `declined`, `expired` |
| `received_date` | date | When bid was received |
| `expiry_date` | date | When bid expires |
| `file_url` | text | Uploaded bid document |

**Relationships:** Belongs to `quotes`. Optionally linked to `quote_items` and `contractors`.

---

#### `quote_risk_flags`

**Purpose:** Auto-generated warnings and risk indicators produced by the rules engine.

| Field | Type | Notes |
|-------|------|-------|
| `quote_id` | uuid | FK to `quotes` |
| `flag_type` | text | Machine-readable type (e.g., `takeover_risk`, `occupied_home`) |
| `severity` | text | `info`, `warning`, `critical` |
| `description` | text | Human-readable description |
| `resolved` | boolean | Whether Blake has acknowledged/resolved this flag |
| `resolution_notes` | text | How it was resolved |

---

#### `quote_revisions`

**Purpose:** Snapshots of quote state at each save point. Enables change tracking and rollback.

| Field | Type | Notes |
|-------|------|-------|
| `quote_id` | uuid | FK to `quotes` |
| `revision_number` | integer | Sequential revision number |
| `changed_by` | text | Who made the change |
| `change_summary` | text | What changed in this revision |
| `snapshot` | jsonb | Full quote state at this point in time |

---

#### `quote_files`

**Purpose:** Files attached to a quote -- photos, plans, vendor bid documents, etc.

| Field | Type | Notes |
|-------|------|-------|
| `quote_id` | uuid | FK to `quotes` |
| `name` | text | File name |
| `file_url` | text | Storage URL |
| `file_type` | text | MIME type |
| `category` | text | `photo`, `plan`, `vendor_quote`, `inspection`, `engineering`, `permit`, `other` |

---

#### `quote_outputs`

**Purpose:** Generated client-facing proposals. Stored as structured JSON so they can be re-rendered or exported.

| Field | Type | Notes |
|-------|------|-------|
| `quote_id` | uuid | FK to `quotes` |
| `revision_number` | integer | Which revision this output corresponds to |
| `output_type` | text | `proposal`, `summary`, `detailed` |
| `content` | jsonb | Structured output data |
| `pdf_url` | text | Generated PDF URL (V2) |
| `sent_to_client` | boolean | Whether this was sent |
| `sent_date` | timestamptz | When it was sent |

---

### Entity Relationship Summary

```
quote_job_types (reference)
    |
    |-- 1:M --> quote_templates
    |-- 1:M --> quotes
                  |
                  |-- 1:M --> quote_sections
                  |             |-- 1:M --> quote_items
                  |
                  |-- 1:M --> quote_exclusions
                  |-- 1:M --> quote_allowances
                  |-- 1:M --> quote_vendor_quotes
                  |             |-- optional --> contractors (existing table)
                  |             |-- optional --> quote_items
                  |
                  |-- 1:M --> quote_risk_flags
                  |-- 1:M --> quote_revisions
                  |-- 1:M --> quote_files
                  |-- 1:M --> quote_outputs
                  |-- optional --> projects (existing table)
                  |-- optional --> quotes (parent_quote_id, self-ref)

exclusion_library (standalone reference)
allowance_packages (standalone reference)
```

---

## 4. Dynamic Form Schema Strategy

### Template-Driven Approach

Instead of hardcoding form layouts for each job type, the system uses JSON template configurations. Each template defines sections and fields that the FormEngine renders dynamically. This means adding a new field to a job type is a config change, not a code change.

### FormConfig Structure

```typescript
interface FormConfig {
  job_type: string;
  sections: FormSectionConfig[];
}

interface FormSectionConfig {
  id: string;
  title: string;
  description?: string;
  category: 'universal' | 'job_type_specific' | 'pricing' | 'cost_entry';
  required_at_stage: ('ballpark' | 'detailed' | 'final')[];
  fields: FormFieldConfig[];
}

interface FormFieldConfig {
  id: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'boolean' | 'textarea' | 'date'
        | 'currency' | 'percentage' | 'phase_audit';
  required?: boolean;
  placeholder?: string;
  help_text?: string;
  options?: { value: string; label: string }[];  // for select fields
  default_value?: any;
  show_if?: {                                     // conditional visibility
    field: string;         // ID of another field
    operator: 'eq' | 'neq' | 'in' | 'gt' | 'lt';
    value: any;
  };
  save_to?: 'quote' | 'job_type_inputs';          // where the value is stored
  min?: number;
  max?: number;
  unit_label?: string;     // e.g., "sq ft", "%", "$"
}
```

### Universal vs Job-Type-Specific Fields

**Universal intake sections** are shared across all job types. These fields map directly to columns on the `quotes` table:

- **Project Info:** client_name, client_email, client_phone, project_name, address, city, state, zip
- **Site Conditions:** occupied_or_vacant, plans_available, engineering_available, permit_status, utilities_status
- **Schedule:** target_start_date, desired_completion_date
- **Scope:** scope_summary, included_scope, excluded_scope, owner_supplied_materials, notes
- **Pricing Controls:** overhead_pct, profit_pct, contingency_pct, sales_tax_pct, labor_burden_pct

**Job-type-specific sections** have fields whose values are stored in the `job_type_inputs` JSONB column. Examples:

- **Takeover:** prior_contractor_name, reason_for_takeover, completion_percentage, phase_audit, known_defects, weather_exposure
- **New Construction:** total_sqft, stories, foundation_type, framing_type, roof_type, fire_suppression_required
- **Remodel:** areas_affected, structural_changes, asbestos_risk, lead_paint_risk, demo_required

### How `job_type_inputs` JSONB Works

```
Template Config (JSON)          Quote Record (DB)
+-----------------------+       +---------------------------+
| sections:             |       | job_type_inputs: {        |
|   - id: takeover_info |  -->  |   "prior_contractor":     |
|     fields:           |       |     "ABC Builders",       |
|       - prior_contrac |       |   "reason_for_takeover":  |
|       - reason_for... |       |     "abandoned",          |
|       - completion_pct|       |   "completion_pct": 45,   |
+-----------------------+       |   "known_defects": "..."  |
                                | }                         |
                                +---------------------------+
```

The FormEngine reads the template config, renders the fields, and on save, collects all job-type-specific values into a single JSONB object. This makes the system extensible -- adding new fields to a job type requires only a template config update, no database migration.

### Estimate Stage Effects

| Stage | Universal Intake | Job-Type Fields | Cost Entry | Allowances | Vendor Quotes |
|-------|-----------------|-----------------|------------|------------|---------------|
| **Ballpark** | Required (basics only) | Optional (high-level) | Optional (rough numbers) | Optional | N/A |
| **Detailed** | Required (full) | Required (all sections) | Required (line items) | Encouraged | Tracked |
| **Final** | Required (full) | Required (all, validated) | Required (all resolved) | Finalized or converted | Required (all received) |

### The `phase_audit` Field Type

This is a special composite field type used only for takeover jobs. It renders a per-phase checklist where Blake can mark the status of each construction phase from the prior contractor's work:

```typescript
interface PhaseAuditEntry {
  phase: string;           // e.g., "Foundation", "Framing", "Rough Electrical"
  status: 'not_started' | 'in_progress' | 'complete' | 'defective' | 'unknown';
  notes: string;
  photos_required: boolean;
}
```

This field saves as an array of `PhaseAuditEntry` objects within `job_type_inputs`.

---

## 5. Job-Type Field Matrix

This matrix shows which sections appear for each job type and whether they are required (R), optional (O), or not applicable (-).

### Universal Sections (All Job Types)

| Section | New Const | Takeover | Addition | Remodel | Shop/Storage | Repair/Punch |
|---------|-----------|----------|----------|---------|--------------|--------------|
| Client Information | R | R | R | R | R | R |
| Project Address | R | R | R | R | R | R |
| Site Conditions | R | R | R | R | R | O |
| Schedule | R | R | R | R | O | O |
| Scope Summary | R | R | R | R | R | R |
| Plans & Engineering | R | R | R | O | O | - |
| Permit Status | R | R | R | R | O | O |
| Utilities Status | R | R | R | O | O | - |
| Financing | O | O | O | O | O | - |
| Pricing Controls | R | R | R | R | R | R |

### Job-Type-Specific Sections

| Section | New Const | Takeover | Addition | Remodel | Shop/Storage | Repair/Punch |
|---------|-----------|----------|----------|---------|--------------|--------------|
| **Building Specifications** | | | | | | |
| Total Square Footage | R | R | R | O | R | - |
| Number of Stories | R | O | R | - | O | - |
| Foundation Type | R | O | O | - | R | - |
| Framing Type | R | O | R | - | R | - |
| Roof Type / Pitch | R | O | R | - | R | - |
| Exterior Finish | R | O | R | O | R | - |
| **Takeover-Specific** | | | | | | |
| Prior Contractor Name | - | R | - | - | - | - |
| Reason for Takeover | - | R | - | - | - | - |
| Estimated Completion % | - | R | - | - | - | - |
| Phase Audit (per-phase status) | - | R | - | - | - | - |
| Known Defects / Issues | - | R | - | - | - | - |
| Weather Exposure Damage | - | O | - | - | - | - |
| Existing Warranty Status | - | O | - | - | - | - |
| Prior Permit Status | - | R | - | - | - | - |
| Photos of Current State | - | R | - | - | - | - |
| **Remodel / Addition** | | | | | | |
| Areas Affected | - | - | R | R | - | - |
| Structural Changes | - | - | R | O | - | - |
| Existing Structure Age | - | - | R | R | - | - |
| Asbestos / Lead Risk | - | - | O | R | - | - |
| Demo Required | - | - | O | R | - | - |
| Matching Existing Finishes | - | - | R | R | - | - |
| **New Construction** | | | | | | |
| Lot Conditions | R | - | - | - | O | - |
| Soil / Geotech Report | R | - | O | - | O | - |
| Fire Suppression Required | R | - | O | - | - | - |
| HOA Requirements | O | - | O | O | O | - |
| **Repair / Punch** | | | | | | |
| Warranty Claim | - | - | - | - | - | O |
| Punch List Items | - | - | - | - | - | R |
| Original Project Reference | - | - | - | - | - | O |
| Urgency Level | - | - | - | - | - | R |

### Cost Category Sections

| Cost Category | New Const | Takeover | Addition | Remodel | Shop/Storage | Repair/Punch |
|--------------|-----------|----------|----------|---------|--------------|--------------|
| Site Work / Excavation | R | O | R | O | R | - |
| Foundation / Concrete | R | O | R | - | R | O |
| Framing / Structural | R | O | R | O | R | O |
| Roofing | R | O | R | - | R | O |
| Exterior (siding, trim, etc.) | R | O | R | O | R | O |
| Windows & Doors | R | O | R | O | O | O |
| Insulation | R | O | R | O | R | - |
| Drywall | R | O | R | R | O | O |
| Interior Trim & Doors | R | O | R | R | O | O |
| Cabinets & Countertops | R | O | O | R | - | O |
| Flooring | R | O | O | R | O | O |
| Tile Work | R | O | O | R | - | O |
| Painting (int/ext) | R | O | R | R | R | O |
| Plumbing | R | O | R | R | O | O |
| Electrical | R | O | R | R | R | O |
| HVAC | R | O | R | O | R | O |
| Fire Suppression | O | O | O | - | - | - |
| Appliances | R | O | O | R | - | O |
| Hardware & Accessories | R | O | O | R | - | O |
| Cleanup & Dumpster | R | R | R | R | R | O |
| Permits & Fees | R | R | R | R | O | O |
| Demo / Abatement | - | O | O | R | - | O |
| Temporary Facilities | O | O | O | O | - | - |
| Landscaping | O | O | O | - | O | - |
| Specialty / Other | O | O | O | O | O | O |

---

## 6. Rules Engine Logic

The rules engine evaluates quote data and produces risk flags, status changes, and warnings. Rules run automatically on save and can be triggered on-demand via the API.

### Rule Definitions

#### Rule 1: Takeover Job Requirements
- **Trigger:** `job_type_slug === 'takeover'`
- **Actions:**
  - Set minimum `contingency_pct` to 10% (warn if lower)
  - Require `phase_audit` in `job_type_inputs` (flag if missing)
  - Require at least 1 photo file (flag if missing)
  - Create risk flag: `takeover_risk` / `warning` / "Takeover jobs carry elevated risk. Phase audit, photos, and minimum 10% contingency recommended."
- **Priority:** 1 (runs first)

#### Rule 2: Occupied Home Risk
- **Trigger:** `occupied_or_vacant === 'occupied'`
- **Actions:**
  - Create risk flag: `occupied_home` / `warning` / "Occupied home -- add protection measures, dust control, and scheduling constraints to scope."
  - Add suggested exclusion: "Damage to existing finishes in occupied areas"
- **Priority:** 2

#### Rule 3: No Plans Available
- **Trigger:** `plans_available === 'no'` AND `job_type_slug` in `['new_construction', 'addition']`
- **Actions:**
  - Set `estimate_stage` max to `ballpark` (cannot be `final` without plans)
  - Create risk flag: `no_plans` / `critical` / "No construction plans available. Estimate is preliminary only. Final pricing requires approved plans."
- **Priority:** 3

#### Rule 4: Permit Status Unknown
- **Trigger:** `permit_status === 'unknown'`
- **Actions:**
  - Create risk flag: `permit_unknown` / `info` / "Permit status unknown. Verify permit requirements before finalizing quote."
- **Priority:** 4

#### Rule 5: Structural Changes Detected
- **Trigger:** `job_type_inputs.structural_changes === true` OR any cost section includes "Framing / Structural" items with notes containing "load-bearing", "structural", "beam"
- **Actions:**
  - Create risk flag: `structural_review` / `warning` / "Structural changes detected. Engineering review and stamped plans may be required."
  - If `engineering_available === 'no'`: upgrade severity to `critical`
- **Priority:** 5

#### Rule 6: Fire Suppression Required
- **Trigger:** `job_type_inputs.fire_suppression_required === true`
- **Actions:**
  - Create risk flag: `fire_suppression` / `info` / "Fire suppression system required. Ensure compliance with local fire code. Specialized sub required."
  - Mark fire suppression cost section as required
- **Priority:** 6

#### Rule 7: Unknown / Hidden Conditions
- **Trigger:** `job_type_slug` in `['remodel', 'takeover', 'addition']` AND (`job_type_inputs.existing_structure_age > 30` OR `job_type_inputs.asbestos_risk === true` OR `job_type_inputs.lead_paint_risk === true`)
- **Actions:**
  - Create risk flag: `hidden_conditions` / `warning` / "Older structure or known hazardous materials. Include exclusion language for unforeseen conditions."
  - Auto-add exclusions: "Unforeseen structural deficiencies or hidden damage", "Asbestos, lead paint, or hazardous material abatement"
- **Priority:** 7

#### Rule 8: Vendor Quotes Pending
- **Trigger:** Any `quote_items` where `is_vendor_quote_required === true` AND `vendor_quote_status === 'pending'`
- **Actions:**
  - Set quote `status` to `pending_sub_bids` (if currently `in_progress`)
  - Create risk flag: `pending_vendor_quotes` / `info` / "X vendor quote(s) still pending. Quote total is incomplete."
- **Priority:** 8

#### Rule 9: Asbestos / Lead Risk
- **Trigger:** `job_type_inputs.asbestos_risk === true` OR `job_type_inputs.lead_paint_risk === true`
- **Actions:**
  - Create risk flag: `hazmat_risk` / `critical` / "Potential asbestos or lead paint. Abatement scope and cost must be determined before final pricing. Licensed abatement contractor required."
  - Add suggested cost section: "Demo / Abatement"
- **Priority:** 9

#### Rule 10: Weather Exposure (Takeover)
- **Trigger:** `job_type_slug === 'takeover'` AND `job_type_inputs.weather_exposure === true`
- **Actions:**
  - Create risk flag: `weather_exposure` / `warning` / "Structure has been exposed to weather. Inspect for water damage, mold, and material degradation. Additional remediation may be required."
  - Increase recommended contingency by 5%
- **Priority:** 10

#### Rule 11: New Construction Finish Sections
- **Trigger:** `job_type_slug === 'new_construction'`
- **Actions:**
  - Ensure all finish cost sections are created: Cabinets & Countertops, Flooring, Tile Work, Painting, Interior Trim & Doors, Hardware & Accessories, Appliances
  - Create risk flag (info only if allowances not set): `missing_finish_selections` / `info` / "New construction requires finish selections. Consider using allowances for undecided items."
- **Priority:** 11

#### Rule 12: Allowance-Based Items Present
- **Trigger:** Any `quote_items` where `is_allowance === true` OR any `quote_allowances` exist
- **Actions:**
  - Create risk flag: `has_allowances` / `info` / "Quote contains allowance items. Client proposal will label these clearly. Final cost may vary based on actual selections."
- **Priority:** 12

#### Rule 13: Quote Expiration Warning
- **Trigger:** `valid_through_date` is set AND within 7 days of current date
- **Actions:**
  - Create risk flag: `expiring_soon` / `warning` / "Quote expires in X days. Consider extending or following up with client."
- **Priority:** 13

#### Rule 14: High Contingency Alert
- **Trigger:** `contingency_pct > 15`
- **Actions:**
  - Create risk flag: `high_contingency` / `info` / "Contingency is above 15%. Ensure this is justified and communicated to client."
- **Priority:** 14

### Future: Admin-Editable Rules

For V1, all rules are defined in code in `lib/quotes/rules-engine.ts` as a typed array of rule objects:

```typescript
interface BusinessRule {
  id: string;
  name: string;
  priority: number;
  condition: (quote: Quote) => boolean;
  actions: (quote: Quote) => RuleAction[];
}

interface RuleAction {
  type: 'create_flag' | 'set_status' | 'add_exclusion' | 'set_min_value' | 'require_section';
  payload: Record<string, any>;
}
```

For V2, rules can be migrated to a database table with JSON-defined conditions and actions, plus an admin UI for editing them. The engine would evaluate conditions using a simple expression evaluator rather than code functions.

---

## 7. Cost Structure / Estimate Engine

### The 25 Cost Categories

| # | Category Slug | Display Name | Description |
|---|--------------|--------------|-------------|
| 1 | `site_work` | Site Work / Excavation | Grading, trenching, soil prep, site access, erosion control |
| 2 | `foundation` | Foundation / Concrete | Footings, foundation walls, slabs, flatwork, rebar, forming |
| 3 | `framing` | Framing / Structural | Wall framing, floor systems, roof structure, beams, posts, engineered lumber |
| 4 | `roofing` | Roofing | Sheathing, underlayment, shingles/metal, flashing, gutters, vents |
| 5 | `exterior` | Exterior Finish | Siding, stone/brick, exterior trim, soffit, fascia, house wrap |
| 6 | `windows_doors` | Windows & Doors | Exterior/interior doors, windows, hardware, weatherstripping, skylights |
| 7 | `insulation` | Insulation | Wall, ceiling, floor insulation, vapor barrier, spray foam, batt |
| 8 | `drywall` | Drywall | Hanging, taping, texturing, patching |
| 9 | `interior_trim` | Interior Trim & Doors | Baseboard, casing, crown molding, interior doors, closet systems |
| 10 | `cabinets_countertops` | Cabinets & Countertops | Kitchen/bath cabinetry, countertop material, installation |
| 11 | `flooring` | Flooring | Hardwood, LVP, carpet, subfloor prep, transitions, installation |
| 12 | `tile` | Tile Work | Shower tile, backsplash, floor tile, waterproofing, backer board |
| 13 | `painting` | Painting (Interior/Exterior) | Primer, paint, stain, caulking, prep work, protection |
| 14 | `plumbing` | Plumbing | Rough-in, finish, fixtures, water heater, gas lines, sewer/water connection |
| 15 | `electrical` | Electrical | Rough-in, finish, panel, service, fixtures, outlets, switches, low-voltage |
| 16 | `hvac` | HVAC | Ductwork, furnace, AC, thermostat, venting, registers, mini-splits |
| 17 | `fire_suppression` | Fire Suppression | Sprinkler system, fire alarm, standpipe (when required) |
| 18 | `appliances` | Appliances | Range, dishwasher, microwave, refrigerator, washer/dryer hookups |
| 19 | `hardware` | Hardware & Accessories | Door hardware, cabinet pulls, towel bars, mirrors, bath accessories |
| 20 | `cleanup` | Cleanup & Dumpster | Construction cleanup, dumpster rental, haul-off, final clean |
| 21 | `permits_fees` | Permits & Fees | Building permit, plan review, impact fees, inspection fees, utility connections |
| 22 | `demo` | Demo / Abatement | Demolition, removal, disposal, hazmat abatement, selective demo |
| 23 | `temporary` | Temporary Facilities | Temporary power, temp fencing, portable toilets, temp heat, site security |
| 24 | `landscaping` | Landscaping | Grading, sod, irrigation, planting, hardscape, retaining walls |
| 25 | `specialty` | Specialty / Other | Anything not covered by other categories -- custom items, misc |

### Estimate Calculation Flow

```
Step 1: LINE ITEM TOTALS
  For each quote_item:
    base_cost = (material_cost + labor_cost + equipment_cost + subcontractor_cost) * quantity
    markup_amount = base_cost * (markup_pct / 100)
    item_total = base_cost + markup_amount
    item_tax = taxable_amount * (sales_tax_pct / 100)   -- materials are typically taxable

Step 2: SECTION SUBTOTALS
  For each quote_section:
    section.subtotal = SUM(item.total for all items in section)

Step 3: QUOTE SUBTOTAL
    subtotal = SUM(section.subtotal for all sections)
    total_materials = SUM(item.material_cost * item.quantity for all items)
    total_labor = SUM(item.labor_cost * item.quantity for all items)
    total_subcontractor = SUM(item.subcontractor_cost * item.quantity for all items)
    total_equipment = SUM(item.equipment_cost * item.quantity for all items)

Step 4: ALLOWANCES
    allowance_total = SUM(allowance.amount for all quote_allowances)
    -- Allowances are INCLUDED in the subtotal (they represent placeholder costs)

Step 5: OVERHEAD
    overhead_amount = subtotal * (overhead_pct / 100)

Step 6: PROFIT
    profit_amount = (subtotal + overhead_amount) * (profit_pct / 100)

Step 7: CONTINGENCY
    contingency_amount = subtotal * (contingency_pct / 100)

Step 8: TAX
    tax_amount = SUM(item.tax for all items)
    -- OR globally: taxable_materials * (sales_tax_pct / 100)

Step 9: GRAND TOTAL
    grand_total = subtotal + overhead_amount + profit_amount
                  + contingency_amount + tax_amount

Step 10: FIXED ALLOWANCES (added to grand total)
    grand_total += permit_allowance + dumpster_allowance
                   + equipment_allowance + cleanup_allowance
    -- These are separate from category allowances -- they are
       fixed line items that Blake adds as flat amounts
```

### Line Item Detail

Each line item (`quote_items`) captures:

```
Description: "2x6 exterior wall framing"
Quantity:    1,800
Unit:        sf
Material:    $2.50/sf     → $4,500.00
Labor:       $3.00/sf     → $5,400.00
Equipment:   $0.25/sf     → $450.00
Sub:         $0.00/sf     → $0.00
Markup:      10%          → $1,035.00
                          -----------
Total:                     $11,385.00

Flags:
  is_internal_only:         false
  is_allowance:             false
  is_vendor_quote_required: false
```

### Three Pricing Modes

#### 1. Rule-Based Pricing (V2/V3)

Calculated automatically from form inputs. Not in V1 -- line items are manually entered.

Example future rule: "Framing labor = total_sqft * $3.25/sf * stories_multiplier"

#### 2. Allowance-Based Pricing

Used when the client has not finalized selections. Blake enters a placeholder dollar amount. In the client proposal, these items are clearly labeled "Allowance" so the client knows the final cost may differ.

Example: "Flooring Allowance - $12,000. Final cost will be adjusted based on material selection."

In the estimate, allowance items have `is_allowance = true` on the line item. In the client output, they appear with an "ALLOWANCE" badge and a note that actual cost will be reconciled.

#### 3. Vendor Pass-Through Pricing

For items where a subcontractor or vendor provides a fixed bid, that amount is entered directly. The `subcontractor_cost` field holds the vendor's number, and the `quote_vendor_quotes` table tracks the bid details.

Example: "HVAC rough-in and finish - Sub bid from Mountain Air Mechanical: $14,200. Accepted 3/15/2026."

Blake can apply his markup on top of the sub bid or pass it through at cost.

---

## 8. Quote Output Structure

### A. Internal Estimate View (What Blake Sees)

This is the full-detail working view. It shows everything needed to evaluate, adjust, and finalize the estimate.

**Layout:**

```
+------------------------------------------------------------------+
| QUOTE: QTE-2026-0042          Status: [In Progress]              |
| Job Type: New Construction    Stage: Detailed                     |
| Client: John Smith            Rev: 3                              |
| Address: 123 Main St, Provo   Created: 3/15/2026                  |
+------------------------------------------------------------------+

[Risk Flags Panel]
  !! CRITICAL: No plans available - estimate is preliminary
  !  WARNING: Occupied home - add protection measures
  i  INFO: 3 allowance items included

[Missing Information]
  - Engineering report not uploaded
  - Permit status unknown
  - 2 vendor quotes pending

+------------------------------------------------------------------+
| COST BREAKDOWN                                                    |
+------------------------------------------------------------------+
| Category              | Material  | Labor    | Sub     | Total   |
|----------------------|-----------|----------|---------|---------|
| Site Work            | $2,400    | $3,600   | $0      | $6,600  |
| Foundation           | $8,200    | $6,400   | $0      | $16,060 |
| Framing              | $18,500   | $14,200  | $0      | $35,970 |
| ... (all 25 categories)                                           |
+------------------------------------------------------------------+
| Subtotal                                              | $185,400 |
| Overhead (10%)                                        | $18,540  |
| Profit (10%)                                          | $20,394  |
| Contingency (5%)                                      | $9,270   |
| Tax                                                   | $6,422   |
| GRAND TOTAL                                           | $240,026 |
+------------------------------------------------------------------+

[Allowances]
  - Cabinets: $15,000 (ALLOWANCE)
  - Flooring: $12,000 (ALLOWANCE)
  - Countertops: $5,000 (ALLOWANCE)

[Exclusions]
  - Landscaping, irrigation, and final grading
  - Fencing and retaining walls
  - Low-voltage wiring (security, audio, networking)
  - ...

[Pending Vendor Quotes]
  - HVAC: Mountain Air Mechanical - Requested 3/10 - PENDING
  - Plumbing: Pro Pipe - Received 3/12 - $8,400

[Revision Notes]
  Rev 3 (3/20/2026): Added HVAC section, updated framing estimate
  Rev 2 (3/17/2026): Changed from ballpark to detailed stage
  Rev 1 (3/15/2026): Initial draft
```

### B. Client-Facing Proposal (What the Client Sees)

Professional, summarized format. No internal detail, no markup breakdown, no risk flags.

```
+------------------------------------------------------------------+
|                                                                    |
|                    JONES LEGACY CREATIONS                          |
|                    General Contractor                              |
|                    [Address / Phone / License]                     |
|                                                                    |
+------------------------------------------------------------------+

                    CONSTRUCTION PROPOSAL

Project:    Smith Residence - New Construction
Address:    123 Main St, Provo, UT 84601
Date:       March 20, 2026
Valid Through: April 19, 2026
Proposal #: QTE-2026-0042 (Rev 3)

+------------------------------------------------------------------+
| SCOPE OF WORK                                                     |
+------------------------------------------------------------------+
| Ground-up new construction of a single-family residence,          |
| approximately 2,400 sq ft, 2 stories, on existing lot.           |
| Includes all work from foundation through final finishes          |
| as detailed below.                                                |
+------------------------------------------------------------------+

+------------------------------------------------------------------+
| PRICING SUMMARY                                                   |
+------------------------------------------------------------------+
| Category                                    | Amount              |
|---------------------------------------------|---------------------|
| Site Work & Excavation                      | $6,600              |
| Foundation & Concrete                       | $16,060             |
| Framing & Structural                        | $35,970             |
| Roofing                                     | $12,400             |
| Exterior Finish                             | $14,800             |
| Windows & Doors                             | $11,200             |
| Insulation                                  | $4,800              |
| Drywall                                     | $8,600              |
| Interior Trim & Doors                       | $6,200              |
| Cabinets & Countertops (ALLOWANCE)          | $20,000             |
| Flooring (ALLOWANCE)                        | $12,000             |
| Tile Work                                   | $4,800              |
| Painting                                    | $6,400              |
| Plumbing                                    | $14,200             |
| Electrical                                  | $12,800             |
| HVAC                                        | $14,200             |
| Appliances (ALLOWANCE)                      | $5,000              |
| Hardware & Accessories                      | $2,800              |
| Cleanup & Dumpster                          | $3,200              |
| Permits & Fees                              | $4,500              |
|---------------------------------------------|---------------------|
| PROJECT TOTAL                               | $240,026            |
+------------------------------------------------------------------+

  * Items marked (ALLOWANCE) are placeholder amounts. Final cost
    will be adjusted based on your selections. Overages or savings
    on allowance items will be reflected in a change order.

+------------------------------------------------------------------+
| EXCLUSIONS                                                        |
+------------------------------------------------------------------+
| The following items are NOT included in this proposal:            |
|                                                                    |
| - Landscaping, irrigation, and final grading                     |
| - Fencing and retaining walls                                    |
| - Window coverings and treatments                                |
| - Low-voltage wiring (security, audio, networking)               |
| - Solar panel installation                                       |
| - Swimming pool, hot tub, or water features                      |
+------------------------------------------------------------------+

+------------------------------------------------------------------+
| PAYMENT SCHEDULE                                                  |
+------------------------------------------------------------------+
| Milestone                          | Percentage | Amount         |
|------------------------------------|------------|----------------|
| Contract Signing                   | 10%        | $24,003        |
| Foundation Complete                | 15%        | $36,004        |
| Framing Complete                   | 20%        | $48,005        |
| Rough-Ins Complete                 | 15%        | $36,004        |
| Drywall Complete                   | 10%        | $24,003        |
| Finish Work 50%                    | 15%        | $36,004        |
| Substantial Completion             | 10%        | $24,003        |
| Final Completion / Walkthrough     | 5%         | $12,001        |
+------------------------------------------------------------------+

+------------------------------------------------------------------+
| TERMS & CONDITIONS                                                |
+------------------------------------------------------------------+
| - This proposal is valid for 30 days from date above.            |
| - Any changes to the scope of work will be documented via        |
|   written change order and may affect project cost and timeline. |
| - Owner is responsible for timely material selections to avoid   |
|   schedule delays.                                                |
| - Contractor is not responsible for delays due to weather,       |
|   material shortages, or permitting timelines.                   |
+------------------------------------------------------------------+

+------------------------------------------------------------------+
| ACCEPTANCE                                                        |
+------------------------------------------------------------------+
| By signing below, you accept this proposal and authorize          |
| Jones Legacy Creations to proceed with the described work.        |
|                                                                    |
| Client Signature: _________________________ Date: ____________   |
|                                                                    |
| Printed Name: _________________________                           |
|                                                                    |
| Contractor: ___________________________ Date: ____________       |
+------------------------------------------------------------------+
```

### C. Revision / Change Log

Each revision captures:

| Field | Description |
|-------|-------------|
| `revision_number` | Sequential number (1, 2, 3, ...) |
| `created_at` | Timestamp of the revision |
| `changed_by` | Who made the change (user identifier) |
| `change_summary` | Brief text description of what changed |
| `snapshot` | Full JSONB snapshot of the quote state at that point |

**Diff capability (V2):** Compare any two revisions to see:
- Added/removed line items
- Changed quantities or costs
- Added/removed exclusions
- Status changes
- Total difference

---

## 9. Exclusions + Allowances Library

### Starter Exclusions by Job Type

#### New Construction Exclusions

| # | Exclusion | Category |
|---|-----------|----------|
| 1 | Landscaping, irrigation, and final grading | scope |
| 2 | Fencing and retaining walls | scope |
| 3 | Window coverings and treatments | scope |
| 4 | Furniture, decor, and staging | scope |
| 5 | Low-voltage wiring (security, audio, networking) | scope |
| 6 | Solar panel installation | scope |
| 7 | Driveway and flatwork beyond specified scope | scope |
| 8 | Swimming pool, hot tub, or water features | scope |
| 9 | Soil remediation or environmental cleanup | conditions |
| 10 | Rock excavation beyond normal soil conditions | conditions |
| 11 | Warranty on owner-supplied materials or appliances | warranty |
| 12 | Natural settling, shrinkage cracks, or nail pops after 1 year | warranty |
| 13 | Delays caused by owner-directed changes or late decisions | liability |
| 14 | Delays due to weather, material shortages, or supply chain issues | schedule |
| 15 | Delays due to municipal permitting or inspection timelines | schedule |
| 16 | Weekend or after-hours work (available at additional cost) | schedule |

#### Remodel Exclusions

| # | Exclusion | Category |
|---|-----------|----------|
| 1 | Landscaping, irrigation, and final grading | scope |
| 2 | Window coverings and treatments | scope |
| 3 | Furniture, decor, and staging | scope |
| 4 | Low-voltage wiring (security, audio, networking) | scope |
| 5 | Solar panel installation | scope |
| 6 | Swimming pool, hot tub, or water features | scope |
| 7 | Unforeseen structural deficiencies or hidden damage | conditions |
| 8 | Asbestos, lead paint, or hazardous material abatement | conditions |
| 9 | Mold remediation | conditions |
| 10 | Work required due to existing code violations | conditions |
| 11 | Warranty on owner-supplied materials or appliances | warranty |
| 12 | Damage to existing landscaping during construction | liability |
| 13 | Damage to existing finishes in occupied areas | liability |
| 14 | Delays caused by owner-directed changes or late decisions | liability |
| 15 | Delays due to weather, material shortages, or supply chain issues | schedule |
| 16 | Weekend or after-hours work (available at additional cost) | schedule |

#### Takeover Job Exclusions

| # | Exclusion | Category |
|---|-----------|----------|
| 1 | Correction of defects or non-code-compliant work by prior contractor | scope |
| 2 | Investigation or forensic assessment of prior work beyond initial walkthrough | scope |
| 3 | Unforeseen structural deficiencies or hidden damage | conditions |
| 4 | Asbestos, lead paint, or hazardous material abatement | conditions |
| 5 | Mold remediation | conditions |
| 6 | Work required due to existing code violations | conditions |
| 7 | Warranty on work performed by others or prior contractors | warranty |
| 8 | Warranty on any portion of work completed by prior contractor | warranty |
| 9 | Damage to existing finishes in occupied areas | liability |
| 10 | Delays caused by owner-directed changes or late decisions | liability |
| 11 | Delays due to weather, material shortages, or supply chain issues | schedule |
| 12 | Weekend or after-hours work (available at additional cost) | schedule |

### Allowance Packages

#### Standard New Construction

| Category | Description | Amount |
|----------|-------------|--------|
| Cabinets | Kitchen and bathroom cabinetry | $15,000 |
| Countertops | Kitchen and bathroom countertops | $5,000 |
| Flooring | All flooring materials | $12,000 |
| Appliances | Kitchen appliance package | $5,000 |
| Lighting | Light fixtures throughout | $3,500 |
| Plumbing Fixtures | Faucets, sinks, shower fixtures | $3,000 |
| Tile | Shower and backsplash tile | $4,000 |
| Hardware | Door and cabinet hardware | $1,500 |
| Landscaping | Basic front yard landscaping | $5,000 |
| **Total** | | **$54,000** |

#### Mid-Range New Construction

| Category | Description | Amount |
|----------|-------------|--------|
| Cabinets | Semi-custom kitchen and bath cabinetry | $25,000 |
| Countertops | Granite or quartz countertops | $8,000 |
| Flooring | Hardwood and tile flooring | $18,000 |
| Appliances | Mid-range stainless appliance package | $8,000 |
| Lighting | Designer light fixtures throughout | $6,000 |
| Plumbing Fixtures | Mid-range faucets, sinks, shower systems | $5,000 |
| Tile | Custom shower tile and backsplash | $7,000 |
| Hardware | Quality door and cabinet hardware | $2,500 |
| Landscaping | Full front and side yard landscaping | $10,000 |
| **Total** | | **$89,500** |

#### Basic Remodel

| Category | Description | Amount |
|----------|-------------|--------|
| Cabinets | Kitchen or bathroom cabinetry | $8,000 |
| Countertops | Laminate or basic granite | $3,000 |
| Flooring | LVP or carpet | $6,000 |
| Appliances | Basic appliance package | $3,000 |
| Lighting | Standard light fixtures | $1,500 |
| Plumbing Fixtures | Standard faucets and fixtures | $1,500 |
| Tile | Basic shower or floor tile | $2,000 |
| **Total** | | **$25,000** |

---

## 10. UI Component Plan

### Components

All quote builder components live under `components/admin/quotes/`.

#### 1. EstimateWizard

**File:** `components/admin/quotes/EstimateWizard.tsx`

**Responsibility:** Main multi-step wizard container. Manages the full quote creation/editing flow.

- Manages step navigation state (current step, completed steps, validation per step)
- Steps: Job Type -> Stage -> Intake -> Job-Type Fields -> Allowances/Exclusions -> Cost Entry -> Review -> Output
- Handles auto-save on step completion
- Triggers rules engine evaluation between steps
- Loads existing quote data for editing
- Uses `react-hook-form` for form state management across steps

#### 2. JobTypeSelector

**File:** `components/admin/quotes/JobTypeSelector.tsx`

**Responsibility:** Card grid for selecting the job type.

- Renders 6 job type cards with icon, name, and description
- Highlights the selected type
- Loads from `quote_job_types` table
- On selection, loads the corresponding template config

#### 3. EstimateStageSelector

**File:** `components/admin/quotes/EstimateStageSelector.tsx`

**Responsibility:** Three-option selector for ballpark / detailed / final.

- Displays description of each stage and what is required
- Grays out "final" if prerequisites are not met (e.g., no plans)
- Changing stage adjusts which form sections are required vs optional

#### 4. UniversalIntakeForm

**File:** `components/admin/quotes/UniversalIntakeForm.tsx`

**Responsibility:** Renders the universal intake sections shared across all job types.

- Uses `react-hook-form` with validation
- Sections: Client Info, Project Address, Site Conditions, Schedule, Scope, Plans & Engineering
- Fields map directly to `quotes` table columns
- Supports linking to an existing project (auto-fills address, client info)

#### 5. DynamicSectionRenderer

**File:** `components/admin/quotes/DynamicSectionRenderer.tsx`

**Responsibility:** Generic renderer that takes a `FormSectionConfig` and produces the form UI.

- Renders all field types: text, number, select, boolean, textarea, date, currency, percentage, phase_audit
- Handles conditional visibility (`show_if` logic)
- Saves values to `job_type_inputs` JSONB
- Supports the special `phase_audit` field type (renders per-phase checklist grid)

#### 6. PricingControlsForm

**File:** `components/admin/quotes/PricingControlsForm.tsx`

**Responsibility:** Controls for overhead, profit, contingency, tax, and fixed allowances.

- Renders percentage inputs for overhead_pct, profit_pct, contingency_pct, sales_tax_pct, labor_burden_pct
- Renders currency inputs for permit_allowance, dumpster_allowance, equipment_allowance, cleanup_allowance
- Live-updates the estimate total as values change

#### 7. CostSectionEditor

**File:** `components/admin/quotes/CostSectionEditor.tsx`

**Responsibility:** Editor for a single cost category section and its line items.

- Section header with name, notes, client-visibility toggle
- Line item table with inline editing
- Add / remove / reorder line items
- Per-item fields: description, quantity, unit, material cost, labor cost, equipment cost, sub cost, markup %
- Per-item flags: internal_only, allowance, vendor_quote_required
- Running section subtotal
- Collapsible for space management

#### 8. AllowanceEditor

**File:** `components/admin/quotes/AllowanceEditor.tsx`

**Responsibility:** Manages allowance items on the quote.

- Load from allowance packages (dropdown selector)
- Add custom allowance items
- Edit category, description, amount
- Shows total allowance amount
- Allowances are displayed separately from cost sections

#### 9. ExclusionsSelector

**File:** `components/admin/quotes/ExclusionsSelector.tsx`

**Responsibility:** Select exclusions from library or add custom ones.

- Loads exclusion_library filtered by current job type
- Categorized checklist (scope, conditions, warranty, liability, schedule)
- Check/uncheck to add/remove from quote
- Add custom exclusion text
- Reorder exclusions

#### 10. RiskFlagPanel

**File:** `components/admin/quotes/RiskFlagPanel.tsx`

**Responsibility:** Displays auto-generated risk flags from the rules engine.

- Grouped by severity: critical (red), warning (yellow), info (blue)
- Each flag shows type, description, and resolution status
- "Resolve" button with notes field to mark flags as addressed
- Badge count in wizard navigation shows unresolved flag count

#### 11. VendorQuotePanel

**File:** `components/admin/quotes/VendorQuotePanel.tsx`

**Responsibility:** Manage vendor and subcontractor quotes.

- List pending, received, and accepted vendor quotes
- Add new vendor quote: vendor name (or select from contractors), scope, amount, dates
- Link vendor quote to specific line item
- Upload vendor bid document
- Accept/decline vendor quotes
- Track expiry dates

#### 12. InternalEstimateSummary

**File:** `components/admin/quotes/InternalEstimateSummary.tsx`

**Responsibility:** Full internal view with all breakdowns and flags.

- All 25 cost categories with material / labor / sub / equipment breakdown
- Allowances list
- Exclusions list
- Risk flags panel (inline)
- Missing information warnings
- Pending vendor quotes
- Overhead / profit / contingency / tax breakdown
- Grand total
- Revision notes and history link

#### 13. ClientQuotePreview

**File:** `components/admin/quotes/ClientQuotePreview.tsx`

**Responsibility:** Preview of the client-facing proposal.

- Print-optimized layout (CSS `@media print` styles)
- Company branding header
- Project summary
- Category-level pricing (no line items)
- Allowances labeled
- Exclusions section
- Payment schedule
- Terms and conditions
- Acceptance / signature block
- "Print" button (browser print dialog)
- "Generate PDF" button (stubbed for V1, CSS print used instead)

#### 14. RevisionHistoryPanel

**File:** `components/admin/quotes/RevisionHistoryPanel.tsx`

**Responsibility:** Timeline of quote revisions.

- List of revisions with number, date, changed_by, change_summary
- Click to view snapshot of any revision
- Compare two revisions side-by-side (V2)

### Pages

| Page | Path | Description |
|------|------|-------------|
| Quotes List | `app/admin/quotes/page.tsx` | List all quotes with filters (status, job type, date range, search). Card or table layout. |
| New Quote | `app/admin/quotes/new/page.tsx` | New quote wizard using `EstimateWizard` component. |
| Quote Detail | `app/admin/quotes/[id]/page.tsx` | View and edit existing quote. Uses same `EstimateWizard` in edit mode. |
| Client Proposal | `app/admin/quotes/[id]/proposal/page.tsx` | Client-facing proposal view. Print-ready. Stripped of admin shell for clean printing. |

---

## 11. API Endpoints

All API routes follow the existing pattern under `app/api/admin/`. Each route file exports the relevant HTTP method handlers.

### Quote CRUD

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/admin/quotes` | List quotes with optional filters: `status`, `job_type_slug`, `date_from`, `date_to`, `search` (searches quote_number, client_name, project_name) |
| `POST` | `/api/admin/quotes` | Create a new quote. Accepts: `job_type_slug`, `estimate_stage`, `template_id`, and optional intake fields. Auto-generates `quote_number`. |
| `GET` | `/api/admin/quotes/[id]` | Get full quote with sections, items, exclusions, allowances, risk flags |
| `PATCH` | `/api/admin/quotes/[id]` | Update quote fields. Triggers auto-save revision. |
| `DELETE` | `/api/admin/quotes/[id]` | Soft delete or hard delete quote |

### Quote Sections & Items

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/admin/quotes/[id]/sections` | List sections for a quote |
| `POST` | `/api/admin/quotes/[id]/sections` | Add a cost section |
| `GET` | `/api/admin/quotes/[id]/items` | List all items across all sections |
| `POST` | `/api/admin/quotes/[id]/items` | Add a line item to a section |
| `PATCH` | `/api/admin/quotes/[id]/items/[itemId]` | Update a line item |
| `DELETE` | `/api/admin/quotes/[id]/items/[itemId]` | Remove a line item |

### Engines & Generators

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/admin/quotes/[id]/calculate` | Run the estimate engine: recalculate all line item totals, section subtotals, overhead, profit, contingency, tax, grand total. Updates the `quotes` record with new totals. |
| `POST` | `/api/admin/quotes/[id]/evaluate-rules` | Run the rules engine: evaluate all business rules against current quote state. Creates/updates/removes risk flags. Returns list of flags and any status change recommendations. |
| `POST` | `/api/admin/quotes/[id]/generate-output` | Generate a client-facing proposal. Transforms internal data to client format. Saves to `quote_outputs`. |
| `POST` | `/api/admin/quotes/[id]/create-revision` | Create a revision snapshot. Captures full quote state as JSONB. Increments revision_number. |

### Supporting Resources

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/admin/quotes/[id]/files` | List files attached to quote |
| `POST` | `/api/admin/quotes/[id]/files` | Upload file to quote |
| `GET` | `/api/admin/quotes/[id]/vendor-quotes` | List vendor quotes |
| `POST` | `/api/admin/quotes/[id]/vendor-quotes` | Add vendor quote |
| `PATCH` | `/api/admin/quotes/[id]/vendor-quotes/[vqId]` | Update vendor quote status/amount |
| `GET` | `/api/admin/quotes/[id]/revisions` | List revision history |
| `GET` | `/api/admin/quotes/[id]/revisions/[revId]` | Get specific revision snapshot |

### Reference Data

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/admin/quote-templates` | List templates, optionally filtered by `job_type_slug` |
| `GET` | `/api/admin/exclusion-library` | List exclusion templates, optionally filtered by `job_type_slug` |
| `GET` | `/api/admin/allowance-packages` | List allowance packages, optionally filtered by `job_type_slug` |

---

## 12. MVP Roadmap

### V1 - MVP (Build and Ship)

This is the minimum feature set to replace Blake's spreadsheet estimating workflow.

| Feature | Description | Key Files |
|---------|-------------|-----------|
| Quote CRUD | Create, edit, list, delete quotes | `app/admin/quotes/`, `app/api/admin/quotes/` |
| Job Type Selection | Select from 6 job types, load template | `JobTypeSelector.tsx` |
| Estimate Stage | Select ballpark/detailed/final | `EstimateStageSelector.tsx` |
| Universal Intake | Client info, address, site conditions, scope | `UniversalIntakeForm.tsx` |
| Job-Type Fields | Dynamic fields per job type (all 6) | `DynamicSectionRenderer.tsx` |
| Cost Section Editor | Add/edit line items per cost category | `CostSectionEditor.tsx` |
| Manual Pricing | Enter material, labor, sub, equipment costs per item | `CostSectionEditor.tsx` |
| Basic Allowances | Add allowance items, load from packages | `AllowanceEditor.tsx` |
| Basic Exclusions | Select from library, add custom | `ExclusionsSelector.tsx` |
| Risk Flags | Auto-generated from rules engine on save | `RiskFlagPanel.tsx`, `lib/quotes/rules-engine.ts` |
| Internal Summary | Full cost breakdown with all detail | `InternalEstimateSummary.tsx` |
| Client Quote Output | On-screen, printable proposal | `ClientQuotePreview.tsx` |
| Revision Tracking | Auto-snapshot on save | `RevisionHistoryPanel.tsx`, `lib/quotes/revision-manager.ts` |
| Status Workflow | Draft -> In Progress -> Review -> Sent -> Accepted/Declined | Quote status field |
| Project Link | Link quote to existing project | `quotes.project_id` FK |

### V2 - Next Iteration

| Feature | Description |
|---------|-------------|
| Library Management UI | Admin screens for managing exclusion library and allowance packages |
| Template Management | Create and edit form templates through admin UI |
| PDF Generation | Server-side PDF rendering of client proposals |
| Vendor Quote Workflow | Full workflow: request bid, track status, accept/decline, auto-update line items |
| File Uploads | Photo and document uploads attached to quotes |
| Email Quote | Send proposal link or PDF to client via email |
| Admin-Editable Rules | Move business rules to database with admin editing UI |
| Quote Duplication | Copy an existing quote as starting point for a new one |
| Revision Comparison | Side-by-side diff of two revisions |

### V3 - Future

| Feature | Description |
|---------|-------------|
| Auto-Pricing Rules | Rule-based auto-calculation from form inputs (sqft * $/sqft) |
| AI-Assisted Estimates | Generate estimate line items from scope description using AI |
| Client Portal | Client-facing portal for viewing and accepting quotes |
| Digital Signatures | E-signature integration for quote acceptance |
| Budget Integration | Convert accepted quote sections into budget_line_items for project tracking |
| Historical Pricing | Database of past project costs for reference pricing |
| Win Rate Analytics | Track quote-to-project conversion rates, average markup, etc. |

### V1 Stubs (Present But Minimal)

These features have UI presence in V1 but with minimal implementation, to be expanded in V2:

| Feature | V1 Implementation | V2 Full Implementation |
|---------|-------------------|----------------------|
| **PDF Export** | "Print" button using browser print dialog with CSS `@media print` styles. "Export PDF" button shown but disabled with "Coming Soon" tooltip. | Server-side PDF generation using a library like `@react-pdf/renderer` or headless browser rendering. |
| **Vendor Quote Workflow** | Manual entry of vendor name, amount, and status. No automated request/tracking. | Full workflow with request email, status tracking, expiry alerts, auto-update of line items on acceptance. |
| **Template Editing** | Templates defined as JSON in code (`lib/quotes/templates/`). No admin UI for editing. | Admin UI for creating and editing templates, with field configuration, conditional logic, and preview. |
| **File Uploads** | Reuse existing document upload pattern from projects. Basic file list on quote. | Categorized file management, inline photo preview, drag-and-drop, and file tagging. |

### Where to Avoid Overengineering

| Temptation | Why to Resist | What to Do Instead |
|------------|---------------|-------------------|
| Visual form builder UI | Blake does not need to create job types. There are 6. JSON configs in code are maintainable and version-controlled. | Define templates as TypeScript objects in `lib/quotes/templates/`. Edit in code. |
| Complex approval workflows | Blake is the sole estimator. He does not need multi-step approvals. | Simple status dropdown: draft -> in_progress -> review -> sent -> accepted/declined. |
| Pricing rule admin UI | There are maybe 10-15 rules total. They change rarely. | Define rules as TypeScript in `lib/quotes/rules-engine.ts`. Test with unit tests. |
| Over-normalized database | Job-type-specific fields vary wildly across 6 types. Normalizing each into its own table creates 6+ tables with no reuse. | Use `job_type_inputs` JSONB column. Template config defines what fields exist. Flexible and extensible. |
| PDF rendering engine | Browsers print well. Blake prints quotes from Chrome. | CSS `@media print` styles on the `ClientQuotePreview` component. Add real PDF in V2 if needed. |
| Email template system | Blake sends 2-3 quotes per week. He can paste a link into an email. | Simple "Copy link" button for V1. Add email integration in V2 if volume justifies it. |
| Real-time collaboration | Blake works alone on estimates. | Standard save/load with revision tracking. No WebSocket or conflict resolution needed. |

---

*This document is the authoritative reference for the Quote Builder system. All implementation should follow the patterns, schemas, and decisions documented here. If a decision needs to change during implementation, update this document first.*
