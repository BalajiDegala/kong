'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { listStatusNames } from '@/lib/status/options'
import { listTagNames } from '@/lib/tags/options'
import { EntityTable } from '@/components/table/entity-table'
import { UploadVersionDialog } from '@/components/apex/upload-version-dialog'
import { EditVersionDialog } from '@/components/apex/edit-version-dialog'
import { ApexPageShell } from '@/components/apex/apex-page-shell'
import { ApexEmptyState } from '@/components/apex/apex-empty-state'
import { DeleteConfirmDialog } from '@/components/apex/delete-confirm-dialog'
import { createVersion, deleteVersion, updateVersion } from '@/actions/versions'
import { Upload } from 'lucide-react'

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

function uniqueSorted(values: string[]): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b))
}

function listToString(value: unknown): string {
  return parseListValue(value).join(', ')
}

function stringToList(value: string): string[] {
  return parseListValue(value)
}

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
  const [versions, setVersions] = useState<any[]>([])
  const [statusNames, setStatusNames] = useState<string[]>([])
  const [tagNames, setTagNames] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedVersion, setSelectedVersion] = useState<any>(null)

  useEffect(() => {
    params.then((p) => {
      setProjectId(p.projectId)
      loadVersions(p.projectId)
    })
  }, [params])

  async function loadVersions(projId: string) {
    try {
      setIsLoading(true)
      setLoadError(null)
      const supabase = createClient()

      const [versionsResult, nextStatusNames, nextTagNames] = await Promise.all([
        supabase
          .from('versions')
          .select(`
            *,
            task:tasks(id, name),
            artist:profiles!versions_created_by_fkey(id, display_name, full_name),
            project:projects(id, code, name)
          `)
          .eq('project_id', projId)
          .order('created_at', { ascending: false }),
        listStatusNames('version'),
        listTagNames(),
      ])

      const { data: versionsData, error } = versionsResult

      if (error) {
        console.error('Error loading versions:', error)
        setLoadError(error.message)
        setVersions([])
        return
      }

      setStatusNames(uniqueSorted(nextStatusNames))
      setTagNames(uniqueSorted(nextTagNames))

      const normalized =
        versionsData?.map((version) => ({
          ...version,
          task_label: version.task?.name || '',
          artist_label: version.artist?.display_name || version.artist?.full_name || '',
          project_label: version.project ? version.project.code || version.project.name : '',
        })) || []

      setVersions(normalized)
    } catch (error) {
      console.error('Error loading versions:', error)
      setLoadError(error instanceof Error ? error.message : 'Error loading versions')
      setVersions([])
      setStatusNames([])
      setTagNames([])
    } finally {
      setIsLoading(false)
    }
  }

  function handleDelete(version: any) {
    setSelectedVersion(version)
    setShowDeleteDialog(true)
  }

  function handleEdit(version: any) {
    setSelectedVersion(version)
    setShowEditDialog(true)
  }

  async function handleDeleteConfirm() {
    if (!selectedVersion) return { error: 'No version selected' }
    return await deleteVersion(selectedVersion.id, projectId)
  }

  async function handleBulkDelete(rows: any[]) {
    const failures: string[] = []

    for (const row of rows) {
      const rowId = asText(row?.id).trim()
      if (!rowId) continue
      const result = await deleteVersion(rowId, projectId)
      if (result?.error) {
        failures.push(`${asText(row?.code).trim() || rowId}: ${result.error}`)
      }
    }

    loadVersions(projectId)

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
        failed.push({
          row: index + 2,
          message: 'entity_type (asset/shot/sequence) and entity_id are required.',
        })
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
          tags: parseListValue(row.tags),
          cuts: parseListValue(row.cuts),
          playlists: parseListValue(row.playlists),
          published_files: parseListValue(row.published_files),
        })

        if (result?.error) {
          throw new Error(result.error)
        }
        imported += 1
      } catch (error) {
        failed.push({
          row: index + 2,
          message: error instanceof Error ? error.message : 'Failed to import version row.',
        })
      }
    }

    loadVersions(projectId)
    return { imported, failed }
  }

  const statusOptions = useMemo(() => {
    const values = new Set<string>()
    for (const status of statusNames) {
      const normalized = status.trim()
      if (normalized) values.add(normalized)
    }
    for (const version of versions) {
      const normalized = asText(version.status).trim()
      if (normalized) values.add(normalized)
    }
    return Array.from(values).map((value) => ({ value, label: value }))
  }, [statusNames, versions])

  const tagOptions = useMemo(() => {
    const values = new Set<string>()
    for (const tag of tagNames) {
      const normalized = tag.trim()
      if (normalized) values.add(normalized)
    }
    for (const version of versions) {
      for (const tag of parseListValue(version.tags)) {
        values.add(tag)
      }
    }
    return Array.from(values)
      .sort((a, b) => a.localeCompare(b))
      .map((value) => ({ value, label: value }))
  }, [tagNames, versions])

  const columns = useMemo(
    () => [
      { id: 'thumbnail_url', label: 'Thumbnail', type: 'thumbnail' as const, width: '80px' },
      {
        id: 'code',
        label: 'Version Name',
        type: 'link' as const,
        linkHref: (row: any) => `/apex/${projectId}/versions/${row.id}`,
      },
      { id: 'link', label: 'Link', type: 'text' as const, width: '140px', editable: true, editor: 'text' as const },
      { id: 'task_label', label: 'Task', type: 'text' as const, width: '140px' },
      {
        id: 'status',
        label: 'Status',
        type: 'status' as const,
        width: '90px',
        editable: true,
        editor: 'select' as const,
        options: statusOptions,
      },
      { id: 'artist_label', label: 'Artist', type: 'text' as const, width: '140px' },
      { id: 'description', label: 'Description', type: 'text' as const, editable: true, editor: 'textarea' as const },
      { id: 'created_at', label: 'Date Created', type: 'datetime' as const, width: '140px' },
      {
        id: 'cuts',
        label: 'Cuts',
        type: 'text' as const,
        width: '120px',
        editable: true,
        editor: 'text' as const,
        formatValue: listToString,
        parseValue: stringToList,
      },
      { id: 'date_viewed', label: 'Date Viewed', type: 'datetime' as const, width: '140px', editable: true, editor: 'datetime' as const },
      { id: 'department', label: 'Department', type: 'text' as const, width: '140px', editable: true, editor: 'text' as const },
      { id: 'editorial_qc', label: 'Editorial QC', type: 'text' as const, width: '140px', editable: true, editor: 'text' as const },
      { id: 'first_frame', label: 'First Frame', type: 'number' as const, width: '110px', editable: true, editor: 'text' as const },
      { id: 'flagged', label: 'Flagged', type: 'text' as const, width: '110px', editable: true, editor: 'checkbox' as const },
      { id: 'id', label: 'Id', type: 'text' as const, width: '80px' },
      { id: 'last_frame', label: 'Last Frame', type: 'number' as const, width: '110px', editable: true, editor: 'text' as const },
      { id: 'movie_aspect_ratio', label: 'Movie Aspect Ratio', type: 'text' as const, width: '160px', editable: true, editor: 'text' as const },
      { id: 'movie_has_slate', label: 'Movie Has Slate', type: 'text' as const, width: '150px', editable: true, editor: 'checkbox' as const },
      { id: 'nuke_script', label: 'Nuke Script', type: 'text' as const, width: '140px', editable: true, editor: 'text' as const },
      { id: 'frames_path', label: 'Path to Frames', type: 'text' as const, width: '200px', editable: true, editor: 'text' as const },
      { id: 'movie_url', label: 'Path to Movie', type: 'text' as const, width: '200px', editable: true, editor: 'text' as const },
      {
        id: 'playlists',
        label: 'Playlists',
        type: 'text' as const,
        width: '160px',
        editable: true,
        editor: 'text' as const,
        formatValue: listToString,
        parseValue: stringToList,
      },
      { id: 'project_label', label: 'Project', type: 'text' as const, width: '120px' },
      {
        id: 'published_files',
        label: 'Published Files',
        type: 'text' as const,
        width: '160px',
        editable: true,
        editor: 'text' as const,
        formatValue: listToString,
        parseValue: stringToList,
      },
      { id: 'send_exrs', label: 'Send EXRs', type: 'text' as const, width: '120px', editable: true, editor: 'checkbox' as const },
      { id: 'source_clip', label: 'Source Clip', type: 'text' as const, width: '140px', editable: true, editor: 'text' as const },
      {
        id: 'tags',
        label: 'Tags',
        type: 'text' as const,
        width: '140px',
        editable: true,
        editor: 'multiselect' as const,
        options: tagOptions,
        formatValue: listToString,
        parseValue: (value: unknown) => parseListValue(value),
      },
      { id: 'task_template', label: 'Task Template', type: 'text' as const, width: '160px', editable: true, editor: 'text' as const },
      { id: 'version_type', label: 'Type', type: 'text' as const, width: '120px', editable: true, editor: 'text' as const },
      { id: 'uploaded_movie', label: 'Uploaded Movie', type: 'text' as const, width: '160px', editable: true, editor: 'text' as const },
      { id: 'viewed_status', label: 'Viewed/Unviewed', type: 'text' as const, width: '140px', editable: true, editor: 'text' as const },
    ],
    [projectId, statusOptions, tagOptions]
  )

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
          if (!open) loadVersions(projectId)
        }}
        projectId={projectId}
      />

      <EditVersionDialog
        open={showEditDialog}
        onOpenChange={(open) => {
          setShowEditDialog(open)
          if (!open) loadVersions(projectId)
        }}
        projectId={projectId}
        version={selectedVersion}
      />

      <DeleteConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Version"
        description="Are you sure you want to delete this version? This will remove any linked publishes."
        itemName={selectedVersion?.code || ''}
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

        {versions.length === 0 ? (
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
            data={versions}
            entityType="versions"
            csvExportFilename="apex-versions"
            onCsvImport={handleCsvImport}
            onBulkDelete={handleBulkDelete}
            onAdd={() => setShowUploadDialog(true)}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onCellUpdate={async (row, column, value) => {
              const result = await updateVersion(row.id, { [column.id]: value }, { revalidate: false })
              if (result.error) {
                throw new Error(result.error)
              }
              setVersions((prev) =>
                prev.map((version) =>
                  version.id === row.id ? { ...version, [column.id]: value } : version
                )
              )
            }}
          />
        )}
      </ApexPageShell>
    </>
  )
}
