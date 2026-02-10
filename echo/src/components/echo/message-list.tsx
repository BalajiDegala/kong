'use client'

import { useEffect, useRef } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { User } from 'lucide-react'

interface Message {
  id: number
  content: string
  created_at: string
  author_id: string
  author?: {
    id: string
    display_name: string | null
    email: string | null
    avatar_url: string | null
  } | null
}

interface MessageListProps {
  messages: Message[]
}

export function MessageList({ messages }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-zinc-500">No messages yet. Start the conversation!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto p-4">
      <div className="mx-auto max-w-3xl space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className="group flex gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-800">
              {msg.author?.avatar_url ? (
                <img
                  src={msg.author.avatar_url}
                  alt=""
                  className="h-9 w-9 rounded-full object-cover"
                />
              ) : (
                <User className="h-4 w-4 text-zinc-500" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-medium text-zinc-100">
                  {msg.author?.display_name || msg.author?.email || 'Unknown'}
                </span>
                <span className="text-xs text-zinc-600">
                  {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                </span>
              </div>
              <p className="mt-0.5 whitespace-pre-wrap text-sm text-zinc-300">{msg.content}</p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
