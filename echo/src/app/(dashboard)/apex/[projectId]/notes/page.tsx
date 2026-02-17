'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { listStatusNames } from '@/lib/status/options'
import { listTagNames } from '@/lib/tags/options'
import { CreateNoteDialog } from '@/components/apex/create-note-dialog'
import { EditNoteDialog } from '@/components/apex/edit-note-dialog'
import { DeleteConfirmDialog } from '@/components/apex/delete-confirm-dialog'
import { EntityTable } from '@/components/table/entity-table'
import { ApexPageShell } from '@/components/apex/apex-page-shell'
import { ApexEmptyState } from '@/components/apex/apex-empty-state'
import type { TableColumn } from '@/components/table/types'
import { createNote, deleteNote, updateNote } from '@/actions/notes'
import { MessageSquare, Plus } from 'lucide-react'

type EntityRefMap = Record<string, { label: string; url: string }>

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

function toEntityKey(entityType: string, entityId: unknown): string {
  return `${entityType}:${asText(entityId).trim()}`
}

function toNumber(value: unknown): number | null {
  const text = asText(value).trim()
  if (!text) return null
  const parsed = Number(text)
  return Number.isNaN(parsed) ? null : parsed
}

function buildFallbackLink(projectId: string, entityType: string, entityId: unknown) {
  const id = asText(entityId).trim()
  if (!entityType || !id) return ''

  if (entityType === 'asset') return `/apex/${projectId}/assets/${id}`
  if (entityType === 'shot') return `/apex/${projectId}/shots/${id}`
  if (entityType === 'sequence') return `/apex/${projectId}/sequences/${id}`
  if (entityType === 'task') return `/apex/${projectId}/tasks/${id}`
  if (entityType === 'version') return `/apex/${projectId}/versions/${id}`
  if (entityType === 'project') return `/apex/${id}`
  if (entityType === 'published_file') return `/apex/${projectId}/published-files?selected=${id}`
  return ''
}

function normalizeNoteEntityType(
  value: unknown
): 'asset' | 'shot' | 'sequence' | 'task' | 'version' | 'project' | 'published_file' | null {
  const normalized = asText(value).trim().toLowerCase()
  if (
    normalized === 'asset' ||
    normalized === 'shot' ||
    normalized === 'sequence' ||
    normalized === 'task' ||
    normalized === 'version' ||
    normalized === 'project' ||
    normalized === 'published_file'
  ) {
    return normalized
  }
  return null
}

export default function NotesPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const [projectId, setProjectId] = useState<string>('')
  const [notes, setNotes] = useState<any[]>([])
  const [statusNames, setStatusNames] = useState<string[]>([])
  const [tagNames, setTagNames] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [cellError, setCellError] = useState<string | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedNote, setSelectedNote] = useState<any>(null)

  useEffect(() => {
    params.then((p) => {
      setProjectId(p.projectId)
      void refreshNotesData(p.projectId)
    })
  }, [params])

  async function refreshNotesData(projId: string) {
    if (!projId) return
    await Promise.all([loadNotes(projId), loadStatusOptions(), loadTagOptions()])
  }

  async function loadStatusOptions() {
    try {
      const values = await listStatusNames('note')
      setStatusNames(
        Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).sort((a, b) =>
          a.localeCompare(b)
        )
      )
    } catch (error) {
      console.error('Error loading note status options:', error)
      setStatusNames([])
    }
  }

  async function loadTagOptions() {
    try {
      const values = await listTagNames()
      setTagNames(uniqueSorted(values))
    } catch (error) {
      console.error('Error loading note tag options:', error)
      setTagNames([])
    }
  }

  async function loadNotes(projId: string) {
    try {
      setIsLoading(true)
      setLoadError(null)
      setCellError(null)
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

      const rows = data || []
      const entityIdsByType: Record<string, number[]> = {
        asset: [],
        shot: [],
        sequence: [],
        task: [],
        version: [],
        published_file: [],
        project: [],
      }

      for (const note of rows) {
        const entityType = asText(note.entity_type).trim().toLowerCase()
        const entityId = toNumber(note.entity_id)
        if (entityId === null) continue
        if (!entityIdsByType[entityType]) continue
        entityIdsByType[entityType].push(entityId)
      }

      for (const key of Object.keys(entityIdsByType)) {
        entityIdsByType[key] = Array.from(new Set(entityIdsByType[key]))
      }

      const [
        assetsResult,
        shotsResult,
        sequencesResult,
        tasksResult,
        versionsResult,
        publishedFilesResult,
        projectsResult,
      ] = await Promise.all([
        entityIdsByType.asset.length > 0
          ? supabase.from('assets').select('id, code, name').in('id', entityIdsByType.asset)
          : Promise.resolve({ data: [], error: null }),
        entityIdsByType.shot.length > 0
          ? supabase
              .from('shots')
              .select('id, code, name, sequence:sequences!shots_sequence_id_fkey(code)')
              .in('id', entityIdsByType.shot)
          : Promise.resolve({ data: [], error: null }),
        entityIdsByType.sequence.length > 0
          ? supabase
              .from('sequences')
              .select('id, code, name')
              .in('id', entityIdsByType.sequence)
          : Promise.resolve({ data: [], error: null }),
        entityIdsByType.task.length > 0
          ? supabase.from('tasks').select('id, name').in('id', entityIdsByType.task)
          : Promise.resolve({ data: [], error: null }),
        entityIdsByType.version.length > 0
          ? supabase
              .from('versions')
              .select('id, code, version_number')
              .in('id', entityIdsByType.version)
          : Promise.resolve({ data: [], error: null }),
        entityIdsByType.published_file.length > 0
          ? supabase
              .from('published_files')
              .select('id, code, name')
              .in('id', entityIdsByType.published_file)
          : Promise.resolve({ data: [], error: null }),
        entityIdsByType.project.length > 0
          ? supabase
              .from('projects')
              .select('id, code, name')
              .in('id', entityIdsByType.project)
          : Promise.resolve({ data: [], error: null }),
      ])

      if (assetsResult.error) throw assetsResult.error
      if (shotsResult.error) throw shotsResult.error
      if (sequencesResult.error) throw sequencesResult.error
      if (tasksResult.error) throw tasksResult.error
      if (versionsResult.error) throw versionsResult.error
      if (publishedFilesResult.error) throw publishedFilesResult.error
      if (projectsResult.error) throw projectsResult.error

      const entityMap: EntityRefMap = {}

      for (const row of assetsResult.data || []) {
        const id = asText(row.id)
        const label = `${asText(row.code).trim() || `Asset #${id}`}${asText(row.name).trim() ? ` - ${asText(row.name).trim()}` : ''}`
        entityMap[toEntityKey('asset', id)] = {
          label,
          url: `/apex/${projId}/assets/${id}`,
        }
      }

      for (const row of shotsResult.data || []) {
        const id = asText(row.id)
        const sequenceCode = Array.isArray(row.sequence)
          ? asText(row.sequence[0]?.code).trim()
          : asText((row.sequence as any)?.code).trim()
        const shotCode = asText(row.code).trim()
        const baseCode = sequenceCode && shotCode ? `${sequenceCode}${shotCode}` : shotCode || `Shot #${id}`
        const label = `${baseCode}${asText(row.name).trim() ? ` - ${asText(row.name).trim()}` : ''}`
        entityMap[toEntityKey('shot', id)] = {
          label,
          url: `/apex/${projId}/shots/${id}`,
        }
      }

      for (const row of sequencesResult.data || []) {
        const id = asText(row.id)
        const label = `${asText(row.code).trim() || `Sequence #${id}`}${asText(row.name).trim() ? ` - ${asText(row.name).trim()}` : ''}`
        entityMap[toEntityKey('sequence', id)] = {
          label,
          url: `/apex/${projId}/sequences/${id}`,
        }
      }

      for (const row of tasksResult.data || []) {
        const id = asText(row.id)
        const label = `${asText(row.name).trim() || `Task #${id}`}`
        entityMap[toEntityKey('task', id)] = {
          label,
          url: `/apex/${projId}/tasks/${id}`,
        }
      }

      for (const row of versionsResult.data || []) {
        const id = asText(row.id)
        const code = asText(row.code).trim() || `Version #${id}`
        const versionNumber = toNumber(row.version_number)
        const label = versionNumber === null ? code : `${code} v${versionNumber}`
        entityMap[toEntityKey('version', id)] = {
          label,
          url: `/apex/${projId}/versions/${id}`,
        }
      }

      for (const row of publishedFilesResult.data || []) {
        const id = asText(row.id)
        const label = `${asText(row.code).trim() || asText(row.name).trim() || `Published File #${id}`}`
        entityMap[toEntityKey('published_file', id)] = {
          label,
          url: `/apex/${projId}/published-files?selected=${id}`,
        }
      }

      for (const row of projectsResult.data || []) {
        const id = asText(row.id)
        const code = asText(row.code).trim()
        const name = asText(row.name).trim()
        const label = code || name || `Project #${id}`
        entityMap[toEntityKey('project', id)] = {
          label,
          url: `/apex/${id}`,
        }
      }

      const normalized =
        rows.map((note) => {
          const author =
            note.created_by_profile?.full_name ||
            note.created_by_profile?.email ||
            'Unknown'

          const entityType =
            typeof note.entity_type === 'string' ? note.entity_type.trim().toLowerCase() : ''
          const entityId = asText(note.entity_id).trim()
          const entityRef = entityType && entityId ? entityMap[toEntityKey(entityType, entityId)] : null
          const fallbackLabel =
            entityType && entityId ? `${entityType} #${entityId}` : '-'
          const fallbackUrl = buildFallbackLink(projId, entityType, entityId)

          return {
            ...note,
            author_label: author,
            link_label: entityRef?.label || fallbackLabel,
            link_url: entityRef?.url || fallbackUrl,
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

  function handleEdit(note: any) {
    setSelectedNote(note)
    setShowEditDialog(true)
  }

  async function handleDeleteConfirm() {
    if (!selectedNote) return { error: 'No note selected' }
    return await deleteNote(selectedNote.id, projectId)
  }

  async function handleCellUpdate(row: any, column: TableColumn, value: any) {
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

  async function handleBulkDelete(rows: any[]) {
    const failures: string[] = []

    for (const row of rows) {
      const rowId = asText(row?.id).trim()
      if (!rowId) continue
      const result = await deleteNote(rowId, projectId)
      if (result?.error) {
        failures.push(`${asText(row?.subject).trim() || rowId}: ${result.error}`)
      }
    }

    void refreshNotesData(projectId)

    if (failures.length > 0) {
      const preview = failures.slice(0, 3).join('; ')
      throw new Error(
        failures.length > 3 ? `${preview}; and ${failures.length - 3} more` : preview
      )
    }
  }

  async function handleCsvImport(rows: Record<string, unknown>[]) {
    const failed: Array<{ row: number; message: string }> = []
    let imported = 0

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index]
      const content = asText(row.content).trim()

      if (!content) {
        failed.push({
          row: index + 2,
          message: 'Note content is required.',
        })
        continue
      }

      const entityType = normalizeNoteEntityType(row.entity_type)
      const entityId = asText(row.entity_id).trim()
      const taskId = asText(row.task_id).trim()

      try {
        const result = await createNote({
          ...(row as Record<string, unknown>),
          project_id: projectId,
          subject: asText(row.subject).trim() || undefined,
          content,
          status: asText(row.status).trim() || undefined,
          entity_type: entityType || undefined,
          entity_id: entityId || undefined,
          task_id: taskId || undefined,
          tags: parseListValue(row.tags),
          cc: parseListValue(row.cc),
        })

        if (result?.error) {
          throw new Error(result.error)
        }
        imported += 1
      } catch (error) {
        failed.push({
          row: index + 2,
          message: error instanceof Error ? error.message : 'Failed to import note row.',
        })
      }
    }

    void refreshNotesData(projectId)
    return { imported, failed }
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
      {
        id: 'link_label',
        label: 'Links',
        type: 'link',
        width: '220px',
        linkHref: (row: any) => row.link_url,
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
      { id: 'entity_type', label: 'Type', type: 'text', width: '120px' },
      { id: 'created_at', label: 'Date Created', type: 'datetime', width: '190px' },
      { id: 'attachments_count', label: 'Attachments', type: 'number', width: '130px' },
      { id: 'id', label: 'Id', type: 'text', width: '80px' },
    ],
    [statusOptions, tagOptions]
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
          if (!open) void refreshNotesData(projectId)
        }}
        projectId={projectId}
      />

      <EditNoteDialog
        open={showEditDialog}
        onOpenChange={(open) => {
          setShowEditDialog(open)
          if (!open) void refreshNotesData(projectId)
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

        {cellError && (
          <div className="mb-4 rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
            {cellError}
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
            csvExportFilename="apex-notes"
            onCsvImport={handleCsvImport}
            onBulkDelete={handleBulkDelete}
            onAdd={() => setShowCreateDialog(true)}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onCellUpdate={handleCellUpdate}
            onCellUpdateError={setCellError}
          />
        )}
      </ApexPageShell>
    </>
  )
}
