/**
 * Unified Field System — Field Update Handler
 *
 * Universal handler for field updates that:
 * 1. Normalizes the value based on field type
 * 2. Recalculates dependent computed fields
 * 3. Calls the entity-specific update action
 * 4. Returns the full patch for optimistic UI update
 */

import type { FieldBehavior, FieldValue, EntityResolutionMap } from './types'
import { getFieldType } from './field-types'
import { recalculateComputedFields } from './computed-fields'
import { resolveLabel } from './entity-resolver'

export interface UpdateResult {
  /** The values to optimistically apply to the local row */
  patch: Record<string, unknown>
  /** The payload that was sent to the server (DB-writable fields only) */
  serverPayload: Record<string, unknown>
}

/**
 * Prepare an update payload for a field change.
 *
 * Handles:
 * - Value normalization via the field type's serialize()
 * - Computed field recalculation for dependent fields
 * - Resolution label updates for entity-linked fields
 *
 * Returns the server payload (for DB write) and the local patch (for optimistic UI).
 */
export function prepareFieldUpdate(
  entity: string,
  row: Record<string, unknown>,
  fieldCode: string,
  rawValue: unknown,
  fieldBehaviors: FieldBehavior[],
  resolutionMap?: EntityResolutionMap
): UpdateResult {
  const fieldBehavior = fieldBehaviors.find((f) => f.code === fieldCode)
  const typeDef = fieldBehavior ? getFieldType(fieldBehavior.dataType) : null

  // Normalize the value
  const normalizedValue = typeDef
    ? typeDef.serialize(typeDef.parse(rawValue))
    : rawValue

  // Build the updated row for computation
  const updatedRow = { ...row, [fieldCode]: normalizedValue }

  // Calculate dependent computed fields
  const computed = recalculateComputedFields(entity, fieldCode, updatedRow)

  // Server payload: only DB-writable fields
  const serverPayload: Record<string, unknown> = {
    [fieldCode]: normalizedValue,
  }

  // Add computed fields that are persisted (have a column)
  for (const [key, value] of Object.entries(computed)) {
    const behavior = fieldBehaviors.find((f) => f.code === key)
    if (behavior?.column) {
      serverPayload[key] = value
    }
  }

  // Local patch: includes computed fields + resolved labels
  const patch: Record<string, unknown> = {
    [fieldCode]: normalizedValue,
    ...computed,
  }

  // Update resolved labels
  if (resolutionMap) {
    const label = resolveLabel(updatedRow, fieldCode, resolutionMap)
    if (label) {
      patch[`${fieldCode}_label`] = label
    }
  }

  return { patch, serverPayload }
}
