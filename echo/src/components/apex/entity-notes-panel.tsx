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
            project_ref:projects!notes_project_id_fkey(id, code, name),
            attachment_rows:attachments(
              id,
              file_name,
              file_type,
              storage_path,
              thumbnail_url
            )
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

      const taskIds = Array.from(
        new Set(
          (data || [])
            .map((note) => {
              const parsed = Number(asText(note.task_id).trim())
              return Number.isNaN(parsed) ? null : parsed
            })
            .filter((id): id is number => id !== null)
        )
      )

      const taskMap: Record<string, string> = {}
      if (taskIds.length > 0) {
        const { data: taskRows, error: taskError } = await supabase
          .from('tasks')
          .select('id, name')
          .in('id', taskIds)

        if (taskError) {
          console.error('Error loading note task labels:', taskError)
        } else {
          for (const task of taskRows || []) {
            const taskId = asText(task.id).trim()
            if (!taskId) continue
            taskMap[taskId] = asText(task.name).trim() || `Task #${taskId}`
          }
        }
      }

      const attachmentPathSet = new Set<string>()
      for (const note of data || []) {
        const noteAttachmentRows = Array.isArray(note.attachment_rows)
          ? note.attachment_rows
          : []
        for (const attachment of noteAttachmentRows) {
          const attachmentRecord =
            attachment && typeof attachment === 'object'
              ? (attachment as Record<string, unknown>)
              : {}
          const storagePath = asText(attachmentRecord.storage_path).trim()
          if (storagePath) {
            attachmentPathSet.add(storagePath)
          }
        }
      }

      const attachmentPaths = Array.from(attachmentPathSet)
      const signedUrlByPath = new Map<string, string>()
      if (attachmentPaths.length > 0) {
        const { data: signedData, error: signedError } = await supabase.storage
          .from('note-attachments')
          .createSignedUrls(attachmentPaths, 3600)

        if (signedError) {
          console.error('Error loading note attachment signed URLs:', signedError)
        } else {
          signedData?.forEach((item, index) => {
            const path = attachmentPaths[index]
            const itemRecord =
              item && typeof item === 'object'
                ? (item as Record<string, unknown>)
                : {}
            const signedUrl = asText(itemRecord.signedUrl).trim()
            if (path && signedUrl) {
              signedUrlByPath.set(path, signedUrl)
            }
          })
        }
      }

      const normalized =
        data?.map((note) => {
          const noteProjectName = asText(note.project_ref?.name).trim()
          const noteProjectCode = asText(note.project_ref?.code).trim()
          const noteProjectId = asText(note.project_id).trim()
          const noteTaskId = asText(note.task_id).trim()
          const noteAttachmentRows = Array.isArray(note.attachment_rows)
            ? note.attachment_rows
            : []
          type ResolvedAttachment = {
            id: string
            file_name: string
            file_type: string
            storage_path: string
            thumbnail_url: string
            signed_url: string
            preview_url: string
          }
          const resolvedAttachments: ResolvedAttachment[] = noteAttachmentRows
            .map((attachment: unknown): ResolvedAttachment => {
              const attachmentRecord =
                attachment && typeof attachment === 'object'
                  ? (attachment as Record<string, unknown>)
                  : {}
              const id = asText(attachmentRecord.id).trim()
              const storagePath = asText(attachmentRecord.storage_path).trim()
              const fileName =
                asText(attachmentRecord.file_name).trim() ||
                (id ? `Attachment #${id}` : 'Attachment')
              const fileType = asText(attachmentRecord.file_type).trim()
              const thumbnailUrl = asText(attachmentRecord.thumbnail_url).trim()
              const signedUrl = storagePath ? signedUrlByPath.get(storagePath) || '' : ''
              const previewUrl = signedUrl || thumbnailUrl
              return {
                id,
                file_name: fileName,
                file_type: fileType,
                storage_path: storagePath,
                thumbnail_url: thumbnailUrl,
                signed_url: signedUrl,
                preview_url: previewUrl,
              }
            })
            .filter((attachment: ResolvedAttachment) =>
              Boolean(
                attachment.id ||
                  attachment.storage_path ||
                  attachment.file_name ||
                  attachment.preview_url
              )
            )
          const firstAttachmentPreview =
            resolvedAttachments.find((attachment: ResolvedAttachment) => attachment.preview_url)?.preview_url || ''

          return {
            ...note,
            note_url: asText(note.id).trim() ? `/apex/${projId}/notes/${asText(note.id).trim()}` : '',
            note_link_label: asText(note.id).trim() ? 'Open' : '-',
            author_label:
              note.created_by_profile?.full_name ||
              note.created_by_profile?.email ||
              'Unknown',
            project_label: noteProjectName || noteProjectCode || noteProjectId || '-',
            task_label: taskMap[noteTaskId] || (noteTaskId ? `Task #${noteTaskId}` : '-'),
            attachment_rows: resolvedAttachments,
            attachments_display:
              resolvedAttachments.length > 0
                ? resolvedAttachments.map((attachment: ResolvedAttachment) => attachment.file_name).join(', ')
                : '-',
            attachments_preview_url: firstAttachmentPreview,
            attachments_count: resolvedAttachments.length,
          }
        }) || []

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
      prev.map((note) => {
        if (note.id !== row.id) return note
        const next = { ...note, [column.id]: value }
        if (column.id === 'links') {
          next.links = parseListValue(value)
        }
        return next
      })
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
      {
        id: 'note_link_label',
        label: 'Note',
        type: 'link',
        width: '90px',
        linkHref: (row: unknown) => {
          const rowRecord =
            row && typeof row === 'object'
              ? (row as Record<string, unknown>)
              : {}
          return asText(rowRecord.note_url).trim()
        },
      },
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
      {
        id: 'project_id',
        label: 'Project',
        type: 'text',
        width: '180px',
        formatValue: (value: unknown, row: unknown) => {
          const rowRecord =
            row && typeof row === 'object'
              ? (row as Record<string, unknown>)
              : {}
          const label = asText(rowRecord.project_label).trim()
          if (label) return label
          const fallback = asText(value).trim()
          return fallback || '-'
        },
      },
      {
        id: 'task_id',
        label: 'Task',
        type: 'text',
        width: '200px',
        formatValue: (value: unknown, row: unknown) => {
          const rowRecord =
            row && typeof row === 'object'
              ? (row as Record<string, unknown>)
              : {}
          const label = asText(rowRecord.task_label).trim()
          if (label) return label
          const fallback = asText(value).trim()
          return fallback || '-'
        },
      },
      {
        id: 'links',
        label: 'Links',
        type: 'text',
        width: '260px',
        editable: true,
        editor: 'text',
        formatValue: (value: unknown) => parseListValue(value).join(', '),
        parseValue: (value: unknown) => parseListValue(value),
      },
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
      { id: 'attachments_preview_url', label: 'Preview', type: 'thumbnail', width: '88px' },
      {
        id: 'attachments',
        label: 'Attachments',
        type: 'text',
        width: '260px',
        formatValue: (value: unknown, row: unknown) => {
          const rowRecord =
            row && typeof row === 'object'
              ? (row as Record<string, unknown>)
              : {}
          const label = asText(rowRecord.attachments_display).trim()
          if (label) return label
          return parseListValue(value).join(', ')
        },
      },
      { id: 'created_at', label: 'Date Created', type: 'datetime', width: '190px' },
      { id: 'attachments_count', label: 'Attach Count', type: 'number', width: '130px' },
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
        ) : notes.length === 0 ? (
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
              data={notes}
              entityType={`notes_${entityType}`}
              onAdd={() => setShowCreateDialog(true)}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onCellUpdate={handleCellUpdate}
              onCellUpdateError={setCellError}
            />
          </div>
        )}
      </div>
    </>
  )
}
