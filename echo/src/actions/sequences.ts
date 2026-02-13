'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { pickEntityColumnsForWrite } from '@/actions/schema-columns'

function normalizeCodeToken(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.trim().replace(/\s+/g, '_').toUpperCase()
}

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

  const extra = await pickEntityColumnsForWrite(supabase, 'sequence', formData, {
    deny: new Set(['project_id', 'created_by', 'updated_by']),
  })

  const sequenceName = typeof formData.name === 'string' ? formData.name.trim() : ''
  const sequenceCode = normalizeCodeToken(sequenceName)
  if (!sequenceName || !sequenceCode) {
    return { error: 'Sequence name is required' }
  }

  const clientName =
    typeof formData.client_name === 'string' && formData.client_name.trim()
      ? formData.client_name.trim()
      : sequenceCode
  const ddClientName =
    typeof formData.dd_client_name === 'string' && formData.dd_client_name.trim()
      ? formData.dd_client_name.trim()
      : sequenceCode

  const { data, error } = await supabase
    .from('sequences')
    .insert({
      ...extra,
      project_id: formData.project_id,
      name: sequenceName,
      code: sequenceCode,
      client_name: clientName,
      dd_client_name: ddClientName,
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

  const updateData: Record<string, unknown> = await pickEntityColumnsForWrite(
    supabase,
    'sequence',
    formData,
    {
    deny: new Set(['id', 'project_id', 'code', 'created_by', 'created_at', 'updated_at']),
    }
  )

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
