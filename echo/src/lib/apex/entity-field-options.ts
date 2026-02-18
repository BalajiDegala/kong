import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  EntityHeaderFieldDraft,
  HeaderEntityKey,
  HeaderFieldOption,
  HeaderFieldValue,
} from '@/lib/apex/entity-header-fields'

export type EntityFieldEditor = 'select' | 'multiselect'

export interface EntityFieldOptionConfig {
  editor: EntityFieldEditor
  options: HeaderFieldOption[]
}

export type EntityFieldOptionMap = Record<string, EntityFieldOptionConfig>

const STATUS_TABLE_CANDIDATES = ['statuses', 'status'] as const
const TAG_TABLE_CANDIDATES = ['tags', 'tag'] as const
const STATUS_ENTITY_TYPES_TABLE = 'status_entity_types'

function asText(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value)
}

function isMissingTableError(error: unknown): boolean {
  if (!error) return false
  const errorRecord = error as Record<string, unknown>
  const code = String(errorRecord.code || '')
  const message = String(errorRecord.message || '').toLowerCase()
  const details = String(errorRecord.details || '').toLowerCase()
  return (
    code === 'PGRST205' ||
    message.includes('could not find the table') ||
    (message.includes('relation') && message.includes('does not exist')) ||
    details.includes('does not exist')
  )
}

function collectColumns(rows: Array<Record<string, unknown>>): Set<string> {
  const columns = new Set<string>()
  for (const row of rows) {
    for (const key of Object.keys(row || {})) {
      columns.add(key)
    }
  }
  return columns
}

function resolveColumn(columns: Set<string>, candidates: string[]): string | null {
  for (const candidate of candidates) {
    if (columns.has(candidate)) return candidate
  }
  return null
}

async function readRowsFromCandidates(
  supabase: SupabaseClient,
  candidates: readonly string[]
): Promise<Array<Record<string, unknown>>> {
  for (const table of candidates) {
    const result = await supabase.from(table).select('*')
    if (!result.error) return (result.data || []) as Array<Record<string, unknown>>
    if (!isMissingTableError(result.error)) {
      throw new Error(asText((result.error as Record<string, unknown>).message) || 'Failed to load options')
    }
  }
  return []
}

function normalizeEntityTypes(values: string[]): string[] {
  const cleaned = values
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
  const unique = Array.from(new Set(cleaned))
  if (unique.includes('all')) return ['all']
  return unique.length > 0 ? unique : ['all']
}

async function loadStatusOptions(supabase: SupabaseClient, entityType: HeaderEntityKey) {
  const targetEntity = asText(entityType).trim().toLowerCase()
  const rows = await readRowsFromCandidates(supabase, STATUS_TABLE_CANDIDATES)
  if (rows.length === 0) return []

  const columns = collectColumns(rows)
  const idKey = resolveColumn(columns, ['id']) || 'id'
  const nameKey = resolveColumn(columns, ['name', 'status_name']) || 'name'
  const entityTypeKey = resolveColumn(columns, ['entity_type'])
  const sortOrderKey = resolveColumn(columns, ['sort_order', 'order', 'order_index'])

  const entityTypesByStatusId = new Map<number, string[]>()
  const mappingResult = await supabase
    .from(STATUS_ENTITY_TYPES_TABLE)
    .select('status_id, entity_type')

  const hasEntityTypeMapping = !mappingResult.error
  if (hasEntityTypeMapping) {
    for (const item of (mappingResult.data || []) as Array<Record<string, unknown>>) {
      const statusId = Number(item.status_id)
      if (Number.isNaN(statusId)) continue
      const mappedType = asText(item.entity_type).trim().toLowerCase()
      if (!mappedType) continue
      const list = entityTypesByStatusId.get(statusId) || []
      list.push(mappedType)
      entityTypesByStatusId.set(statusId, list)
    }
  } else if (!isMissingTableError(mappingResult.error)) {
    throw new Error(
      asText((mappingResult.error as Record<string, unknown>).message) ||
        'Failed to load status mappings'
    )
  }

  const orderedRows = [...rows].sort((a, b) => {
    if (sortOrderKey) {
      const aOrder = Number(a?.[sortOrderKey])
      const bOrder = Number(b?.[sortOrderKey])
      if (!Number.isNaN(aOrder) && !Number.isNaN(bOrder) && aOrder !== bOrder) {
        return aOrder - bOrder
      }
    }
    const aName = asText(a?.[nameKey]).toLowerCase()
    const bName = asText(b?.[nameKey]).toLowerCase()
    return aName.localeCompare(bName)
  })

  const options: HeaderFieldOption[] = []
  const seen = new Set<string>()
  const fallbackOptions: HeaderFieldOption[] = []
  const fallbackSeen = new Set<string>()

  for (const row of orderedRows) {
    const name = asText(row?.[nameKey]).trim()
    if (!name) continue
    const normalized = name.toLowerCase()

    if (!fallbackSeen.has(normalized)) {
      fallbackSeen.add(normalized)
      fallbackOptions.push({ value: name, label: name })
    }

    const rowStatusId = Number(row?.[idKey])
    const mappedTypes = Number.isNaN(rowStatusId)
      ? []
      : entityTypesByStatusId.get(rowStatusId) || []
    const fallbackType = entityTypeKey ? asText(row?.[entityTypeKey]) : ''
    const rowEntityTypes = hasEntityTypeMapping
      ? normalizeEntityTypes(mappedTypes)
      : normalizeEntityTypes(fallbackType ? [fallbackType] : ['all'])

    if (!rowEntityTypes.includes('all') && !rowEntityTypes.includes(targetEntity)) continue
    if (seen.has(normalized)) continue
    seen.add(normalized)
    options.push({ value: name, label: name })
  }

  return options.length > 0 ? options : fallbackOptions
}

async function loadTagOptions(supabase: SupabaseClient) {
  const rows = await readRowsFromCandidates(supabase, TAG_TABLE_CANDIDATES)
  const names = rows
    .map((row) => asText(row.name || row.tag_name).trim())
    .filter(Boolean)
  const unique = Array.from(new Set(names)).sort((a, b) => a.localeCompare(b))
  return unique.map((name) => ({ value: name, label: name }))
}

async function loadDepartmentOptions(supabase: SupabaseClient) {
  const result = await supabase
    .from('departments')
    .select('id, name, code')
    .order('name', { ascending: true })
  if (result.error) {
    if (isMissingTableError(result.error)) return []
    throw new Error(
      asText((result.error as Record<string, unknown>).message) ||
        'Failed to load departments'
    )
  }

  return ((result.data || []) as Array<Record<string, unknown>>).map((department) => {
    const id = asText(department.id).trim()
    const label =
      asText(department.code).trim() ||
      asText(department.name).trim() ||
      id
    return {
      value: id,
      label,
    }
  })
}

async function loadProfileOptions(supabase: SupabaseClient) {
  const result = await supabase
    .from('profiles')
    .select('id, display_name, full_name, email')
    .order('display_name', { ascending: true })
  if (result.error) {
    if (isMissingTableError(result.error)) return []
    throw new Error(
      asText((result.error as Record<string, unknown>).message) || 'Failed to load users'
    )
  }

  return ((result.data || []) as Array<Record<string, unknown>>).map((profile) => {
    const id = asText(profile.id).trim()
    const label =
      asText(profile.display_name).trim() ||
      asText(profile.full_name).trim() ||
      asText(profile.email).trim() ||
      id
    return {
      value: id,
      label,
    }
  })
}

function toStringArray(value: HeaderFieldValue): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => asText(item).trim())
      .filter(Boolean)
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }
  return []
}

function dedupeOptionsForField(
  options: HeaderFieldOption[],
  selectedValues: Set<string>
): HeaderFieldOption[] {
  const byLabel = new Map<string, HeaderFieldOption>()
  for (const option of options) {
    const normalizedLabel = asText(option.label).trim().toLowerCase()
    if (!normalizedLabel) continue
    const existing = byLabel.get(normalizedLabel)
    if (!existing) {
      byLabel.set(normalizedLabel, option)
      continue
    }

    const existingSelected = selectedValues.has(existing.value)
    const incomingSelected = selectedValues.has(option.value)
    if (!existingSelected && incomingSelected) {
      byLabel.set(normalizedLabel, option)
    }
  }
  return Array.from(byLabel.values())
}

export function applyFieldOptionMap<T extends EntityHeaderFieldDraft>(
  fields: T[],
  optionMap: EntityFieldOptionMap
): T[] {
  return fields.map((field) => {
    const key = asText(field.column || field.id).trim().toLowerCase()
    const config = optionMap[key]
    if (!config) return field
    if (!field.column || field.type === 'readonly') return field

    const nextValue =
      config.editor === 'multiselect'
        ? toStringArray(field.value)
        : (() => {
            if (Array.isArray(field.value)) return field.value[0] || null
            return field.value
          })()

    const selectedValues = new Set(
      config.editor === 'multiselect'
        ? toStringArray(nextValue)
        : [asText(nextValue).trim()].filter(Boolean)
    )
    const dedupedOptions = dedupeOptionsForField(config.options, selectedValues)

    return {
      ...field,
      type: config.editor,
      value: nextValue,
      editable: true,
      options: dedupedOptions,
    }
  })
}

export async function loadEntityFieldOptionMap(
  supabase: SupabaseClient,
  entity: HeaderEntityKey
): Promise<EntityFieldOptionMap> {
  const [statusOptions, tagOptions] = await Promise.all([
    loadStatusOptions(supabase, entity),
    loadTagOptions(supabase),
  ])

  const map: EntityFieldOptionMap = {}
  if (statusOptions.length > 0) {
    map.status = {
      editor: 'select',
      options: statusOptions,
    }
  }
  if (tagOptions.length > 0) {
    map.tags = {
      editor: 'multiselect',
      options: tagOptions,
    }
  }

  if (entity === 'task' || entity === 'version') {
    const departmentOptions = await loadDepartmentOptions(supabase)
    if (departmentOptions.length > 0) {
      map.department = {
        editor: 'select',
        options: departmentOptions,
      }
    }
  }

  if (entity === 'task') {
    const userOptions = await loadProfileOptions(supabase)
    if (userOptions.length > 0) {
      map.assigned_to = {
        editor: 'select',
        options: userOptions,
      }
      map.reviewer = {
        editor: 'multiselect',
        options: userOptions,
      }
      map.ayon_assignees = {
        editor: 'multiselect',
        options: userOptions,
      }
    }
  }

  return map
}
