/**
 * Unified Field System — Shared Utilities
 *
 * Single source of truth for value conversion helpers that were
 * previously duplicated across 6+ files (shots/page.tsx, assets/page.tsx,
 * my-tasks/page.tsx, entity-field-options.ts, etc.).
 */

/** Convert unknown value to string safely */
export function asText(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return value.map(asText).join(', ')
  return String(value)
}

/** Parse a value that might be a string, array, JSON string, or CSV into string[] */
export function parseTextArray(value: unknown): string[] {
  if (value === null || value === undefined) return []
  if (Array.isArray(value)) {
    return value.map((item) => asText(item).trim()).filter(Boolean)
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return []
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed)
        if (Array.isArray(parsed)) {
          return parsed.map((item) => asText(item).trim()).filter(Boolean)
        }
      } catch {
        // fall through to CSV parse
      }
    }
    return trimmed.split(',').map((item) => item.trim()).filter(Boolean)
  }
  return []
}

/** Join string array to comma-separated string */
export function arrayToString(value: string[]): string {
  return value.filter(Boolean).join(', ')
}

/** Parse a safe number from unknown value */
export function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

/** Convert unknown to a trimmed string ID key */
export function toIdKey(value: unknown): string {
  return asText(value).trim()
}

/** Parse a numeric ID, return null if invalid */
export function toNumericId(value: unknown): number | null {
  const parsed = Number(value)
  return Number.isNaN(parsed) ? null : parsed
}

/** Title-case a string (first letter uppercase, rest lowercase) */
export function titleCase(value: string): string {
  const trimmed = value.trim().toLowerCase()
  if (!trimmed) return ''
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
}

/** Normalize a nullable text value — returns null if empty */
export function normalizeNullableText(value: unknown): string | null {
  const trimmed = asText(value).trim()
  return trimmed || null
}

/** Calculate working days between two dates (exclude weekends) */
export function workingDaysBetween(start: Date, end: Date): number {
  let count = 0
  const current = new Date(start)
  while (current <= end) {
    const day = current.getDay()
    if (day !== 0 && day !== 6) count++
    current.setDate(current.getDate() + 1)
  }
  return count
}

/** Check if a Supabase error indicates a missing table */
export function isMissingTableError(error: unknown): boolean {
  if (!error) return false
  const record = error as Record<string, unknown>
  const code = String(record.code || '')
  const message = String(record.message || '').toLowerCase()
  const details = String(record.details || '').toLowerCase()
  return (
    code === 'PGRST205' ||
    message.includes('could not find the table') ||
    (message.includes('relation') && message.includes('does not exist')) ||
    details.includes('does not exist')
  )
}
