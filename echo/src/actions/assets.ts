'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createAsset(formData: {
  project_id: string
  name: string
  code: string
  asset_type: string
  description?: string
  client_name?: string | null
  dd_client_name?: string | null
  keep?: boolean
  outsource?: boolean
  sequence_id?: number | null
  shot_id?: number | null
  shots?: string[]
  vendor_groups?: string[]
  sub_assets?: string[]
  tags?: string[]
  task_template?: string | null
  parent_assets?: string[]
  sequences?: string[]
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { data, error } = await supabase
    .from('assets')
    .insert({
      project_id: formData.project_id,
      name: formData.name,
      code: formData.code.toLowerCase().replace(/\s+/g, '_'),
      asset_type: formData.asset_type,
      description: formData.description || null,
      client_name: formData.client_name || null,
      dd_client_name: formData.dd_client_name || null,
      keep: formData.keep ?? false,
      outsource: formData.outsource ?? false,
      sequence_id: formData.sequence_id ?? null,
      shot_id: formData.shot_id ?? null,
      shots: formData.shots ?? [],
      vendor_groups: formData.vendor_groups ?? [],
      sub_assets: formData.sub_assets ?? [],
      tags: formData.tags ?? [],
      task_template: formData.task_template ?? null,
      parent_assets: formData.parent_assets ?? [],
      sequences: formData.sequences ?? [],
      status: 'pending',
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
  formData: {
    name?: string
    code?: string
    asset_type?: string
    description?: string
    status?: string
    client_name?: string | null
    dd_client_name?: string | null
    keep?: boolean
    outsource?: boolean
    sequence_id?: number | null
    shot_id?: number | null
    shots?: string[]
    vendor_groups?: string[]
    sub_assets?: string[]
    tags?: string[]
    task_template?: string | null
    parent_assets?: string[]
    sequences?: string[]
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
  if (formData.name) updateData.name = formData.name
  if (formData.code) updateData.code = formData.code.toLowerCase().replace(/\s+/g, '_')
  if (formData.asset_type) updateData.asset_type = formData.asset_type
  if (formData.description !== undefined) updateData.description = formData.description
  if (formData.status) updateData.status = formData.status
  if (formData.client_name !== undefined) updateData.client_name = formData.client_name
  if (formData.dd_client_name !== undefined) updateData.dd_client_name = formData.dd_client_name
  if (formData.keep !== undefined) updateData.keep = formData.keep
  if (formData.outsource !== undefined) updateData.outsource = formData.outsource
  if (formData.sequence_id !== undefined) updateData.sequence_id = formData.sequence_id
  if (formData.shot_id !== undefined) updateData.shot_id = formData.shot_id
  if (formData.shots !== undefined) updateData.shots = formData.shots
  if (formData.vendor_groups !== undefined) updateData.vendor_groups = formData.vendor_groups
  if (formData.sub_assets !== undefined) updateData.sub_assets = formData.sub_assets
  if (formData.tags !== undefined) updateData.tags = formData.tags
  if (formData.task_template !== undefined) updateData.task_template = formData.task_template
  if (formData.parent_assets !== undefined) updateData.parent_assets = formData.parent_assets
  if (formData.sequences !== undefined) updateData.sequences = formData.sequences

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
