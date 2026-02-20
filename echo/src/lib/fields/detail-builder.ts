/**
 * Unified Field System — Server-Side Detail Builder
 *
 * Builds header fields for entity detail layouts (Server Components).
 * Orchestrates: field definitions → options → entity resolution → header fields.
 *
 * This is the server-side equivalent of the useEntityDetail client hook.
 * Use in async Server Components that can't use React hooks.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { ExtendedEntityKey, FieldBehavior, FieldOption, EntityResolutionMap } from './types'
import type { EntityHeaderFieldDraft } from './context-adapters'
import { getFieldDefinitions } from './entity-fields'
import { loadAllFieldOptions } from './options-loader'
import { resolveEntityLinks } from './entity-resolver'
import { enrichRow } from './row-enricher'
import { toHeaderField } from './context-adapters'

export interface DetailBuilderConfig {
  entity: ExtendedEntityKey
  row: Record<string, unknown>
  supabase: SupabaseClient
  projectId?: string | number
  /** Fields to show in the header (ordered). If omitted, uses visibleByDefault from schema. */
  manualFields?: string[]
  /** Extra readonly fields to prepend to the output (e.g. computed entity label). */
  prependFields?: EntityHeaderFieldDraft[]
  /** Field codes to exclude from auto-generated fields */
  excludeFields?: string[]
}

export interface DetailBuilderResult {
  fields: EntityHeaderFieldDraft[]
  options: Record<string, FieldOption[]>
  resolutionMap: EntityResolutionMap
  enrichedRow: Record<string, unknown>
}

/**
 * Build header fields for an entity detail page (Server Component).
 *
 * Example:
 *   const { fields } = await buildDetailFields({
 *     entity: 'shot',
 *     row: shot,
 *     supabase,
 *     manualFields: ['status', 'cut_in', 'cut_out'],
 *     prependFields: [
 *       { id: 'sequence', label: 'Sequence', type: 'readonly', value: sequenceLabel },
 *     ],
 *   })
 */
export async function buildDetailFields(
  config: DetailBuilderConfig
): Promise<DetailBuilderResult> {
  const { entity, row, supabase, projectId, manualFields, prependFields, excludeFields } = config

  // 1. Get field definitions from schema
  let allFields = getFieldDefinitions(entity)
  if (excludeFields && excludeFields.length > 0) {
    const excludeSet = new Set(excludeFields)
    allFields = allFields.filter((f) => !excludeSet.has(f.code))
  }

  // 2. Load options + resolve entity links in parallel
  const [options, resolutionMap] = await Promise.all([
    loadAllFieldOptions(supabase, entity),
    resolveEntityLinks(supabase, entity, [row], {
      projectId: projectId ? String(projectId) : undefined,
    }),
  ])

  // 3. Enrich the row
  const enrichedRow = enrichRow(entity, row, resolutionMap)

  // 4. Build header fields
  let fieldList: FieldBehavior[]
  if (manualFields && manualFields.length > 0) {
    const fieldMap = new Map(allFields.map((f) => [f.code, f]))
    fieldList = manualFields
      .map((code) => fieldMap.get(code))
      .filter((f): f is FieldBehavior => f !== undefined)
  } else {
    fieldList = allFields.filter((f) => f.visibleByDefault)
  }

  const headerFields = fieldList.map((field) =>
    toHeaderField(
      field,
      enrichedRow[field.code],
      options[field.code],
      resolutionMap,
      enrichedRow
    )
  )

  // 5. Prepend any custom fields
  const fields = prependFields
    ? [...prependFields, ...headerFields]
    : headerFields

  return { fields, options, resolutionMap, enrichedRow }
}
