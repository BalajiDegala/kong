/**
 * Unified Field System — Filter Helpers
 *
 * Generates filter options from field behaviors and row data.
 * Used by My Tasks filter drawer and future filter UIs.
 */

import { asText } from './utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FilterOption {
  value: string
  label: string
  count: number
}

export interface FilterSection {
  key: string
  label: string
  options: FilterOption[]
}

export type DateFilterBucket =
  | 'today'
  | 'yesterday'
  | 'tomorrow'
  | 'this_week'
  | 'last_week'
  | 'older'
  | 'future'
  | 'no_date'

// ---------------------------------------------------------------------------
// Text filter option builder
// ---------------------------------------------------------------------------

/**
 * Build filter options from a text field by counting distinct values.
 */
export function buildTextFilterOptions(
  rows: Record<string, unknown>[],
  readValue: (row: Record<string, unknown>) => string
): FilterOption[] {
  const byValue = new Map<string, number>()
  for (const row of rows) {
    const value = readValue(row).trim()
    if (!value) continue
    byValue.set(value, (byValue.get(value) || 0) + 1)
  }

  return Array.from(byValue.entries())
    .map(([value, count]) => ({ value, label: value, count }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

// ---------------------------------------------------------------------------
// Date filter bucket logic
// ---------------------------------------------------------------------------

const DAY_MS = 24 * 60 * 60 * 1000

function toDateOnly(value: unknown): Date | null {
  const raw = asText(value).trim()
  if (!raw) return null
  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return null
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate())
}

function dayNumber(date: Date): number {
  return Math.floor(date.getTime() / DAY_MS)
}

/**
 * Classify a date value into a filter bucket.
 */
export function toDateFilterBucket(
  value: unknown,
  nowDate: Date = new Date()
): DateFilterBucket {
  const parsed = toDateOnly(value)
  if (!parsed) return 'no_date'

  const today = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate())
  const dayDiff = dayNumber(parsed) - dayNumber(today)

  if (dayDiff === 0) return 'today'
  if (dayDiff === -1) return 'yesterday'
  if (dayDiff === 1) return 'tomorrow'

  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - today.getDay())
  const nextWeekStart = new Date(weekStart)
  nextWeekStart.setDate(weekStart.getDate() + 7)
  const prevWeekStart = new Date(weekStart)
  prevWeekStart.setDate(weekStart.getDate() - 7)

  if (parsed >= weekStart && parsed < nextWeekStart) return 'this_week'
  if (parsed >= prevWeekStart && parsed < weekStart) return 'last_week'
  if (parsed >= nextWeekStart) return 'future'
  return 'older'
}

const DATE_BUCKET_LABELS: Record<DateFilterBucket, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  tomorrow: 'Tomorrow',
  this_week: 'This Week',
  last_week: 'Last Week',
  future: 'Future',
  older: 'Older',
  no_date: 'No Date',
}

const DATE_BUCKET_ORDER: DateFilterBucket[] = [
  'today', 'yesterday', 'tomorrow', 'this_week', 'last_week', 'future', 'older', 'no_date',
]

/**
 * Build date bucket filter options from a date field.
 */
export function buildDateFilterOptions(
  rows: Record<string, unknown>[],
  readValue: (row: Record<string, unknown>) => unknown
): FilterOption[] {
  const byBucket = new Map<DateFilterBucket, number>()
  for (const bucket of DATE_BUCKET_ORDER) {
    byBucket.set(bucket, 0)
  }

  for (const row of rows) {
    const bucket = toDateFilterBucket(readValue(row))
    byBucket.set(bucket, (byBucket.get(bucket) || 0) + 1)
  }

  const options: FilterOption[] = []
  for (const bucket of DATE_BUCKET_ORDER) {
    const count = byBucket.get(bucket) || 0
    if (count === 0) continue
    options.push({
      value: bucket,
      label: DATE_BUCKET_LABELS[bucket],
      count,
    })
  }
  return options
}

/**
 * Check if a value matches a set of date filter buckets.
 */
export function matchesDateFilter(
  value: unknown,
  selectedBuckets: DateFilterBucket[]
): boolean {
  if (selectedBuckets.length === 0) return true
  const bucket = toDateFilterBucket(value)
  return selectedBuckets.includes(bucket)
}

/**
 * Check if a string value matches a set of selected values.
 */
export function matchesStringFilter(
  raw: unknown,
  selectedValues: string[]
): boolean {
  if (selectedValues.length === 0) return true
  const normalized = asText(raw).trim()
  return selectedValues.includes(normalized)
}
