'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { EntityTable } from '@/components/table/entity-table'
import { ApexPageShell } from '@/components/apex/apex-page-shell'
import { ApexEmptyState } from '@/components/apex/apex-empty-state'
import { CreatePlaylistDialog } from '@/components/apex/create-playlist-dialog'
import { DeleteConfirmDialog } from '@/components/apex/delete-confirm-dialog'
import { createPlaylist, deletePlaylist, updatePlaylist } from '@/actions/playlists'
import { List, Plus } from 'lucide-react'

export default function PlaylistsPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const [projectId, setProjectId] = useState<string>('')
  const [playlists, setPlaylists] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedPlaylist, setSelectedPlaylist] = useState<any>(null)

  useEffect(() => {
    params.then((p) => {
      setProjectId(p.projectId)
      loadPlaylists(p.projectId)
    })
  }, [params])

  async function loadPlaylists(projId: string) {
    try {
      setIsLoading(true)
      const supabase = createClient()
      const { data } = await supabase
        .from('playlists')
        .select('*')
        .eq('project_id', projId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      setPlaylists(data || [])
    } catch (error) {
      console.error('Error loading playlists:', error)
    } finally {
      setIsLoading(false)
    }
  }

  function handleDelete(playlist: any) {
    setSelectedPlaylist(playlist)
    setShowDeleteDialog(true)
  }

  async function handleDeleteConfirm() {
    if (!selectedPlaylist) return { error: 'No playlist selected' }
    return await deletePlaylist(selectedPlaylist.id, projectId)
  }

  async function handleCellUpdate(row: any, column: any, value: any) {
    const result = await updatePlaylist(row.id, { [column.id]: value }, { revalidate: false })
    if (result.error) {
      throw new Error(result.error)
    }
    setPlaylists((prev) =>
      prev.map((playlist) =>
        playlist.id === row.id ? { ...playlist, [column.id]: value } : playlist
      )
    )
  }

  function toBooleanLike(value: unknown): boolean {
    if (typeof value === 'boolean') return value
    const normalized = String(value ?? '').trim().toLowerCase()
    return ['true', '1', 'yes', 'y', 'on'].includes(normalized)
  }

  async function handleBulkDelete(rows: any[]) {
    const failures: string[] = []

    for (const row of rows) {
      const rowId = String(row?.id ?? '').trim()
      if (!rowId) continue
      const result = await deletePlaylist(rowId, projectId)
      if (result?.error) {
        failures.push(`${String(row?.name ?? '').trim() || rowId}: ${result.error}`)
      }
    }

    loadPlaylists(projectId)

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
      const name = String(row.name ?? '').trim()
      const code = String(row.code ?? '').trim() || name.replace(/\s+/g, '_').toUpperCase()

      if (!name) {
        failed.push({
          row: index + 2,
          message: 'Playlist name is required.',
        })
        continue
      }

      try {
        const result = await createPlaylist({
          project_id: projectId,
          name,
          code,
          description: String(row.description ?? '').trim() || undefined,
          locked: toBooleanLike(row.locked),
        })

        if (result?.error) {
          throw new Error(result.error)
        }
        imported += 1
      } catch (error) {
        failed.push({
          row: index + 2,
          message: error instanceof Error ? error.message : 'Failed to import playlist row.',
        })
      }
    }

    loadPlaylists(projectId)
    return { imported, failed }
  }

  const columns = [
    {
      id: 'name',
      label: 'Playlist Name',
      type: 'link' as const,
      linkHref: (row: any) => `/apex/${projectId}/playlists/${row.id}`,
      editable: true,
      editor: 'text' as const,
    },
    { id: 'code', label: 'Code', type: 'text' as const, width: '120px', editable: true, editor: 'text' as const },
    { id: 'description', label: 'Description', type: 'text' as const, editable: true, editor: 'textarea' as const },
    { id: 'locked', label: 'Locked', type: 'text' as const, width: '80px', editable: true, editor: 'checkbox' as const },
    { id: 'created_at', label: 'Created', type: 'text' as const, width: '140px' },
  ]

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Loading playlists...</p>
      </div>
    )
  }

  return (
    <>
      <CreatePlaylistDialog
        open={showCreateDialog}
        onOpenChange={(open) => {
          setShowCreateDialog(open)
          if (!open) loadPlaylists(projectId)
        }}
        projectId={projectId}
      />

      <DeleteConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Playlist"
        description="Are you sure you want to delete this playlist? This will remove all linked items."
        itemName={selectedPlaylist?.name || ''}
        onConfirm={handleDeleteConfirm}
      />

      <ApexPageShell
        title="Playlists"
        action={
          <button
            onClick={() => setShowCreateDialog(true)}
            className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-black transition hover:bg-primary"
          >
            <Plus className="h-4 w-4" />
            Add Playlist
          </button>
        }
      >
        {playlists.length === 0 ? (
          <ApexEmptyState
            icon={<List className="h-12 w-12" />}
            title="No playlists yet"
            description="Create a playlist to organize review versions."
            action={
              <button
                onClick={() => setShowCreateDialog(true)}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-black transition hover:bg-primary"
              >
                Create First Playlist
              </button>
            }
          />
        ) : (
          <EntityTable
            columns={columns}
            data={playlists}
            entityType="playlists"
            csvExportFilename="apex-playlists"
            onCsvImport={handleCsvImport}
            onBulkDelete={handleBulkDelete}
            onAdd={() => setShowCreateDialog(true)}
            onDelete={handleDelete}
            onCellUpdate={handleCellUpdate}
          />
        )}
      </ApexPageShell>
    </>
  )
}
