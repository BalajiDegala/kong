'use client'

import { useEffect, useState, useCallback } from 'react'
import { CheckCheck, Filter, Inbox as InboxIcon } from 'lucide-react'
import { getMyNotifications, markNotificationRead, markAllNotificationsRead } from '@/actions/notifications'
import { NotificationListItem } from '@/components/inbox/notification-list-item'
import { NotificationDetail } from '@/components/inbox/notification-detail'

type Notification = {
  id: number
  type: string
  title: string
  body?: string | null
  entity_type?: string | null
  entity_id?: number | null
  project_id?: number | null
  read_at: string | null
  created_at: string
  metadata?: Record<string, unknown> | null
  actor?: {
    id: string
    display_name: string | null
    avatar_url: string | null
  } | null
}

export default function InboxPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    const result = await getMyNotifications({
      unreadOnly: filter === 'unread',
      limit: 100,
    })
    if (result.data) {
      setNotifications(result.data)
    }
    setLoading(false)
  }, [filter])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const selected = notifications.find((n) => n.id === selectedId) ?? null

  const handleSelect = async (notification: Notification) => {
    setSelectedId(notification.id)
    if (!notification.read_at) {
      await markNotificationRead(notification.id)
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notification.id ? { ...n, read_at: new Date().toISOString() } : n
        )
      )
    }
  }

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead()
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
    )
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-3">
        <h1 className="text-xl font-bold text-zinc-100">Inbox</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-zinc-400 transition hover:bg-zinc-900 hover:text-zinc-200"
          >
            <CheckCheck className="h-4 w-4" />
            Mark All Read
          </button>
          <div className="flex items-center gap-1 rounded-md border border-zinc-800 p-0.5">
            <button
              onClick={() => setFilter('all')}
              className={`rounded px-3 py-1 text-sm transition ${
                filter === 'all'
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`rounded px-3 py-1 text-sm transition ${
                filter === 'unread'
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Unread
            </button>
          </div>
        </div>
      </div>

      {/* Two-pane layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left pane — notification list */}
        <div className="w-[400px] shrink-0 overflow-y-auto border-r border-zinc-800">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-zinc-400">Loading...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <InboxIcon className="mb-3 h-10 w-10 text-zinc-700" />
              <p className="text-sm font-medium text-zinc-300">You&apos;re all caught up!</p>
              <p className="mt-1 text-xs text-zinc-500">No notifications to show.</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <NotificationListItem
                key={notification.id}
                notification={notification}
                isSelected={selectedId === notification.id}
                onClick={() => handleSelect(notification)}
              />
            ))
          )}
        </div>

        {/* Right pane — detail view */}
        <div className="flex-1 overflow-y-auto">
          {selected ? (
            <NotificationDetail notification={selected} />
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <InboxIcon className="mb-3 h-10 w-10 text-zinc-700" />
              <p className="text-sm text-zinc-400">
                Select a notification to view details
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
