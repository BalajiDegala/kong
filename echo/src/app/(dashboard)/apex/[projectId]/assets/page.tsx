'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { EntityTable } from '@/components/table/entity-table'
import { CreateAssetDialog } from '@/components/apex/create-asset-dialog'
import { EditAssetDialog } from '@/components/apex/edit-asset-dialog'
import { DeleteConfirmDialog } from '@/components/apex/delete-confirm-dialog'
import { ApexPageShell } from '@/components/apex/apex-page-shell'
import { ApexEmptyState } from '@/components/apex/apex-empty-state'
import { createAsset, deleteAsset } from '@/actions/assets'
import { useEntityData } from '@/hooks/use-entity-data'
import { asText, parseTextArray } from '@/lib/fields'
import type { TableColumn } from '@/components/table/types'
import { Package, Plus } from 'lucide-react'

type AssetRow = Record<string, unknown> & { id: string | number }

const ASSET_TYPES = [
  { value: 'character', label: 'Character' },
  { value: 'prop', label: 'Prop' },
  { value: 'environment', label: 'Environment' },
  { value: 'vehicle', label: 'Vehicle' },
  { value: 'fx', label: 'FX' },
  { value: 'matte_painting', label: 'Matte Painting' },
]

export default function AssetsPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const [projectId, setProjectId] = useState('')
  const [rawAssets, setRawAssets] = useState<AssetRow[]>([])
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
    })
  }, [params])

  async function loadAssets(projId: string) {
    try {
      setIsLoading(true)
      const supabase = createClient()
      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .eq('project_id', projId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (error) throw error
      setRawAssets((data || []) as AssetRow[])
    } catch (error) {
      console.error('Error loading assets:', error)
      setRawAssets([])
    } finally {
      setIsLoading(false)
    }
  }

  const columnOverrides = useMemo<Record<string, Partial<TableColumn>>>(() => ({
    name: {
      label: 'Asset Name',
      type: 'link',
      linkHref: (row: Record<string, unknown>) => `/apex/${projectId}/assets/${row.id}`,
    },
    asset_type: {
      label: 'Type',
      editable: true,
      editor: 'select',
      options: ASSET_TYPES,
    },
  }), [projectId])

  const { data, columns, handleCellUpdate } = useEntityData({
    entity: 'asset',
    rows: rawAssets,
    projectId,
    columnOverrides,
  })

  function refreshProjectData() {
    if (!projectId) return
    void loadAssets(projectId)
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
        failed.push({ row: index + 2, message: 'Asset name is required.' })
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
          tags: parseTextArray(row.tags),
          shots: parseTextArray(row.shots),
          sequences: parseTextArray(row.sequences),
          sub_assets: parseTextArray(row.sub_assets),
          parent_assets: parseTextArray(row.parent_assets),
          vendor_groups: parseTextArray(row.vendor_groups),
        })

        if (result?.error) throw new Error(result.error)
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

  async function onCellUpdate(
    row: Record<string, unknown>,
    column: TableColumn,
    value: unknown
  ) {
    await handleCellUpdate(row, column, value)
    const rowId = String(row.id)
    setRawAssets((prev) =>
      prev.map((a) =>
        String(a.id) === rowId ? { ...a, [column.id]: value } : a
      )
    )
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Loading assets...</p>
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
            className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-black transition hover:bg-primary"
          >
            <Plus className="h-4 w-4" />
            Add Asset
          </button>
        }
      >
        {data.length === 0 ? (
          <ApexEmptyState
            icon={<Package className="h-12 w-12" />}
            title="No assets yet"
            description="Create your first asset to start tracking work."
            action={
              <button
                onClick={() => setShowCreateDialog(true)}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-black transition hover:bg-primary"
              >
                Create First Asset
              </button>
            }
          />
        ) : (
          <EntityTable
            columns={columns}
            data={data}
            entityType="assets"
            csvExportFilename="apex-assets"
            onCsvImport={handleCsvImport}
            onBulkDelete={(rows) => handleBulkDelete(rows as AssetRow[])}
            onAdd={() => setShowCreateDialog(true)}
            onEdit={(row) => handleEdit(row as AssetRow)}
            onDelete={(row) => handleDelete(row as AssetRow)}
            onCellUpdate={onCellUpdate}
          />
        )}
      </ApexPageShell>
    </>
  )
}
