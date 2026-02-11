'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Hash, MessageCircle, Search, Plus } from 'lucide-react'
import { NewDmDialog } from '@/components/echo/new-dm-dialog'
import { NewChannelDialog } from '@/components/echo/new-channel-dialog'

interface Conversation {
  id: number
  type: 'channel' | 'dm'
  name: string | null
  project_id: number | null
  project?: { id: number; code: string; name: string } | null
}

interface EchoSidebarProps {
  conversations: Conversation[]
  dmDisplayNames: Record<number, string>
  conversationMeta?: Record<number, any>
  currentUserId: string
  onRefresh: () => void
}

const avatarColors = [
  'bg-amber-600',
  'bg-blue-600',
  'bg-emerald-600',
  'bg-purple-600',
  'bg-rose-600',
  'bg-cyan-600',
  'bg-orange-600',
  'bg-indigo-600',
]

function getAvatarColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return avatarColors[Math.abs(hash) % avatarColors.length]
}

function formatRelativeShort(d: Date) {
  const diffSec = Math.max(0, Math.round((Date.now() - d.getTime()) / 1000))
  if (diffSec < 60) return 'now'
  const diffMin = Math.round(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m`
  const diffHr = Math.round(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h`
  const diffDay = Math.round(diffHr / 24)
  if (diffDay < 7) return `${diffDay}d`
  const diffWk = Math.round(diffDay / 7)
  if (diffWk < 5) return `${diffWk}w`
  const diffMo = Math.round(diffDay / 30)
  if (diffMo < 12) return `${diffMo}mo`
  const diffYr = Math.round(diffDay / 365)
  return `${diffYr}y`
}

function cleanPreviewText(input: unknown) {
  if (typeof input !== 'string') return ''
  return input.replace(/\s+/g, ' ').trim()
}

export function EchoSidebar({
  conversations,
  dmDisplayNames,
  conversationMeta = {},
  currentUserId,
  onRefresh,
}: EchoSidebarProps) {
  const pathname = usePathname()
  const [search, setSearch] = useState('')
  const [showNewDm, setShowNewDm] = useState(false)
  const [showNewChannel, setShowNewChannel] = useState(false)

  const channels = conversations.filter((c) => c.type === 'channel')
  const dms = conversations.filter((c) => c.type === 'dm')

  const filterBySearch = (conv: Conversation) => {
    if (!search) return true
    const q = search.toLowerCase()
    if (conv.type === 'channel') {
      return conv.name?.toLowerCase().includes(q)
    }
    const displayName = dmDisplayNames[conv.id] || ''
    return displayName.toLowerCase().includes(q)
  }

  const filteredChannels = channels.filter(filterBySearch)
  const filteredDms = dms.filter(filterBySearch)

  return (
    <>
      <NewDmDialog
        open={showNewDm}
        onOpenChange={(open) => {
          setShowNewDm(open)
          if (!open) onRefresh()
        }}
        currentUserId={currentUserId}
      />
      <NewChannelDialog
        open={showNewChannel}
        onOpenChange={(open) => {
          setShowNewChannel(open)
          if (!open) onRefresh()
        }}
        currentUserId={currentUserId}
      />

      <aside className="flex w-80 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
          <h2 className="text-sm font-semibold text-zinc-100">Messages</h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowNewChannel(true)}
              className="rounded-md p-1.5 text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-200"
              title="New Channel"
            >
              <Hash className="h-4 w-4" />
            </button>
            <button
              onClick={() => setShowNewDm(true)}
              className="rounded-md p-1.5 text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-200"
              title="New DM"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 py-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations..."
              className="w-full rounded-md border border-zinc-800 bg-zinc-900 py-2 pl-8 pr-3 text-xs text-zinc-100 placeholder-zinc-500 focus:border-zinc-600 focus:outline-none"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto px-2">
          {/* Channels */}
          <div className="mb-3">
            <h3 className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Channels
            </h3>
            {filteredChannels.length === 0 ? (
              <p className="px-2 text-xs text-zinc-600">No channels</p>
            ) : (
              <div className="space-y-0.5">
                {filteredChannels.map((conv) => {
                  const isActive = pathname === `/echo/${conv.id}`
                  const meta = conversationMeta[conv.id] || {}
                  const last = meta.lastMessage || null
                  const lastAt = last?.created_at ? new Date(last.created_at) : null
                  const timeLabel = lastAt ? formatRelativeShort(lastAt) : ''
                  const unread = !!meta.unread && !isActive
                  const preview = last
                    ? `${last.author_id === currentUserId ? 'You' : (last.author?.display_name || last.author?.email || 'Someone')}: ${cleanPreviewText(last.content)}`
                    : 'No messages yet'
                  return (
                    <Link
                      key={conv.id}
                      href={`/echo/${conv.id}`}
                      className={`rounded-md px-2 py-2 text-sm transition ${
                        isActive
                          ? 'border-l-2 border-amber-400 bg-zinc-800 pl-1.5 text-zinc-100'
                          : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Hash className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                        <span className="min-w-0 flex-1 truncate font-medium">{conv.name}</span>
                        {conv.project && (
                          <span className="shrink-0 rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-500">
                            {conv.project.code}
                          </span>
                        )}
                        {timeLabel && (
                          <span className="shrink-0 text-[10px] font-medium text-zinc-600">
                            {timeLabel}
                          </span>
                        )}
                        {unread && (
                          <span
                            className="h-2 w-2 shrink-0 rounded-full bg-amber-400"
                            aria-label="Unread"
                          />
                        )}
                      </div>
                      <p className="mt-0.5 line-clamp-1 pl-[22px] text-[11px] text-zinc-600">
                        {preview}
                      </p>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          {/* Direct Messages */}
          <div>
            <h3 className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Direct Messages
            </h3>
            {filteredDms.length === 0 ? (
              <p className="px-2 text-xs text-zinc-600">No messages</p>
            ) : (
              <div className="space-y-0.5">
                {filteredDms.map((conv) => {
                  const isActive = pathname === `/echo/${conv.id}`
                  const displayName = dmDisplayNames[conv.id] || 'Direct Message'
                  const meta = conversationMeta[conv.id] || {}
                  const last = meta.lastMessage || null
                  const lastAt = last?.created_at ? new Date(last.created_at) : null
                  const timeLabel = lastAt ? formatRelativeShort(lastAt) : ''
                  const unread = !!meta.unread && !isActive
                  const preview = last
                    ? last.author_id === currentUserId
                      ? `You: ${cleanPreviewText(last.content)}`
                      : cleanPreviewText(last.content)
                    : 'No messages yet'
                  const initial = displayName.charAt(0).toUpperCase()
                  const colorClass = getAvatarColor(displayName)
                  return (
                    <Link
                      key={conv.id}
                      href={`/echo/${conv.id}`}
                      className={`rounded-md px-2 py-2 text-sm transition ${
                        isActive
                          ? 'border-l-2 border-amber-400 bg-zinc-800 pl-1.5 text-zinc-100'
                          : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-medium text-white ${colorClass}`}
                        >
                          {initial}
                        </div>
                        <span className="min-w-0 flex-1 truncate font-medium">
                          {displayName}
                        </span>
                        {timeLabel && (
                          <span className="shrink-0 text-[10px] font-medium text-zinc-600">
                            {timeLabel}
                          </span>
                        )}
                        {unread && (
                          <span
                            className="h-2 w-2 shrink-0 rounded-full bg-amber-400"
                            aria-label="Unread"
                          />
                        )}
                      </div>
                      <p className="mt-0.5 line-clamp-1 pl-[32px] text-[11px] text-zinc-600">
                        {preview}
                      </p>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}
