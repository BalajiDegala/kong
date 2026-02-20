'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { EntityTable } from '@/components/table/entity-table'
import { CreateSequenceDialog } from '@/components/apex/create-sequence-dialog'
import { EditSequenceDialog } from '@/components/apex/edit-sequence-dialog'
import { DeleteConfirmDialog } from '@/components/apex/delete-confirm-dialog'
import { ApexPageShell } from '@/components/apex/apex-page-shell'
import { ApexEmptyState } from '@/components/apex/apex-empty-state'
import { createSequence, deleteSequence } from '@/actions/sequences'
import { useEntityData } from '@/hooks/use-entity-data'
import { asText, parseTextArray } from '@/lib/fields'
import type { TableColumn } from '@/components/table/types'
import { Layers, Plus } from 'lucide-react'

type SequenceRow = Record<string, unknown> & { id: string | number }

export default function SequencesPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const [projectId, setProjectId] = useState('')
  const [rawSequences, setRawSequences] = useState<SequenceRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedSequence, setSelectedSequence] = useState<SequenceRow | null>(null)

  useEffect(() => {
    params.then((resolved) => {
      const nextProjectId = resolved.projectId
      setProjectId(nextProjectId)
      void loadSequences(nextProjectId)
    })
  }, [params])

  async function loadSequences(projId: string) {
    try {
      setIsLoading(true)
      const supabase = createClient()
      const { data, error } = await supabase
        .from('sequences')
        .select('*')
        .eq('project_id', projId)
        .is('deleted_at', null)
        .order('code')

      if (error) throw error
      setRawSequences((data || []) as SequenceRow[])
    } catch (error) {
      console.error('Error loading sequences:', error)
      setRawSequences([])
    } finally {
      setIsLoading(false)
    }
  }

  // Column overrides for sequence-specific behavior
  // Note: sequence schema uses "name" as the primary column (no separate "code" in schema)
  const columnOverrides = useMemo<Record<string, Partial<TableColumn>>>(() => ({
    name: {
      label: 'Sequence Name',
      type: 'link',
      linkHref: (row: Record<string, unknown>) => `/apex/${projectId}/sequences/${row.id}`,
      formatValue: (value: unknown, row: Record<string, unknown>) =>
        asText(row?.code).trim() || asText(value).trim() || '',
    },
  }), [projectId])

  // Add "code" as a prepended extra column since it exists in the DB but not in the schema
  const extraColumns = useMemo<{ prepend?: TableColumn[] }>(() => ({
    prepend: [
      {
        id: 'code',
        label: 'Sequence Code',
        type: 'text' as const,
        width: '140px',
        editable: true,
        editor: 'text' as const,
      },
    ],
  }), [projectId])

  const { data, columns, handleCellUpdate } = useEntityData({
    entity: 'sequence',
    rows: rawSequences,
    projectId,
    columnOverrides,
    extraColumns,
  })

  function refreshProjectData() {
    if (!projectId) return
    void loadSequences(projectId)
  }

  function handleEdit(sequence: SequenceRow) {
    setSelectedSequence(sequence)
    setShowEditDialog(true)
  }

  function handleDelete(sequence: SequenceRow) {
    setSelectedSequence(sequence)
    setShowDeleteDialog(true)
  }

  async function handleDeleteConfirm() {
    if (!selectedSequence) return { error: 'No sequence selected' }
    return deleteSequence(String(selectedSequence.id), projectId)
  }

  async function handleBulkDelete(rows: SequenceRow[]) {
    const failures: string[] = []
    for (const row of rows) {
      const rowId = asText(row?.id).trim()
      if (!rowId) continue
      const result = await deleteSequence(rowId, projectId)
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

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index]
      const name = asText(row.name).trim()
      const code = asText(row.code).trim() || name

      if (!name) {
        failed.push({ row: index + 2, message: 'Sequence name is required.' })
        continue
      }

      try {
        const result = await createSequence({
          ...(row as Record<string, unknown>),
          project_id: projectId,
          name,
          code,
          status: asText(row.status).trim() || undefined,
          tags: parseTextArray(row.tags),
          shots: parseTextArray(row.shots),
          assets: parseTextArray(row.assets),
          cc: parseTextArray(row.cc),
          plates: parseTextArray(row.plates),
          cuts: parseTextArray(row.cuts),
        })

        if (result?.error) throw new Error(result.error)
        imported += 1
      } catch (error) {
        failed.push({
          row: index + 2,
          message: error instanceof Error ? error.message : 'Failed to import sequence row.',
        })
      }
    }

    refreshProjectData()
    return { imported, failed }
  }

  // Wrap handleCellUpdate to also update local state optimistically
  async function onCellUpdate(
    row: Record<string, unknown>,
    column: TableColumn,
    value: unknown
  ) {
    await handleCellUpdate(row, column, value)
    // Optimistic local update via re-fetch
    // The hook's data is derived from rawSequences + enrichment,
    // so we update the source row
    const rowId = String(row.id)
    setRawSequences((prev) =>
      prev.map((seq) =>
        String(seq.id) === rowId ? { ...seq, [column.id]: value } : seq
      )
    )
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Loading sequences...</p>
      </div>
    )
  }

  return (
    <>
      <CreateSequenceDialog
        open={showCreateDialog}
        onOpenChange={(open) => {
          setShowCreateDialog(open)
          if (!open) refreshProjectData()
        }}
        projectId={projectId}
      />

      <EditSequenceDialog
        open={showEditDialog}
        onOpenChange={(open) => {
          setShowEditDialog(open)
          if (!open) refreshProjectData()
        }}
        sequence={selectedSequence}
      />

      <DeleteConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Sequence"
        description="Are you sure you want to delete this sequence? This will also delete all associated shots and tasks."
        itemName={asText(selectedSequence?.name)}
        onConfirm={handleDeleteConfirm}
      />

      <ApexPageShell
        title="Sequences"
        action={
          <button
            onClick={() => setShowCreateDialog(true)}
            className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-black transition hover:bg-primary"
          >
            <Plus className="h-4 w-4" />
            Add Sequence
          </button>
        }
      >
        {data.length === 0 ? (
          <ApexEmptyState
            icon={<Layers className="h-12 w-12" />}
            title="No sequences yet"
            description="Create your first sequence to organize shots and assets."
            action={
              <button
                onClick={() => setShowCreateDialog(true)}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-black transition hover:bg-primary"
              >
                Create First Sequence
              </button>
            }
          />
        ) : (
          <EntityTable
            columns={columns}
            data={data}
            entityType="sequences"
            csvExportFilename="apex-sequences"
            onCsvImport={handleCsvImport}
            onBulkDelete={(rows) => handleBulkDelete(rows as SequenceRow[])}
            onAdd={() => setShowCreateDialog(true)}
            onEdit={(row) => handleEdit(row as SequenceRow)}
            onDelete={(row) => handleDelete(row as SequenceRow)}
            onCellUpdate={onCellUpdate}
          />
        )}
      </ApexPageShell>
    </>
  )
}
