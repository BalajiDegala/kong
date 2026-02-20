'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { EntityTable } from '@/components/table/entity-table'
import { CreateNoteDialog } from '@/components/apex/create-note-dialog'
import { EditNoteDialog } from '@/components/apex/edit-note-dialog'
import { DeleteConfirmDialog } from '@/components/apex/delete-confirm-dialog'
import { ApexPageShell } from '@/components/apex/apex-page-shell'
import { ApexEmptyState } from '@/components/apex/apex-empty-state'
import { createNote, deleteNote, updateNote } from '@/actions/notes'
import { useEntityData } from '@/hooks/use-entity-data'
import { asText, parseTextArray } from '@/lib/fields'
import type { TableColumn } from '@/components/table/types'
import { MessageSquare, Plus } from 'lucide-react'

type NoteRow = Record<string, unknown> & { id: string | number }

// ---------------------------------------------------------------------------
// Link Parsing — Notes have a `links` text-array field that can contain
// URLs, Pulse post paths, Apex entity paths, or typed shorthand like
// "task:123".  These get parsed into structured refs and then resolved
// against the DB so we can show human-readable labels in the table.
// ---------------------------------------------------------------------------

type ParsedNoteLinkKind =
  | 'asset' | 'shot' | 'sequence' | 'task' | 'version'
  | 'project' | 'published_file' | 'post' | 'url' | 'unknown'

type ParsedNoteLinkRef = { raw: string; kind: ParsedNoteLinkKind; id: string; url: string }
type ResolvedNoteLinkRef = { label: string; url: string }
type EntityRefMap = Record<string, { label: string; url: string }>
type PostRefMap = Record<string, { label: string; url: string }>

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

function titleCaseEntityType(value: string) {
  if (value === 'published_file') return 'Published File'
  return value ? `${value[0].toUpperCase()}${value.slice(1)}` : ''
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

function parseNoteLinkRef(rawValue: unknown, projectId: string): ParsedNoteLinkRef | null {
  const raw = asText(rawValue).trim()
  if (!raw) return null

  if (/^https?:\/\//i.test(raw))
    return { raw, kind: 'url', id: '', url: raw }

  const pulsePostMatch = raw.match(/^\/pulse\/post\/(\d+)/i)
  if (pulsePostMatch)
    return { raw, kind: 'post', id: pulsePostMatch[1], url: `/pulse/post/${pulsePostMatch[1]}` }

  const apexEntityMatch = raw.match(/^\/apex\/\d+\/(assets|shots|sequences|tasks|versions)\/(\d+)/i)
  if (apexEntityMatch) {
    const segment = apexEntityMatch[1].toLowerCase()
    const id = apexEntityMatch[2]
    const kind = segment === 'assets' ? 'asset'
      : segment === 'shots' ? 'shot'
      : segment === 'sequences' ? 'sequence'
      : segment === 'tasks' ? 'task' : 'version'
    return { raw, kind, id, url: buildFallbackLink(projectId, kind, id) }
  }

  const projectPathMatch = raw.match(/^\/apex\/(\d+)\/?$/i)
  if (projectPathMatch)
    return { raw, kind: 'project', id: projectPathMatch[1], url: `/apex/${projectPathMatch[1]}` }

  const publishedFilePathMatch = raw.match(/^\/apex\/\d+\/published-files\?selected=(\d+)/i)
  if (publishedFilePathMatch) {
    const id = publishedFilePathMatch[1]
    return { raw, kind: 'published_file', id, url: buildFallbackLink(projectId, 'published_file', id) }
  }

  const typedMatch = raw.match(
    /^(asset|shot|sequence|task|version|project|post|published_file|published-file)[:#/\s-]+(\d+)$/i
  )
  if (typedMatch) {
    const normalizedType = typedMatch[1].toLowerCase().replace('-', '_')
    const id = typedMatch[2]
    if (normalizedType === 'post')
      return { raw, kind: 'post', id, url: `/pulse/post/${id}` }
    if (
      normalizedType === 'asset' || normalizedType === 'shot' ||
      normalizedType === 'sequence' || normalizedType === 'task' ||
      normalizedType === 'version' || normalizedType === 'project' ||
      normalizedType === 'published_file'
    ) {
      return { raw, kind: normalizedType, id, url: buildFallbackLink(projectId, normalizedType, id) }
    }
  }

  return { raw, kind: 'unknown', id: '', url: '' }
}

function resolveNoteLinkRef(
  parsed: ParsedNoteLinkRef,
  projectId: string,
  entityMap: EntityRefMap,
  postMap: PostRefMap
): ResolvedNoteLinkRef {
  if (parsed.kind === 'url')
    return { label: parsed.raw, url: parsed.url }
  if (parsed.kind === 'post') {
    const postRef = parsed.id ? postMap[parsed.id] : null
    if (postRef) return postRef
    if (parsed.id) return { label: `Post #${parsed.id}`, url: `/pulse/post/${parsed.id}` }
    return { label: parsed.raw, url: parsed.url }
  }
  if (
    parsed.kind === 'asset' || parsed.kind === 'shot' || parsed.kind === 'sequence' ||
    parsed.kind === 'task' || parsed.kind === 'version' || parsed.kind === 'project' ||
    parsed.kind === 'published_file'
  ) {
    const mapped = parsed.id ? entityMap[toEntityKey(parsed.kind, parsed.id)] : null
    if (mapped) return mapped
    if (parsed.id) {
      return {
        label: `${titleCaseEntityType(parsed.kind)} #${parsed.id}`,
        url: parsed.url || buildFallbackLink(projectId, parsed.kind, parsed.id),
      }
    }
  }
  return { label: parsed.raw, url: parsed.url }
}

// ---------------------------------------------------------------------------
// Attachment & link resolution (runs after initial load)
// ---------------------------------------------------------------------------

type ResolvedAttachment = {
  id: string; file_name: string; file_type: string
  storage_path: string; thumbnail_url: string
  signed_url: string; preview_url: string
}

async function resolveNoteExtras(
  rows: NoteRow[],
  projId: string
): Promise<{
  linksByNoteId: Record<string, ResolvedNoteLinkRef[]>
  attachmentsByNoteId: Record<string, ResolvedAttachment[]>
}> {
  const supabase = createClient()

  // 1. Parse all link tokens and collect entity/post IDs to resolve
  const entityIdsByType: Record<string, number[]> = {
    asset: [], shot: [], sequence: [], task: [], version: [],
    published_file: [], project: [],
  }
  const parsedByNote: Record<string, ParsedNoteLinkRef[]> = {}
  const postIdsFromLinks = new Set<number>()
  const allNoteIds: string[] = []

  for (const note of rows) {
    const noteId = asText(note.id).trim()
    allNoteIds.push(noteId)
    const parsed = parseTextArray(note.links)
      .map((token) => parseNoteLinkRef(token, projId))
      .filter((item): item is ParsedNoteLinkRef => Boolean(item))
    parsedByNote[noteId] = parsed

    for (const ref of parsed) {
      const numId = toNumber(ref.id)
      if (numId === null) continue
      if (ref.kind === 'post') { postIdsFromLinks.add(numId); continue }
      if (entityIdsByType[ref.kind]) entityIdsByType[ref.kind].push(numId)
    }
  }

  // Deduplicate
  for (const key of Object.keys(entityIdsByType)) {
    entityIdsByType[key] = Array.from(new Set(entityIdsByType[key]))
  }
  const postIds = Array.from(postIdsFromLinks)

  // 2. Batch-fetch all link-referenced entities + attachments + posts
  const [
    assetsRes, shotsRes, sequencesRes, tasksRes, versionsRes,
    pubFilesRes, projectsRes, postsRes, attachRes,
  ] = await Promise.all([
    entityIdsByType.asset.length > 0
      ? supabase.from('assets').select('id, code, name').in('id', entityIdsByType.asset).is('deleted_at', null)
      : Promise.resolve({ data: [], error: null }),
    entityIdsByType.shot.length > 0
      ? supabase
          .from('shots')
          .select('id, code, name, sequence:sequences!shots_sequence_id_fkey(code)')
          .in('id', entityIdsByType.shot)
          .is('deleted_at', null)
      : Promise.resolve({ data: [], error: null }),
    entityIdsByType.sequence.length > 0
      ? supabase.from('sequences').select('id, code, name').in('id', entityIdsByType.sequence).is('deleted_at', null)
      : Promise.resolve({ data: [], error: null }),
    entityIdsByType.task.length > 0
      ? supabase.from('tasks').select('id, name').in('id', entityIdsByType.task).is('deleted_at', null)
      : Promise.resolve({ data: [], error: null }),
    entityIdsByType.version.length > 0
      ? supabase
          .from('versions')
          .select('id, code, version_number')
          .in('id', entityIdsByType.version)
          .is('deleted_at', null)
      : Promise.resolve({ data: [], error: null }),
    entityIdsByType.published_file.length > 0
      ? supabase.from('published_files').select('id, code, name').in('id', entityIdsByType.published_file)
      : Promise.resolve({ data: [], error: null }),
    entityIdsByType.project.length > 0
      ? supabase.from('projects').select('id, code, name').in('id', entityIdsByType.project).is('deleted_at', null)
      : Promise.resolve({ data: [], error: null }),
    postIds.length > 0
      ? supabase.from('posts').select('id, content').in('id', postIds)
      : Promise.resolve({ data: [], error: null }),
    allNoteIds.length > 0
      ? supabase.from('attachments').select('id, file_name, file_type, storage_path, thumbnail_url, note_id').in('note_id', allNoteIds)
      : Promise.resolve({ data: [], error: null }),
  ])

  // 3. Build entity + post maps for link resolution
  const entityMap: EntityRefMap = {}
  const postMap: PostRefMap = {}

  for (const row of (assetsRes.data || []) as Record<string, unknown>[]) {
    const id = asText(row.id)
    const label = `${asText(row.code).trim() || `Asset #${id}`}${asText(row.name).trim() ? ` - ${asText(row.name).trim()}` : ''}`
    entityMap[toEntityKey('asset', id)] = { label, url: `/apex/${projId}/assets/${id}` }
  }
  for (const row of (shotsRes.data || []) as Record<string, unknown>[]) {
    const id = asText(row.id)
    const sequenceCode = Array.isArray(row.sequence)
      ? asText((row.sequence as Record<string, unknown>[])[0]?.code).trim()
      : asText((row.sequence as Record<string, unknown> | null)?.code).trim()
    const shotCode = asText(row.code).trim()
    const baseCode = sequenceCode && shotCode ? `${sequenceCode}${shotCode}` : shotCode || `Shot #${id}`
    const label = `${baseCode}${asText(row.name).trim() ? ` - ${asText(row.name).trim()}` : ''}`
    entityMap[toEntityKey('shot', id)] = { label, url: `/apex/${projId}/shots/${id}` }
  }
  for (const row of (sequencesRes.data || []) as Record<string, unknown>[]) {
    const id = asText(row.id)
    const label = `${asText(row.code).trim() || `Sequence #${id}`}${asText(row.name).trim() ? ` - ${asText(row.name).trim()}` : ''}`
    entityMap[toEntityKey('sequence', id)] = { label, url: `/apex/${projId}/sequences/${id}` }
  }
  for (const row of (tasksRes.data || []) as Record<string, unknown>[]) {
    const id = asText(row.id)
    entityMap[toEntityKey('task', id)] = { label: asText(row.name).trim() || `Task #${id}`, url: `/apex/${projId}/tasks/${id}` }
  }
  for (const row of (versionsRes.data || []) as Record<string, unknown>[]) {
    const id = asText(row.id)
    const code = asText(row.code).trim() || `Version #${id}`
    const vnum = toNumber(row.version_number)
    entityMap[toEntityKey('version', id)] = { label: vnum !== null ? `${code} v${vnum}` : code, url: `/apex/${projId}/versions/${id}` }
  }
  for (const row of (pubFilesRes.data || []) as Record<string, unknown>[]) {
    const id = asText(row.id)
    entityMap[toEntityKey('published_file', id)] = {
      label: asText(row.code).trim() || asText(row.name).trim() || `Published File #${id}`,
      url: `/apex/${projId}/published-files?selected=${id}`,
    }
  }
  for (const row of (projectsRes.data || []) as Record<string, unknown>[]) {
    const id = asText(row.id)
    entityMap[toEntityKey('project', id)] = { label: asText(row.name).trim() || asText(row.code).trim() || `Project #${id}`, url: `/apex/${id}` }
  }
  for (const row of (postsRes.data || []) as Record<string, unknown>[]) {
    const id = asText(row.id)
    const content = asText(row.content).replace(/\s+/g, ' ').trim()
    const snippet = content.length > 64 ? `${content.slice(0, 61)}...` : content
    postMap[id] = { label: snippet ? `Post #${id} - ${snippet}` : `Post #${id}`, url: `/pulse/post/${id}` }
  }

  // 4. Resolve links per note
  const linksByNoteId: Record<string, ResolvedNoteLinkRef[]> = {}
  for (const noteId of Object.keys(parsedByNote)) {
    linksByNoteId[noteId] = parsedByNote[noteId].map((ref) =>
      resolveNoteLinkRef(ref, projId, entityMap, postMap)
    )
  }

  // 5. Resolve attachments per note with signed URLs
  const attachmentRows = (attachRes.data || []) as Record<string, unknown>[]
  const pathSet = new Set<string>()
  for (const a of attachmentRows) {
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

  const attachmentsByNoteId: Record<string, ResolvedAttachment[]> = {}
  for (const a of attachmentRows) {
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
      if (!attachmentsByNoteId[noteId]) attachmentsByNoteId[noteId] = []
      attachmentsByNoteId[noteId].push(resolved)
    }
  }

  return { linksByNoteId, attachmentsByNoteId }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeNoteEntityType(
  value: unknown
): 'asset' | 'shot' | 'sequence' | 'task' | 'version' | 'project' | 'published_file' | null {
  const normalized = asText(value).trim().toLowerCase()
  if (
    normalized === 'asset' || normalized === 'shot' || normalized === 'sequence' ||
    normalized === 'task' || normalized === 'version' || normalized === 'project' ||
    normalized === 'published_file'
  ) return normalized
  return null
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function NotesPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const [projectId, setProjectId] = useState<string>('')
  const [rawNotes, setRawNotes] = useState<NoteRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [cellError, setCellError] = useState<string | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedNote, setSelectedNote] = useState<NoteRow | null>(null)

  // Note-specific extras (links + attachments) resolved asynchronously
  const [linksByNoteId, setLinksByNoteId] = useState<Record<string, ResolvedNoteLinkRef[]>>({})
  const [attachmentsByNoteId, setAttachmentsByNoteId] = useState<Record<string, ResolvedAttachment[]>>({})

  useEffect(() => {
    params.then((p) => {
      setProjectId(p.projectId)
      void loadNotes(p.projectId)
    })
  }, [params])

  async function loadNotes(projId: string) {
    try {
      setIsLoading(true)
      setLoadError(null)
      setCellError(null)
      const supabase = createClient()
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('project_id', projId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (error) throw error
      const rows = (data || []) as NoteRow[]
      setRawNotes(rows)

      // Resolve links + attachments (notes-specific)
      if (rows.length > 0) {
        const extras = await resolveNoteExtras(rows, projId)
        setLinksByNoteId(extras.linksByNoteId)
        setAttachmentsByNoteId(extras.attachmentsByNoteId)
      } else {
        setLinksByNoteId({})
        setAttachmentsByNoteId({})
      }
    } catch (error) {
      console.error('Error loading notes:', error)
      setLoadError(error instanceof Error ? error.message : 'Error loading notes')
      setRawNotes([])
    } finally {
      setIsLoading(false)
    }
  }

  function refreshNotesData() {
    if (!projectId) return
    void loadNotes(projectId)
  }

  // Use the unified hook for schema-driven fields, options, entity resolution,
  // and column generation.  The hook resolves: created_by, entity_id (polymorphic),
  // task_id, and project_id automatically.
  const columnOverrides = useMemo<Record<string, Partial<TableColumn>>>(() => ({
    subject: { label: 'Subject', width: '220px', editable: true, editor: 'text' },
    content: { label: 'Body', width: '420px', editable: true, editor: 'textarea' },
    links: {
      label: 'Links',
      width: '280px',
      editable: true,
      editor: 'text',
      formatValue: (value: unknown, row: unknown) => {
        const r = row && typeof row === 'object' ? (row as Record<string, unknown>) : {}
        const noteId = asText(r.id).trim()
        const resolved = linksByNoteId[noteId]
        if (resolved && resolved.length > 0) {
          return resolved.length === 1
            ? resolved[0].label
            : `${resolved[0].label} +${resolved.length - 1} more`
        }
        return parseTextArray(value).join(', ')
      },
      parseValue: (value: unknown) => parseTextArray(value),
    },
  }), [projectId, linksByNoteId])

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

  const linksOpenColumn: TableColumn = useMemo(() => ({
    id: 'links_open_label',
    label: 'Link',
    type: 'link',
    width: '90px',
    linkHref: (row: unknown) => {
      const r = row && typeof row === 'object' ? (row as Record<string, unknown>) : {}
      const noteId = asText(r.id).trim()
      const resolved = linksByNoteId[noteId]
      if (resolved) {
        const first = resolved.find((l) => asText(l.url).trim()) || resolved[0]
        return first ? asText(first.url).trim() : ''
      }
      return ''
    },
    formatValue: (_v: unknown, row: unknown) => {
      const r = row && typeof row === 'object' ? (row as Record<string, unknown>) : {}
      const noteId = asText(r.id).trim()
      const resolved = linksByNoteId[noteId]
      if (resolved) {
        const first = resolved.find((l) => asText(l.url).trim())
        return first ? 'Open' : '-'
      }
      return '-'
    },
  }), [linksByNoteId])

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
        const first = attachments.find(
          (a) =>
            asText(a.preview_url).trim() ||
            asText(a.signed_url).trim() ||
            asText(a.thumbnail_url).trim() ||
            asText(a.storage_path).trim()
        )
        if (!first) return ''
        return (
          asText(first.preview_url).trim() ||
          asText(first.signed_url).trim() ||
          asText(first.thumbnail_url).trim() ||
          asText(first.storage_path).trim()
        )
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

  const { data, columns, handleCellUpdate } = useEntityData({
    entity: 'note',
    rows: rawNotes,
    projectId,
    columnOverrides,
    extraColumns: {
      prepend: [noteOpenColumn],
      append: [linksOpenColumn, ...attachmentColumns],
    },
  })

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

  async function handleBulkDelete(rows: NoteRow[]) {
    const failures: string[] = []
    for (const row of rows) {
      const rowId = asText(row?.id).trim()
      if (!rowId) continue
      const result = await deleteNote(rowId, projectId)
      if (result?.error) {
        failures.push(`${asText(row?.subject).trim() || rowId}: ${result.error}`)
      }
    }
    refreshNotesData()
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
        failed.push({ row: index + 2, message: 'Note content is required.' })
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
          tags: parseTextArray(row.tags),
          cc: parseTextArray(row.cc),
        })
        if (result?.error) throw new Error(result.error)
        imported += 1
      } catch (error) {
        failed.push({
          row: index + 2,
          message: error instanceof Error ? error.message : 'Failed to import note row.',
        })
      }
    }

    refreshNotesData()
    return { imported, failed }
  }

  async function onCellUpdate(
    row: Record<string, unknown>,
    column: TableColumn,
    value: unknown
  ) {
    setCellError(null)
    // Note update action takes only (id, formData) — the hook's handleCellUpdate
    // uses dispatchUpdate which wraps updateNote correctly.
    await handleCellUpdate(row, column, value)
    const rowId = String(row.id)
    setRawNotes((prev) =>
      prev.map((n) =>
        String(n.id) === rowId ? { ...n, [column.id]: value } : n
      )
    )
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Loading notes...</p>
      </div>
    )
  }

  return (
    <>
      <CreateNoteDialog
        open={showCreateDialog}
        onOpenChange={(open) => {
          setShowCreateDialog(open)
          if (!open) refreshNotesData()
        }}
        projectId={projectId}
      />

      <EditNoteDialog
        open={showEditDialog}
        onOpenChange={(open) => {
          setShowEditDialog(open)
          if (!open) refreshNotesData()
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

      <ApexPageShell
        title="Notes"
        action={
          <button
            onClick={() => setShowCreateDialog(true)}
            className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-black transition hover:bg-primary"
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

        {data.length === 0 ? (
          <ApexEmptyState
            icon={<MessageSquare className="h-12 w-12" />}
            title="No notes yet"
            description="Create your first note to start tracking feedback and discussion."
            action={
              <button
                onClick={() => setShowCreateDialog(true)}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-black transition hover:bg-primary"
              >
                Create First Note
              </button>
            }
          />
        ) : (
          <EntityTable
            columns={columns}
            data={data}
            entityType="notes"
            csvExportFilename="apex-notes"
            onCsvImport={handleCsvImport}
            onBulkDelete={(rows) => handleBulkDelete(rows as NoteRow[])}
            onAdd={() => setShowCreateDialog(true)}
            onEdit={(row) => handleEdit(row as NoteRow)}
            onDelete={(row) => handleDelete(row as NoteRow)}
            onCellUpdate={onCellUpdate}
            onCellUpdateError={setCellError}
          />
        )}
      </ApexPageShell>
    </>
  )
}
