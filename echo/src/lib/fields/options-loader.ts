/**
 * Unified Field System — Universal Options Loader
 *
 * Loads dropdown options for ANY field on ANY entity.
 * Replaces loadEntityFieldOptionMap() in entity-field-options.ts.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { FieldBehavior, FieldOption, ExtendedEntityKey } from './types'
import { ENTITY_LINK_REGISTRY } from './entity-links'
import { FIELD_ENTITY_MAP } from './field-entity-map'
import { asText, isMissingTableError } from './utils'

// ---------------------------------------------------------------------------
// Status options
// ---------------------------------------------------------------------------

const STATUS_TABLE_CANDIDATES = ['statuses', 'status'] as const

async function loadStatusOptions(
  supabase: SupabaseClient,
  entityType: string
): Promise<FieldOption[]> {
  for (const table of STATUS_TABLE_CANDIDATES) {
    const result = await supabase.from(table).select('*')
    if (result.error) {
      if (isMissingTableError(result.error)) continue
      throw new Error(String(result.error.message || 'Failed to load statuses'))
    }

    const rows = (result.data || []) as unknown as Array<Record<string, unknown>>
    if (rows.length === 0) continue

    // Try to load entity type mapping
    const mappingResult = await supabase
      .from('status_entity_types')
      .select('status_id, entity_type')
    const hasMapping = !mappingResult.error

    const entityTypesByStatusId = new Map<number, string[]>()
    if (hasMapping) {
      for (const item of (mappingResult.data || []) as unknown as Array<Record<string, unknown>>) {
        const statusId = Number(item.status_id)
        if (Number.isNaN(statusId)) continue
        const mapped = asText(item.entity_type).trim().toLowerCase()
        if (!mapped) continue
        const list = entityTypesByStatusId.get(statusId) || []
        list.push(mapped)
        entityTypesByStatusId.set(statusId, list)
      }
    }

    const targetEntity = entityType.trim().toLowerCase()
    const sortKey = rows[0] && 'sort_order' in rows[0] ? 'sort_order' : null
    const nameKey = rows[0] && 'name' in rows[0] ? 'name' : 'status_name'

    const sorted = [...rows].sort((a, b) => {
      if (sortKey) {
        const aOrder = Number(a[sortKey])
        const bOrder = Number(b[sortKey])
        if (!Number.isNaN(aOrder) && !Number.isNaN(bOrder) && aOrder !== bOrder) {
          return aOrder - bOrder
        }
      }
      return asText(a[nameKey]).localeCompare(asText(b[nameKey]))
    })

    const options: FieldOption[] = []
    const fallback: FieldOption[] = []
    const seen = new Set<string>()
    const seenFallback = new Set<string>()

    for (const row of sorted) {
      const name = asText(row[nameKey]).trim()
      if (!name) continue
      const normalized = name.toLowerCase()

      if (!seenFallback.has(normalized)) {
        seenFallback.add(normalized)
        fallback.push({ value: name, label: name })
      }

      const rowId = Number(row.id)
      const mapped = Number.isNaN(rowId) ? [] : entityTypesByStatusId.get(rowId) || []
      const rowTypes = hasMapping
        ? (mapped.length > 0 ? mapped : ['all'])
        : (asText(row.entity_type).trim() ? [asText(row.entity_type).trim().toLowerCase()] : ['all'])

      if (!rowTypes.includes('all') && !rowTypes.includes(targetEntity)) continue
      if (seen.has(normalized)) continue
      seen.add(normalized)
      options.push({ value: name, label: name })
    }

    return options.length > 0 ? options : fallback
  }

  return []
}

// ---------------------------------------------------------------------------
// Tag options
// ---------------------------------------------------------------------------

async function loadTagOptions(supabase: SupabaseClient): Promise<FieldOption[]> {
  for (const table of ['tags', 'tag'] as const) {
    const result = await supabase.from(table).select('*')
    if (result.error) {
      if (isMissingTableError(result.error)) continue
      throw new Error(String(result.error.message || 'Failed to load tags'))
    }
    const names = ((result.data || []) as unknown as Array<Record<string, unknown>>)
      .map((row) => asText(row.name || row.tag_name).trim())
      .filter(Boolean)
    const unique = Array.from(new Set(names)).sort((a, b) => a.localeCompare(b))
    return unique.map((name) => ({ value: name, label: name }))
  }
  return []
}

// ---------------------------------------------------------------------------
// Entity table options (departments, profiles, etc.)
// ---------------------------------------------------------------------------

async function loadEntityTableOptions(
  supabase: SupabaseClient,
  targetEntity: string
): Promise<FieldOption[]> {
  const config = ENTITY_LINK_REGISTRY[targetEntity]
  if (!config) return []

  const { data, error } = await supabase
    .from(config.table)
    .select(config.displayColumns.join(', '))
    .order(config.displayColumns[1] || config.valueColumn)

  if (error) {
    if (isMissingTableError(error)) return []
    throw new Error(String(error.message || 'Failed to load options'))
  }

  return ((data || []) as unknown as Array<Record<string, unknown>>).map((record) => ({
    value: String(record[config.valueColumn]),
    label: config.formatLabel(record),
  }))
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Load all field options for an entity at once.
 * Returns a map of fieldCode → FieldOption[].
 */
export async function loadAllFieldOptions(
  supabase: SupabaseClient,
  entity: ExtendedEntityKey,
  _fieldBehaviors?: FieldBehavior[]
): Promise<Record<string, FieldOption[]>> {
  const result: Record<string, FieldOption[]> = {}

  // Always load status options
  const statusOptions = await loadStatusOptions(supabase, entity)
  if (statusOptions.length > 0) {
    result.status = statusOptions
  }

  // Always load tag options
  const tagOptions = await loadTagOptions(supabase)
  if (tagOptions.length > 0) {
    result.tags = tagOptions
  }

  // Load entity-linked field options based on the field-entity map
  const fieldMap = FIELD_ENTITY_MAP[entity] || {}
  const loadedTargets = new Set<string>()

  for (const [fieldCode, targetEntity] of Object.entries(fieldMap)) {
    if (targetEntity === 'auto') continue // polymorphic — can't preload
    if (targetEntity === 'project') continue // not typically a dropdown
    if (loadedTargets.has(targetEntity)) {
      // Reuse already-loaded options for same target
      const existing = Object.entries(result).find(([, opts]) => {
        const firstField = Object.entries(fieldMap).find(
          ([, t]) => t === targetEntity && result[fieldCode] === undefined
        )
        return firstField !== undefined && opts.length > 0
      })
      if (existing) {
        result[fieldCode] = existing[1]
        continue
      }
    }

    const options = await loadEntityTableOptions(supabase, targetEntity)
    if (options.length > 0) {
      result[fieldCode] = options
      loadedTargets.add(targetEntity)

      // Share options with other fields that link to the same target
      for (const [otherField, otherTarget] of Object.entries(fieldMap)) {
        if (otherTarget === targetEntity && otherField !== fieldCode && !result[otherField]) {
          result[otherField] = options
        }
      }
    }
  }

  return result
}

/**
 * Load options for a single field.
 */
export async function loadFieldOptions(
  supabase: SupabaseClient,
  entity: string,
  fieldCode: string
): Promise<FieldOption[]> {
  if (fieldCode === 'status') {
    return loadStatusOptions(supabase, entity)
  }
  if (fieldCode === 'tags') {
    return loadTagOptions(supabase)
  }

  const targetEntity = FIELD_ENTITY_MAP[entity]?.[fieldCode]
  if (!targetEntity || targetEntity === 'auto') return []

  return loadEntityTableOptions(supabase, targetEntity)
}
