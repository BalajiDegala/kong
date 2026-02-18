import { SCHEMA, type EntityKey, type SchemaField } from '@/lib/schema'

export type HeaderFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'select'
  | 'multiselect'
  | 'readonly'
export type HeaderFieldValue = string | number | boolean | string[] | null

export interface HeaderFieldOption {
  value: string
  label: string
}

export interface EntityHeaderFieldDraft {
  id: string
  label: string
  type: HeaderFieldType
  value: HeaderFieldValue
  editable?: boolean
  column?: string
  placeholder?: string
  options?: HeaderFieldOption[]
}

export type HeaderEntityKey = EntityKey | 'playlist'

const DEFAULT_EXCLUDED_COLUMNS = new Set([
  'id',
  'project_id',
  'created_at',
  'updated_at',
  'created_by',
  'updated_by',
])

const NON_EDITABLE_DATA_TYPES = new Set([
  'multi_entity',
  'entity',
  'serializable',
  'query',
  'summary',
  'image',
])

const ENTITY_AUTO_EDIT_DENY: Record<HeaderEntityKey, Set<string>> = {
  asset: new Set(['id', 'project_id', 'created_by', 'created_at', 'updated_at']),
  sequence: new Set(['id', 'project_id', 'code', 'created_by', 'created_at', 'updated_at']),
  shot: new Set([
    'id',
    'project_id',
    'sequence_id',
    'code',
    'created_by',
    'created_at',
    'updated_at',
  ]),
  task: new Set([
    'id',
    'project_id',
    'entity_type',
    'entity_id',
    'created_by',
    'created_at',
    'updated_at',
  ]),
  version: new Set([
    'id',
    'project_id',
    'entity_type',
    'entity_id',
    'code',
    'created_by',
    'created_at',
    'updated_at',
  ]),
  note: new Set(['id', 'project_id', 'created_by', 'created_at', 'updated_at']),
  published_file: new Set(['id', 'project_id', 'created_by', 'created_at', 'updated_at']),
  post: new Set(['id', 'project_id', 'created_by', 'created_at', 'updated_at']),
  post_media: new Set(['id', 'project_id', 'created_by', 'created_at', 'updated_at']),
  post_reaction: new Set(['id', 'project_id', 'created_by', 'created_at', 'updated_at']),
  annotation: new Set(['id', 'project_id', 'created_by', 'created_at', 'updated_at']),
  playlist: new Set(['id', 'project_id', 'created_at', 'updated_at']),
}

function toTitleCaseColumn(column: string): string {
  return column
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function normalizeFieldValue(value: unknown): HeaderFieldValue {
  if (value === null || value === undefined) return null
  if (typeof value === 'string') return value
  if (typeof value === 'number') return value
  if (typeof value === 'boolean') return value
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter(Boolean)
  }
  return null
}

function inferFieldType(schemaField: SchemaField | null, value: unknown): HeaderFieldType {
  const dataType = String(schemaField?.dataType || '').toLowerCase()
  if (dataType === 'checkbox') return 'boolean'
  if (dataType === 'date') return 'date'
  if (dataType === 'date_time' || dataType === 'datetime') return 'datetime'
  if (
    dataType === 'number' ||
    dataType === 'integer' ||
    dataType === 'int' ||
    dataType === 'bigint' ||
    dataType === 'float' ||
    dataType === 'duration' ||
    dataType === 'footage' ||
    dataType === 'percent' ||
    dataType === 'currency'
  ) {
    return 'number'
  }
  if (typeof value === 'boolean') return 'boolean'
  if (typeof value === 'number') return 'number'
  return 'text'
}

function canAutoEditField(
  entity: HeaderEntityKey,
  column: string,
  schemaField: SchemaField | null,
  rawValue: unknown,
  type: HeaderFieldType
): boolean {
  if (type === 'readonly') return false

  const entityDeny = ENTITY_AUTO_EDIT_DENY[entity] || new Set<string>()
  if (entityDeny.has(column)) return false

  const dataType = String(schemaField?.dataType || '').toLowerCase()
  if (NON_EDITABLE_DATA_TYPES.has(dataType)) return false
  if (String(schemaField?.fieldType || '').toLowerCase() === 'system_owned') return false

  if (rawValue === null || rawValue === undefined) {
    return (
      type === 'text' ||
      type === 'number' ||
      type === 'boolean' ||
      type === 'date' ||
      type === 'datetime'
    )
  }
  if (Array.isArray(rawValue)) return false
  if (rawValue && typeof rawValue === 'object') return false

  return (
    type === 'text' ||
    type === 'number' ||
    type === 'boolean' ||
    type === 'date' ||
    type === 'datetime'
  )
}

export function appendAutoHeaderFields(
  entity: HeaderEntityKey,
  row: Record<string, unknown>,
  manualFields: EntityHeaderFieldDraft[],
  options?: {
    excludeColumns?: string[]
    includeDefaultExcluded?: boolean
  }
): EntityHeaderFieldDraft[] {
  const schemaFields = entity === 'playlist' ? [] : SCHEMA[entity].fields
  const excluded = options?.includeDefaultExcluded
    ? new Set<string>()
    : new Set(DEFAULT_EXCLUDED_COLUMNS)
  for (const column of options?.excludeColumns || []) {
    excluded.add(column)
  }

  const usedIds = new Set<string>()
  const usedColumns = new Set<string>()
  for (const field of manualFields) {
    usedIds.add(field.id)
    if (field.column) usedColumns.add(field.column)
  }

  const schemaByColumn = new Map<string, SchemaField>()
  for (const field of schemaFields) {
    if (!field.column || field.virtual) continue
    schemaByColumn.set(field.column, field)
  }

  const autoFields: EntityHeaderFieldDraft[] = []
  for (const field of schemaFields) {
    if (!field.column || field.virtual) continue
    const column = field.column
    if (excluded.has(column)) continue
    if (usedIds.has(column) || usedColumns.has(column)) continue

    const rawValue = row[column]
    if (rawValue && typeof rawValue === 'object' && !Array.isArray(rawValue)) continue
    const value = normalizeFieldValue(rawValue)
    const type = inferFieldType(field, rawValue)

    autoFields.push({
      id: column,
      label: field.name || toTitleCaseColumn(column),
      type,
      value,
      editable: canAutoEditField(entity, column, field, rawValue, type),
      column,
    })
  }

  // Include primitive columns that may not be in generated schema yet.
  for (const [column, rawValue] of Object.entries(row)) {
    if (excluded.has(column)) continue
    if (usedIds.has(column) || usedColumns.has(column)) continue
    if (autoFields.some((field) => field.id === column)) continue
    if (rawValue && typeof rawValue === 'object' && !Array.isArray(rawValue)) continue

    const value = normalizeFieldValue(rawValue)
    const schemaField = schemaByColumn.get(column) || null
    const type = inferFieldType(schemaField, rawValue)

    autoFields.push({
      id: column,
      label: schemaField?.name || toTitleCaseColumn(column),
      type,
      value,
      editable: canAutoEditField(entity, column, schemaField, rawValue, type),
      column,
    })
  }

  return [...manualFields, ...autoFields]
}
