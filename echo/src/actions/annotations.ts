'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createAnnotation(formData: {
  post_media_id?: number
  version_id?: number
  note_id?: number
  project_id?: string | number
  frame_number: number
  timecode?: string
  annotation_data: Record<string, unknown>
  annotation_text?: string
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  if (!formData.post_media_id && !formData.version_id) {
    return { error: 'Either post_media_id or version_id is required' }
  }

  const insertPayload = {
    post_media_id: formData.post_media_id || null,
    version_id: formData.version_id || null,
    note_id: formData.note_id || null,
    author_id: user.id,
    frame_number: formData.frame_number,
    timecode: formData.timecode || null,
    annotation_data: formData.annotation_data,
    annotation_text: formData.annotation_text || null,
    status: 'active',
  }

  let { data, error } = await supabase
    .from('annotations')
    .insert(insertPayload)
    .select()
    .single()

  // Backward compatibility for environments where note_id has not been migrated yet.
  if (error && /note_id/i.test(error.message || '')) {
    const legacyPayload: Record<string, unknown> = { ...insertPayload }
    delete legacyPayload.note_id
    const legacyResult = await supabase
      .from('annotations')
      .insert(legacyPayload)
      .select()
      .single()
    data = legacyResult.data
    error = legacyResult.error
  }

  if (error) {
    return { error: error.message }
  }

  if (formData.version_id && formData.project_id) {
    revalidatePath(`/apex/${formData.project_id}/versions/${formData.version_id}/review`)
    revalidatePath(`/apex/${formData.project_id}/versions/${formData.version_id}/activity`)
  } else {
    revalidatePath('/pulse')
  }

  return { data }
}

export async function updateAnnotation(
  annotationId: number,
  formData: {
    annotation_data?: Record<string, unknown>
    annotation_text?: string
    status?: 'active' | 'resolved' | 'archived'
  }
) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const updateData: Record<string, unknown> = {}
  if (formData.annotation_data !== undefined) updateData.annotation_data = formData.annotation_data
  if (formData.annotation_text !== undefined) updateData.annotation_text = formData.annotation_text
  if (formData.status !== undefined) updateData.status = formData.status

  const { data, error } = await supabase
    .from('annotations')
    .update(updateData)
    .eq('id', annotationId)
    .eq('author_id', user.id)
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/pulse')
  return { data }
}

export async function deleteAnnotation(annotationId: number) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { error } = await supabase
    .from('annotations')
    .delete()
    .eq('id', annotationId)
    .eq('author_id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/pulse')
  return { success: true }
}
