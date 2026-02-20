/**
 * Unified Field System — Entity Field Definitions
 *
 * Merges schema definitions + runtime field metadata + computed formulas
 * into unified FieldBehavior[] for any entity.
 */

import { getEntitySchema, type EntityKey, type SchemaField } from '@/lib/schema'
import type { FieldBehavior, FieldDataType, ExtendedEntityKey } from './types'
import { getComputedFormulas } from './computed-fields'
import { FIELD_ENTITY_MAP } from './field-entity-map'
import { isValidDataType } from './field-types'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SYSTEM_READONLY_COLUMNS = new Set([
  'id', 'created_at', 'updated_at', 'created_by', 'updated_by',
])

const NON_EDITABLE_DATA_TYPES = new Set<FieldDataType>([
  'serializable', 'query', 'summary', 'image', 'calculated',
])

/** Default column widths by data type */
const DEFAULT_WIDTHS: Record<string, string> = {
  text: '180px',
  text_area: '260px',
  number: '100px',
  float: '120px',
  checkbox: '80px',
  date: '140px',
  date_time: '180px',
  duration: '120px',
  percent: '100px',
  currency: '120px',
  timecode: '120px',
  list: '150px',
  status_list: '140px',
  entity: '180px',
  multi_entity: '220px',
  tag_list: '200px',
  image: '88px',
  url: '200px',
  color: '100px',
  serializable: '200px',
  calculated: '140px',
  query: '140px',
  summary: '140px',
}

/** Fields visible by default per entity */
const DEFAULT_VISIBLE_FIELDS: Record<string, Set<string>> = {
  task: new Set([
    'thumbnail_url', 'name', 'status', 'department', 'assigned_to',
    'priority', 'start_date', 'due_date', 'end_date',
  ]),
  shot: new Set([
    'thumbnail_url', 'code', 'name', 'status', 'sequence_id',
    'cut_in', 'cut_out', 'cut_duration', 'tags',
  ]),
  asset: new Set([
    'thumbnail_url', 'code', 'name', 'asset_type', 'status', 'tags',
  ]),
  sequence: new Set([
    'thumbnail_url', 'name', 'status', 'tags',
  ]),
  version: new Set([
    'thumbnail_url', 'code', 'status', 'entity_type', 'description',
    'created_at',
  ]),
  note: new Set([
    'subject', 'body', 'entity_type', 'created_by', 'created_at',
  ]),
  published_file: new Set([
    'code', 'file_type', 'status', 'entity_type', 'created_at',
  ]),
}

// ---------------------------------------------------------------------------
// Schema to FieldBehavior conversion
// ---------------------------------------------------------------------------

function schemaFieldToDataType(field: SchemaField): FieldDataType {
  // Map schema dataType strings to our FieldDataType enum
  const raw = (field.dataType || 'text').toLowerCase().trim()

  if (isValidDataType(raw)) return raw as FieldDataType

  // Handle known schema mappings
  const mapping: Record<string, FieldDataType> = {
    'addressing': 'text',
    'pivot_column': 'text',
    'footage': 'text',
    'status': 'status_list',
    'tag': 'tag_list',
    'integer': 'number',
    'int': 'number',
    'bigint': 'number',
    'double precision': 'float',
    'real': 'float',
    'numeric': 'float',
    'boolean': 'checkbox',
    'bool': 'checkbox',
    'timestamptz': 'date_time',
    'timestamp': 'date_time',
    'jsonb': 'serializable',
    'json': 'serializable',
    'uuid': 'text',
    'text[]': 'tag_list',
    'varchar': 'text',
  }

  return mapping[raw] || 'text'
}

function inferDataTypeFromColumn(column: string, pgType: string | null): FieldDataType {
  // Infer from column name patterns
  if (column === 'status') return 'status_list'
  if (column === 'tags' || column.endsWith('_tags')) return 'tag_list'
  if (column.endsWith('_url') || column === 'link') return 'url'
  if (column === 'thumbnail_url' || column === 'filmstrip_thumbnail_url') return 'image'
  if (column.endsWith('_at') || column === 'created_at' || column === 'updated_at') return 'date_time'
  if (column.endsWith('_date') || column === 'due_date') return 'date'
  if (column === 'description' || column === 'body' || column === 'notes') return 'text_area'
  if (column === 'color' || column.endsWith('_color')) return 'color'

  // Infer from pg type
  if (pgType) {
    const pg = pgType.toLowerCase()
    if (pg === 'boolean') return 'checkbox'
    if (pg === 'integer' || pg === 'bigint' || pg === 'smallint') return 'number'
    if (pg.includes('numeric') || pg.includes('double') || pg.includes('real')) return 'float'
    if (pg === 'date') return 'date'
    if (pg.includes('timestamp')) return 'date_time'
    if (pg === 'jsonb' || pg === 'json') return 'serializable'
    if (pg === 'text[]' || pg.endsWith('[]')) return 'tag_list'
  }

  return 'text'
}

function schemaFieldToBehavior(
  entity: string,
  field: SchemaField,
  index: number
): FieldBehavior {
  const column = field.column
  // Use DB column name as the identifier (not the schema code like "task_name")
  // because DB rows, page overrides, and EntityTable all key by column name
  const code = field.column || field.code || `field_${index}`
  let dataType = schemaFieldToDataType(field)
  const isSystem = SYSTEM_READONLY_COLUMNS.has(code)
  const isNonEditable = NON_EDITABLE_DATA_TYPES.has(dataType)
  const isEntityLink = Boolean(FIELD_ENTITY_MAP[entity]?.[code])
  const entityLinkTarget = FIELD_ENTITY_MAP[entity]?.[code]

  // Override dataType for entity-linked fields based on pgType (ground truth)
  // pgType ending with [] → multi_entity (multiselect dropdown)
  // pgType without [] → entity (single select dropdown)
  if (isEntityLink && entityLinkTarget !== 'auto') {
    const pgType = (field.pgType || '').toLowerCase()
    if (pgType.endsWith('[]')) {
      dataType = 'multi_entity' as FieldDataType
    } else {
      dataType = 'entity' as FieldDataType
    }
  }

  // Determine editability
  let editable = !field.virtual && !isSystem && !isNonEditable
  if (field.fieldType === 'system_owned') editable = false

  // Status and entity links can be editable
  if (dataType === 'status_list' && !isSystem) editable = true
  if (isEntityLink && !isSystem && dataType !== 'serializable') editable = true

  // Override: certain entity data types need select editors
  // Entity links take priority over tag_list inference
  let optionSource = undefined
  if (dataType === 'status_list') {
    optionSource = { type: 'status_table' as const, statusEntityType: entity }
  } else if (isEntityLink && entityLinkTarget && entityLinkTarget !== 'auto') {
    optionSource = { type: 'entity_table' as const, entityTable: entityLinkTarget }
  } else if (dataType === 'tag_list') {
    optionSource = { type: 'tags_table' as const }
  }

  const defaultVisible = DEFAULT_VISIBLE_FIELDS[entity]

  // Apply column-name-based inference only if it differs and isn't overridden
  let finalDataType = dataType
  if (column && !isEntityLink) {
    const inferred = inferDataTypeFromColumn(code, field.pgType)
    if (inferred !== dataType) {
      finalDataType = inferred
    }
  }

  return {
    code,
    label: field.name || code,
    dataType: finalDataType,
    fieldType: field.fieldType as FieldBehavior['fieldType'] || 'permanent',
    column,
    editable,
    readonly: isSystem || field.virtual,
    optionSource,
    displayOrder: index * 10,
    defaultWidth: DEFAULT_WIDTHS[finalDataType] || '150px',
    visibleByDefault: defaultVisible ? defaultVisible.has(code) : false,
    formatOptions: undefined,
    constraints: undefined,
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get unified field definitions for an entity.
 *
 * Merges:
 * 1. Static schema from schema.generated.ts
 * 2. Computed field formulas
 * 3. Entity link targets
 *
 * Returns FieldBehavior[] sorted by displayOrder.
 */
export function getFieldDefinitions(entity: ExtendedEntityKey): FieldBehavior[] {
  // For non-schema entities (playlist), return empty
  const schemaEntity = entity as EntityKey
  let schema
  try {
    schema = getEntitySchema(schemaEntity)
  } catch {
    return []
  }

  if (!schema) return []

  // Convert schema fields to behaviors
  const behaviors: FieldBehavior[] = schema.fields.map((field, index) =>
    schemaFieldToBehavior(entity, field, index)
  )

  // Add computed fields that don't have schema columns
  const computedFormulas = getComputedFormulas(entity)
  for (const [code, formula] of Object.entries(computedFormulas)) {
    const exists = behaviors.some((b) => b.code === code)
    if (!exists) {
      behaviors.push({
        code,
        label: code
          .replace(/_/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase()),
        dataType: formula.resultType,
        fieldType: 'system_owned',
        column: null,
        editable: false,
        readonly: true,
        formula,
        displayOrder: 9000 + behaviors.length,
        defaultWidth: DEFAULT_WIDTHS[formula.resultType] || '140px',
        visibleByDefault: false,
      })
    } else {
      // Attach formula to existing field
      const existing = behaviors.find((b) => b.code === code)
      if (existing) {
        existing.formula = formula
      }
    }
  }

  return behaviors.sort((a, b) => a.displayOrder - b.displayOrder)
}

/**
 * Get a specific field behavior by code.
 */
export function getFieldBehavior(
  entity: ExtendedEntityKey,
  fieldCode: string
): FieldBehavior | null {
  const fields = getFieldDefinitions(entity)
  return fields.find((f) => f.code === fieldCode) || null
}
