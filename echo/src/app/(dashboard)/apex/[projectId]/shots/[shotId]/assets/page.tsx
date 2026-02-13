'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { EntityTable } from '@/components/table/entity-table'
import { deleteAsset, updateAsset } from '@/actions/assets'
import { CreateAssetDialog } from '@/components/apex/create-asset-dialog'
import { EditAssetDialog } from '@/components/apex/edit-asset-dialog'
import { DeleteConfirmDialog } from '@/components/apex/delete-confirm-dialog'

const ASSET_TYPES = [
  { value: 'character', label: 'Character' },
  { value: 'prop', label: 'Prop' },
  { value: 'environment', label: 'Environment' },
  { value: 'vehicle', label: 'Vehicle' },
  { value: 'fx', label: 'FX' },
  { value: 'matte_painting', label: 'Matte Painting' },
]

const ASSET_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'ip', label: 'In Progress' },
  { value: 'review', label: 'Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'on_hold', label: 'On Hold' },
]

export default function ShotAssetsPage({
  params,
}: {
  params: Promise<{ projectId: string; shotId: string }>
}) {
  const [projectId, setProjectId] = useState('')
  const [shotId, setShotId] = useState('')
  const [assets, setAssets] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState<any>(null)
  const listToString = (value: any) => (Array.isArray(value) ? value.join(', ') : '')
  const stringToList = (value: string) =>
    value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)

  useEffect(() => {
    params.then((p) => {
      setProjectId(p.projectId)
      setShotId(p.shotId)
      loadAssets(p.projectId, p.shotId)
    })
  }, [params])

  async function loadAssets(projId: string, sId: string) {
    try {
      setIsLoading(true)
      const supabase = createClient()
      const shotIdNum = Number(sId)
      const shotIdFilter = Number.isNaN(shotIdNum) ? sId : shotIdNum

      const { data: shotRow } = await supabase
        .from('shots')
        .select('id, code')
        .eq('id', shotIdFilter)
        .maybeSingle()

      let query = supabase
        .from('assets')
        .select(
          `
          *,
          project:projects!assets_project_id_fkey(id, code, name),
          sequence:sequences!assets_sequence_id_fkey(id, code, name),
          shot:shots!assets_shot_id_fkey(id, code, name)
        `
        )
        .eq('project_id', projId)

      if (shotRow?.code) {
        query = query.or(`shot_id.eq.${shotIdFilter},shots.cs.{${shotRow.code}}`)
      } else {
        query = query.eq('shot_id', shotIdFilter)
      }

      const { data } = await query.order('created_at', { ascending: false })

      const normalized =
        data?.map((asset) => ({
          ...asset,
          project_label: asset.project ? asset.project.code || asset.project.name : '',
          sequence_label: asset.sequence
            ? `${asset.sequence.code} - ${asset.sequence.name}`
            : '',
          shot_label: asset.shot ? `${asset.shot.code} - ${asset.shot.name}` : '',
        })) || []

      setAssets(normalized)
    } catch (error) {
      console.error('Error loading shot assets:', error)
      setAssets([])
    } finally {
      setIsLoading(false)
    }
  }

  async function handleCellUpdate(row: any, column: any, value: any) {
    const result = await updateAsset(row.id, { [column.id]: value }, { revalidate: false })
    if (result.error) {
      throw new Error(result.error)
    }
    setAssets((prev) =>
      prev.map((asset) => (asset.id === row.id ? { ...asset, [column.id]: value } : asset))
    )
  }

  function refreshAssets() {
    if (!projectId || !shotId) return
    void loadAssets(projectId, shotId)
  }

  function handleEdit(asset: any) {
    setSelectedAsset(asset)
    setShowEditDialog(true)
  }

  function handleDelete(asset: any) {
    setSelectedAsset(asset)
    setShowDeleteDialog(true)
  }

  async function handleDeleteConfirm() {
    if (!selectedAsset) return { error: 'No asset selected' }
    return deleteAsset(String(selectedAsset.id), projectId)
  }

  const columns = [
    { id: 'thumbnail_url', label: 'Thumbnail', type: 'thumbnail' as const, width: '80px' },
    {
      id: 'name',
      label: 'Asset Name',
      type: 'link' as const,
      editable: true,
      editor: 'text' as const,
      linkHref: (row: any) => `/apex/${projectId}/assets/${row.id}`,
    },
    {
      id: 'asset_type',
      label: 'Type',
      type: 'text' as const,
      width: '120px',
      editable: true,
      editor: 'select' as const,
      options: ASSET_TYPES,
    },
    { id: 'description', label: 'Description', type: 'text' as const, editable: true, editor: 'textarea' as const },
    {
      id: 'status',
      label: 'Status',
      type: 'status' as const,
      width: '80px',
      editable: true,
      editor: 'select' as const,
      options: ASSET_STATUSES,
    },
    {
      id: 'shots',
      label: 'Shots',
      type: 'text' as const,
      width: '140px',
      editable: true,
      editor: 'text' as const,
      formatValue: listToString,
      parseValue: stringToList,
    },
    { id: 'id', label: 'Id', type: 'text' as const, width: '80px' },
    { id: 'client_name', label: 'Client Name', type: 'text' as const, width: '160px', editable: true, editor: 'text' as const },
    { id: 'dd_client_name', label: 'DD Client Name', type: 'text' as const, width: '160px', editable: true, editor: 'text' as const },
    {
      id: 'vendor_groups',
      label: 'Vendor Groups',
      type: 'text' as const,
      width: '160px',
      editable: true,
      editor: 'text' as const,
      formatValue: listToString,
      parseValue: stringToList,
    },
    { id: 'project_label', label: 'Project', type: 'text' as const, width: '120px' },
    { id: 'sequence_label', label: 'Sequence', type: 'text' as const, width: '160px' },
    { id: 'shot_label', label: 'Shot', type: 'text' as const, width: '160px' },
    {
      id: 'sub_assets',
      label: 'Sub Assets',
      type: 'text' as const,
      width: '160px',
      editable: true,
      editor: 'text' as const,
      formatValue: listToString,
      parseValue: stringToList,
    },
    {
      id: 'tags',
      label: 'Tags',
      type: 'text' as const,
      width: '160px',
      editable: true,
      editor: 'text' as const,
      formatValue: listToString,
      parseValue: stringToList,
    },
    {
      id: 'task_template',
      label: 'Task Template',
      type: 'text' as const,
      width: '160px',
      editable: true,
      editor: 'text' as const,
    },
    { id: 'keep', label: 'Keep', type: 'text' as const, width: '80px', editable: true, editor: 'checkbox' as const },
    { id: 'outsource', label: 'Outsource', type: 'text' as const, width: '100px', editable: true, editor: 'checkbox' as const },
    {
      id: 'parent_assets',
      label: 'Parent Assets',
      type: 'text' as const,
      width: '160px',
      editable: true,
      editor: 'text' as const,
      formatValue: listToString,
      parseValue: stringToList,
    },
    {
      id: 'sequences',
      label: 'Sequences',
      type: 'text' as const,
      width: '160px',
      editable: true,
      editor: 'text' as const,
      formatValue: listToString,
      parseValue: stringToList,
    },
  ]

  return (
    <>
      <CreateAssetDialog
        open={showCreateDialog}
        onOpenChange={(open) => {
          setShowCreateDialog(open)
          if (!open) refreshAssets()
        }}
        projectId={projectId}
        defaultShotId={shotId}
        lockShot
      />

      <EditAssetDialog
        open={showEditDialog}
        onOpenChange={(open) => {
          setShowEditDialog(open)
          if (!open) refreshAssets()
        }}
        asset={selectedAsset}
      />

      <DeleteConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Asset"
        description="Are you sure you want to delete this asset? This will also delete all associated tasks."
        itemName={selectedAsset?.name || ''}
        onConfirm={handleDeleteConfirm}
      />

      <div className="p-6">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center text-sm text-zinc-400">
            Loading assets...
          </div>
        ) : assets.length === 0 ? (
          <div className="rounded-md border border-zinc-800 bg-zinc-950/70 p-6">
            <h3 className="text-sm font-semibold text-zinc-100">Assets</h3>
            <p className="mt-2 text-sm text-zinc-400">No assets linked to this shot yet.</p>
            <button
              onClick={() => setShowCreateDialog(true)}
              className="mt-4 rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-black transition hover:bg-amber-400"
            >
              Add Asset
            </button>
          </div>
        ) : (
          <EntityTable
            columns={columns}
            data={assets}
            entityType="assets_shot"
            onAdd={() => setShowCreateDialog(true)}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onCellUpdate={handleCellUpdate}
          />
        )}
      </div>
    </>
  )
}
