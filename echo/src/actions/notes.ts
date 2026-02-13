'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { pickEntityColumnsForWrite } from '@/actions/schema-columns'

export async function createNote(
  formData: Record<string, unknown> & {
    project_id: string
    subject?: string
    content: string
    entity_type?: 'asset' | 'shot' | 'sequence' | 'task' | 'version' | 'project' | 'published_file'
    entity_id?: string
    task_id?: string
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

  const extra = await pickEntityColumnsForWrite(supabase, 'note', formData, {
    deny: new Set(['project_id', 'created_by', 'updated_by', 'author_id']),
  })

  const { data, error } = await supabase
    .from('notes')
    .insert({
      ...extra,
      project_id: formData.project_id,
      subject: formData.subject || null,
      content: formData.content,
      entity_type: formData.entity_type || null,
      entity_id: formData.entity_id ? parseInt(formData.entity_id) : null,
      task_id: formData.task_id ? parseInt(formData.task_id) : null,
      status: formData.status || 'open',
      created_by: user.id,
      author_id: user.id,
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
  formData: Record<string, unknown>
) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const updateData: any = await pickEntityColumnsForWrite(supabase, 'note', formData, {
    deny: new Set(['id', 'project_id', 'created_by', 'author_id', 'created_at', 'updated_at']),
  })

  if (Object.keys(updateData).length === 0) {
    return { data: null }
  }

  const { error } = await supabase
    .from('notes')
    .update(updateData)
    .eq('id', noteId)

  if (error) {
    return { error: error.message }
  }

  let data: any = null
  const updatedRow = await supabase
    .from('notes')
    .select('*')
    .eq('id', noteId)
    .maybeSingle()
  if (!updatedRow.error) {
    data = updatedRow.data
  }

  const note = await supabase.from('notes').select('project_id').eq('id', noteId).maybeSingle()
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
