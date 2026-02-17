'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { EntityTable } from '@/components/table/entity-table'
import { CreateAssetDialog } from '@/components/apex/create-asset-dialog'
import { EditAssetDialog } from '@/components/apex/edit-asset-dialog'
import { DeleteConfirmDialog } from '@/components/apex/delete-confirm-dialog'
import { ApexPageShell } from '@/components/apex/apex-page-shell'
import { ApexEmptyState } from '@/components/apex/apex-empty-state'
import { createAsset, deleteAsset, updateAsset } from '@/actions/assets'
import { listTagNames } from '@/lib/tags/options'
import { listStatusNames } from '@/lib/status/options'
import type { TableColumn } from '@/components/table/types'
import { Package, Plus } from 'lucide-react'

type AssetRow = Record<string, unknown> & {
  id: string | number
  sequence_id?: number | null
  shot_id?: number | null
  status?: string | null
  open_notes?: unknown
  open_notes_count?: number | null
  tags?: unknown
  tasks?: unknown
  shots?: unknown
  sequences?: unknown
  thumbnail_url?: string | null
  thumbnail_blur_hash?: string | null
}

type SequenceOption = { id: number; code: string; name: string }
type ShotOption = {
  id: number
  code: string
  name: string
  sequence_id?: number | null
  sequence?: { code?: string | null } | null
}

const ASSET_TYPES = [
  { value: 'character', label: 'Character' },
  { value: 'prop', label: 'Prop' },
  { value: 'environment', label: 'Environment' },
  { value: 'vehicle', label: 'Vehicle' },
  { value: 'fx', label: 'FX' },
  { value: 'matte_painting', label: 'Matte Painting' },
]

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

function formatSequenceEntityCode(sequence: { code?: unknown; name?: unknown } | null | undefined): string {
  if (!sequence) return ''
  const code = asText(sequence.code).trim()
  if (code) return code
  return asText(sequence.name).trim()
}

function formatShotEntityCode(shotCode: unknown, sequenceCode?: unknown): string {
  const shot = asText(shotCode).trim()
  const sequence = asText(sequenceCode).trim()
  if (!shot) return ''
  if (!sequence) return shot
  if (shot.toLowerCase().startsWith(sequence.toLowerCase())) return shot
  return `${sequence}${shot}`
}

export default function AssetsPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const [projectId, setProjectId] = useState('')
  const [assets, setAssets] = useState<AssetRow[]>([])
  const [sequences, setSequences] = useState<SequenceOption[]>([])
  const [shots, setShots] = useState<ShotOption[]>([])
  const [tagNames, setTagNames] = useState<string[]>([])
  const [statusNames, setStatusNames] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState<AssetRow | null>(null)

  useEffect(() => {
    params.then((resolved) => {
      const nextProjectId = resolved.projectId
      setProjectId(nextProjectId)
      void loadAssets(nextProjectId)
      void loadAssetOptions(nextProjectId)
    })
  }, [params])

  const statusOptions = useMemo(() => {
    const values = new Set<string>()
    for (const status of statusNames) {
      const normalized = asText(status).trim()
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
      const normalized = asText(tag).trim()
      if (normalized) values.add(normalized)
    }
    for (const asset of assets) {
      for (const tag of parseListValue(asset.tags)) {
        values.add(tag)
      }
    }
    return Array.from(values).sort((a, b) => a.localeCompare(b))
  }, [assets, tagNames])

  const sequenceCodeOptions = useMemo(() => {
    const values = new Set<string>()
    for (const sequence of sequences) {
      const normalized = asText(sequence.code).trim()
      if (normalized) values.add(normalized)
    }
    for (const asset of assets) {
      for (const code of parseListValue(asset.sequences)) {
        values.add(code)
      }
    }
    return Array.from(values).sort((a, b) => a.localeCompare(b))
  }, [assets, sequences])

  const shotCodeOptions = useMemo(() => {
    const values = new Set<string>()
    for (const shot of shots) {
      const normalized = formatShotEntityCode(shot.code, shot.sequence?.code)
      if (normalized) values.add(normalized)
    }
    for (const asset of assets) {
      for (const code of parseListValue(asset.shots)) {
        values.add(code)
      }
    }
    return Array.from(values).sort((a, b) => a.localeCompare(b))
  }, [assets, shots])

  const sequenceById = useMemo(
    () => new Map(sequences.map((sequence) => [sequence.id, sequence])),
    [sequences]
  )
  const shotById = useMemo(() => new Map(shots.map((shot) => [shot.id, shot])), [shots])

  async function loadAssets(projId: string) {
    try {
      setIsLoading(true)
      const supabase = createClient()

      const { data, error } = await supabase
        .from('assets')
        .select(`
          *,
          project:projects!assets_project_id_fkey(id, code, name),
          sequence:sequences!assets_sequence_id_fkey(id, code, name),
          shot:shots!assets_shot_id_fkey(id, code, name, sequence:sequences!shots_sequence_id_fkey(code))
        `)
        .eq('project_id', projId)
        .order('created_at', { ascending: false })

      if (error) throw error

      const normalized: AssetRow[] =
        (data || []).map((asset) => ({
          ...asset,
          ...(() => {
            const openNotes = parseListValue(asset.open_notes)
            const openNotesCount = parseNumber(asset.open_notes_count) ?? openNotes.length
            const tasks = parseListValue(asset.tasks)
            const taskCount = tasks.length
            return {
              open_notes: `View (${openNotesCount})`,
              open_notes_count: openNotesCount,
              tasks: `View (${taskCount})`,
            }
          })(),
          project_label: asset.project
            ? asset.project.code || asset.project.name
            : '',
          sequence_label: formatSequenceEntityCode(asset.sequence),
          shot_label: asset.shot
            ? formatShotEntityCode(
                asset.shot.code,
                asset.shot.sequence?.code || asset.sequence?.code
              )
            : '',
        })) || []

      setAssets(normalized)
    } catch (error) {
      console.error('Error loading assets:', error)
      setAssets([])
    } finally {
      setIsLoading(false)
    }
  }

  async function loadAssetOptions(projId: string) {
    try {
      const supabase = createClient()
      const [sequenceResult, shotResult, tagsResult, statusesResult] = await Promise.all([
        supabase
          .from('sequences')
          .select('id, code, name')
          .eq('project_id', projId)
          .order('code'),
        supabase
          .from('shots')
          .select('id, code, name, sequence_id, sequence:sequences!shots_sequence_id_fkey(code)')
          .eq('project_id', projId)
          .order('code'),
        listTagNames(),
        listStatusNames('asset'),
      ])

      if (sequenceResult.error) throw sequenceResult.error
      if (shotResult.error) throw shotResult.error

      setSequences((sequenceResult.data || []) as SequenceOption[])
      setShots((shotResult.data || []) as ShotOption[])
      setTagNames(tagsResult)
      setStatusNames(statusesResult)
    } catch (error) {
      console.error('Error loading asset options:', error)
      setSequences([])
      setShots([])
      setTagNames([])
      setStatusNames([])
    }
  }

  function refreshProjectData() {
    if (!projectId) return
    void loadAssets(projectId)
    void loadAssetOptions(projectId)
  }

  function handleEdit(asset: AssetRow) {
    setSelectedAsset(asset)
    setShowEditDialog(true)
  }

  function handleDelete(asset: AssetRow) {
    setSelectedAsset(asset)
    setShowDeleteDialog(true)
  }

  async function handleDeleteConfirm() {
    if (!selectedAsset) return { error: 'No asset selected' }
    return deleteAsset(String(selectedAsset.id), projectId)
  }

  async function handleCellUpdate(row: AssetRow, column: TableColumn, value: unknown) {
    const payload: Record<string, unknown> = {}
    const localPatch: Record<string, unknown> = {}

    if (column.id === 'status') {
      const nextStatus = asText(value).trim()
      payload.status = nextStatus || null
      localPatch.status = nextStatus || null
    } else if (column.id === 'tags' || column.id === 'shots' || column.id === 'sequences') {
      const nextValues = parseListValue(value)
      payload[column.id] = nextValues
      localPatch[column.id] = nextValues
    } else if (column.id === 'sequence_label') {
      const sequenceId =
        value === null || value === '' || value === 'none' ? null : Number(value)
      payload.sequence_id = Number.isNaN(sequenceId as number) ? null : sequenceId
      localPatch.sequence_id = payload.sequence_id
      const selectedSequence =
        payload.sequence_id === null
          ? null
          : sequenceById.get(Number(payload.sequence_id)) || null
      localPatch.sequence = selectedSequence
      localPatch.sequence_label = formatSequenceEntityCode(selectedSequence)
    } else if (column.id === 'shot_label') {
      const shotId = value === null || value === '' || value === 'none' ? null : Number(value)
      payload.shot_id = Number.isNaN(shotId as number) ? null : shotId
      localPatch.shot_id = payload.shot_id
      const selectedShot = payload.shot_id === null ? null : shotById.get(Number(payload.shot_id)) || null
      localPatch.shot = selectedShot
      localPatch.shot_label = selectedShot
        ? formatShotEntityCode(selectedShot.code, selectedShot.sequence?.code)
        : ''
    } else {
      payload[column.id] = value
      localPatch[column.id] = value
    }

    const result = await updateAsset(String(row.id), payload, { revalidate: false })
    if (result.error) {
      throw new Error(result.error)
    }

    setAssets((previous) =>
      previous.map((asset) =>
        String(asset.id) === String(row.id)
          ? { ...asset, ...localPatch }
          : asset
      )
    )
  }

  async function handleBulkDelete(rows: AssetRow[]) {
    const failures: string[] = []

    for (const row of rows) {
      const rowId = asText(row?.id).trim()
      if (!rowId) continue
      const result = await deleteAsset(rowId, projectId)
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
      const assetType = asText(row.asset_type).trim() || 'prop'

      if (!name) {
        failed.push({
          row: index + 2,
          message: 'Asset name is required.',
        })
        continue
      }

      try {
        const result = await createAsset({
          ...(row as Record<string, unknown>),
          project_id: projectId,
          name,
          code,
          asset_type: assetType,
          status: asText(row.status).trim() || undefined,
          tags: parseListValue(row.tags),
          shots: parseListValue(row.shots),
          sequences: parseListValue(row.sequences),
          sub_assets: parseListValue(row.sub_assets),
          parent_assets: parseListValue(row.parent_assets),
          vendor_groups: parseListValue(row.vendor_groups),
        })

        if (result?.error) {
          throw new Error(result.error)
        }
        imported += 1
      } catch (error) {
        failed.push({
          row: index + 2,
          message: error instanceof Error ? error.message : 'Failed to import asset row.',
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
        label: 'Asset Name',
        type: 'link',
        editable: true,
        editor: 'text',
        linkHref: (row) => `/apex/${projectId}/assets/${row.id}`,
      },
      {
        id: 'asset_type',
        label: 'Type',
        type: 'text',
        width: '120px',
        editable: true,
        editor: 'select',
        options: ASSET_TYPES,
      },
      { id: 'description', label: 'Description', type: 'text', editable: true, editor: 'textarea' },
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
        linkHref: (row) => `/apex/${projectId}/assets/${row.id}/notes`,
      },
      { id: 'open_notes_count', label: 'Open Notes Count', type: 'number', width: '140px' },
      {
        id: 'tasks',
        label: 'Tasks',
        type: 'link',
        width: '110px',
        linkHref: (row) => `/apex/${projectId}/assets/${row.id}/tasks`,
      },
      {
        id: 'shots',
        label: 'Shots',
        type: 'text',
        width: '150px',
        editable: true,
        editor: 'multiselect',
        options: shotCodeOptions.map((code) => ({ value: code, label: code })),
        formatValue: (value) => listToString(value),
        parseValue: (value) => parseListValue(value),
      },
      { id: 'id', label: 'Id', type: 'text', width: '80px' },
      { id: 'client_name', label: 'Client Name', type: 'text', width: '160px', editable: true, editor: 'text' },
      { id: 'dd_client_name', label: 'DD Client Name', type: 'text', width: '160px', editable: true, editor: 'text' },
      {
        id: 'vendor_groups',
        label: 'Vendor Groups',
        type: 'text',
        width: '160px',
        editable: true,
        editor: 'text',
        formatValue: (value) => listToString(value),
        parseValue: (value) => parseListValue(value),
      },
      { id: 'project_label', label: 'Project', type: 'text', width: '120px' },
      {
        id: 'sequence_label',
        label: 'Sequence',
        type: 'text',
        width: '180px',
        editable: true,
        editor: 'select',
        options: [
          { value: 'none', label: 'None' },
          ...sequences.map((sequence) => ({
            value: String(sequence.id),
            label: formatSequenceEntityCode(sequence),
          })),
        ],
        formatValue: (_value, row) =>
          row?.sequence_id ? String(row.sequence_id) : 'none',
        parseValue: (value) => {
          const next = asText(value)
          if (!next || next === 'none') return null
          const numeric = Number(next)
          return Number.isNaN(numeric) ? null : numeric
        },
      },
      {
        id: 'shot_label',
        label: 'Shot',
        type: 'text',
        width: '180px',
        editable: true,
        editor: 'select',
        options: [
          { value: 'none', label: 'None' },
          ...shots.map((shot) => ({
            value: String(shot.id),
            label: formatShotEntityCode(shot.code, shot.sequence?.code),
          })),
        ],
        formatValue: (_value, row) => (row?.shot_id ? String(row.shot_id) : 'none'),
        parseValue: (value) => {
          const next = asText(value)
          if (!next || next === 'none') return null
          const numeric = Number(next)
          return Number.isNaN(numeric) ? null : numeric
        },
      },
      {
        id: 'sub_assets',
        label: 'Sub Assets',
        type: 'text',
        width: '160px',
        editable: true,
        editor: 'text',
        formatValue: (value) => listToString(value),
        parseValue: (value) => parseListValue(value),
      },
      {
        id: 'tags',
        label: 'Tags',
        type: 'text',
        width: '180px',
        editable: true,
        editor: 'multiselect',
        options: tagOptions.map((tag) => ({ value: tag, label: tag })),
        formatValue: (value) => listToString(value),
        parseValue: (value) => parseListValue(value),
      },
      {
        id: 'task_template',
        label: 'Task Template',
        type: 'text',
        width: '160px',
        editable: true,
        editor: 'text',
      },
      { id: 'keep', label: 'Keep', type: 'text', width: '80px', editable: true, editor: 'checkbox' },
      { id: 'outsource', label: 'Outsource', type: 'text', width: '100px', editable: true, editor: 'checkbox' },
      {
        id: 'parent_assets',
        label: 'Parent Assets',
        type: 'text',
        width: '160px',
        editable: true,
        editor: 'text',
        formatValue: (value) => listToString(value),
        parseValue: (value) => parseListValue(value),
      },
      {
        id: 'sequences',
        label: 'Sequences',
        type: 'text',
        width: '160px',
        editable: true,
        editor: 'multiselect',
        options: sequenceCodeOptions.map((code) => ({ value: code, label: code })),
        formatValue: (value) => listToString(value),
        parseValue: (value) => parseListValue(value),
      },
    ],
    [projectId, sequences, shots, statusOptions, shotCodeOptions, sequenceCodeOptions, tagOptions]
  )

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-zinc-400">Loading assets...</p>
      </div>
    )
  }

  return (
    <>
      <CreateAssetDialog
        open={showCreateDialog}
        onOpenChange={(open) => {
          setShowCreateDialog(open)
          if (!open) refreshProjectData()
        }}
        projectId={projectId}
      />

      <EditAssetDialog
        open={showEditDialog}
        onOpenChange={(open) => {
          setShowEditDialog(open)
          if (!open) refreshProjectData()
        }}
        asset={selectedAsset}
      />

      <DeleteConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Asset"
        description="Are you sure you want to delete this asset? This will also delete all associated tasks."
        itemName={asText(selectedAsset?.name)}
        onConfirm={handleDeleteConfirm}
      />

      <ApexPageShell
        title="Assets"
        action={
          <button
            onClick={() => setShowCreateDialog(true)}
            className="flex items-center gap-2 rounded-md bg-amber-500 px-3 py-2 text-sm font-medium text-black transition hover:bg-amber-400"
          >
            <Plus className="h-4 w-4" />
            Add Asset
          </button>
        }
      >
        {assets.length === 0 ? (
          <ApexEmptyState
            icon={<Package className="h-12 w-12" />}
            title="No assets yet"
            description="Create your first asset to start tracking work."
            action={
              <button
                onClick={() => setShowCreateDialog(true)}
                className="rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-black transition hover:bg-amber-400"
              >
                Create First Asset
              </button>
            }
          />
        ) : (
          <EntityTable
            columns={columns}
            data={assets}
            entityType="assets"
            csvExportFilename="apex-assets"
            onCsvImport={handleCsvImport}
            onBulkDelete={(rows) => handleBulkDelete(rows as AssetRow[])}
            onAdd={() => setShowCreateDialog(true)}
            onEdit={(row) => handleEdit(row as AssetRow)}
            onDelete={(row) => handleDelete(row as AssetRow)}
            onCellUpdate={(row, column, value) => handleCellUpdate(row as AssetRow, column, value)}
          />
        )}
      </ApexPageShell>
    </>
  )
}
