'use server'

import { createClient } from '@/lib/supabase/server'

export async function uploadNoteAttachment(file: File, noteId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Generate unique file path
  const timestamp = Date.now()
  const fileExt = file.name.split('.').pop()
  const filePath = `${noteId}/${timestamp}_${file.name}`

  // Upload file to storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('note-attachments')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (uploadError) {
    return { error: uploadError.message }
  }

  // Create attachment record in database
  const { data, error } = await supabase
    .from('attachments')
    .insert({
      note_id: parseInt(noteId),
      file_name: file.name,
      file_size: file.size,
      file_type: file.type,
      storage_path: uploadData.path,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) {
    // Clean up uploaded file if database insert fails
    await supabase.storage.from('note-attachments').remove([uploadData.path])
    return { error: error.message }
  }

  return { data }
}

export async function deleteAttachment(attachmentId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Get attachment details to delete from storage
  const { data: attachment } = await supabase
    .from('attachments')
    .select('storage_path')
    .eq('id', attachmentId)
    .single()

  // Delete from storage
  if (attachment?.storage_path) {
    await supabase.storage.from('note-attachments').remove([attachment.storage_path])
  }

  // Delete from database
  const { error } = await supabase.from('attachments').delete().eq('id', attachmentId)

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}
