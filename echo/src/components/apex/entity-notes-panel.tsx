'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { listStatusNames } from '@/lib/status/options'
import { listTagNames } from '@/lib/tags/options'
import { CreateNoteDialog } from '@/components/apex/create-note-dialog'
import { EditNoteDialog } from '@/components/apex/edit-note-dialog'
import { DeleteConfirmDialog } from '@/components/apex/delete-confirm-dialog'
import { EntityTable } from '@/components/table/entity-table'
import type { TableColumn } from '@/components/table/types'
import { deleteNote, updateNote } from '@/actions/notes'

interface EntityNotesPanelProps {
  projectId: string
  entityType: 'asset' | 'shot' | 'sequence' | 'task'
  entityId: string
}

function asText(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value)
}

function parseListValue(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => asText(item).trim())
      .filter(Boolean)
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }

  return []
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b))
}

export function EntityNotesPanel({
  projectId,
  entityType,
  entityId,
}: EntityNotesPanelProps) {
  const [notes, setNotes] = useState<any[]>([])
  const [statusNames, setStatusNames] = useState<string[]>([])
  const [tagNames, setTagNames] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [cellError, setCellError] = useState<string | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedNote, setSelectedNote] = useState<any>(null)

  useEffect(() => {
    if (!projectId || !entityId) return
    loadNotes(projectId, entityType, entityId)
  }, [projectId, entityType, entityId])

  async function loadNotes(projId: string, type: string, id: string) {
    try {
      setIsLoading(true)
      setCellError(null)
      const supabase = createClient()
      const numericId = Number(id)
      const normalizedId = Number.isNaN(numericId) ? id : numericId

      const [notesResult, nextStatusNames, nextTagNames] = await Promise.all([
        supabase
          .from('notes')
          .select(
            `
            *,
            created_by_profile:profiles!notes_created_by_fkey(full_name, email),
            attachments:attachments(id)
          `
          )
          .eq('project_id', projId)
          .eq('entity_type', type)
          .eq('entity_id', normalizedId)
          .order('created_at', { ascending: false }),
        listStatusNames('note'),
        listTagNames(),
      ])

      const { data, error } = notesResult

      if (error) {
        console.error(`Error loading ${type} notes:`, error)
        setNotes([])
        return
      }

      setStatusNames(uniqueSorted(nextStatusNames))
      setTagNames(uniqueSorted(nextTagNames))

      const normalized =
        data?.map((note) => ({
          ...note,
          author_label:
            note.created_by_profile?.full_name ||
            note.created_by_profile?.email ||
            'Unknown',
          attachments_count: Array.isArray(note.attachments)
            ? note.attachments.length
            : 0,
        })) || []

      setNotes(normalized)
    } catch (error) {
      console.error(`Error loading ${type} notes:`, error)
      setNotes([])
      setStatusNames([])
      setTagNames([])
    } finally {
      setIsLoading(false)
    }
  }

  function handleDelete(note: any) {
    setSelectedNote(note)
    setShowDeleteDialog(true)
  }

  function handleEdit(note: any) {
    setSelectedNote(note)
    setShowEditDialog(true)
  }

  async function handleDeleteConfirm() {
    if (!selectedNote) return { error: 'No note selected' }
    return await deleteNote(selectedNote.id, projectId)
  }

  async function handleCellUpdate(row: any, column: any, value: any) {
    setCellError(null)
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

  const statusOptions = useMemo(() => {
    const values = new Set<string>()
    for (const status of statusNames) {
      const normalized = status.trim()
      if (normalized) values.add(normalized)
    }
    for (const note of notes) {
      const normalized = asText(note.status).trim()
      if (normalized) values.add(normalized)
    }
    return Array.from(values).map((value) => ({ value, label: value }))
  }, [notes, statusNames])

  const tagOptions = useMemo(() => {
    const values = new Set<string>()
    for (const tag of tagNames) {
      const normalized = tag.trim()
      if (normalized) values.add(normalized)
    }
    for (const note of notes) {
      for (const tag of parseListValue(note.tags)) {
        values.add(tag)
      }
    }
    return Array.from(values)
      .sort((a, b) => a.localeCompare(b))
      .map((value) => ({ value, label: value }))
  }, [notes, tagNames])

  const columns: TableColumn[] = useMemo(
    () => [
      { id: 'subject', label: 'Subject', type: 'text', width: '220px', editable: true, editor: 'text' },
      {
        id: 'status',
        label: 'Status',
        type: 'text',
        width: '120px',
        editable: true,
        editor: 'select',
        options: statusOptions,
      },
      { id: 'author_label', label: 'Author', type: 'text', width: '180px' },
      { id: 'content', label: 'Body', type: 'text', width: '420px', editable: true, editor: 'textarea' },
      {
        id: 'tags',
        label: 'Tags',
        type: 'text',
        width: '180px',
        editable: true,
        editor: 'multiselect',
        options: tagOptions,
        formatValue: (value: unknown) => parseListValue(value).join(', '),
        parseValue: (value: unknown) => parseListValue(value),
      },
      { id: 'created_at', label: 'Date Created', type: 'datetime', width: '190px' },
      { id: 'attachments_count', label: 'Attachments', type: 'number', width: '130px' },
      { id: 'id', label: 'Id', type: 'text', width: '80px' },
    ],
    [statusOptions, tagOptions]
  )

  return (
    <>
      <CreateNoteDialog
        open={showCreateDialog}
        onOpenChange={(open) => {
          setShowCreateDialog(open)
          if (!open) loadNotes(projectId, entityType, entityId)
        }}
        projectId={projectId}
        defaultEntityType={entityType}
        defaultEntityId={entityId}
        defaultTaskId={entityType === 'task' ? entityId : undefined}
        lockEntity
      />

      <EditNoteDialog
        open={showEditDialog}
        onOpenChange={(open) => {
          setShowEditDialog(open)
          if (!open) loadNotes(projectId, entityType, entityId)
        }}
        projectId={projectId}
        note={selectedNote}
      />

      <DeleteConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Note"
        description="Are you sure you want to delete this note?"
        itemName={selectedNote?.subject || selectedNote?.content || ''}
        onConfirm={handleDeleteConfirm}
      />

      <div className="p-6">
        {cellError && (
          <div className="mb-4 rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
            {cellError}
          </div>
        )}

        {isLoading ? (
          <div className="flex h-40 items-center justify-center text-sm text-zinc-400">
            Loading notes...
          </div>
        ) : notes.length === 0 ? (
          <div className="rounded-md border border-zinc-800 bg-zinc-950/70 p-6">
            <h3 className="text-sm font-semibold text-zinc-100">Notes</h3>
            <p className="mt-2 text-sm text-zinc-400">
              No notes linked to this {entityType} yet.
            </p>
            <button
              onClick={() => setShowCreateDialog(true)}
              className="mt-4 rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-black transition hover:bg-amber-400"
            >
              Add Note
            </button>
          </div>
        ) : (
          <EntityTable
            columns={columns}
            data={notes}
            entityType={`notes_${entityType}`}
            onAdd={() => setShowCreateDialog(true)}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onCellUpdate={handleCellUpdate}
            onCellUpdateError={setCellError}
          />
        )}
      </div>
    </>
  )
}
