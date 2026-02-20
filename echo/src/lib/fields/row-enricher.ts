/**
 * Unified Field System — Row Enricher
 *
 * Applies entity resolution + computed fields to raw database rows.
 * Used by entity pages and My Tasks to transform raw DB rows into
 * display-ready rows with resolved labels and computed values.
 */

import type { EntityResolutionMap, FieldValue } from './types'
import { calculateAllComputedFields } from './computed-fields'
import { resolveLabel, getResolvedEntityData } from './entity-resolver'
import { FIELD_ENTITY_MAP } from './field-entity-map'
import { asText } from './utils'

/**
 * Enrich a single row with resolved entity labels and computed field values.
 *
 * Returns a new object with:
 * - All original fields
 * - `{fieldCode}_label` for each resolved entity field
 * - Computed field values
 * - For polymorphic entity_id: entity_name, entity_code, entity_status, etc.
 */
export function enrichRow(
  entity: string,
  row: Record<string, unknown>,
  resolutionMap: EntityResolutionMap
): Record<string, unknown> {
  const enriched: Record<string, unknown> = { ...row }

  // 1. Apply entity resolution labels
  const fieldMap = FIELD_ENTITY_MAP[entity] || {}
  for (const fieldCode of Object.keys(fieldMap)) {
    if (fieldCode === 'entity_id') continue // handled below
    const label = resolveLabel(row, fieldCode, resolutionMap)
    if (label) {
      enriched[`${fieldCode}_label`] = label
    }
  }

  // 2. Handle polymorphic entity_id resolution
  if (fieldMap.entity_id === 'auto') {
    const entityId = asText(row.entity_id).trim()
    if (entityId) {
      const entityType = asText(row.entity_type).trim().toLowerCase()
      const entityData = getResolvedEntityData(entityId, resolutionMap, entityType)
      if (entityData) {
        enriched.entity_name = asText(entityData.name).trim() || null
        enriched.entity_code = asText(entityData.code).trim() || null
        enriched.entity_status = asText(entityData.status).trim() || null
        enriched.entity_description = asText(entityData.description).trim() || null
        enriched.entity_thumbnail_url = asText(entityData.thumbnail_url).trim() || null
      }

      // Entity link label (computed from entity_code + entity_name)
      const label = resolveLabel(row, 'entity_id', resolutionMap)
      if (label) {
        enriched.entity_link_label = label
      }
    }
  }

  // 3. Apply computed fields
  const computed = calculateAllComputedFields(entity, enriched)
  for (const [key, value] of Object.entries(computed)) {
    // Only apply computed values that aren't already set from DB
    if (enriched[key] === undefined || enriched[key] === null) {
      enriched[key] = value
    }
  }

  return enriched
}

/**
 * Enrich multiple rows at once.
 */
export function enrichRows(
  entity: string,
  rows: Record<string, unknown>[],
  resolutionMap: EntityResolutionMap
): Record<string, unknown>[] {
  return rows.map((row) => enrichRow(entity, row, resolutionMap))
}

/**
 * Apply a cell update with computed field recalculation.
 *
 * Returns the complete patch to apply to the row (includes both
 * the direct change and any dependent computed fields).
 */
export function buildUpdatePatch(
  entity: string,
  row: Record<string, unknown>,
  fieldCode: string,
  value: unknown,
  resolutionMap?: EntityResolutionMap
): Record<string, FieldValue | unknown> {
  const updatedRow = { ...row, [fieldCode]: value }

  // Recalculate ALL computed fields with the updated row
  const computed = calculateAllComputedFields(entity, updatedRow)

  const patch: Record<string, FieldValue | unknown> = {
    [fieldCode]: value,
  }

  // Include computed field changes that have new values
  for (const [key, computedValue] of Object.entries(computed)) {
    patch[key] = computedValue
  }

  // Update resolved labels if the changed field is an entity link
  if (resolutionMap) {
    const label = resolveLabel(updatedRow, fieldCode, resolutionMap)
    if (label) {
      patch[`${fieldCode}_label`] = label
    }
  }

  return patch
}
