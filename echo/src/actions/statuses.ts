'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

const STATUS_TABLE_CANDIDATES = ['statuses', 'status'] as const
const STATUS_ENTITY_TYPES_TABLE = 'status_entity_types'

type StatusMutationInput = {
  name?: string
  code?: string | null
  icon?: string | null
  background_color?: string | null
  locked_by_system?: boolean | null
  entity_type?: string | null
  entity_types?: string[] | null
  sort_order?: number | null
}

type StatusId = string | number

type StatusMetadata = {
  table: string
  columns: Set<string>
  sample: Record<string, unknown> | null
}

function normalizeText(value?: string | null): string | null {
  const next = (value || '').trim()
  return next.length > 0 ? next : null
}

function toStatusCode(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function resolveStatusId(value: unknown): StatusId | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return null
    if (/^-?\d+$/.test(trimmed)) {
      const parsed = Number(trimmed)
      if (Number.isSafeInteger(parsed)) return parsed
    }
    return trimmed
  }
  return null
}

function normalizeEntityTypes(
  entityTypes?: string[] | null,
  fallbackEntityType?: string | null
): string[] {
  const values: string[] = []

  for (const value of entityTypes || []) {
    const normalized = normalizeText(value)?.toLowerCase()
    if (!normalized) continue
    values.push(normalized)
  }

  const fallback = normalizeText(fallbackEntityType)?.toLowerCase()
  if (values.length === 0 && fallback) {
    values.push(fallback)
  }

  const unique = Array.from(new Set(values))
  if (unique.includes('all')) return ['all']
  return unique.length > 0 ? unique : ['all']
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

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (!error || typeof error !== 'object') return ''
  const message = (error as Record<string, unknown>).message
  return typeof message === 'string' ? message : ''
}

async function resolveStatusTable(
  service: ReturnType<typeof createServiceClient>
) {
  let lastError: unknown = null
  for (const table of STATUS_TABLE_CANDIDATES) {
    const { error } = await service.from(table).select('*').limit(1)
    if (!error) return table
    if (!isMissingTableError(error)) {
      throw new Error(errorMessage(error) || 'Failed to resolve statuses table.')
    }
    lastError = error
  }

  if (lastError) {
    throw new Error(errorMessage(lastError) || 'Statuses table was not found.')
  }

  throw new Error('Statuses table was not found.')
}

async function hasStatusEntityTypesTable(
  service: ReturnType<typeof createServiceClient>
): Promise<boolean> {
  const { error } = await service.from(STATUS_ENTITY_TYPES_TABLE).select('*').limit(1)
  if (!error) return true
  if (isMissingTableError(error)) return false
  throw new Error(errorMessage(error) || 'Failed to resolve status entity types table.')
}

async function replaceStatusEntityTypes(
  service: ReturnType<typeof createServiceClient>,
  statusId: StatusId,
  entityTypes: string[]
) {
  const { error: deleteError } = await service
    .from(STATUS_ENTITY_TYPES_TABLE)
    .delete()
    .eq('status_id', statusId)
  if (deleteError) {
    throw new Error(deleteError.message)
  }

  if (entityTypes.length === 0) return

  const rows = entityTypes.map((entityType) => ({
    status_id: statusId,
    entity_type: entityType,
  }))
  const { error: insertError } = await service
    .from(STATUS_ENTITY_TYPES_TABLE)
    .insert(rows)
  if (insertError) {
    throw new Error(insertError.message)
  }
}

function mapSemanticColumns(columns: Set<string>) {
  return {
    id: resolveColumn(columns, ['id']),
    name: resolveColumn(columns, ['name', 'status_name']),
    code: resolveColumn(columns, ['code', 'short_code']),
    icon: resolveColumn(columns, ['icon']),
    backgroundColor: resolveColumn(columns, ['color', 'background_color']),
    lockedBySystem: resolveColumn(
      columns,
      ['locked_by_system', 'is_system_locked', 'is_locked', 'is_default']
    ),
    entityType: resolveColumn(columns, ['entity_type']),
    sortOrder: resolveColumn(columns, ['sort_order', 'order', 'order_index']),
    createdBy: resolveColumn(columns, ['created_by']),
    updatedBy: resolveColumn(columns, ['updated_by']),
  }
}

async function getStatusMetadata(
  service: ReturnType<typeof createServiceClient>
): Promise<StatusMetadata> {
  const table = await resolveStatusTable(service)

  const { data, error } = await service.from(table).select('*').limit(1)
  if (error) {
    throw new Error(error.message)
  }

  const sample = data?.[0] ? { ...data[0] } : null
  const columns = new Set<string>()

  if (sample) {
    for (const key of Object.keys(sample)) {
      columns.add(key)
    }
  }

  // Fallback for empty table scenarios.
  if (columns.size === 0) {
    columns.add('id')
    columns.add('name')
    columns.add('code')
    columns.add('color')
  }

  return { table, columns, sample }
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

export async function createStatus(input: StatusMutationInput) {
  try {
    const user = await requireAuthenticatedUser()
    const service = createServiceClient()
    const metadata = await getStatusMetadata(service)
    const fields = mapSemanticColumns(metadata.columns)

    if (!fields.name) {
      return { error: 'Status name column was not found on statuses table.' }
    }

    const name = normalizeText(input.name)
    if (!name) {
      return { error: 'Status name is required' }
    }
    const normalizedEntityTypes = normalizeEntityTypes(input.entity_types, input.entity_type)

    const payload: Record<string, unknown> = {
      [fields.name]: name,
    }

    if (fields.code) {
      payload[fields.code] = normalizeText(input.code) || toStatusCode(name)
    }

    if (fields.icon) {
      payload[fields.icon] = normalizeText(input.icon)
    }

    if (fields.backgroundColor) {
      payload[fields.backgroundColor] = normalizeText(input.background_color)
    }

    if (fields.lockedBySystem) {
      payload[fields.lockedBySystem] = Boolean(input.locked_by_system)
    }

    if (fields.entityType) {
      payload[fields.entityType] =
        normalizedEntityTypes.length === 1 ? normalizedEntityTypes[0] : 'all'
    }

    if (fields.sortOrder && input.sort_order !== undefined) {
      payload[fields.sortOrder] = input.sort_order
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

    const hasEntityTypesTable = await hasStatusEntityTypesTable(service)
    const idColumn = fields.id || 'id'
    const statusId = resolveStatusId((data as Record<string, unknown>)[idColumn])
    if (hasEntityTypesTable && statusId !== null) {
      await replaceStatusEntityTypes(service, statusId, normalizedEntityTypes)
    }

    revalidatePath('/status')
    return { data }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to create status' }
  }
}

export async function updateStatus(
  statusId: StatusId,
  input: StatusMutationInput
) {
  try {
    const user = await requireAuthenticatedUser()
    const service = createServiceClient()
    const metadata = await getStatusMetadata(service)
    const fields = mapSemanticColumns(metadata.columns)
    const hasEntityTypesTable = await hasStatusEntityTypesTable(service)

    const payload: Record<string, unknown> = {}
    const shouldUpdateEntityTypes =
      input.entity_types !== undefined || input.entity_type !== undefined
    const normalizedEntityTypes = shouldUpdateEntityTypes
      ? normalizeEntityTypes(input.entity_types, input.entity_type)
      : []

    if (fields.name && input.name !== undefined) {
      const name = normalizeText(input.name)
      if (!name) return { error: 'Status name is required' }
      payload[fields.name] = name
    }

    if (fields.code && input.code !== undefined) {
      payload[fields.code] = normalizeText(input.code)
    }

    if (fields.icon && input.icon !== undefined) {
      payload[fields.icon] = normalizeText(input.icon)
    }

    if (fields.backgroundColor && input.background_color !== undefined) {
      payload[fields.backgroundColor] = normalizeText(input.background_color)
    }

    if (fields.lockedBySystem && input.locked_by_system !== undefined) {
      payload[fields.lockedBySystem] = Boolean(input.locked_by_system)
    }

    if (fields.entityType && shouldUpdateEntityTypes) {
      payload[fields.entityType] =
        normalizedEntityTypes.length === 1 ? normalizedEntityTypes[0] : 'all'
    }

    if (fields.sortOrder && input.sort_order !== undefined) {
      payload[fields.sortOrder] = input.sort_order
    }

    if (fields.updatedBy) {
      payload[fields.updatedBy] = user.id
    }

    if (
      Object.keys(payload).length === 0 &&
      !(hasEntityTypesTable && shouldUpdateEntityTypes)
    ) {
      return { error: 'No fields provided to update' }
    }

    const idColumn = fields.id || 'id'
    let data: Record<string, unknown> | null = null

    if (Object.keys(payload).length > 0) {
      const updateResult = await service
        .from(metadata.table)
        .update(payload)
        .eq(idColumn, statusId)
        .select()
        .single()

      if (updateResult.error) {
        return { error: updateResult.error.message }
      }

      data = (updateResult.data || null) as Record<string, unknown> | null
    } else {
      const selectResult = await service
        .from(metadata.table)
        .select('*')
        .eq(idColumn, statusId)
        .single()

      if (selectResult.error) {
        return { error: selectResult.error.message }
      }

      data = (selectResult.data || null) as Record<string, unknown> | null
    }

    if (hasEntityTypesTable && shouldUpdateEntityTypes) {
      await replaceStatusEntityTypes(service, statusId, normalizedEntityTypes)
    }

    revalidatePath('/status')
    return { data }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to update status' }
  }
}

export async function deleteStatus(statusId: StatusId) {
  try {
    await requireAuthenticatedUser()
    const service = createServiceClient()
    const metadata = await getStatusMetadata(service)
    const fields = mapSemanticColumns(metadata.columns)
    const idColumn = fields.id || 'id'

    const { error } = await service.from(metadata.table).delete().eq(idColumn, statusId)
    if (error) {
      return { error: error.message }
    }

    revalidatePath('/status')
    return { success: true }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to delete status' }
  }
}
