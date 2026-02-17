'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { pickEntityColumnsForWrite } from '@/actions/schema-columns'
import { logEntityCreated, logEntityUpdated, logEntityDeleted } from '@/lib/activity/activity-logger'

function normalizeCodeToken(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.trim().replace(/\s+/g, '_').toUpperCase()
}

function buildShotCode(sequenceCode: string, shotToken: string): string {
  if (!shotToken) return ''
  if (!sequenceCode) return shotToken
  if (shotToken.startsWith(sequenceCode)) return shotToken
  return `${sequenceCode}${shotToken}`
}

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

  const extra = await pickEntityColumnsForWrite(supabase, 'shot', formData, {
    deny: new Set(['project_id', 'created_by', 'updated_by']),
  })

  const sequenceId = typeof formData.sequence_id === 'string' ? formData.sequence_id.trim() : ''
  const shotName = typeof formData.name === 'string' ? formData.name.trim() : ''
  const shotToken = normalizeCodeToken(shotName)
  if (!sequenceId || !shotName || !shotToken) {
    return { error: 'Shot name and sequence are required' }
  }

  const { data: sequenceData, error: sequenceError } = await supabase
    .from('sequences')
    .select('code')
    .eq('id', sequenceId)
    .eq('project_id', formData.project_id)
    .maybeSingle()

  if (sequenceError) {
    return { error: sequenceError.message }
  }
  if (!sequenceData) {
    return { error: 'Selected sequence not found' }
  }

  const sequenceCode = normalizeCodeToken(sequenceData.code)
  const shotCode = buildShotCode(sequenceCode, shotToken)
  if (!shotCode) {
    return { error: 'Shot code could not be generated' }
  }

  const clientName =
    typeof formData.client_name === 'string' && formData.client_name.trim()
      ? formData.client_name.trim()
      : shotCode
  const ddClientName =
    typeof formData.dd_client_name === 'string' && formData.dd_client_name.trim()
      ? formData.dd_client_name.trim()
      : shotCode

  const { data, error } = await supabase
    .from('shots')
    .insert({
      ...extra,
      project_id: formData.project_id,
      sequence_id: sequenceId,
      name: shotName,
      code: shotCode,
      client_name: clientName,
      dd_client_name: ddClientName,
      status: typeof formData.status === 'string' && formData.status ? formData.status : 'pending',
      created_by: user.id,
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  // Fire-and-forget activity logging
  logEntityCreated('shot', data.id, formData.project_id, data)

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

  // Fetch current row before update to capture old values
  const { data: oldData } = await supabase
    .from('shots')
    .select('*')
    .eq('id', shotId)
    .maybeSingle()

  const updateData: Record<string, unknown> = await pickEntityColumnsForWrite(
    supabase,
    'shot',
    formData,
    {
    deny: new Set(['id', 'project_id', 'sequence_id', 'code', 'created_by', 'created_at', 'updated_at']),
    }
  )

  const { data, error } = await supabase
    .from('shots')
    .update(updateData)
    .eq('id', shotId)
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  // Fire-and-forget activity logging
  if (oldData) {
    const projectId = options?.projectId || oldData.project_id
    logEntityUpdated('shot', shotId, projectId, oldData, updateData)
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

  // Fetch before delete for logging
  const { data: oldData } = await supabase
    .from('shots')
    .select('*')
    .eq('id', shotId)
    .maybeSingle()

  const { error } = await supabase.from('shots').delete().eq('id', shotId)

  if (error) {
    return { error: error.message }
  }

  if (oldData) {
    logEntityDeleted('shot', shotId, projectId, oldData)
  }

  revalidatePath(`/apex/${projectId}/shots`)
  return { success: true }
}
