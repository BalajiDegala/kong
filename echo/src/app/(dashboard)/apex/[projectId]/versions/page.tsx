'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { EntityTable } from '@/components/table/entity-table'
import { UploadVersionDialog } from '@/components/apex/upload-version-dialog'
import { updateVersion } from '@/actions/versions'
import { Upload } from 'lucide-react'

export default function VersionsPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const [projectId, setProjectId] = useState<string>('')
  const [versions, setVersions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showUploadDialog, setShowUploadDialog] = useState(false)
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
      const supabase = createClient()

      const { data: versionsData, error } = await supabase
        .from('versions')
        .select(`
          *,
          task:tasks(id, name),
          artist:profiles(id, display_name, full_name),
          project:projects(id, code, name)
        `)
        .eq('project_id', projId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading versions:', error)
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
      setVersions([])
    } finally {
      setIsLoading(false)
    }
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

      <div className="flex h-full flex-col">
        <div className="border-b border-zinc-800 bg-zinc-950 px-6 py-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-100">Versions</h2>
            <button
              onClick={() => setShowUploadDialog(true)}
              className="flex items-center gap-2 rounded-md bg-amber-500 px-3 py-2 text-sm font-medium text-black transition hover:bg-amber-400"
            >
              <Upload className="h-4 w-4" />
              Upload Version
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {versions.length === 0 ? (
            <div className="flex h-full items-center justify-center p-6">
              <div className="text-center">
                <Upload className="mx-auto mb-4 h-12 w-12 text-zinc-700" />
                <h3 className="mb-2 text-lg font-semibold text-zinc-100">No versions yet</h3>
                <p className="mb-4 text-sm text-zinc-400">
                  Upload your first version to start tracking deliverables.
                </p>
                <button
                  onClick={() => setShowUploadDialog(true)}
                  className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-black transition hover:bg-amber-400"
                >
                  Upload First Version
                </button>
              </div>
            </div>
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
                { id: 'created_at', label: 'Date Created', type: 'text' as const, width: '140px' },
                { id: 'cuts', label: 'Cuts', type: 'text' as const, width: '120px', editable: true, editor: 'text' as const },
                { id: 'date_viewed', label: 'Date Viewed', type: 'text' as const, width: '140px', editable: true, editor: 'text' as const },
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
        </div>
      </div>
    </>
  )
}
