/**
 * Unified Field System — Context Adapters
 *
 * Converts unified FieldBehavior into context-specific configurations:
 * - toTableColumn(): EntityTable column definitions
 * - toHeaderField(): Detail header field values
 * - toInfoField(): Info panel field values
 *
 * Replaces manual column definitions duplicated across every entity page.
 */

import type { TableColumn } from '@/components/table/types'
import type {
  FieldBehavior,
  FieldOption,
  EntityResolutionMap,
  TableColumnType,
  TableEditorType,
} from './types'
import { getFieldType } from './field-types'
import { resolveLabel } from './entity-resolver'
import { asText, parseTextArray } from './utils'
import { FIELD_ENTITY_MAP } from './field-entity-map'

// Re-export the header field type from the existing apex system for compatibility
import type { EntityHeaderFieldDraft, HeaderFieldType } from '@/lib/apex/entity-header-fields'
export type { EntityHeaderFieldDraft, HeaderFieldType }

// ---------------------------------------------------------------------------
// Data Type → Table Column Type mapping
// ---------------------------------------------------------------------------

const DATA_TYPE_TO_TABLE_TYPE: Record<string, TableColumnType> = {
  text: 'text',
  text_area: 'text',
  number: 'number',
  float: 'number',
  checkbox: 'boolean',
  date: 'date',
  date_time: 'datetime',
  duration: 'number',
  percent: 'number',
  currency: 'number',
  timecode: 'text',
  list: 'select',
  status_list: 'status',
  entity: 'select',
  multi_entity: 'links',
  tag_list: 'links',
  image: 'thumbnail',
  url: 'url',
  color: 'color',
  serializable: 'json',
  calculated: 'text',
  query: 'text',
  summary: 'text',
}

const DATA_TYPE_TO_EDITOR: Record<string, TableEditorType> = {
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

const DATA_TYPE_TO_HEADER_TYPE: Record<string, HeaderFieldType> = {
  text: 'text',
  text_area: 'textarea',
  number: 'number',
  float: 'number',
  checkbox: 'boolean',
  date: 'date',
  date_time: 'datetime',
  duration: 'number',
  percent: 'number',
  currency: 'number',
  timecode: 'text',
  list: 'select',
  status_list: 'select',
  entity: 'select',
  multi_entity: 'multiselect',
  tag_list: 'multiselect',
  image: 'readonly',
  url: 'text',
  color: 'text',
  serializable: 'readonly',
  calculated: 'readonly',
  query: 'readonly',
  summary: 'readonly',
}

// ---------------------------------------------------------------------------
// Table Column Adapter
// ---------------------------------------------------------------------------

/**
 * Convert a FieldBehavior into a TableColumn for EntityTable.
 *
 * @param field - The field behavior definition
 * @param options - Dropdown options loaded for this field (optional)
 * @param overrides - Custom overrides (linkHref, formatValue, etc.)
 */
export function toTableColumn(
  field: FieldBehavior,
  options?: FieldOption[],
  overrides?: Partial<TableColumn>
): TableColumn {
  const typeDef = getFieldType(field.dataType)
  const tableType = DATA_TYPE_TO_TABLE_TYPE[field.dataType] || 'text'
  const editor = DATA_TYPE_TO_EDITOR[field.dataType]

  const column: TableColumn = {
    id: field.code,
    label: field.label,
    type: tableType,
    width: field.defaultWidth,
    editable: field.editable && !field.readonly,
    editor: field.editable && !field.readonly ? editor : undefined,
    options: options?.map((o) => ({ value: o.value, label: o.label })),
  }

  // Add default formatValue using the type definition
  if (field.formatOptions || field.dataType === 'duration' || field.dataType === 'percent' || field.dataType === 'currency') {
    column.formatValue = (value: unknown) => {
      const parsed = typeDef.parse(value)
      return typeDef.format(parsed, field.formatOptions)
    }
  }

  // For entity fields, use the enriched _label field for display
  if (field.dataType === 'entity') {
    column.formatValue = (value: unknown, row?: Record<string, unknown>) => {
      if (!row) return asText(value)
      const labelField = `${field.code}_label`
      const label = row[labelField]
      if (label !== undefined && label !== null) return asText(label)
      // Fallback: look up the label from options
      if (options && value !== null && value !== undefined) {
        const option = options.find(o => o.value === String(value))
        if (option) return option.label
      }
      return asText(value)
    }
  }

  // Apply overrides
  if (overrides) {
    Object.assign(column, overrides)
  }

  return column
}

/**
 * Convert multiple FieldBehaviors into TableColumn[] for EntityTable.
 *
 * @param fields - Field behaviors to convert
 * @param fieldOptions - Map of fieldCode → FieldOption[]
 * @param overrides - Per-field overrides keyed by field code
 * @param entity - Entity type (optional, used to auto-generate entity link hrefs)
 */
export function toTableColumns(
  fields: FieldBehavior[],
  fieldOptions?: Record<string, FieldOption[]>,
  overrides?: Record<string, Partial<TableColumn>>,
  entity?: string
): TableColumn[] {
  return fields.map((field) => {
    const options = fieldOptions?.[field.code]
    let fieldOverrides = overrides?.[field.code]

    // Auto-generate linkHref for entity-linked fields pointing to navigable entities
    // (e.g., sequence_id → sequence detail page, but NOT assigned_to → profile)
    if (field.dataType === 'entity' && entity && !fieldOverrides?.linkHref) {
      const targetEntity = FIELD_ENTITY_MAP[entity]?.[field.code]
      if (targetEntity && targetEntity !== 'auto' && NAVIGABLE_ENTITIES.has(targetEntity)) {
        const autoLinkHref = (row: Record<string, unknown>) => {
          const href = buildEntityLinkHref(targetEntity, row, field.code)
          return href || '#'
        }

        fieldOverrides = {
          ...fieldOverrides,
          type: 'link',
          linkHref: autoLinkHref,
        }
      }
    }

    // Auto-generate linkHref for the entity's own primary name/code column
    // (e.g., clicking a task's "name" navigates to /apex/{project}/tasks/{id})
    if (entity && !fieldOverrides?.linkHref && isPrimaryNameField(entity, field.code)) {
      const entityForHref = entity
      fieldOverrides = {
        ...fieldOverrides,
        type: 'link',
        linkHref: (row: Record<string, unknown>) => {
          const projectId = asText(row.project_id).trim()
          const rowId = asText(row.id).trim()
          if (!rowId) return '#'
          return buildSelfEntityHref(entityForHref, projectId, rowId)
        },
      }
    }

    return toTableColumn(field, options, fieldOverrides)
  })
}

// ---------------------------------------------------------------------------
// Header Field Adapter
// ---------------------------------------------------------------------------

/**
 * Convert a FieldBehavior + value into a header field draft for detail pages.
 */
export function toHeaderField(
  field: FieldBehavior,
  value: unknown,
  options?: FieldOption[],
  resolutionMap?: EntityResolutionMap,
  row?: Record<string, unknown>
): EntityHeaderFieldDraft {
  const headerType = DATA_TYPE_TO_HEADER_TYPE[field.dataType] || 'text'

  let displayValue = value
  if (field.dataType === 'multi_entity' || field.dataType === 'tag_list') {
    displayValue = parseTextArray(value)
  }

  // Resolve entity link labels for display
  if (resolutionMap && row) {
    const label = resolveLabel(row, field.code, resolutionMap)
    if (label && (field.dataType === 'entity' || field.optionSource?.type === 'entity_table')) {
      // Keep the raw value for editing, label is just for display
    }
  }

  return {
    id: field.code,
    label: field.label,
    type: field.readonly ? 'readonly' : headerType,
    value: displayValue as string | number | boolean | string[] | null,
    editable: field.editable && !field.readonly,
    column: field.column || undefined,
    options: options?.map((o) => ({ value: o.value, label: o.label })),
  }
}

/**
 * Convert a FieldBehavior + value into an info panel field.
 * Same as header field but detects textarea candidates.
 */
export function toInfoField(
  field: FieldBehavior,
  value: unknown,
  options?: FieldOption[],
  resolutionMap?: EntityResolutionMap,
  row?: Record<string, unknown>
): EntityHeaderFieldDraft {
  const headerField = toHeaderField(field, value, options, resolutionMap, row)

  // Detect textarea candidates
  if (
    field.dataType === 'text' &&
    isLongTextColumn(field.code)
  ) {
    headerField.type = 'textarea'
  }

  return headerField
}

// ---------------------------------------------------------------------------
// My Tasks Rendering Helpers
// ---------------------------------------------------------------------------

export interface QueueItemData {
  id: number
  title: string
  subtitle: string
  projectLabel: string
  departmentLabel: string
  thumbnail: string | null
  dueDate: unknown
  status: unknown
}

/**
 * Convert a task row into a queue item for My Tasks left panel.
 */
export function toQueueItem(
  task: Record<string, unknown>,
  resolutionMap?: EntityResolutionMap
): QueueItemData {
  const entityCode = asText(task.entity_code).trim()
  const entityName = asText(task.entity_name).trim()
  const title = entityCode || entityName || asText(task.entity_link_label).trim() || `Task ${task.id}`

  return {
    id: Number(task.id),
    title,
    subtitle: asText(task.name).trim() || '-',
    projectLabel: asText(task.project_label).trim() || asText(task.project_id).trim() || '-',
    departmentLabel: resolutionMap
      ? (resolveLabel(task, 'department', resolutionMap) || asText(task.department_label).trim() || 'No Department')
      : (asText(task.department_label).trim() || 'No Department'),
    thumbnail: asText(task.entity_thumbnail_url).trim() || null,
    dueDate: task.due_date,
    status: task.status,
  }
}

export interface DetailContextData {
  entityTitle: string
  statusLabel: string
  description: string
  thumbnail: string | null
  projectLabel: string
  entityTypeDisplay: string
}

/**
 * Convert a task row into detail context data for My Tasks right panel header.
 */
export function toDetailContext(
  task: Record<string, unknown>
): DetailContextData {
  const entityCode = asText(task.entity_code).trim()
  const entityName = asText(task.entity_name).trim()
  let entityTitle = ''
  if (entityCode && entityName) entityTitle = `${entityCode} · ${entityName}`
  else if (entityCode) entityTitle = entityCode
  else if (entityName) entityTitle = entityName
  else entityTitle = asText(task.entity_link_label).trim() || `Task ${task.id}`

  return {
    entityTitle,
    statusLabel: asText(task.entity_status).trim() || asText(task.status).trim() || '-',
    description: asText(task.entity_description).trim() || `Task: ${asText(task.name).trim() || '-'}`,
    thumbnail: asText(task.entity_thumbnail_url).trim() || null,
    projectLabel: asText(task.project_label).trim() || '-',
    entityTypeDisplay: asText(task.entity_type_display).trim() || asText(task.entity_type).trim() || '-',
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isLongTextColumn(code: string): boolean {
  const patterns = ['description', 'notes', 'summary', 'comment', 'body', 'bio', 'details']
  const lower = code.toLowerCase()
  return patterns.some((p) => lower.includes(p))
}

/**
 * Primary name/code fields per entity type — the field that should link to the entity detail page.
 */
const PRIMARY_NAME_FIELDS: Record<string, string> = {
  task: 'name',
  shot: 'name',
  asset: 'name',
  sequence: 'name',
  version: 'code',
  note: 'subject',
  published_file: 'code',
}

function isPrimaryNameField(entity: string, fieldCode: string): boolean {
  return PRIMARY_NAME_FIELDS[entity] === fieldCode
}

/**
 * Build an href for navigating to the entity's own detail page.
 */
function buildSelfEntityHref(entity: string, projectId: string, rowId: string): string {
  if (!projectId) return '#'
  switch (entity) {
    case 'task': return `/apex/${projectId}/tasks/${rowId}`
    case 'shot': return `/apex/${projectId}/shots/${rowId}`
    case 'asset': return `/apex/${projectId}/assets/${rowId}`
    case 'sequence': return `/apex/${projectId}/sequences/${rowId}`
    case 'version': return `/apex/${projectId}/versions/${rowId}`
    case 'note': return `/apex/${projectId}/notes/${rowId}`
    case 'published_file': return `/apex/${projectId}/published-files/${rowId}`
    default: return '#'
  }
}

/** Entity types that have detail pages you can navigate to */
const NAVIGABLE_ENTITIES = new Set(['asset', 'shot', 'sequence', 'task', 'version', 'project'])

/**
 * Build a linkHref for an entity field if it points to a navigable entity type.
 * Returns undefined if the entity type is not navigable (e.g., profiles, departments).
 */
function buildEntityLinkHref(
  targetEntity: string,
  row: Record<string, unknown>,
  fieldCode: string
): string | undefined {
  if (!NAVIGABLE_ENTITIES.has(targetEntity)) return undefined

  const entityId = asText(row[fieldCode]).trim()
  if (!entityId) return undefined

  const projectId = asText(row.project_id).trim()

  switch (targetEntity) {
    case 'asset':
      return projectId ? `/apex/${projectId}/assets/${entityId}` : undefined
    case 'shot':
      return projectId ? `/apex/${projectId}/shots/${entityId}` : undefined
    case 'sequence':
      return projectId ? `/apex/${projectId}/sequences/${entityId}` : undefined
    case 'task':
      return projectId ? `/apex/${projectId}/tasks/${entityId}` : undefined
    case 'version':
      return projectId ? `/apex/${projectId}/versions/${entityId}` : undefined
    case 'project':
      return `/apex/${entityId}`
    default:
      return undefined
  }
}
