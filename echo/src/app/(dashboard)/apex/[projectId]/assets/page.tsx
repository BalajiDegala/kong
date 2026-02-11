'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { EntityTable } from '@/components/table/entity-table'
import { CreateAssetDialog } from '@/components/apex/create-asset-dialog'
import { DeleteConfirmDialog } from '@/components/apex/delete-confirm-dialog'
import { ApexPageShell } from '@/components/apex/apex-page-shell'
import { ApexEmptyState } from '@/components/apex/apex-empty-state'
import { deleteAsset, updateAsset } from '@/actions/assets'
import { Package, Plus } from 'lucide-react'

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

export default function AssetsPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const [projectId, setProjectId] = useState<string>('')
  const [assets, setAssets] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState<any>(null)
  const listToString = (value: any) =>
    Array.isArray(value) ? value.join(', ') : ''
  const stringToList = (value: string) =>
    value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)

  useEffect(() => {
    params.then((p) => {
      setProjectId(p.projectId)
      loadAssets(p.projectId)
    })
  }, [params])

  async function loadAssets(projId: string) {
    try {
      setIsLoading(true)
      const supabase = createClient()

      const { data } = await supabase
        .from('assets')
        .select(`
          *,
          project:projects!assets_project_id_fkey(id, code, name),
          sequence:sequences!assets_sequence_id_fkey(id, code, name),
          shot:shots!assets_shot_id_fkey(id, code, name)
        `)
        .eq('project_id', projId)
        .order('created_at', { ascending: false })

      const normalized =
        data?.map((asset) => ({
          ...asset,
          project_label: asset.project
            ? asset.project.code || asset.project.name
            : '',
          sequence_label: asset.sequence
            ? `${asset.sequence.code} - ${asset.sequence.name}`
            : '',
          shot_label: asset.shot ? `${asset.shot.code} - ${asset.shot.name}` : '',
        })) || []

      setAssets(normalized)
    } catch (error) {
      console.error('Error loading assets:', error)
    } finally {
      setIsLoading(false)
    }
  }

  function handleDelete(asset: any) {
    setSelectedAsset(asset)
    setShowDeleteDialog(true)
  }

  async function handleDeleteConfirm() {
    if (!selectedAsset) return { error: 'No asset selected' }
    return await deleteAsset(selectedAsset.id, projectId)
  }

  async function handleCellUpdate(row: any, column: any, value: any) {
    const result = await updateAsset(row.id, { [column.id]: value }, { revalidate: false })
    if (result.error) {
      throw new Error(result.error)
    }
    setAssets((prev) =>
      prev.map((asset) =>
        asset.id === row.id ? { ...asset, [column.id]: value } : asset
      )
    )
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
          if (!open) loadAssets(projectId)
        }}
        projectId={projectId}
      />

      <DeleteConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Asset"
        description="Are you sure you want to delete this asset? This will also delete all associated tasks."
        itemName={selectedAsset?.name || ''}
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
            onAdd={() => setShowCreateDialog(true)}
            groupBy="asset_type"
            onDelete={handleDelete}
            onCellUpdate={handleCellUpdate}
          />
        )}
      </ApexPageShell>
    </>
  )
}
