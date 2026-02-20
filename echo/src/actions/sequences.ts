'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { pickEntityColumnsForWrite } from '@/actions/schema-columns'
import { logEntityCreated, logEntityUpdated, logEntityTrashed } from '@/lib/activity/activity-logger'

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

  logEntityCreated('sequence', data.id, formData.project_id, data)

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

  const { data: oldData } = await supabase
    .from('sequences')
    .select('*')
    .eq('id', sequenceId)
    .maybeSingle()

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

  if (oldData) {
    const projectId = options?.projectId || oldData.project_id
    logEntityUpdated('sequence', sequenceId, projectId, oldData, updateData)
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

  const { data: oldData } = await supabase
    .from('sequences')
    .select('*')
    .eq('id', sequenceId)
    .maybeSingle()

  // Soft-delete: set deleted_at instead of hard-deleting
  const { error } = await supabase
    .from('sequences')
    .update({ deleted_at: new Date().toISOString(), deleted_by: user.id })
    .eq('id', sequenceId)

  if (error) {
    return { error: error.message }
  }

  if (oldData) {
    logEntityTrashed('sequence', sequenceId, projectId, oldData)
  }

  revalidatePath(`/apex/${projectId}/sequences`)
  revalidatePath(`/apex/${projectId}/shots`)
  return { success: true }
}
