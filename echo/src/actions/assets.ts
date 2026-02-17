'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { pickEntityColumnsForWrite } from '@/actions/schema-columns'
import { logEntityCreated, logEntityUpdated, logEntityDeleted } from '@/lib/activity/activity-logger'

export async function createAsset(
  formData: Record<string, unknown> & {
    project_id: string
    name: string
    code: string
    asset_type: string
  }
) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const extra = await pickEntityColumnsForWrite(supabase, 'asset', formData, {
    deny: new Set(['project_id', 'created_by', 'updated_by']),
  })

  const { data, error } = await supabase
    .from('assets')
    .insert({
      ...extra,
      project_id: formData.project_id,
      name: formData.name,
      code: formData.code.toLowerCase().replace(/\s+/g, '_'),
      asset_type: formData.asset_type,
      status: typeof formData.status === 'string' && formData.status ? formData.status : 'pending',
      created_by: user.id,
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  // Fire-and-forget activity logging
  logEntityCreated('asset', data.id, formData.project_id, data)

  revalidatePath(`/apex/${formData.project_id}/assets`)
  return { data }
}

export async function updateAsset(
  assetId: string,
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
    .from('assets')
    .select('*')
    .eq('id', assetId)
    .maybeSingle()

  const updateData: any = await pickEntityColumnsForWrite(supabase, 'asset', formData, {
    deny: new Set(['id', 'project_id', 'created_by', 'created_at', 'updated_at']),
  })

  const maybeCode = formData.code
  if (typeof maybeCode === 'string') {
    updateData.code = maybeCode.toLowerCase().replace(/\s+/g, '_')
  }

  const { data, error } = await supabase
    .from('assets')
    .update(updateData)
    .eq('id', assetId)
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  // Fire-and-forget activity logging
  if (oldData) {
    const projectId = options?.projectId || oldData.project_id
    logEntityUpdated('asset', assetId, projectId, oldData, updateData)
  }

  const shouldRevalidate = options?.revalidate !== false
  if (shouldRevalidate) {
    const projectId = options?.projectId
    if (projectId) {
      revalidatePath(`/apex/${projectId}/assets`)
    } else {
      const asset = await supabase
        .from('assets')
        .select('project_id')
        .eq('id', assetId)
        .single()
      if (asset.data) {
        revalidatePath(`/apex/${asset.data.project_id}/assets`)
      }
    }
  }

  return { data }
}

export async function deleteAsset(assetId: string, projectId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Fetch before delete for logging
  const { data: oldData } = await supabase
    .from('assets')
    .select('*')
    .eq('id', assetId)
    .maybeSingle()

  const { error } = await supabase.from('assets').delete().eq('id', assetId)

  if (error) {
    return { error: error.message }
  }

  // Fire-and-forget activity logging
  if (oldData) {
    logEntityDeleted('asset', assetId, projectId, oldData)
  }

  revalidatePath(`/apex/${projectId}/assets`)
  return { success: true }
}
