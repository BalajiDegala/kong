'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Hash, MessageCircle } from 'lucide-react'

interface Conversation {
  id: number
  type: 'channel' | 'dm'
  name: string | null
  project_id: number | null
  project?: { id: number; code: string; name: string } | null
}

interface ConversationListProps {
  conversations: Conversation[]
  dmDisplayNames: Record<number, string>
}

export function ConversationList({ conversations, dmDisplayNames }: ConversationListProps) {
  const pathname = usePathname()

  const channels = conversations.filter((c) => c.type === 'channel')
  const dms = conversations.filter((c) => c.type === 'dm')

  return (
    <div className="flex flex-col gap-4">
      {/* Channels */}
      <div>
        <h3 className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Channels
        </h3>
        {channels.length === 0 ? (
          <p className="px-3 text-sm text-zinc-600">No channels yet</p>
        ) : (
          <div className="space-y-0.5">
            {channels.map((conv) => {
              const isActive = pathname === `/echo/${conv.id}`
              return (
                <Link
                  key={conv.id}
                  href={`/echo/${conv.id}`}
                  className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition ${
                    isActive
                      ? 'bg-zinc-800 text-amber-400'
                      : 'text-zinc-300 hover:bg-zinc-800/50 hover:text-zinc-100'
                  }`}
                >
                  <Hash className="h-4 w-4 shrink-0 text-zinc-500" />
                  <span className="truncate">{conv.name}</span>
                  {conv.project && (
                    <span className="ml-auto truncate text-xs text-zinc-600">
                      {conv.project.code}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* DMs */}
      <div>
        <h3 className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Direct Messages
        </h3>
        {dms.length === 0 ? (
          <p className="px-3 text-sm text-zinc-600">No messages yet</p>
        ) : (
          <div className="space-y-0.5">
            {dms.map((conv) => {
              const isActive = pathname === `/echo/${conv.id}`
              const displayName = dmDisplayNames[conv.id] || 'Direct Message'
              return (
                <Link
                  key={conv.id}
                  href={`/echo/${conv.id}`}
                  className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition ${
                    isActive
                      ? 'bg-zinc-800 text-amber-400'
                      : 'text-zinc-300 hover:bg-zinc-800/50 hover:text-zinc-100'
                  }`}
                >
                  <MessageCircle className="h-4 w-4 shrink-0 text-zinc-500" />
                  <span className="truncate">{displayName}</span>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
