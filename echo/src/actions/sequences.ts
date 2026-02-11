'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { pickEntityColumns } from '@/lib/schema'

export async function createSequence(
  formData: Record<string, unknown> & {
    project_id: string
    name: string
    code: string
  }
) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const extra = pickEntityColumns('sequence', formData, {
    deny: new Set(['project_id', 'created_by', 'updated_by']),
  })

  const { data, error } = await supabase
    .from('sequences')
    .insert({
      ...extra,
      project_id: formData.project_id,
      name: formData.name,
      code: formData.code.toUpperCase(),
      status: typeof formData.status === 'string' && formData.status ? formData.status : 'active',
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

  const updateData: any = pickEntityColumns('sequence', formData, {
    deny: new Set(['id', 'project_id', 'created_by', 'created_at', 'updated_at']),
  })

  const maybeCode = formData.code
  if (typeof maybeCode === 'string') {
    updateData.code = maybeCode.toUpperCase()
  }

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
