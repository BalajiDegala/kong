'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { EntityTable } from '@/components/table/entity-table'
import { UploadVersionDialog } from '@/components/apex/upload-version-dialog'
import { EditVersionDialog } from '@/components/apex/edit-version-dialog'
import { ApexPageShell } from '@/components/apex/apex-page-shell'
import { ApexEmptyState } from '@/components/apex/apex-empty-state'
import { DeleteConfirmDialog } from '@/components/apex/delete-confirm-dialog'
import { createVersion, deleteVersion } from '@/actions/versions'
import { useEntityData } from '@/hooks/use-entity-data'
import { asText, parseTextArray } from '@/lib/fields'
import type { TableColumn } from '@/components/table/types'
import { Upload } from 'lucide-react'

type VersionRow = Record<string, unknown> & { id: string | number }

function normalizeVersionEntityType(
  value: unknown
): 'asset' | 'shot' | 'sequence' | null {
  const normalized = asText(value).trim().toLowerCase()
  if (normalized === 'asset' || normalized === 'shot' || normalized === 'sequence') {
    return normalized
  }
  return null
}

export default function VersionsPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const [projectId, setProjectId] = useState<string>('')
  const [rawVersions, setRawVersions] = useState<VersionRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedVersion, setSelectedVersion] = useState<VersionRow | null>(null)

  useEffect(() => {
    params.then((p) => {
      setProjectId(p.projectId)
      void loadVersions(p.projectId)
    })
  }, [params])

  async function loadVersions(projId: string) {
    try {
      setIsLoading(true)
      setLoadError(null)
      const supabase = createClient()
      const { data, error } = await supabase
        .from('versions')
        .select('*')
        .eq('project_id', projId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (error) throw error
      setRawVersions((data || []) as VersionRow[])
    } catch (error) {
      console.error('Error loading versions:', error)
      setLoadError(error instanceof Error ? error.message : 'Error loading versions')
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

  function handleDelete(version: VersionRow) {
    setSelectedVersion(version)
    setShowDeleteDialog(true)
  }

  function handleEdit(version: VersionRow) {
    setSelectedVersion(version)
    setShowEditDialog(true)
  }

  async function handleDeleteConfirm() {
    if (!selectedVersion) return { error: 'No version selected' }
    return await deleteVersion(String(selectedVersion.id), projectId)
  }

  async function handleBulkDelete(rows: VersionRow[]) {
    const failures: string[] = []
    for (const row of rows) {
      const rowId = asText(row?.id).trim()
      if (!rowId) continue
      const result = await deleteVersion(rowId, projectId)
      if (result?.error) {
        failures.push(`${asText(row?.code).trim() || rowId}: ${result.error}`)
      }
    }
    void loadVersions(projectId)
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
      const entityType = normalizeVersionEntityType(row.entity_type)
      const entityId = asText(row.entity_id).trim()
      const providedCode = asText(row.code).trim()
      const codeFromName = asText(row.name).trim()
      const code = providedCode || codeFromName || `VERSION_${Date.now()}_${index + 1}`
      const parsedVersionNumber = Number(asText(row.version_number).trim())
      const matchVersionNumber = code.match(/v(\d+)/i)
      const versionNumber = Number.isNaN(parsedVersionNumber)
        ? matchVersionNumber
          ? Number(matchVersionNumber[1])
          : 1
        : parsedVersionNumber

      if (!entityType || !entityId) {
        failed.push({ row: index + 2, message: 'entity_type (asset/shot/sequence) and entity_id are required.' })
        continue
      }

      try {
        const result = await createVersion({
          ...(row as Record<string, unknown>),
          project_id: projectId,
          entity_type: entityType,
          entity_id: entityId,
          task_id: asText(row.task_id).trim() || undefined,
          code,
          version_number: versionNumber,
          description: asText(row.description).trim() || undefined,
          file_path: asText(row.file_path).trim() || undefined,
          movie_url: asText(row.movie_url || row.link).trim() || undefined,
          status: asText(row.status).trim() || undefined,
          tags: parseTextArray(row.tags),
          cuts: parseTextArray(row.cuts),
          playlists: parseTextArray(row.playlists),
          published_files: parseTextArray(row.published_files),
        })

        if (result?.error) throw new Error(result.error)
        imported += 1
      } catch (error) {
        failed.push({
          row: index + 2,
          message: error instanceof Error ? error.message : 'Failed to import version row.',
        })
      }
    }

    void loadVersions(projectId)
    return { imported, failed }
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

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Loading versions...</p>
      </div>
    )
  }

  return (
    <>
      <UploadVersionDialog
        open={showUploadDialog}
        onOpenChange={(open) => {
          setShowUploadDialog(open)
          if (!open) void loadVersions(projectId)
        }}
        projectId={projectId}
      />

      <EditVersionDialog
        open={showEditDialog}
        onOpenChange={(open) => {
          setShowEditDialog(open)
          if (!open) void loadVersions(projectId)
        }}
        projectId={projectId}
        version={selectedVersion}
      />

      <DeleteConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Version"
        description="Are you sure you want to delete this version? This will remove any linked publishes."
        itemName={asText(selectedVersion?.code)}
        onConfirm={handleDeleteConfirm}
      />

      <ApexPageShell
        title="Versions"
        action={
          <button
            onClick={() => setShowUploadDialog(true)}
            className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-black transition hover:bg-primary"
          >
            <Upload className="h-4 w-4" />
            Upload Version
          </button>
        }
      >
        {loadError && (
          <div className="mb-4 rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
            Failed to load versions: {loadError}
          </div>
        )}

        {data.length === 0 ? (
          <ApexEmptyState
            icon={<Upload className="h-12 w-12" />}
            title="No versions yet"
            description="Upload your first version to start tracking deliverables."
            action={
              <button
                onClick={() => setShowUploadDialog(true)}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-black transition hover:bg-primary"
              >
                Upload First Version
              </button>
            }
          />
        ) : (
          <EntityTable
            columns={columns}
            data={data}
            entityType="versions"
            csvExportFilename="apex-versions"
            onCsvImport={handleCsvImport}
            onBulkDelete={(rows) => handleBulkDelete(rows as VersionRow[])}
            onAdd={() => setShowUploadDialog(true)}
            onEdit={(row) => handleEdit(row as VersionRow)}
            onDelete={(row) => handleDelete(row as VersionRow)}
            onCellUpdate={onCellUpdate}
          />
        )}
      </ApexPageShell>
    </>
  )
}
