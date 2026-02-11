'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createPlaylist(formData: {
  project_id: string
  name: string
  code: string
  description?: string
  locked?: boolean
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { data, error } = await supabase
    .from('playlists')
    .insert({
      project_id: formData.project_id,
      name: formData.name,
      code: formData.code,
      description: formData.description || null,
      locked: formData.locked ?? false,
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/apex/${formData.project_id}/playlists`)
  return { data }
}

export async function updatePlaylist(
  playlistId: string,
  formData: {
    name?: string
    code?: string
    description?: string | null
    locked?: boolean
  },
  options?: {
    revalidate?: boolean
    projectId?: string
  }
) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const updateData: any = {}
  if (formData.name !== undefined) updateData.name = formData.name
  if (formData.code !== undefined) updateData.code = formData.code
  if (formData.description !== undefined) updateData.description = formData.description
  if (formData.locked !== undefined) updateData.locked = formData.locked

  const { data, error } = await supabase
    .from('playlists')
    .update(updateData)
    .eq('id', playlistId)
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  const shouldRevalidate = options?.revalidate !== false
  if (shouldRevalidate) {
    const projectId = options?.projectId
    if (projectId) {
      revalidatePath(`/apex/${projectId}/playlists`)
    } else {
      const playlist = await supabase
        .from('playlists')
        .select('project_id')
        .eq('id', playlistId)
        .single()
      if (playlist.data?.project_id) {
        revalidatePath(`/apex/${playlist.data.project_id}/playlists`)
      }
    }
  }

  return { data }
}

export async function deletePlaylist(playlistId: string, projectId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { error } = await supabase.from('playlists').delete().eq('id', playlistId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/apex/${projectId}/playlists`)
  return { success: true }
}
