'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CreateNoteDialog } from '@/components/apex/create-note-dialog'
import { EditNoteDialog } from '@/components/apex/edit-note-dialog'
import { DeleteConfirmDialog } from '@/components/apex/delete-confirm-dialog'
import { EntityTable } from '@/components/table/entity-table'
import type { TableColumn } from '@/components/table/types'
import { deleteNote } from '@/actions/notes'
import { useEntityData } from '@/hooks/use-entity-data'
import { asText, parseTextArray } from '@/lib/fields'

interface EntityNotesPanelProps {
  projectId: string
  entityType: 'asset' | 'shot' | 'sequence' | 'task'
  entityId: string
}

type NoteRow = Record<string, unknown> & { id: string | number }

type ResolvedAttachment = {
  id: string; file_name: string; file_type: string
  storage_path: string; thumbnail_url: string
  signed_url: string; preview_url: string
}

export function EntityNotesPanel({
  projectId,
  entityType,
  entityId,
}: EntityNotesPanelProps) {
  const [rawNotes, setRawNotes] = useState<NoteRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [cellError, setCellError] = useState<string | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedNote, setSelectedNote] = useState<NoteRow | null>(null)

  // Attachment data resolved separately (notes-specific)
  const [attachmentsByNoteId, setAttachmentsByNoteId] = useState<Record<string, ResolvedAttachment[]>>({})

  useEffect(() => {
    if (!projectId || !entityId) return
    void loadNotes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, entityType, entityId])

  async function loadNotes() {
    try {
      setIsLoading(true)
      setCellError(null)
      const supabase = createClient()
      const numericId = Number(entityId)
      const idFilter = Number.isNaN(numericId) ? entityId : numericId

      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('project_id', projectId)
        .eq('entity_type', entityType)
        .eq('entity_id', idFilter)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (error) throw error
      const rows = (data || []) as NoteRow[]
      setRawNotes(rows)

      // Resolve attachments
      if (rows.length > 0) {
        await resolveAttachments(rows)
      } else {
        setAttachmentsByNoteId({})
      }
    } catch (error) {
      console.error(`Error loading ${entityType} notes:`, error)
      setRawNotes([])
    } finally {
      setIsLoading(false)
    }
  }

  async function resolveAttachments(notes: NoteRow[]) {
    const supabase = createClient()
    const noteIds = notes.map((n) => asText(n.id).trim()).filter(Boolean)

    const { data: attachRows } = await supabase
      .from('attachments')
      .select('id, file_name, file_type, storage_path, thumbnail_url, note_id')
      .in('note_id', noteIds)

    const rows = (attachRows || []) as Record<string, unknown>[]
    const pathSet = new Set<string>()
    for (const a of rows) {
      const path = asText(a.storage_path).trim()
      if (path) pathSet.add(path)
    }

    const signedUrlByPath = new Map<string, string>()
    const paths = Array.from(pathSet)
    if (paths.length > 0) {
      const { data: signedData, error: signedError } = await supabase.storage
        .from('note-attachments')
        .createSignedUrls(paths, 3600)

      if (signedError) {
        console.error('Error loading note attachment signed URLs:', signedError)
      } else {
        signedData?.forEach((item, index) => {
          const itemRecord = item && typeof item === 'object' ? (item as Record<string, unknown>) : {}
          const signedUrl = asText(itemRecord.signedUrl).trim()
          if (paths[index] && signedUrl) signedUrlByPath.set(paths[index], signedUrl)
        })
      }
    }

    const byNote: Record<string, ResolvedAttachment[]> = {}
    for (const a of rows) {
      const noteId = asText(a.note_id).trim()
      if (!noteId) continue
      const storagePath = asText(a.storage_path).trim()
      const signedUrl = storagePath ? signedUrlByPath.get(storagePath) || '' : ''
      const thumbnailUrl = asText(a.thumbnail_url).trim()
      const resolved: ResolvedAttachment = {
        id: asText(a.id).trim(),
        file_name: asText(a.file_name).trim() || (a.id ? `Attachment #${a.id}` : 'Attachment'),
        file_type: asText(a.file_type).trim(),
        storage_path: storagePath,
        thumbnail_url: thumbnailUrl,
        signed_url: signedUrl,
        preview_url: signedUrl || thumbnailUrl,
      }
      if (resolved.id || resolved.storage_path || resolved.file_name || resolved.preview_url) {
        if (!byNote[noteId]) byNote[noteId] = []
        byNote[noteId].push(resolved)
      }
    }

    setAttachmentsByNoteId(byNote)
  }

  // Note-open link column + attachment columns as extras
  const noteOpenColumn: TableColumn = useMemo(() => ({
    id: 'note_link_label',
    label: 'Note',
    type: 'link',
    width: '90px',
    linkHref: (row: unknown) => {
      const r = row && typeof row === 'object' ? (row as Record<string, unknown>) : {}
      const noteId = asText(r.id).trim()
      return noteId ? `/apex/${projectId}/notes/${noteId}` : ''
    },
    formatValue: (_v: unknown, row: unknown) => {
      const r = row && typeof row === 'object' ? (row as Record<string, unknown>) : {}
      return asText(r.id).trim() ? 'Open' : '-'
    },
  }), [projectId])

  const attachmentColumns: TableColumn[] = useMemo(() => [
    {
      id: 'attachments_preview_url',
      label: 'Preview',
      type: 'thumbnail' as const,
      width: '88px',
      formatValue: (_v: unknown, row: unknown) => {
        const r = row && typeof row === 'object' ? (row as Record<string, unknown>) : {}
        const noteId = asText(r.id).trim()
        const attachments = attachmentsByNoteId[noteId] || []
        return attachments.find((a) => a.preview_url)?.preview_url || ''
      },
    },
    {
      id: 'attachments_display',
      label: 'Attachments',
      type: 'text' as const,
      width: '260px',
      formatValue: (_v: unknown, row: unknown) => {
        const r = row && typeof row === 'object' ? (row as Record<string, unknown>) : {}
        const noteId = asText(r.id).trim()
        const attachments = attachmentsByNoteId[noteId] || []
        return attachments.length > 0 ? attachments.map((a) => a.file_name).join(', ') : '-'
      },
    },
    {
      id: 'attachments_count',
      label: 'Attach Count',
      type: 'number' as const,
      width: '130px',
      formatValue: (_v: unknown, row: unknown) => {
        const r = row && typeof row === 'object' ? (row as Record<string, unknown>) : {}
        const noteId = asText(r.id).trim()
        return String((attachmentsByNoteId[noteId] || []).length)
      },
    },
  ], [attachmentsByNoteId])

  const columnOverrides = useMemo<Record<string, Partial<TableColumn>>>(() => ({
    subject: { label: 'Subject', width: '220px', editable: true, editor: 'text' },
    content: { label: 'Body', width: '420px', editable: true, editor: 'textarea' },
    links: {
      label: 'Links',
      width: '260px',
      editable: true,
      editor: 'text',
      formatValue: (value: unknown) => parseTextArray(value).join(', '),
      parseValue: (value: unknown) => parseTextArray(value),
    },
  }), [])

  const { data, columns, handleCellUpdate } = useEntityData({
    entity: 'note',
    rows: rawNotes,
    projectId,
    columnOverrides,
    extraColumns: {
      prepend: [noteOpenColumn],
      append: attachmentColumns,
    },
  })

  async function onCellUpdate(
    row: Record<string, unknown>,
    column: TableColumn,
    value: unknown
  ) {
    setCellError(null)
    await handleCellUpdate(row, column, value)
    const rowId = String(row.id)
    setRawNotes((prev) =>
      prev.map((n) =>
        String(n.id) === rowId ? { ...n, [column.id]: value } : n
      )
    )
  }

  function handleDelete(note: NoteRow) {
    setSelectedNote(note)
    setShowDeleteDialog(true)
  }

  function handleEdit(note: NoteRow) {
    setSelectedNote(note)
    setShowEditDialog(true)
  }

  async function handleDeleteConfirm() {
    if (!selectedNote) return { error: 'No note selected' }
    return await deleteNote(String(selectedNote.id), projectId)
  }

  return (
    <>
      <CreateNoteDialog
        open={showCreateDialog}
        onOpenChange={(open) => {
          setShowCreateDialog(open)
          if (!open) void loadNotes()
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
          if (!open) void loadNotes()
        }}
        projectId={projectId}
        note={selectedNote}
      />

      <DeleteConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Note"
        description="Are you sure you want to delete this note?"
        itemName={asText(selectedNote?.subject) || asText(selectedNote?.content) || ''}
        onConfirm={handleDeleteConfirm}
      />

      <div className="flex h-full min-h-0 flex-col p-6">
        {cellError && (
          <div className="mb-4 rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
            {cellError}
          </div>
        )}

        {isLoading ? (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
            Loading notes...
          </div>
        ) : data.length === 0 ? (
          <div className="rounded-md border border-border bg-background/70 p-6">
            <h3 className="text-sm font-semibold text-foreground">Notes</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              No notes linked to this {entityType} yet.
            </p>
            <button
              onClick={() => setShowCreateDialog(true)}
              className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-black transition hover:bg-primary"
            >
              Add Note
            </button>
          </div>
        ) : (
          <div className="min-h-0 flex-1">
            <EntityTable
              columns={columns}
              data={data}
              entityType={`notes_${entityType}`}
              onAdd={() => setShowCreateDialog(true)}
              onEdit={(row) => handleEdit(row as NoteRow)}
              onDelete={(row) => handleDelete(row as NoteRow)}
              onCellUpdate={onCellUpdate}
              onCellUpdateError={setCellError}
            />
          </div>
        )}
      </div>
    </>
  )
}
