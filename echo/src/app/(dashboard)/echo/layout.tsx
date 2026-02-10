'use client'

import { useEffect, useState, useCallback } from 'react'
import { fetchConversations } from '@/actions/echo'
import { EchoSidebar } from '@/components/echo/echo-sidebar'

export default function EchoLayout({ children }: { children: React.ReactNode }) {
  const [conversations, setConversations] = useState<any[]>([])
  const [dmDisplayNames, setDmDisplayNames] = useState<Record<number, string>>({})
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)

  const loadData = useCallback(async () => {
    try {
      const result = await fetchConversations()
      if (result.data) {
        setConversations(result.data.conversations)
        setDmDisplayNames(result.data.dmDisplayNames)
        setCurrentUserId(result.data.userId)
      }
    } catch (err) {
      console.error('Failed to load conversations:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  return (
    <div className="flex h-full overflow-hidden">
      {isLoading ? (
        <div className="flex w-80 shrink-0 items-center justify-center border-r border-zinc-800 bg-zinc-950">
          <p className="text-xs text-zinc-500">Loading...</p>
        </div>
      ) : (
        <EchoSidebar
          conversations={conversations}
          dmDisplayNames={dmDisplayNames}
          currentUserId={currentUserId}
          onRefresh={loadData}
        />
      )}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  )
}
