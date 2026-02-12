'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

type DepartmentMutationInput = {
  name?: string
  short_name?: string | null
  department_type?: string | null
  status?: string | null
  color?: string | null
  order?: number | null
  tags?: string[] | null
  thumbnail_url?: string | null
}

type DepartmentMetadata = {
  columns: Set<string>
  sample: Record<string, any> | null
}

function normalizeText(value?: string | null): string | null {
  const next = (value || '').trim()
  return next.length > 0 ? next : null
}

function toDepartmentCode(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function resolveColumn(
  columns: Set<string>,
  candidates: string[]
): string | null {
  for (const candidate of candidates) {
    if (columns.has(candidate)) return candidate
  }
  return null
}

function mapSemanticColumns(columns: Set<string>) {
  return {
    id: resolveColumn(columns, ['id']),
    name: resolveColumn(columns, ['name', 'department_name']),
    shortName: resolveColumn(columns, ['code', 'short_name', 'department_short_name']),
    departmentType: resolveColumn(columns, ['department_type', 'type']),
    status: resolveColumn(columns, ['status']),
    color: resolveColumn(columns, ['color']),
    order: resolveColumn(columns, ['order', 'order_index', 'sort_order']),
    tags: resolveColumn(columns, ['tags']),
    thumbnailUrl: resolveColumn(columns, ['thumbnail_url', 'thumbnail']),
    createdBy: resolveColumn(columns, ['created_by']),
    updatedBy: resolveColumn(columns, ['updated_by']),
  }
}

async function getDepartmentMetadata(service: ReturnType<typeof createServiceClient>): Promise<DepartmentMetadata> {
  const { data, error } = await service
    .from('departments')
    .select('*')
    .limit(1)

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

  // Fallback for empty tables where we still need core columns.
  if (columns.size === 0) {
    columns.add('id')
    columns.add('name')
    columns.add('code')
  }

  return { columns, sample }
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

export async function createDepartment(input: DepartmentMutationInput) {
  try {
    const user = await requireAuthenticatedUser()
    const service = createServiceClient()
    const metadata = await getDepartmentMetadata(service)
    const fields = mapSemanticColumns(metadata.columns)

    if (!fields.name) {
      return { error: 'Department name column was not found on departments table.' }
    }

    const name = normalizeText(input.name)
    if (!name) {
      return { error: 'Department name is required' }
    }

    const payload: Record<string, any> = {
      [fields.name]: name,
    }

    if (fields.shortName) {
      const nextShortName = normalizeText(input.short_name) || toDepartmentCode(name)
      payload[fields.shortName] = nextShortName
    }

    if (fields.departmentType) {
      payload[fields.departmentType] = normalizeText(input.department_type)
    }

    if (fields.status) {
      payload[fields.status] = normalizeText(input.status) || 'Active'
    }

    if (fields.color) {
      payload[fields.color] = normalizeText(input.color)
    }

    if (fields.order && input.order !== undefined) {
      payload[fields.order] = input.order
    }

    if (fields.tags) {
      const tags = (input.tags || [])
        .map((tag) => tag.trim())
        .filter(Boolean)
      if (tags.length > 0) {
        if (metadata.sample && typeof metadata.sample[fields.tags] === 'string') {
          payload[fields.tags] = tags.join(', ')
        } else {
          payload[fields.tags] = tags
        }
      } else {
        payload[fields.tags] = null
      }
    }

    if (fields.thumbnailUrl) {
      payload[fields.thumbnailUrl] = normalizeText(input.thumbnail_url)
    }

    if (fields.createdBy) {
      payload[fields.createdBy] = user.id
    }

    if (fields.updatedBy) {
      payload[fields.updatedBy] = user.id
    }

    const { data, error } = await service
      .from('departments')
      .insert(payload)
      .select()
      .single()

    if (error) {
      return { error: error.message }
    }

    revalidatePath('/departments')
    revalidatePath('/people')
    return { data }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to create department' }
  }
}

export async function updateDepartment(
  departmentId: number,
  input: DepartmentMutationInput
) {
  try {
    const user = await requireAuthenticatedUser()
    const service = createServiceClient()
    const metadata = await getDepartmentMetadata(service)
    const fields = mapSemanticColumns(metadata.columns)

    const payload: Record<string, any> = {}

    if (fields.name && input.name !== undefined) {
      const name = normalizeText(input.name)
      if (!name) return { error: 'Department name is required' }
      payload[fields.name] = name
    }

    if (fields.shortName && input.short_name !== undefined) {
      payload[fields.shortName] = normalizeText(input.short_name)
    }

    if (fields.departmentType && input.department_type !== undefined) {
      payload[fields.departmentType] = normalizeText(input.department_type)
    }

    if (fields.status && input.status !== undefined) {
      payload[fields.status] = normalizeText(input.status)
    }

    if (fields.color && input.color !== undefined) {
      payload[fields.color] = normalizeText(input.color)
    }

    if (fields.order && input.order !== undefined) {
      payload[fields.order] = input.order
    }

    if (fields.tags && input.tags !== undefined) {
      const tags = (input.tags || [])
        .map((tag) => tag.trim())
        .filter(Boolean)
      if (metadata.sample && typeof metadata.sample[fields.tags] === 'string') {
        payload[fields.tags] = tags.length ? tags.join(', ') : null
      } else {
        payload[fields.tags] = tags.length ? tags : null
      }
    }

    if (fields.thumbnailUrl && input.thumbnail_url !== undefined) {
      payload[fields.thumbnailUrl] = normalizeText(input.thumbnail_url)
    }

    if (fields.updatedBy) {
      payload[fields.updatedBy] = user.id
    }

    if (Object.keys(payload).length === 0) {
      return { error: 'No fields provided to update' }
    }

    const idColumn = fields.id || 'id'

    const { data, error } = await service
      .from('departments')
      .update(payload)
      .eq(idColumn, departmentId)
      .select()
      .single()

    if (error) {
      return { error: error.message }
    }

    revalidatePath('/departments')
    revalidatePath('/people')
    return { data }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to update department' }
  }
}

export async function deleteDepartment(departmentId: number) {
  try {
    await requireAuthenticatedUser()
    const service = createServiceClient()

    const { count: linkedPeopleCount, error: linkedPeopleError } = await service
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('department_id', departmentId)
      .eq('active', true)

    if (linkedPeopleError) {
      return { error: linkedPeopleError.message }
    }

    if ((linkedPeopleCount || 0) > 0) {
      return {
        error:
          'Cannot delete this department because active people are linked to it. Reassign people first.',
      }
    }

    const { error } = await service
      .from('departments')
      .delete()
      .eq('id', departmentId)

    if (error) {
      return { error: error.message }
    }

    revalidatePath('/departments')
    revalidatePath('/people')
    return { success: true }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to delete department' }
  }
}
