/**
 * Reusable Supabase query functions for the Kong platform
 * These functions provide type-safe database queries with proper error handling
 */

import { SupabaseClient } from '@supabase/supabase-js'

// =============================================================================
// PROFILE QUERIES
// =============================================================================

export async function getProfile(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) throw error
  return data
}

export async function getAllProfiles(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('active', true)
    .order('display_name')

  if (error) throw error
  return data
}

// =============================================================================
// PROJECT QUERIES
// =============================================================================

export async function getUserProjects(supabase: SupabaseClient, userId: string) {
  // Simplified version to avoid RLS infinite recursion
  // TODO: Fix RLS policies and restore project_members join
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function getProject(supabase: SupabaseClient, projectId: number) {
  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      created_by_profile:profiles!projects_created_by_fkey(id, display_name, avatar_url)
    `)
    .eq('id', projectId)
    .single()

  if (error) throw error
  return data
}

export async function getProjectMembers(supabase: SupabaseClient, projectId: number) {
  const { data, error } = await supabase
    .from('project_members')
    .select(`
      *,
      profile:profiles(id, display_name, email, avatar_url, department)
    `)
    .eq('project_id', projectId)
    .order('role', { ascending: false })

  if (error) throw error
  return data
}

// =============================================================================
// ASSET QUERIES
// =============================================================================

export async function getProjectAssets(
  supabase: SupabaseClient,
  projectId: number,
  options?: {
    assetType?: string
    status?: string
    limit?: number
  }
) {
  let query = supabase
    .from('assets')
    .select(`
      *,
      created_by_profile:profiles!assets_created_by_fkey(id, display_name, avatar_url)
    `)
    .eq('project_id', projectId)

  if (options?.assetType) {
    query = query.eq('asset_type', options.assetType)
  }

  if (options?.status) {
    query = query.eq('status', options.status)
  }

  if (options?.limit) {
    query = query.limit(options.limit)
  }

  query = query.order('created_at', { ascending: false })

  const { data, error } = await query

  if (error) throw error
  return data
}

export async function getAsset(supabase: SupabaseClient, assetId: number) {
  const { data, error } = await supabase
    .from('assets')
    .select(`
      *,
      project:projects(id, code, name),
      created_by_profile:profiles!assets_created_by_fkey(id, display_name, avatar_url)
    `)
    .eq('id', assetId)
    .single()

  if (error) throw error
  return data
}

// =============================================================================
// SHOT QUERIES
// =============================================================================

export async function getProjectShots(
  supabase: SupabaseClient,
  projectId: number,
  options?: {
    sequenceId?: number
    status?: string
    limit?: number
  }
) {
  let query = supabase
    .from('shots')
    .select(`
      *,
      sequence:sequences(id, code, name),
      created_by_profile:profiles!shots_created_by_fkey(id, display_name, avatar_url)
    `)
    .eq('project_id', projectId)

  if (options?.sequenceId) {
    query = query.eq('sequence_id', options.sequenceId)
  }

  if (options?.status) {
    query = query.eq('status', options.status)
  }

  if (options?.limit) {
    query = query.limit(options.limit)
  }

  query = query.order('code')

  const { data, error } = await query

  if (error) throw error
  return data
}

export async function getProjectSequences(
  supabase: SupabaseClient,
  projectId: number
) {
  const { data, error } = await supabase
    .from('sequences')
    .select('*')
    .eq('project_id', projectId)
    .order('code')

  if (error) throw error
  return data
}

// =============================================================================
// TASK QUERIES
// =============================================================================

export async function getProjectTasks(
  supabase: SupabaseClient,
  projectId: number,
  options?: {
    status?: string
    assignedTo?: string
    entityType?: string
    entityId?: number
    limit?: number
  }
) {
  let query = supabase
    .from('tasks')
    .select(`
      *,
      step:steps(id, code, name, color),
      created_by_profile:profiles!tasks_created_by_fkey(id, display_name, avatar_url),
      task_assignments(
        user:profiles(id, display_name, email, avatar_url)
      )
    `)
    .eq('project_id', projectId)

  if (options?.status) {
    query = query.eq('status', options.status)
  }

  if (options?.entityType) {
    query = query.eq('entity_type', options.entityType)
  }

  if (options?.entityId) {
    query = query.eq('entity_id', options.entityId)
  }

  if (options?.limit) {
    query = query.limit(options.limit)
  }

  query = query.order('created_at', { ascending: false })

  const { data, error } = await query

  if (error) throw error
  return data
}

export async function getTask(supabase: SupabaseClient, taskId: number) {
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      project:projects(id, code, name),
      step:steps(id, code, name, color),
      created_by_profile:profiles!tasks_created_by_fkey(id, display_name, avatar_url),
      task_assignments(
        user:profiles(id, display_name, email, avatar_url, department)
      )
    `)
    .eq('id', taskId)
    .single()

  if (error) throw error
  return data
}

export async function getUserTasks(
  supabase: SupabaseClient,
  userId: string,
  options?: {
    status?: string
    limit?: number
  }
) {
  let query = supabase
    .from('task_assignments')
    .select(`
      task:tasks(
        *,
        project:projects(id, code, name),
        step:steps(id, code, name, color)
      )
    `)
    .eq('user_id', userId)

  if (options?.limit) {
    query = query.limit(options.limit)
  }

  const { data, error } = await query

  if (error) throw error
  return data
}

// =============================================================================
// PIPELINE STEPS
// =============================================================================

export async function getSteps(supabase: SupabaseClient, entityType?: 'asset' | 'shot' | 'both') {
  let query = supabase
    .from('steps')
    .select('*')
    .order('sort_order')

  if (entityType) {
    query = query.or(`entity_type.eq.${entityType},entity_type.eq.both`)
  }

  const { data, error } = await query

  if (error) throw error
  return data
}

// =============================================================================
// NOTES QUERIES
// =============================================================================

export async function getEntityNotes(
  supabase: SupabaseClient,
  entityType: string,
  entityId: number
) {
  const { data, error } = await supabase
    .from('notes')
    .select(`
      *,
      author:profiles!notes_author_id_fkey(id, display_name, avatar_url),
      note_mentions(
        user:profiles(id, display_name)
      ),
      attachments(*)
    `)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data
}

export async function getUserMentions(
  supabase: SupabaseClient,
  userId: string,
  unreadOnly = false
) {
  let query = supabase
    .from('note_mentions')
    .select(`
      *,
      note:notes(
        *,
        author:profiles!notes_author_id_fkey(id, display_name, avatar_url),
        project:projects(id, code, name)
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (unreadOnly) {
    query = query.is('read_at', null)
  }

  const { data, error } = await query

  if (error) throw error
  return data
}

// =============================================================================
// VERSION QUERIES
// =============================================================================

export async function getEntityVersions(
  supabase: SupabaseClient,
  entityType: string,
  entityId: number
) {
  const { data, error } = await supabase
    .from('versions')
    .select(`
      *,
      task:tasks(id, name),
      created_by_profile:profiles!versions_created_by_fkey(id, display_name, avatar_url)
    `)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('version_number', { ascending: false })

  if (error) throw error
  return data
}

export async function getProjectVersions(
  supabase: SupabaseClient,
  projectId: number,
  options?: {
    status?: string
    limit?: number
  }
) {
  let query = supabase
    .from('versions')
    .select(`
      *,
      created_by_profile:profiles!versions_created_by_fkey(id, display_name, avatar_url)
    `)
    .eq('project_id', projectId)

  if (options?.status) {
    query = query.eq('status', options.status)
  }

  if (options?.limit) {
    query = query.limit(options.limit)
  }

  query = query.order('created_at', { ascending: false })

  const { data, error } = await query

  if (error) throw error
  return data
}

// =============================================================================
// ACTIVITY QUERIES
// =============================================================================

export async function getProjectActivity(
  supabase: SupabaseClient,
  projectId: number,
  limit = 50
) {
  const { data, error } = await supabase
    .from('activity_events')
    .select(`
      *,
      actor:profiles!activity_events_actor_id_fkey(id, display_name, avatar_url)
    `)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data
}

export async function getUserActivity(
  supabase: SupabaseClient,
  userId: string,
  limit = 50
) {
  const { data, error } = await supabase
    .from('activity_events')
    .select(`
      *,
      project:projects(id, code, name),
      actor:profiles!activity_events_actor_id_fkey(id, display_name, avatar_url)
    `)
    .eq('actor_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data
}

// =============================================================================
// ECHO — CONVERSATION QUERIES
// =============================================================================

export async function getUserConversations(supabase: SupabaseClient, userId: string) {
  // Step 1: get conversation IDs the user belongs to (no join, avoids RLS recursion)
  const { data: memberships, error: memError } = await supabase
    .from('conversation_members')
    .select('conversation_id')
    .eq('user_id', userId)

  if (memError) throw memError
  if (!memberships || memberships.length === 0) return []

  const convIds = memberships.map((m) => m.conversation_id)

  // Step 2: fetch conversations by ID
  const { data, error } = await supabase
    .from('conversations')
    .select(`
      id, type, name, project_id, created_by, created_at, updated_at,
      project:projects(id, code, name)
    `)
    .in('id', convIds)
    .order('updated_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function getConversationMessages(
  supabase: SupabaseClient,
  conversationId: number,
  options?: { limit?: number; before?: string }
) {
  let query = supabase
    .from('messages')
    .select(`
      *,
      author:profiles!messages_author_id_fkey(id, display_name, email, avatar_url)
    `)
    .eq('conversation_id', conversationId)

  if (options?.before) {
    query = query.lt('created_at', options.before)
  }

  query = query.order('created_at', { ascending: true })

  if (options?.limit) {
    query = query.limit(options.limit)
  }

  const { data, error } = await query

  if (error) throw error
  return data
}

export async function getConversationMembers(supabase: SupabaseClient, conversationId: number) {
  const { data, error } = await supabase
    .from('conversation_members')
    .select(`
      *,
      profile:profiles(id, display_name, email, avatar_url)
    `)
    .eq('conversation_id', conversationId)
    .order('joined_at')

  if (error) throw error
  return data
}

// =============================================================================
// PULSE — POST QUERIES
// =============================================================================

export async function getPosts(
  supabase: SupabaseClient,
  options?: {
    projectId?: number
    limit?: number
    offset?: number
  }
) {
  // Two-step query: posts first, then resolve author profiles
  // (posts.author_id FK points to auth.users, not profiles)
  let query = supabase
    .from('posts')
    .select(`
      *,
      project:projects(id, name, code),
      post_media(*),
      post_reactions(reaction_type, user_id)
    `)
    .order('created_at', { ascending: false })

  if (options?.projectId) {
    query = query.eq('project_id', options.projectId)
  }

  if (options?.limit) {
    query = query.limit(options.limit)
  }

  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 20) - 1)
  }

  const { data, error } = await query

  if (error) throw error
  if (!data || data.length === 0) return data || []

  // Resolve author profiles
  const authorIds = [...new Set(data.map((p: any) => p.author_id).filter(Boolean))]
  const profileMap: Record<string, any> = {}

  if (authorIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .in('id', authorIds)

    if (profiles) {
      for (const p of profiles) profileMap[p.id] = p
    }
  }

  return data.map((post: any) => ({
    ...post,
    author: profileMap[post.author_id] || null,
  }))
}

export async function getPostComments(
  supabase: SupabaseClient,
  postId: number
) {
  const { data, error } = await supabase
    .from('notes')
    .select(`
      *,
      author:profiles!notes_author_id_fkey(id, display_name, avatar_url)
    `)
    .eq('entity_type', 'post')
    .eq('entity_id', postId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data
}

export async function getAnnotations(
  supabase: SupabaseClient,
  options: {
    postMediaId?: number
    versionId?: number
    frameNumber?: number
    status?: string
  }
) {
  // Two-step: annotations first, then resolve author profiles
  let query = supabase
    .from('annotations')
    .select('*')
    .order('frame_number', { ascending: true })

  if (options.postMediaId) {
    query = query.eq('post_media_id', options.postMediaId)
  }

  if (options.versionId) {
    query = query.eq('version_id', options.versionId)
  }

  if (options.frameNumber !== undefined) {
    query = query.eq('frame_number', options.frameNumber)
  }

  if (options.status) {
    query = query.eq('status', options.status)
  }

  const { data, error } = await query

  if (error) throw error
  if (!data || data.length === 0) return data || []

  const authorIds = [...new Set(data.map((a: any) => a.author_id).filter(Boolean))]
  const profileMap: Record<string, any> = {}

  if (authorIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .in('id', authorIds)

    if (profiles) {
      for (const p of profiles) profileMap[p.id] = p
    }
  }

  return data.map((ann: any) => ({
    ...ann,
    author: profileMap[ann.author_id] || null,
  }))
}

// =============================================================================
// CONNECTION TEST
// =============================================================================

/**
 * Test database connection and verify schema
 */
export async function testConnection(supabase: SupabaseClient) {
  try {
    // Test 1: Check if steps table exists and has data
    const { data: steps, error: stepsError } = await supabase
      .from('steps')
      .select('count')
      .limit(1)

    if (stepsError) throw new Error(`Steps table error: ${stepsError.message}`)

    // Test 2: Check if profiles table exists
    const { error: profilesError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1)

    if (profilesError) throw new Error(`Profiles table error: ${profilesError.message}`)

    // Test 3: Check if projects table exists
    const { error: projectsError } = await supabase
      .from('projects')
      .select('count')
      .limit(1)

    if (projectsError) throw new Error(`Projects table error: ${projectsError.message}`)

    return {
      success: true,
      message: 'Database connection successful! All core tables are accessible.',
      stepsCount: steps?.[0]?.count || 0
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      error
    }
  }
}
