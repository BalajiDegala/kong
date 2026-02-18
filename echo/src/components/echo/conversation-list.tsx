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
        <h3 className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Channels
        </h3>
        {channels.length === 0 ? (
          <p className="px-3 text-sm text-muted-foreground">No channels yet</p>
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
                      ? 'bg-accent text-primary'
                      : 'text-foreground/70 hover:bg-accent/50 hover:text-foreground'
                  }`}
                >
                  <Hash className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{conv.name}</span>
                  {conv.project && (
                    <span className="ml-auto truncate text-xs text-muted-foreground">
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
        <h3 className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Direct Messages
        </h3>
        {dms.length === 0 ? (
          <p className="px-3 text-sm text-muted-foreground">No messages yet</p>
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
                      ? 'bg-accent text-primary'
                      : 'text-foreground/70 hover:bg-accent/50 hover:text-foreground'
                  }`}
                >
                  <MessageCircle className="h-4 w-4 shrink-0 text-muted-foreground" />
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
