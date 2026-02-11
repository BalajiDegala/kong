'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { pickEntityColumns } from '@/lib/schema'

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

  const extra = pickEntityColumns('asset', formData, {
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

  const updateData: any = pickEntityColumns('asset', formData, {
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

  const { error } = await supabase.from('assets').delete().eq('id', assetId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/apex/${projectId}/assets`)
  return { success: true }
}
