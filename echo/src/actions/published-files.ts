'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { pickEntityColumns } from '@/lib/schema'

export async function createPublishedFile(formData: {
  project_id: string
  entity_type: 'shot' | 'sequence' | 'asset' | 'task' | 'version' | 'note' | 'project'
  entity_id: string | number
  task_id?: string | number | null
  version_id?: string | number | null
  code: string
  name?: string | null
  description?: string | null
  status?: string | null
  link?: string | null
  file_type?: string | null
  file_path?: string | null
  file_size?: number | null
  version_number?: number | null
  downstream_published_files?: string[]
  upstream_published_files?: string[]
  tags?: string[]
  client_version?: string | null
  element?: string | null
  output?: string | null
  path_cache?: string | null
  path_cache_storage?: string | null
  path_to_source?: string | null
  submission_notes?: string | null
  snapshot_id?: string | null
  snapshot_type?: string | null
  target_name?: string | null
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const extra = pickEntityColumns('published_file', formData as any, {
    deny: new Set(['project_id', 'published_by', 'created_by', 'updated_by']),
  })

  const parseMaybeNumber = (value?: string | number | null) => {
    if (value === undefined || value === null || value === '') return null
    if (typeof value === 'number') return value
    const parsed = Number(value)
    return Number.isNaN(parsed) ? value : parsed
  }

  const insertData: any = {
    ...extra,
    project_id: parseMaybeNumber(formData.project_id),
    code: formData.code,
    name: formData.name ?? formData.code,
    status: formData.status ?? 'pending',
    published_by: user.id,
  }

  insertData.entity_type = formData.entity_type
  insertData.entity_id = parseMaybeNumber(formData.entity_id)
  if (formData.task_id !== undefined) insertData.task_id = parseMaybeNumber(formData.task_id)
  if (formData.version_id !== undefined) insertData.version_id = parseMaybeNumber(formData.version_id)
  if (formData.description !== undefined) insertData.description = formData.description
  if (formData.link !== undefined) insertData.link = formData.link
  if (formData.file_type !== undefined) insertData.file_type = formData.file_type
  if (formData.file_path !== undefined) insertData.file_path = formData.file_path
  if (!insertData.file_path && insertData.link) insertData.file_path = insertData.link
  if (formData.file_size !== undefined) insertData.file_size = formData.file_size
  if (formData.version_number !== undefined) insertData.version_number = formData.version_number
  if (formData.downstream_published_files !== undefined) {
    insertData.downstream_published_files = formData.downstream_published_files
  }
  if (formData.upstream_published_files !== undefined) {
    insertData.upstream_published_files = formData.upstream_published_files
  }
  if (formData.tags !== undefined) insertData.tags = formData.tags
  if (formData.client_version !== undefined) insertData.client_version = formData.client_version
  if (formData.element !== undefined) insertData.element = formData.element
  if (formData.output !== undefined) insertData.output = formData.output
  if (formData.path_cache !== undefined) insertData.path_cache = formData.path_cache
  if (formData.path_cache_storage !== undefined) {
    insertData.path_cache_storage = formData.path_cache_storage
  }
  if (formData.path_to_source !== undefined) insertData.path_to_source = formData.path_to_source
  if (formData.submission_notes !== undefined) insertData.submission_notes = formData.submission_notes
  if (formData.snapshot_id !== undefined) insertData.snapshot_id = formData.snapshot_id
  if (formData.snapshot_type !== undefined) insertData.snapshot_type = formData.snapshot_type
  if (formData.target_name !== undefined) insertData.target_name = formData.target_name

  const { data, error } = await supabase
    .from('published_files')
    .insert(insertData)
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/apex/${formData.project_id}/published-files`)
  return { data }
}

export async function updatePublishedFile(
  publishedFileId: string,
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

  const updateData: any = pickEntityColumns('published_file', formData, {
    deny: new Set(['id', 'project_id', 'published_by', 'created_by', 'created_at', 'updated_at']),
  })

  const { data, error } = await supabase
    .from('published_files')
    .update(updateData)
    .eq('id', publishedFileId)
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  const shouldRevalidate = options?.revalidate !== false
  if (shouldRevalidate) {
    let projectId = options?.projectId
    if (!projectId) {
      const projectResult = await supabase
        .from('published_files')
        .select('project_id')
        .eq('id', publishedFileId)
        .single()
      projectId = projectResult.data?.project_id?.toString()
    }
    if (projectId) {
      revalidatePath(`/apex/${projectId}`)
    }
  }

  return { data }
}

export async function deletePublishedFile(publishedFileId: string, projectId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { error } = await supabase
    .from('published_files')
    .delete()
    .eq('id', publishedFileId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/apex/${projectId}/published-files`)
  return { success: true }
}
