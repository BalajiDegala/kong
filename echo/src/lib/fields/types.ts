/**
 * Unified Field System — Type Definitions
 *
 * Central type definitions used across the entire field system.
 * Aligned with the existing schema.generated.ts EntityKey and SchemaField types.
 */

import type { EntityKey as SchemaEntityKey } from '@/lib/schema'

// Re-export for convenience — the canonical entity key set
export type EntityKey = SchemaEntityKey

// Extended entity key that includes non-schema entities (playlist, etc.)
export type ExtendedEntityKey = EntityKey | 'playlist'

// ---------------------------------------------------------------------------
// Field Data Types
// ---------------------------------------------------------------------------

export type FieldDataType =
  | 'text'
  | 'text_area'
  | 'number'
  | 'float'
  | 'checkbox'
  | 'date'
  | 'date_time'
  | 'duration'
  | 'percent'
  | 'currency'
  | 'timecode'
  | 'list'
  | 'status_list'
  | 'entity'
  | 'multi_entity'
  | 'tag_list'
  | 'image'
  | 'url'
  | 'color'
  | 'serializable'
  | 'calculated'
  | 'query'
  | 'summary'

// Any value a field can hold
export type FieldValue = string | number | boolean | string[] | null

// ---------------------------------------------------------------------------
// Field Type Registry
// ---------------------------------------------------------------------------

export interface FormatOptions {
  durationUnit?: 'hours' | 'minutes' | 'days'
  decimalPlaces?: number
  currencySymbol?: string
  dateFormat?: string
  frameRate?: number
}

export interface FieldConstraints {
  required?: boolean
  min?: number
  max?: number
  minLength?: number
  maxLength?: number
  pattern?: string
}

export interface ValidationResult {
  valid: boolean
  error?: string
}

export interface FieldTypeDefinition {
  type: FieldDataType
  label: string
  pgType: string | null
  editable: boolean
  computable: boolean
  needsOptions: boolean
  parse: (raw: unknown) => FieldValue
  format: (value: FieldValue, options?: FormatOptions) => string
  serialize: (value: FieldValue) => unknown
  validate: (value: FieldValue, constraints?: FieldConstraints) => ValidationResult
  defaultValue: FieldValue
  compare: (a: FieldValue, b: FieldValue) => number
}

// ---------------------------------------------------------------------------
// Field Behaviors (per-entity, per-field configuration)
// ---------------------------------------------------------------------------

export interface OptionSourceConfig {
  type: 'choice_set' | 'entity_table' | 'status_table' | 'tags_table'
  choiceSetId?: number
  entityTable?: string
  valueColumn?: string
  labelColumn?: string
  filter?: Record<string, unknown>
  statusEntityType?: string
  multi?: boolean
}

export type ComputedFormulaType =
  | 'arithmetic'
  | 'date_diff'
  | 'frame'
  | 'conditional'
  | 'concat'

export interface ComputedFieldFormula {
  type: ComputedFormulaType
  dependsOn: string[]
  resultType: FieldDataType
  calculate: (row: Record<string, unknown>) => FieldValue
}

export interface FieldBehavior {
  code: string
  label: string
  dataType: FieldDataType
  fieldType: 'permanent' | 'dynamic' | 'system_owned' | 'custom'
  column: string | null
  editable: boolean
  readonly: boolean
  optionSource?: OptionSourceConfig
  formula?: ComputedFieldFormula
  displayOrder: number
  defaultWidth: string
  visibleByDefault: boolean
  formatOptions?: FormatOptions
  constraints?: FieldConstraints
  /** For custom fields stored in JSONB custom_data column */
  customDataKey?: string
}

// ---------------------------------------------------------------------------
// Field Options
// ---------------------------------------------------------------------------

export interface FieldOption {
  value: string
  label: string
  color?: string | null
}

// ---------------------------------------------------------------------------
// Entity Links
// ---------------------------------------------------------------------------

export interface EntityLinkConfig {
  table: string
  valueColumn: string
  displayColumns: string[]
  formatLabel: (record: Record<string, unknown>) => string
  searchable: boolean
  searchColumn?: string
}

// ---------------------------------------------------------------------------
// Entity Resolution
// ---------------------------------------------------------------------------

/** Map<fieldCode, Map<entityId, displayLabel>> */
export type EntityResolutionMap = Map<string, Map<string, string>>

export interface ResolveOptions {
  /** If true, don't filter entity queries by project_id */
  crossProject?: boolean
  /** If set, filter entity queries to this project */
  projectId?: string | number
}

// ---------------------------------------------------------------------------
// Table Column Mapping (matches existing TableColumn type)
// ---------------------------------------------------------------------------

export type TableColumnType =
  | 'text'
  | 'thumbnail'
  | 'link'
  | 'select'
  | 'status'
  | 'number'
  | 'links'
  | 'pipeline'
  | 'date'
  | 'datetime'
  | 'url'
  | 'color'
  | 'boolean'
  | 'json'

export type TableEditorType =
  | 'text'
  | 'textarea'
  | 'select'
  | 'multiselect'
  | 'checkbox'
  | 'date'
  | 'datetime'
  | 'number'
  | 'color'
  | 'url'

// ---------------------------------------------------------------------------
// Rendering Contexts
// ---------------------------------------------------------------------------

export type RenderContext =
  | 'table'
  | 'header'
  | 'info'
  | 'form'
  | 'card'
  | 'queue'
  | 'detail_context'
