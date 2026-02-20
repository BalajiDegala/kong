'use client'

/**
 * useEntityData — Unified hook for entity table views
 *
 * Orchestrates the field system into a ready-to-use data pipeline:
 *   Raw DB rows → field definitions → options → entity resolution →
 *   row enrichment → table columns → { data, columns, handleCellUpdate }
 *
 * Replaces ~200-400 lines of manual column defs, option loading,
 * and entity resolution duplicated across every entity list page.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { TableColumn } from '@/components/table/types'
import type {
  ExtendedEntityKey,
  FieldBehavior,
  FieldOption,
  EntityResolutionMap,
} from '@/lib/fields/types'
import { getFieldDefinitions } from '@/lib/fields/entity-fields'
import { loadAllFieldOptions } from '@/lib/fields/options-loader'
import { resolveEntityLinks } from '@/lib/fields/entity-resolver'
import { enrichRows } from '@/lib/fields/row-enricher'
import { toTableColumns } from '@/lib/fields/context-adapters'
import { prepareFieldUpdate } from '@/lib/fields/field-update-handler'
import { dispatchUpdate } from '@/lib/fields/entity-actions'
import { asText } from '@/lib/fields/utils'

export interface EntityDataConfig {
  /** Entity type key */
  entity: ExtendedEntityKey
  /** Raw rows from the caller's Supabase query */
  rows: Record<string, unknown>[]
  /** Project ID (used for scoped option loading) */
  projectId?: string | number
  /** Cross-project mode (e.g. My Tasks) */
  crossProject?: boolean
  /** Per-field column overrides (linkHref, formatValue, width, etc.) */
  columnOverrides?: Record<string, Partial<TableColumn>>
  /** Extra columns to prepend/append */
  extraColumns?: { prepend?: TableColumn[]; append?: TableColumn[] }
  /** Field codes to exclude from generated columns */
  excludeFields?: string[]
}

export interface EntityDataResult {
  /** Enriched rows with _label fields and computed values */
  data: Record<string, unknown>[]
  /** Ready-to-use columns for EntityTable */
  columns: TableColumn[]
  /** Field behaviors for the entity */
  fields: FieldBehavior[]
  /** Loaded dropdown options keyed by field code */
  options: Record<string, FieldOption[]>
  /** Resolution map for entity links */
  resolutionMap: EntityResolutionMap
  /** Whether async processing (options/resolution) is in progress */
  isProcessing: boolean
  /** Handle a cell update: calls server action + returns optimistic patch */
  handleCellUpdate: (
    row: Record<string, unknown>,
    column: TableColumn,
    value: unknown
  ) => Promise<void>
  /** Get the optimistic patch + server payload for a field change */
  getFieldUpdate: (
    row: Record<string, unknown>,
    fieldCode: string,
    value: unknown
  ) => { patch: Record<string, unknown>; serverPayload: Record<string, unknown> }
}

export function useEntityData(config: EntityDataConfig): EntityDataResult {
  const { entity, rows, projectId, crossProject, columnOverrides, extraColumns, excludeFields } = config

  const [options, setOptions] = useState<Record<string, FieldOption[]>>({})
  const [resolutionMap, setResolutionMap] = useState<EntityResolutionMap>(new Map())
  const [isProcessing, setIsProcessing] = useState(true)

  // Stable reference for rows to avoid infinite loops
  const rowsRef = useRef(rows)
  rowsRef.current = rows

  // Get field definitions (synchronous, from schema)
  const fields = useMemo(() => {
    const allFields = getFieldDefinitions(entity)
    if (!excludeFields || excludeFields.length === 0) return allFields
    const excludeSet = new Set(excludeFields)
    return allFields.filter((f) => !excludeSet.has(f.code))
  }, [entity, excludeFields])

  // Load options + resolve entity links when rows change
  useEffect(() => {
    let cancelled = false

    async function process() {
      setIsProcessing(true)
      try {
        const supabase = createClient()

        // Load options and resolve entity links in parallel
        const [loadedOptions, loadedResolution] = await Promise.all([
          loadAllFieldOptions(supabase, entity),
          rows.length > 0
            ? resolveEntityLinks(supabase, entity, rows, {
                crossProject,
                projectId: projectId ? String(projectId) : undefined,
              })
            : Promise.resolve(new Map() as EntityResolutionMap),
        ])

        if (cancelled) return

        setOptions(loadedOptions)
        setResolutionMap(loadedResolution)
      } catch (err) {
        console.error(`[useEntityData] Error processing ${entity}:`, err)
      } finally {
        if (!cancelled) setIsProcessing(false)
      }
    }

    void process()
    return () => { cancelled = true }
    // Re-process when entity or rows identity changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entity, rows, projectId, crossProject])

  // Enrich rows with resolved labels + computed fields
  const data = useMemo(() => {
    if (rows.length === 0) return []
    return enrichRows(entity, rows, resolutionMap)
  }, [entity, rows, resolutionMap])

  // Generate table columns from field behaviors + options
  const columns = useMemo(() => {
    const generated = toTableColumns(fields, options, columnOverrides, entity)

    let result = generated
    if (extraColumns?.prepend) {
      result = [...extraColumns.prepend, ...result]
    }
    if (extraColumns?.append) {
      result = [...result, ...extraColumns.append]
    }

    return result
  }, [fields, options, columnOverrides, extraColumns, entity])

  // Field update helper
  function getFieldUpdate(
    row: Record<string, unknown>,
    fieldCode: string,
    value: unknown
  ) {
    return prepareFieldUpdate(entity, row, fieldCode, value, fields, resolutionMap)
  }

  // Cell update handler for EntityTable
  async function handleCellUpdate(
    row: Record<string, unknown>,
    column: TableColumn,
    value: unknown
  ) {
    const { serverPayload } = prepareFieldUpdate(
      entity,
      row,
      column.id,
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
  }

  return {
    data,
    columns,
    fields,
    options,
    resolutionMap,
    isProcessing,
    handleCellUpdate,
    getFieldUpdate,
  }
}
