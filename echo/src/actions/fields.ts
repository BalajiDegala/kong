'use server'

import { revalidatePath } from 'next/cache'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

const SCHEMA_FIELD_ENTITIES = [
  'asset',
  'sequence',
  'shot',
  'task',
  'version',
  'note',
  'published_file',
  'project',
  'department',
  'person',
] as const

type SchemaFieldEntity = (typeof SCHEMA_FIELD_ENTITIES)[number]

type SchemaFieldDataType =
  | 'calculated'
  | 'checkbox'
  | 'color'
  | 'currency'
  | 'date'
  | 'date_time'
  | 'duration'
  | 'entity'
  | 'file_link'
  | 'float'
  | 'footage'
  | 'image'
  | 'list'
  | 'multi_entity'
  | 'number'
  | 'password'
  | 'percent'
  | 'query'
  | 'serializable'
  | 'status_list'
  | 'summary'
  | 'text'
  | 'timecode'
  | 'url'
  | 'url_template'

type SchemaFieldType = 'dynamic' | 'permanent' | 'system_owned' | 'custom'

type RpcResult<T> =
  | { data: T; error?: undefined }
  | { error: string; data?: undefined }

interface SchemaChoiceSetItemInput {
  value: string
  label?: string
  color?: string | null
  sort_order?: number
}

interface CreateChoiceSetInput {
  name: string
  description?: string | null
  items?: SchemaChoiceSetItemInput[]
}

interface CreateSchemaFieldInput {
  name: string
  code: string
  data_type: SchemaFieldDataType | string
  field_type?: SchemaFieldType
  description?: string | null
  default_value?: unknown
  choice_set_id?: number | null
  entities: SchemaFieldEntity[] | string[]
  required?: boolean
  visible_by_default?: boolean
  display_order?: number
  link_target_entities?: SchemaFieldEntity[] | string[]
}

async function requireAuth() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  return supabase
}

function cleanPatch(patch: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(patch).filter(([, value]) => value !== undefined)
  )
}

function revalidateSchemaConsumers() {
  revalidatePath('/fields')
  revalidatePath('/apex')
  revalidatePath('/people')
  revalidatePath('/departments')
}

async function applyFieldDatatypeMigration(): Promise<string | null> {
  const migrationPath = join(
    process.cwd(),
    'migrations&fixes',
    'generated',
    '2026-02-13-fields-datatype-sync.sql'
  )

  let sql: string
  try {
    sql = await readFile(migrationPath, 'utf-8')
  } catch (error) {
    return error instanceof Error
      ? `Could not read migration file (${migrationPath}): ${error.message}`
      : `Could not read migration file (${migrationPath})`
  }

  const service = createServiceClient()
  const attempts: Array<Record<string, string>> = [{ sql }, { query: sql }]
  const execSqlErrors: string[] = []

  for (const payload of attempts) {
    const { error } = await service.rpc('exec_sql', payload as any)
    if (!error) {
      return null
    }
    execSqlErrors.push(error.message)
  }

  const managementTokenCandidates = [
    process.env.SUPABASE_ACCESS_TOKEN,
    process.env.SUPABASE_MANAGEMENT_API_TOKEN,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  ].filter((value): value is string => Boolean(value && value.trim()))
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''

  let projectRef = ''
  try {
    const host = new URL(supabaseUrl).host
    const dotIndex = host.indexOf('.')
    projectRef = dotIndex > 0 ? host.slice(0, dotIndex) : ''
  } catch {
    projectRef = ''
  }

  if (managementTokenCandidates.length > 0 && projectRef) {
    let lastManagementError = ''

    for (const managementToken of managementTokenCandidates) {
      try {
        const response = await fetch(
          `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${managementToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query: sql }),
          }
        )

        if (response.ok) {
          return null
        }

        const responseText = await response.text()
        lastManagementError = `Management API failed (${response.status}): ${responseText || 'No response body'}`
      } catch (error) {
        lastManagementError =
          error instanceof Error
            ? `Management API request failed: ${error.message}`
            : 'Management API request failed'
      }
    }

    if (lastManagementError) {
      return lastManagementError
    }
  }

  return (
    (execSqlErrors.length > 0
      ? `exec_sql RPC unavailable: ${execSqlErrors.join(' | ')}`
      :
        '') ||
    'Failed to run migration SQL through exec_sql RPC and Management API fallback is unavailable. Set SUPABASE_ACCESS_TOKEN or SUPABASE_MANAGEMENT_API_TOKEN, or run SQL once in Supabase SQL editor.'
  )
}

export async function listSchemaFields(entityType?: SchemaFieldEntity | string) {
  try {
    const supabase = await requireAuth()

    let query = supabase
      .from('schema_field_runtime_v')
      .select('*')
      .order('entity_type', { ascending: true })
      .order('display_order', { ascending: true })
      .order('name', { ascending: true })

    if (entityType) {
      query = query.eq('entity_type', entityType)
    }

    const { data, error } = await query
    if (error) {
      return { error: error.message }
    }

    return { data: data || [] }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to list schema fields',
    }
  }
}

export async function listFieldDefinitions(includeInactive = false) {
  try {
    const supabase = await requireAuth()

    let query = supabase
      .from('schema_fields')
      .select('*')
      .order('name', { ascending: true })

    if (!includeInactive) {
      query = query.eq('is_active', true)
    }

    const { data, error } = await query
    if (error) {
      return { error: error.message }
    }

    return { data: data || [] }
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : 'Failed to list field definitions',
    }
  }
}

export async function listChoiceSets(includeInactive = false) {
  try {
    const supabase = await requireAuth()

    let setQuery = supabase
      .from('schema_choice_sets')
      .select('*')
      .order('name', { ascending: true })

    if (!includeInactive) {
      setQuery = setQuery.eq('is_active', true)
    }

    const { data: sets, error: setsError } = await setQuery
    if (setsError) {
      return { error: setsError.message }
    }

    let itemQuery = supabase
      .from('schema_choice_set_items')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true })

    if (!includeInactive) {
      itemQuery = itemQuery.eq('is_active', true)
    }

    const { data: items, error: itemsError } = await itemQuery
    if (itemsError) {
      return { error: itemsError.message }
    }

    const itemsBySet = new Map<number, any[]>()
    for (const item of items || []) {
      const setId = Number(item.choice_set_id)
      if (!itemsBySet.has(setId)) {
        itemsBySet.set(setId, [])
      }
      itemsBySet.get(setId)!.push(item)
    }

    const data = (sets || []).map((set) => ({
      ...set,
      items: itemsBySet.get(Number(set.id)) || [],
    }))

    return { data }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to list choice sets',
    }
  }
}

export async function createChoiceSet(
  input: CreateChoiceSetInput
): Promise<RpcResult<{ choice_set_id: number }>> {
  try {
    const supabase = await requireAuth()

    const items = (input.items || [])
      .map((item) => ({
        value: item.value?.trim(),
        label: item.label?.trim() || item.value?.trim(),
        color: item.color?.trim() || null,
        sort_order: item.sort_order,
      }))
      .filter((item) => item.value)

    const { data, error } = await supabase.rpc('schema_create_choice_set', {
      p_name: input.name?.trim(),
      p_description: input.description?.trim() || null,
      p_items: items,
    })

    if (error) {
      return { error: error.message }
    }

    revalidateSchemaConsumers()
    return { data: { choice_set_id: Number(data) } }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to create choice set',
    }
  }
}

export async function createSchemaField(
  input: CreateSchemaFieldInput
): Promise<RpcResult<{ field_id: number }>> {
  try {
    const supabase = await requireAuth()

    const entities = Array.from(
      new Set((input.entities || []).map((item) => String(item).trim().toLowerCase()))
    ).filter(Boolean)

    if (entities.length === 0) {
      return { error: 'At least one entity is required' }
    }

    const linkTargetEntities = Array.from(
      new Set(
        (input.link_target_entities || [])
          .map((item) => String(item).trim().toLowerCase())
          .filter(Boolean)
      )
    )

    const { data, error } = await supabase.rpc('schema_create_field', {
      p_name: input.name?.trim(),
      p_code: input.code?.trim().toLowerCase(),
      p_data_type: String(input.data_type || 'text').trim().toLowerCase(),
      p_field_type: (input.field_type || 'dynamic').trim().toLowerCase(),
      p_description: input.description?.trim() || null,
      p_default_value:
        input.default_value === undefined ? null : (input.default_value as any),
      p_choice_set_id: input.choice_set_id ?? null,
      p_entities: entities,
      p_required: Boolean(input.required),
      p_visible_by_default:
        input.visible_by_default === undefined ? true : Boolean(input.visible_by_default),
      p_display_order: input.display_order ?? 1000,
      p_link_target_entities: linkTargetEntities,
    })

    if (error) {
      return { error: error.message }
    }

    revalidateSchemaConsumers()
    return { data: { field_id: Number(data) } }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to create schema field',
    }
  }
}

export async function addFieldToEntity(
  fieldId: number,
  entityType: SchemaFieldEntity | string,
  options?: {
    required?: boolean
    visible_by_default?: boolean
    display_order?: number
  }
): Promise<RpcResult<{ success: true }>> {
  try {
    const supabase = await requireAuth()

    const { error } = await supabase.rpc('schema_add_field_to_entity', {
      p_field_id: fieldId,
      p_entity_type: String(entityType || '').trim().toLowerCase(),
      p_required: Boolean(options?.required),
      p_visible_by_default:
        options?.visible_by_default === undefined
          ? true
          : Boolean(options.visible_by_default),
      p_display_order: options?.display_order ?? 1000,
    })

    if (error) {
      return { error: error.message }
    }

    revalidateSchemaConsumers()
    return { data: { success: true } }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to attach field to entity',
    }
  }
}

export async function updateSchemaFieldMeta(
  fieldId: number,
  patch: Record<string, unknown>
): Promise<RpcResult<{ success: true }>> {
  try {
    const supabase = await requireAuth()
    const payload = cleanPatch(patch)
    const nextDataTypeRaw = payload.data_type

    if (nextDataTypeRaw !== undefined) {
      delete payload.data_type
      const nextDataType = String(nextDataTypeRaw || '')
        .trim()
        .toLowerCase()

      if (!nextDataType) {
        return { error: 'Data type is required' }
      }

      const { error: dataTypeError } = await supabase.rpc(
        'schema_change_field_data_type',
        {
          p_field_id: fieldId,
          p_data_type: nextDataType,
        }
      )

      if (dataTypeError) {
        if (
          dataTypeError.code === '42883' ||
          /schema_change_field_data_type/.test(dataTypeError.message)
        ) {
          const migrationError = await applyFieldDatatypeMigration()
          if (migrationError) {
            return {
              error: `Field type sync migration is missing and auto-apply failed: ${migrationError}. You can run \`node apply-fields-datatype-migration.js\` from repo root.`,
            }
          }

          const retry = await supabase.rpc('schema_change_field_data_type', {
            p_field_id: fieldId,
            p_data_type: nextDataType,
          })
          if (retry.error) {
            return { error: retry.error.message }
          }
        } else {
          return { error: dataTypeError.message }
        }
      }
    }

    if (Object.keys(payload).length > 0) {
      const { error } = await supabase.rpc('schema_update_field_meta', {
        p_field_id: fieldId,
        p_patch: payload,
      })

      if (error) {
        return { error: error.message }
      }
    }

    revalidateSchemaConsumers()
    return { data: { success: true } }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to update schema field',
    }
  }
}

export async function deactivateSchemaField(
  fieldId: number,
  reason?: string
): Promise<RpcResult<{ success: true }>> {
  try {
    const supabase = await requireAuth()

    const { error } = await supabase.rpc('schema_deactivate_field', {
      p_field_id: fieldId,
      p_reason: reason?.trim() || null,
    })

    if (error) {
      return { error: error.message }
    }

    revalidateSchemaConsumers()
    return { data: { success: true } }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to deactivate field',
    }
  }
}

export async function bootstrapSchemaFields(
  entityType?: SchemaFieldEntity | string | null
): Promise<RpcResult<{ inserted_or_linked: number }>> {
  try {
    const supabase = await requireAuth()

    const { data, error } = await supabase.rpc('schema_bootstrap_table_columns', {
      p_entity_type: entityType ? String(entityType).trim().toLowerCase() : null,
    })

    if (error) {
      return { error: error.message }
    }

    revalidateSchemaConsumers()
    return { data: { inserted_or_linked: Number(data || 0) } }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to bootstrap schema fields',
    }
  }
}
