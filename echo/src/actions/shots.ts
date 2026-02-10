'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createShot(formData: {
  project_id: string
  sequence_id: string
  name: string
  code: string
  description?: string
  cut_in?: number
  cut_out?: number
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { data, error } = await supabase
    .from('shots')
    .insert({
      project_id: formData.project_id,
      sequence_id: formData.sequence_id,
      name: formData.name,
      code: formData.code.toUpperCase(),
      description: formData.description || null,
      cut_in: formData.cut_in || null,
      cut_out: formData.cut_out || null,
      status: 'pending',
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
  formData: {
    code?: string
    description?: string
    status?: string
    cut_in?: number
    cut_out?: number
    head_in?: number
    head_out?: number
    tail_in?: number
    tail_out?: number
    shot_type?: string | null
    client_name?: string | null
    dd_client_name?: string | null
    cc?: string | null
    comp_note?: string | null
    cut_order?: string | null
    cut_summary?: string | null
    duration_summary?: string | null
    dd_location?: string | null
    delivery_date?: string | null
    head_duration?: number | null
    next_review?: string | null
    open_notes?: string[]
    open_notes_count?: number
    parent_shots?: string[]
    plates?: string | null
    seq_shot?: string | null
    shot_notes?: string[]
    sub_shots?: string[]
    target_date?: string | null
    task_template?: string | null
    vendor_groups?: string[]
    assets?: string[]
    tags?: string[]
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
  if (formData.code !== undefined) updateData.code = formData.code.toUpperCase()
  if (formData.description !== undefined) updateData.description = formData.description
  if (formData.status !== undefined) updateData.status = formData.status
  if (formData.cut_in !== undefined) updateData.cut_in = formData.cut_in
  if (formData.cut_out !== undefined) updateData.cut_out = formData.cut_out
  if (formData.head_in !== undefined) updateData.head_in = formData.head_in
  if (formData.head_out !== undefined) updateData.head_out = formData.head_out
  if (formData.tail_in !== undefined) updateData.tail_in = formData.tail_in
  if (formData.tail_out !== undefined) updateData.tail_out = formData.tail_out
  if (formData.shot_type !== undefined) updateData.shot_type = formData.shot_type
  if (formData.client_name !== undefined) updateData.client_name = formData.client_name
  if (formData.dd_client_name !== undefined) updateData.dd_client_name = formData.dd_client_name
  if (formData.cc !== undefined) updateData.cc = formData.cc
  if (formData.comp_note !== undefined) updateData.comp_note = formData.comp_note
  if (formData.cut_order !== undefined) updateData.cut_order = formData.cut_order
  if (formData.cut_summary !== undefined) updateData.cut_summary = formData.cut_summary
  if (formData.duration_summary !== undefined) updateData.duration_summary = formData.duration_summary
  if (formData.dd_location !== undefined) updateData.dd_location = formData.dd_location
  if (formData.delivery_date !== undefined) updateData.delivery_date = formData.delivery_date
  if (formData.head_duration !== undefined) updateData.head_duration = formData.head_duration
  if (formData.next_review !== undefined) updateData.next_review = formData.next_review
  if (formData.open_notes !== undefined) updateData.open_notes = formData.open_notes
  if (formData.open_notes_count !== undefined) updateData.open_notes_count = formData.open_notes_count
  if (formData.parent_shots !== undefined) updateData.parent_shots = formData.parent_shots
  if (formData.plates !== undefined) updateData.plates = formData.plates
  if (formData.seq_shot !== undefined) updateData.seq_shot = formData.seq_shot
  if (formData.shot_notes !== undefined) updateData.shot_notes = formData.shot_notes
  if (formData.sub_shots !== undefined) updateData.sub_shots = formData.sub_shots
  if (formData.target_date !== undefined) updateData.target_date = formData.target_date
  if (formData.task_template !== undefined) updateData.task_template = formData.task_template
  if (formData.vendor_groups !== undefined) updateData.vendor_groups = formData.vendor_groups
  if (formData.assets !== undefined) updateData.assets = formData.assets
  if (formData.tags !== undefined) updateData.tags = formData.tags

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
