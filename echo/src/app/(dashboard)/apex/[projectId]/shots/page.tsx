'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { EntityTable } from '@/components/table/entity-table'
import { CreateShotDialog } from '@/components/apex/create-shot-dialog'
import { EditShotDialog } from '@/components/apex/edit-shot-dialog'
import { DeleteConfirmDialog } from '@/components/apex/delete-confirm-dialog'
import { ApexPageShell } from '@/components/apex/apex-page-shell'
import { ApexEmptyState } from '@/components/apex/apex-empty-state'
import { deleteShot, updateShot } from '@/actions/shots'
import { listTagNames } from '@/lib/tags/options'
import { listStatusNames } from '@/lib/status/options'
import type { TableColumn } from '@/components/table/types'
import { Clapperboard, Plus } from 'lucide-react'

type ShotRow = Record<string, unknown> & {
  id: string | number
  sequence_id?: number | null
  status?: string | null
  tags?: unknown
  assets?: unknown
  open_notes?: unknown
  open_notes_count?: number | null
  tasks?: unknown
  thumbnail_url?: string | null
  thumbnail_blur_hash?: string | null
  sequence?: { id?: number | null; code?: string | null; name?: string | null } | null
}

type AssetOption = {
  code?: string | null
}

const STATUS_FALLBACK_VALUES = ['pending', 'ip', 'review', 'approved', 'on_hold']

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

export default function ShotsPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const [projectId, setProjectId] = useState('')
  const [shots, setShots] = useState<ShotRow[]>([])
  const [assetCodes, setAssetCodes] = useState<string[]>([])
  const [tagNames, setTagNames] = useState<string[]>([])
  const [statusNames, setStatusNames] = useState<string[]>([])
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
      void loadShotOptions(nextProjectId)
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
    for (const shot of shots) {
      for (const tag of parseListValue(shot.tags)) {
        values.add(tag)
      }
    }
    return Array.from(values).sort((a, b) => a.localeCompare(b))
  }, [shots, tagNames])

  const assetOptions = useMemo(() => {
    const values = new Set<string>()
    for (const code of assetCodes) {
      const normalized = code.trim()
      if (normalized) values.add(normalized)
    }
    for (const shot of shots) {
      for (const code of parseListValue(shot.assets)) {
        values.add(code)
      }
    }
    return Array.from(values).sort((a, b) => a.localeCompare(b))
  }, [assetCodes, shots])

  async function loadShots(projId: string) {
    try {
      setIsLoading(true)
      const supabase = createClient()

      const { data, error } = await supabase
        .from('shots')
        .select(`
          *,
          sequence:sequences!shots_sequence_id_fkey(id, code, name),
          project:projects!shots_project_id_fkey(id, code, name)
        `)
        .eq('project_id', projId)
        .order('code')

      if (error) throw error

      const normalized: ShotRow[] =
        (data || []).map((shot) => {
          const sequenceCode = asText(shot.sequence?.code).trim()
          const openNotes = parseListValue(shot.open_notes)
          const openNotesCount = parseNumber(shot.open_notes_count) ?? openNotes.length
          const tasks = parseListValue(shot.tasks)
          const taskCount = tasks.length

          return {
            ...shot,
            sequence_label: sequenceCode || asText(shot.sequence?.name).trim(),
            display_code: formatShotEntityCode(shot.code, sequenceCode),
            open_notes: `View (${openNotesCount})`,
            open_notes_count: openNotesCount,
            tasks: `View (${taskCount})`,
            project_label: shot.project ? shot.project.code || shot.project.name : '',
          }
        }) || []

      setShots(normalized)
    } catch (error) {
      console.error('Error loading shots:', error)
      setShots([])
    } finally {
      setIsLoading(false)
    }
  }

  async function loadShotOptions(projId: string) {
    try {
      const supabase = createClient()
      const [assetsResult, tagsResult, statusesResult] = await Promise.all([
        supabase
          .from('assets')
          .select('code')
          .eq('project_id', projId)
          .order('code'),
        listTagNames(),
        listStatusNames('shot'),
      ])

      if (assetsResult.error) throw assetsResult.error

      const nextAssetCodes = Array.from(
        new Set(
          ((assetsResult.data || []) as AssetOption[])
            .map((asset) => asText(asset.code).trim())
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b))

      setAssetCodes(nextAssetCodes)
      setTagNames(tagsResult)
      setStatusNames(statusesResult)
    } catch (error) {
      console.error('Error loading shot options:', error)
      setAssetCodes([])
      setTagNames([])
      setStatusNames([])
    }
  }

  function refreshProjectData() {
    if (!projectId) return
    void loadShots(projectId)
    void loadShotOptions(projectId)
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

  async function handleCellUpdate(row: ShotRow, column: TableColumn, value: unknown) {
    const payload: Record<string, unknown> = {}
    const localPatch: Record<string, unknown> = {}

    if (column.id === 'status') {
      const nextStatus = asText(value).trim()
      payload.status = nextStatus || null
      localPatch.status = nextStatus || null
    } else if (
      column.id === 'tags' ||
      column.id === 'assets' ||
      column.id === 'cc' ||
      column.id === 'plates' ||
      column.id === 'parent_shots' ||
      column.id === 'sub_shots' ||
      column.id === 'vendor_groups'
    ) {
      const nextValues = parseListValue(value)
      payload[column.id] = nextValues
      localPatch[column.id] = nextValues
    } else {
      payload[column.id] = value
      localPatch[column.id] = value
    }

    const result = await updateShot(String(row.id), payload, { revalidate: false })
    if (result.error) {
      throw new Error(result.error)
    }

    setShots((previous) =>
      previous.map((shot) =>
        String(shot.id) === String(row.id)
          ? { ...shot, ...localPatch }
          : shot
      )
    )
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
        id: 'sequence_label',
        label: 'Sequence',
        type: 'text',
        width: '120px',
      },
      {
        id: 'name',
        label: 'Shot Name',
        type: 'text',
        width: '160px',
        editable: true,
        editor: 'text',
      },
      {
        id: 'code',
        label: 'Shot Code',
        type: 'link',
        width: '140px',
        linkHref: (row) => `/apex/${projectId}/shots/${row.id}`,
        formatValue: (value, row) =>
          formatShotEntityCode(value, asText(row?.sequence?.code).trim() || asText(row?.sequence_label).trim()),
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
        linkHref: (row) => `/apex/${projectId}/shots/${row.id}/notes`,
      },
      { id: 'open_notes_count', label: 'Open Notes Count', type: 'number', width: '140px' },
      {
        id: 'tasks',
        label: 'Tasks',
        type: 'link',
        width: '110px',
        linkHref: (row) => `/apex/${projectId}/shots/${row.id}/tasks`,
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
      { id: 'description', label: 'Description', type: 'text', editable: true, editor: 'textarea' },
      { id: 'shot_type', label: 'Type', type: 'text', width: '120px', editable: true, editor: 'text' },
      { id: 'cut_in', label: 'Cut In', type: 'number', width: '90px', editable: true, editor: 'number' },
      { id: 'cut_out', label: 'Cut Out', type: 'number', width: '90px', editable: true, editor: 'number' },
      { id: 'project_label', label: 'Project', type: 'text', width: '120px' },
    ],
    [assetOptions, projectId, statusOptions, tagOptions]
  )

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-zinc-400">Loading shots...</p>
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
            className="flex items-center gap-2 rounded-md bg-amber-500 px-3 py-2 text-sm font-medium text-black transition hover:bg-amber-400"
          >
            <Plus className="h-4 w-4" />
            Add Shot
          </button>
        }
      >
        {shots.length === 0 ? (
          <ApexEmptyState
            icon={<Clapperboard className="h-12 w-12" />}
            title="No shots yet"
            description="Create your first shot to start tracking work."
            action={
              <button
                onClick={() => setShowCreateDialog(true)}
                className="rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-black transition hover:bg-amber-400"
              >
                Create First Shot
              </button>
            }
          />
        ) : (
          <EntityTable
            columns={columns}
            data={shots}
            entityType="shots"
            onAdd={() => setShowCreateDialog(true)}
            groupBy="sequence_label"
            onEdit={(row) => handleEdit(row as ShotRow)}
            onDelete={(row) => handleDelete(row as ShotRow)}
            onCellUpdate={(row, column, value) =>
              handleCellUpdate(row as ShotRow, column, value)
            }
          />
        )}
      </ApexPageShell>
    </>
  )
}
