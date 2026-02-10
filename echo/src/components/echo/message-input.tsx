'use client'

import { useState, useRef, useCallback } from 'react'
import { Send } from 'lucide-react'
import { sendMessage } from '@/actions/echo'

interface MessageInputProps {
  conversationId: number
}

export function MessageInput({ conversationId }: MessageInputProps) {
  const [content, setContent] = useState('')
  const [isSending, setIsSending] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = useCallback(async () => {
    const trimmed = content.trim()
    if (!trimmed || isSending) return

    setIsSending(true)
    setContent('')

    const result = await sendMessage({
      conversation_id: conversationId,
      content: trimmed,
    })

    if (result.error) {
      // Restore content on error
      setContent(trimmed)
      console.error('Failed to send message:', result.error)
    }

    setIsSending(false)
    textareaRef.current?.focus()
  }, [content, conversationId, isSending])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="border-t border-zinc-800 bg-zinc-950 p-4">
      <div className="mx-auto flex max-w-3xl items-end gap-2">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message... (Enter to send, Shift+Enter for newline)"
          rows={1}
          className="flex-1 resize-none rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
          style={{ maxHeight: '150px' }}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement
            target.style.height = 'auto'
            target.style.height = `${Math.min(target.scrollHeight, 150)}px`
          }}
        />
        <button
          onClick={handleSend}
          disabled={!content.trim() || isSending}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-black transition hover:bg-amber-400 disabled:opacity-50 disabled:hover:bg-amber-500"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
