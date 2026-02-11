'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { EntityTable } from '@/components/table/entity-table'
import { ApexPageShell } from '@/components/apex/apex-page-shell'
import { ApexEmptyState } from '@/components/apex/apex-empty-state'
import { CreatePlaylistDialog } from '@/components/apex/create-playlist-dialog'
import { DeleteConfirmDialog } from '@/components/apex/delete-confirm-dialog'
import { deletePlaylist, updatePlaylist } from '@/actions/playlists'
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
        <p className="text-zinc-400">Loading playlists...</p>
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
            className="flex items-center gap-2 rounded-md bg-amber-500 px-3 py-2 text-sm font-medium text-black transition hover:bg-amber-400"
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
                className="rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-black transition hover:bg-amber-400"
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
            onAdd={() => setShowCreateDialog(true)}
            onDelete={handleDelete}
            onCellUpdate={handleCellUpdate}
          />
        )}
      </ApexPageShell>
    </>
  )
}
