'use server'

import { createClient } from '@/lib/supabase/server'
import { EXCLUDED_FIELDS, ENTITY_TYPE_LABELS } from './event-types'

function toSnakeLabel(field: string): string {
  return field
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return 'empty'
  if (typeof val === 'boolean') return val ? 'true' : 'false'
  if (typeof val === 'object') return JSON.stringify(val)
  return String(val)
}

function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/**
 * Log entity creation. Fire-and-forget — never blocks the caller.
 */
export async function logEntityCreated(
  entityType: string,
  entityId: number | string,
  projectId: number | string | null,
  newValues: Record<string, unknown>
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const entityLabel = ENTITY_TYPE_LABELS[entityType] || entityType
    const name = newValues.name || newValues.code || entityId
    const description = `Created ${entityLabel} "${name}"`

    await supabase.from('activity_events').insert({
      project_id: projectId ? Number(projectId) : null,
      event_type: `${entityType}_created`,
      entity_type: entityType,
      entity_id: Number(entityId),
      actor_id: user.id,
      description,
      new_value: newValues,
    })
  } catch {
    // Fire-and-forget: never block mutations
  }
}

/**
 * Log entity update. Creates one event per changed field.
 * Fire-and-forget — never blocks the caller.
 */
export async function logEntityUpdated(
  entityType: string,
  entityId: number | string,
  projectId: number | string | null,
  oldValues: Record<string, unknown>,
  newValues: Record<string, unknown>
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const sessionId = generateSessionId()
    const entityLabel = ENTITY_TYPE_LABELS[entityType] || entityType
    const rows: Record<string, unknown>[] = []

    for (const key of Object.keys(newValues)) {
      if (EXCLUDED_FIELDS.has(key)) continue

      const oldVal = oldValues[key]
      const newVal = newValues[key]

      // Skip unchanged fields
      if (JSON.stringify(oldVal) === JSON.stringify(newVal)) continue

      const fieldLabel = toSnakeLabel(key)
      const description = `Changed ${fieldLabel} from "${formatValue(oldVal)}" to "${formatValue(newVal)}"`

      rows.push({
        project_id: projectId ? Number(projectId) : null,
        event_type: key === 'status' ? 'status_changed' : `${entityType}_updated`,
        entity_type: entityType,
        entity_id: Number(entityId),
        actor_id: user.id,
        attribute_name: key,
        old_value: oldVal !== undefined ? JSON.stringify(oldVal) : null,
        new_value: newVal !== undefined ? JSON.stringify(newVal) : null,
        field_data_type: typeof newVal,
        description,
        session_id: sessionId,
      })
    }

    if (rows.length > 0) {
      await supabase.from('activity_events').insert(rows)
    }
  } catch {
    // Fire-and-forget: never block mutations
  }
}

/**
 * Log entity deletion. Fire-and-forget — never blocks the caller.
 */
export async function logEntityDeleted(
  entityType: string,
  entityId: number | string,
  projectId: number | string | null,
  deletedData: Record<string, unknown>
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const entityLabel = ENTITY_TYPE_LABELS[entityType] || entityType
    const name = deletedData.name || deletedData.code || entityId
    const description = `Deleted ${entityLabel} "${name}"`

    await supabase.from('activity_events').insert({
      project_id: projectId ? Number(projectId) : null,
      event_type: `${entityType}_deleted`,
      entity_type: entityType,
      entity_id: Number(entityId),
      actor_id: user.id,
      description,
      old_value: deletedData,
    })
  } catch {
    // Fire-and-forget: never block mutations
  }
}
