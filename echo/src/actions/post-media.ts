'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function uploadPostMedia(formData: {
  post_id: number
  file_name: string
  file_size: number
  mime_type: string
  media_type: 'image' | 'video'
  storage_path: string
  width?: number
  height?: number
  duration_seconds?: number
  frame_count?: number
  fps?: number
  sort_order?: number
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Verify the user owns the post
  const { data: post } = await supabase
    .from('posts')
    .select('id, author_id')
    .eq('id', formData.post_id)
    .single()

  if (!post || post.author_id !== user.id) {
    return { error: 'Not authorized to add media to this post' }
  }

  const { data, error } = await supabase
    .from('post_media')
    .insert({
      post_id: formData.post_id,
      storage_path: formData.storage_path,
      file_name: formData.file_name,
      file_size: formData.file_size,
      mime_type: formData.mime_type,
      media_type: formData.media_type,
      width: formData.width || null,
      height: formData.height || null,
      duration_seconds: formData.duration_seconds || null,
      frame_count: formData.frame_count || null,
      fps: formData.fps || null,
      sort_order: formData.sort_order || 0,
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  // Update media count
  const { count } = await supabase
    .from('post_media')
    .select('id', { count: 'exact', head: true })
    .eq('post_id', formData.post_id)

  await supabase
    .from('posts')
    .update({ media_count: count || 0 })
    .eq('id', formData.post_id)

  revalidatePath('/pulse')
  return { data }
}

export async function deletePostMedia(mediaId: number) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Get media info to find the post and storage path
  const { data: media } = await supabase
    .from('post_media')
    .select('id, post_id, storage_path')
    .eq('id', mediaId)
    .single()

  if (!media) {
    return { error: 'Media not found' }
  }

  // Verify ownership via post
  const { data: post } = await supabase
    .from('posts')
    .select('author_id')
    .eq('id', media.post_id)
    .single()

  if (!post || post.author_id !== user.id) {
    return { error: 'Not authorized' }
  }

  // Delete from storage
  await supabase.storage.from('post-media').remove([media.storage_path])

  // Delete the record
  const { error } = await supabase
    .from('post_media')
    .delete()
    .eq('id', mediaId)

  if (error) {
    return { error: error.message }
  }

  // Update media count
  const { count } = await supabase
    .from('post_media')
    .select('id', { count: 'exact', head: true })
    .eq('post_id', media.post_id)

  await supabase
    .from('posts')
    .update({ media_count: count || 0 })
    .eq('id', media.post_id)

  revalidatePath('/pulse')
  return { success: true }
}
