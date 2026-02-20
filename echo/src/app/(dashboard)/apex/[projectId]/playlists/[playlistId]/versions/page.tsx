'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { listStatusNames } from '@/lib/status/options'
import { listTagNames } from '@/lib/tags/options'
import { EntityTable } from '@/components/table/entity-table'
import { updateVersion } from '@/actions/versions'
import { EditVersionDialog } from '@/components/apex/edit-version-dialog'

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

export default function PlaylistVersionsPage({
  params,
}: {
  params: Promise<{ projectId: string; playlistId: string }>
}) {
  const [projectId, setProjectId] = useState('')
  const [playlistId, setPlaylistId] = useState('')
  const [versions, setVersions] = useState<any[]>([])
  const [statusNames, setStatusNames] = useState<string[]>([])
  const [tagNames, setTagNames] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [selectedVersion, setSelectedVersion] = useState<any>(null)
  const listToString = (value: unknown) => parseListValue(value).join(', ')
  const stringToList = (value: string) => parseListValue(value)

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

      const [versionsResult, nextStatusNames, nextTagNames] = await Promise.all([
        supabase
          .from('versions')
          .select(
            `
            *,
            task:tasks(id, name),
            artist:profiles!versions_artist_id_fkey(id, display_name, full_name),
            project:projects(id, code, name)
          `
          )
          .eq('project_id', projId)
          .is('deleted_at', null)
          .in('id', versionIds)
          .order('created_at', { ascending: false }),
        listStatusNames('version'),
        listTagNames(),
      ])

      const { data: versionsData, error } = versionsResult

      if (error) {
        console.error('Error loading playlist versions:', error)
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
      console.error('Error loading playlist versions:', error)
      setVersions([])
      setStatusNames([])
      setTagNames([])
    } finally {
      setIsLoading(false)
    }
  }

  function handleEdit(version: any) {
    setSelectedVersion(version)
    setShowEditDialog(true)
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
  ]

  return (
    <>
      <EditVersionDialog
        open={showEditDialog}
        onOpenChange={(open) => {
          setShowEditDialog(open)
          if (!open) loadVersions(projectId, playlistId)
        }}
        projectId={projectId}
        version={selectedVersion}
      />

      <div className="p-6">
      {isLoading ? (
        <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
          Loading versions...
        </div>
      ) : versions.length === 0 ? (
        <div className="rounded-md border border-border bg-background/70 p-6">
          <h3 className="text-sm font-semibold text-foreground">Versions</h3>
          <p className="mt-2 text-sm text-muted-foreground">No versions linked to this playlist yet.</p>
        </div>
      ) : (
        <EntityTable
          columns={columns}
          data={versions}
          entityType="versions_playlist"
          onCellUpdate={handleCellUpdate}
          onEdit={handleEdit}
        />
      )}
      </div>
    </>
  )
}
