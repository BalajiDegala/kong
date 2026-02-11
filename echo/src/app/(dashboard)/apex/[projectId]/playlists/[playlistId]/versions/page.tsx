'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { EntityTable } from '@/components/table/entity-table'
import { updateVersion } from '@/actions/versions'

export default function PlaylistVersionsPage({
  params,
}: {
  params: Promise<{ projectId: string; playlistId: string }>
}) {
  const [projectId, setProjectId] = useState('')
  const [playlistId, setPlaylistId] = useState('')
  const [versions, setVersions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const listToString = (value: any) => (Array.isArray(value) ? value.join(', ') : '')
  const stringToList = (value: string) =>
    value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)

  useEffect(() => {
    params.then((p) => {
      setProjectId(p.projectId)
      setPlaylistId(p.playlistId)
      loadVersions(p.projectId, p.playlistId)
    })
  }, [params])

  async function loadVersions(projId: string, pId: string) {
    try {
      setIsLoading(true)
      const supabase = createClient()
      const playlistIdNum = Number(pId)

      const { data: itemsData, error: itemsError } = await supabase
        .from('playlist_items')
        .select('version_id')
        .eq('playlist_id', Number.isNaN(playlistIdNum) ? pId : playlistIdNum)

      if (itemsError) {
        console.error('Error loading playlist items:', itemsError)
        setVersions([])
        return
      }

      const versionIds = (itemsData || []).map((item) => item.version_id)
      if (versionIds.length === 0) {
        setVersions([])
        return
      }

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
        .in('id', versionIds)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading playlist versions:', error)
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
      console.error('Error loading playlist versions:', error)
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
    { id: 'created_at', label: 'Date Created', type: 'text' as const, width: '140px' },
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
  ]

  return (
    <div className="p-6">
      {isLoading ? (
        <div className="flex h-40 items-center justify-center text-sm text-zinc-400">
          Loading versions...
        </div>
      ) : versions.length === 0 ? (
        <div className="rounded-md border border-zinc-800 bg-zinc-950/70 p-6">
          <h3 className="text-sm font-semibold text-zinc-100">Versions</h3>
          <p className="mt-2 text-sm text-zinc-400">No versions linked to this playlist yet.</p>
        </div>
      ) : (
        <EntityTable
          columns={columns}
          data={versions}
          entityType="versions_playlist"
          onCellUpdate={handleCellUpdate}
        />
      )}
    </div>
  )
}
