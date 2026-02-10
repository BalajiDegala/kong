'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createSequence(formData: {
  project_id: string
  name: string
  code: string
  description?: string
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { data, error } = await supabase
    .from('sequences')
    .insert({
      project_id: formData.project_id,
      name: formData.name,
      code: formData.code.toUpperCase(),
      description: formData.description || null,
      status: 'active',
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/apex/${formData.project_id}/sequences`)
  revalidatePath(`/apex/${formData.project_id}/shots`)
  return { data }
}

export async function updateSequence(
  sequenceId: string,
  formData: {
    name?: string
    code?: string
    description?: string
    status?: string
    client_name?: string | null
    dd_client_name?: string | null
    cc?: string | null
    task_template?: string | null
    sequence_type?: string | null
    tags?: string[]
    shots?: string[]
    assets?: string[]
    plates?: string | null
    cuts?: string | null
    open_notes_count?: number
    published_file_links?: string[]
    created_by?: string | null
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
  if (formData.code !== undefined) updateData.code = formData.code.toUpperCase()
  if (formData.description !== undefined) updateData.description = formData.description
  if (formData.status !== undefined) updateData.status = formData.status
  if (formData.client_name !== undefined) updateData.client_name = formData.client_name
  if (formData.dd_client_name !== undefined) updateData.dd_client_name = formData.dd_client_name
  if (formData.cc !== undefined) updateData.cc = formData.cc
  if (formData.task_template !== undefined) updateData.task_template = formData.task_template
  if (formData.sequence_type !== undefined) updateData.sequence_type = formData.sequence_type
  if (formData.tags !== undefined) updateData.tags = formData.tags
  if (formData.shots !== undefined) updateData.shots = formData.shots
  if (formData.assets !== undefined) updateData.assets = formData.assets
  if (formData.plates !== undefined) updateData.plates = formData.plates
  if (formData.cuts !== undefined) updateData.cuts = formData.cuts
  if (formData.open_notes_count !== undefined) updateData.open_notes_count = formData.open_notes_count
  if (formData.published_file_links !== undefined) updateData.published_file_links = formData.published_file_links
  if (formData.created_by !== undefined) updateData.created_by = formData.created_by

  const { data, error } = await supabase
    .from('sequences')
    .update(updateData)
    .eq('id', sequenceId)
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  const shouldRevalidate = options?.revalidate !== false
  if (shouldRevalidate) {
    const projectId = options?.projectId
    if (projectId) {
      revalidatePath(`/apex/${projectId}/sequences`)
      revalidatePath(`/apex/${projectId}/shots`)
    } else {
      const sequence = await supabase
        .from('sequences')
        .select('project_id')
        .eq('id', sequenceId)
        .single()
      if (sequence.data) {
        revalidatePath(`/apex/${sequence.data.project_id}/sequences`)
        revalidatePath(`/apex/${sequence.data.project_id}/shots`)
      }
    }
  }

  return { data }
}

export async function deleteSequence(sequenceId: string, projectId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { error } = await supabase.from('sequences').delete().eq('id', sequenceId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/apex/${projectId}/sequences`)
  revalidatePath(`/apex/${projectId}/shots`)
  return { success: true }
}
