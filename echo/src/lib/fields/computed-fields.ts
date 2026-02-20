/**
 * Unified Field System — Computed Fields Engine
 *
 * Declarative formulas that auto-recalculate when dependent fields change.
 * Covers: task duration, shot cut fields, version frames, my_tasks_bucket.
 */

import type { ComputedFieldFormula, FieldValue } from './types'
import { asText, parseNumber, workingDaysBetween } from './utils'

// ---------------------------------------------------------------------------
// My Tasks bucket classification (moved from lib/tasks/my-tasks-buckets.ts)
// ---------------------------------------------------------------------------

const DONE_KEYWORDS = [
  'done', 'complete', 'completed', 'approved', 'final',
  'closed', 'delivered', 'published', 'omit', 'omitted',
]

const UPCOMING_KEYWORDS = [
  'pending', 'todo', 'to do', 'not started', 'ready',
  'waiting', 'queued', 'backlog', 'on hold',
]

export type MyTasksBucket = 'active' | 'upcoming' | 'done'

export function getMyTasksBucket(status: unknown): MyTasksBucket {
  const normalized = asText(status).trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ')
  if (!normalized) return 'active'
  for (const kw of DONE_KEYWORDS) {
    if (normalized.includes(kw)) return 'done'
  }
  for (const kw of UPCOMING_KEYWORDS) {
    if (normalized.includes(kw)) return 'upcoming'
  }
  return 'active'
}

// ---------------------------------------------------------------------------
// Registered Computed Fields by Entity
// ---------------------------------------------------------------------------

const COMPUTED_FIELDS: Record<string, Record<string, ComputedFieldFormula>> = {
  task: {
    duration: {
      type: 'arithmetic',
      dependsOn: ['start_date', 'end_date'],
      resultType: 'duration',
      calculate(row) {
        const startRaw = asText(row.start_date).trim()
        const endRaw = asText(row.end_date).trim()
        if (!startRaw || !endRaw) return null
        const start = new Date(startRaw)
        const end = new Date(endRaw)
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null
        return workingDaysBetween(start, end)
      },
    },

    days_remaining: {
      type: 'date_diff',
      dependsOn: ['due_date'],
      resultType: 'number',
      calculate(row) {
        const dueRaw = asText(row.due_date).trim()
        if (!dueRaw) return null
        const due = new Date(dueRaw)
        if (Number.isNaN(due.getTime())) return null
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        due.setHours(0, 0, 0, 0)
        const diffMs = due.getTime() - today.getTime()
        return Math.ceil(diffMs / (24 * 60 * 60 * 1000))
      },
    },

    days_overdue: {
      type: 'conditional',
      dependsOn: ['due_date'],
      resultType: 'number',
      calculate(row) {
        const dueRaw = asText(row.due_date).trim()
        if (!dueRaw) return null
        const due = new Date(dueRaw)
        if (Number.isNaN(due.getTime())) return null
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        due.setHours(0, 0, 0, 0)
        const diffMs = today.getTime() - due.getTime()
        const days = Math.ceil(diffMs / (24 * 60 * 60 * 1000))
        return days > 0 ? days : 0
      },
    },

    is_overdue: {
      type: 'conditional',
      dependsOn: ['due_date', 'status'],
      resultType: 'checkbox',
      calculate(row) {
        const dueRaw = asText(row.due_date).trim()
        if (!dueRaw) return false
        const due = new Date(dueRaw)
        if (Number.isNaN(due.getTime())) return false
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        due.setHours(0, 0, 0, 0)
        if (due >= today) return false
        const status = asText(row.status).trim().toLowerCase()
        const doneStatuses = ['fin', 'final', 'done', 'complete', 'completed', 'approved', 'delivered']
        return !doneStatuses.includes(status)
      },
    },

    my_tasks_bucket: {
      type: 'conditional',
      dependsOn: ['status'],
      resultType: 'list',
      calculate(row) {
        return getMyTasksBucket(row.status)
      },
    },

    entity_link_label: {
      type: 'concat',
      dependsOn: ['entity_code', 'entity_name'],
      resultType: 'text',
      calculate(row) {
        const code = asText(row.entity_code).trim()
        const name = asText(row.entity_name).trim()
        if (code && name) return `${code} - ${name}`
        return code || name || '-'
      },
    },

    entity_type_display: {
      type: 'concat',
      dependsOn: ['entity_type'],
      resultType: 'text',
      calculate(row) {
        const et = asText(row.entity_type).trim().toLowerCase()
        if (!et) return 'Unknown'
        return et.charAt(0).toUpperCase() + et.slice(1)
      },
    },

    entity_link_path: {
      type: 'concat',
      dependsOn: ['project_id', 'entity_type', 'entity_id'],
      resultType: 'text',
      calculate(row) {
        const projectId = asText(row.project_id).trim()
        const entityType = asText(row.entity_type).trim().toLowerCase()
        const entityId = asText(row.entity_id).trim()
        if (!projectId || !entityId) return null
        if (entityType === 'asset') return `/apex/${projectId}/assets/${entityId}`
        if (entityType === 'shot') return `/apex/${projectId}/shots/${entityId}`
        if (entityType === 'sequence') return `/apex/${projectId}/sequences/${entityId}`
        if (entityType === 'project') return `/apex/${projectId}`
        return null
      },
    },
  },

  shot: {
    cut_duration: {
      type: 'frame',
      dependsOn: ['cut_in', 'cut_out'],
      resultType: 'number',
      calculate(row) {
        const cutIn = parseNumber(row.cut_in)
        const cutOut = parseNumber(row.cut_out)
        if (cutIn === null || cutOut === null) return null
        return cutOut - cutIn + 1
      },
    },

    head_duration: {
      type: 'frame',
      dependsOn: ['head_in', 'cut_in'],
      resultType: 'number',
      calculate(row) {
        const headIn = parseNumber(row.head_in)
        const cutIn = parseNumber(row.cut_in)
        if (headIn === null || cutIn === null) return null
        return cutIn - headIn
      },
    },

    tail_duration: {
      type: 'frame',
      dependsOn: ['cut_out', 'tail_out'],
      resultType: 'number',
      calculate(row) {
        const cutOut = parseNumber(row.cut_out)
        const tailOut = parseNumber(row.tail_out)
        if (cutOut === null || tailOut === null) return null
        return tailOut - cutOut
      },
    },

    working_duration: {
      type: 'frame',
      dependsOn: ['head_in', 'tail_out'],
      resultType: 'number',
      calculate(row) {
        const headIn = parseNumber(row.head_in)
        const tailOut = parseNumber(row.tail_out)
        if (headIn === null || tailOut === null) return null
        return tailOut - headIn + 1
      },
    },

    frame_summary: {
      type: 'concat',
      dependsOn: ['head_in', 'cut_in', 'cut_out', 'tail_out'],
      resultType: 'text',
      calculate(row) {
        const headIn = parseNumber(row.head_in)
        const cutIn = parseNumber(row.cut_in)
        const cutOut = parseNumber(row.cut_out)
        const tailOut = parseNumber(row.tail_out)
        if (headIn === null || cutIn === null || cutOut === null || tailOut === null) {
          return null
        }
        const cutDur = cutOut - cutIn + 1
        const headDur = cutIn - headIn
        const tailDur = tailOut - cutOut
        const workDur = tailOut - headIn + 1
        return `Cut: ${cutDur}f | Head: ${headDur}f | Tail: ${tailDur}f | Working: ${workDur}f`
      },
    },
  },

  version: {
    frame_count: {
      type: 'frame',
      dependsOn: ['first_frame', 'last_frame'],
      resultType: 'number',
      calculate(row) {
        const first = parseNumber(row.first_frame)
        const last = parseNumber(row.last_frame)
        if (first === null || last === null) return null
        return last - first + 1
      },
    },

    duration_seconds: {
      type: 'arithmetic',
      dependsOn: ['first_frame', 'last_frame', 'frame_rate'],
      resultType: 'float',
      calculate(row) {
        const first = parseNumber(row.first_frame)
        const last = parseNumber(row.last_frame)
        const fps = parseNumber(row.frame_rate)
        if (first === null || last === null || fps === null || fps === 0) return null
        const frameCount = last - first + 1
        return frameCount / fps
      },
    },
  },
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get all computed field formulas for an entity.
 */
export function getComputedFormulas(
  entity: string
): Record<string, ComputedFieldFormula> {
  return COMPUTED_FIELDS[entity] || {}
}

/**
 * Get the formula for a specific computed field.
 */
export function getComputedFormula(
  entity: string,
  fieldCode: string
): ComputedFieldFormula | null {
  return COMPUTED_FIELDS[entity]?.[fieldCode] || null
}

/**
 * When a field changes, recalculate all dependent computed fields.
 * Returns the patch object of computed values to apply.
 */
export function recalculateComputedFields(
  entity: string,
  changedField: string,
  row: Record<string, unknown>
): Record<string, FieldValue> {
  const entityFormulas = COMPUTED_FIELDS[entity]
  if (!entityFormulas) return {}

  const patch: Record<string, FieldValue> = {}

  for (const [fieldCode, formula] of Object.entries(entityFormulas)) {
    if (formula.dependsOn.includes(changedField)) {
      patch[fieldCode] = formula.calculate(row)
    }
  }

  return patch
}

/**
 * Calculate ALL computed fields for a row (used on initial load).
 */
export function calculateAllComputedFields(
  entity: string,
  row: Record<string, unknown>
): Record<string, FieldValue> {
  const entityFormulas = COMPUTED_FIELDS[entity]
  if (!entityFormulas) return {}

  const result: Record<string, FieldValue> = {}

  for (const [fieldCode, formula] of Object.entries(entityFormulas)) {
    result[fieldCode] = formula.calculate(row)
  }

  return result
}
