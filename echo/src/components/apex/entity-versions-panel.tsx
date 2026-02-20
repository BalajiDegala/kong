'use client'

/**
 * Shared EntityVersionsPanel — replaces 3 nearly identical version sub-pages
 * for shots, assets, and tasks.
 *
 * Variants:
 *   - Shot:  entity_type='shot' + entity_id, includes task-linked versions
 *   - Asset: entity_type='asset' + entity_id
 *   - Task:  task_id filter, resolves task's entity for upload dialog
 */

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { EntityTable } from '@/components/table/entity-table'
import { UploadVersionDialog } from '@/components/apex/upload-version-dialog'
import { EditVersionDialog } from '@/components/apex/edit-version-dialog'
import { useEntityData } from '@/hooks/use-entity-data'
import { asText } from '@/lib/fields'
import type { TableColumn } from '@/components/table/types'

type VersionRow = Record<string, unknown> & { id: string | number }

export interface EntityVersionsPanelProps {
  projectId: string
  /** The parent entity type. Determines query strategy. */
  entityType: 'shot' | 'asset' | 'task'
  /** The parent entity ID (shotId, assetId, or taskId). */
  entityId: string
  /** EntityTable entityType prop for column persistence scoping. */
  tableEntityType?: string
  /** Empty state message. */
  emptyMessage?: string
}

export function EntityVersionsPanel({
  projectId,
  entityType,
  entityId,
  tableEntityType,
  emptyMessage,
}: EntityVersionsPanelProps) {
  const [rawVersions, setRawVersions] = useState<VersionRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [selectedVersion, setSelectedVersion] = useState<VersionRow | null>(null)

  // For task variants: resolved entity info for upload dialog
  const [taskEntityType, setTaskEntityType] = useState<'asset' | 'shot' | 'sequence' | null>(null)
  const [taskEntityId, setTaskEntityId] = useState<string | null>(null)

  useEffect(() => {
    void loadVersions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, entityType, entityId])

  async function loadVersions() {
    try {
      setIsLoading(true)
      const supabase = createClient()
      const idNum = Number(entityId)
      const idFilter = Number.isNaN(idNum) ? entityId : idNum

      if (entityType === 'task') {
        // Task variant: resolve task's parent entity for upload dialog
        const { data: taskData } = await supabase
          .from('tasks')
          .select('entity_type, entity_id')
          .eq('project_id', projectId)
          .eq('id', idFilter)
          .is('deleted_at', null)
          .maybeSingle()

        const et = taskData?.entity_type
        if (
          (et === 'asset' || et === 'shot' || et === 'sequence') &&
          taskData?.entity_id != null
        ) {
          setTaskEntityType(et)
          setTaskEntityId(String(taskData.entity_id))
        } else {
          setTaskEntityType(null)
          setTaskEntityId(null)
        }

        // Query versions by task_id
        const { data, error } = await supabase
          .from('versions')
          .select('*')
          .eq('project_id', projectId)
          .eq('task_id', idFilter)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })

        if (error) throw error
        setRawVersions((data || []) as VersionRow[])
      } else if (entityType === 'shot') {
        // Shot variant: direct entity versions + task-linked versions
        const [versionsResult, shotTasksResult] = await Promise.all([
          supabase
            .from('versions')
            .select('*')
            .eq('project_id', projectId)
            .eq('entity_type', 'shot')
            .eq('entity_id', idFilter)
            .is('deleted_at', null)
            .order('created_at', { ascending: false }),
          supabase
            .from('tasks')
            .select('id')
            .eq('project_id', projectId)
            .eq('entity_type', 'shot')
            .eq('entity_id', idFilter)
            .is('deleted_at', null),
        ])

        if (versionsResult.error) throw versionsResult.error

        let taskLinked: VersionRow[] = []
        const shotTaskIds = (shotTasksResult.data || [])
          .map((t) => Number(t.id))
          .filter((id) => Number.isFinite(id))

        if (shotTaskIds.length > 0) {
          const { data: taskData } = await supabase
            .from('versions')
            .select('*')
            .eq('project_id', projectId)
            .in('task_id', shotTaskIds)
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
          taskLinked = (taskData || []) as VersionRow[]
        }

        // Deduplicate
        const deduped = new Map<string, VersionRow>()
        for (const v of (versionsResult.data || []) as VersionRow[]) {
          deduped.set(String(v.id), v)
        }
        for (const v of taskLinked) {
          if (!deduped.has(String(v.id))) deduped.set(String(v.id), v)
        }

        const sorted = Array.from(deduped.values()).sort((a, b) => {
          const aTs = Date.parse(asText(a.created_at))
          const bTs = Date.parse(asText(b.created_at))
          return (Number.isFinite(bTs) ? bTs : 0) - (Number.isFinite(aTs) ? aTs : 0)
        })

        setRawVersions(sorted)
      } else {
        // Asset variant: simple entity_type + entity_id query
        const { data, error } = await supabase
          .from('versions')
          .select('*')
          .eq('project_id', projectId)
          .eq('entity_type', entityType)
          .eq('entity_id', idFilter)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })

        if (error) throw error
        setRawVersions((data || []) as VersionRow[])
      }
    } catch (error) {
      console.error(`Error loading ${entityType} versions:`, error)
      setRawVersions([])
    } finally {
      setIsLoading(false)
    }
  }

  const columnOverrides = useMemo<Record<string, Partial<TableColumn>>>(() => ({
    code: {
      label: 'Version Name',
      type: 'link',
      linkHref: (row: Record<string, unknown>) => `/apex/${projectId}/versions/${row.id}`,
    },
  }), [projectId])

  const { data, columns, handleCellUpdate } = useEntityData({
    entity: 'version',
    rows: rawVersions,
    projectId,
    columnOverrides,
  })

  function handleEdit(version: VersionRow) {
    setSelectedVersion(version)
    setShowEditDialog(true)
  }

  async function onCellUpdate(
    row: Record<string, unknown>,
    column: TableColumn,
    value: unknown
  ) {
    await handleCellUpdate(row, column, value)
    const rowId = String(row.id)
    setRawVersions((prev) =>
      prev.map((v) =>
        String(v.id) === rowId ? { ...v, [column.id]: value } : v
      )
    )
  }

  // Upload dialog props vary by entity type
  const uploadDialogProps = entityType === 'task'
    ? {
        defaultEntityType: taskEntityType ?? undefined,
        defaultEntityId: taskEntityId ?? undefined,
        defaultTaskId: entityId,
        lockEntity: Boolean(taskEntityType && taskEntityId),
      }
    : {
        defaultEntityType: entityType,
        defaultEntityId: entityId,
        lockEntity: true,
      }

  const effectiveTableEntityType = tableEntityType || `versions_${entityType}`
  const effectiveEmptyMessage = emptyMessage || `No versions linked to this ${entityType} yet.`

  return (
    <>
      <UploadVersionDialog
        open={showUploadDialog}
        onOpenChange={(open) => {
          setShowUploadDialog(open)
          if (!open) void loadVersions()
        }}
        projectId={projectId}
        {...uploadDialogProps}
      />

      <EditVersionDialog
        open={showEditDialog}
        onOpenChange={(open) => {
          setShowEditDialog(open)
          if (!open) void loadVersions()
        }}
        projectId={projectId}
        version={selectedVersion}
      />

      <div className="p-6">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
            Loading versions...
          </div>
        ) : data.length === 0 ? (
          <div className="rounded-md border border-border bg-background/70 p-6">
            <h3 className="text-sm font-semibold text-foreground">Versions</h3>
            <p className="mt-2 text-sm text-muted-foreground">{effectiveEmptyMessage}</p>
            <button
              onClick={() => setShowUploadDialog(true)}
              className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-black transition hover:bg-primary"
            >
              Upload Version
            </button>
          </div>
        ) : (
          <EntityTable
            columns={columns}
            data={data}
            entityType={effectiveTableEntityType}
            onAdd={() => setShowUploadDialog(true)}
            onEdit={(row) => handleEdit(row as VersionRow)}
            onCellUpdate={onCellUpdate}
          />
        )}
      </div>
    </>
  )
}
