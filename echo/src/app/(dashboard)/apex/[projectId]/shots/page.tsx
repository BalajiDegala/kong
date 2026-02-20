'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { EntityTable } from '@/components/table/entity-table'
import { CreateShotDialog } from '@/components/apex/create-shot-dialog'
import { EditShotDialog } from '@/components/apex/edit-shot-dialog'
import { DeleteConfirmDialog } from '@/components/apex/delete-confirm-dialog'
import { ApexPageShell } from '@/components/apex/apex-page-shell'
import { ApexEmptyState } from '@/components/apex/apex-empty-state'
import { createShot, deleteShot } from '@/actions/shots'
import { useEntityData } from '@/hooks/use-entity-data'
import { asText, parseTextArray } from '@/lib/fields'
import type { TableColumn } from '@/components/table/types'
import { Clapperboard, Plus } from 'lucide-react'

type ShotRow = Record<string, unknown> & { id: string | number }

function normalizeLookupKey(value: unknown): string {
  return asText(value).trim().replace(/\s+/g, '_').toUpperCase()
}

export default function ShotsPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const [projectId, setProjectId] = useState('')
  const [rawShots, setRawShots] = useState<ShotRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedShot, setSelectedShot] = useState<ShotRow | null>(null)

  useEffect(() => {
    params.then((resolved) => {
      const nextProjectId = resolved.projectId
      setProjectId(nextProjectId)
      void loadShots(nextProjectId)
    })
  }, [params])

  async function loadShots(projId: string) {
    try {
      setIsLoading(true)
      const supabase = createClient()
      const { data, error } = await supabase
        .from('shots')
        .select('*')
        .eq('project_id', projId)
        .is('deleted_at', null)
        .order('code')

      if (error) throw error
      setRawShots((data || []) as ShotRow[])
    } catch (error) {
      console.error('Error loading shots:', error)
      setRawShots([])
    } finally {
      setIsLoading(false)
    }
  }

  const columnOverrides = useMemo<Record<string, Partial<TableColumn>>>(() => ({
    code: {
      label: 'Shot Code',
    },
    name: {
      label: 'Shot Name',
      type: 'link',
      linkHref: (row: Record<string, unknown>) => `/apex/${projectId}/shots/${row.id}`,
    },
  }), [projectId])

  const { data, columns, handleCellUpdate } = useEntityData({
    entity: 'shot',
    rows: rawShots,
    projectId,
    columnOverrides,
  })

  function refreshProjectData() {
    if (!projectId) return
    void loadShots(projectId)
  }

  function handleEdit(shot: ShotRow) {
    setSelectedShot(shot)
    setShowEditDialog(true)
  }

  function handleDelete(shot: ShotRow) {
    setSelectedShot(shot)
    setShowDeleteDialog(true)
  }

  async function handleDeleteConfirm() {
    if (!selectedShot) return { error: 'No shot selected' }
    return deleteShot(String(selectedShot.id), projectId)
  }

  async function handleBulkDelete(rows: ShotRow[]) {
    const failures: string[] = []
    for (const row of rows) {
      const rowId = asText(row?.id).trim()
      if (!rowId) continue
      const result = await deleteShot(rowId, projectId)
      if (result?.error) {
        failures.push(`${asText(row?.name).trim() || rowId}: ${result.error}`)
      }
    }
    refreshProjectData()
    if (failures.length > 0) {
      const preview = failures.slice(0, 3).join('; ')
      throw new Error(
        failures.length > 3 ? `${preview}; and ${failures.length - 3} more` : preview
      )
    }
  }

  async function handleCsvImport(rows: Record<string, unknown>[]) {
    const failed: Array<{ row: number; message: string }> = []
    let imported = 0

    const supabase = createClient()
    const { data: sequenceRows, error: sequenceError } = await supabase
      .from('sequences')
      .select('id, code, name')
      .eq('project_id', projectId)
      .is('deleted_at', null)

    if (sequenceError) {
      throw new Error(`Failed to load sequences for CSV import: ${sequenceError.message}`)
    }

    type SequenceOption = { id: number; code?: string | null; name?: string | null }
    const sequenceLookup = new Map<string, string>()
    for (const sequence of (sequenceRows || []) as SequenceOption[]) {
      const id = asText(sequence.id).trim()
      if (!id) continue
      sequenceLookup.set(id, id)
      const byCode = normalizeLookupKey(sequence.code)
      if (byCode) sequenceLookup.set(byCode, id)
      const byName = normalizeLookupKey(sequence.name)
      if (byName) sequenceLookup.set(byName, id)
    }

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index]
      const name = asText(row.name).trim()
      const code = asText(row.code).trim() || name

      if (!name) {
        failed.push({ row: index + 2, message: 'Shot name is required.' })
        continue
      }

      const sequenceCandidates = [row.sequence_id, row.sequence, row.sequence_label, row.sequence_code]
      let sequenceId = ''
      for (const candidate of sequenceCandidates) {
        const raw = asText(candidate).trim()
        if (!raw) continue
        if (sequenceLookup.has(raw)) { sequenceId = sequenceLookup.get(raw) || ''; break }
        const normalized = normalizeLookupKey(raw)
        if (normalized && sequenceLookup.has(normalized)) { sequenceId = sequenceLookup.get(normalized) || ''; break }
      }

      if (!sequenceId) {
        failed.push({ row: index + 2, message: 'Sequence is required (map sequence_id or sequence code/name).' })
        continue
      }

      try {
        const result = await createShot({
          ...(row as Record<string, unknown>),
          project_id: projectId,
          sequence_id: sequenceId,
          name,
          code,
          status: asText(row.status).trim() || undefined,
          tags: parseTextArray(row.tags),
          assets: parseTextArray(row.assets),
          cc: parseTextArray(row.cc),
          plates: parseTextArray(row.plates),
          parent_shots: parseTextArray(row.parent_shots),
          sub_shots: parseTextArray(row.sub_shots),
          vendor_groups: parseTextArray(row.vendor_groups),
        })

        if (result?.error) throw new Error(result.error)
        imported += 1
      } catch (error) {
        failed.push({
          row: index + 2,
          message: error instanceof Error ? error.message : 'Failed to import shot row.',
        })
      }
    }

    refreshProjectData()
    return { imported, failed }
  }

  async function onCellUpdate(
    row: Record<string, unknown>,
    column: TableColumn,
    value: unknown
  ) {
    await handleCellUpdate(row, column, value)
    const rowId = String(row.id)
    setRawShots((prev) =>
      prev.map((s) =>
        String(s.id) === rowId ? { ...s, [column.id]: value } : s
      )
    )
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Loading shots...</p>
      </div>
    )
  }

  return (
    <>
      <CreateShotDialog
        open={showCreateDialog}
        onOpenChange={(open) => {
          setShowCreateDialog(open)
          if (!open) refreshProjectData()
        }}
        projectId={projectId}
      />

      <EditShotDialog
        open={showEditDialog}
        onOpenChange={(open) => {
          setShowEditDialog(open)
          if (!open) refreshProjectData()
        }}
        shot={selectedShot}
      />

      <DeleteConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Shot"
        description="Are you sure you want to delete this shot? This will also delete all associated tasks and versions."
        itemName={asText(selectedShot?.name)}
        onConfirm={handleDeleteConfirm}
      />

      <ApexPageShell
        title="Shots"
        action={
          <button
            onClick={() => setShowCreateDialog(true)}
            className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-black transition hover:bg-primary"
          >
            <Plus className="h-4 w-4" />
            Add Shot
          </button>
        }
      >
        {data.length === 0 ? (
          <ApexEmptyState
            icon={<Clapperboard className="h-12 w-12" />}
            title="No shots yet"
            description="Create your first shot to start tracking work."
            action={
              <button
                onClick={() => setShowCreateDialog(true)}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-black transition hover:bg-primary"
              >
                Create First Shot
              </button>
            }
          />
        ) : (
          <EntityTable
            columns={columns}
            data={data}
            entityType="shots"
            csvExportFilename="apex-shots"
            onCsvImport={handleCsvImport}
            onBulkDelete={(rows) => handleBulkDelete(rows as ShotRow[])}
            onAdd={() => setShowCreateDialog(true)}
            onEdit={(row) => handleEdit(row as ShotRow)}
            onDelete={(row) => handleDelete(row as ShotRow)}
            onCellUpdate={onCellUpdate}
          />
        )}
      </ApexPageShell>
    </>
  )
}
