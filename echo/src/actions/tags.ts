'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

const TAG_TABLE_CANDIDATES = ['tags', 'tag'] as const

type TagMutationInput = {
  name?: string
  color?: string | null
  description?: string | null
}

type TagMetadata = {
  table: string
  columns: Set<string>
}

function normalizeText(value?: string | null): string | null {
  const next = (value || '').trim()
  return next.length > 0 ? next : null
}

function resolveColumn(columns: Set<string>, candidates: string[]): string | null {
  for (const candidate of candidates) {
    if (columns.has(candidate)) return candidate
  }
  return null
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

function isMissingColumnError(error: unknown): boolean {
  if (!error) return false
  const errorRecord = error as Record<string, unknown>
  const code = String(errorRecord.code || '')
  const message = String(errorRecord.message || '').toLowerCase()
  return code === 'PGRST204' || (message.includes('column') && message.includes('does not exist'))
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (!error || typeof error !== 'object') return ''
  const message = (error as Record<string, unknown>).message
  return typeof message === 'string' ? message : ''
}

async function resolveTagTable(service: ReturnType<typeof createServiceClient>) {
  let lastError: unknown = null
  for (const table of TAG_TABLE_CANDIDATES) {
    const { error } = await service.from(table).select('*').limit(1)
    if (!error) return table
    if (!isMissingTableError(error)) {
      throw new Error(errorMessage(error) || 'Failed to resolve tags table.')
    }
    lastError = error
  }

  if (lastError) {
    throw new Error(errorMessage(lastError) || 'Tags table was not found.')
  }

  throw new Error('Tags table was not found.')
}

const TAG_USAGE_SOURCES: Array<{ table: string; columnCandidates: string[] }> = [
  { table: 'projects', columnCandidates: ['tags'] },
  { table: 'assets', columnCandidates: ['tags'] },
  { table: 'sequences', columnCandidates: ['tags'] },
  { table: 'shots', columnCandidates: ['tags'] },
  { table: 'tasks', columnCandidates: ['tags'] },
  { table: 'versions', columnCandidates: ['tags'] },
  { table: 'published_files', columnCandidates: ['tags'] },
  { table: 'departments', columnCandidates: ['tags'] },
  { table: 'profiles', columnCandidates: ['tags'] },
]

function parseTagValues(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter(Boolean)
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }

  return []
}

async function collectRowsForColumn(
  service: ReturnType<typeof createServiceClient>,
  table: string,
  column: string
): Promise<Array<Record<string, unknown>>> {
  const allRows: Array<Record<string, unknown>> = []
  const pageSize = 1000
  let from = 0

  while (true) {
    const { data, error } = await service
      .from(table)
      .select(column)
      .range(from, from + pageSize - 1)

    if (error) {
      if (isMissingTableError(error) || isMissingColumnError(error)) {
        return []
      }
      throw new Error(errorMessage(error) || `Failed to read ${table}.${column}`)
    }

    const rows = (data || []) as unknown as Array<Record<string, unknown>>
    allRows.push(...rows)

    if (rows.length < pageSize) break
    from += pageSize
  }

  return allRows
}

function mapSemanticColumns(columns: Set<string>) {
  return {
    id: resolveColumn(columns, ['id']),
    name: resolveColumn(columns, ['name', 'tag_name']),
    usageCount: resolveColumn(columns, ['usage_count', 'uses']),
    color: resolveColumn(columns, ['color']),
    description: resolveColumn(columns, ['description']),
    createdBy: resolveColumn(columns, ['created_by']),
    updatedBy: resolveColumn(columns, ['updated_by']),
  }
}

async function getTagMetadata(
  service: ReturnType<typeof createServiceClient>
): Promise<TagMetadata> {
  const table = await resolveTagTable(service)
  const { data, error } = await service.from(table).select('*').limit(1)

  if (error) {
    throw new Error(error.message)
  }

  const columns = new Set<string>()
  const sample = data?.[0] ? { ...data[0] } : null

  if (sample) {
    for (const key of Object.keys(sample)) {
      columns.add(key)
    }
  }

  // Fallback for empty table scenarios.
  if (columns.size === 0) {
    columns.add('id')
    columns.add('name')
    columns.add('usage_count')
  }

  return { table, columns }
}

async function requireAuthenticatedUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  return user
}

export async function createTag(input: TagMutationInput) {
  try {
    const user = await requireAuthenticatedUser()
    const service = createServiceClient()
    const metadata = await getTagMetadata(service)
    const fields = mapSemanticColumns(metadata.columns)

    if (!fields.name) {
      return { error: 'Tag name column was not found on tags table.' }
    }

    const name = normalizeText(input.name)
    if (!name) {
      return { error: 'Tag name is required' }
    }

    const payload: Record<string, unknown> = {
      [fields.name]: name,
    }

    if (fields.color) {
      payload[fields.color] = normalizeText(input.color)
    }

    if (fields.description) {
      payload[fields.description] = normalizeText(input.description)
    }

    if (fields.createdBy) {
      payload[fields.createdBy] = user.id
    }

    if (fields.updatedBy) {
      payload[fields.updatedBy] = user.id
    }

    const { data, error } = await service
      .from(metadata.table)
      .insert(payload)
      .select()
      .single()

    if (error) {
      return { error: error.message }
    }

    revalidatePath('/tags')
    return { data }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to create tag' }
  }
}

export async function updateTag(
  tagId: number,
  input: TagMutationInput
) {
  try {
    const user = await requireAuthenticatedUser()
    const service = createServiceClient()
    const metadata = await getTagMetadata(service)
    const fields = mapSemanticColumns(metadata.columns)
    const payload: Record<string, unknown> = {}

    if (fields.name && input.name !== undefined) {
      const name = normalizeText(input.name)
      if (!name) return { error: 'Tag name is required' }
      payload[fields.name] = name
    }

    if (fields.color && input.color !== undefined) {
      payload[fields.color] = normalizeText(input.color)
    }

    if (fields.description && input.description !== undefined) {
      payload[fields.description] = normalizeText(input.description)
    }

    if (fields.updatedBy) {
      payload[fields.updatedBy] = user.id
    }

    if (Object.keys(payload).length === 0) {
      return { error: 'No fields provided to update' }
    }

    const idColumn = fields.id || 'id'
    const { data, error } = await service
      .from(metadata.table)
      .update(payload)
      .eq(idColumn, tagId)
      .select()
      .single()

    if (error) {
      return { error: error.message }
    }

    revalidatePath('/tags')
    return { data }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to update tag' }
  }
}

export async function deleteTag(tagId: number) {
  try {
    await requireAuthenticatedUser()
    const service = createServiceClient()
    const metadata = await getTagMetadata(service)
    const fields = mapSemanticColumns(metadata.columns)
    const idColumn = fields.id || 'id'

    const { error } = await service.from(metadata.table).delete().eq(idColumn, tagId)
    if (error) {
      return { error: error.message }
    }

    revalidatePath('/tags')
    return { success: true }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to delete tag' }
  }
}

export async function listTagUsageCounts() {
  try {
    await requireAuthenticatedUser()
    const service = createServiceClient()
    const counts = new Map<string, number>()

    for (const source of TAG_USAGE_SOURCES) {
      let selectedColumn: string | null = null
      let rows: Array<Record<string, unknown>> = []

      for (const column of source.columnCandidates) {
        rows = await collectRowsForColumn(service, source.table, column)
        if (rows.length > 0) {
          selectedColumn = column
          break
        }

        // Keep the column if it exists but table is empty.
        const { error } = await service.from(source.table).select(column).limit(1)
        if (!error) {
          selectedColumn = column
          break
        }
        if (!isMissingTableError(error) && !isMissingColumnError(error)) {
          throw new Error(errorMessage(error) || `Failed to inspect ${source.table}.${column}`)
        }
      }

      if (!selectedColumn) continue

      for (const row of rows) {
        const rawValue = row[selectedColumn]
        for (const tag of parseTagValues(rawValue)) {
          const key = tag.toLowerCase()
          counts.set(key, (counts.get(key) || 0) + 1)
        }
      }
    }

    return { data: Object.fromEntries(counts) as Record<string, number> }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to compute tag usage counts' }
  }
}
