'use client'

/**
 * useEntityDetail — Unified hook for entity detail headers + info panels
 *
 * Orchestrates the field system for the entity detail view:
 *   Single entity row → field definitions → options → entity resolution →
 *   header fields + info fields → { headerFields, infoFields, handleFieldUpdate }
 *
 * Replaces appendAutoHeaderFields() + loadEntityFieldOptionMap() + applyFieldOptionMap()
 * duplicated across shot/asset/task detail layouts.
 */

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type {
  ExtendedEntityKey,
  FieldBehavior,
  FieldOption,
  EntityResolutionMap,
} from '@/lib/fields/types'
import type { EntityHeaderFieldDraft } from '@/lib/fields/context-adapters'
import { getFieldDefinitions } from '@/lib/fields/entity-fields'
import { loadAllFieldOptions } from '@/lib/fields/options-loader'
import { resolveEntityLinks } from '@/lib/fields/entity-resolver'
import { enrichRow } from '@/lib/fields/row-enricher'
import { toHeaderField, toInfoField } from '@/lib/fields/context-adapters'
import { prepareFieldUpdate } from '@/lib/fields/field-update-handler'
import { dispatchUpdate } from '@/lib/fields/entity-actions'
import { asText } from '@/lib/fields/utils'

export interface EntityDetailConfig {
  /** Entity type key */
  entity: ExtendedEntityKey
  /** Single entity row */
  row: Record<string, unknown>
  /** Project ID */
  projectId?: string | number
  /** Ordered list of field codes to show as header fields. If not provided, uses visibleByDefault. */
  manualFields?: string[]
  /** Default visible field codes for the header (overrides schema defaults) */
  defaultVisibleFields?: string[]
  /** Field codes to exclude from auto-generated fields */
  excludeFields?: string[]
}

export interface EntityDetailResult {
  /** Header fields for EntityDetailHeader */
  headerFields: EntityHeaderFieldDraft[]
  /** Info panel fields (with textarea detection) */
  infoFields: EntityHeaderFieldDraft[]
  /** Loaded dropdown options keyed by field code */
  options: Record<string, FieldOption[]>
  /** Resolution map for entity links */
  resolutionMap: EntityResolutionMap
  /** Whether async processing is in progress */
  isProcessing: boolean
  /** Enriched row data with resolved labels */
  enrichedRow: Record<string, unknown>
  /** Handle a field update: calls server action + returns optimistic patch */
  handleFieldUpdate: (
    fieldCode: string,
    value: unknown
  ) => Promise<{ patch: Record<string, unknown> }>
}

export function useEntityDetail(config: EntityDetailConfig): EntityDetailResult {
  const { entity, row, projectId, manualFields, defaultVisibleFields, excludeFields } = config

  const [options, setOptions] = useState<Record<string, FieldOption[]>>({})
  const [resolutionMap, setResolutionMap] = useState<EntityResolutionMap>(new Map())
  const [isProcessing, setIsProcessing] = useState(true)

  // Get field definitions
  const fields = useMemo(() => {
    const allFields = getFieldDefinitions(entity)
    if (!excludeFields || excludeFields.length === 0) return allFields
    const excludeSet = new Set(excludeFields)
    return allFields.filter((f) => !excludeSet.has(f.code))
  }, [entity, excludeFields])

  // Load options + resolve entity links
  useEffect(() => {
    let cancelled = false

    async function process() {
      setIsProcessing(true)
      try {
        const supabase = createClient()

        const [loadedOptions, loadedResolution] = await Promise.all([
          loadAllFieldOptions(supabase, entity),
          resolveEntityLinks(supabase, entity, [row], {
            projectId: projectId ? String(projectId) : undefined,
          }),
        ])

        if (cancelled) return

        setOptions(loadedOptions)
        setResolutionMap(loadedResolution)
      } catch (err) {
        console.error(`[useEntityDetail] Error processing ${entity}:`, err)
      } finally {
        if (!cancelled) setIsProcessing(false)
      }
    }

    void process()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entity, row, projectId])

  // Enriched row
  const enrichedRow = useMemo(() => {
    return enrichRow(entity, row, resolutionMap)
  }, [entity, row, resolutionMap])

  // Generate header fields
  const headerFields = useMemo(() => {
    let fieldList: FieldBehavior[]

    if (manualFields && manualFields.length > 0) {
      // Use the ordered list of manual fields
      const fieldMap = new Map(fields.map((f) => [f.code, f]))
      fieldList = manualFields
        .map((code) => fieldMap.get(code))
        .filter((f): f is FieldBehavior => f !== undefined)
    } else if (defaultVisibleFields && defaultVisibleFields.length > 0) {
      // Use default visible fields
      const visibleSet = new Set(defaultVisibleFields)
      fieldList = fields.filter((f) => visibleSet.has(f.code))
    } else {
      // Use schema defaults
      fieldList = fields.filter((f) => f.visibleByDefault)
    }

    return fieldList.map((field) =>
      toHeaderField(
        field,
        enrichedRow[field.code],
        options[field.code],
        resolutionMap,
        enrichedRow
      )
    )
  }, [fields, manualFields, defaultVisibleFields, enrichedRow, options, resolutionMap])

  // Generate info panel fields (all non-system fields)
  const infoFields = useMemo(() => {
    const systemCodes = new Set(['id', 'project_id', 'created_at', 'updated_at', 'created_by', 'updated_by'])
    const infoList = fields.filter(
      (f) => !systemCodes.has(f.code) && f.column !== null
    )

    return infoList.map((field) =>
      toInfoField(
        field,
        enrichedRow[field.code],
        options[field.code],
        resolutionMap,
        enrichedRow
      )
    )
  }, [fields, enrichedRow, options, resolutionMap])

  // Field update handler
  async function handleFieldUpdate(
    fieldCode: string,
    value: unknown
  ): Promise<{ patch: Record<string, unknown> }> {
    const { patch, serverPayload } = prepareFieldUpdate(
      entity,
      enrichedRow,
      fieldCode,
      value,
      fields,
      resolutionMap
    )

    const rowId = asText(row.id).trim()
    if (!rowId) throw new Error('Row has no id')

    const result = await dispatchUpdate(entity, rowId, serverPayload, {
      revalidate: false,
      projectId: projectId ? String(projectId) : undefined,
    })

    if (result.error) {
      throw new Error(result.error)
    }

    return { patch }
  }

  return {
    headerFields,
    infoFields,
    options,
    resolutionMap,
    isProcessing,
    enrichedRow,
    handleFieldUpdate,
  }
}
