'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { EntityTable } from '@/components/table/entity-table'
import { UploadVersionDialog } from '@/components/apex/upload-version-dialog'
import { ApexPageShell } from '@/components/apex/apex-page-shell'
import { ApexEmptyState } from '@/components/apex/apex-empty-state'
import { DeleteConfirmDialog } from '@/components/apex/delete-confirm-dialog'
import { deleteVersion, updateVersion } from '@/actions/versions'
import { Upload } from 'lucide-react'

export default function VersionsPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const [projectId, setProjectId] = useState<string>('')
  const [versions, setVersions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedVersion, setSelectedVersion] = useState<any>(null)
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
      loadVersions(p.projectId)
    })
  }, [params])

  async function loadVersions(projId: string) {
    try {
      setIsLoading(true)
      setLoadError(null)
      const supabase = createClient()

      const { data: versionsData, error } = await supabase
        .from('versions')
        .select(`
          *,
          task:tasks(id, name),
          artist:profiles!versions_created_by_fkey(id, display_name, full_name),
          project:projects(id, code, name)
        `)
        .eq('project_id', projId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading versions:', error)
        setLoadError(error.message)
        setVersions([])
        return
      }

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
    } finally {
      setIsLoading(false)
    }
  }

  function handleDelete(version: any) {
    setSelectedVersion(version)
    setShowDeleteDialog(true)
  }

  async function handleDeleteConfirm() {
    if (!selectedVersion) return { error: 'No version selected' }
    return await deleteVersion(selectedVersion.id, projectId)
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-zinc-400">Loading versions...</p>
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
            className="flex items-center gap-2 rounded-md bg-amber-500 px-3 py-2 text-sm font-medium text-black transition hover:bg-amber-400"
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
                className="rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-black transition hover:bg-amber-400"
              >
                Upload First Version
              </button>
            }
          />
        ) : (
          <EntityTable
            columns={[
                { id: 'thumbnail_url', label: 'Thumbnail', type: 'thumbnail' as const, width: '80px' },
                {
                  id: 'code',
                  label: 'Version Name',
                  type: 'link' as const,
                  editable: true,
                  editor: 'text' as const,
                  linkHref: (row: any) => `/apex/${projectId}/versions/${row.id}`,
                },
                { id: 'link', label: 'Link', type: 'text' as const, width: '140px', editable: true, editor: 'text' as const },
                { id: 'task_label', label: 'Task', type: 'text' as const, width: '140px' },
                { id: 'status', label: 'Status', type: 'status' as const, width: '90px', editable: true, editor: 'text' as const },
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
                  editor: 'text' as const,
                  formatValue: listToString,
                  parseValue: stringToList,
                },
                { id: 'task_template', label: 'Task Template', type: 'text' as const, width: '160px', editable: true, editor: 'text' as const },
                { id: 'version_type', label: 'Type', type: 'text' as const, width: '120px', editable: true, editor: 'text' as const },
                { id: 'uploaded_movie', label: 'Uploaded Movie', type: 'text' as const, width: '160px', editable: true, editor: 'text' as const },
                { id: 'viewed_status', label: 'Viewed/Unviewed', type: 'text' as const, width: '140px', editable: true, editor: 'text' as const },
              ]}
              data={versions}
              entityType="versions"
              onAdd={() => setShowUploadDialog(true)}
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
