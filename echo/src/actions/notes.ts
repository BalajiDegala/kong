'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createNote(formData: {
  project_id: string
  subject?: string
  content: string
  entity_type?: 'asset' | 'shot'
  entity_id?: string
  task_id?: string
  status?: string
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { data, error } = await supabase
    .from('notes')
    .insert({
      project_id: formData.project_id,
      subject: formData.subject || null,
      content: formData.content,
      entity_type: formData.entity_type || null,
      entity_id: formData.entity_id ? parseInt(formData.entity_id) : null,
      task_id: formData.task_id ? parseInt(formData.task_id) : null,
      status: formData.status || 'open',
      created_by: user.id,
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/apex/${formData.project_id}/notes`)
  return { data }
}

export async function updateNote(
  noteId: string,
  formData: {
    subject?: string
    content?: string
    status?: string
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
  if (formData.subject !== undefined) updateData.subject = formData.subject
  if (formData.content !== undefined) updateData.content = formData.content
  if (formData.status) updateData.status = formData.status

  const { data, error } = await supabase
    .from('notes')
    .update(updateData)
    .eq('id', noteId)
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  const note = await supabase.from('notes').select('project_id').eq('id', noteId).single()
  if (note.data) {
    revalidatePath(`/apex/${note.data.project_id}/notes`)
  }

  return { data }
}

export async function deleteNote(noteId: string, projectId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { error } = await supabase.from('notes').delete().eq('id', noteId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/apex/${projectId}/notes`)
  return { success: true }
}
