'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getOrCreateDM } from '@/actions/echo'
import { getAllProfiles } from '@/lib/supabase/queries'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { MessageCircle, Search, User } from 'lucide-react'

interface NewDmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentUserId: string
}

export function NewDmDialog({ open, onOpenChange, currentUserId }: NewDmDialogProps) {
  const router = useRouter()
  const [profiles, setProfiles] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    if (open) {
      loadProfiles()
    }
  }, [open])

  async function loadProfiles() {
    setIsLoading(true)
    try {
      const supabase = createClient()
      const data = await getAllProfiles(supabase)
      setProfiles((data || []).filter((p: any) => p.id !== currentUserId))
    } catch (err) {
      console.error('Failed to load profiles:', err)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSelectUser(userId: string) {
    setIsCreating(true)
    const result = await getOrCreateDM([userId])
    setIsCreating(false)

    if (result.data) {
      onOpenChange(false)
      router.push(`/echo/${result.data.id}`)
    }
  }

  const filtered = profiles.filter((p) => {
    const q = search.toLowerCase()
    return (
      p.display_name?.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q)
    )
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <MessageCircle className="h-5 w-5" />
            New Direct Message
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Select a user to start a conversation.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users..."
            className="w-full rounded-md border border-border bg-accent py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none"
          />
        </div>

        <div className="max-h-64 overflow-auto">
          {isLoading ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Loading...</p>
          ) : filtered.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No users found</p>
          ) : (
            <div className="space-y-0.5">
              {filtered.map((profile) => (
                <button
                  key={profile.id}
                  onClick={() => handleSelectUser(profile.id)}
                  disabled={isCreating}
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition hover:bg-accent disabled:opacity-50"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary">
                    {profile.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt=""
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <User className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {profile.display_name || profile.email}
                    </p>
                    {profile.display_name && (
                      <p className="truncate text-xs text-muted-foreground">{profile.email}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
