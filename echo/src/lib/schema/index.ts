import { SCHEMA, type EntityKey, type SchemaField } from './schema.generated'

export { SCHEMA }
export type { EntityKey, SchemaField }

const DEFAULT_DENY_COLUMNS = new Set([
  // Never accept client-provided values for these in generic pickers.
  'id',
  'created_at',
  'updated_at',
])

export function getEntitySchema(entity: EntityKey) {
  return SCHEMA[entity]
}

export function getEntityColumns(entity: EntityKey): Set<string> {
  const columns = new Set<string>()
  for (const field of SCHEMA[entity].fields) {
    if (field.virtual) continue
    if (!field.column) continue
    columns.add(field.column)
  }
  return columns
}

export function pickEntityColumns(
  entity: EntityKey,
  input: Record<string, unknown>,
  options?: { deny?: Set<string> }
) {
  const allowed = getEntityColumns(entity)
  const deny = new Set<string>(DEFAULT_DENY_COLUMNS)
  for (const col of options?.deny ?? []) deny.add(col)

  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) continue
    if (!allowed.has(key)) continue
    if (deny.has(key)) continue
    out[key] = value
  }
  return out
}
