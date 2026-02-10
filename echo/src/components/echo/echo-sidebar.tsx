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

export function EchoSidebar({
  conversations,
  dmDisplayNames,
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
                  return (
                    <Link
                      key={conv.id}
                      href={`/echo/${conv.id}`}
                      className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition ${
                        isActive
                          ? 'border-l-2 border-amber-400 bg-zinc-800 pl-1.5 text-zinc-100'
                          : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
                      }`}
                    >
                      <Hash className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                      <span className="truncate">{conv.name}</span>
                      {conv.project && (
                        <span className="ml-auto shrink-0 rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-500">
                          {conv.project.code}
                        </span>
                      )}
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
                  const initial = displayName.charAt(0).toUpperCase()
                  const colorClass = getAvatarColor(displayName)
                  return (
                    <Link
                      key={conv.id}
                      href={`/echo/${conv.id}`}
                      className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition ${
                        isActive
                          ? 'border-l-2 border-amber-400 bg-zinc-800 pl-1.5 text-zinc-100'
                          : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
                      }`}
                    >
                      <div
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-medium text-white ${colorClass}`}
                      >
                        {initial}
                      </div>
                      <span className="truncate">{displayName}</span>
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
