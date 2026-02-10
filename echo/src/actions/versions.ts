'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createVersion(formData: {
  project_id: string
  entity_type: 'asset' | 'shot'
  entity_id: string
  task_id?: string
  code: string
  version_number: number
  description?: string
  file_path?: string
  movie_url?: string
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { data, error } = await supabase
    .from('versions')
    .insert({
      project_id: formData.project_id,
      entity_type: formData.entity_type,
      entity_id: formData.entity_id,
      task_id: formData.task_id ? parseInt(formData.task_id) : null,
      code: formData.code,
      version_number: formData.version_number,
      description: formData.description || null,
      file_path: formData.file_path || null,
      movie_url: formData.movie_url || null,
      status: 'pending',
      created_by: user.id,
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/apex/${formData.project_id}/versions`)
  return { data }
}

export async function updateVersion(
  versionId: string,
  formData: {
    code?: string
    description?: string
    status?: string
    client_approved?: boolean
    link?: string | null
    cuts?: string | null
    date_viewed?: string | null
    department?: string | null
    editorial_qc?: string | null
    flagged?: boolean
    movie_aspect_ratio?: string | null
    movie_has_slate?: boolean
    nuke_script?: string | null
    playlists?: string[]
    published_files?: string[]
    send_exrs?: boolean
    source_clip?: string | null
    tags?: string[]
    task_template?: string | null
    version_type?: string | null
    uploaded_movie?: string | null
    viewed_status?: string | null
    client_approved_at?: string | null
    client_approved_by?: string | null
    client_version_name?: string | null
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
  if (formData.code !== undefined) updateData.code = formData.code
  if (formData.description !== undefined) updateData.description = formData.description
  if (formData.status !== undefined) updateData.status = formData.status
  if (formData.client_approved !== undefined) updateData.client_approved = formData.client_approved
  if (formData.link !== undefined) updateData.link = formData.link
  if (formData.cuts !== undefined) updateData.cuts = formData.cuts
  if (formData.date_viewed !== undefined) updateData.date_viewed = formData.date_viewed
  if (formData.department !== undefined) updateData.department = formData.department
  if (formData.editorial_qc !== undefined) updateData.editorial_qc = formData.editorial_qc
  if (formData.flagged !== undefined) updateData.flagged = formData.flagged
  if (formData.movie_aspect_ratio !== undefined) updateData.movie_aspect_ratio = formData.movie_aspect_ratio
  if (formData.movie_has_slate !== undefined) updateData.movie_has_slate = formData.movie_has_slate
  if (formData.nuke_script !== undefined) updateData.nuke_script = formData.nuke_script
  if (formData.playlists !== undefined) updateData.playlists = formData.playlists
  if (formData.published_files !== undefined) updateData.published_files = formData.published_files
  if (formData.send_exrs !== undefined) updateData.send_exrs = formData.send_exrs
  if (formData.source_clip !== undefined) updateData.source_clip = formData.source_clip
  if (formData.tags !== undefined) updateData.tags = formData.tags
  if (formData.task_template !== undefined) updateData.task_template = formData.task_template
  if (formData.version_type !== undefined) updateData.version_type = formData.version_type
  if (formData.uploaded_movie !== undefined) updateData.uploaded_movie = formData.uploaded_movie
  if (formData.viewed_status !== undefined) updateData.viewed_status = formData.viewed_status
  if (formData.client_approved_at !== undefined) updateData.client_approved_at = formData.client_approved_at
  if (formData.client_approved_by !== undefined) updateData.client_approved_by = formData.client_approved_by
  if (formData.client_version_name !== undefined) updateData.client_version_name = formData.client_version_name

  const { data, error } = await supabase
    .from('versions')
    .update(updateData)
    .eq('id', versionId)
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  const shouldRevalidate = options?.revalidate !== false
  if (shouldRevalidate) {
    const projectId = options?.projectId
    if (projectId) {
      revalidatePath(`/apex/${projectId}/versions`)
    } else {
      const version = await supabase.from('versions').select('project_id').eq('id', versionId).single()
      if (version.data) {
        revalidatePath(`/apex/${version.data.project_id}/versions`)
      }
    }
  }

  return { data }
}

export async function deleteVersion(versionId: string, projectId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Get the file path to delete from storage
  const { data: version } = await supabase
    .from('versions')
    .select('file_path')
    .eq('id', versionId)
    .single()

  // Delete the file from storage if it exists
  if (version?.file_path) {
    await supabase.storage.from('versions').remove([version.file_path])
  }

  // Delete the version record
  const { error } = await supabase.from('versions').delete().eq('id', versionId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/apex/${projectId}/versions`)
  return { success: true }
}

export async function uploadVersionFile(file: File, projectId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Generate unique file path
  const timestamp = Date.now()
  const fileExt = file.name.split('.').pop()
  const filePath = `${projectId}/${timestamp}_${file.name}`

  // Upload file to storage
  const { data, error } = await supabase.storage
    .from('versions')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (error) {
    return { error: error.message }
  }

  // Get public URL (for private buckets, this requires signed URL)
  const { data: urlData } = supabase.storage
    .from('versions')
    .getPublicUrl(filePath)

  return {
    data: {
      path: data.path,
      fullPath: data.fullPath,
      publicUrl: urlData.publicUrl,
    },
  }
}
