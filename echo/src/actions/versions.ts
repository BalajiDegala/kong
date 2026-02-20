'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { pickEntityColumnsForWrite } from '@/actions/schema-columns'
import { logEntityCreated, logEntityUpdated, logEntityTrashed } from '@/lib/activity/activity-logger'
import { notifyVersionUploaded } from '@/lib/activity/notification-creator'
import { asText } from '@/lib/fields'


function toNullableNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const text = asText(value).trim()
  if (!text) return null
  const parsed = Number(text)
  return Number.isFinite(parsed) ? parsed : null
}

function firstNonEmptyText(...values: unknown[]): string | null {
  for (const value of values) {
    const normalized = asText(value).trim()
    if (normalized) return normalized
  }
  return null
}

function parseTextList(value: unknown): string[] {
  const out: string[] = []
  const seen = new Set<string>()

  const push = (entry: unknown) => {
    const normalized = asText(entry).trim().replace(/^"(.*)"$/, '$1')
    if (!normalized || seen.has(normalized)) return
    seen.add(normalized)
    out.push(normalized)
  }

  if (Array.isArray(value)) {
    for (const item of value) push(item)
    return out
  }

  const raw = asText(value).trim()
  if (!raw) return out

  if (raw.startsWith('[') && raw.endsWith(']')) {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        for (const item of parsed) push(item)
        return out
      }
    } catch {
      // Fall through to generic parsing.
    }
  }

  if (raw.startsWith('{') && raw.endsWith('}')) {
    const inner = raw.slice(1, -1).trim()
    if (!inner) return out
    for (const part of inner.split(',')) push(part)
    return out
  }

  if (raw.includes(',')) {
    for (const part of raw.split(',')) push(part)
    return out
  }

  push(raw)
  return out
}

function appendUniqueTextList(existing: unknown, value: unknown): string[] {
  const next = parseTextList(existing)
  const candidate = asText(value).trim()
  if (!candidate) return next
  if (!next.includes(candidate)) {
    next.push(candidate)
  }
  return next
}

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

  const normalizedTaskId = toNullableNumber(formData.task_id)
  const requestedTaskId = asText(formData.task_id).trim()
  if (requestedTaskId && normalizedTaskId === null) {
    return { error: 'Invalid task selected' }
  }

  const requestedEntityId = toNullableNumber(formData.entity_id)
  if (requestedEntityId === null) {
    return { error: 'Invalid linked entity' }
  }

  let resolvedEntityType: 'asset' | 'shot' | 'sequence' = formData.entity_type
  let resolvedEntityId = requestedEntityId

  if (normalizedTaskId !== null) {
    const { data: taskRow, error: taskLookupError } = await supabase
      .from('tasks')
      .select('id, project_id, entity_type, entity_id')
      .eq('id', normalizedTaskId)
      .maybeSingle()

    if (taskLookupError) {
      console.error('Failed to resolve task while creating version:', taskLookupError)
    } else if (taskRow) {
      const taskEntityType = asText(taskRow.entity_type).trim().toLowerCase()
      const taskEntityId = toNullableNumber(taskRow.entity_id)
      const taskProjectId = toNullableNumber(taskRow.project_id)
      const requestProjectId = toNullableNumber(formData.project_id)

      if (
        taskProjectId !== null &&
        requestProjectId !== null &&
        taskProjectId !== requestProjectId
      ) {
        return { error: 'Selected task does not belong to this project' }
      }

      if (
        (taskEntityType === 'asset' ||
          taskEntityType === 'shot' ||
          taskEntityType === 'sequence') &&
        taskEntityId !== null
      ) {
        resolvedEntityType = taskEntityType
        resolvedEntityId = taskEntityId
      }
    }
  }

  const extra = await pickEntityColumnsForWrite(supabase, 'version', formData, {
    deny: new Set(['project_id', 'created_by', 'updated_by']),
  })

  const { data, error } = await supabase
    .from('versions')
    .insert({
      ...extra,
      project_id: formData.project_id,
      entity_type: resolvedEntityType,
      entity_id: resolvedEntityId,
      task_id: normalizedTaskId,
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

  const versionThumbnailUrl = firstNonEmptyText(
    data.thumbnail_url,
    formData.thumbnail_url,
    data.uploaded_movie_image,
    data.filmstrip_thumbnail_url
  )
  const versionIdText = asText(data.id).trim()

  try {
    const projectId = formData.project_id
    const taskId = toNullableNumber(data.task_id ?? formData.task_id)
    let shotId =
      asText(data.entity_type).trim().toLowerCase() === 'shot'
        ? toNullableNumber(data.entity_id)
        : null
    let updatedTask = false
    let updatedShot = false

    if (taskId !== null) {
      const { data: taskRow, error: taskError } = await supabase
        .from('tasks')
        .select('entity_type, entity_id, versions')
        .eq('id', taskId)
        .maybeSingle()

      if (taskError) {
        console.error('Failed to resolve task while syncing version thumbnail:', taskError)
      } else if (taskRow) {
        if (!shotId && asText(taskRow.entity_type).trim().toLowerCase() === 'shot') {
          shotId = toNullableNumber(taskRow.entity_id)
        }

        const taskUpdatePayload: Record<string, unknown> = {
          versions: appendUniqueTextList(taskRow.versions, versionIdText),
        }
        if (versionThumbnailUrl) {
          taskUpdatePayload.thumbnail_url = versionThumbnailUrl
        }

        const { error: taskUpdateError } = await supabase
          .from('tasks')
          .update(taskUpdatePayload)
          .eq('id', taskId)

        if (taskUpdateError) {
          console.error('Failed to update task thumbnail from version:', taskUpdateError)
        } else {
          updatedTask = true
        }
      }
    }

    if (shotId !== null && versionThumbnailUrl) {
      const { data: shotRow, error: shotError } = await supabase
        .from('shots')
        .select('id, thumbnail_url')
        .eq('id', shotId)
        .maybeSingle()

      if (shotError) {
        console.error('Failed to resolve shot while syncing version thumbnail:', shotError)
      } else if (shotRow && !asText(shotRow.thumbnail_url).trim()) {
        const { error: shotUpdateError } = await supabase
          .from('shots')
          .update({
            thumbnail_url: versionThumbnailUrl,
            version_link: versionIdText,
          })
          .eq('id', shotId)

        if (shotUpdateError) {
          console.error('Failed to update shot thumbnail from version:', shotUpdateError)
        } else {
          updatedShot = true
        }
      }
    }

    if (updatedTask) {
      revalidatePath(`/apex/${projectId}/tasks`)
      if (taskId !== null) {
        revalidatePath(`/apex/${projectId}/tasks/${taskId}`)
      }
    }

    if (updatedShot) {
      revalidatePath(`/apex/${projectId}/shots`)
      if (shotId !== null) {
        revalidatePath(`/apex/${projectId}/shots/${shotId}`)
      }
    }
  } catch (thumbnailSyncError) {
    console.error('Failed to sync shot/task thumbnail from new version:', thumbnailSyncError)
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

  const updateData: Record<string, unknown> = await pickEntityColumnsForWrite(
    supabase,
    'version',
    formData,
    {
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
    }
  )

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

  // Get the full row for logging
  const { data: version } = await supabase
    .from('versions')
    .select('*')
    .eq('id', versionId)
    .single()

  // Soft-delete: set deleted_at instead of hard-deleting
  // NOTE: Storage file is NOT deleted — only cleaned up on permanent delete from Skull Island
  const { error } = await supabase
    .from('versions')
    .update({ deleted_at: new Date().toISOString(), deleted_by: user.id })
    .eq('id', versionId)

  if (error) {
    return { error: error.message }
  }

  if (version) {
    logEntityTrashed('version', versionId, projectId, version)
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
