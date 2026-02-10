'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { createConversation } from '@/actions/echo'
import { getUserProjects } from '@/lib/supabase/queries'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Hash } from 'lucide-react'

interface NewChannelDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentUserId: string
}

export function NewChannelDialog({ open, onOpenChange, currentUserId }: NewChannelDialogProps) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [projectId, setProjectId] = useState<string>('')
  const [projects, setProjects] = useState<any[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      loadProjects()
      setName('')
      setProjectId('')
      setError('')
    }
  }, [open])

  async function loadProjects() {
    try {
      const supabase = createClient()
      const data = await getUserProjects(supabase, currentUserId)
      setProjects(data || [])
    } catch (err) {
      console.error('Failed to load projects:', err)
    }
  }

  async function handleCreate() {
    if (!name.trim()) {
      setError('Channel name is required')
      return
    }

    setIsCreating(true)
    setError('')

    const result = await createConversation({
      type: 'channel',
      name: name.trim(),
      project_id: projectId ? parseInt(projectId) : undefined,
      member_ids: [],
    })

    setIsCreating(false)

    if (result.error) {
      setError(result.error)
      return
    }

    if (result.data) {
      onOpenChange(false)
      router.push(`/echo/${result.data.id}`)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-zinc-800 bg-zinc-900 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-zinc-100">
            <Hash className="h-5 w-5" />
            New Channel
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Create a channel for team discussion.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-300">
              Channel Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. general, dailies, review"
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-300">
              Project (optional)
            </label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-zinc-100 focus:border-amber-500/50 focus:outline-none"
            >
              <option value="">No project</option>
              {projects.map((proj) => (
                <option key={proj.id} value={proj.id}>
                  {proj.code} — {proj.name}
                </option>
              ))}
            </select>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            onClick={handleCreate}
            disabled={isCreating || !name.trim()}
            className="w-full rounded-md bg-amber-500 px-4 py-2.5 text-sm font-medium text-black transition hover:bg-amber-400 disabled:opacity-50"
          >
            {isCreating ? 'Creating...' : 'Create Channel'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
