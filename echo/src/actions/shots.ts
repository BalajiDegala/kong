'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { pickEntityColumns } from '@/lib/schema'

export async function createShot(
  formData: Record<string, unknown> & {
    project_id: string
    sequence_id: string
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

  const extra = pickEntityColumns('shot', formData, {
    deny: new Set(['project_id', 'created_by', 'updated_by']),
  })

  const { data, error } = await supabase
    .from('shots')
    .insert({
      ...extra,
      project_id: formData.project_id,
      sequence_id: formData.sequence_id,
      name: formData.name,
      code: formData.code.toUpperCase(),
      status: typeof formData.status === 'string' && formData.status ? formData.status : 'pending',
      created_by: user.id,
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/apex/${formData.project_id}/shots`)
  return { data }
}

export async function updateShot(
  shotId: string,
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

  const updateData: any = pickEntityColumns('shot', formData, {
    deny: new Set(['id', 'project_id', 'sequence_id', 'created_by', 'created_at', 'updated_at']),
  })

  const maybeCode = formData.code
  if (typeof maybeCode === 'string') {
    updateData.code = maybeCode.toUpperCase()
  }

  const { data, error } = await supabase
    .from('shots')
    .update(updateData)
    .eq('id', shotId)
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  const shouldRevalidate = options?.revalidate !== false
  if (shouldRevalidate) {
    const projectId = options?.projectId
    if (projectId) {
      revalidatePath(`/apex/${projectId}/shots`)
    } else {
      const shot = await supabase.from('shots').select('project_id').eq('id', shotId).single()
      if (shot.data) {
        revalidatePath(`/apex/${shot.data.project_id}/shots`)
      }
    }
  }

  return { data }
}

export async function deleteShot(shotId: string, projectId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { error } = await supabase.from('shots').delete().eq('id', shotId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/apex/${projectId}/shots`)
  return { success: true }
}
