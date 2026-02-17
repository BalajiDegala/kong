'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { pickEntityColumnsForWrite } from '@/actions/schema-columns'
import { logEntityCreated, logEntityUpdated, logEntityDeleted } from '@/lib/activity/activity-logger'
import { notifyVersionUploaded } from '@/lib/activity/notification-creator'

export async function createVersion(
  formData: Record<string, unknown> & {
    project_id: string
    entity_type: 'asset' | 'shot' | 'sequence'
    entity_id: string
    task_id?: string
    code: string
    version_number: number
    description?: string
    file_path?: string
    movie_url?: string
  }
) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const extra = await pickEntityColumnsForWrite(supabase, 'version', formData, {
    deny: new Set(['project_id', 'created_by', 'updated_by']),
  })

  const { data, error } = await supabase
    .from('versions')
    .insert({
      ...extra,
      project_id: formData.project_id,
      entity_type: formData.entity_type,
      entity_id: formData.entity_id,
      task_id: formData.task_id ? parseInt(formData.task_id) : null,
      code: formData.code,
      version_number: formData.version_number,
      description: formData.description || null,
      file_path: formData.file_path || null,
      movie_url: formData.movie_url || null,
      status: typeof formData.status === 'string' && formData.status ? formData.status : 'pending',
      created_by: user.id,
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  logEntityCreated('version', data.id, formData.project_id, data)

  // Notify task assignees if version is linked to a task
  if (data.task_id) {
    notifyVersionUploaded(data.id, data.task_id, formData.project_id, user.id, data.code || `v${data.version_number}`)
  }

  revalidatePath(`/apex/${formData.project_id}/versions`)
  return { data }
}

export async function updateVersion(
  versionId: string,
  formData: Record<string, unknown>,
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

  const { data: oldData } = await supabase
    .from('versions')
    .select('*')
    .eq('id', versionId)
    .maybeSingle()

  const updateData: any = await pickEntityColumnsForWrite(supabase, 'version', formData, {
    deny: new Set([
      'id',
      'project_id',
      'entity_type',
      'entity_id',
      'code',
      'created_by',
      'created_at',
      'updated_at',
    ]),
  })

  const { data, error } = await supabase
    .from('versions')
    .update(updateData)
    .eq('id', versionId)
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  if (oldData) {
    const projectId = options?.projectId || oldData.project_id
    logEntityUpdated('version', versionId, projectId, oldData, updateData)
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

  // Get the full row for storage cleanup + logging
  const { data: version } = await supabase
    .from('versions')
    .select('*')
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

  if (version) {
    logEntityDeleted('version', versionId, projectId, version)
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
