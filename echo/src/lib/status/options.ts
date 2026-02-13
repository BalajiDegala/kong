import { createClient } from '@/lib/supabase/client'

const STATUS_TABLE_CANDIDATES = ['statuses', 'status'] as const
const STATUS_ENTITY_TYPES_TABLE = 'status_entity_types'

type RowRecord = Record<string, unknown>

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

function resolveColumn(columns: Set<string>, candidates: string[]): string | null {
  for (const candidate of candidates) {
    if (columns.has(candidate)) return candidate
  }
  return null
}

function collectColumns(rows: RowRecord[]): Set<string> {
  const columns = new Set<string>()
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue
    for (const key of Object.keys(row)) {
      columns.add(key)
    }
  }
  return columns
}

function normalizeEntityTypes(values: string[]): string[] {
  const cleaned = values
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
  const unique = Array.from(new Set(cleaned))
  if (unique.includes('all')) return ['all']
  return unique.length > 0 ? unique : ['all']
}

export async function listStatusNames(entityType: string): Promise<string[]> {
  const supabase = createClient()
  const targetEntity = entityType.trim().toLowerCase()

  let rows: RowRecord[] = []
  for (const table of STATUS_TABLE_CANDIDATES) {
    const result = await supabase.from(table).select('*')
    if (!result.error) {
      rows = (result.data || []) as RowRecord[]
      break
    }
    if (!isMissingTableError(result.error)) {
      throw new Error(asText((result.error as unknown as Record<string, unknown>).message) || 'Failed to load statuses')
    }
  }

  if (rows.length === 0) {
    return []
  }

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
    throw new Error(asText((mappingResult.error as unknown as Record<string, unknown>).message) || 'Failed to load status mappings')
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

  const names: string[] = []
  const seen = new Set<string>()

  for (const row of orderedRows) {
    const name = asText(row?.[nameKey]).trim()
    if (!name) continue

    const rowStatusId = Number(row?.[idKey])
    const mappedTypes = Number.isNaN(rowStatusId)
      ? []
      : entityTypesByStatusId.get(rowStatusId) || []
    const fallbackType = entityTypeKey ? asText(row?.[entityTypeKey]) : ''
    const rowEntityTypes = hasEntityTypeMapping
      ? normalizeEntityTypes(mappedTypes)
      : normalizeEntityTypes(fallbackType ? [fallbackType] : ['all'])

    if (!rowEntityTypes.includes('all') && !rowEntityTypes.includes(targetEntity)) {
      continue
    }

    const key = name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    names.push(name)
  }

  return names
}

