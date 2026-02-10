'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { EntityTable } from '@/components/table/entity-table'

export default function PlaylistsPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const [projectId, setProjectId] = useState<string>('')
  const [playlists, setPlaylists] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

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

  const columns = [
    {
      id: 'name',
      label: 'Playlist Name',
      type: 'link' as const,
      linkHref: (row: any) => `/apex/${projectId}/playlists/${row.id}`,
    },
    { id: 'code', label: 'Code', type: 'text' as const, width: '120px' },
    { id: 'description', label: 'Description', type: 'text' as const },
    { id: 'locked', label: 'Locked', type: 'text' as const, width: '80px' },
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
    <div className="flex h-full flex-col">
      <div className="border-b border-zinc-800 bg-zinc-950 px-6 py-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-100">Playlists</h2>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {playlists.length === 0 ? (
          <div className="flex h-full items-center justify-center p-6">
            <div className="text-center">
              <p className="mb-2 text-zinc-400">No playlists yet</p>
            </div>
          </div>
        ) : (
          <EntityTable columns={columns} data={playlists} entityType="playlists" />
        )}
      </div>
    </div>
  )
}
