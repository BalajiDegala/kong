'use server'

import type { EntityKey } from '@/lib/schema'
import { pickEntityColumns } from '@/lib/schema'

const DEFAULT_DENY_COLUMNS = new Set(['id', 'created_at', 'updated_at'])

const ENTITY_TO_RUNTIME_TYPE: Record<EntityKey, string> = {
  asset: 'asset',
  sequence: 'sequence',
  shot: 'shot',
  task: 'task',
  version: 'version',
  note: 'note',
  published_file: 'published_file',
  post: 'post',
  post_media: 'post_media',
  post_reaction: 'post_reaction',
  annotation: 'annotation',
}

function isMissingRuntimeSchema(error: any) {
  if (!error) return false
  const code = String(error.code || '')
  const message = String(error.message || '').toLowerCase()
  return (
    code === 'PGRST205' ||
    message.includes('schema_field_runtime_v') ||
    message.includes('does not exist')
  )
}

export async function pickEntityColumnsForWrite(
  supabase: any,
  entity: EntityKey,
  input: Record<string, unknown>,
  options?: { deny?: Set<string> }
) {
  const out = pickEntityColumns(entity, input, options)
  const deny = new Set<string>(DEFAULT_DENY_COLUMNS)
  for (const column of options?.deny ?? []) deny.add(column)

  const runtimeEntityType = ENTITY_TO_RUNTIME_TYPE[entity] || entity
  const { data, error } = await supabase
    .from('schema_field_runtime_v')
    .select('column_name')
    .eq('entity_type', runtimeEntityType)
    .eq('field_active', true)

  if (error) {
    if (!isMissingRuntimeSchema(error)) {
      console.error(`Failed to load runtime schema for ${runtimeEntityType}:`, error)
    }
    return out
  }

  const runtimeColumns = new Set<string>()
  for (const row of data || []) {
    const column = typeof row?.column_name === 'string' ? row.column_name.trim() : ''
    if (!column) continue
    runtimeColumns.add(column)
  }

  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) continue
    if (deny.has(key)) continue
    if (!runtimeColumns.has(key)) continue
    out[key] = value
  }

  return out
}
