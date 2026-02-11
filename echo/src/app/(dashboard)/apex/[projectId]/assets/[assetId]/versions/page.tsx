'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { EntityTable } from '@/components/table/entity-table'
import { updateVersion } from '@/actions/versions'
import { UploadVersionDialog } from '@/components/apex/upload-version-dialog'

export default function AssetVersionsPage({
  params,
}: {
  params: Promise<{ projectId: string; assetId: string }>
}) {
  const [projectId, setProjectId] = useState('')
  const [assetId, setAssetId] = useState('')
  const [versions, setVersions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const listToString = (value: any) => (Array.isArray(value) ? value.join(', ') : '')
  const stringToList = (value: string) =>
    value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)

  useEffect(() => {
    params.then((p) => {
      setProjectId(p.projectId)
      setAssetId(p.assetId)
      loadVersions(p.projectId, p.assetId)
    })
  }, [params])

  async function loadVersions(projId: string, aId: string) {
    try {
      setIsLoading(true)
      const supabase = createClient()
      const assetIdNum = Number(aId)

      const { data: versionsData, error } = await supabase
        .from('versions')
        .select(
          `
          *,
          task:tasks(id, name),
          artist:profiles(id, display_name, full_name),
          project:projects(id, code, name)
        `
        )
        .eq('project_id', projId)
        .eq('entity_type', 'asset')
        .eq('entity_id', Number.isNaN(assetIdNum) ? aId : assetIdNum)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading asset versions:', error)
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
      console.error('Error loading asset versions:', error)
      setVersions([])
    } finally {
      setIsLoading(false)
    }
  }

  async function handleCellUpdate(row: any, column: any, value: any) {
    const result = await updateVersion(row.id, { [column.id]: value }, { revalidate: false })
    if (result.error) {
      throw new Error(result.error)
    }
    setVersions((prev) =>
      prev.map((version) =>
        version.id === row.id ? { ...version, [column.id]: value } : version
      )
    )
  }

  const columns = [
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
  ]

  return (
    <>
      <UploadVersionDialog
        open={showUploadDialog}
        onOpenChange={(open) => {
          setShowUploadDialog(open)
          if (!open) loadVersions(projectId, assetId)
        }}
        projectId={projectId}
        defaultEntityType="asset"
        defaultEntityId={assetId}
        lockEntity
      />

      <div className="p-6">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center text-sm text-zinc-400">
            Loading versions...
          </div>
        ) : versions.length === 0 ? (
          <div className="rounded-md border border-zinc-800 bg-zinc-950/70 p-6">
            <h3 className="text-sm font-semibold text-zinc-100">Versions</h3>
            <p className="mt-2 text-sm text-zinc-400">No versions found for this asset.</p>
            <button
              onClick={() => setShowUploadDialog(true)}
              className="mt-4 rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-black transition hover:bg-amber-400"
            >
              Upload Version
            </button>
          </div>
        ) : (
          <EntityTable
            columns={columns}
            data={versions}
            entityType="versions_asset"
            onAdd={() => setShowUploadDialog(true)}
            onCellUpdate={handleCellUpdate}
          />
        )}
      </div>
    </>
  )
}
