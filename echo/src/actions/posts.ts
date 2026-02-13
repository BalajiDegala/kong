'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createPost(formData: {
  content: string
  content_html?: string
  projectIds?: number[]
  sequenceIds?: number[]
  shotIds?: number[]
  taskIds?: number[]
  userIds?: string[]
  visibility?: 'global' | 'project'
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const hasEntityAssociations =
    (formData.projectIds?.length ?? 0) > 0 ||
    (formData.sequenceIds?.length ?? 0) > 0 ||
    (formData.shotIds?.length ?? 0) > 0 ||
    (formData.taskIds?.length ?? 0) > 0 ||
    (formData.userIds?.length ?? 0) > 0

  const visibility = hasEntityAssociations ? 'project' : 'global'

  // Create the post
  const { data, error } = await supabase
    .from('posts')
    .insert({
      author_id: user.id,
      content: formData.content,
      content_html: formData.content_html || null,
      visibility: formData.visibility || visibility,
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  // Create entity associations in junction tables
  if (data) {
    const postId = data.id

    // Insert project associations
    if (formData.projectIds && formData.projectIds.length > 0) {
      const projectAssociations = formData.projectIds.map((projectId) => ({
        post_id: postId,
        project_id: projectId,
      }))
      await supabase.from('post_projects').insert(projectAssociations)
    }

    // Insert sequence associations
    if (formData.sequenceIds && formData.sequenceIds.length > 0) {
      const sequenceAssociations = formData.sequenceIds.map((sequenceId) => ({
        post_id: postId,
        sequence_id: sequenceId,
      }))
      await supabase.from('post_sequences').insert(sequenceAssociations)
    }

    // Insert shot associations
    if (formData.shotIds && formData.shotIds.length > 0) {
      const shotAssociations = formData.shotIds.map((shotId) => ({
        post_id: postId,
        shot_id: shotId,
      }))
      await supabase.from('post_shots').insert(shotAssociations)
    }

    // Insert task associations
    if (formData.taskIds && formData.taskIds.length > 0) {
      const taskAssociations = formData.taskIds.map((taskId) => ({
        post_id: postId,
        task_id: taskId,
      }))
      await supabase.from('post_tasks').insert(taskAssociations)
    }

    // Insert user mentions/assignments
    if (formData.userIds && formData.userIds.length > 0) {
      const userAssociations = formData.userIds.map((userId) => ({
        post_id: postId,
        user_id: userId,
      }))
      await supabase.from('post_users').insert(userAssociations)
    }
  }

  revalidatePath('/pulse')
  return { data }
}

export async function updatePost(
  postId: number,
  formData: {
    content?: string
    content_html?: string
  }
) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { data, error } = await supabase
    .from('posts')
    .update({
      content: formData.content,
      content_html: formData.content_html,
    })
    .eq('id', postId)
    .eq('author_id', user.id)
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/pulse')
  return { data }
}

export async function deletePost(postId: number) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', postId)
    .eq('author_id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/pulse')
  return { success: true }
}

export async function toggleReaction(
  reactionType: string,
  target: { post_id?: number; comment_id?: number }
) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Check if reaction already exists
  let query = supabase
    .from('post_reactions')
    .select('id')
    .eq('user_id', user.id)
    .eq('reaction_type', reactionType)

  if (target.post_id) {
    query = query.eq('post_id', target.post_id)
  }
  if (target.comment_id) {
    query = query.eq('comment_id', target.comment_id)
  }

  const { data: existing } = await query.maybeSingle()

  if (existing) {
    // Remove reaction
    const { error } = await supabase
      .from('post_reactions')
      .delete()
      .eq('id', existing.id)

    if (error) {
      return { error: error.message }
    }

    // Update denormalized count
    if (target.post_id) {
      const { count } = await supabase
        .from('post_reactions')
        .select('id', { count: 'exact', head: true })
        .eq('post_id', target.post_id)

      await supabase
        .from('posts')
        .update({ reaction_count: count || 0 })
        .eq('id', target.post_id)
    }

    revalidatePath('/pulse')
    return { data: { action: 'removed' } }
  } else {
    // Add reaction
    const { data, error } = await supabase
      .from('post_reactions')
      .insert({
        user_id: user.id,
        post_id: target.post_id || null,
        comment_id: target.comment_id || null,
        reaction_type: reactionType,
      })
      .select()
      .single()

    if (error) {
      return { error: error.message }
    }

    revalidatePath('/pulse')
    return { data: { action: 'added', reaction: data } }
  }
}

export async function createPostComment(formData: {
  post_id: number
  content: string
  parent_note_id?: number
  project_id?: string
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
      entity_type: 'post',
      entity_id: formData.post_id,
      content: formData.content,
      author_id: user.id,
      created_by: user.id,
      project_id: formData.project_id ? parseInt(formData.project_id) : null,
      parent_note_id: formData.parent_note_id || null,
      status: 'open',
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  // Update denormalized comment count
  await supabase
    .from('posts')
    .update({
      comment_count: (
        await supabase
          .from('notes')
          .select('id', { count: 'exact', head: true })
          .eq('entity_type', 'post')
          .eq('entity_id', formData.post_id)
      ).count || 0,
    })
    .eq('id', formData.post_id)

  revalidatePath('/pulse')
  return { data }
}
