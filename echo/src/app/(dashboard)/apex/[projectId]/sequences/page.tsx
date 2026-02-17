'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { EntityTable } from '@/components/table/entity-table'
import { CreateSequenceDialog } from '@/components/apex/create-sequence-dialog'
import { EditSequenceDialog } from '@/components/apex/edit-sequence-dialog'
import { DeleteConfirmDialog } from '@/components/apex/delete-confirm-dialog'
import { ApexPageShell } from '@/components/apex/apex-page-shell'
import { ApexEmptyState } from '@/components/apex/apex-empty-state'
import { createSequence, deleteSequence, updateSequence } from '@/actions/sequences'
import { listTagNames } from '@/lib/tags/options'
import { listStatusNames } from '@/lib/status/options'
import type { TableColumn } from '@/components/table/types'
import { Layers, Plus } from 'lucide-react'

type SequenceRow = Record<string, unknown> & {
  id: string | number
  status?: string | null
  tags?: unknown
  shots?: unknown
  assets?: unknown
  cc?: unknown
  plates?: unknown
  cuts?: unknown
  open_notes?: unknown
  open_notes_count?: number | null
  tasks?: unknown
  thumbnail_url?: string | null
  thumbnail_blur_hash?: string | null
}

type ShotOption = {
  code?: string | null
  sequence?: { code?: string | null } | null
}

type AssetOption = {
  code?: string | null
}

const STATUS_FALLBACK_VALUES = ['active', 'pending', 'ip', 'review', 'approved', 'on_hold']

function asText(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value)
}

function parseListValue(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => asText(item).trim())
      .filter(Boolean)
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }

  return []
}

function listToString(value: unknown): string {
  return parseListValue(value).join(', ')
}

function parseNumber(value: unknown): number | null {
  const numeric = Number(value)
  if (Number.isNaN(numeric)) return null
  return numeric
}

function formatShotEntityCode(shotCode: unknown, sequenceCode?: unknown): string {
  const shot = asText(shotCode).trim()
  const sequence = asText(sequenceCode).trim()
  if (!shot) return ''
  if (!sequence) return shot
  if (shot.toLowerCase().startsWith(sequence.toLowerCase())) return shot
  return `${sequence}${shot}`
}

export default function SequencesPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const [projectId, setProjectId] = useState('')
  const [sequences, setSequences] = useState<SequenceRow[]>([])
  const [statusNames, setStatusNames] = useState<string[]>([])
  const [tagNames, setTagNames] = useState<string[]>([])
  const [shotCodes, setShotCodes] = useState<string[]>([])
  const [assetCodes, setAssetCodes] = useState<string[]>([])
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
      void loadSequenceOptions(nextProjectId)
    })
  }, [params])

  const statusOptions = useMemo(() => {
    const values = new Set<string>()
    for (const status of statusNames) {
      const normalized = status.trim()
      if (normalized) values.add(normalized)
    }
    if (values.size === 0) {
      for (const fallback of STATUS_FALLBACK_VALUES) values.add(fallback)
    }
    return Array.from(values)
  }, [statusNames])

  const tagOptions = useMemo(() => {
    const values = new Set<string>()
    for (const tag of tagNames) {
      const normalized = tag.trim()
      if (normalized) values.add(normalized)
    }
    for (const sequence of sequences) {
      for (const tag of parseListValue(sequence.tags)) {
        values.add(tag)
      }
    }
    return Array.from(values).sort((a, b) => a.localeCompare(b))
  }, [sequences, tagNames])

  const shotOptions = useMemo(() => {
    const values = new Set<string>()
    for (const code of shotCodes) {
      const normalized = code.trim()
      if (normalized) values.add(normalized)
    }
    for (const sequence of sequences) {
      for (const code of parseListValue(sequence.shots)) {
        values.add(code)
      }
    }
    return Array.from(values).sort((a, b) => a.localeCompare(b))
  }, [sequences, shotCodes])

  const assetOptions = useMemo(() => {
    const values = new Set<string>()
    for (const code of assetCodes) {
      const normalized = code.trim()
      if (normalized) values.add(normalized)
    }
    for (const sequence of sequences) {
      for (const code of parseListValue(sequence.assets)) {
        values.add(code)
      }
    }
    return Array.from(values).sort((a, b) => a.localeCompare(b))
  }, [assetCodes, sequences])

  async function loadSequences(projId: string) {
    try {
      setIsLoading(true)
      const supabase = createClient()

      const { data, error } = await supabase
        .from('sequences')
        .select(`
          *,
          project:projects(id, code, name)
        `)
        .eq('project_id', projId)
        .order('code')

      if (error) throw error

      const normalized: SequenceRow[] =
        (data || []).map((sequence) => {
          const openNotes = parseListValue(sequence.open_notes)
          const openNotesCount = parseNumber(sequence.open_notes_count) ?? openNotes.length
          const tasks = parseListValue(sequence.tasks)
          const taskCount = tasks.length

          return {
            ...sequence,
            open_notes: `View (${openNotesCount})`,
            open_notes_count: openNotesCount,
            tasks: `View (${taskCount})`,
            project_label: sequence.project
              ? sequence.project.code || sequence.project.name
              : '',
          }
        }) || []

      setSequences(normalized)
    } catch (error) {
      console.error('Error loading sequences:', error)
      setSequences([])
    } finally {
      setIsLoading(false)
    }
  }

  async function loadSequenceOptions(projId: string) {
    try {
      const supabase = createClient()
      const [tagsResult, statusesResult, shotsResult, assetsResult] = await Promise.all([
        listTagNames(),
        listStatusNames('sequence'),
        supabase
          .from('shots')
          .select('code, sequence:sequences!shots_sequence_id_fkey(code)')
          .eq('project_id', projId)
          .order('code'),
        supabase
          .from('assets')
          .select('code')
          .eq('project_id', projId)
          .order('code'),
      ])

      if (shotsResult.error) throw shotsResult.error
      if (assetsResult.error) throw assetsResult.error

      const nextShotCodes = Array.from(
        new Set(
          ((shotsResult.data || []) as ShotOption[])
            .map((shot) => formatShotEntityCode(shot.code, shot.sequence?.code))
            .filter((code) => code.trim().length > 0)
        )
      ).sort((a, b) => a.localeCompare(b))

      const nextAssetCodes = Array.from(
        new Set(
          ((assetsResult.data || []) as AssetOption[])
            .map((asset) => asText(asset.code).trim())
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b))

      setTagNames(tagsResult)
      setStatusNames(statusesResult)
      setShotCodes(nextShotCodes)
      setAssetCodes(nextAssetCodes)
    } catch (error) {
      console.error('Error loading sequence options:', error)
      setTagNames([])
      setStatusNames([])
      setShotCodes([])
      setAssetCodes([])
    }
  }

  function refreshProjectData() {
    if (!projectId) return
    void loadSequences(projectId)
    void loadSequenceOptions(projectId)
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

  async function handleCellUpdate(row: SequenceRow, column: TableColumn, value: unknown) {
    const payload: Record<string, unknown> = {}
    const localPatch: Record<string, unknown> = {}

    if (column.id === 'status') {
      const nextStatus = asText(value).trim()
      payload.status = nextStatus || null
      localPatch.status = nextStatus || null
    } else if (
      column.id === 'tags' ||
      column.id === 'shots' ||
      column.id === 'assets' ||
      column.id === 'cc' ||
      column.id === 'plates' ||
      column.id === 'cuts'
    ) {
      const nextValues = parseListValue(value)
      payload[column.id] = nextValues
      localPatch[column.id] = nextValues
    } else {
      payload[column.id] = value
      localPatch[column.id] = value
    }

    const result = await updateSequence(String(row.id), payload, { revalidate: false })
    if (result.error) {
      throw new Error(result.error)
    }

    setSequences((previous) =>
      previous.map((sequence) =>
        String(sequence.id) === String(row.id)
          ? { ...sequence, ...localPatch }
          : sequence
      )
    )
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
        failed.push({
          row: index + 2,
          message: 'Sequence name is required.',
        })
        continue
      }

      try {
        const result = await createSequence({
          ...(row as Record<string, unknown>),
          project_id: projectId,
          name,
          code,
          status: asText(row.status).trim() || undefined,
          tags: parseListValue(row.tags),
          shots: parseListValue(row.shots),
          assets: parseListValue(row.assets),
          cc: parseListValue(row.cc),
          plates: parseListValue(row.plates),
          cuts: parseListValue(row.cuts),
        })

        if (result?.error) {
          throw new Error(result.error)
        }
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

  const columns = useMemo<TableColumn[]>(
    () => [
      { id: 'thumbnail_url', label: 'Thumbnail', type: 'thumbnail', width: '88px' },
      {
        id: 'thumbnail_blur_hash',
        label: 'Thumbnail Hash',
        type: 'text',
        width: '170px',
        editable: true,
        editor: 'text',
      },
      {
        id: 'name',
        label: 'Sequence Name',
        type: 'text',
        editable: true,
        editor: 'text',
        formatValue: (value, row) => asText(value).trim() || asText(row?.code).trim() || '',
      },
      {
        id: 'code',
        label: 'Sequence Code',
        type: 'link',
        width: '140px',
        linkHref: (row) => `/apex/${projectId}/sequences/${row.id}`,
      },
      {
        id: 'status',
        label: 'Status',
        type: 'status',
        width: '110px',
        editable: true,
        editor: 'select',
        options: statusOptions.map((status) => ({ value: status, label: status })),
      },
      {
        id: 'open_notes',
        label: 'Open Notes',
        type: 'link',
        width: '120px',
        linkHref: (row) => `/apex/${projectId}/sequences/${row.id}/notes`,
      },
      { id: 'open_notes_count', label: 'Open Notes Count', type: 'number', width: '140px' },
      {
        id: 'tasks',
        label: 'Tasks',
        type: 'link',
        width: '110px',
        linkHref: (row) => `/apex/${projectId}/sequences/${row.id}/tasks`,
      },
      { id: 'description', label: 'Description', type: 'text', editable: true, editor: 'textarea' },
      {
        id: 'shots',
        label: 'Shots',
        type: 'text',
        width: '170px',
        editable: true,
        editor: 'multiselect',
        options: shotOptions.map((code) => ({ value: code, label: code })),
        formatValue: (value) => listToString(value),
        parseValue: (value) => parseListValue(value),
      },
      {
        id: 'assets',
        label: 'Assets',
        type: 'text',
        width: '170px',
        editable: true,
        editor: 'multiselect',
        options: assetOptions.map((code) => ({ value: code, label: code })),
        formatValue: (value) => listToString(value),
        parseValue: (value) => parseListValue(value),
      },
      {
        id: 'tags',
        label: 'Tags',
        type: 'text',
        width: '170px',
        editable: true,
        editor: 'multiselect',
        options: tagOptions.map((tag) => ({ value: tag, label: tag })),
        formatValue: (value) => listToString(value),
        parseValue: (value) => parseListValue(value),
      },
      {
        id: 'cc',
        label: 'Cc',
        type: 'text',
        width: '120px',
        editable: true,
        editor: 'text',
        formatValue: (value) => listToString(value),
        parseValue: (value) => parseListValue(value),
      },
      { id: 'client_name', label: 'Client Name', type: 'text', width: '160px', editable: true, editor: 'text' },
      { id: 'id', label: 'Id', type: 'text', width: '80px' },
      {
        id: 'plates',
        label: 'Plates',
        type: 'text',
        width: '120px',
        editable: true,
        editor: 'text',
        formatValue: (value) => listToString(value),
        parseValue: (value) => parseListValue(value),
      },
      { id: 'project_label', label: 'Project', type: 'text', width: '120px' },
      { id: 'task_template', label: 'Task Template', type: 'text', width: '160px', editable: true, editor: 'text' },
      { id: 'sequence_type', label: 'Type', type: 'text', width: '120px', editable: true, editor: 'text' },
      { id: 'dd_client_name', label: 'DD Client Name', type: 'text', width: '160px', editable: true, editor: 'text' },
      {
        id: 'cuts',
        label: 'Cuts',
        type: 'text',
        width: '120px',
        editable: true,
        editor: 'text',
        formatValue: (value) => listToString(value),
        parseValue: (value) => parseListValue(value),
      },
    ],
    [assetOptions, projectId, shotOptions, statusOptions, tagOptions]
  )

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-zinc-400">Loading sequences...</p>
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
            className="flex items-center gap-2 rounded-md bg-amber-500 px-3 py-2 text-sm font-medium text-black transition hover:bg-amber-400"
          >
            <Plus className="h-4 w-4" />
            Add Sequence
          </button>
        }
      >
        {sequences.length === 0 ? (
          <ApexEmptyState
            icon={<Layers className="h-12 w-12" />}
            title="No sequences yet"
            description="Create your first sequence to organize shots and assets."
            action={
              <button
                onClick={() => setShowCreateDialog(true)}
                className="rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-black transition hover:bg-amber-400"
              >
                Create First Sequence
              </button>
            }
          />
        ) : (
          <EntityTable
            columns={columns}
            data={sequences}
            entityType="sequences"
            csvExportFilename="apex-sequences"
            onCsvImport={handleCsvImport}
            onBulkDelete={(rows) => handleBulkDelete(rows as SequenceRow[])}
            onAdd={() => setShowCreateDialog(true)}
            onEdit={(row) => handleEdit(row as SequenceRow)}
            onDelete={(row) => handleDelete(row as SequenceRow)}
            onCellUpdate={(row, column, value) =>
              handleCellUpdate(row as SequenceRow, column, value)
            }
          />
        )}
      </ApexPageShell>
    </>
  )
}
