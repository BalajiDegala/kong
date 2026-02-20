# Unified Field System Blueprint

> A single source of truth for how every field in Kong behaves — across tables, headers, info panels, custom pages, and the Fields management page.

### Migration SQL
**File:** `migrations&fixes/generated/2026-02-18-unified-field-system.sql`

Run this migration against your Supabase PostgreSQL instance. It:
- Fixes task deletion (adds missing RLS UPDATE/DELETE policies)
- Creates `computed_field_definitions`, `entity_link_definitions`, `field_groups` tables
- Adds `custom_data` JSONB column to all entity tables
- Adds DB triggers for auto-computing shot cut fields, task duration, version frames
- Seeds all computed field formulas, entity link mappings, and field groups

### Existing Foundation
**File:** `migrations&fixes/generated/2026-02-12-fields-foundation.sql` (already applied)

Provides: `schema_fields`, `schema_field_entities`, `schema_choice_sets`, `schema_choice_set_items`, `schema_field_link_targets`, `schema_change_log`, `schema_field_runtime_v` view, and all SECURITY DEFINER functions for managed schema mutations.

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Architecture Overview](#2-architecture-overview)
3. [Field Type Registry](#3-field-type-registry)
4. [Field Behaviors](#4-field-behaviors)
5. [Computed Fields Engine](#5-computed-fields-engine)
6. [Entity-Linked Fields](#6-entity-linked-fields)
7. [Field Rendering Contexts](#7-field-rendering-contexts)
7b. [My Tasks Page Integration](#7b-my-tasks-page-integration)
8. [Custom Fields Architecture](#8-custom-fields-architecture)
9. [Fields Management Page](#9-fields-management-page)
10. [Shared Utilities](#10-shared-utilities)
11. [Database Schema Requirements](#11-database-schema-requirements)
12. [File Structure](#12-file-structure)
13. [Implementation Phases](#13-implementation-phases)
14. [ShotGrid Reference Map](#14-shotgrid-reference-map)

---

## 1. Problem Statement

### What's broken today

**Duplication everywhere.** The same field rendering, parsing, and option-loading logic is copy-pasted across:
- 4 list pages (shots, assets, sequences, versions) — ~80% duplicated code
- 4 layout pages (detail headers) — ~90% duplicated
- 4 info pages — ~90% duplicated
- Task pages have the most complex version of everything
- **My Tasks page** (`/my-tasks`) — 1,985 lines, the worst offender: ~170 lines of duplicated utilities, ~110 lines of manual entity resolution, ~90 lines of manual option building, ~90 lines of hardcoded column definitions, plus its own inline computed fields and filter system

**No computed fields.** When you update `start_date` and `end_date` on a task, `duration` does NOT auto-calculate. When you update `cut_in` and `cut_out` on a shot, `cut_duration` does NOT auto-calculate. These are just static number fields with no relationship to each other.

**Entity resolution is manual.** Each page independently resolves entity links (loading profile names for `assigned_to`, loading sequence names for `sequence_id`, etc.) with N+1 query patterns. My Tasks is the worst case — it resolves assets, shots, sequences, projects, departments, and profiles in separate batches across 100+ lines of manual code.

**Cross-project views have no abstraction.** My Tasks shows tasks from ALL projects for the current user, but the field system only works within a single project context. The entity resolution, option loading, and column definitions all need to work across project boundaries.

**Dropdown options are hardcoded per entity.** `entity-field-options.ts` has `if (entity === 'task')` branches to decide which dropdowns to load. Adding a new entity or new linked field requires touching this file.

**Custom pages would require starting from scratch.** There's no way to say "render fields for entity X" and get working dropdowns, computed fields, and entity resolution automatically.

**Utility functions are duplicated.** `parseListValue()`, `asText()`, `listToString()`, `normalizeFieldValue()` — identical code appears in 4+ files.

### What this blueprint solves

One system where you say:
```typescript
const fieldDefs = getFieldDefinitions('task')
// Returns everything: type, renderer, editor, options loader, computed logic, validation
```

And it works identically in a table cell, a detail header, an info panel, or a custom page.

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     FIELD TYPE REGISTRY                         │
│  Defines ALL field types: text, number, date, status_list,     │
│  entity, multi_entity, duration, calculated, query, etc.       │
│  Each type has: renderer, editor, validator, parser, formatter  │
└──────────────────────────────┬──────────────────────────────────┘
                               │
┌──────────────────────────────┼──────────────────────────────────┐
│                    FIELD DEFINITION LAYER                       │
│  Per-entity field definitions loaded from schema + runtime DB   │
│  Merges: schema.generated.ts + schema_field_runtime_v + config  │
│  Includes: computed field formulas, entity link targets,        │
│            option sources, edit permissions, display order       │
└──────────────────────────────┬──────────────────────────────────┘
                               │
┌──────────────────────────────┼──────────────────────────────────┐
│                    FIELD OPTIONS RESOLVER                       │
│  Loads dropdown options for ANY field on ANY entity:            │
│  status → statuses table, entity-filtered                      │
│  entity links → target entity table (profiles, departments)    │
│  list fields → choice_set_items table                          │
│  tags → tags table                                             │
└──────────────────────────────┬──────────────────────────────────┘
                               │
┌──────────────────────────────┼──────────────────────────────────┐
│                   COMPUTED FIELDS ENGINE                        │
│  Declarative formulas: duration = end_date - start_date        │
│  Auto-recalculates on dependent field change                   │
│  Client-side + optional DB trigger for persistence             │
└──────────────────────────────┬──────────────────────────────────┘
                               │
┌──────────────────────────────┼──────────────────────────────────┐
│                   RENDERING CONTEXTS                            │
│  Table Cell  │  Header Field  │  Info Panel  │  Custom Page     │
│  Each context calls the same field definition but adapts        │
│  the UI widget (compact cell vs full form vs card layout)       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Field Type Registry

### Location: `src/lib/fields/field-types.ts`

The registry defines **how each data type behaves** regardless of which entity uses it.

### Complete Type Map

| Data Type | DB Type | Editor Widget | Display Widget | Supports Options | Computed | Notes |
|-----------|---------|---------------|----------------|-----------------|----------|-------|
| `text` | `text` | Text input | Plain text | No | No | Default type |
| `text_area` | `text` | Textarea | Multiline text | No | No | For description, notes |
| `number` | `integer` | Number input | Formatted integer | No | Yes | Whole numbers |
| `float` | `double precision` | Number input (step=0.01) | Decimal display | No | Yes | Frame rate, ratio |
| `checkbox` | `boolean` | Checkbox toggle | Check/X icon | No | No | Binary fields |
| `date` | `date` | Date picker | Formatted date | No | Yes | YYYY-MM-DD |
| `date_time` | `timestamptz` | DateTime picker | Relative/absolute | No | No | Timestamps |
| `duration` | `numeric` | Duration input (H:M) | "Xh Ym" or days | No | Yes | Work estimation |
| `percent` | `numeric` | Number input + % | Progress bar | No | Yes | 0-100 range |
| `currency` | `numeric` | Currency input | $X,XXX.XX | No | Yes | Money values |
| `timecode` | `text` | Timecode input | HH:MM:SS:FF | No | Yes | Video timecodes |
| `list` | `text` | Single select dropdown | Badge/text | **Yes** (choice_set) | No | Enumerated values |
| `status_list` | `text` | Status select (colored) | Colored badge | **Yes** (statuses table) | No | Entity-aware statuses |
| `entity` | `uuid/int` | Entity search/select | Link with name | **Yes** (target entity) | No | FK to single record |
| `multi_entity` | `text[]` | Multi-select entity search | Comma links | **Yes** (target entity) | No | M2M relationships |
| `tag_list` | `text[]` | Tag input with autocomplete | Tag badges | **Yes** (tags table) | No | Comma-separated tags |
| `image` | `text` | Image upload | Thumbnail | No | No | URL to image |
| `url` | `text` | URL input | Clickable link | No | No | Web URLs |
| `color` | `text` | Color picker | Color swatch | No | No | Hex color code |
| `serializable` | `jsonb` | JSON editor | Formatted JSON | No | No | Complex data |
| `calculated` | (virtual) | **Read-only** | Computed display | No | **Yes** | Formula-based |
| `query` | (virtual) | **Read-only** | Aggregated value | No | **Yes** | Cross-entity query |
| `summary` | (virtual) | **Read-only** | Count/sum badge | No | **Yes** | Aggregation |

### Type Definition Interface

```typescript
// src/lib/fields/field-types.ts

export interface FieldTypeDefinition {
  /** Unique type identifier */
  type: FieldDataType

  /** Human-readable label */
  label: string

  /** PostgreSQL column type (null for virtual types) */
  pgType: string | null

  /** Can this field be edited by users? */
  editable: boolean

  /** Can this field participate in computed formulas? */
  computable: boolean

  /** Does this field need external options loaded? */
  needsOptions: boolean

  /** How to parse raw DB/form value into typed value */
  parse: (raw: unknown) => FieldValue

  /** How to format typed value for display */
  format: (value: FieldValue, options?: FormatOptions) => string

  /** How to serialize typed value for DB write */
  serialize: (value: FieldValue) => unknown

  /** Validation function */
  validate: (value: FieldValue, constraints?: FieldConstraints) => ValidationResult

  /** Default value for new records */
  defaultValue: FieldValue | null

  /** Sort comparator for table sorting */
  compare: (a: FieldValue, b: FieldValue) => number
}
```

### Example: Duration Type

```typescript
export const durationType: FieldTypeDefinition = {
  type: 'duration',
  label: 'Duration',
  pgType: 'numeric',
  editable: true,
  computable: true,
  needsOptions: false,

  parse(raw: unknown): number | null {
    if (raw == null || raw === '') return null
    const num = Number(raw)
    return Number.isFinite(num) ? num : null
  },

  format(value: number | null, options?: FormatOptions): string {
    if (value == null) return ''
    const unit = options?.durationUnit ?? 'hours'
    if (unit === 'days') return `${(value / 8).toFixed(1)}d`
    if (unit === 'minutes') return `${Math.round(value * 60)}m`
    const hours = Math.floor(value)
    const minutes = Math.round((value - hours) * 60)
    if (minutes === 0) return `${hours}h`
    return `${hours}h ${minutes}m`
  },

  serialize(value: number | null): number | null {
    return value
  },

  validate(value: number | null): ValidationResult {
    if (value != null && value < 0) return { valid: false, error: 'Duration cannot be negative' }
    return { valid: true }
  },

  defaultValue: null,

  compare(a: number | null, b: number | null): number {
    if (a == null && b == null) return 0
    if (a == null) return -1
    if (b == null) return 1
    return a - b
  },
}
```

---

## 4. Field Behaviors

### Location: `src/lib/fields/field-behaviors.ts`

Field behaviors define **per-entity, per-field** configuration that sits on top of the type registry.

```typescript
export interface FieldBehavior {
  /** Field code (column name) */
  code: string

  /** Display name */
  label: string

  /** Data type from registry */
  dataType: FieldDataType

  /** Field category */
  fieldType: 'permanent' | 'dynamic' | 'system_owned' | 'custom'

  /** Database column name (null for virtual/computed) */
  column: string | null

  /** Is this field editable in this entity context? */
  editable: boolean

  /** Read-only override (system fields like created_at) */
  readonly: boolean

  /** Option source configuration (for dropdowns) */
  optionSource?: OptionSourceConfig

  /** Computed field formula (if calculated) */
  formula?: ComputedFieldFormula

  /** Display order (lower = shown first) */
  displayOrder: number

  /** Default width in table view */
  defaultWidth: string

  /** Is this field visible by default? */
  visibleByDefault: boolean

  /** Custom format options */
  formatOptions?: FormatOptions

  /** Validation constraints */
  constraints?: FieldConstraints
}

export interface OptionSourceConfig {
  /** Source type */
  type: 'choice_set' | 'entity_table' | 'status_table' | 'tags_table'

  /** For choice_set: the choice_set_id */
  choiceSetId?: number

  /** For entity_table: which table to query */
  entityTable?: string

  /** For entity_table: which columns to select for value/label */
  valueColumn?: string
  labelColumn?: string

  /** For entity_table: optional filter */
  filter?: Record<string, unknown>

  /** For status_table: entity type filter */
  statusEntityType?: string

  /** Allow multiple selections? */
  multi?: boolean
}
```

### Entity Field Definitions

Instead of hardcoded column arrays in each page, field definitions are loaded once per entity:

```typescript
// src/lib/fields/entity-fields.ts

export async function getFieldDefinitions(
  entity: EntityKey,
  supabase: SupabaseClient
): Promise<FieldBehavior[]> {
  // 1. Load base schema definitions
  const schema = getEntitySchema(entity)

  // 2. Load runtime field metadata (active fields, display order, choice sets)
  const runtimeFields = await loadRuntimeFields(supabase, entity)

  // 3. Load computed field formulas
  const computedFormulas = getComputedFormulas(entity)

  // 4. Merge into unified field behaviors
  return mergeFieldDefinitions(schema, runtimeFields, computedFormulas)
}
```

---

## 5. Computed Fields Engine

### Location: `src/lib/fields/computed-fields.ts`

### Design Philosophy

Following ShotGrid's approach: **simple, declarative, same-entity only**. Complex cross-entity logic uses server-side triggers (Supabase functions).

### Formula Types

```typescript
export type ComputedFieldFormula =
  | ArithmeticFormula   // duration = end_date - start_date
  | DateDiffFormula     // days_remaining = due_date - TODAY()
  | FrameFormula        // cut_duration = cut_out - cut_in + 1
  | ConditionalFormula  // status_label = IF(status == 'done', 'Complete', status)
  | ConcatFormula       // display_name = CONCAT(code, ' - ', name)

export interface ArithmeticFormula {
  type: 'arithmetic'
  /** Fields this formula depends on */
  dependsOn: string[]
  /** The calculation function */
  calculate: (row: Record<string, unknown>) => FieldValue
  /** Result data type */
  resultType: FieldDataType
}
```

### Registered Computed Fields

#### Task Entity

| Field | Formula | Depends On | Result Type |
|-------|---------|-----------|-------------|
| `duration` | `end_date - start_date` (in working days) | `start_date`, `end_date` | `duration` |
| `days_remaining` | `due_date - TODAY()` | `due_date` | `number` |
| `days_overdue` | `IF(due_date < TODAY(), TODAY() - due_date, 0)` | `due_date` | `number` |
| `is_overdue` | `due_date < TODAY() AND status != 'fin'` | `due_date`, `status` | `checkbox` |
| `my_tasks_bucket` | Categorizes by status keywords (done/upcoming/active) | `status` | `list` |
| `entity_link_label` | Resolves linked entity code + name | `entity_type`, `entity_id` | `text` |

#### Shot Entity

| Field | Formula | Depends On | Result Type |
|-------|---------|-----------|-------------|
| `cut_duration` | `cut_out - cut_in + 1` | `cut_in`, `cut_out` | `number` |
| `head_duration` | `cut_in - head_in` | `head_in`, `cut_in` | `number` |
| `tail_duration` | `tail_out - cut_out` | `cut_out`, `tail_out` | `number` |
| `working_duration` | `tail_out - head_in + 1` | `head_in`, `tail_out` | `number` |
| `frame_count` | `tail_out - head_in + 1` | `head_in`, `tail_out` | `number` |
| `frame_summary` | Human-readable summary string | `head_in`, `cut_in`, `cut_out`, `tail_out` | `text` |

```
Frame range layout:
|--- head_duration ---|-------- cut_duration --------|--- tail_duration ---|
head_in          cut_in                          cut_out             tail_out
|<---------------------- working_duration ------------------------------>|
```

#### Version Entity

| Field | Formula | Depends On | Result Type |
|-------|---------|-----------|-------------|
| `frame_count` | `last_frame - first_frame + 1` | `first_frame`, `last_frame` | `number` |
| `duration_seconds` | `frame_count / frame_rate` | `frame_count`, `frame_rate` | `float` |

### Implementation

```typescript
// src/lib/fields/computed-fields.ts

const COMPUTED_FIELDS: Record<string, Record<string, ComputedFieldFormula>> = {
  task: {
    duration: {
      type: 'arithmetic',
      dependsOn: ['start_date', 'end_date'],
      resultType: 'duration',
      calculate(row) {
        const start = row.start_date as string | null
        const end = row.end_date as string | null
        if (!start || !end) return null
        const startDate = new Date(start)
        const endDate = new Date(end)
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return null
        return workingDaysBetween(startDate, endDate)
      },
    },
  },

  shot: {
    cut_duration: {
      type: 'arithmetic',
      dependsOn: ['cut_in', 'cut_out'],
      resultType: 'number',
      calculate(row) {
        const cutIn = Number(row.cut_in)
        const cutOut = Number(row.cut_out)
        if (!Number.isFinite(cutIn) || !Number.isFinite(cutOut)) return null
        return cutOut - cutIn + 1
      },
    },
    head_duration: {
      type: 'arithmetic',
      dependsOn: ['head_in', 'cut_in'],
      resultType: 'number',
      calculate(row) {
        const headIn = Number(row.head_in)
        const cutIn = Number(row.cut_in)
        if (!Number.isFinite(headIn) || !Number.isFinite(cutIn)) return null
        return cutIn - headIn
      },
    },
    tail_duration: {
      type: 'arithmetic',
      dependsOn: ['cut_out', 'tail_out'],
      resultType: 'number',
      calculate(row) {
        const cutOut = Number(row.cut_out)
        const tailOut = Number(row.tail_out)
        if (!Number.isFinite(cutOut) || !Number.isFinite(tailOut)) return null
        return tailOut - cutOut
      },
    },
    working_duration: {
      type: 'arithmetic',
      dependsOn: ['head_in', 'tail_out'],
      resultType: 'number',
      calculate(row) {
        const headIn = Number(row.head_in)
        const tailOut = Number(row.tail_out)
        if (!Number.isFinite(headIn) || !Number.isFinite(tailOut)) return null
        return tailOut - headIn + 1
      },
    },
    frame_summary: {
      type: 'arithmetic',
      dependsOn: ['head_in', 'cut_in', 'cut_out', 'tail_out'],
      resultType: 'text',
      calculate(row) {
        const headIn = Number(row.head_in)
        const cutIn = Number(row.cut_in)
        const cutOut = Number(row.cut_out)
        const tailOut = Number(row.tail_out)
        if ([headIn, cutIn, cutOut, tailOut].some(n => !Number.isFinite(n))) return null
        const cutDur = cutOut - cutIn + 1
        const headDur = cutIn - headIn
        const tailDur = tailOut - cutOut
        const workDur = tailOut - headIn + 1
        return `Cut: ${cutDur}f | Head: ${headDur}f | Tail: ${tailDur}f | Working: ${workDur}f`
      },
    },
  },
}

/**
 * When a field changes, recalculate all dependent computed fields.
 * Returns the patch object of computed values to apply.
 */
export function recalculateComputedFields(
  entity: string,
  changedField: string,
  row: Record<string, unknown>
): Record<string, FieldValue> {
  const entityFormulas = COMPUTED_FIELDS[entity]
  if (!entityFormulas) return {}

  const patch: Record<string, FieldValue> = {}

  for (const [fieldCode, formula] of Object.entries(entityFormulas)) {
    if (formula.dependsOn.includes(changedField)) {
      patch[fieldCode] = formula.calculate(row)
    }
  }

  return patch
}
```

### Integration with Cell Updates

When ANY field is updated (table cell, header, info panel), the update handler calls:

```typescript
async function handleFieldUpdate(entity: string, row: Record<string, unknown>, field: string, value: unknown) {
  // 1. Build the primary update payload
  const payload: Record<string, unknown> = { [field]: value }

  // 2. Merge the new value into the row for computation
  const updatedRow = { ...row, [field]: value }

  // 3. Calculate dependent computed fields
  const computed = recalculateComputedFields(entity, field, updatedRow)

  // 4. Merge computed fields into payload (only persistable ones)
  for (const [key, val] of Object.entries(computed)) {
    const fieldDef = getFieldBehavior(entity, key)
    if (fieldDef?.column) {
      // Persisted computed field — save to DB
      payload[key] = val
    }
    // Virtual computed fields are just re-displayed, not saved
  }

  // 5. Call the update action
  await updateEntity(entity, row.id, payload)

  // 6. Return full patch for optimistic UI update
  return { ...payload, ...computed }
}
```

---

## 6. Entity-Linked Fields

### Location: `src/lib/fields/entity-resolver.ts`

### The Problem

Currently, each page manually resolves entity references:
```typescript
// Duplicated in every page that shows task assignments:
const { data: profiles } = await supabase.from('profiles').select('id, display_name, full_name')
const assigneeName = profiles.find(p => p.id === task.assigned_to)?.display_name
```

### The Solution: Entity Link Registry

```typescript
// src/lib/fields/entity-links.ts

export interface EntityLinkConfig {
  /** Target table name */
  table: string

  /** Column for the FK value (usually 'id') */
  valueColumn: string

  /** Columns to select for display */
  displayColumns: string[]

  /** How to build the display label from selected columns */
  formatLabel: (record: Record<string, unknown>) => string

  /** Optional: additional filter when loading options */
  defaultFilter?: Record<string, unknown>

  /** Does this support search/autocomplete? */
  searchable: boolean

  /** Search column for autocomplete */
  searchColumn?: string
}

export const ENTITY_LINK_REGISTRY: Record<string, EntityLinkConfig> = {
  // People/profiles
  profile: {
    table: 'profiles',
    valueColumn: 'id',
    displayColumns: ['id', 'display_name', 'full_name', 'email', 'avatar_url'],
    formatLabel: (r) => String(r.display_name || r.full_name || r.email || 'Unknown'),
    searchable: true,
    searchColumn: 'display_name',
  },

  // Departments
  department: {
    table: 'departments',
    valueColumn: 'id',
    displayColumns: ['id', 'name', 'code'],
    formatLabel: (r) => String(r.name || r.code || 'Unknown'),
    searchable: true,
    searchColumn: 'name',
  },

  // Pipeline Steps
  pipeline_step: {
    table: 'pipeline_steps',
    valueColumn: 'id',
    displayColumns: ['id', 'name', 'code', 'department_id'],
    formatLabel: (r) => String(r.name || r.code || 'Unknown'),
    searchable: true,
    searchColumn: 'name',
  },

  // Projects
  project: {
    table: 'projects',
    valueColumn: 'id',
    displayColumns: ['id', 'name', 'code'],
    formatLabel: (r) => r.code ? `${r.code} - ${r.name}` : String(r.name || 'Unknown'),
    searchable: true,
    searchColumn: 'name',
  },

  // Assets
  asset: {
    table: 'assets',
    valueColumn: 'id',
    displayColumns: ['id', 'name', 'code', 'asset_type'],
    formatLabel: (r) => r.code ? `${r.code} - ${r.name}` : String(r.name || 'Unknown'),
    searchable: true,
    searchColumn: 'name',
  },

  // Sequences
  sequence: {
    table: 'sequences',
    valueColumn: 'id',
    displayColumns: ['id', 'name', 'code'],
    formatLabel: (r) => r.code ? `${r.code} - ${r.name}` : String(r.name || 'Unknown'),
    searchable: true,
    searchColumn: 'name',
  },

  // Shots
  shot: {
    table: 'shots',
    valueColumn: 'id',
    displayColumns: ['id', 'name', 'code', 'sequence_id'],
    formatLabel: (r) => r.code ? `${r.code} - ${r.name}` : String(r.name || 'Unknown'),
    searchable: true,
    searchColumn: 'name',
  },

  // Tasks
  task: {
    table: 'tasks',
    valueColumn: 'id',
    displayColumns: ['id', 'name', 'cached_display_name'],
    formatLabel: (r) => String(r.cached_display_name || r.name || 'Unknown'),
    searchable: true,
    searchColumn: 'name',
  },

  // Versions
  version: {
    table: 'versions',
    valueColumn: 'id',
    displayColumns: ['id', 'code', 'version_number'],
    formatLabel: (r) => r.code ? `${r.code} v${r.version_number}` : `v${r.version_number}`,
    searchable: true,
    searchColumn: 'code',
  },
}
```

### Field-to-Entity Link Mapping

Each entity field that references another entity declares its link target:

```typescript
// src/lib/fields/field-entity-map.ts

/**
 * Maps field codes to their entity link targets.
 * This replaces the hardcoded if/else chains in entity-field-options.ts.
 */
export const FIELD_ENTITY_MAP: Record<string, Record<string, string>> = {
  // Task fields
  task: {
    assigned_to: 'profile',
    reviewer: 'profile',
    ayon_assignees: 'profile',
    cc: 'profile',
    created_by: 'profile',
    updated_by: 'profile',
    client_approved_by: 'profile',
    step_id: 'pipeline_step',
    department: 'department',
    project_id: 'project',
    entity_id: 'auto',  // Resolved from entity_type column
  },

  // Shot fields
  shot: {
    sequence_id: 'sequence',
    created_by: 'profile',
    updated_by: 'profile',
    project_id: 'project',
    assigned_to: 'profile',
  },

  // Asset fields
  asset: {
    created_by: 'profile',
    updated_by: 'profile',
    project_id: 'project',
    assigned_to: 'profile',
  },

  // Sequence fields
  sequence: {
    created_by: 'profile',
    updated_by: 'profile',
    project_id: 'project',
  },

  // Version fields
  version: {
    artist: 'profile',
    created_by: 'profile',
    updated_by: 'profile',
    project_id: 'project',
    task_id: 'task',
    entity_id: 'auto',
    department: 'department',
  },

  // Note fields
  note: {
    created_by: 'profile',
    entity_id: 'auto',
    task_id: 'task',
  },

  // Published File fields
  published_file: {
    created_by: 'profile',
    project_id: 'project',
    task_id: 'task',
    version_id: 'version',
    entity_id: 'auto',
  },
}
```

### Universal Options Loader

Replaces the hardcoded `loadEntityFieldOptionMap()`:

```typescript
// src/lib/fields/options-loader.ts

export async function loadFieldOptions(
  supabase: SupabaseClient,
  entity: string,
  fieldCode: string,
  fieldBehavior: FieldBehavior
): Promise<FieldOption[]> {
  const optionSource = fieldBehavior.optionSource
  if (!optionSource) return []

  switch (optionSource.type) {
    case 'status_table': {
      const { data } = await supabase
        .from('statuses')
        .select('name, color, sort_order')
        .order('sort_order')
      // Filter by entity type if applicable
      return (data || []).map(s => ({
        value: s.name,
        label: s.name,
        color: s.color,
      }))
    }

    case 'tags_table': {
      const { data } = await supabase
        .from('tags')
        .select('name')
        .order('name')
      return (data || []).map(t => ({ value: t.name, label: t.name }))
    }

    case 'choice_set': {
      if (!optionSource.choiceSetId) return []
      const { data } = await supabase
        .from('choice_set_items')
        .select('value, label, color, sort_order')
        .eq('choice_set_id', optionSource.choiceSetId)
        .eq('is_active', true)
        .order('sort_order')
      return (data || []).map(i => ({
        value: i.value,
        label: i.label || i.value,
        color: i.color,
      }))
    }

    case 'entity_table': {
      const linkTarget = FIELD_ENTITY_MAP[entity]?.[fieldCode]
      if (!linkTarget || linkTarget === 'auto') return []

      const linkConfig = ENTITY_LINK_REGISTRY[linkTarget]
      if (!linkConfig) return []

      const { data } = await supabase
        .from(linkConfig.table)
        .select(linkConfig.displayColumns.join(', '))
        .order(linkConfig.displayColumns[1] || linkConfig.valueColumn)

      return (data || []).map(record => ({
        value: String(record[linkConfig.valueColumn]),
        label: linkConfig.formatLabel(record),
      }))
    }

    default:
      return []
  }
}

/**
 * Load ALL field options for an entity at once.
 * Replaces loadEntityFieldOptionMap() with a generic version.
 */
export async function loadAllFieldOptions(
  supabase: SupabaseClient,
  entity: string,
  fieldBehaviors: FieldBehavior[]
): Promise<Record<string, FieldOption[]>> {
  const fieldsNeedingOptions = fieldBehaviors.filter(f => f.optionSource)

  const results = await Promise.all(
    fieldsNeedingOptions.map(async (field) => {
      const options = await loadFieldOptions(supabase, entity, field.code, field)
      return [field.code, options] as const
    })
  )

  return Object.fromEntries(results)
}
```

### Entity Resolver (Batch)

For resolving entity names from IDs (used in table display):

```typescript
// src/lib/fields/entity-resolver.ts

export async function resolveEntityLinks(
  supabase: SupabaseClient,
  entity: string,
  rows: Record<string, unknown>[],
  fieldBehaviors: FieldBehavior[]
): Promise<Map<string, Map<string, string>>> {
  // Returns: Map<fieldCode, Map<entityId, displayLabel>>

  const resolutionMap = new Map<string, Map<string, string>>()
  const entityFields = fieldBehaviors.filter(f =>
    f.dataType === 'entity' || f.dataType === 'multi_entity'
  )

  for (const field of entityFields) {
    const linkTarget = FIELD_ENTITY_MAP[entity]?.[field.code]
    if (!linkTarget || linkTarget === 'auto') continue

    const linkConfig = ENTITY_LINK_REGISTRY[linkTarget]
    if (!linkConfig) continue

    // Collect all unique IDs for this field across all rows
    const ids = new Set<string>()
    for (const row of rows) {
      const value = row[field.code]
      if (field.dataType === 'multi_entity') {
        const arr = parseTextArray(value)
        arr.forEach(id => ids.add(id))
      } else if (value != null) {
        ids.add(String(value))
      }
    }

    if (ids.size === 0) continue

    // Batch query
    const { data } = await supabase
      .from(linkConfig.table)
      .select(linkConfig.displayColumns.join(', '))
      .in(linkConfig.valueColumn, Array.from(ids))

    const labelMap = new Map<string, string>()
    for (const record of data || []) {
      const id = String(record[linkConfig.valueColumn])
      labelMap.set(id, linkConfig.formatLabel(record))
    }

    resolutionMap.set(field.code, labelMap)
  }

  return resolutionMap
}
```

---

## 7. Field Rendering Contexts

### Location: `src/lib/fields/field-renderers.ts`

Each context (table, header, info, custom page) uses the same field definitions but adapts the UI.

### Context Adapter Pattern

```typescript
// src/lib/fields/context-adapters.ts

export type RenderContext = 'table' | 'header' | 'info' | 'form' | 'card' | 'queue' | 'detail_context'

/**
 * Convert unified FieldBehavior to context-specific column/field config.
 */
export function toTableColumn(field: FieldBehavior, options?: FieldOption[]): TableColumn {
  return {
    id: field.code,
    label: field.label,
    type: mapDataTypeToTableType(field.dataType),
    width: field.defaultWidth,
    editable: field.editable && !field.readonly,
    editor: mapDataTypeToEditor(field.dataType),
    options: options?.map(o => ({ value: o.value, label: o.label })),
    formatValue: (value) => {
      const typeDef = getFieldType(field.dataType)
      return typeDef.format(typeDef.parse(value), field.formatOptions)
    },
  }
}

export function toHeaderField(
  field: FieldBehavior,
  value: unknown,
  options?: FieldOption[]
): HeaderFieldValue {
  return {
    id: field.code,
    label: field.label,
    type: mapDataTypeToHeaderType(field.dataType),
    value: getFieldType(field.dataType).parse(value),
    editable: field.editable && !field.readonly,
    column: field.column,
    options: options?.map(o => ({ value: o.value, label: o.label })),
  }
}

export function toInfoField(
  field: FieldBehavior,
  value: unknown,
  options?: FieldOption[]
): HeaderFieldValue {
  // Info panel shows all fields with full details
  const headerField = toHeaderField(field, value, options)
  // Detect textarea candidates
  if (field.dataType === 'text' && isLongTextColumn(field.code)) {
    headerField.type = 'textarea'
  }
  return headerField
}
```

### Data Type Mapping Tables

```typescript
function mapDataTypeToTableType(dataType: FieldDataType): string {
  const map: Record<string, string> = {
    text: 'text',
    text_area: 'textarea',
    number: 'number',
    float: 'number',
    checkbox: 'boolean',
    date: 'date',
    date_time: 'datetime',
    duration: 'number',      // Rendered with custom formatter
    percent: 'number',       // Rendered with custom formatter
    currency: 'number',      // Rendered with custom formatter
    list: 'select',
    status_list: 'status',
    entity: 'link',
    multi_entity: 'links',
    tag_list: 'links',
    image: 'thumbnail',
    url: 'url',
    color: 'color',
    calculated: 'text',      // Read-only display
    query: 'text',           // Read-only display
    summary: 'text',         // Read-only display
  }
  return map[dataType] || 'text'
}

function mapDataTypeToEditor(dataType: FieldDataType): string | undefined {
  const map: Record<string, string> = {
    text: 'text',
    text_area: 'textarea',
    number: 'number',
    float: 'number',
    checkbox: 'checkbox',
    date: 'date',
    date_time: 'datetime',
    duration: 'number',
    percent: 'number',
    currency: 'number',
    list: 'select',
    status_list: 'select',
    entity: 'select',
    multi_entity: 'multiselect',
    tag_list: 'multiselect',
    url: 'url',
    color: 'color',
  }
  return map[dataType]
}
```

---

## 7b. My Tasks Page Integration

### Why My Tasks is special

My Tasks (`/my-tasks/page.tsx`) is the **most complex consumer** of the field system because it:

1. **Works cross-project** — shows tasks from ALL projects for the current user, not scoped to one project
2. **Resolves 4+ entity types** — each task links to an asset, shot, or sequence, plus project, department, and user profile
3. **Has its own computed fields** — `my_tasks_bucket` (active/upcoming/done), `entity_link_label`, `department_label`, `assignee_name`
4. **Uses a unique two-pane layout** — left queue (grouped by date buckets) + right detail context
5. **Has its own filter/sort/search system** — with saved filters in `user_task_filters` table
6. **Shows sub-entity detail tabs** — tasks, notes, versions, publishes, assets, activity, history for the selected entity

### Current duplication in My Tasks (1,985 lines)

| Concern | Lines | What the unified system replaces |
|---------|-------|----------------------------------|
| Utility functions (`asText`, `toIdKey`, etc.) | ~170 | `src/lib/fields/utils.ts` |
| Entity resolution (assets/shots/sequences by ID) | ~110 | `resolveEntityLinks()` from `entity-resolver.ts` |
| Option building (status/department/assignee options) | ~90 | `loadAllFieldOptions()` from `options-loader.ts` |
| Task column definitions | ~90 | `toTableColumn()` from `context-adapters.ts` |
| Detail table columns (versions/publishes/assets) | ~60 | `getFieldDefinitions()` per entity type |
| Cell update handler with inline computed logic | ~55 | `handleFieldUpdate()` from `field-update-handler.ts` |
| Date grouping/bucketing logic | ~80 | Stays in `my-tasks-utils.ts` (view-specific) |
| Filter state management | ~120 | Stays in My Tasks (page-specific concern) |

**~575 lines** can be eliminated by the unified field system. The remaining ~1,400 lines are page-specific layout, filter UI, and detail tab loading that legitimately belong in My Tasks.

### My Tasks-specific computed fields

```typescript
// Added to COMPUTED_FIELDS['task'] in computed-fields.ts

my_tasks_bucket: {
  type: 'conditional',
  dependsOn: ['status'],
  resultType: 'list',
  calculate(row) {
    return getMyTasksBucket(row.status)  // 'active' | 'upcoming' | 'done'
  },
},

entity_link_label: {
  type: 'concat',
  dependsOn: ['entity_code', 'entity_name'],
  resultType: 'text',
  calculate(row) {
    const code = asText(row.entity_code).trim()
    const name = asText(row.entity_name).trim()
    if (code && name) return `${code} - ${name}`
    return code || name || '-'
  },
},
```

### Cross-project entity resolution

The universal `resolveEntityLinks()` needs to support cross-project batch resolution:

```typescript
// In entity-resolver.ts, the My Tasks page will call:

// 1. Load tasks assigned to current user (all projects)
const tasks = await supabase
  .from('tasks')
  .select('*, step:steps(...), project:projects(...)')
  .eq('assigned_to', user.id)

// 2. Batch-resolve linked entities across all projects
const resolutionMap = await resolveEntityLinks(
  supabase,
  'task',
  tasks,
  fieldBehaviors,
  { crossProject: true }  // New option: don't filter by project_id
)

// 3. The resolution map now contains:
//    - 'assigned_to' → Map<userId, displayName>
//    - 'entity_id' → Map<entityId, {name, code, status, thumbnail_url}>
//    - 'project_id' → Map<projectId, {name, code}>
//    - 'department' → Map<departmentId, {name, code}>
```

### My Tasks rendering contexts

Two new contexts specific to My Tasks:

```typescript
// Left queue item — compact task card
export function toQueueItem(
  task: Record<string, unknown>,
  fieldBehaviors: FieldBehavior[],
  resolutionMap: EntityResolutionMap
): QueueItemData {
  return {
    id: Number(task.id),
    title: resolveLabel(task, 'entity_code', 'entity_name', resolutionMap),
    subtitle: asText(task.name),
    projectLabel: resolveLabel(task, 'project_id', null, resolutionMap),
    departmentLabel: resolveLabel(task, 'department', null, resolutionMap),
    thumbnail: asText(task.entity_thumbnail_url),
    dueDate: task.due_date,
    bucket: getMyTasksBucket(task.status),
  }
}

// Right context header — entity detail summary
export function toDetailContext(
  task: Record<string, unknown>,
  fieldBehaviors: FieldBehavior[],
  resolutionMap: EntityResolutionMap
): DetailContextData {
  // Uses toHeaderField() internally for the metadata grid
  const headerFields = fieldBehaviors
    .filter(f => MY_TASKS_CONTEXT_FIELDS.includes(f.code))
    .map(f => toHeaderField(f, task[f.code], resolutionMap.get(f.code)))
  return {
    entityTitle: resolveLabel(task, 'entity_code', 'entity_name', resolutionMap),
    statusLabel: asText(task.entity_status || task.status),
    description: asText(task.entity_description) || `Task: ${asText(task.name)}`,
    thumbnail: asText(task.entity_thumbnail_url),
    headerFields,
  }
}
```

### My Tasks fields configuration

The following fields are used in My Tasks with specific rendering needs:

```typescript
const MY_TASKS_TABLE_FIELDS = [
  'name',            // Task name (link to /apex/{project}/tasks/{id})
  'project_label',   // Resolved project code/name (cross-project)
  'entity_link_label', // Resolved linked entity (computed)
  'department',      // Pipeline step (editable select)
  'status',          // Task status (editable status select)
  'priority',        // Priority level (editable select)
  'assigned_to',     // Assignee (editable entity select)
  'due_date',        // Due date (editable date)
  'start_date',      // Start date (editable date)
  'end_date',        // End date (editable date)
  'updated_at',      // Last updated (readonly datetime)
]

const MY_TASKS_CONTEXT_FIELDS = [
  'name', 'department_label', 'assignee_name',
  'due_date', 'start_date', 'end_date',
  'entity_sequence_label', 'updated_at',
]

const MY_TASKS_QUEUE_FIELDS = [
  'entity_code', 'entity_name', 'name',
  'project_label', 'department_label', 'due_date',
  'entity_thumbnail_url', 'status',
]
```

### My Tasks filter integration

The filter/saved filter system remains page-specific (it's a complex UI concern, not a field concern), but filter **options** come from the unified system:

```typescript
// Instead of manually building filter options:
const filterSections = buildFilterSections(
  visibleTasks,
  fieldBehaviors,
  fieldOptions,  // From loadAllFieldOptions()
  {
    status: { label: 'Status' },
    pipeline_step: { label: 'Pipeline Step', fieldCode: 'department_label' },
    assigned_to: { label: 'Assigned To', fieldCode: 'assignee_name' },
    link: { label: 'Link', fieldCode: 'entity_link_label' },
    start_date: { label: 'Start Date', type: 'date_bucket' },
    end_date: { label: 'End Date', type: 'date_bucket' },
    due_date: { label: 'Due Date', type: 'date_bucket' },
  }
)
```

### Target: Simplified My Tasks page

After the unified field system is applied, My Tasks should shrink from ~1,985 lines to ~800-900 lines:

```typescript
// Simplified loadMyTasks() — from ~280 lines to ~50 lines
const loadMyTasks = useCallback(async () => {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.id) return

  // 1. Load tasks
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*, step:steps(...), project:projects(...)')
    .eq('assigned_to', user.id)

  // 2. Load field definitions + options (unified system)
  const fieldBehaviors = await getFieldDefinitions('task', supabase)
  const fieldOptions = await loadAllFieldOptions(supabase, 'task', fieldBehaviors)

  // 3. Resolve entity links (unified system — handles all entity types)
  const resolutionMap = await resolveEntityLinks(
    supabase, 'task', tasks, fieldBehaviors, { crossProject: true }
  )

  // 4. Enrich rows with resolved labels + computed fields
  const enrichedTasks = tasks.map(task =>
    enrichRow('task', task, fieldBehaviors, resolutionMap)
  )

  setTasks(enrichedTasks)
  setFieldBehaviors(fieldBehaviors)
  setFieldOptions(fieldOptions)
}, [])
```

---

## 8. Custom Fields Architecture

### How Custom Fields Work

Custom fields created in the Fields page integrate seamlessly because:

1. **They use the same schema_fields table** — the Fields page writes to `schema_fields` and `schema_field_entity_mapping`
2. **The runtime view exposes them** — `schema_field_runtime_v` includes custom fields with their choice sets
3. **`getFieldDefinitions()` loads them automatically** — no code change needed per custom field
4. **The type registry handles rendering** — if a custom field has `data_type: 'list'`, it gets the list renderer

### Custom Field Creation Flow

```
User creates field in Fields page
  ↓
Fields page calls createSchemaField() server action
  ↓
Server action inserts into schema_fields + schema_field_entity_mapping
  ↓
Optionally creates/links a choice_set for list types
  ↓
schema_field_runtime_v view automatically includes the new field
  ↓
Next time any entity page loads, getFieldDefinitions() picks it up
  ↓
Field appears in tables, headers, info panels with correct type
```

### Custom Field Data Storage

Custom fields need database columns. Two approaches:

**Approach A: JSONB column (recommended for v1)**
Each entity table has a `custom_data jsonb DEFAULT '{}'` column. Custom fields read/write to keys in this column:
```sql
-- Reading custom field "priority_override" on task
SELECT custom_data->>'priority_override' FROM tasks WHERE id = $1;

-- Writing custom field
UPDATE tasks SET custom_data = custom_data || '{"priority_override": "high"}' WHERE id = $1;
```

**Approach B: Dynamic DDL (future)**
Actually create PostgreSQL columns via server action:
```sql
ALTER TABLE tasks ADD COLUMN sg_priority_override text;
```
This is more powerful but requires admin permissions and migration management.

### Custom Field in the Unified System

```typescript
// When getFieldDefinitions loads a custom field from runtime view:
{
  code: 'sg_priority_override',
  label: 'Priority Override',
  dataType: 'list',
  fieldType: 'custom',
  column: null,  // Stored in custom_data JSONB
  customDataKey: 'sg_priority_override',  // Key in the JSONB column
  editable: true,
  readonly: false,
  optionSource: {
    type: 'choice_set',
    choiceSetId: 42,
  },
  displayOrder: 1500,
  defaultWidth: '130px',
  visibleByDefault: true,
}
```

---

## 9. Fields Management Page

### Current State

The Fields page (`/fields`) works but is disconnected from the rendering system:
- Creates fields in `schema_fields` table
- Manages choice sets
- Attaches fields to entities
- But field configuration doesn't flow into how pages render fields

### Enhanced Fields Page Capabilities

#### 9.1 Field Configuration Panel

When editing a field, expose:

```
┌──────────────────────────────────────────────────────────────┐
│ Edit Field: Cut In                                           │
├──────────────────────────────────────────────────────────────┤
│ Name:        [Cut In          ]                              │
│ Code:        cut_in (readonly)                               │
│ Data Type:   [Number ▾]                                      │
│ Field Type:  [Permanent ▾]                                   │
│                                                              │
│ ─── Display Settings ───                                     │
│ Default Width:  [100px]                                      │
│ Format:         [Integer ▾] (Integer | Decimal | Thousands)  │
│ Visible by Default: [✓]                                      │
│                                                              │
│ ─── Computation ───                                          │
│ [ ] This is a computed field                                 │
│ Formula: (greyed out if not computed)                         │
│ Depends On: (auto-detected from formula)                     │
│                                                              │
│ ─── Entity Link ───  (only for entity/multi_entity types)    │
│ Links To: [Shot ▾]                                           │
│ Display Column: [code - name ▾]                              │
│                                                              │
│ ─── Validation ───                                           │
│ Required: [ ]                                                │
│ Min Value: [    ]  Max Value: [    ]                          │
│ Pattern: [                    ]                               │
│                                                              │
│ ─── Attached Entities ───                                    │
│ [Shot ✓] [Asset ○] [Task ○] [Sequence ○] [Version ○]       │
└──────────────────────────────────────────────────────────────┘
```

#### 9.2 Choice Set Management (Enhanced)

```
┌──────────────────────────────────────────────────────────────┐
│ Choice Set: Task Status                                      │
├──────────────────────────────────────────────────────────────┤
│ Value       │ Label         │ Color    │ Order │ Active      │
│─────────────┼───────────────┼──────────┼───────┼─────────────│
│ wtg         │ Waiting       │ #6B7280  │ 10    │ ✓           │
│ rdy         │ Ready         │ #3B82F6  │ 20    │ ✓           │
│ ip          │ In Progress   │ #F59E0B  │ 30    │ ✓           │
│ rev         │ Review        │ #8B5CF6  │ 40    │ ✓           │
│ fin         │ Final         │ #10B981  │ 50    │ ✓           │
│ omt         │ Omit          │ #EF4444  │ 60    │ ✓           │
│─────────────┼───────────────┼──────────┼───────┼─────────────│
│ [+ Add Value]                                                 │
└──────────────────────────────────────────────────────────────┘
```

#### 9.3 Computed Fields UI

The Fields page should show computed field formulas and allow editing:

```
┌──────────────────────────────────────────────────────────────┐
│ Computed Field: Cut Duration                                 │
├──────────────────────────────────────────────────────────────┤
│ Formula:  {cut_out} - {cut_in} + 1                          │
│ Depends:  cut_in, cut_out                                    │
│ Result:   number                                             │
│ Entity:   Shot                                               │
│ Storage:  Virtual (not persisted)                             │
│                                                              │
│ Preview with sample data:                                    │
│   cut_in=1001, cut_out=1150 → cut_duration = 150            │
└──────────────────────────────────────────────────────────────┘
```

#### 9.4 Field Groups / Categories

Group fields by purpose for better organization:

| Category | Fields (Task example) |
|----------|----------------------|
| **Identity** | name, code, cached_display_name |
| **Relationships** | project_id, entity_type, entity_id, step_id |
| **Assignment** | assigned_to, reviewer, cc, ayon_assignees |
| **Scheduling** | start_date, end_date, due_date, duration, bid |
| **Status** | status, priority, milestone, pinned |
| **Cut/Frames** | cut_in, cut_out, head_in, tail_out, cut_duration |
| **Approval** | client_approved, client_approved_at, client_approved_by |
| **Tracking** | open_notes_count, publish_version_number |
| **Media** | thumbnail_url, filmstrip_thumbnail_url |
| **System** | id, created_at, updated_at, created_by, updated_by |
| **Integration** | ayon_id, ayon_sync_status, ddna_id |
| **Custom** | (user-created fields) |

---

## 10. Shared Utilities

### Location: `src/lib/fields/utils.ts`

These replace the duplicated utility functions across list pages:

```typescript
// src/lib/fields/utils.ts

/** Convert unknown value to string safely */
export function asText(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return value.map(asText).join(', ')
  return String(value)
}

/** Parse a value that might be a string, array, or CSV into string[] */
export function parseTextArray(value: unknown): string[] {
  if (value == null) return []
  if (Array.isArray(value)) {
    return value.map(item => asText(item).trim()).filter(Boolean)
  }
  if (typeof value === 'string') {
    // Handle JSON array strings
    if (value.startsWith('[')) {
      try {
        const parsed = JSON.parse(value)
        if (Array.isArray(parsed)) return parsed.map(item => asText(item).trim()).filter(Boolean)
      } catch { /* fall through to CSV parse */ }
    }
    // Handle CSV
    return value.split(',').map(item => item.trim()).filter(Boolean)
  }
  return []
}

/** Join string array to comma-separated string */
export function arrayToString(value: string[]): string {
  return value.filter(Boolean).join(', ')
}

/** Parse a safe number from unknown */
export function parseNumber(value: unknown): number | null {
  if (value == null || value === '') return null
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

/** Calculate working days between two dates (exclude weekends) */
export function workingDaysBetween(start: Date, end: Date): number {
  let count = 0
  const current = new Date(start)
  while (current <= end) {
    const day = current.getDay()
    if (day !== 0 && day !== 6) count++
    current.setDate(current.getDate() + 1)
  }
  return count
}

/** Format a date for display */
export function formatDate(value: unknown, includeTime = false): string {
  if (value == null || value === '') return ''
  const date = new Date(String(value))
  if (isNaN(date.getTime())) return String(value)
  if (includeTime) {
    return date.toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }
  return date.toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

/** Normalize a field value for a given data type before saving */
export function normalizeFieldValue(dataType: string, value: unknown): unknown {
  const typeDef = getFieldType(dataType)
  if (!typeDef) return value
  return typeDef.serialize(typeDef.parse(value))
}
```

---

## 11. Database Schema Requirements

### New Tables / Columns Needed

#### 11.1 Computed Field Definitions Table

```sql
CREATE TABLE computed_field_definitions (
  id serial PRIMARY KEY,
  entity_type text NOT NULL,
  field_code text NOT NULL,
  formula_type text NOT NULL DEFAULT 'arithmetic',
  formula_expression text NOT NULL,
  depends_on text[] NOT NULL DEFAULT '{}',
  result_type text NOT NULL DEFAULT 'number',
  is_persisted boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(entity_type, field_code)
);
```

#### 11.2 Entity Link Definitions Table

```sql
CREATE TABLE entity_link_definitions (
  id serial PRIMARY KEY,
  source_entity text NOT NULL,
  field_code text NOT NULL,
  target_entity text NOT NULL,
  target_table text NOT NULL,
  target_value_column text NOT NULL DEFAULT 'id',
  target_display_columns text[] NOT NULL DEFAULT '{name}',
  display_format text,  -- e.g., '{code} - {name}'
  is_searchable boolean NOT NULL DEFAULT true,
  search_column text DEFAULT 'name',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(source_entity, field_code)
);
```

#### 11.3 Field Group Definitions Table

```sql
CREATE TABLE field_groups (
  id serial PRIMARY KEY,
  entity_type text NOT NULL,
  group_name text NOT NULL,
  group_code text NOT NULL,
  display_order integer NOT NULL DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true,
  UNIQUE(entity_type, group_code)
);

-- Add group reference to schema_field_entity_mapping
ALTER TABLE schema_field_entity_mapping
  ADD COLUMN group_id integer REFERENCES field_groups(id);
```

#### 11.4 Custom Data Column

```sql
-- Add JSONB column for custom field storage to all entity tables
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS custom_data jsonb DEFAULT '{}';
ALTER TABLE shots ADD COLUMN IF NOT EXISTS custom_data jsonb DEFAULT '{}';
ALTER TABLE assets ADD COLUMN IF NOT EXISTS custom_data jsonb DEFAULT '{}';
ALTER TABLE sequences ADD COLUMN IF NOT EXISTS custom_data jsonb DEFAULT '{}';
ALTER TABLE versions ADD COLUMN IF NOT EXISTS custom_data jsonb DEFAULT '{}';
ALTER TABLE notes ADD COLUMN IF NOT EXISTS custom_data jsonb DEFAULT '{}';
ALTER TABLE published_files ADD COLUMN IF NOT EXISTS custom_data jsonb DEFAULT '{}';
```

---

## 12. File Structure

```
src/lib/fields/
├── index.ts                    # Main exports
├── field-types.ts              # Field type registry (all 20+ types)
├── field-behaviors.ts          # Per-entity field behavior definitions
├── entity-fields.ts            # getFieldDefinitions() - loads merged field config
├── computed-fields.ts          # Computed field formulas + recalculation engine
├── entity-links.ts             # ENTITY_LINK_REGISTRY + EntityLinkConfig
├── field-entity-map.ts         # FIELD_ENTITY_MAP (which field links to which entity)
├── options-loader.ts           # Universal options loader (replaces entity-field-options.ts)
├── entity-resolver.ts          # Batch entity name resolution (supports crossProject mode)
├── context-adapters.ts         # toTableColumn(), toHeaderField(), toInfoField(), toQueueItem(), toDetailContext()
├── field-update-handler.ts     # Universal field update with computed recalculation
├── row-enricher.ts             # enrichRow() — applies entity resolution + computed fields to raw DB rows
├── filter-helpers.ts           # buildFilterSections() — generates filter options from field behaviors
├── utils.ts                    # Shared utilities (asText, parseTextArray, etc.)
└── types.ts                    # All TypeScript interfaces

src/lib/apex/
├── entity-header-fields.ts     # DEPRECATED → delegates to fields/context-adapters.ts
├── entity-field-options.ts     # DEPRECATED → delegates to fields/options-loader.ts
└── entity-info-fields.ts       # DEPRECATED → delegates to fields/context-adapters.ts

src/components/my-tasks/
├── my-tasks-types.ts           # MyTaskRow type (simplified — fewer computed labels needed)
├── my-tasks-utils.ts           # Date grouping (buildDateGroups — stays, view-specific)
├── my-tasks-left-queue.tsx     # Left queue (uses toQueueItem() from context-adapters)
├── my-tasks-right-context.tsx  # Right header (uses toDetailContext() from context-adapters)
├── my-tasks-filter-drawer.tsx  # Filter UI (uses buildFilterSections() from filter-helpers)
└── my-tasks-saved-filters.tsx  # Saved filters UI (stays as-is — page-specific)
```

---

## 13. Implementation Phases

### Phase 1: Foundation (Core Library)

**Goal:** Build the field system library without changing any existing pages.

1. Create `src/lib/fields/types.ts` — all interfaces
2. Create `src/lib/fields/field-types.ts` — type registry for all 20+ types
3. Create `src/lib/fields/utils.ts` — shared utilities (move duplicated functions here)
4. Create `src/lib/fields/computed-fields.ts` — formulas for task duration, shot frames
5. Create `src/lib/fields/entity-links.ts` — entity link registry
6. Create `src/lib/fields/field-entity-map.ts` — field-to-entity mapping
7. Write tests for computed fields (task duration, shot cut calculations)

**Deliverable:** Library that can be imported but doesn't change existing behavior.

### Phase 2: Options & Resolution

**Goal:** Replace hardcoded option loading with the universal system.

1. Create `src/lib/fields/options-loader.ts` — universal options loader
2. Create `src/lib/fields/entity-resolver.ts` — batch entity resolution with `crossProject` support
3. Create `src/lib/fields/entity-fields.ts` — `getFieldDefinitions()` that merges schema + runtime
4. Create `src/lib/fields/row-enricher.ts` — `enrichRow()` applies resolution + computed fields
5. Update `entity-field-options.ts` to delegate to new options-loader
6. Verify all dropdown options still load correctly

**Deliverable:** Options loading works through the new system, old code delegates.

### Phase 3: Context Adapters

**Goal:** Generate table columns, header fields, and info fields from unified definitions.

1. Create `src/lib/fields/context-adapters.ts` — `toTableColumn()`, `toHeaderField()`, `toInfoField()`, `toQueueItem()`, `toDetailContext()`
2. Create `src/lib/fields/field-update-handler.ts` — universal update handler with computed fields
3. Create `src/lib/fields/filter-helpers.ts` — `buildFilterSections()` for My Tasks and future filter UIs
4. Migrate ONE entity (shots) to use the new system end-to-end:
   - Shot list page: columns generated from `getFieldDefinitions('shot')` + `toTableColumn()`
   - Shot layout: header fields from `toHeaderField()`
   - Shot info page: fields from `toInfoField()`
   - Shot cell updates: through `handleFieldUpdate()` with computed cut fields
5. Verify shot pages work identically with new system
6. Migrate remaining entities: tasks, assets, sequences, versions

**Deliverable:** All entity pages use the unified field system. Computed fields auto-calculate.

### Phase 3b: My Tasks Migration

**Goal:** My Tasks page uses the unified field system, eliminating ~575 lines of duplication.

1. **Replace utility functions** — import from `src/lib/fields/utils.ts` instead of local `asText`, `toIdKey`, `toNumericId`, `titleCase`
2. **Replace entity resolution** — use `resolveEntityLinks()` with `{ crossProject: true }` instead of manual asset/shot/sequence batch queries (eliminates ~110 lines)
3. **Replace option building** — use `loadAllFieldOptions()` instead of manual status/department/assignee option construction (eliminates ~90 lines)
4. **Replace column definitions** — generate task columns from `getFieldDefinitions('task')` + `toTableColumn()`, with My Tasks-specific overrides for `linkHref` and `formatValue` (eliminates ~90 lines)
5. **Replace cell update handler** — use `handleFieldUpdate()` with task-specific `my_tasks_bucket` recalculation (eliminates ~55 lines)
6. **Simplify `loadMyTasks()`** — from ~280 lines to ~50 lines using `enrichRow()` for entity resolution + computed fields
7. **Simplify detail tab column definitions** — version/publish/asset columns generated from field definitions per entity type
8. **Keep page-specific concerns in place:**
   - Left queue layout (MyTasksLeftQueue) — uses `toQueueItem()` but layout stays
   - Right context header (MyTasksRightContext) — uses `toDetailContext()` but layout stays
   - Filter drawer + saved filters — UI stays, option data comes from unified system
   - Date grouping/bucketing — stays in `my-tasks-utils.ts`
   - Detail tab loading (activity, history, versions, etc.) — stays as-is

**Verification:**
- My Tasks page loads with identical data and behavior
- Inline editing (status, priority, department, assigned_to, dates) works as before
- Filter/sort/search work as before
- Left queue grouping by date buckets works as before
- Right context detail tabs load correctly
- Saved filters load and apply correctly

**Deliverable:** My Tasks page shrinks from ~1,985 lines to ~800-900 lines with zero behavior change.

### Phase 4: Computed Fields Live

**Goal:** Duration and frame calculations work automatically.

1. Wire `recalculateComputedFields()` into the universal update handler
2. Task: updating start_date or end_date auto-calculates duration
3. Task: updating status auto-recalculates `my_tasks_bucket` (active/upcoming/done)
4. Shot: updating cut_in/cut_out/head_in/tail_out auto-calculates:
   - cut_duration, head_duration, tail_duration, working_duration, frame_summary
5. Display computed values in tables and headers (read-only computed columns)
6. Optional: DB triggers for server-side consistency

**Deliverable:** Computed fields work across all contexts including My Tasks.

### Phase 5: Enhanced Fields Page

**Goal:** Fields page becomes the control center for the unified system.

1. Add computed field configuration UI
2. Add entity link target configuration
3. Add field group management
4. Add field format/display options
5. Add validation constraint configuration
6. Show preview of how field renders in table/header/form contexts
7. Custom field creation auto-generates the JSONB storage path

**Deliverable:** Admins can configure field behavior from the Fields page.

### Phase 6: Custom Pages Ready

**Goal:** Custom pages can render any entity's fields with zero duplication.

1. Create `<UnifiedEntityPage entity="task" projectId={id} />` component
2. This component automatically:
   - Loads field definitions for the entity
   - Loads all dropdown options
   - Resolves entity links
   - Renders a full EntityTable with correct columns
   - Handles cell updates with computed field recalculation
3. Custom pages just declare which entity and which fields to show
4. Global tasks page uses the same system as project-level tasks page
5. My Tasks page becomes a thin wrapper around the unified system + its unique two-pane layout

**Deliverable:** New entity pages take <50 lines of code.

---

## 14. ShotGrid Reference Map

### How Kong maps to ShotGrid concepts

| ShotGrid Concept | Kong Equivalent | Status |
|-----------------|-----------------|--------|
| Field Data Types (19 types) | `field-types.ts` registry | Needs creation |
| Calculated Fields | `computed-fields.ts` engine | Needs creation |
| Query Fields | `summary` type + DB views | Partial (open_notes_count exists) |
| Entity Fields (FK) | `entity` data type | Exists, needs resolver |
| Multi-Entity Fields (M2M) | `multi_entity` data type | Exists, needs resolver |
| Status List (colored) | `status_list` + statuses table | Exists, works |
| Tags | `tag_list` + tags table | Exists, works |
| Choice Sets (Lists) | `choice_sets` + `choice_set_items` | Exists via Fields page |
| Custom Fields (sg_ prefix) | `custom` fieldType + JSONB | Needs JSONB column |
| Field Permissions | Not yet | Future |
| Per-Project Field Visibility | `schema_field_entity_mapping` | Exists at entity level |
| Field Groups/Categories | `field_groups` table | Needs creation |
| Connection Entities | Junction tables (manual) | Partial |
| Deep-Linked Fields (bubbling) | Entity resolver | Needs creation |
| Smart Cut Fields | `computed-fields.ts` shot formulas | Needs creation |
| My Tasks (cross-project) | `/my-tasks` page + unified field system | Exists, needs migration |
| Field Admin Page | `/fields` page | Exists, needs enhancement |

### ShotGrid Cut Fields → Kong Shot Fields

| ShotGrid Field | Kong Column | Computed? | Formula |
|---------------|-------------|-----------|---------|
| `sg_head_in` | `head_in` | No (user input) | — |
| `sg_cut_in` | `cut_in` | No (user input) | — |
| `sg_cut_out` | `cut_out` | No (user input) | — |
| `sg_tail_out` | `tail_out` | No (user input) | — |
| `sg_cut_duration` | `cut_duration` | **Yes** | `cut_out - cut_in + 1` |
| `sg_head_duration` | `head_duration` | **Yes** | `cut_in - head_in` |
| `sg_tail_duration` | `tail_duration` | **Yes** | `tail_out - cut_out` |
| `sg_working_duration` | `working_duration` | **Yes** | `tail_out - head_in + 1` |
| `sg_cut_order` | `cut_order` | No (user input) | — |

### ShotGrid Task Scheduling → Kong Task Fields

| ShotGrid Field | Kong Column | Computed? | Formula |
|---------------|-------------|-----------|---------|
| `start_date` | `start_date` | No (user input) | — |
| `due_date` | `due_date` | No (user input) | — |
| `end_date` | `end_date` | No (user input) | — |
| `duration` | `duration` | **Yes** | `end_date - start_date` (working days) |
| `bid` | `bid` | No (user input) | — |
| `time_logged` | (future) | No | — |
| `time_remaining` | (future) | **Yes** | `bid - time_logged` |

---

## Summary

This blueprint provides:

1. **One type registry** — every field type defined once with parse/format/validate/serialize
2. **One field definition loader** — `getFieldDefinitions(entity)` returns everything needed
3. **One options loader** — no more hardcoded entity-specific dropdown logic
4. **One entity resolver** — batch resolution of entity links to display names
5. **One computed engine** — declarative formulas that auto-recalculate on field change
6. **One update handler** — handles field update + computed recalculation + DB write
7. **Context adapters** — same field definition renders correctly in table/header/info/form
8. **Custom fields via JSONB** — user-created fields stored in `custom_data` column
9. **Fields page as control center** — configure everything from one admin interface

The result: any new page (custom pages, global tasks, etc.) gets full field behavior by declaring the entity type and which fields to show. Zero duplication.

10. **My Tasks integration** — the most complex consumer (cross-project, multi-entity resolution, two-pane layout) is a first-class citizen of the unified system, shrinking from ~1,985 lines to ~800-900 lines while gaining computed fields and unified entity resolution
