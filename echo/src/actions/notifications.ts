'use server'

import { createClient } from '@/lib/supabase/server'

export async function getMyNotifications(options?: {
  unreadOnly?: boolean
  limit?: number
  offset?: number
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const limit = options?.limit ?? 50
  const offset = options?.offset ?? 0

  let query = supabase
    .from('notifications')
    .select(`
      *,
      actor:profiles!notifications_actor_id_fkey(id, display_name, avatar_url)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (options?.unreadOnly) {
    query = query.is('read_at', null)
  }

  const { data, error } = await query

  if (error) return { error: error.message }
  return { data: data || [] }
}

export async function markNotificationRead(notificationId: number) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  return { success: true }
}

export async function markAllNotificationsRead() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .is('read_at', null)

  if (error) return { error: error.message }
  return { success: true }
}

export async function getUnreadNotificationCount(): Promise<number> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return 0

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('read_at', null)

    if (error) return 0
    return count ?? 0
  } catch {
    return 0
  }
}
