/**
 * Unified Field System — Entity Resolver
 *
 * Batch-resolves entity IDs to display labels across all entity-linked fields.
 * Supports cross-project resolution for My Tasks and similar global views.
 *
 * Replaces manual entity resolution code duplicated in every page (~110 lines per page).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { EntityResolutionMap, ResolveOptions } from './types'
import { ENTITY_LINK_REGISTRY } from './entity-links'
import { FIELD_ENTITY_MAP } from './field-entity-map'
import { asText, parseTextArray, isMissingTableError } from './utils'

/**
 * Resolve entity links for multiple rows at once.
 *
 * Returns Map<fieldCode, Map<entityId, displayLabel>>
 *
 * Example:
 *   const map = await resolveEntityLinks(supabase, 'task', tasks)
 *   const assigneeName = map.get('assigned_to')?.get(task.assigned_to) || 'Unassigned'
 */
export async function resolveEntityLinks(
  supabase: SupabaseClient,
  entity: string,
  rows: Record<string, unknown>[],
  options?: ResolveOptions
): Promise<EntityResolutionMap> {
  const resolutionMap: EntityResolutionMap = new Map()
  const fieldMap = FIELD_ENTITY_MAP[entity] || {}

  // Group fields by target entity to minimize queries
  const targetToFields = new Map<string, string[]>()

  for (const [fieldCode, targetEntity] of Object.entries(fieldMap)) {
    if (targetEntity === 'auto') continue // handled separately
    const fields = targetToFields.get(targetEntity) || []
    fields.push(fieldCode)
    targetToFields.set(targetEntity, fields)
  }

  // Batch resolve each target entity type
  const promises: Promise<void>[] = []

  for (const [targetEntity, fieldCodes] of targetToFields) {
    const config = ENTITY_LINK_REGISTRY[targetEntity]
    if (!config) continue

    // Collect unique IDs across all fields for this target
    const allIds = new Set<string>()
    for (const fieldCode of fieldCodes) {
      for (const row of rows) {
        const value = row[fieldCode]
        if (value === null || value === undefined) continue

        // Multi-entity fields have arrays of IDs
        if (Array.isArray(value) || (typeof value === 'string' && value.includes(','))) {
          for (const id of parseTextArray(value)) {
            if (id) allIds.add(id)
          }
        } else {
          const id = asText(value).trim()
          if (id) allIds.add(id)
        }
      }
    }

    if (allIds.size === 0) continue

    promises.push(
      (async () => {
        try {
          const ids = Array.from(allIds)
          const { data, error } = await supabase
            .from(config.table)
            .select(config.displayColumns.join(', '))
            .in(config.valueColumn, ids)

          if (error) {
            if (isMissingTableError(error)) return
            console.error(`Failed to resolve ${targetEntity}:`, error.message)
            return
          }

          const labelMap = new Map<string, string>()
          for (const record of (data || []) as unknown as Record<string, unknown>[]) {
            const id = String(record[config.valueColumn])
            labelMap.set(id, config.formatLabel(record))
          }

          // Apply the same label map to all fields that share this target
          for (const fieldCode of fieldCodes) {
            resolutionMap.set(fieldCode, labelMap)
          }
        } catch (err) {
          console.error(`Error resolving ${targetEntity}:`, err)
        }
      })()
    )
  }

  // Handle polymorphic entity_id fields (entity_type + entity_id)
  if (fieldMap.entity_id === 'auto') {
    promises.push(resolvePolymorphicEntityIds(supabase, rows, resolutionMap, options))
  }

  await Promise.all(promises)
  return resolutionMap
}

function toPolymorphicResolutionKey(entityType: string, entityId: string): string {
  return `${entityType.trim().toLowerCase()}:${entityId.trim()}`
}

/**
 * Resolve polymorphic entity_id fields where the target table depends
 * on the row's entity_type column.
 */
async function resolvePolymorphicEntityIds(
  supabase: SupabaseClient,
  rows: Record<string, unknown>[],
  resolutionMap: EntityResolutionMap,
  _options?: ResolveOptions
): Promise<void> {
  // Group rows by entity_type
  const byType = new Map<string, Set<string>>()

  for (const row of rows) {
    const entityType = asText(row.entity_type).trim().toLowerCase()
    const entityId = asText(row.entity_id).trim()
    if (!entityType || !entityId) continue

    const ids = byType.get(entityType) || new Set()
    ids.add(entityId)
    byType.set(entityType, ids)
  }

  const combinedLabelMap = new Map<string, string>()
  const combinedDataMap = new Map<string, Record<string, unknown>>()
  const promises: Promise<void>[] = []

  for (const [entityType, ids] of byType) {
    const config = ENTITY_LINK_REGISTRY[entityType]
    if (!config) continue

    promises.push(
      (async () => {
        try {
          const { data, error } = await supabase
            .from(config.table)
            .select(config.displayColumns.join(', '))
            .in(config.valueColumn, Array.from(ids))

          if (error) {
            if (isMissingTableError(error)) return
            console.error(`Failed to resolve ${entityType} entities:`, error.message)
            return
          }

          for (const record of (data || []) as unknown as Record<string, unknown>[]) {
            const id = String(record[config.valueColumn])
            const typedKey = toPolymorphicResolutionKey(entityType, id)
            const label = config.formatLabel(record)

            combinedLabelMap.set(typedKey, label)
            combinedDataMap.set(typedKey, record)

            // Backward compatibility for consumers that only have the raw id.
            // Keep first value to avoid cross-entity collisions overwriting each other.
            if (!combinedLabelMap.has(id)) {
              combinedLabelMap.set(id, label)
            }
            if (!combinedDataMap.has(id)) {
              combinedDataMap.set(id, record)
            }
          }
        } catch (err) {
          console.error(`Error resolving ${entityType} entities:`, err)
        }
      })()
    )
  }

  await Promise.all(promises)

  resolutionMap.set('entity_id', combinedLabelMap)
  resolutionMap.set('__entity_data', combinedDataMap as unknown as Map<string, string>)
}

/**
 * Convenience: resolve a single field's label from the resolution map.
 */
export function resolveLabel(
  row: Record<string, unknown>,
  fieldCode: string,
  resolutionMap: EntityResolutionMap
): string {
  const labelMap = resolutionMap.get(fieldCode)
  if (!labelMap) return asText(row[fieldCode]).trim()
  const id = asText(row[fieldCode]).trim()
  if (!id) return ''

  if (fieldCode === 'entity_id') {
    const entityType = asText(row.entity_type).trim().toLowerCase()
    if (entityType) {
      const typedKey = toPolymorphicResolutionKey(entityType, id)
      const typedLabel = labelMap.get(typedKey)
      if (typedLabel) return typedLabel
    }
  }

  return labelMap.get(id) || id
}

/**
 * Get the full resolved entity data record from the resolution map.
 * Useful for polymorphic entity_id fields where you need status, thumbnail, etc.
 */
export function getResolvedEntityData(
  entityId: string,
  resolutionMap: EntityResolutionMap,
  entityType?: string | null
): Record<string, unknown> | null {
  const dataMap = resolutionMap.get('__entity_data') as unknown as Map<string, Record<string, unknown>> | undefined
  if (!dataMap) return null

  const normalizedType = asText(entityType).trim().toLowerCase()
  if (normalizedType) {
    const typedRecord = dataMap.get(toPolymorphicResolutionKey(normalizedType, entityId))
    if (typedRecord) return typedRecord
  }

  return dataMap.get(entityId) || null
}
