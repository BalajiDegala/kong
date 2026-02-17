'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { logEntityCreated, logEntityUpdated, logEntityDeleted } from '@/lib/activity/activity-logger'

function sanitizeTags(value?: string[] | null): string[] {
  return (value || [])
    .map((item) => String(item).trim())
    .filter(Boolean)
}

export async function createProject(formData: {
  name: string
  code: string
  description?: string
  tags?: string[]
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { data, error } = await supabase
    .from('projects')
    .insert({
      name: formData.name,
      code: formData.code.toUpperCase(),
      description: formData.description || null,
      tags: sanitizeTags(formData.tags),
      status: 'active',
      created_by: user.id,
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  logEntityCreated('project', data.id, data.id, data)

  revalidatePath('/apex')
  return { data }
}

export async function updateProject(
  projectId: string,
  formData: {
    name?: string
    code?: string
    description?: string
    status?: string
    tags?: string[]
    thumbnail_url?: string | null
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
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .maybeSingle()

  const updateData: Record<string, unknown> = {}
  if (formData.name) updateData.name = formData.name
  if (formData.code) updateData.code = formData.code.toUpperCase()
  if (formData.description !== undefined) updateData.description = formData.description
  if (formData.status) updateData.status = formData.status
  if (formData.tags !== undefined) updateData.tags = sanitizeTags(formData.tags)
  if (formData.thumbnail_url !== undefined) {
    const thumbnail = String(formData.thumbnail_url ?? '').trim()
    updateData.thumbnail_url = thumbnail || null
  }

  const { data, error } = await supabase
    .from('projects')
    .update(updateData)
    .eq('id', projectId)
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  if (oldData) {
    logEntityUpdated('project', projectId, projectId, oldData, updateData)
  }

  revalidatePath('/apex')
  revalidatePath(`/apex/${projectId}`)
  return { data }
}

export async function deleteProject(projectId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { data: oldData } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .maybeSingle()

  const { error } = await supabase.from('projects').delete().eq('id', projectId)

  if (error) {
    return { error: error.message }
  }

  if (oldData) {
    logEntityDeleted('project', projectId, projectId, oldData)
  }

  revalidatePath('/apex')
  return { success: true }
}
