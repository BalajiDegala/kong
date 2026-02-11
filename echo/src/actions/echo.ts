'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

// =============================================================================
// DATA FETCHING (service client — bypasses RLS)
// =============================================================================

export async function fetchConversations() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated', data: null }

  const service = createServiceClient()

  // Get user's conversation IDs + read state
  const { data: memberships, error: membershipsError } = await service
    .from('conversation_members')
    .select('conversation_id, last_read_at')
    .eq('user_id', user.id)

  if (membershipsError) {
    return { error: membershipsError.message, data: null }
  }

  if (!memberships || memberships.length === 0) {
    return {
      data: {
        conversations: [],
        dmDisplayNames: {},
        conversationMeta: {},
        userId: user.id,
      },
    }
  }

  const convIds = memberships.map((m) => m.conversation_id)

  // Fetch conversations
  const { data: conversations } = await service
    .from('conversations')
    .select('id, type, name, project_id, created_by, created_at, updated_at, project:projects(id, code, name)')
    .in('id', convIds)
    .order('updated_at', { ascending: false })

  // Fetch last message per conversation (best-effort)
  const lastMessages = await Promise.all(
    convIds.map(async (convId) => {
      const { data } = await service
        .from('messages')
        .select('id, conversation_id, author_id, content, created_at, updated_at')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      return data || null
    })
  )

  const lastMessageByConversationId: Record<number, any> = {}
  for (const m of lastMessages) {
    if (m?.conversation_id != null) lastMessageByConversationId[m.conversation_id] = m
  }

  const lastAuthorIds = [
    ...new Set(
      lastMessages
        .filter((m) => !!m?.author_id)
        .map((m) => m!.author_id)
    ),
  ]

  let lastAuthorProfilesMap: Record<string, any> = {}
  if (lastAuthorIds.length > 0) {
    const { data: profiles } = await service
      .from('profiles')
      .select('id, display_name, email, avatar_url')
      .in('id', lastAuthorIds)

    for (const p of profiles || []) {
      lastAuthorProfilesMap[p.id] = p
    }
  }

  const membershipByConversationId: Record<number, any> = {}
  for (const m of memberships) {
    membershipByConversationId[m.conversation_id] = m
  }

  const conversationMeta: Record<number, any> = {}
  for (const convId of convIds) {
    const membership = membershipByConversationId[convId]
    const lastMessage = lastMessageByConversationId[convId] || null
    const lastReadAt = membership?.last_read_at || null

    const unread = (() => {
      if (!lastMessage) return false
      if (lastMessage.author_id === user.id) return false
      if (!lastReadAt) return true
      return new Date(lastMessage.created_at).getTime() > new Date(lastReadAt).getTime()
    })()

    conversationMeta[convId] = {
      lastReadAt,
      unread,
      lastMessage: lastMessage
        ? {
            ...lastMessage,
            author: lastAuthorProfilesMap[lastMessage.author_id] || null,
          }
        : null,
    }
  }

  // Build DM display names — fetch profiles separately to avoid FK join issues
  const dmDisplayNames: Record<number, string> = {}
  const dmConvs = (conversations || []).filter((c) => c.type === 'dm')

  if (dmConvs.length > 0) {
    const dmIds = dmConvs.map((c) => c.id)

    // Get all members of DM conversations
    const { data: allDmMembers } = await service
      .from('conversation_members')
      .select('conversation_id, user_id')
      .in('conversation_id', dmIds)

    // Get all unique user IDs for profile lookup
    const otherUserIds = [
      ...new Set(
        (allDmMembers || [])
          .filter((m) => m.user_id !== user.id)
          .map((m) => m.user_id)
      ),
    ]

    let profilesMap: Record<string, any> = {}
    if (otherUserIds.length > 0) {
      const { data: profiles } = await service
        .from('profiles')
        .select('id, display_name, email')
        .in('id', otherUserIds)

      for (const p of profiles || []) {
        profilesMap[p.id] = p
      }
    }

    for (const conv of dmConvs) {
      const others = (allDmMembers || [])
        .filter((m) => m.conversation_id === conv.id && m.user_id !== user.id)
      dmDisplayNames[conv.id] = others
        .map((m) => {
          const p = profilesMap[m.user_id]
          return p?.display_name || p?.email || 'Unknown'
        })
        .join(', ') || 'Direct Message'
    }
  }

  return {
    data: {
      conversations: conversations || [],
      dmDisplayNames,
      conversationMeta,
      userId: user.id,
    },
  }
}

export async function fetchConversationData(conversationId: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated', data: null }

  const service = createServiceClient()

  // Verify membership
  const { data: membership } = await service
    .from('conversation_members')
    .select('id')
    .eq('conversation_id', conversationId)
    .eq('user_id', user.id)
    .single()

  if (!membership) return { error: 'Not a member', data: null }

  // Fetch conversation, messages, members in parallel
  const [convResult, msgsResult, memsResult] = await Promise.all([
    service
      .from('conversations')
      .select('*, project:projects(id, code, name)')
      .eq('id', conversationId)
      .single(),
    service
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true }),
    service
      .from('conversation_members')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('joined_at'),
  ])

  const messages = msgsResult.data || []
  const memberRows = memsResult.data || []

  // Fetch profiles for all unique user IDs (message authors + members)
  const allUserIds = [
    ...new Set([
      ...messages.map((m) => m.author_id),
      ...memberRows.map((m) => m.user_id),
    ]),
  ]

  let profilesMap: Record<string, any> = {}
  if (allUserIds.length > 0) {
    const { data: profiles } = await service
      .from('profiles')
      .select('id, display_name, email, avatar_url')
      .in('id', allUserIds)

    for (const p of profiles || []) {
      profilesMap[p.id] = p
    }
  }

  // Attach author profiles to messages
  const messagesWithAuthor = messages.map((m) => ({
    ...m,
    author: profilesMap[m.author_id] || null,
  }))

  // Attach profiles to members
  const membersWithProfile = memberRows.map((m) => ({
    ...m,
    profile: profilesMap[m.user_id] || null,
  }))

  return {
    data: {
      conversation: convResult.data,
      messages: messagesWithAuthor,
      members: membersWithProfile,
      userId: user.id,
    },
  }
}

// =============================================================================
// MUTATIONS
// =============================================================================

export async function createConversation(formData: {
  type: 'channel' | 'dm'
  name?: string
  project_id?: number
  member_ids: string[]
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Use service client to bypass RLS for conversation+member creation
  // (chicken-and-egg: can't add members until conversation exists,
  //  but RLS blocks seeing the conversation until user is a member)
  const service = createServiceClient()

  // Create the conversation
  const { data: conversation, error: convError } = await service
    .from('conversations')
    .insert({
      type: formData.type,
      name: formData.name || null,
      project_id: formData.project_id || null,
      created_by: user.id,
    })
    .select()
    .single()

  if (convError) {
    return { error: convError.message }
  }

  // Add creator as owner + other members
  const members = [
    { conversation_id: conversation.id, user_id: user.id, role: 'owner' },
    ...formData.member_ids
      .filter((id) => id !== user.id)
      .map((id) => ({
        conversation_id: conversation.id,
        user_id: id,
        role: 'member' as const,
      })),
  ]

  const { error: membersError } = await service
    .from('conversation_members')
    .insert(members)

  if (membersError) {
    return { error: membersError.message }
  }

  revalidatePath('/echo')
  return { data: conversation }
}

export async function sendMessage(formData: {
  conversation_id: number
  content: string
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Use service client to bypass RLS for message insertion
  const service = createServiceClient()

  // Verify user is a member first
  const { data: membership } = await service
    .from('conversation_members')
    .select('id')
    .eq('conversation_id', formData.conversation_id)
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    return { error: 'Not a member of this conversation' }
  }

  const { data, error } = await service
    .from('messages')
    .insert({
      conversation_id: formData.conversation_id,
      author_id: user.id,
      content: formData.content,
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  // Best-effort: bump conversation activity + mark sender as read.
  // We don't fail the send if these updates error out.
  const now = new Date().toISOString()
  await Promise.all([
    service.from('conversations').update({ updated_at: now }).eq('id', formData.conversation_id),
    service
      .from('conversation_members')
      .update({ last_read_at: now })
      .eq('conversation_id', formData.conversation_id)
      .eq('user_id', user.id),
  ])

  return { data }
}

export async function markConversationRead(conversationId: number) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated', data: null }
  }

  const service = createServiceClient()
  const now = new Date().toISOString()

  const { data, error } = await service
    .from('conversation_members')
    .update({ last_read_at: now })
    .eq('conversation_id', conversationId)
    .eq('user_id', user.id)
    .select('conversation_id, last_read_at')
    .maybeSingle()

  if (error) {
    return { error: error.message, data: null }
  }

  return { data: data || { conversation_id: conversationId, last_read_at: now } }
}

export async function updateMessage(formData: { message_id: number; content: string }) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated', data: null }
  }

  const trimmed = formData.content.trim()
  if (!trimmed) {
    return { error: 'Message content cannot be empty', data: null }
  }

  const service = createServiceClient()

  const { data: existing, error: existingError } = await service
    .from('messages')
    .select('id, author_id')
    .eq('id', formData.message_id)
    .maybeSingle()

  if (existingError) {
    return { error: existingError.message, data: null }
  }

  if (!existing) {
    return { error: 'Message not found', data: null }
  }

  if (existing.author_id !== user.id) {
    return { error: 'Not allowed', data: null }
  }

  const { data, error } = await service
    .from('messages')
    .update({ content: trimmed })
    .eq('id', formData.message_id)
    .select('*')
    .maybeSingle()

  if (error) {
    return { error: error.message, data: null }
  }

  return { data }
}

export async function deleteMessage(messageId: number) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated', data: null }
  }

  const service = createServiceClient()

  const { data: existing, error: existingError } = await service
    .from('messages')
    .select('id, author_id')
    .eq('id', messageId)
    .maybeSingle()

  if (existingError) {
    return { error: existingError.message, data: null }
  }

  if (!existing) {
    return { error: 'Message not found', data: null }
  }

  if (existing.author_id !== user.id) {
    return { error: 'Not allowed', data: null }
  }

  const { data, error } = await service
    .from('messages')
    .delete()
    .eq('id', messageId)
    .select('id')
    .maybeSingle()

  if (error) {
    return { error: error.message, data: null }
  }

  return { data }
}

export async function getOrCreateDM(otherUserIds: string[]) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const allMemberIds = [user.id, ...otherUserIds].sort()

  // Use service client to query without RLS issues
  const service = createServiceClient()

  // Find all DM conversations the user is in
  const { data: myMemberships, error: queryError } = await service
    .from('conversation_members')
    .select('conversation_id')
    .eq('user_id', user.id)

  if (queryError) {
    return { error: queryError.message }
  }

  const convIds = (myMemberships || []).map((m) => m.conversation_id)

  if (convIds.length > 0) {
    // Get DM conversations from those IDs
    const { data: dmConvs } = await service
      .from('conversations')
      .select('id')
      .in('id', convIds)
      .eq('type', 'dm')

    const dmIds = (dmConvs || []).map((c) => c.id)

    // Check each DM to see if it has exactly the right members
    for (const convId of dmIds) {
      const { data: members } = await service
        .from('conversation_members')
        .select('user_id')
        .eq('conversation_id', convId)

      if (members) {
        const memberIds = members.map((m) => m.user_id).sort()
        if (
          memberIds.length === allMemberIds.length &&
          memberIds.every((id: string, i: number) => id === allMemberIds[i])
        ) {
          return { data: { id: convId } }
        }
      }
    }
  }

  // No existing DM found — create one
  return createConversation({
    type: 'dm',
    member_ids: otherUserIds,
  })
}
