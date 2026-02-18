'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown, ChevronRight, Download, Pencil, Trash2, Upload } from 'lucide-react'
import { TableToolbar } from './table-toolbar'
import type { TableColumn, TableSort } from './types'
import { createClient } from '@/lib/supabase/client'
import { getEntitySchema, type EntityKey, type SchemaField } from '@/lib/schema'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'

const DATE_ONLY_VALUE = /^\d{4}-\d{2}-\d{2}$/
let userTablePreferencesAvailable: boolean | null = null
let userTablePreferencesHasExtendedColumns: boolean | null = null

function isMissingUserTablePreferencesTable(error: unknown): boolean {
  if (!error) return false
  const errorRecord = typeof error === 'object' && error ? (error as Record<string, unknown>) : {}
  const code = String(errorRecord.code || '')
  const message = String(errorRecord.message || '').toLowerCase()
  const details = String(errorRecord.details || '').toLowerCase()
  return (
    code === 'PGRST205' ||
    message.includes('user_table_preferences') ||
    details.includes('user_table_preferences') ||
    message.includes('does not exist')
  )
}

function isMissingUserTablePreferenceColumn(error: unknown): boolean {
  if (!error) return false
  const errorRecord = typeof error === 'object' && error ? (error as Record<string, unknown>) : {}
  const code = String(errorRecord.code || '').toUpperCase()
  const message = String(errorRecord.message || '').toLowerCase()
  const details = String(errorRecord.details || '').toLowerCase()
  return (
    code === 'PGRST204' ||
    (message.includes('column') && message.includes('does not exist')) ||
    (details.includes('column') && details.includes('does not exist'))
  )
}

const GRID_CARD_SIZE_MIN = 160
const GRID_CARD_SIZE_MAX = 420
const GRID_CARD_SIZE_DEFAULT = 240
const GROUP_TOGGLE_COLUMN_WIDTH = 32
const SELECTION_COLUMN_WIDTH = 40
const PAGE_SIZE_OPTIONS = [25, 50, 100, 250] as const
const DEFAULT_PAGE_SIZE = 50

function clampPageSize(value: unknown): number {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number.parseInt(value, 10)
        : Number.NaN
  if (Number.isNaN(parsed)) return DEFAULT_PAGE_SIZE
  const min = PAGE_SIZE_OPTIONS[0]
  const max = PAGE_SIZE_OPTIONS[PAGE_SIZE_OPTIONS.length - 1]
  return Math.min(max, Math.max(min, parsed))
}

function clampGridCardSize(value: unknown): number {
  const numeric =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number.parseInt(value, 10)
        : Number.NaN
  if (Number.isNaN(numeric)) return GRID_CARD_SIZE_DEFAULT
  return Math.min(GRID_CARD_SIZE_MAX, Math.max(GRID_CARD_SIZE_MIN, numeric))
}

function normalizePreferencePathname(pathname: string): string {
  const segments = pathname
    .split('/')
    .filter(Boolean)
    .map((segment) => {
      if (/^\d+$/.test(segment)) return ':id'
      if (isLikelyUuid(segment)) return ':id'
      return segment
    })

  return segments.length > 0 ? `/${segments.join('/')}` : '/'
}

function parseSortPreference(
  value: unknown,
  allowedColumnIds: Set<string>
): TableSort | null {
  if (value === null || value === undefined || value === '') return null

  let raw = value

  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    if (!trimmed) return null
    if (trimmed.includes(':')) {
      const [id, direction] = trimmed.split(':')
      const nextId = String(id || '').trim()
      const nextDirection = String(direction || '').trim().toLowerCase()
      if (
        nextId &&
        allowedColumnIds.has(nextId) &&
        (nextDirection === 'asc' || nextDirection === 'desc')
      ) {
        return { id: nextId, direction: nextDirection }
      }
      return null
    }
    if (
      (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))
    ) {
      try {
        raw = JSON.parse(trimmed)
      } catch {
        return null
      }
    } else {
      return null
    }
  }

  if (!raw || typeof raw !== 'object') return null

  const record = raw as { id?: unknown; direction?: unknown }
  const id = String(record.id ?? '').trim()
  const direction = String(record.direction ?? '').trim().toLowerCase()

  if (!id || !allowedColumnIds.has(id)) return null
  if (direction !== 'asc' && direction !== 'desc') return null

  return { id, direction }
}

function parseGroupByPreference(
  value: unknown,
  allowedColumnIds: Set<string>
): string | null {
  if (value === null || value === undefined) return null
  const next = String(value).trim()
  if (!next || next === 'null' || next === 'none') return null
  return allowedColumnIds.has(next) ? next : null
}

function parseViewPreference(value: unknown, allowGridView: boolean): 'grid' | 'list' {
  const next = String(value ?? '').trim().toLowerCase()
  if (allowGridView && next === 'grid') return 'grid'
  return 'list'
}

function defaultFilterColumnIds(entityType: string, columns: TableColumn[]): string[] {
  if (columns.length === 0) return []

  const byId = new Map(columns.map((column) => [column.id, column]))
  const normalizedEntity = entityType.toLowerCase()
  const candidatesByEntity: Record<string, string[]> = {
    projects: ['status', 'project_type', 'tags'],
    assets: ['status', 'asset_type', 'tags'],
    sequences: ['status', 'sequence_type', 'tags'],
    shots: ['status', 'shot_type', 'tags'],
    tasks: ['status', 'step_name', 'assignee_name', 'assigned_to'],
    notes: ['status', 'note_type', 'tags'],
    versions: ['status', 'version_type', 'department'],
    publishes: ['status', 'file_type', 'tags'],
    published_files: ['status', 'file_type', 'tags'],
    playlists: ['status', 'tags'],
  }

  const prioritized = [
    ...(candidatesByEntity[normalizedEntity] || []),
    'status',
    'type',
    'step_name',
    'department',
    'assignee_name',
    'assigned_to',
    'tags',
  ]

  const next: string[] = []
  for (const id of prioritized) {
    if (!byId.has(id)) continue
    if (next.includes(id)) continue
    next.push(id)
    if (next.length >= 3) return next
  }

  const keywordMatches = columns
    .map((column) => column.id)
    .filter((id) => {
      const normalized = id.toLowerCase()
      return (
        normalized.includes('status') ||
        normalized.includes('type') ||
        normalized.includes('step') ||
        normalized.includes('assignee') ||
        normalized.includes('assigned') ||
        normalized.includes('tag')
      )
    })

  for (const id of keywordMatches) {
    if (next.includes(id)) continue
    next.push(id)
    if (next.length >= 3) return next
  }

  for (const column of columns) {
    if (next.includes(column.id)) continue
    next.push(column.id)
    if (next.length >= 3) break
  }

  return next
}

function parseActiveFilterColumns(
  value: unknown,
  allowedColumnIds: Set<string>
): Set<string> {
  if (!Array.isArray(value)) return new Set()
  const next = new Set<string>()
  for (const item of value) {
    const columnId = String(item ?? '').trim()
    if (!columnId) continue
    if (!allowedColumnIds.has(columnId)) continue
    next.add(columnId)
  }
  return next
}

function parseActiveFiltersPreference(
  value: unknown,
  allowedColumnIds: Set<string>
): Record<string, Set<string>> {
  if (!value || typeof value !== 'object') return {}

  const record = value as Record<string, unknown>
  const next: Record<string, Set<string>> = {}

  for (const [columnId, rawValues] of Object.entries(record)) {
    if (!allowedColumnIds.has(columnId)) continue
    if (!Array.isArray(rawValues)) continue

    const values = new Set<string>()
    for (const raw of rawValues) {
      const normalized = String(raw ?? '').trim()
      if (!normalized) continue
      values.add(normalized)
    }

    if (values.size > 0) {
      next[columnId] = values
    }
  }

  return next
}

function serializeActiveFiltersPreference(
  activeFilters: Record<string, Set<string>>
): Record<string, string[]> {
  const next: Record<string, string[]> = {}
  for (const [columnId, values] of Object.entries(activeFilters)) {
    if (!values || values.size === 0) continue
    next[columnId] = Array.from(values)
  }
  return next
}

function pad2(value: number) {
  return String(value).padStart(2, '0')
}

function inferTemporalKind(column: TableColumn): 'date' | 'datetime' | null {
  if (column.type === 'date' || column.editor === 'date') return 'date'
  if (column.type === 'datetime' || column.editor === 'datetime') return 'datetime'

  const id = column.id.toLowerCase()
  if (id.endsWith('_at')) return 'datetime'
  if (id === 'date_viewed' || id.endsWith('_time')) return 'datetime'
  if (id.includes('date')) return 'date'
  return null
}

const MS_PER_DAY = 24 * 60 * 60 * 1000
const DATE_FILTER_OPTION_LABELS: Record<string, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  tomorrow: 'Tomorrow',
  this_week: 'This Week',
  last_week: 'Last Week',
  older: 'Older',
  future: 'Future',
}
const DATE_FILTER_OPTION_ORDER = new Map(
  Object.keys(DATE_FILTER_OPTION_LABELS).map((key, index) => [key, index])
)
const DATE_FILTER_OPTION_KEYS = new Set(Object.keys(DATE_FILTER_OPTION_LABELS))

function toValidDate(rawValue: unknown): Date | null {
  if (rawValue === null || rawValue === undefined || rawValue === '') return null

  if (rawValue instanceof Date) {
    return Number.isNaN(rawValue.getTime()) ? null : rawValue
  }

  if (typeof rawValue === 'string') {
    const trimmed = rawValue.trim()
    if (!trimmed) return null

    // Preserve YYYY-MM-DD values in local date space.
    if (DATE_ONLY_VALUE.test(trimmed)) {
      const [yearRaw, monthRaw, dayRaw] = trimmed.split('-')
      const year = Number(yearRaw)
      const month = Number(monthRaw)
      const day = Number(dayRaw)
      if (!year || !month || !day) return null
      const parsed = new Date(year, month - 1, day)
      return Number.isNaN(parsed.getTime()) ? null : parsed
    }

    const parsed = new Date(trimmed)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  if (typeof rawValue === 'number') {
    const parsed = new Date(rawValue)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  return null
}

function toLocalDayNumber(date: Date): number {
  return Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / MS_PER_DAY
  )
}

function toDateFilterBucket(rawValue: unknown): string | null {
  const parsed = toValidDate(rawValue)
  if (!parsed) return null

  const now = new Date()
  const todayDay = toLocalDayNumber(now)
  const targetDay = toLocalDayNumber(parsed)
  const diffDays = targetDay - todayDay

  if (diffDays === 0) return 'today'
  if (diffDays === -1) return 'yesterday'
  if (diffDays === 1) return 'tomorrow'

  // Week starts on Sunday to match browser locale defaults for US users.
  const thisWeekStart = todayDay - now.getDay()
  const nextWeekStart = thisWeekStart + 7
  const lastWeekStart = thisWeekStart - 7

  if (targetDay >= thisWeekStart && targetDay < nextWeekStart) return 'this_week'
  if (targetDay >= lastWeekStart && targetDay < thisWeekStart) return 'last_week'

  return targetDay < lastWeekStart ? 'older' : 'future'
}

function formatDateDisplay(rawValue: unknown): string | null {
  const parsed = toValidDate(rawValue)
  if (!parsed) return null
  return parsed.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatDateTimeDisplay(rawValue: unknown): string | null {
  const parsed = toValidDate(rawValue)
  if (!parsed) return null
  const datePart = parsed.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const timePart = parsed.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
  return `${datePart} ${timePart}`
}

function formatTemporalDisplay(
  rawValue: unknown,
  temporalKind: 'date' | 'datetime'
): string | null {
  return temporalKind === 'date'
    ? formatDateDisplay(rawValue)
    : formatDateTimeDisplay(rawValue)
}

function sortFilterValues(column: TableColumn, values: string[]): string[] {
  const temporalKind = inferTemporalKind(column)
  if (!temporalKind) {
    return [...values].sort((a, b) => a.localeCompare(b))
  }

  return [...values].sort((a, b) => {
    const aOrder = DATE_FILTER_OPTION_ORDER.get(a)
    const bOrder = DATE_FILTER_OPTION_ORDER.get(b)
    if (aOrder !== undefined || bOrder !== undefined) {
      if (aOrder === undefined) return 1
      if (bOrder === undefined) return -1
      if (aOrder !== bOrder) return aOrder - bOrder
    }
    return a.localeCompare(b)
  })
}

function toDateInputValue(rawValue: any): string {
  if (rawValue === null || rawValue === undefined || rawValue === '') return ''
  if (typeof rawValue === 'string' && DATE_ONLY_VALUE.test(rawValue)) return rawValue
  const parsed = new Date(rawValue)
  if (Number.isNaN(parsed.getTime())) return ''
  return `${parsed.getFullYear()}-${pad2(parsed.getMonth() + 1)}-${pad2(parsed.getDate())}`
}

function toDateTimeLocalInputValue(rawValue: any): string {
  if (rawValue === null || rawValue === undefined || rawValue === '') return ''
  const parsed = new Date(rawValue)
  if (Number.isNaN(parsed.getTime())) return ''
  return `${parsed.getFullYear()}-${pad2(parsed.getMonth() + 1)}-${pad2(parsed.getDate())}T${pad2(parsed.getHours())}:${pad2(parsed.getMinutes())}`
}

function resolveInputType(column: TableColumn): React.HTMLInputTypeAttribute {
  const temporal = inferTemporalKind(column)
  if (temporal === 'date') return 'date'
  if (temporal === 'datetime') return 'datetime-local'

  if (column.editor === 'color' || column.type === 'color') return 'color'
  if (column.editor === 'url' || column.type === 'url') return 'url'
  if (column.editor === 'number' || column.type === 'number') return 'number'

  return 'text'
}

const NON_EDITABLE_SCHEMA_COLUMNS = new Set([
  'id',
  'project_id',
  'entity_type',
  'entity_id',
  'created_by',
  'updated_by',
  'author_id',
  'artist_id',
  'published_by',
  'created_at',
  'updated_at',
])

function listToString(value: any) {
  return Array.isArray(value) ? value.join(', ') : ''
}

function stringToList(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

async function fileToDataUrl(file: File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result === 'string') {
        resolve(result)
        return
      }
      reject(new Error('Failed to read image file'))
    }
    reader.onerror = () => reject(new Error('Failed to read image file'))
    reader.readAsDataURL(file)
  })
}

const MAX_THUMBNAIL_UPLOAD_BYTES = 8 * 1024 * 1024
const MAX_PROJECT_THUMBNAIL_SIDE = 640

async function optimizeThumbnailDataUrl(file: File): Promise<string> {
  const rawDataUrl = await fileToDataUrl(file)
  const image = new Image()

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve()
    image.onerror = () => reject(new Error('Invalid image file'))
    image.src = rawDataUrl
  })

  if (!image.width || !image.height) {
    throw new Error('Invalid image file')
  }

  const ratio = Math.min(
    MAX_PROJECT_THUMBNAIL_SIDE / image.width,
    MAX_PROJECT_THUMBNAIL_SIDE / image.height,
    1
  )
  const width = Math.max(1, Math.round(image.width * ratio))
  const height = Math.max(1, Math.round(image.height * ratio))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Failed to process image')
  }
  ctx.drawImage(image, 0, 0, width, height)

  const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
  return type === 'image/png'
    ? canvas.toDataURL(type)
    : canvas.toDataURL(type, 0.86)
}

function normalizeThumbnailSource(value: unknown): string | null {
  if (value === null || value === undefined) return null

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (
      !trimmed ||
      trimmed === 'null' ||
      trimmed === 'undefined' ||
      trimmed === '[object Object]'
    ) {
      return null
    }

    if (
      (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))
    ) {
      try {
        return normalizeThumbnailSource(JSON.parse(trimmed))
      } catch {
        return trimmed
      }
    }

    return trimmed
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const normalized = normalizeThumbnailSource(item)
      if (normalized) return normalized
    }
    return null
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>
    const candidateKeys = [
      'thumbnail_url',
      'thumbnailUrl',
      'publicUrl',
      'signedUrl',
      'url',
      'src',
      'path',
    ]
    for (const key of candidateKeys) {
      const normalized = normalizeThumbnailSource(record[key])
      if (normalized) return normalized
    }
  }

  return null
}

function ThumbnailPreview({
  source,
  className,
  alt = '',
  fallback = null,
}: {
  source: unknown
  className: string
  alt?: string
  fallback?: React.ReactNode
}) {
  const normalizedSource = normalizeThumbnailSource(source)
  const [failedSource, setFailedSource] = useState<string | null>(null)
  const hasError = normalizedSource !== null && failedSource === normalizedSource

  if (!normalizedSource || hasError) {
    return <>{fallback}</>
  }

  return (
    <img
      src={normalizedSource}
      alt={alt}
      className={className}
      onError={() => setFailedSource(normalizedSource)}
    />
  )
}

function isLikelyUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  )
}

function unknownToStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter(Boolean)
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return []

    if (
      (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
      (trimmed.startsWith('{') && trimmed.endsWith('}'))
    ) {
      try {
        const parsed = JSON.parse(trimmed)
        if (Array.isArray(parsed)) {
          return parsed
            .map((item) => String(item).trim())
            .filter(Boolean)
        }
      } catch {
        // fall through to comma-delimited parsing
      }
    }

    return stringToList(trimmed)
      .map((item) => item.replace(/^['"]|['"]$/g, '').trim())
      .filter(Boolean)
  }
  return []
}

function optionValuesToLabels(
  values: string[],
  options?: Array<{ value: string; label: string }>
): string {
  const byValue = new Map((options || []).map((option) => [option.value, option.label]))
  return values.map((value) => byValue.get(value) || value).join(', ')
}

function normalizeCsvMatcher(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

function countDelimiterInLine(line: string, delimiter: string): number {
  let inQuotes = false
  let count = 0

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    if (char === '"') {
      const nextChar = line[index + 1]
      if (inQuotes && nextChar === '"') {
        index += 1
        continue
      }
      inQuotes = !inQuotes
      continue
    }
    if (!inQuotes && char === delimiter) {
      count += 1
    }
  }

  return count
}

function detectCsvDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/, 1)[0] || ''
  const candidates = [',', ';', '\t', '|']

  let best = ','
  let bestScore = -1

  for (const delimiter of candidates) {
    const score = countDelimiterInLine(firstLine, delimiter)
    if (score > bestScore) {
      best = delimiter
      bestScore = score
    }
  }

  return best
}

function parseCsvText(text: string, delimiter: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    const nextChar = text[index + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        cell += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (!inQuotes && char === delimiter) {
      row.push(cell)
      cell = ''
      continue
    }

    if (!inQuotes && (char === '\n' || char === '\r')) {
      if (char === '\r' && nextChar === '\n') {
        index += 1
      }
      row.push(cell)
      const hasAnyValue = row.some((value) => value.trim() !== '')
      if (hasAnyValue) {
        rows.push(row)
      }
      row = []
      cell = ''
      continue
    }

    cell += char
  }

  row.push(cell)
  const hasAnyValue = row.some((value) => value.trim() !== '')
  if (hasAnyValue) {
    rows.push(row)
  }

  return rows
}

function toCsvField(rawValue: unknown): string {
  if (rawValue === null || rawValue === undefined) return ''

  let value: string
  if (Array.isArray(rawValue)) {
    value = rawValue.map((item) => String(item)).join('|')
  } else if (typeof rawValue === 'object') {
    value = JSON.stringify(rawValue)
  } else {
    value = String(rawValue)
  }

  if (value.includes('"')) {
    value = value.replace(/"/g, '""')
  }

  if (/[",\n\r]/.test(value)) {
    return `"${value}"`
  }
  return value
}

function buildCsvDocument(rows: any[], columns: TableColumn[]): string {
  const header = columns.map((column) => toCsvField(column.id)).join(',')
  const body = rows.map((row) =>
    columns.map((column) => toCsvField(row?.[column.id])).join(',')
  )
  return [header, ...body].join('\n')
}

function downloadCsvFile(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = window.URL.createObjectURL(blob)
  const link = window.document.createElement('a')
  link.href = url
  link.download = filename
  window.document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

function parseCsvBoolean(value: string): boolean | string | null {
  const normalized = value.trim().toLowerCase()
  if (!normalized) return null
  if (['true', '1', 'yes', 'y'].includes(normalized)) return true
  if (['false', '0', 'no', 'n'].includes(normalized)) return false
  return value
}

function parseCsvNumber(value: string): number | null | string {
  const trimmed = value.trim()
  if (!trimmed) return null
  const numeric = Number(trimmed)
  return Number.isNaN(numeric) ? value : numeric
}

function parseCsvCellByColumn(rawValue: string, column: TableColumn): unknown {
  const trimmed = rawValue.trim()
  if (!trimmed) {
    if (column.editor === 'multiselect') return []
    return null
  }

  if (column.editor === 'multiselect') {
    return stringToList(trimmed)
  }

  if (column.editor === 'checkbox' || column.type === 'boolean') {
    return parseCsvBoolean(trimmed)
  }

  if (column.editor === 'number' || column.type === 'number') {
    return parseCsvNumber(trimmed)
  }

  if (column.type === 'json') {
    try {
      return JSON.parse(trimmed)
    } catch {
      return trimmed
    }
  }

  return trimmed
}

const PEOPLE_REFERENCE_COLUMN_IDS = new Set([
  'created_by',
  'updated_by',
  'assigned_to',
  'reviewer',
  'reviewers',
  'ayon_assignees',
  'ayon_assignments',
  'ayon_assignee',
])

function isPeopleReferenceColumnId(columnId: string): boolean {
  const normalized = columnId.toLowerCase()
  return normalized.endsWith('_by') || PEOPLE_REFERENCE_COLUMN_IDS.has(normalized)
}

function filterKeysForColumnValue(
  column: TableColumn,
  rawValue: unknown
): string[] {
  if (rawValue === null || rawValue === undefined) return []

  const temporalKind = inferTemporalKind(column)
  if (temporalKind) {
    const bucket = toDateFilterBucket(rawValue)
    return bucket ? [bucket] : []
  }

  if (column.editor === 'multiselect' || Array.isArray(rawValue)) {
    return Array.from(
      new Set(
        unknownToStringList(rawValue)
          .map((item) => item.trim())
          .filter(Boolean)
      )
    )
  }

  const normalized = String(rawValue).trim()
  return normalized ? [normalized] : []
}

function resolveColumnOptionLabel(
  column: TableColumn,
  rawValue: string
): string | null {
  if (!column.options?.length) return null
  const option = column.options.find((entry) => entry.value === rawValue)
  if (!option) return null
  const label = option.label.trim()
  return label || null
}

function resolveSchemaEntityKey(entityType: string): EntityKey | null {
  const normalized = entityType.toLowerCase()

  if (
    normalized.startsWith('publishes') ||
    normalized.startsWith('published_files') ||
    normalized.startsWith('published-files')
  ) {
    return 'published_file'
  }
  if (normalized === 'published_file') return 'published_file'
  if (normalized.startsWith('assets')) return 'asset'
  if (normalized === 'asset') return 'asset'
  if (normalized.startsWith('shots')) return 'shot'
  if (normalized === 'shot') return 'shot'
  if (normalized.startsWith('sequences')) return 'sequence'
  if (normalized === 'sequence') return 'sequence'
  if (normalized.startsWith('tasks')) return 'task'
  if (normalized === 'task') return 'task'
  if (normalized.startsWith('versions')) return 'version'
  if (normalized === 'version') return 'version'
  if (normalized.startsWith('notes')) return 'note'
  if (normalized === 'note') return 'note'

  return null
}

function inferSchemaColumnType(field: SchemaField): TableColumn['type'] {
  const dataType = field.dataType.toLowerCase()

  if (dataType === 'checkbox') return 'boolean'
  if (dataType === 'date') return 'date'
  if (dataType === 'date_time') return 'datetime'
  if (
    dataType === 'number' ||
    dataType === 'float' ||
    dataType === 'duration' ||
    dataType === 'percent'
  ) {
    return 'number'
  }
  if (dataType === 'serializable') return 'json'
  if (dataType === 'url') return 'url'
  if (dataType === 'color') return 'color'
  if (dataType === 'status_list') return 'status'
  if (dataType === 'image') {
    if (field.column?.includes('thumbnail')) return 'thumbnail'
    return 'url'
  }

  return 'text'
}

function inferSchemaColumnEditor(
  field: SchemaField,
  editable: boolean
): TableColumn['editor'] | undefined {
  if (!editable) return undefined
  const dataType = field.dataType.toLowerCase()

  if (dataType === 'checkbox') return 'checkbox'
  if (dataType === 'list' || dataType === 'status_list') return 'select'
  if (dataType === 'multi_entity') return 'multiselect'
  if (dataType === 'date') return 'date'
  if (dataType === 'date_time') return 'datetime'
  if (
    dataType === 'number' ||
    dataType === 'float' ||
    dataType === 'duration' ||
    dataType === 'percent'
  ) {
    return 'number'
  }
  if (dataType === 'url') return 'url'
  if (dataType === 'color') return 'color'
  if (dataType === 'serializable') return 'textarea'
  if (/description|content|notes|comments|brief/i.test(field.name)) return 'textarea'

  return 'text'
}

interface RuntimeSchemaFieldRow {
  column_name?: string | null
  name?: string | null
  code?: string | null
  data_type?: string | null
  field_type?: string | null
}

function isMissingRuntimeSchema(error: any): boolean {
  if (!error) return false
  const code = String(error.code || '')
  const message = String(error.message || '').toLowerCase()
  const details = String(error.details || '').toLowerCase()
  return (
    code === 'PGRST205' ||
    message.includes('schema_field_runtime_v') ||
    details.includes('schema_field_runtime_v') ||
    message.includes('does not exist')
  )
}

function toRuntimeSchemaField(row: RuntimeSchemaFieldRow): SchemaField | null {
  const columnName =
    typeof row.column_name === 'string' ? row.column_name.trim() : ''
  if (!columnName) return null

  const fieldName = typeof row.name === 'string' && row.name.trim()
    ? row.name.trim()
    : columnName
  const dataType = typeof row.data_type === 'string' && row.data_type.trim()
    ? row.data_type.trim().toLowerCase()
    : 'text'
  const fieldType = typeof row.field_type === 'string' && row.field_type.trim()
    ? row.field_type.trim().toLowerCase()
    : 'dynamic'
  const code =
    typeof row.code === 'string' && row.code.trim()
      ? row.code.trim().toLowerCase()
      : columnName

  return {
    name: fieldName,
    dataType,
    fieldType,
    code,
    column: columnName,
    pgType: null,
    defaultSql: null,
    virtual: false,
  }
}

function buildSchemaColumn(field: SchemaField): TableColumn | null {
  if (!field.column || field.virtual) return null

  const editable =
    field.fieldType !== 'system_owned' &&
    !NON_EDITABLE_SCHEMA_COLUMNS.has(field.column)

  const column: TableColumn = {
    id: field.column,
    label: field.name,
    type: inferSchemaColumnType(field),
    width: '160px',
    editable,
  }

  const editor = inferSchemaColumnEditor(field, editable)
  if (editor) {
    column.editor = editor
  }

  if (field.dataType.toLowerCase() === 'multi_entity') {
    column.formatValue = listToString
    column.parseValue = stringToList
  }

  return column
}

function shouldSkipSchemaColumn(field: SchemaField, existing: Set<string>): boolean {
  const column = field.column
  if (column === 'assigned_to' && existing.has('assignee_name')) return true
  if (column === 'step_id' && (existing.has('step_name') || existing.has('department'))) return true
  if (column === 'department' && existing.has('step_id')) return true
  if (column === 'template_task' && existing.has('task_template')) return true
  if (!column) return false
  if (!column.endsWith('_id')) return false

  const base = column.slice(0, -3)
  if (!base) return false

  // If a human-readable label column is already explicitly configured
  // (e.g. sequence_label), hide the raw numeric/UUID id schema column.
  return existing.has(`${base}_label`)
}

function withSchemaColumns(
  columns: TableColumn[],
  entityType: string,
  runtimeFields: SchemaField[] = []
): TableColumn[] {
  const schemaEntity = resolveSchemaEntityKey(entityType)
  if (!schemaEntity) return columns

  const existing = new Set(columns.map((column) => column.id))
  const schemaColumns: TableColumn[] = []
  const schema = getEntitySchema(schemaEntity)
  const mergedFields = [...schema.fields, ...runtimeFields]

  for (const field of mergedFields) {
    const column = buildSchemaColumn(field)
    if (!column) continue
    if (existing.has(column.id)) continue
    if (shouldSkipSchemaColumn(field, existing)) continue
    schemaColumns.push(column)
    existing.add(column.id)
  }

  return [...columns, ...schemaColumns]
}

function buildVisibleColumnSet(
  allColumns: TableColumn[],
  savedVisible?: string[],
  savedOrder?: string[]
): Set<string> {
  const allIds = allColumns.map((column) => column.id)
  const allowed = new Set(allIds)
  const knownAtSave = new Set<string>([...(savedVisible || []), ...(savedOrder || [])])

  if (!savedVisible || savedVisible.length === 0) {
    return new Set(allIds)
  }

  const next = new Set(savedVisible.filter((id) => allowed.has(id)))
  for (const id of allIds) {
    if (!knownAtSave.has(id)) {
      next.add(id)
    }
  }
  return next
}

interface EntityTableProps {
  columns: TableColumn[]
  data: any[]
  groupBy?: string
  entityType?: string
  preferenceScope?: string
  allowGridView?: boolean
  onRowClick?: (row: any) => void
  onRowContextMenu?: (row: any, event: React.MouseEvent<HTMLTableRowElement>) => void
  onEdit?: (row: any) => void
  onDelete?: (row: any) => void
  onAdd?: () => void
  onCellUpdate?: (row: any, column: TableColumn, value: any) => Promise<void> | void
  onCellUpdateError?: (message: string) => void
  cellEditTrigger?: 'double_click' | 'icon' | 'both'
  rowActions?: (row: any) => RowActionItem[]
  showToolbar?: boolean
  showFiltersPanel?: boolean
  emptyState?: React.ReactNode
  csvExportFilename?: string
  onCsvImport?: (
    rows: Record<string, unknown>[],
    context: {
      fileName: string
      headers: string[]
      columnMap: Record<string, string>
      delimiter: string
      identifierHeader?: string | null
      identifierTargetColumn?: string | null
    }
  ) => Promise<{ imported?: number; failed?: Array<{ row: number; message: string }> } | void> | {
    imported?: number
    failed?: Array<{ row: number; message: string }>
  } | void
  onBulkDelete?: (rows: any[]) => Promise<void> | void
  enableRowSelection?: boolean
}

type RowActionItem = {
  label: string
  icon?: React.ReactNode
  onClick: () => void
  variant?: 'default' | 'destructive'
}

export function EntityTable({
  columns,
  data,
  groupBy,
  entityType = 'projects',
  preferenceScope,
  allowGridView = entityType === 'projects',
  onRowClick,
  onRowContextMenu,
  onEdit,
  onDelete,
  onAdd,
  onCellUpdate,
  onCellUpdateError,
  cellEditTrigger = 'icon',
  rowActions,
  showToolbar = true,
  showFiltersPanel = true,
  emptyState,
  csvExportFilename,
  onCsvImport,
  onBulkDelete,
  enableRowSelection = true,
}: EntityTableProps) {
  const [runtimeSchemaFields, setRuntimeSchemaFields] = useState<SchemaField[]>([])

  useEffect(() => {
    let isActive = true
    const schemaEntity = resolveSchemaEntityKey(entityType)
    if (!schemaEntity) {
      setRuntimeSchemaFields([])
      return () => {
        isActive = false
      }
    }

    async function loadRuntimeFields() {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('schema_field_runtime_v')
        .select('column_name, name, code, data_type, field_type')
        .eq('entity_type', schemaEntity)
        .eq('field_active', true)
        .eq('entity_active', true)
        .order('display_order', { ascending: true })
        .order('name', { ascending: true })

      if (!isActive) return

      if (error) {
        if (!isMissingRuntimeSchema(error)) {
          console.error(`Failed to load runtime schema for table ${entityType}:`, error)
        }
        setRuntimeSchemaFields([])
        return
      }

      const next: SchemaField[] = []
      const seen = new Set<string>()
      for (const row of (data || []) as RuntimeSchemaFieldRow[]) {
        const field = toRuntimeSchemaField(row)
        if (!field?.column) continue
        if (seen.has(field.column)) continue
        seen.add(field.column)
        next.push(field)
      }
      setRuntimeSchemaFields(next)
    }

    loadRuntimeFields()
    return () => {
      isActive = false
    }
  }, [entityType])

  const reportCellUpdateError = (error: unknown) => {
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to update cell. Please try again.'
    console.error('Failed to update cell:', error)
    onCellUpdateError?.(message)
  }

  const resolvedColumns = useMemo(
    () => withSchemaColumns(columns, entityType, runtimeSchemaFields),
    [columns, entityType, runtimeSchemaFields]
  )
  const pathname = usePathname()
  const normalizedPathname = useMemo(
    () => normalizePreferencePathname(pathname || '/'),
    [pathname]
  )
  const scopedEntityType = useMemo(() => {
    if (preferenceScope && preferenceScope.trim()) {
      return preferenceScope.trim()
    }
    return `${entityType}:${normalizedPathname}`
  }, [entityType, normalizedPathname, preferenceScope])
  const storageKey = useMemo(
    () => `kong.table.${scopedEntityType}`,
    [scopedEntityType]
  )
  const allowedColumnIds = useMemo(
    () => new Set(resolvedColumns.map((column) => column.id)),
    [resolvedColumns]
  )

  const [view, setView] = useState<'grid' | 'list'>('list')
  const [gridCardSize, setGridCardSize] = useState<number>(GRID_CARD_SIZE_DEFAULT)
  const [searchQuery, setSearchQuery] = useState('')
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE)
  const [currentPage, setCurrentPage] = useState(1)
  const [sort, setSort] = useState<TableSort | null>(null)
  const [groupById, setGroupById] = useState<string | null>(groupBy ?? null)
  const [density, setDensity] = useState(1)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [expandedFilterColumns, setExpandedFilterColumns] = useState<Set<string>>(
    () => new Set()
  )
  const [editingCell, setEditingCell] = useState<{
    rowId: number | string
    columnId: string
  } | null>(null)
  const [draftValue, setDraftValue] = useState('')
  const [draftListValue, setDraftListValue] = useState<string[]>([])
  const [multiselectOpen, setMultiselectOpen] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    () => new Set(resolvedColumns.map((column) => column.id))
  )
  const [columnOrder, setColumnOrder] = useState<string[]>(
    () => resolvedColumns.map((column) => column.id)
  )
  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null)
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({})
  const resizeRef = useRef<{
    id: string
    startX: number
    startWidth: number
  } | null>(null)
  const [prefsReady, setPrefsReady] = useState(false)
  const [activeFilters, setActiveFilters] = useState<Record<string, Set<string>>>(
    {}
  )
  const [pinnedColumnIds, setPinnedColumnIds] = useState<Set<string>>(
    () => new Set()
  )
  const [activeFilterColumns, setActiveFilterColumns] = useState<Set<string>>(
    () => new Set()
  )
  const [hasAppliedDefaultFilterColumns, setHasAppliedDefaultFilterColumns] =
    useState(false)
  const [pendingFilterColumnId, setPendingFilterColumnId] = useState('')
  const [profileNamesById, setProfileNamesById] = useState<Record<string, string>>({})
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    actions: RowActionItem[]
  } | null>(null)
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(
    () => new Set()
  )
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)
  const [csvImportOpen, setCsvImportOpen] = useState(false)
  const [csvImporting, setCsvImporting] = useState(false)
  const [csvImportFileName, setCsvImportFileName] = useState('')
  const [csvImportDelimiter, setCsvImportDelimiter] = useState(',')
  const [csvImportHeaders, setCsvImportHeaders] = useState<string[]>([])
  const [csvImportRows, setCsvImportRows] = useState<string[][]>([])
  const [csvImportColumnMap, setCsvImportColumnMap] = useState<Record<string, string>>(
    {}
  )
  const [csvImportStep, setCsvImportStep] = useState(1)
  const [csvImportIdentifierHeader, setCsvImportIdentifierHeader] = useState('')
  const [csvImportError, setCsvImportError] = useState<string | null>(null)
  const [csvImportResult, setCsvImportResult] = useState<{
    imported: number
    failed: Array<{ row: number; message: string }>
  } | null>(null)
  const [bulkFieldId, setBulkFieldId] = useState('')
  const [bulkValue, setBulkValue] = useState('')
  const [bulkBooleanValue, setBulkBooleanValue] = useState<'true' | 'false'>(
    'true'
  )
  const [bulkApplying, setBulkApplying] = useState(false)

  useEffect(() => {
    setActiveFilters({})
    setPinnedColumnIds(new Set())
    setActiveFilterColumns(new Set())
    setHasAppliedDefaultFilterColumns(false)
    setPendingFilterColumnId('')
    setExpandedFilterColumns(new Set())
    setPageSize(DEFAULT_PAGE_SIZE)
    setCurrentPage(1)
    setSelectedRowIds(new Set())
    setCsvImportOpen(false)
    setCsvImporting(false)
    setCsvImportFileName('')
    setCsvImportDelimiter(',')
    setCsvImportHeaders([])
    setCsvImportRows([])
    setCsvImportColumnMap({})
    setCsvImportStep(1)
    setCsvImportIdentifierHeader('')
    setCsvImportError(null)
    setCsvImportResult(null)
    setBulkFieldId('')
    setBulkValue('')
    setBulkBooleanValue('true')
    setBulkApplying(false)
  }, [scopedEntityType])

  useEffect(() => {
    setGroupById(groupBy ?? null)
  }, [groupBy])

  useEffect(() => {
    if (!contextMenu) return
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setContextMenu(null)
      }
    }
    window.addEventListener('keydown', onEscape)
    return () => {
      window.removeEventListener('keydown', onEscape)
    }
  }, [contextMenu])

  useEffect(() => {
    setColumnOrder((prev) => {
      const next = prev.filter((id) =>
        resolvedColumns.some((column) => column.id === id)
      )
      const missing = resolvedColumns
        .map((column) => column.id)
        .filter((id) => !next.includes(id))
      return [...next, ...missing]
    })
  }, [resolvedColumns])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) return
    try {
      const parsed = JSON.parse(raw) as {
        columnOrder?: string[]
        columnWidths?: Record<string, number>
        visibleColumns?: string[]
        sort?: unknown
        groupBy?: unknown
        view?: unknown
        pageSize?: unknown
        gridCardSize?: unknown
        pinnedColumns?: unknown
        activeFilterColumns?: unknown
        activeFilters?: unknown
      }
      if (parsed.columnOrder?.length) {
        setColumnOrder(parsed.columnOrder)
      }
      if (parsed.columnWidths) {
        setColumnWidths(parsed.columnWidths)
      }
      setSort(parseSortPreference(parsed.sort, allowedColumnIds))
      setGroupById(parseGroupByPreference(parsed.groupBy, allowedColumnIds))
      setView(parseViewPreference(parsed.view, allowGridView))
      setPageSize(clampPageSize(parsed.pageSize))
      if (entityType === 'projects') {
        setGridCardSize(clampGridCardSize(parsed.gridCardSize))
      }
      setPinnedColumnIds(
        parseActiveFilterColumns(parsed.pinnedColumns, allowedColumnIds)
      )
      const parsedActiveFilterColumns = parseActiveFilterColumns(
        parsed.activeFilterColumns,
        allowedColumnIds
      )
      setActiveFilterColumns(parsedActiveFilterColumns)
      setActiveFilters(
        parseActiveFiltersPreference(parsed.activeFilters, allowedColumnIds)
      )
      if (Object.prototype.hasOwnProperty.call(parsed, 'activeFilterColumns')) {
        setHasAppliedDefaultFilterColumns(true)
      }
      setVisibleColumns(
        buildVisibleColumnSet(
          resolvedColumns,
          parsed.visibleColumns,
          parsed.columnOrder
        )
      )
    } catch {
      // ignore invalid storage
    }
  }, [allowGridView, allowedColumnIds, entityType, resolvedColumns, storageKey])

  useEffect(() => {
    if (!prefsReady) return
    if (typeof window === 'undefined') return
    const payload = {
      columnOrder,
      columnWidths,
      visibleColumns: Array.from(visibleColumns),
      sort,
      groupBy: groupById,
      view,
      pageSize,
      gridCardSize: entityType === 'projects' ? clampGridCardSize(gridCardSize) : undefined,
      pinnedColumns: Array.from(pinnedColumnIds),
      activeFilterColumns: Array.from(activeFilterColumns),
      activeFilters: serializeActiveFiltersPreference(activeFilters),
    }
    window.localStorage.setItem(storageKey, JSON.stringify(payload))
  }, [
    activeFilterColumns,
    activeFilters,
    columnOrder,
    columnWidths,
    entityType,
    gridCardSize,
    groupById,
    pageSize,
    pinnedColumnIds,
    prefsReady,
    sort,
    storageKey,
    view,
    visibleColumns,
  ])

  useEffect(() => {
    let isActive = true

    async function loadPreferences() {
      setPrefsReady(false)
      if (userTablePreferencesAvailable === false) {
        if (isActive) setPrefsReady(true)
        return
      }
      const supabase = createClient()
      const { data: authData } = await supabase.auth.getUser()
      const userId = authData.user?.id
      if (!userId) {
        if (isActive) setPrefsReady(true)
        return
      }

      const loadLegacyPreferences = async () =>
        await supabase
          .from('user_table_preferences')
          .select('column_order, column_widths, visible_columns')
          .eq('user_id', userId)
          .eq('entity_type', scopedEntityType)
          .maybeSingle()

      const loadExtendedPreferences = async () =>
        await supabase
          .from('user_table_preferences')
          .select(
            'column_order, column_widths, visible_columns, sort, group_by, view_mode, grid_card_size'
          )
          .eq('user_id', userId)
          .eq('entity_type', scopedEntityType)
          .maybeSingle()

      let usingExtended = userTablePreferencesHasExtendedColumns !== false
      let data: unknown = null
      let error: unknown = null

      if (usingExtended) {
        const response = await loadExtendedPreferences()
        data = response.data
        error = response.error

        if (error && isMissingUserTablePreferenceColumn(error)) {
          userTablePreferencesHasExtendedColumns = false
          usingExtended = false
          const fallback = await loadLegacyPreferences()
          data = fallback.data
          error = fallback.error
        } else if (!error) {
          userTablePreferencesHasExtendedColumns = true
        }
      } else {
        const response = await loadLegacyPreferences()
        data = response.data
        error = response.error
      }

      if (!isActive) return
      if (error) {
        if (isMissingUserTablePreferencesTable(error)) {
          userTablePreferencesAvailable = false
        }
        if (isActive) setPrefsReady(true)
        return
      }
      userTablePreferencesAvailable = true

      const preferenceData =
        data && typeof data === 'object'
          ? (data as Record<string, unknown>)
          : null

      if (preferenceData) {
        if (Array.isArray(preferenceData.column_order)) {
          setColumnOrder(preferenceData.column_order as string[])
        }
        if (
          preferenceData.column_widths &&
          typeof preferenceData.column_widths === 'object'
        ) {
          setColumnWidths(preferenceData.column_widths as Record<string, number>)
        }
        setVisibleColumns(
          buildVisibleColumnSet(
            resolvedColumns,
            Array.isArray(preferenceData.visible_columns)
              ? (preferenceData.visible_columns as string[])
              : undefined,
            Array.isArray(preferenceData.column_order)
              ? (preferenceData.column_order as string[])
              : undefined
          )
        )

        if (usingExtended) {
          setSort(parseSortPreference(preferenceData.sort, allowedColumnIds))
          setGroupById(
            parseGroupByPreference(preferenceData.group_by, allowedColumnIds)
          )
          setView(parseViewPreference(preferenceData.view_mode, allowGridView))
          if (entityType === 'projects') {
            setGridCardSize(clampGridCardSize(preferenceData.grid_card_size))
          }
        }
      }
      if (isActive) setPrefsReady(true)
    }

    loadPreferences()
    return () => {
      isActive = false
    }
  }, [allowGridView, allowedColumnIds, entityType, resolvedColumns, scopedEntityType])

  useEffect(() => {
    if (!prefsReady) return
    let timeout: NodeJS.Timeout | null = null

    async function savePreferences() {
      if (userTablePreferencesAvailable === false) return
      const supabase = createClient()
      const { data: authData } = await supabase.auth.getUser()
      const userId = authData.user?.id
      if (!userId) return

      const basePayload = {
        user_id: userId,
        entity_type: scopedEntityType,
        column_order: columnOrder,
        column_widths: columnWidths,
        visible_columns: Array.from(visibleColumns),
        updated_at: new Date().toISOString(),
      }

      const upsertLegacy = async () =>
        await supabase
          .from('user_table_preferences')
          .upsert(basePayload, { onConflict: 'user_id,entity_type' })

      if (userTablePreferencesHasExtendedColumns === false) {
        const legacyResult = await upsertLegacy()
        if (isMissingUserTablePreferencesTable(legacyResult.error)) {
          userTablePreferencesAvailable = false
        }
        return
      }

      const extendedPayload = {
        ...basePayload,
        sort: sort ? JSON.stringify(sort) : null,
        group_by: groupById,
        view_mode: allowGridView ? view : 'list',
        grid_card_size:
          entityType === 'projects' ? clampGridCardSize(gridCardSize) : null,
      }

      const extendedResult = await supabase
        .from('user_table_preferences')
        .upsert(extendedPayload, { onConflict: 'user_id,entity_type' })

      if (isMissingUserTablePreferenceColumn(extendedResult.error)) {
        userTablePreferencesHasExtendedColumns = false
        const legacyResult = await upsertLegacy()
        if (isMissingUserTablePreferencesTable(legacyResult.error)) {
          userTablePreferencesAvailable = false
        }
        return
      }

      if (isMissingUserTablePreferencesTable(extendedResult.error)) {
        userTablePreferencesAvailable = false
        return
      }

      userTablePreferencesHasExtendedColumns = true
    }

    timeout = setTimeout(() => {
      savePreferences()
    }, 600)

    return () => {
      if (timeout) clearTimeout(timeout)
    }
  }, [
    allowGridView,
    columnOrder,
    columnWidths,
    entityType,
    gridCardSize,
    groupById,
    prefsReady,
    scopedEntityType,
    sort,
    view,
    visibleColumns,
  ])

  useEffect(() => {
    setColumnWidths((prev) => {
      const next = { ...prev }
      resolvedColumns.forEach((column) => {
        if (next[column.id] !== undefined) return
        if (column.width) {
          const numeric = Number.parseInt(column.width, 10)
          if (!Number.isNaN(numeric)) {
            next[column.id] = numeric
          }
        }
      })
      return next
    })
  }, [resolvedColumns])

  const orderedColumns = useMemo(() => {
    const map = new Map(resolvedColumns.map((column) => [column.id, column]))
    const ordered = columnOrder
      .map((id) => map.get(id))
      .filter(Boolean) as TableColumn[]
    const remaining = resolvedColumns.filter(
      (column) => !columnOrder.includes(column.id)
    )
    return [...ordered, ...remaining]
  }, [resolvedColumns, columnOrder])

  const displayColumns = useMemo(
    () => orderedColumns.filter((column) => visibleColumns.has(column.id)),
    [orderedColumns, visibleColumns]
  )

  useEffect(() => {
    setPinnedColumnIds((prev) => {
      const next = new Set<string>()
      for (const columnId of prev) {
        if (allowedColumnIds.has(columnId)) {
          next.add(columnId)
        }
      }
      if (next.size === prev.size) return prev
      return next
    })
  }, [allowedColumnIds])

  const pinnedColumnOffsets = useMemo(() => {
    const offsets: Record<string, number> = {}
    let leftOffset = 0
    if (enableRowSelection) {
      leftOffset += SELECTION_COLUMN_WIDTH
    }
    if (groupById) {
      leftOffset += GROUP_TOGGLE_COLUMN_WIDTH
    }

    for (const column of displayColumns) {
      if (!pinnedColumnIds.has(column.id)) continue
      offsets[column.id] = leftOffset

      const width =
        columnWidths[column.id] ??
        (column.width ? Number.parseInt(column.width, 10) : Number.NaN)
      leftOffset += Number.isNaN(width) ? 120 : width
    }

    return offsets
  }, [columnWidths, displayColumns, enableRowSelection, groupById, pinnedColumnIds])

  const hasPinnedDisplayColumns = useMemo(
    () => displayColumns.some((column) => pinnedColumnIds.has(column.id)),
    [displayColumns, pinnedColumnIds]
  )

  const lastPinnedDisplayColumnId = useMemo(() => {
    let last: string | null = null
    for (const column of displayColumns) {
      if (!pinnedColumnIds.has(column.id)) continue
      last = column.id
    }
    return last
  }, [displayColumns, pinnedColumnIds])

  const resolvedColumnById = useMemo(
    () => new Map(resolvedColumns.map((column) => [column.id, column])),
    [resolvedColumns]
  )

  const csvColumnMatcher = useMemo(() => {
    const matcher = new Map<string, string>()
    for (const column of resolvedColumns) {
      const idMatch = normalizeCsvMatcher(column.id)
      const labelMatch = normalizeCsvMatcher(column.label)
      if (idMatch && !matcher.has(idMatch)) matcher.set(idMatch, column.id)
      if (labelMatch && !matcher.has(labelMatch)) matcher.set(labelMatch, column.id)
    }
    return matcher
  }, [resolvedColumns])

  const peopleRefColumnIds = useMemo(
    () =>
      resolvedColumns
        .filter((column) => {
          return isPeopleReferenceColumnId(column.id)
        })
        .map((column) => column.id),
    [resolvedColumns]
  )

  const peopleRefIds = useMemo(() => {
    if (peopleRefColumnIds.length === 0) return []
    const ids = new Set<string>()
    for (const row of data) {
      for (const columnId of peopleRefColumnIds) {
        const column = resolvedColumnById.get(columnId)
        if (!column) continue
        const rawValue = row?.[columnId]
        for (const normalized of filterKeysForColumnValue(column, rawValue)) {
          if (!isLikelyUuid(normalized)) continue
          ids.add(normalized.toLowerCase())
        }
      }
    }
    return Array.from(ids)
  }, [data, peopleRefColumnIds, resolvedColumnById])

  useEffect(() => {
    if (peopleRefIds.length === 0) return
    const missingIds = peopleRefIds.filter((id) => !profileNamesById[id])
    if (missingIds.length === 0) return

    let active = true
    async function loadProfileNames() {
      const supabase = createClient()
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, display_name, full_name, email')
        .in('id', missingIds)

      if (!active) return
      if (error) {
        console.error('Failed to load profile names for table references:', error)
        return
      }

      const nextMap: Record<string, string> = {}
      for (const profile of profiles || []) {
        const id = typeof profile.id === 'string' ? profile.id.toLowerCase() : ''
        if (!id) continue
        const displayName =
          typeof profile.display_name === 'string' && profile.display_name.trim()
            ? profile.display_name.trim()
            : typeof profile.full_name === 'string' && profile.full_name.trim()
              ? profile.full_name.trim()
              : typeof profile.email === 'string' && profile.email.trim()
                ? profile.email.trim()
                : id
        nextMap[id] = displayName
      }

      if (Object.keys(nextMap).length === 0) return
      setProfileNamesById((previous) => ({ ...previous, ...nextMap }))
    }

    loadProfileNames()
    return () => {
      active = false
    }
  }, [peopleRefIds, profileNamesById])

  const filterableColumns = useMemo(() => {
    return resolvedColumns.filter((column) => {
      const values = new Set<string>()
      for (const row of data) {
        for (const key of filterKeysForColumnValue(column, row[column.id])) {
          values.add(key)
        }
      }
      return values.size > 0 && values.size <= 12
    })
  }, [resolvedColumns, data])

  const filterOptions = useMemo(() => {
    const options: Record<string, string[]> = {}
    filterableColumns.forEach((column) => {
      const valuesSet = new Set<string>()
      for (const row of data) {
        for (const key of filterKeysForColumnValue(column, row[column.id])) {
          valuesSet.add(key)
        }
      }
      const values = sortFilterValues(column, Array.from(valuesSet))
      options[column.id] = values
    })
    return options
  }, [data, filterableColumns])

  const defaultSelectedFilterColumnIds = useMemo(
    () => defaultFilterColumnIds(entityType, filterableColumns),
    [entityType, filterableColumns]
  )

  useEffect(() => {
    const filterableIds = new Set(filterableColumns.map((column) => column.id))
    setActiveFilterColumns((prev) => {
      const next = new Set<string>()
      for (const columnId of prev) {
        if (filterableIds.has(columnId)) {
          next.add(columnId)
        }
      }
      if (next.size === prev.size) return prev
      return next
    })
  }, [filterableColumns])

  useEffect(() => {
    if (hasAppliedDefaultFilterColumns) return
    if (filterableColumns.length === 0) return

    if (activeFilterColumns.size > 0) {
      setHasAppliedDefaultFilterColumns(true)
      return
    }

    setActiveFilterColumns(new Set(defaultSelectedFilterColumnIds))
    setHasAppliedDefaultFilterColumns(true)
  }, [
    activeFilterColumns.size,
    defaultSelectedFilterColumnIds,
    filterableColumns.length,
    hasAppliedDefaultFilterColumns,
  ])

  const activeFilterableColumns = useMemo(() => {
    return filterableColumns.filter((column) => activeFilterColumns.has(column.id))
  }, [activeFilterColumns, filterableColumns])

  const addableFilterColumns = useMemo(() => {
    return filterableColumns.filter((column) => !activeFilterColumns.has(column.id))
  }, [activeFilterColumns, filterableColumns])

  useEffect(() => {
    if (addableFilterColumns.length === 0) {
      if (pendingFilterColumnId !== '') {
        setPendingFilterColumnId('')
      }
      return
    }

    const hasPending = addableFilterColumns.some(
      (column) => column.id === pendingFilterColumnId
    )
    if (hasPending) return
    setPendingFilterColumnId(addableFilterColumns[0].id)
  }, [addableFilterColumns, pendingFilterColumnId])

  useEffect(() => {
    setActiveFilters((prev) => {
      const next: Record<string, Set<string>> = {}
      let changed = false
      for (const [columnId, selectedValues] of Object.entries(prev)) {
        if (!activeFilterColumns.has(columnId)) {
          changed = true
          continue
        }

        const validValues = new Set(filterOptions[columnId] ?? [])
        const filteredValues = new Set(
          Array.from(selectedValues).filter((value) => validValues.has(value))
        )
        if (filteredValues.size > 0) {
          next[columnId] = filteredValues
        }
        if (filteredValues.size !== selectedValues.size) {
          changed = true
        }
      }

      if (!changed && Object.keys(next).length === Object.keys(prev).length) {
        return prev
      }
      return next
    })
  }, [activeFilterColumns, filterOptions])

  const filteredData = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return data.filter((row) => {
      const matchesQuery = query
        ? displayColumns.some((column) =>
            String(row[column.id] ?? '')
              .toLowerCase()
              .includes(query)
          )
        : true

      if (!matchesQuery) return false

      return Object.entries(activeFilters).every(([columnId, values]) => {
        if (!values.size) return true
        const column = resolvedColumnById.get(columnId)
        if (!column) return true
        const rowKeys = filterKeysForColumnValue(column, row[columnId])
        if (rowKeys.length === 0) return false
        return rowKeys.some((key) => values.has(key))
      })
    })
  }, [activeFilters, data, displayColumns, resolvedColumnById, searchQuery])

  const formatFilterOptionLabel = (column: TableColumn, value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return value

    const temporalKind = inferTemporalKind(column)
    if (temporalKind) {
      if (DATE_FILTER_OPTION_KEYS.has(trimmed)) {
        return DATE_FILTER_OPTION_LABELS[trimmed] || trimmed
      }
      const temporalLabel = formatTemporalDisplay(trimmed, temporalKind)
      if (temporalLabel) {
        return temporalLabel
      }
    }

    const optionLabel = resolveColumnOptionLabel(column, trimmed)
    if (optionLabel) {
      return optionLabel
    }

    if (!isPeopleReferenceColumnId(column.id)) return value
    if (!isLikelyUuid(trimmed)) return value
    return profileNamesById[trimmed.toLowerCase()] || value
  }

  const getGroupLabel = useCallback(
    (column: TableColumn | undefined, rawValue: unknown, row: any): string => {
      if (rawValue === null || rawValue === undefined || rawValue === '') return 'Ungrouped'

      let formatted: unknown = rawValue
      const hasCustomFormatter = Boolean(column && typeof column.formatValue === 'function')
      if (column?.formatValue) {
        formatted = column.formatValue(rawValue, row)
      } else if (column?.options?.length) {
        const rawValues = unknownToStringList(rawValue)
        if (rawValues.length > 1 || Array.isArray(rawValue)) {
          const labeled = optionValuesToLabels(rawValues, column.options)
          if (labeled.trim()) {
            formatted = labeled
          }
        } else {
          const optionLabel = resolveColumnOptionLabel(column, String(rawValue).trim())
          if (optionLabel) {
            formatted = optionLabel
          }
        }
      }

      if (!hasCustomFormatter && column && isPeopleReferenceColumnId(column.id)) {
        const rawValues = unknownToStringList(formatted)
        if (rawValues.length > 1 || Array.isArray(formatted)) {
          const labels = rawValues.map((rawItem) => {
            const normalized = rawItem.trim()
            if (!normalized) return ''
            if (!isLikelyUuid(normalized)) return normalized
            return profileNamesById[normalized.toLowerCase()] || normalized
          })
          const joined = labels.filter(Boolean).join(', ')
          if (joined) {
            formatted = joined
          }
        } else if (typeof formatted === 'string') {
          const normalized = formatted.trim()
          if (isLikelyUuid(normalized)) {
            formatted = profileNamesById[normalized.toLowerCase()] || normalized
          }
        }
      }

      if (column) {
        const temporal = inferTemporalKind(column)
        if (temporal) {
          const display = formatTemporalDisplay(formatted, temporal)
          if (display) return display
        }
      }

      if (Array.isArray(formatted)) {
        const joined = formatted.map((item) => String(item ?? '').trim()).filter(Boolean).join(', ')
        return joined || 'Ungrouped'
      }

      const text = String(formatted ?? '').trim()
      return text || 'Ungrouped'
    },
    [profileNamesById]
  )

  const getGroupKey = useCallback((rawValue: unknown): string => {
    if (rawValue === null || rawValue === undefined || rawValue === '') return '__ungrouped__'

    if (Array.isArray(rawValue)) {
      const normalized = unknownToStringList(rawValue)
        .map((item) => item.trim())
        .filter(Boolean)
      return normalized.length > 0 ? `arr:${normalized.join('|')}` : '__ungrouped__'
    }

    if (typeof rawValue === 'object') {
      try {
        return `obj:${JSON.stringify(rawValue)}`
      } catch {
        return `obj:${String(rawValue)}`
      }
    }

    return `val:${String(rawValue).trim() || '__ungrouped__'}`
  }, [])

  const sortedData = useMemo(() => {
    if (!sort) return filteredData

    const sorted = [...filteredData]
    sorted.sort((a, b) => {
      const aValue = a[sort.id]
      const bValue = b[sort.id]

      if (aValue === bValue) return 0
      if (aValue === undefined || aValue === null) return 1
      if (bValue === undefined || bValue === null) return -1

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sort.direction === 'asc' ? aValue - bValue : bValue - aValue
      }

      const aDate = Date.parse(aValue)
      const bDate = Date.parse(bValue)
      if (!Number.isNaN(aDate) && !Number.isNaN(bDate)) {
        return sort.direction === 'asc' ? aDate - bDate : bDate - aDate
      }

      const aText = String(aValue).toLowerCase()
      const bText = String(bValue).toLowerCase()
      if (aText < bText) return sort.direction === 'asc' ? -1 : 1
      if (aText > bText) return sort.direction === 'asc' ? 1 : -1
      return 0
    })

    return sorted
  }, [filteredData, sort])

  const getRowSelectionId = (row: any): string | null => {
    const rawId = row?.id
    if (rawId === null || rawId === undefined) return null
    const normalized = String(rawId).trim()
    return normalized ? normalized : null
  }

  const selectableFilteredRowIds = useMemo(() => {
    if (!enableRowSelection) return []
    return sortedData
      .map((row) => getRowSelectionId(row))
      .filter((id): id is string => Boolean(id))
  }, [enableRowSelection, sortedData])

  const selectableFilteredRowIdSet = useMemo(
    () => new Set(selectableFilteredRowIds),
    [selectableFilteredRowIds]
  )

  useEffect(() => {
    if (!enableRowSelection) {
      if (selectedRowIds.size > 0) {
        setSelectedRowIds(new Set())
      }
      return
    }

    setSelectedRowIds((prev) => {
      if (prev.size === 0) return prev
      const next = new Set<string>()
      for (const rowId of prev) {
        if (selectableFilteredRowIdSet.has(rowId)) {
          next.add(rowId)
        }
      }
      if (next.size === prev.size) return prev
      return next
    })
  }, [enableRowSelection, selectableFilteredRowIdSet, selectedRowIds.size])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, activeFilters, sort, groupById])

  const totalRows = sortedData.length
  const pageCount = Math.max(1, Math.ceil(totalRows / pageSize))
  const safeCurrentPage = Math.min(currentPage, pageCount)

  useEffect(() => {
    if (currentPage !== safeCurrentPage) {
      setCurrentPage(safeCurrentPage)
    }
  }, [currentPage, safeCurrentPage])

  const paginatedData = useMemo(() => {
    if (totalRows === 0) return []
    const startIndex = (safeCurrentPage - 1) * pageSize
    return sortedData.slice(startIndex, startIndex + pageSize)
  }, [pageSize, safeCurrentPage, sortedData, totalRows])

  const pageRangeStart = totalRows === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1
  const pageRangeEnd = totalRows === 0 ? 0 : Math.min(totalRows, safeCurrentPage * pageSize)

  const selectedRows = useMemo(() => {
    if (!enableRowSelection || selectedRowIds.size === 0) return []
    return sortedData.filter((row) => {
      const rowId = getRowSelectionId(row)
      return rowId ? selectedRowIds.has(rowId) : false
    })
  }, [enableRowSelection, selectedRowIds, sortedData])

  const selectedRowCount = selectedRows.length

  const bulkEditableColumns = useMemo(
    () =>
      resolvedColumns.filter(
        (column) =>
          Boolean(column.editable) &&
          column.id !== 'thumbnail_url' &&
          column.id !== 'id'
      ),
    [resolvedColumns]
  )

  const bulkFieldColumn = useMemo(
    () =>
      bulkEditableColumns.find((column) => column.id === bulkFieldId) ||
      null,
    [bulkEditableColumns, bulkFieldId]
  )

  useEffect(() => {
    if (bulkEditableColumns.length === 0) {
      if (bulkFieldId) {
        setBulkFieldId('')
      }
      return
    }
    if (!bulkFieldColumn) {
      setBulkFieldId(bulkEditableColumns[0].id)
      return
    }
    if (bulkFieldColumn.editor === 'checkbox' || bulkFieldColumn.type === 'boolean') {
      if (bulkValue !== '') {
        setBulkValue('')
      }
      return
    }
    if (
      bulkFieldColumn.editor === 'select' &&
      bulkFieldColumn.options &&
      bulkFieldColumn.options.length > 0
    ) {
      const hasCurrent = bulkFieldColumn.options.some(
        (option) => option.value === bulkValue
      )
      if (!hasCurrent) {
        setBulkValue(bulkFieldColumn.options[0].value)
      }
    }
  }, [bulkEditableColumns, bulkFieldColumn, bulkFieldId, bulkValue])

  const pageSelectableRowIds = useMemo(() => {
    if (!enableRowSelection) return []
    return paginatedData
      .map((row) => getRowSelectionId(row))
      .filter((id): id is string => Boolean(id))
  }, [enableRowSelection, paginatedData])

  const pageSelectedCount = useMemo(
    () => pageSelectableRowIds.filter((rowId) => selectedRowIds.has(rowId)).length,
    [pageSelectableRowIds, selectedRowIds]
  )

  const allPageRowsSelected =
    pageSelectableRowIds.length > 0 && pageSelectedCount === pageSelectableRowIds.length
  const somePageRowsSelected =
    pageSelectedCount > 0 && pageSelectedCount < pageSelectableRowIds.length
  const allFilteredRowsSelected =
    selectableFilteredRowIds.length > 0 &&
    selectedRowCount === selectableFilteredRowIds.length

  const groupedData = useMemo<
    Record<
      string,
      {
        label: string
        rows: any[]
      }
    >
  >(() => {
    if (!groupById) {
      return {
        __all__: {
          label: 'All',
          rows: paginatedData,
        },
      }
    }

    const groupColumn = resolvedColumnById.get(groupById)
    return paginatedData.reduce<
      Record<
        string,
        {
          label: string
          rows: any[]
        }
      >
    >((acc, item) => {
      const rawGroupValue = item[groupById]
      const groupKey = getGroupKey(rawGroupValue)
      if (!acc[groupKey]) {
        acc[groupKey] = {
          label: getGroupLabel(groupColumn, rawGroupValue, item),
          rows: [],
        }
      }
      acc[groupKey].rows.push(item)
      return acc
    }, {})
  }, [getGroupKey, getGroupLabel, groupById, paginatedData, resolvedColumnById])

  const groupKeys = useMemo(() => Object.keys(groupedData), [groupedData])
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  useEffect(() => {
    setExpandedGroups(new Set(groupKeys))
  }, [groupKeys])

  const toggleGroup = (groupKey: string) => {
    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(groupKey)) {
      newExpanded.delete(groupKey)
    } else {
      newExpanded.add(groupKey)
    }
    setExpandedGroups(newExpanded)
  }

  const toggleColumn = (columnId: string) => {
    setVisibleColumns((prev) => {
      const next = new Set(prev)
      if (next.has(columnId)) {
        next.delete(columnId)
      } else {
        next.add(columnId)
      }
      return next
    })
  }

  const togglePinnedColumn = (columnId: string) => {
    setPinnedColumnIds((prev) => {
      const next = new Set(prev)
      if (next.has(columnId)) {
        next.delete(columnId)
      } else {
        next.add(columnId)
      }
      return next
    })
  }

  const toggleRowSelection = (row: any) => {
    if (!enableRowSelection) return
    const rowId = getRowSelectionId(row)
    if (!rowId) return
    setSelectedRowIds((prev) => {
      const next = new Set(prev)
      if (next.has(rowId)) {
        next.delete(rowId)
      } else {
        next.add(rowId)
      }
      return next
    })
  }

  const toggleCurrentPageSelection = () => {
    if (!enableRowSelection) return
    if (pageSelectableRowIds.length === 0) return
    setSelectedRowIds((prev) => {
      const next = new Set(prev)
      if (allPageRowsSelected) {
        for (const rowId of pageSelectableRowIds) {
          next.delete(rowId)
        }
      } else {
        for (const rowId of pageSelectableRowIds) {
          next.add(rowId)
        }
      }
      return next
    })
  }

  const selectAllFilteredRows = () => {
    if (!enableRowSelection) return
    setSelectedRowIds(new Set(selectableFilteredRowIds))
  }

  const clearSelectedRows = () => {
    setSelectedRowIds(new Set())
  }

  const exportRowsAsCsv = (rows: any[], scope: 'page' | 'filtered' | 'selected') => {
    if (rows.length === 0 || displayColumns.length === 0) return
    const document = buildCsvDocument(rows, displayColumns)
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
    const baseName = (csvExportFilename || entityType || 'table')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
    const filename = `${baseName || 'table'}-${scope}-${timestamp}.csv`
    downloadCsvFile(document, filename)
  }

  const resetCsvImportState = () => {
    setCsvImporting(false)
    setCsvImportFileName('')
    setCsvImportDelimiter(',')
    setCsvImportHeaders([])
    setCsvImportRows([])
    setCsvImportColumnMap({})
    setCsvImportStep(1)
    setCsvImportIdentifierHeader('')
    setCsvImportError(null)
    setCsvImportResult(null)
  }

  const handleCsvImportDialogToggle = (open: boolean) => {
    if (!open) {
      setCsvImportOpen(false)
      resetCsvImportState()
      return
    }
    setCsvImportOpen(true)
    setCsvImportStep(1)
    setCsvImportIdentifierHeader('')
    setCsvImportError(null)
    setCsvImportResult(null)
  }

  const buildDefaultCsvColumnMap = (headers: string[]) => {
    const usedColumns = new Set<string>()
    const nextMap: Record<string, string> = {}

    for (const header of headers) {
      const normalized = normalizeCsvMatcher(header)
      const matchedColumnId = normalized ? csvColumnMatcher.get(normalized) : undefined
      if (matchedColumnId && !usedColumns.has(matchedColumnId)) {
        nextMap[header] = matchedColumnId
        usedColumns.add(matchedColumnId)
      } else {
        nextMap[header] = ''
      }
    }

    return nextMap
  }

  const handleCsvFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.currentTarget.value = ''
    if (!file) return

    setCsvImportError(null)
    setCsvImportResult(null)

    try {
      const text = await file.text()
      const delimiter = detectCsvDelimiter(text)
      const parsedRows = parseCsvText(text, delimiter)

      if (parsedRows.length < 2) {
        throw new Error('CSV must include a header row and at least one data row.')
      }

      const rawHeaders = parsedRows[0]
      const uniqueHeaders: string[] = []
      const duplicateCounter = new Map<string, number>()

      rawHeaders.forEach((header, index) => {
        const base = String(header || '').trim() || `column_${index + 1}`
        const seen = duplicateCounter.get(base) ?? 0
        duplicateCounter.set(base, seen + 1)
        uniqueHeaders.push(seen === 0 ? base : `${base}_${seen + 1}`)
      })

      const width = uniqueHeaders.length
      const bodyRows = parsedRows
        .slice(1)
        .map((row) => {
          const normalized = row.slice(0, width)
          while (normalized.length < width) {
            normalized.push('')
          }
          return normalized
        })
        .filter((row) => row.some((cell) => String(cell).trim() !== ''))

      if (bodyRows.length === 0) {
        throw new Error('CSV has no non-empty rows to import.')
      }

      setCsvImportFileName(file.name)
      setCsvImportDelimiter(delimiter)
      setCsvImportHeaders(uniqueHeaders)
      setCsvImportRows(bodyRows)
      setCsvImportColumnMap(buildDefaultCsvColumnMap(uniqueHeaders))
      setCsvImportStep(2)
      setCsvImportIdentifierHeader('')
    } catch (error) {
      setCsvImportHeaders([])
      setCsvImportRows([])
      setCsvImportColumnMap({})
      setCsvImportStep(1)
      setCsvImportIdentifierHeader('')
      setCsvImportError(
        error instanceof Error
          ? error.message
          : 'Failed to parse CSV file. Please check the file format.'
      )
    }
  }

  const handleCsvColumnMappingChange = (header: string, columnId: string) => {
    setCsvImportColumnMap((prev) => ({
      ...prev,
      [header]: columnId,
    }))
  }

  useEffect(() => {
    if (!csvImportIdentifierHeader) return
    if (!csvImportHeaders.includes(csvImportIdentifierHeader)) {
      setCsvImportIdentifierHeader('')
      return
    }
    const mappedColumnId = csvImportColumnMap[csvImportIdentifierHeader]
    if (!mappedColumnId) {
      setCsvImportIdentifierHeader('')
    }
  }, [csvImportColumnMap, csvImportHeaders, csvImportIdentifierHeader])

  const submitCsvImport = async () => {
    if (!onCsvImport) return
    if (csvImportRows.length === 0 || csvImportHeaders.length === 0) {
      setCsvImportError('Upload a CSV file before importing.')
      return
    }

    if (csvMappedEntries.length === 0) {
      setCsvImportError('Map at least one CSV column to continue.')
      return
    }

    const mappedRows: Record<string, unknown>[] = csvImportRows
      .map((row) => {
        const payload: Record<string, unknown> = {}
        for (const entry of csvMappedEntries) {
          const targetColumn = resolvedColumnById.get(entry.targetColumnId)
          const rawCell = row[entry.index] ?? ''
          const nextValue = targetColumn
            ? parseCsvCellByColumn(rawCell, targetColumn)
            : rawCell.trim()

          if (nextValue === null || nextValue === '') continue
          if (Array.isArray(nextValue) && nextValue.length === 0) continue
          payload[entry.targetColumnId] = nextValue
        }
        return payload
      })
      .filter((row) => Object.keys(row).length > 0)

    if (mappedRows.length === 0) {
      setCsvImportError('No mappable values found in the uploaded CSV rows.')
      return
    }

    setCsvImporting(true)
    setCsvImportError(null)
    setCsvImportResult(null)

    try {
      const result = await onCsvImport(mappedRows, {
        fileName: csvImportFileName,
        headers: csvImportHeaders,
        columnMap: csvImportColumnMap,
        delimiter: csvImportDelimiter,
        identifierHeader: csvImportIdentifierHeader || null,
        identifierTargetColumn: csvIdentifierTargetColumn,
      })
      const failed = Array.isArray(result?.failed) ? result.failed : []
      const imported =
        typeof result?.imported === 'number'
          ? result.imported
          : Math.max(mappedRows.length - failed.length, 0)
      setCsvImportResult({
        imported,
        failed,
      })
      if (failed.length === 0) {
        setCsvImportFileName('')
        setCsvImportDelimiter(',')
        setCsvImportHeaders([])
        setCsvImportRows([])
        setCsvImportColumnMap({})
        setCsvImportStep(1)
        setCsvImportIdentifierHeader('')
      }
    } catch (error) {
      setCsvImportError(
        error instanceof Error
          ? error.message
          : 'CSV import failed. Please retry.'
      )
    } finally {
      setCsvImporting(false)
    }
  }

  const handleBulkDeleteSelected = async () => {
    if (!onBulkDelete) return
    if (selectedRows.length === 0) return
    if (isBulkDeleting) return
    const confirmed = window.confirm(
      `Delete ${selectedRows.length} selected item${selectedRows.length === 1 ? '' : 's'}?`
    )
    if (!confirmed) return

    setIsBulkDeleting(true)
    try {
      await onBulkDelete(selectedRows)
      setSelectedRowIds(new Set())
    } catch (error) {
      reportCellUpdateError(error)
    } finally {
      setIsBulkDeleting(false)
    }
  }

  const handleBulkFieldUpdate = async () => {
    if (!onCellUpdate) return
    if (selectedRows.length === 0) return
    if (!bulkFieldColumn) return
    if (bulkApplying) return

    const toBaseValue = () => {
      if (
        bulkFieldColumn.editor === 'checkbox' ||
        bulkFieldColumn.type === 'boolean'
      ) {
        return bulkBooleanValue === 'true'
      }

      if (bulkFieldColumn.editor === 'multiselect') {
        return stringToList(bulkValue)
      }

      const inputType = resolveInputType(bulkFieldColumn)
      if (inputType === 'number') {
        const trimmed = bulkValue.trim()
        if (!trimmed) return null
        const parsed = Number(trimmed)
        return Number.isNaN(parsed) ? null : parsed
      }
      if (inputType === 'date') {
        const trimmed = bulkValue.trim()
        return trimmed || null
      }
      if (inputType === 'datetime-local') {
        const trimmed = bulkValue.trim()
        if (!trimmed) return null
        const parsed = new Date(trimmed)
        return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
      }

      if (bulkFieldColumn.editor === 'select') {
        const trimmed = bulkValue.trim()
        return trimmed || null
      }

      return bulkValue
    }

    setBulkApplying(true)
    const failures: string[] = []

    try {
      for (const row of selectedRows) {
        try {
          const baseValue = toBaseValue()
          const nextValue = bulkFieldColumn.parseValue
            ? bulkFieldColumn.parseValue(baseValue as any, row)
            : baseValue
          await onCellUpdate(row, bulkFieldColumn, nextValue)
        } catch (error) {
          const rowId = getRowSelectionId(row) || 'row'
          const message =
            error instanceof Error ? error.message : 'Update failed'
          failures.push(`${rowId}: ${message}`)
        }
      }
    } finally {
      setBulkApplying(false)
    }

    if (failures.length > 0) {
      const preview = failures.slice(0, 3).join('; ')
      reportCellUpdateError(
        new Error(
          failures.length > 3
            ? `${preview}; and ${failures.length - 3} more`
            : preview
        )
      )
      return
    }

    setBulkValue('')
  }

  const handleDragStart = (columnId: string) => {
    setDraggedColumnId(columnId)
  }

  const handleDrop = (targetId: string) => {
    if (!draggedColumnId || draggedColumnId === targetId) return
    setColumnOrder((prev) => {
      const next = [...prev]
      const fromIndex = next.indexOf(draggedColumnId)
      const toIndex = next.indexOf(targetId)
      if (fromIndex === -1 || toIndex === -1) return prev
      next.splice(fromIndex, 1)
      next.splice(toIndex, 0, draggedColumnId)
      return next
    })
    setDraggedColumnId(null)
  }

  const handleResizeStart = (columnId: string, event: React.MouseEvent) => {
    event.preventDefault()
    const currentWidth =
      columnWidths[columnId] ??
      (event.currentTarget.parentElement as HTMLElement | null)?.offsetWidth ??
      120
    resizeRef.current = {
      id: columnId,
      startX: event.clientX,
      startWidth: currentWidth,
    }
    const handleMove = (moveEvent: MouseEvent) => {
      if (!resizeRef.current) return
      const delta = moveEvent.clientX - resizeRef.current.startX
      const nextWidth = Math.max(80, resizeRef.current.startWidth + delta)
      setColumnWidths((prev) => ({ ...prev, [resizeRef.current!.id]: nextWidth }))
    }
    const handleUp = () => {
      resizeRef.current = null
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
    }
    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
  }

  const clearFilters = () => {
    setActiveFilters({})
  }

  const addFilterColumn = (columnId: string) => {
    const normalized = columnId.trim()
    if (!normalized) return
    setActiveFilterColumns((prev) => {
      if (prev.has(normalized)) return prev
      const next = new Set(prev)
      next.add(normalized)
      return next
    })
  }

  const removeFilterColumn = (columnId: string) => {
    setActiveFilterColumns((prev) => {
      if (!prev.has(columnId)) return prev
      const next = new Set(prev)
      next.delete(columnId)
      return next
    })
    setActiveFilters((prev) => {
      if (!prev[columnId]) return prev
      const next = { ...prev }
      delete next[columnId]
      return next
    })
    setExpandedFilterColumns((prev) => {
      if (!prev.has(columnId)) return prev
      const next = new Set(prev)
      next.delete(columnId)
      return next
    })
  }

  const toggleFilterValue = (columnId: string, value: string) => {
    setActiveFilters((prev) => {
      const next = { ...prev }
      const set = new Set(next[columnId] ?? [])
      if (set.has(value)) {
        set.delete(value)
      } else {
        set.add(value)
      }
      if (set.size > 0) {
        next[columnId] = set
      } else {
        delete next[columnId]
      }
      return next
    })
  }

  const toggleFilterExpand = (columnId: string) => {
    setExpandedFilterColumns((prev) => {
      const next = new Set(prev)
      if (next.has(columnId)) {
        next.delete(columnId)
      } else {
        next.add(columnId)
      }
      return next
    })
  }

  const startEditing = (row: any, column: TableColumn) => {
    if (!onCellUpdate || !column.editable || column.editor === 'checkbox') return
    const rawValue = row[column.id]

    if (column.editor === 'multiselect') {
      const initialValues = unknownToStringList(rawValue)
      setDraftListValue(initialValues)
      setDraftValue(initialValues.join(', '))
      setMultiselectOpen(true)
      setEditingCell({ rowId: row.id, columnId: column.id })
      return
    }

    if (column.editor === 'select') {
      setDraftValue(rawValue === null || rawValue === undefined ? '' : String(rawValue))
      setEditingCell({ rowId: row.id, columnId: column.id })
      return
    }

    const temporal = inferTemporalKind(column)
    if (temporal === 'date') {
      setDraftValue(toDateInputValue(rawValue))
      setEditingCell({ rowId: row.id, columnId: column.id })
      return
    }
    if (temporal === 'datetime') {
      setDraftValue(toDateTimeLocalInputValue(rawValue))
      setEditingCell({ rowId: row.id, columnId: column.id })
      return
    }

    const formatted = column.formatValue
      ? column.formatValue(rawValue, row)
      : Array.isArray(rawValue)
        ? rawValue.join(', ')
        : rawValue ?? ''
    setDraftValue(String(formatted ?? ''))
    setEditingCell({ rowId: row.id, columnId: column.id })
  }

  const cancelEditing = () => {
    setEditingCell(null)
    setDraftValue('')
    setDraftListValue([])
    setMultiselectOpen(false)
  }

  const commitEditing = async () => {
    if (!editingCell || !onCellUpdate) return
    const row = data.find((item) => item.id === editingCell.rowId)
    const column = resolvedColumns.find((col) => col.id === editingCell.columnId)
    if (!row || !column) {
      cancelEditing()
      return
    }

    let nextValue: any = draftValue
    if (column.editor === 'multiselect') {
      nextValue = [...draftListValue]
      if (column.parseValue) {
        nextValue = column.parseValue(nextValue, row)
      }
    } else if (column.parseValue) {
      nextValue = column.parseValue(draftValue, row)
    } else {
      const inputType = resolveInputType(column)
      if (inputType === 'number') {
        if (draftValue.trim() === '') {
          nextValue = null
        } else {
          const parsed = Number(draftValue)
          nextValue = Number.isNaN(parsed) ? null : parsed
        }
      } else if (inputType === 'date') {
        nextValue = draftValue.trim() === '' ? null : draftValue
      } else if (inputType === 'datetime-local') {
        if (draftValue.trim() === '') {
          nextValue = null
        } else {
          const parsed = new Date(draftValue)
          nextValue = Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
        }
      }
    }

    try {
      await onCellUpdate(row, column, nextValue)
      cancelEditing()
    } catch (error) {
      reportCellUpdateError(error)
    }
  }

  const filterCount = Object.values(activeFilters).reduce(
    (total, set) => total + set.size,
    0
  )

  const densityClasses =
    density === 0
      ? { header: 'px-1.5 py-1 text-[10px]', cell: 'px-1.5 py-1 text-xs' }
      : density === 2
        ? { header: 'px-2.5 py-2.5 text-[11px]', cell: 'px-2.5 py-2.5 text-sm' }
        : { header: 'px-2 py-1.5 text-[10px]', cell: 'px-2 py-1.5 text-xs' }

  const renderCell = (column: TableColumn, value: any, row: any) => {
    const columnIdLower = column.id.toLowerCase()
    if (
      typeof value === 'string' &&
      value.trim() &&
      (columnIdLower === 'created_by' ||
        columnIdLower === 'updated_by' ||
        columnIdLower.endsWith('_by'))
    ) {
      const profileName = profileNamesById[value.trim().toLowerCase()]
      if (profileName) {
        return <span className="text-foreground">{profileName}</span>
      }
    }

    if (column.editable && column.editor === 'checkbox' && onCellUpdate) {
      return (
        <label
          className="flex items-center gap-2"
          onClick={(event) => event.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={async (event) => {
              event.stopPropagation()
              try {
                await onCellUpdate(row, column, event.target.checked)
              } catch (error) {
                reportCellUpdateError(error)
              }
            }}
            className="h-4 w-4 rounded border border-border bg-card"
          />
          <span className="text-xs text-foreground">{value ? 'Yes' : 'No'}</span>
        </label>
      )
    }

    switch (column.type) {
      case 'date': {
        if (value === null || value === undefined || value === '') {
          return <span className="text-muted-foreground">-</span>
        }
        const display = formatDateDisplay(value)
        if (!display) {
          return <span className="text-foreground">{String(value)}</span>
        }
        return (
          <span className="text-foreground" title={display}>
            {display}
          </span>
        )
      }
      case 'datetime': {
        if (value === null || value === undefined || value === '') {
          return <span className="text-muted-foreground">-</span>
        }
        const display = formatDateTimeDisplay(value)
        if (!display) {
          return <span className="text-foreground">{String(value)}</span>
        }
        return (
          <span className="text-foreground" title={display}>
            {display}
          </span>
        )
      }
      case 'thumbnail': {
        const thumbnailSource = normalizeThumbnailSource(value)

        if (column.editable && onCellUpdate) {
          return (
            <label
              className="flex cursor-pointer items-center justify-center"
              title="Upload thumbnail"
              onClick={(event) => event.stopPropagation()}
            >
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onClick={(event) => event.stopPropagation()}
                onChange={async (event) => {
                  event.stopPropagation()
                  const file = event.target.files?.[0]
                  event.currentTarget.value = ''
                  if (!file) return
                  if (!file.type.startsWith('image/')) {
                    reportCellUpdateError(new Error('Thumbnail must be an image file'))
                    return
                  }
                  if (file.size > MAX_THUMBNAIL_UPLOAD_BYTES) {
                    reportCellUpdateError(
                      new Error('Thumbnail image is too large (max 8MB)')
                    )
                    return
                  }
                  try {
                    const dataUrl = await optimizeThumbnailDataUrl(file)
                    await onCellUpdate(row, column, dataUrl)
                  } catch (error) {
                    reportCellUpdateError(error)
                  }
                }}
              />
              <ThumbnailPreview
                source={thumbnailSource}
                className="h-10 w-10 rounded object-cover ring-1 ring-ring transition hover:ring-primary"
                fallback={
                  <div className="flex h-10 w-10 items-center justify-center rounded bg-accent text-[10px] text-muted-foreground transition hover:text-foreground/80">
                    Upload
                  </div>
                }
              />
            </label>
          )
        }
        return (
          <div className="flex items-center justify-center">
            <ThumbnailPreview
              source={thumbnailSource}
              className="h-10 w-10 rounded object-cover"
              fallback={
                <div className="flex h-10 w-10 items-center justify-center rounded bg-accent text-xs text-muted-foreground">
                  Upload
                </div>
              }
            />
          </div>
        )
      }
      case 'link':
        if (column.linkHref) {
          const href = column.linkHref(row)
          if (!href) {
            if (value === null || value === undefined || value === '') {
              return <span className="text-muted-foreground">-</span>
            }
            return <span className="text-foreground">{String(value)}</span>
          }
          return (
            <Link
              href={href}
              className="text-primary transition hover:text-primary/80"
              onClick={(e) => {
                e.stopPropagation()
              }}
            >
              {value}
            </Link>
          )
        }
        return (
          <a
            href="#"
            className="text-primary transition hover:text-primary/80"
            onClick={(e) => {
              e.stopPropagation()
            }}
          >
            {value}
          </a>
        )
      case 'status':
        return (
          <div className="flex items-center gap-2">
            <div
              className={`h-2 w-2 rounded-full ${
                value === 'Active' ? 'bg-green-500' : 'bg-muted-foreground/30'
              }`}
            />
            <span>{value}</span>
          </div>
        )
      case 'pipeline':
        return (
          <div className="flex gap-1">
            {(value || []).map((status: any, i: number) => (
              <div
                key={i}
                className="h-6 w-4 cursor-pointer rounded transition hover:opacity-80"
                style={{ backgroundColor: status.color || '#6b7280' }}
                title={status.step}
              />
            ))}
          </div>
        )
      case 'url': {
        if (value === null || value === undefined || value === '') {
          return <span className="text-muted-foreground">-</span>
        }
        const href = String(value)
        return (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="text-primary transition hover:text-primary/80"
            onClick={(e) => e.stopPropagation()}
          >
            {href}
          </a>
        )
      }
      case 'color': {
        if (value === null || value === undefined || value === '') {
          return <span className="text-muted-foreground">-</span>
        }
        const display = String(value)
        return (
          <div className="flex items-center gap-2">
            <span
              className="h-3 w-3 rounded-sm border border-border"
              style={{ backgroundColor: display }}
              title={display}
            />
            <span className="text-foreground">{display}</span>
          </div>
        )
      }
      case 'boolean': {
        if (value === null || value === undefined || value === '') {
          return <span className="text-muted-foreground">-</span>
        }
        return <span className="text-foreground">{Boolean(value) ? 'Yes' : 'No'}</span>
      }
      case 'json': {
        if (value === null || value === undefined || value === '') {
          return <span className="text-muted-foreground">-</span>
        }
        const display = typeof value === 'string' ? value : JSON.stringify(value)
        return (
          <span className="max-w-[240px] truncate text-foreground" title={display}>
            {display}
          </span>
        )
      }
      default: {
        if (value === null || value === undefined || value === '') {
          return <span className="text-muted-foreground">-</span>
        }

        const hasCustomFormatter = typeof column.formatValue === 'function'
        let formatted = hasCustomFormatter
          ? column.formatValue?.(value, row)
          : value

        if (!hasCustomFormatter && column.options?.length) {
          const rawValues = unknownToStringList(value)
          if (rawValues.length > 1 || Array.isArray(value)) {
            const labeled = optionValuesToLabels(rawValues, column.options)
            if (labeled.trim()) {
              formatted = labeled
            }
          } else {
            const optionLabel = resolveColumnOptionLabel(
              column,
              String(value).trim()
            )
            if (optionLabel) {
              formatted = optionLabel
            }
          }
        }

        if (!hasCustomFormatter && isPeopleReferenceColumnId(column.id)) {
          const rawValues = unknownToStringList(formatted)
          if (rawValues.length > 1 || Array.isArray(formatted)) {
            const labels = rawValues.map((rawItem) => {
              const normalized = rawItem.trim()
              if (!normalized) return ''
              if (!isLikelyUuid(normalized)) return normalized
              return profileNamesById[normalized.toLowerCase()] || normalized
            })
            const joined = labels.filter(Boolean).join(', ')
            if (joined) {
              formatted = joined
            }
          } else if (typeof formatted === 'string') {
            const normalized = formatted.trim()
            if (isLikelyUuid(normalized)) {
              formatted =
                profileNamesById[normalized.toLowerCase()] || normalized
            }
          }
        }

        const temporal = inferTemporalKind(column)
        if (temporal) {
          const display = formatTemporalDisplay(formatted, temporal)
          if (display) {
            return (
              <span className="text-foreground" title={display}>
                {display}
              </span>
            )
          }
        }

        if (Array.isArray(formatted)) {
          const display = formatted.join(', ')
          return (
            <span className="max-w-[240px] truncate text-foreground" title={display}>
              {display || '-'}
            </span>
          )
        }

        if (typeof formatted === 'boolean') {
          return <span className="text-foreground">{formatted ? 'Yes' : 'No'}</span>
        }

        if (typeof formatted === 'object') {
          const display = JSON.stringify(formatted)
          return (
            <span className="max-w-[240px] truncate text-foreground" title={display}>
              {display}
            </span>
          )
        }

        const display = String(formatted)
        return (
          <span className="max-w-[240px] truncate text-foreground" title={display}>
            {display}
          </span>
        )
      }
    }
  }

  const resolveRowActions = (row: any): RowActionItem[] => {
    const actions: RowActionItem[] = []

    if (onEdit) {
      actions.push({
        label: 'Edit',
        onClick: () => onEdit(row),
      })
    } else if (onCellUpdate) {
      const editableColumn = displayColumns.find(
        (column) => column.editable && column.editor !== 'checkbox'
      )
      if (editableColumn) {
        actions.push({
          label: 'Edit',
          onClick: () => startEditing(row, editableColumn),
        })
      }
    }

    if (onDelete) {
      actions.push({
        label: 'Delete',
        onClick: () => onDelete(row),
        variant: 'destructive',
      })
    }

    if (rowActions) {
      actions.push(...rowActions(row))
    }

    return actions
  }

  const openBuiltInContextMenu = (
    row: any,
    event: React.MouseEvent<HTMLElement>
  ) => {
    const actions = resolveRowActions(row)
    if (actions.length === 0) return
    event.preventDefault()
    event.stopPropagation()
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      actions,
    })
  }

  const handleListRowContextMenu = (
    row: any,
    event: React.MouseEvent<HTMLTableRowElement>
  ) => {
    setContextMenu(null)
    if (onRowContextMenu) {
      onRowContextMenu(row, event)
      return
    }
    openBuiltInContextMenu(row, event)
  }

  const handleGridCardContextMenu = (
    row: any,
    event: React.MouseEvent<HTMLElement>
  ) => {
    if (onRowContextMenu) return
    openBuiltInContextMenu(row, event)
  }

  const csvMappedEntries = useMemo(
    () =>
      csvImportHeaders
        .map((header, index) => ({
          header,
          index,
          targetColumnId: csvImportColumnMap[header] || '',
        }))
        .filter((entry) => entry.targetColumnId),
    [csvImportColumnMap, csvImportHeaders]
  )
  const csvMappedColumnCount = csvMappedEntries.length
  const csvMappedTargetColumns = useMemo(
    () =>
      csvMappedEntries.map((entry) => ({
        header: entry.header,
        targetColumnId: entry.targetColumnId,
        targetColumnLabel:
          resolvedColumnById.get(entry.targetColumnId)?.label || entry.targetColumnId,
      })),
    [csvMappedEntries, resolvedColumnById]
  )
  const hasCsvDataLoaded = csvImportRows.length > 0 && csvImportHeaders.length > 0
  const csvPreviewRows = csvImportRows.slice(0, 5)
  const csvMappedPreviewRows = useMemo(
    () =>
      csvPreviewRows.map((row) =>
        csvMappedEntries.map((entry) => row[entry.index] || '')
      ),
    [csvMappedEntries, csvPreviewRows]
  )
  const csvImportSteps = [
    { id: 1, label: 'Step 1: Add your data' },
    { id: 2, label: 'Step 2: Map column names' },
    { id: 3, label: 'Step 3: Specify ID' },
    { id: 4, label: 'Step 4: Preview' },
  ] as const
  const canVisitCsvStep = (stepId: number) => {
    if (stepId <= 1) return true
    if (!hasCsvDataLoaded) return false
    if (stepId <= 2) return true
    if (csvMappedColumnCount === 0) return false
    return true
  }
  const goToCsvStep = (stepId: number) => {
    if (!canVisitCsvStep(stepId)) return
    setCsvImportStep(stepId)
    setCsvImportError(null)
  }
  const goToNextCsvStep = () => {
    if (csvImportStep === 1) {
      if (!hasCsvDataLoaded) {
        setCsvImportError('Upload a CSV file before continuing.')
        return
      }
      goToCsvStep(2)
      return
    }
    if (csvImportStep === 2) {
      if (csvMappedColumnCount === 0) {
        setCsvImportError('Map at least one column before continuing.')
        return
      }
      goToCsvStep(3)
      return
    }
    if (csvImportStep === 3) {
      goToCsvStep(4)
    }
  }
  const goToPreviousCsvStep = () => {
    const previous = Math.max(1, csvImportStep - 1)
    goToCsvStep(previous)
  }
  const csvIdentifierTargetColumn = csvImportIdentifierHeader
    ? csvImportColumnMap[csvImportIdentifierHeader] || null
    : null

  const toolbarActions = (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            disabled={displayColumns.length === 0 || totalRows === 0}
            className="flex items-center gap-1 rounded-sm border border-border px-2 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-foreground/70 transition hover:border-border hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            CSV
            <ChevronDown className="h-3 w-3" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="border-border bg-card text-foreground"
        >
          <DropdownMenuLabel className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Export CSV
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-secondary" />
          <DropdownMenuItem
            onSelect={() => exportRowsAsCsv(paginatedData, 'page')}
            className="focus:bg-accent focus:text-foreground"
            disabled={paginatedData.length === 0}
          >
            Export Current Page ({paginatedData.length})
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => exportRowsAsCsv(sortedData, 'filtered')}
            className="focus:bg-accent focus:text-foreground"
            disabled={sortedData.length === 0}
          >
            Export Filtered ({sortedData.length})
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => exportRowsAsCsv(selectedRows, 'selected')}
            className="focus:bg-accent focus:text-foreground"
            disabled={selectedRows.length === 0}
          >
            Export Selected ({selectedRows.length})
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {onCsvImport ? (
        <button
          type="button"
          onClick={() => handleCsvImportDialogToggle(true)}
          className="flex items-center gap-1 rounded-sm border border-border px-2 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-foreground/70 transition hover:border-border hover:text-foreground"
        >
          <Upload className="h-3.5 w-3.5" />
          Import CSV
        </button>
      ) : null}
    </>
  )

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col gap-3">
      {showToolbar && (
        <TableToolbar
          entityType={entityType}
          columns={resolvedColumns}
          visibleColumns={visibleColumns}
          pinnedColumnIds={pinnedColumnIds}
          onToggleColumn={toggleColumn}
          onTogglePinnedColumn={togglePinnedColumn}
          allowGridView={allowGridView}
          onAdd={onAdd}
          view={view}
          onViewChange={setView}
          showGridSizeControl={allowGridView && entityType === 'projects'}
          gridCardSize={gridCardSize}
          onGridCardSizeChange={(value) => setGridCardSize(clampGridCardSize(value))}
          sort={sort}
          onSortChange={setSort}
          groupBy={groupById}
          onGroupByChange={setGroupById}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filterCount={filterCount}
          filtersOpen={filtersOpen}
          onToggleFilters={() => setFiltersOpen((prev) => !prev)}
          onCloseFilters={() => setFiltersOpen(false)}
          toolbarActions={toolbarActions}
          filtersPanel={
            showFiltersPanel && filterableColumns.length > 0 ? (
              <div className="absolute left-0 top-full z-30 mt-2 hidden w-[22rem] lg:block">
                <div className="rounded-md border border-border bg-background/95 p-3 text-sm text-foreground/80 shadow-lg">
                  <div className="flex items-center justify-between border-b border-border pb-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    <span>Filters</span>
                    <button
                      onClick={clearFilters}
                      className="text-[10px] uppercase tracking-[0.2em] text-primary hover:text-primary/80"
                    >
                      Clear values
                    </button>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <select
                      value={pendingFilterColumnId}
                      onChange={(event) => setPendingFilterColumnId(event.target.value)}
                      disabled={addableFilterColumns.length === 0}
                      className="flex-1 rounded border border-border bg-card px-2 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:text-muted-foreground"
                    >
                      {addableFilterColumns.length === 0 ? (
                        <option value="">All available filters added</option>
                      ) : (
                        addableFilterColumns.map((column) => (
                          <option key={column.id} value={column.id}>
                            {column.label}
                          </option>
                        ))
                      )}
                    </select>
                    <button
                      type="button"
                      onClick={() => addFilterColumn(pendingFilterColumnId)}
                      disabled={!pendingFilterColumnId}
                      className="rounded border border-border px-2 py-1.5 text-[10px] uppercase tracking-[0.2em] text-foreground/70 transition hover:border-border hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Add Filter
                    </button>
                  </div>

                  {activeFilterableColumns.length === 0 ? (
                    <div className="mt-3 rounded border border-border bg-card/60 px-3 py-2 text-xs text-muted-foreground">
                      No active filters. Add a field to filter this page.
                    </div>
                  ) : (
                    <div className="mt-3 space-y-3">
                      {activeFilterableColumns.map((column) => (
                        <div
                          key={column.id}
                          className="rounded border border-border bg-card/50 p-2"
                        >
                          <div className="flex items-center justify-between">
                            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                              {column.label}
                            </p>
                            <button
                              type="button"
                              onClick={() => removeFilterColumn(column.id)}
                              className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground transition hover:text-foreground/80"
                            >
                              Remove
                            </button>
                          </div>

                          <div className="mt-2 space-y-2">
                            {(filterOptions[column.id] ?? [])
                              .slice(
                                0,
                                expandedFilterColumns.has(column.id) ? undefined : 5
                              )
                              .map((value) => (
                                <label
                                  key={value}
                                  className="flex items-center gap-2 text-xs text-foreground/70"
                                >
                                  <input
                                    type="checkbox"
                                    checked={activeFilters[column.id]?.has(value) ?? false}
                                    onChange={() => toggleFilterValue(column.id, value)}
                                    className="h-3 w-3 rounded border border-border bg-card"
                                  />
                                  <span>{formatFilterOptionLabel(column, value)}</span>
                                </label>
                              ))}
                            {(filterOptions[column.id]?.length ?? 0) > 5 && (
                              <button
                                type="button"
                                onClick={() => toggleFilterExpand(column.id)}
                                className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground/80"
                              >
                                {expandedFilterColumns.has(column.id)
                                  ? 'Show less'
                                  : 'Show more'}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : null
          }
        />
      )}

      {enableRowSelection && selectedRowCount > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-background/80 px-3 py-2 text-xs text-foreground/70">
          <span className="font-medium uppercase tracking-[0.16em] text-foreground/80">
            {selectedRowCount} selected
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {onCellUpdate && bulkEditableColumns.length > 0 && bulkFieldColumn ? (
              <>
                <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  Bulk update
                </span>
                <select
                  value={bulkFieldId}
                  onChange={(event) => {
                    setBulkFieldId(event.target.value)
                    setBulkValue('')
                  }}
                  disabled={bulkApplying}
                  className="rounded border border-border bg-card px-2 py-1 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {bulkEditableColumns.map((column) => (
                    <option key={column.id} value={column.id}>
                      {column.label}
                    </option>
                  ))}
                </select>
                {bulkFieldColumn.editor === 'select' &&
                bulkFieldColumn.options &&
                bulkFieldColumn.options.length > 0 ? (
                  <select
                    value={bulkValue}
                    onChange={(event) => setBulkValue(event.target.value)}
                    disabled={bulkApplying}
                    className="rounded border border-border bg-card px-2 py-1 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {bulkFieldColumn.options.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : bulkFieldColumn.editor === 'checkbox' ||
                  bulkFieldColumn.type === 'boolean' ? (
                  <select
                    value={bulkBooleanValue}
                    onChange={(event) =>
                      setBulkBooleanValue(
                        event.target.value === 'false' ? 'false' : 'true'
                      )
                    }
                    disabled={bulkApplying}
                    className="rounded border border-border bg-card px-2 py-1 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="true">True</option>
                    <option value="false">False</option>
                  </select>
                ) : (
                  <input
                    type={resolveInputType(bulkFieldColumn)}
                    value={bulkValue}
                    onChange={(event) => setBulkValue(event.target.value)}
                    disabled={bulkApplying}
                    placeholder={
                      bulkFieldColumn.editor === 'multiselect'
                        ? 'Comma-separated values'
                        : 'Value'
                    }
                    className="min-w-[170px] rounded border border-border bg-card px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
                  />
                )}
                <button
                  type="button"
                  onClick={handleBulkFieldUpdate}
                  disabled={bulkApplying}
                  className="rounded border border-primary/70 px-2 py-1 text-[11px] uppercase tracking-[0.16em] text-primary transition hover:border-primary/70 hover:text-primary/70 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {bulkApplying ? 'Applying...' : 'Apply'}
                </button>
              </>
            ) : null}
            <button
              type="button"
              onClick={toggleCurrentPageSelection}
              className="rounded border border-border px-2 py-1 text-[11px] uppercase tracking-[0.16em] text-foreground/70 transition hover:border-border hover:text-foreground"
            >
              {allPageRowsSelected ? 'Unselect page' : 'Select page'}
            </button>
            {!allFilteredRowsSelected ? (
              <button
                type="button"
                onClick={selectAllFilteredRows}
                className="rounded border border-border px-2 py-1 text-[11px] uppercase tracking-[0.16em] text-foreground/70 transition hover:border-border hover:text-foreground"
              >
                Select filtered ({sortedData.length})
              </button>
            ) : null}
            <button
              type="button"
              onClick={clearSelectedRows}
              className="rounded border border-border px-2 py-1 text-[11px] uppercase tracking-[0.16em] text-foreground/70 transition hover:border-border hover:text-foreground"
            >
              Clear
            </button>
            {onBulkDelete ? (
              <button
                type="button"
                onClick={handleBulkDeleteSelected}
                disabled={isBulkDeleting}
                className="flex items-center gap-1 rounded border border-red-400/60 px-2 py-1 text-[11px] uppercase tracking-[0.16em] text-red-300 transition hover:border-red-300 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {isBulkDeleting ? 'Deleting...' : 'Delete selected'}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="flex min-h-0 min-w-0 flex-1">
        <div className="relative flex min-h-0 min-w-0 flex-1">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-md border border-border bg-background/70 shadow-sm">
            <div className="min-h-0 min-w-0 flex-1 overflow-x-auto overflow-y-auto">
              {allowGridView && view === 'grid' ? (
                <div
                  className={`grid gap-4 p-3 ${
                    entityType === 'projects'
                      ? 'bg-background'
                      : 'sm:grid-cols-2 xl:grid-cols-3'
                  }`}
                  style={
                    entityType === 'projects'
                      ? {
                          gridTemplateColumns: `repeat(auto-fill, minmax(${clampGridCardSize(
                            gridCardSize
                          )}px, 1fr))`,
                        }
                      : undefined
                  }
                >
                  {paginatedData.length === 0 && emptyState ? (
                    <div className="col-span-full rounded-md border border-border bg-background/40 p-8">
                      {emptyState}
                    </div>
                  ) : null}
                  {paginatedData.map((row, index) => {
                    const rowSelectionId = getRowSelectionId(row)
                    const isRowSelected = rowSelectionId
                      ? selectedRowIds.has(rowSelectionId)
                      : false

                    if (entityType === 'projects') {
                      const name = row.name || 'Untitled'
                      const thumbnailColumn =
                        resolvedColumns.find((column) => column.id === 'thumbnail_url') ??
                        ({
                          id: 'thumbnail_url',
                          label: 'Thumbnail',
                          type: 'thumbnail',
                          editable: true,
                        } as TableColumn)
                      const canEditProjectThumbnail = Boolean(
                        thumbnailColumn.editable && onCellUpdate
                      )
                      const projectThumbnail = normalizeThumbnailSource(row?.thumbnail_url)
                      return (
                        <div
                          key={row.id || index}
                          className={`relative overflow-hidden rounded-md border bg-background text-left shadow-[0_1px_2px_rgba(0,0,0,0.35)] transition ${
                            isRowSelected
                              ? 'border-primary/80'
                              : 'border-border hover:border-border'
                          }`}
                          onContextMenu={(event) => handleGridCardContextMenu(row, event)}
                        >
                          {enableRowSelection && rowSelectionId ? (
                            <label
                              className="absolute left-2 top-2 z-20 flex h-6 w-6 cursor-pointer items-center justify-center rounded border border-border bg-card/90"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <input
                                type="checkbox"
                                checked={isRowSelected}
                                onChange={() => toggleRowSelection(row)}
                                className="h-3.5 w-3.5 rounded border border-border bg-card"
                              />
                            </label>
                          ) : null}
                          <div className="relative aspect-square w-full bg-card">
                            {canEditProjectThumbnail ? (
                              <label
                                className="group/thumb block h-full w-full cursor-pointer"
                                title="Upload thumbnail"
                                onClick={(event) => event.stopPropagation()}
                              >
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onClick={(event) => event.stopPropagation()}
                                  onChange={async (event) => {
                                    event.stopPropagation()
                                    const file = event.target.files?.[0]
                                    event.currentTarget.value = ''
                                    if (!file) return
                                    if (!file.type.startsWith('image/')) {
                                      reportCellUpdateError(
                                        new Error('Thumbnail must be an image file')
                                      )
                                      return
                                    }
                                    if (file.size > MAX_THUMBNAIL_UPLOAD_BYTES) {
                                      reportCellUpdateError(
                                        new Error('Thumbnail image is too large (max 8MB)')
                                      )
                                      return
                                    }

                                    try {
                                      const dataUrl = await optimizeThumbnailDataUrl(file)
                                      await onCellUpdate?.(row, thumbnailColumn, dataUrl)
                                    } catch (error) {
                                      reportCellUpdateError(error)
                                    }
                                  }}
                                />
                                <ThumbnailPreview
                                  source={projectThumbnail}
                                  className="absolute inset-0 block h-full w-full object-cover"
                                  fallback={
                                    <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                                      Upload Thumbnail
                                    </div>
                                  }
                                />
                                <span className="pointer-events-none absolute bottom-2 right-2 rounded bg-card/80 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-foreground/70 opacity-0 transition group-hover/thumb:opacity-100">
                                  Change
                                </span>
                              </label>
                            ) : (
                              <ThumbnailPreview
                                source={projectThumbnail}
                                className="absolute inset-0 block h-full w-full object-cover"
                                fallback={
                                  <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                                    No Thumbnail
                                  </div>
                                }
                              />
                            )}
                          </div>
                          <div className="border-t border-border bg-background px-3 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-foreground/70">
                            {row?.id ? (
                              <Link
                                href={`/apex/${row.id}`}
                                className="underline transition hover:text-primary/80"
                                onClick={(event) => event.stopPropagation()}
                              >
                                {name}
                              </Link>
                            ) : (
                              <span className="underline">{name}</span>
                            )}
                          </div>
                        </div>
                      )
                    }

                    return (
                      <button
                        key={row.id || index}
                        className={`relative flex flex-col gap-2 rounded-md border bg-background/60 p-3 text-left transition hover:bg-card ${
                          isRowSelected
                            ? 'border-primary/80'
                            : 'border-border hover:border-border'
                        }`}
                        onClick={() => onRowClick?.(row)}
                        onContextMenu={(event) => handleGridCardContextMenu(row, event)}
                      >
                        {enableRowSelection && rowSelectionId ? (
                          <label
                            className="absolute right-2 top-2 z-10 flex h-6 w-6 cursor-pointer items-center justify-center rounded border border-border bg-card/90"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={isRowSelected}
                              onChange={() => toggleRowSelection(row)}
                              className="h-3.5 w-3.5 rounded border border-border bg-card"
                            />
                          </label>
                        ) : null}
                        {displayColumns.slice(0, 3).map((column) => (
                          <div key={column.id}>
                            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                              {column.label}
                            </p>
                            <div className="mt-1 text-sm text-foreground">
                              {renderCell(column, row[column.id], row)}
                            </div>
                          </div>
                        ))}
                      </button>
                    )
                  })}
                </div>
              ) : (
                <table className="w-max min-w-full table-auto">
                  <thead className="sticky top-0 z-20 border-b border-border bg-background">
                    <tr>
                      {enableRowSelection ? (
                        <th
                          className={`${densityClasses.header} sticky left-0 z-40 w-10 bg-background text-center`}
                          style={{ width: SELECTION_COLUMN_WIDTH, minWidth: SELECTION_COLUMN_WIDTH }}
                        >
                          <input
                            type="checkbox"
                            checked={allPageRowsSelected}
                            onChange={toggleCurrentPageSelection}
                            aria-label="Select rows on current page"
                            aria-checked={somePageRowsSelected ? 'mixed' : allPageRowsSelected}
                            className="h-3.5 w-3.5 rounded border border-border bg-card"
                          />
                        </th>
                      ) : null}
                      {groupById && (
                        <th
                          className={`w-8 ${
                            hasPinnedDisplayColumns || enableRowSelection
                              ? 'sticky z-40 bg-background'
                              : ''
                          }`}
                          style={{
                            left: enableRowSelection ? SELECTION_COLUMN_WIDTH : 0,
                          }}
                        />
                      )}
                      {displayColumns.map((column) => (
                        (() => {
                          const isPinned = pinnedColumnIds.has(column.id)
                          const isLastPinned = lastPinnedDisplayColumnId === column.id

                          return (
                            <th
                              key={column.id}
                              draggable
                              onDragStart={() => handleDragStart(column.id)}
                              onDragEnd={() => setDraggedColumnId(null)}
                              onDragOver={(event) => event.preventDefault()}
                              onDrop={() => handleDrop(column.id)}
                              className={`${densityClasses.header} cursor-grab select-none text-left font-semibold uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground/80 ${
                                isPinned ? 'sticky z-30 bg-background' : ''
                              } ${isPinned && isLastPinned ? 'shadow-[1px_0_0_rgba(63,63,70,0.9)]' : ''}`}
                              style={{
                                width: columnWidths[column.id] ?? column.width,
                                minWidth: 80,
                                left: isPinned ? pinnedColumnOffsets[column.id] ?? 0 : undefined,
                              }}
                            >
                              <div className="relative flex items-center justify-between gap-2">
                                <span>{column.label}</span>
                                <span
                                  role="separator"
                                  onMouseDown={(event) => handleResizeStart(column.id, event)}
                                  className="absolute -right-2 top-0 h-full w-3 cursor-col-resize"
                                />
                              </div>
                            </th>
                          )
                        })()
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedData.length === 0 && emptyState ? (
                      <tr className="border-b border-border">
                        <td
                          colSpan={
                            displayColumns.length +
                            (groupById ? 1 : 0) +
                            (enableRowSelection ? 1 : 0)
                          }
                          className="px-6 py-16"
                        >
                          {emptyState}
                        </td>
                      </tr>
                    ) : null}
                    {paginatedData.length > 0 && groupKeys.map((groupKey) => {
                      const isExpanded = !groupById || expandedGroups.has(groupKey)

                      return (
                        <React.Fragment key={groupKey}>
                          {groupById && (
                            <tr className="border-b border-border bg-background">
                              <td
                                colSpan={
                                  displayColumns.length +
                                  1 +
                                  (enableRowSelection ? 1 : 0)
                                }
                                className="px-2.5 py-2 text-sm cursor-pointer hover:bg-card"
                                onClick={() => toggleGroup(groupKey)}
                              >
                                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                  {groupedData[groupKey].label} ({groupedData[groupKey].rows.length})
                                </div>
                              </td>
                            </tr>
                          )}
                          {isExpanded &&
                            groupedData[groupKey].rows.map((row, rowIndex) => {
                              const rowSelectionId = getRowSelectionId(row)
                              const isRowSelected = rowSelectionId
                                ? selectedRowIds.has(rowSelectionId)
                                : false

                              return (
                                <tr
                                  key={row.id || rowIndex}
                                  className={`group cursor-pointer border-b border-border transition hover:bg-card ${
                                    isRowSelected ? 'bg-card/70' : ''
                                  }`}
                                  onClick={() => onRowClick?.(row)}
                                  onContextMenu={(event) => handleListRowContextMenu(row, event)}
                                >
                                  {enableRowSelection ? (
                                    <td
                                      className={`${densityClasses.cell} sticky left-0 z-30 bg-background text-center group-hover:bg-card`}
                                      style={{
                                        width: SELECTION_COLUMN_WIDTH,
                                        minWidth: SELECTION_COLUMN_WIDTH,
                                      }}
                                      onClick={(event) => event.stopPropagation()}
                                    >
                                      {rowSelectionId ? (
                                        <input
                                          type="checkbox"
                                          checked={isRowSelected}
                                          onChange={() => toggleRowSelection(row)}
                                          className="h-3.5 w-3.5 rounded border border-border bg-card"
                                        />
                                      ) : null}
                                    </td>
                                  ) : null}
                                  {groupById && (
                                    <td
                                      className={`w-8 ${
                                        hasPinnedDisplayColumns || enableRowSelection
                                          ? 'sticky z-20 bg-background group-hover:bg-card'
                                          : ''
                                      }`}
                                      style={{
                                        left: enableRowSelection
                                          ? SELECTION_COLUMN_WIDTH
                                          : 0,
                                      }}
                                    />
                                  )}
                                  {displayColumns.map((column) => {
                                    const isPinned = pinnedColumnIds.has(column.id)
                                    const isLastPinned = lastPinnedDisplayColumnId === column.id

                                    return (
                                    // Cell edit affordance can be icon-only, double-click, or both.
                                    <td
                                      key={column.id}
                                      className={`${densityClasses.cell} ${
                                        isPinned ? 'sticky z-10 bg-background group-hover:bg-card' : ''
                                      } ${isPinned && isLastPinned ? 'shadow-[1px_0_0_rgba(63,63,70,0.85)]' : ''}`}
                                      style={{
                                        width: columnWidths[column.id] ?? column.width,
                                        minWidth: 80,
                                        left: isPinned ? pinnedColumnOffsets[column.id] ?? 0 : undefined,
                                      }}
                                      onDoubleClick={(event) => {
                                        const useDoubleClick =
                                          cellEditTrigger === 'double_click' ||
                                          cellEditTrigger === 'both'
                                        if (!useDoubleClick) return
                                        event.stopPropagation()
                                        startEditing(row, column)
                                      }}
                                    >
                                       {editingCell?.rowId === row.id &&
                                      editingCell?.columnId === column.id &&
                                      column.editable &&
                                      onCellUpdate &&
                                      column.editor !== 'checkbox' ? (
                                        column.editor === 'multiselect' ? (
                                        <div
                                          className="relative w-full"
                                          onClick={(event) => event.stopPropagation()}
                                        >
                                          <DropdownMenu
                                            modal={false}
                                            open={multiselectOpen}
                                            onOpenChange={(open) => {
                                              if (!open) {
                                                cancelEditing()
                                                return
                                              }
                                              setMultiselectOpen(true)
                                            }}
                                          >
                                            <DropdownMenuTrigger asChild>
                                              <button
                                                type="button"
                                                onMouseDown={(event) => event.preventDefault()}
                                                onClick={(event) => event.stopPropagation()}
                                                className="flex w-full items-center justify-between rounded border border-border bg-card px-2 py-1 text-left text-xs text-foreground"
                                              >
                                                <span className="truncate">
                                                  {draftListValue.length > 0
                                                    ? optionValuesToLabels(
                                                        draftListValue,
                                                        column.options
                                                      )
                                                    : `Select ${column.label.toLowerCase()}`}
                                                </span>
                                                <ChevronDown
                                                  className={`h-3.5 w-3.5 text-muted-foreground transition ${
                                                    multiselectOpen ? 'rotate-180' : ''
                                                  }`}
                                                />
                                              </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent
                                              align="start"
                                              sideOffset={4}
                                              className="w-[var(--radix-dropdown-menu-trigger-width)] max-w-[min(540px,70vw)] border-border bg-card text-foreground"
                                              onCloseAutoFocus={(event) => {
                                                event.preventDefault()
                                              }}
                                            >
                                              {(column.options ?? []).length === 0 ? (
                                                <p className="px-2 py-1.5 text-xs text-muted-foreground">
                                                  No options
                                                </p>
                                              ) : (
                                                (column.options ?? []).map((option) => (
                                                  <DropdownMenuCheckboxItem
                                                    key={option.value}
                                                    checked={draftListValue.includes(option.value)}
                                                    onSelect={(event) => event.preventDefault()}
                                                    onCheckedChange={(checked) => {
                                                      const isChecked = checked === true
                                                      const nextValues = isChecked
                                                        ? draftListValue.includes(option.value)
                                                          ? draftListValue
                                                          : [...draftListValue, option.value]
                                                        : draftListValue.filter(
                                                            (item) => item !== option.value
                                                          )

                                                      setDraftListValue(nextValues)
                                                      setDraftValue(nextValues.join(', '))

                                                      Promise.resolve(
                                                        onCellUpdate(
                                                          row,
                                                          column,
                                                          column.parseValue
                                                            ? column.parseValue(nextValues, row)
                                                            : nextValues
                                                        )
                                                      ).catch((error) => {
                                                        reportCellUpdateError(error)
                                                      })
                                                    }}
                                                    className="text-foreground focus:bg-accent focus:text-foreground"
                                                  >
                                                    {option.label}
                                                  </DropdownMenuCheckboxItem>
                                                ))
                                              )}
                                            </DropdownMenuContent>
                                          </DropdownMenu>
                                        </div>
                                      ) : column.editor === 'textarea' ? (
                                        <textarea
                                          value={draftValue}
                                          onChange={(event) =>
                                            setDraftValue(event.target.value)
                                          }
                                          onBlur={commitEditing}
                                          onKeyDown={(event) => {
                                            if (event.key === 'Escape') {
                                              event.stopPropagation()
                                              cancelEditing()
                                            }
                                          }}
                                          className="w-full rounded border border-border bg-card px-2 py-1 text-xs text-foreground"
                                          rows={3}
                                          autoFocus
                                        />
                                      ) : column.editor === 'select' &&
                                        (column.options ?? []).length > 0 ? (
                                        <select
                                          value={draftValue}
                                          onChange={async (event) => {
                                            try {
                                              setDraftValue(event.target.value)
                                              await onCellUpdate(
                                                row,
                                                column,
                                                column.parseValue
                                                  ? column.parseValue(event.target.value, row)
                                                  : event.target.value
                                              )
                                              cancelEditing()
                                            } catch (error) {
                                              reportCellUpdateError(error)
                                            }
                                          }}
                                          onBlur={cancelEditing}
                                          className="w-full rounded border border-border bg-card px-2 py-1 text-xs text-foreground"
                                          autoFocus
                                        >
                                          {(column.options ?? []).map((option) => (
                                            <option key={option.value} value={option.value}>
                                              {option.label}
                                            </option>
                                          ))}
                                        </select>
                                      ) : (
                                        <input
                                          type={resolveInputType(column)}
                                          value={draftValue}
                                          onChange={(event) =>
                                            setDraftValue(event.target.value)
                                          }
                                          step={
                                            resolveInputType(column) === 'number' ? 'any' : undefined
                                          }
                                          onBlur={commitEditing}
                                          onKeyDown={(event) => {
                                            if (event.key === 'Enter') {
                                              event.preventDefault()
                                              commitEditing()
                                            }
                                            if (event.key === 'Escape') {
                                              event.stopPropagation()
                                              cancelEditing()
                                            }
                                          }}
                                          className="w-full rounded border border-border bg-card px-2 py-1 text-xs text-foreground"
                                          autoFocus
                                        />
                                        )
                                      ) : (
                                        <div className="group/cell relative min-h-[18px]">
                                          {renderCell(column, row[column.id], row)}

                                          {(cellEditTrigger === 'icon' || cellEditTrigger === 'both') &&
                                          column.editable &&
                                          onCellUpdate &&
                                          column.editor !== 'checkbox' ? (
                                            <button
                                              type="button"
                                              aria-label={`Edit ${column.label}`}
                                              title={`Edit ${column.label}`}
                                              onClick={(event) => {
                                                event.preventDefault()
                                                event.stopPropagation()
                                                startEditing(row, column)
                                              }}
                                              className="absolute right-0 top-1/2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground opacity-0 transition hover:bg-accent hover:text-foreground/80 group-hover/cell:opacity-100"
                                            >
                                              <Pencil className="h-3.5 w-3.5" />
                                            </button>
                                          ) : null}
                                        </div>
                                      )}
                                    </td>
                                  )})}
                                </tr>
                              )
                            })}
                        </React.Fragment>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 border-t border-border bg-background px-3 py-2 text-xs text-muted-foreground">
              <span>
                Showing {pageRangeStart}-{pageRangeEnd} of {totalRows}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Rows
                </span>
                <select
                  value={pageSize}
                  onChange={(event) => {
                    setPageSize(clampPageSize(event.target.value))
                    setCurrentPage(1)
                  }}
                  className="rounded border border-border bg-card px-2 py-1 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {PAGE_SIZE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={safeCurrentPage <= 1}
                  className="rounded border border-border px-2 py-1 text-xs text-foreground/70 transition hover:border-border hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Prev
                </button>
                <span className="min-w-[90px] text-center">
                  Page {safeCurrentPage} / {pageCount}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(pageCount, prev + 1))
                  }
                  disabled={safeCurrentPage >= pageCount}
                  className="rounded border border-border px-2 py-1 text-xs text-foreground/70 transition hover:border-border hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>

        {null}
      </div>

      {onCsvImport ? (
        <Dialog open={csvImportOpen} onOpenChange={handleCsvImportDialogToggle}>
          <DialogContent
            showCloseButton={!csvImporting}
            className="h-[calc(100vh-1rem)] w-[calc(100vw-1rem)] !max-w-[calc(100vw-1rem)] sm:!max-w-[calc(100vw-1rem)] grid-rows-[auto_auto_minmax(0,1fr)_auto] gap-0 overflow-hidden border-border bg-background p-0 text-foreground"
          >
            <div className="border-b border-border px-4 py-4 sm:px-5">
              <DialogTitle className="text-xl font-semibold text-foreground">
                Bulk CSV Import
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm text-muted-foreground">
                Upload your file, map source columns, choose an optional ID column, then
                preview before import.
              </DialogDescription>
            </div>

            <div className="border-b border-border px-4 py-3 sm:px-5">
              <div className="flex flex-wrap items-center gap-1">
                {csvImportSteps.map((step) => {
                  const isActive = csvImportStep === step.id
                  const isEnabled = canVisitCsvStep(step.id)
                  return (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => goToCsvStep(step.id)}
                      disabled={!isEnabled || csvImporting}
                      className={`rounded px-2 py-1 text-sm transition ${
                        isActive
                          ? 'bg-sky-500/20 text-sky-300'
                          : isEnabled
                            ? 'text-muted-foreground hover:bg-accent hover:text-foreground/80'
                            : 'cursor-not-allowed text-muted-foreground'
                      }`}
                    >
                      {step.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="min-w-0 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
              {csvImportError ? (
                <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                  {csvImportError}
                </div>
              ) : null}

              {csvImportResult ? (
                <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
                  Imported {csvImportResult.imported} row(s)
                  {csvImportResult.failed.length > 0
                    ? ` with ${csvImportResult.failed.length} failure(s).`
                    : ' successfully.'}
                  {csvImportResult.failed.length > 0 ? (
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-red-300">
                      {csvImportResult.failed.slice(0, 8).map((failure, index) => (
                        <li key={`${failure.row}-${index}`}>
                          Row {failure.row}: {failure.message}
                        </li>
                      ))}
                      {csvImportResult.failed.length > 8 ? (
                        <li>
                          ...and {csvImportResult.failed.length - 8} more failure(s)
                        </li>
                      ) : null}
                    </ul>
                  ) : null}
                </div>
              ) : null}

              {csvImportStep === 1 ? (
                <div className="rounded-md border border-border bg-card/40 p-4">
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    CSV file
                  </label>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleCsvFileChange}
                    disabled={csvImporting}
                    className="w-full rounded border border-border bg-card px-3 py-2 text-sm text-foreground file:mr-3 file:rounded file:border file:border-border file:bg-accent file:px-2 file:py-1 file:text-xs file:text-foreground/80"
                  />
                  {csvImportFileName ? (
                    <p className="mt-3 text-xs text-muted-foreground">
                      Loaded <span className="text-foreground/80">{csvImportFileName}</span> with{' '}
                      {csvImportRows.length} row(s), delimiter{' '}
                      <span className="text-foreground/80">
                        {csvImportDelimiter === '\t' ? 'TAB' : csvImportDelimiter}
                      </span>
                      .
                    </p>
                  ) : (
                    <p className="mt-3 text-xs text-muted-foreground">
                      Upload a CSV with header row. Continue to map each source column.
                    </p>
                  )}
                </div>
              ) : null}

              {csvImportStep === 2 ? (
                <div className="flex min-h-[420px] min-w-0 flex-col rounded-md border border-border bg-card/30">
                  <div className="border-b border-border px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Column mapping ({csvMappedColumnCount}/{csvImportHeaders.length})
                  </div>
                  <div className="border-b border-border px-3 py-2 text-[11px] text-muted-foreground">
                    Scroll horizontally to view and map all columns.
                  </div>
                  {csvImportHeaders.length === 0 ? (
                    <div className="px-3 py-4 text-sm text-muted-foreground">
                      Upload a CSV first to map columns.
                    </div>
                  ) : (
                    <div className="min-h-0 w-full max-w-full flex-1 overflow-x-scroll overflow-y-hidden pb-1">
                      <div className="h-full min-w-max overflow-y-auto">
                        <table className="w-max min-w-full border-separate border-spacing-0 text-xs">
                        <tbody>
                          <tr className="bg-background/95 text-muted-foreground">
                            <th className="sticky left-0 z-20 border-b border-r border-border bg-background px-3 py-2 text-left font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                              Your Column
                            </th>
                            {csvImportHeaders.map((header, index) => (
                              <th
                                key={`${header}-${index}`}
                                className="min-w-[160px] border-b border-r border-border px-3 py-2 text-left font-medium text-foreground/70"
                              >
                                {header}
                              </th>
                            ))}
                          </tr>
                          <tr>
                            <th className="sticky left-0 z-20 border-b border-r border-border bg-background px-3 py-2 text-left font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                              Target Column
                            </th>
                            {csvImportHeaders.map((header) => {
                              const mappedValue = csvImportColumnMap[header] || ''
                              return (
                                <td
                                  key={`mapping-${header}`}
                                  className="border-b border-r border-border px-2 py-2"
                                >
                                  <select
                                    value={mappedValue}
                                    onChange={(event) =>
                                      handleCsvColumnMappingChange(header, event.target.value)
                                    }
                                    disabled={csvImporting}
                                    className="w-full rounded border border-border bg-card px-2 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                  >
                                    <option value="">Not importing</option>
                                    {resolvedColumns.map((column) => {
                                      const isTakenByOtherHeader = csvImportHeaders.some(
                                        (otherHeader) =>
                                          otherHeader !== header &&
                                          csvImportColumnMap[otherHeader] === column.id
                                      )
                                      return (
                                        <option
                                          key={column.id}
                                          value={column.id}
                                          disabled={isTakenByOtherHeader}
                                        >
                                          {column.label}
                                        </option>
                                      )
                                    })}
                                  </select>
                                </td>
                              )
                            })}
                          </tr>
                          <tr>
                            <th className="sticky left-0 z-20 border-r border-border bg-background px-3 py-2 text-left font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                              Data Preview
                            </th>
                            {csvImportHeaders.map((header, index) => (
                              <td
                                key={`preview-${header}-${index}`}
                                className="max-w-[180px] border-r border-border px-3 py-2 text-foreground/70"
                              >
                                <span className="block truncate">
                                  {csvImportRows[0]?.[index] || '-'}
                                </span>
                              </td>
                            ))}
                          </tr>
                        </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}

              {csvImportStep === 3 ? (
                <div className="rounded-md border border-border bg-card/30 p-4">
                  <div className="text-sm font-medium text-foreground/80">Specify ID column</div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Optional. Choose a mapped source column to use as external identifier
                    during import.
                  </p>
                  <div className="mt-4 max-w-md">
                    <select
                      value={csvImportIdentifierHeader}
                      onChange={(event) =>
                        setCsvImportIdentifierHeader(event.target.value)
                      }
                      disabled={csvImporting || csvMappedTargetColumns.length === 0}
                      className="w-full rounded border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">None (always create rows)</option>
                      {csvMappedTargetColumns.map((entry) => (
                        <option key={entry.header} value={entry.header}>
                          {entry.header} -&gt; {entry.targetColumnLabel}
                        </option>
                      ))}
                    </select>
                  </div>
                  {csvImportIdentifierHeader && csvIdentifierTargetColumn ? (
                    <p className="mt-3 text-xs text-muted-foreground">
                      Selected ID mapping: <span className="text-foreground/80">{csvImportIdentifierHeader}</span>{' '}
                      -&gt; <span className="text-foreground/80">{csvIdentifierTargetColumn}</span>
                    </p>
                  ) : null}
                </div>
              ) : null}

              {csvImportStep === 4 ? (
                <div className="space-y-4">
                  <div className="rounded-md border border-border bg-card/30 px-3 py-2 text-xs text-muted-foreground">
                    Ready to import <span className="text-foreground/80">{csvImportRows.length}</span>{' '}
                    row(s) with <span className="text-foreground/80">{csvMappedColumnCount}</span>{' '}
                    mapped column(s).
                  </div>
                  <div className="rounded-md border border-border bg-card/30">
                    <div className="border-b border-border px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Preview ({csvMappedPreviewRows.length} of {csvImportRows.length})
                    </div>
                    {csvMappedColumnCount === 0 ? (
                      <div className="px-3 py-4 text-sm text-muted-foreground">
                        No mapped columns available.
                      </div>
                    ) : (
                      <div className="max-h-[260px] overflow-auto">
                        <table className="min-w-full table-auto text-xs">
                          <thead className="sticky top-0 z-10 bg-background/95 text-muted-foreground">
                            <tr>
                              {csvMappedTargetColumns.map((entry) => (
                                <th key={entry.header} className="px-3 py-2 text-left">
                                  {entry.targetColumnLabel}
                                </th>
                              ))}
                            </tr>
                            <tr>
                              {csvMappedTargetColumns.map((entry) => (
                                <th
                                  key={`source-${entry.header}`}
                                  className="px-3 pb-2 text-left text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground"
                                >
                                  {entry.header}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {csvMappedPreviewRows.map((row, rowIndex) => (
                              <tr key={rowIndex} className="border-t border-border">
                                {row.map((value, columnIndex) => (
                                  <td
                                    key={`${rowIndex}-${columnIndex}`}
                                    className="max-w-[220px] truncate px-3 py-2 text-foreground/70"
                                  >
                                    {value || '-'}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3 sm:px-5">
              <button
                type="button"
                onClick={() => handleCsvImportDialogToggle(false)}
                disabled={csvImporting}
                className="rounded border border-border px-3 py-1.5 text-sm text-foreground/70 transition hover:border-border hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                Close
              </button>
              <div className="flex items-center gap-2">
                {csvImportStep > 1 ? (
                  <button
                    type="button"
                    onClick={goToPreviousCsvStep}
                    disabled={csvImporting}
                    className="rounded border border-border px-3 py-1.5 text-sm text-foreground/70 transition hover:border-border hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Back
                  </button>
                ) : null}
                {csvImportStep < 4 ? (
                  <button
                    type="button"
                    onClick={goToNextCsvStep}
                    disabled={csvImporting}
                    className="rounded border border-sky-500 bg-sky-500/90 px-3 py-1.5 text-sm font-semibold text-black transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Continue
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={submitCsvImport}
                    disabled={
                      csvImporting ||
                      csvImportRows.length === 0 ||
                      csvMappedColumnCount === 0
                    }
                    className="rounded border border-primary bg-primary/90 px-3 py-1.5 text-sm font-semibold text-black transition hover:bg-primary disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {csvImporting ? 'Importing...' : `Import ${csvImportRows.length} Row(s)`}
                  </button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}

      {contextMenu ? (
        <div
          className="fixed inset-0 z-50"
          onClick={() => setContextMenu(null)}
          onContextMenu={(event) => {
            event.preventDefault()
            setContextMenu(null)
          }}
        >
          <div
            className="absolute min-w-[180px] rounded-md border border-border bg-card p-1 shadow-2xl"
            style={{ top: contextMenu.y, left: contextMenu.x }}
            onClick={(event) => event.stopPropagation()}
          >
            {contextMenu.actions.map((action, index) => (
              <button
                key={`${action.label}-${index}`}
                type="button"
                className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition hover:bg-accent ${
                  action.variant === 'destructive' ? 'text-red-400' : 'text-foreground'
                }`}
                onClick={() => {
                  action.onClick()
                  setContextMenu(null)
                }}
              >
                {action.icon ? <span className="h-4 w-4">{action.icon}</span> : null}
                {action.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
