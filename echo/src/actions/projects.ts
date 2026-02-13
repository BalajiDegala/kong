'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

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
  }
) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const updateData: Record<string, unknown> = {}
  if (formData.name) updateData.name = formData.name
  if (formData.code) updateData.code = formData.code.toUpperCase()
  if (formData.description !== undefined) updateData.description = formData.description
  if (formData.status) updateData.status = formData.status
  if (formData.tags !== undefined) updateData.tags = sanitizeTags(formData.tags)

  const { data, error } = await supabase
    .from('projects')
    .update(updateData)
    .eq('id', projectId)
    .select()
    .single()

  if (error) {
    return { error: error.message }
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

  const { error } = await supabase.from('projects').delete().eq('id', projectId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/apex')
  return { success: true }
}
