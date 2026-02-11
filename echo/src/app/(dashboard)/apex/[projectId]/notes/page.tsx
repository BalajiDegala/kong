'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CreateNoteDialog } from '@/components/apex/create-note-dialog'
import { DeleteConfirmDialog } from '@/components/apex/delete-confirm-dialog'
import { EntityTable } from '@/components/table/entity-table'
import { ApexPageShell } from '@/components/apex/apex-page-shell'
import { ApexEmptyState } from '@/components/apex/apex-empty-state'
import type { TableColumn } from '@/components/table/types'
import { deleteNote, updateNote } from '@/actions/notes'
import { MessageSquare, Plus } from 'lucide-react'

export default function NotesPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const [projectId, setProjectId] = useState<string>('')
  const [notes, setNotes] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedNote, setSelectedNote] = useState<any>(null)

  useEffect(() => {
    params.then((p) => {
      setProjectId(p.projectId)
      loadNotes(p.projectId)
    })
  }, [params])

  async function loadNotes(projId: string) {
    try {
      setIsLoading(true)
      setLoadError(null)
      const supabase = createClient()

      const { data, error } = await supabase
        .from('notes')
        .select(`
          *,
          created_by_profile:profiles!notes_created_by_fkey(
            full_name,
            email
          ),
          attachments:attachments(id)
        `)
        .eq('project_id', projId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading notes:', error)
        setLoadError(error.message)
        setNotes([])
        return
      }

      const normalized =
        data?.map((note) => {
          const author =
            note.created_by_profile?.full_name ||
            note.created_by_profile?.email ||
            'Unknown'

          const entityType =
            typeof note.entity_type === 'string' ? note.entity_type : null
          const entityId = note.entity_id ?? null
          const linkLabel =
            entityType && entityId ? `${entityType} #${entityId}` : '-'

          let linkUrl = ''
          if (entityType === 'shot' && entityId) {
            linkUrl = `/apex/${projId}/shots/${entityId}`
          }
          if (entityType === 'asset' && entityId) {
            linkUrl = `/apex/${projId}/assets/${entityId}`
          }

          return {
            ...note,
            author_label: author,
            link_label: linkLabel,
            link_url: linkUrl,
            attachments_count: Array.isArray(note.attachments)
              ? note.attachments.length
              : 0,
          }
        }) || []

      setNotes(normalized)
    } catch (error) {
      console.error('Error loading notes:', error)
      setLoadError(error instanceof Error ? error.message : 'Error loading notes')
      setNotes([])
    } finally {
      setIsLoading(false)
    }
  }

  function handleDelete(note: any) {
    setSelectedNote(note)
    setShowDeleteDialog(true)
  }

  async function handleDeleteConfirm() {
    if (!selectedNote) return { error: 'No note selected' }
    return await deleteNote(selectedNote.id, projectId)
  }

  async function handleCellUpdate(row: any, column: any, value: any) {
    const result = await updateNote(row.id, { [column.id]: value })
    if (result.error) {
      throw new Error(result.error)
    }
    setNotes((prev) =>
      prev.map((note) =>
        note.id === row.id ? { ...note, [column.id]: value } : note
      )
    )
  }

  const columns: TableColumn[] = useMemo(
    () => [
      { id: 'subject', label: 'Subject', type: 'text', width: '220px', editable: true, editor: 'text' },
      { id: 'status', label: 'Status', type: 'text', width: '110px', editable: true, editor: 'text' },
      {
        id: 'link_label',
        label: 'Links',
        type: 'link',
        width: '170px',
        linkHref: (row: any) => row.link_url,
      },
      { id: 'author_label', label: 'Author', type: 'text', width: '180px' },
      { id: 'content', label: 'Body', type: 'text', width: '420px', editable: true, editor: 'textarea' },
      { id: 'entity_type', label: 'Type', type: 'text', width: '110px' },
      { id: 'created_at', label: 'Date Created', type: 'datetime', width: '190px' },
      { id: 'attachments_count', label: 'Attachments', type: 'number', width: '130px' },
      { id: 'id', label: 'Id', type: 'text', width: '80px' },
    ],
    []
  )

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

      <DeleteConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Note"
        description="Are you sure you want to delete this note?"
        itemName={selectedNote?.subject || selectedNote?.content || ''}
        onConfirm={handleDeleteConfirm}
      />

      <ApexPageShell
        title="Notes"
        action={
          <button
            onClick={() => setShowCreateDialog(true)}
            className="flex items-center gap-2 rounded-md bg-amber-500 px-3 py-2 text-sm font-medium text-black transition hover:bg-amber-400"
          >
            <Plus className="h-4 w-4" />
            Add Note
          </button>
        }
      >
        {loadError && (
          <div className="mb-4 rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
            Failed to load notes: {loadError}
          </div>
        )}

        {notes.length === 0 ? (
          <ApexEmptyState
            icon={<MessageSquare className="h-12 w-12" />}
            title="No notes yet"
            description="Create your first note to start tracking feedback and discussion."
            action={
              <button
                onClick={() => setShowCreateDialog(true)}
                className="rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-black transition hover:bg-amber-400"
              >
                Create First Note
              </button>
            }
          />
        ) : (
          <EntityTable
            columns={columns}
            data={notes}
            entityType="notes"
            onAdd={() => setShowCreateDialog(true)}
            onDelete={handleDelete}
            onCellUpdate={handleCellUpdate}
          />
        )}
      </ApexPageShell>
    </>
  )
}
