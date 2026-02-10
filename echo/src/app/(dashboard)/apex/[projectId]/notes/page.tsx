'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CreateNoteDialog } from '@/components/apex/create-note-dialog'
import { formatDistanceToNow } from 'date-fns'
import { Plus, MessageSquare, User } from 'lucide-react'

export default function NotesPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const [projectId, setProjectId] = useState<string>('')
  const [notes, setNotes] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  useEffect(() => {
    params.then((p) => {
      setProjectId(p.projectId)
      loadNotes(p.projectId)
    })
  }, [params])

  async function loadNotes(projId: string) {
    try {
      setIsLoading(true)
      const supabase = createClient()

      const { data, error } = await supabase
        .from('notes')
        .select(`
          *,
          created_by_profile:profiles!notes_created_by_fkey(
            full_name,
            email
          )
        `)
        .eq('project_id', projId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading notes:', error)
        setNotes([])
        return
      }

      setNotes(data || [])
    } catch (error) {
      console.error('Error loading notes:', error)
      setNotes([])
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-zinc-400">Loading notes...</p>
      </div>
    )
  }

  return (
    <>
      <CreateNoteDialog
        open={showCreateDialog}
        onOpenChange={(open) => {
          setShowCreateDialog(open)
          if (!open) loadNotes(projectId)
        }}
        projectId={projectId}
      />

      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="border-b border-zinc-800 bg-zinc-950 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-zinc-400" />
              <h2 className="text-lg font-semibold text-zinc-100">Notes & Comments</h2>
              <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                {notes.length}
              </span>
            </div>
            <button
              onClick={() => setShowCreateDialog(true)}
              className="flex items-center gap-2 rounded-md bg-amber-500 px-3 py-2 text-sm font-medium text-black transition hover:bg-amber-400"
            >
              <Plus className="h-4 w-4" />
              Add Note
            </button>
          </div>
        </div>

        {/* Notes Feed */}
        <div className="flex-1 overflow-auto p-6">
          {notes.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <MessageSquare className="mx-auto mb-4 h-12 w-12 text-zinc-700" />
                <h3 className="mb-2 text-lg font-semibold text-zinc-100">No notes yet</h3>
                <p className="mb-4 text-sm text-zinc-400">
                  Start a conversation or leave feedback on this project.
                </p>
                <button
                  onClick={() => setShowCreateDialog(true)}
                  className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-black transition hover:bg-amber-400"
                >
                  Create First Note
                </button>
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-4xl space-y-4">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 transition hover:border-zinc-700"
                >
                  {/* Note Header */}
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800">
                        <User className="h-5 w-5 text-zinc-400" />
                      </div>
                      <div>
                        <p className="font-medium text-zinc-100">
                          {note.created_by_profile?.full_name || note.created_by_profile?.email || 'Unknown User'}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    {note.status && (
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                          note.status === 'open'
                            ? 'bg-green-500/10 text-green-500'
                            : 'bg-zinc-700 text-zinc-400'
                        }`}
                      >
                        {note.status}
                      </span>
                    )}
                  </div>

                  {/* Note Subject */}
                  {note.subject && (
                    <h4 className="mb-2 font-semibold text-zinc-100">{note.subject}</h4>
                  )}

                  {/* Note Content */}
                  <p className="text-sm text-zinc-300 whitespace-pre-wrap">{note.content}</p>

                  {/* Note Entity Link */}
                  {note.entity_type && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
                      <span className="capitalize">{note.entity_type}</span>
                      {note.entity_id && <span>#{note.entity_id}</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
