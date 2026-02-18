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
type PostRefMap = Record<string, { label: string; url: string }>

type ParsedNoteLinkKind =
  | 'asset'
  | 'shot'
  | 'sequence'
  | 'task'
  | 'version'
  | 'project'
  | 'published_file'
  | 'post'
  | 'url'
  | 'unknown'

type ParsedNoteLinkRef = {
  raw: string
  kind: ParsedNoteLinkKind
  id: string
  url: string
}

type ResolvedNoteLinkRef = {
  label: string
  url: string
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

function titleCaseEntityType(value: string) {
  if (value === 'published_file') return 'Published File'
  if (!value) return ''
  return `${value[0].toUpperCase()}${value.slice(1)}`
}

function parseNoteLinkRef(rawValue: unknown, projectId: string): ParsedNoteLinkRef | null {
  const raw = asText(rawValue).trim()
  if (!raw) return null

  if (/^https?:\/\//i.test(raw)) {
    return { raw, kind: 'url', id: '', url: raw }
  }

  const pulsePostMatch = raw.match(/^\/pulse\/post\/(\d+)/i)
  if (pulsePostMatch) {
    const id = pulsePostMatch[1]
    return { raw, kind: 'post', id, url: `/pulse/post/${id}` }
  }

  const apexEntityMatch = raw.match(
    /^\/apex\/\d+\/(assets|shots|sequences|tasks|versions)\/(\d+)/i
  )
  if (apexEntityMatch) {
    const segment = apexEntityMatch[1].toLowerCase()
    const id = apexEntityMatch[2]
    const kind =
      segment === 'assets'
        ? 'asset'
        : segment === 'shots'
          ? 'shot'
          : segment === 'sequences'
            ? 'sequence'
            : segment === 'tasks'
              ? 'task'
              : 'version'
    return {
      raw,
      kind,
      id,
      url: buildFallbackLink(projectId, kind, id),
    }
  }

  const projectPathMatch = raw.match(/^\/apex\/(\d+)\/?$/i)
  if (projectPathMatch) {
    const id = projectPathMatch[1]
    return { raw, kind: 'project', id, url: `/apex/${id}` }
  }

  const publishedFilePathMatch = raw.match(/^\/apex\/\d+\/published-files\?selected=(\d+)/i)
  if (publishedFilePathMatch) {
    const id = publishedFilePathMatch[1]
    return {
      raw,
      kind: 'published_file',
      id,
      url: buildFallbackLink(projectId, 'published_file', id),
    }
  }

  const typedMatch = raw.match(
    /^(asset|shot|sequence|task|version|project|post|published_file|published-file)[:#/\s-]+(\d+)$/i
  )
  if (typedMatch) {
    const normalizedType = typedMatch[1].toLowerCase().replace('-', '_')
    const id = typedMatch[2]
    if (normalizedType === 'post') {
      return { raw, kind: 'post', id, url: `/pulse/post/${id}` }
    }
    if (
      normalizedType === 'asset' ||
      normalizedType === 'shot' ||
      normalizedType === 'sequence' ||
      normalizedType === 'task' ||
      normalizedType === 'version' ||
      normalizedType === 'project' ||
      normalizedType === 'published_file'
    ) {
      return {
        raw,
        kind: normalizedType,
        id,
        url: buildFallbackLink(projectId, normalizedType, id),
      }
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
  if (parsed.kind === 'url') {
    return { label: parsed.raw, url: parsed.url }
  }

  if (parsed.kind === 'post') {
    const postRef = parsed.id ? postMap[parsed.id] : null
    if (postRef) return postRef
    if (parsed.id) return { label: `Post #${parsed.id}`, url: `/pulse/post/${parsed.id}` }
    return { label: parsed.raw, url: parsed.url }
  }

  if (
    parsed.kind === 'asset' ||
    parsed.kind === 'shot' ||
    parsed.kind === 'sequence' ||
    parsed.kind === 'task' ||
    parsed.kind === 'version' ||
    parsed.kind === 'project' ||
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
          project_ref:projects!notes_project_id_fkey(
            id,
            code,
            name
          ),
          attachment_rows:attachments(
            id,
            file_name,
            file_type,
            storage_path,
            thumbnail_url
          )
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
      const parsedLinkRefsByNoteId: Record<string, ParsedNoteLinkRef[]> = {}
      const postIdsFromLinks = new Set<number>()
      const attachmentPathSet = new Set<string>()

      for (const note of rows) {
        const noteId = asText(note.id).trim()
        const entityType = asText(note.entity_type).trim().toLowerCase()
        const entityId = toNumber(note.entity_id)
        if (entityId !== null && entityIdsByType[entityType]) {
          entityIdsByType[entityType].push(entityId)
        }

        const taskId = toNumber(note.task_id)
        if (taskId !== null) {
          entityIdsByType.task.push(taskId)
        }

        const parsedLinkRefs = parseListValue(note.links)
          .map((token) => parseNoteLinkRef(token, projId))
          .filter((item): item is ParsedNoteLinkRef => Boolean(item))
        parsedLinkRefsByNoteId[noteId] = parsedLinkRefs

        for (const parsedLinkRef of parsedLinkRefs) {
          const parsedId = toNumber(parsedLinkRef.id)
          if (parsedId === null) continue

          if (parsedLinkRef.kind === 'post') {
            postIdsFromLinks.add(parsedId)
            continue
          }

          if (
            parsedLinkRef.kind === 'asset' ||
            parsedLinkRef.kind === 'shot' ||
            parsedLinkRef.kind === 'sequence' ||
            parsedLinkRef.kind === 'task' ||
            parsedLinkRef.kind === 'version' ||
            parsedLinkRef.kind === 'project' ||
            parsedLinkRef.kind === 'published_file'
          ) {
            entityIdsByType[parsedLinkRef.kind].push(parsedId)
          }
        }

        const noteAttachmentRows = Array.isArray(note.attachment_rows) ? note.attachment_rows : []
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

      for (const key of Object.keys(entityIdsByType)) {
        entityIdsByType[key] = Array.from(new Set(entityIdsByType[key]))
      }

      const noteProjectIds = Array.from(
        new Set(
          rows
            .map((note) => toNumber(note.project_id))
            .filter((id): id is number => id !== null)
        )
      )

      const projectIdsForLookup = Array.from(
        new Set([...entityIdsByType.project, ...noteProjectIds])
      )
      const postIdsForLookup = Array.from(postIdsFromLinks)

      const [
        assetsResult,
        shotsResult,
        sequencesResult,
        tasksResult,
        versionsResult,
        publishedFilesResult,
        projectsResult,
        postsResult,
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
        projectIdsForLookup.length > 0
          ? supabase
              .from('projects')
              .select('id, code, name')
              .in('id', projectIdsForLookup)
          : Promise.resolve({ data: [], error: null }),
        postIdsForLookup.length > 0
          ? supabase.from('posts').select('id, content').in('id', postIdsForLookup)
          : Promise.resolve({ data: [], error: null }),
      ])

      if (assetsResult.error) throw assetsResult.error
      if (shotsResult.error) throw shotsResult.error
      if (sequencesResult.error) throw sequencesResult.error
      if (tasksResult.error) throw tasksResult.error
      if (versionsResult.error) throw versionsResult.error
      if (publishedFilesResult.error) throw publishedFilesResult.error
      if (projectsResult.error) throw projectsResult.error
      if (postsResult.error) throw postsResult.error

      const entityMap: EntityRefMap = {}
      const postMap: PostRefMap = {}

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
        const label = name || code || `Project #${id}`
        entityMap[toEntityKey('project', id)] = {
          label,
          url: `/apex/${id}`,
        }
      }

      for (const row of postsResult.data || []) {
        const id = asText(row.id)
        const content = asText(row.content).replace(/\s+/g, ' ').trim()
        const snippet = content.length > 64 ? `${content.slice(0, 61)}...` : content
        postMap[id] = {
          label: snippet ? `Post #${id} - ${snippet}` : `Post #${id}`,
          url: `/pulse/post/${id}`,
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
        rows.map((note) => {
          const noteId = asText(note.id).trim()
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
          const noteProjectId = asText(note.project_id).trim()
          const noteProjectName = asText(note.project_ref?.name).trim()
          const noteProjectCode = asText(note.project_ref?.code).trim()
          const noteProjectLabel = noteProjectName || noteProjectCode
          const noteProjectRef = noteProjectId
            ? entityMap[toEntityKey('project', noteProjectId)]
            : null
          const projectEntityFallbackLabel =
            entityType === 'project' &&
            entityId &&
            noteProjectId &&
            entityId === noteProjectId
              ? noteProjectLabel
              : ''
          const noteEntityLabel = entityRef?.label || projectEntityFallbackLabel || fallbackLabel
          const noteEntityUrl = entityRef?.url || fallbackUrl

          const noteTaskId = asText(note.task_id).trim()
          const noteTaskRef = noteTaskId
            ? entityMap[toEntityKey('task', noteTaskId)]
            : null

          const parsedLinkRefs = parsedLinkRefsByNoteId[noteId] || []
          const resolvedLinkRefs = parsedLinkRefs.map((parsedLinkRef) =>
            resolveNoteLinkRef(parsedLinkRef, projId, entityMap, postMap)
          )
          const firstResolvedLink =
            resolvedLinkRefs.find((link) => asText(link.url).trim()) ||
            resolvedLinkRefs[0] ||
            null
          const linksSummary =
            resolvedLinkRefs.length === 0
              ? '-'
              : resolvedLinkRefs.length === 1
                ? resolvedLinkRefs[0].label
                : `${resolvedLinkRefs[0].label} +${resolvedLinkRefs.length - 1} more`
          const linksAllLabel = resolvedLinkRefs.map((link) => link.label).join(', ')

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
            author_label: author,
            link_label: noteEntityLabel,
            link_url: noteEntityUrl,
            entity_label: noteEntityLabel,
            entity_url: noteEntityUrl,
            note_url: noteId ? `/apex/${projId}/notes/${noteId}` : '',
            note_link_label: noteId ? 'Open' : '-',
            task_label:
              noteTaskRef?.label || (noteTaskId ? `Task #${noteTaskId}` : '-'),
            task_url:
              noteTaskRef?.url || (noteTaskId ? `/apex/${projId}/tasks/${noteTaskId}` : ''),
            links_label: linksSummary,
            links_full_label: linksAllLabel,
            links_url: firstResolvedLink?.url || '',
            links_open_label: firstResolvedLink?.url ? 'Open' : '-',
            links_resolved: resolvedLinkRefs,
            project_label: noteProjectRef?.label || noteProjectLabel || noteProjectId || '-',
            attachment_rows: resolvedAttachments,
            attachments_display:
              resolvedAttachments.length > 0
                ? resolvedAttachments.map((attachment) => attachment.file_name).join(', ')
                : '-',
            attachments_preview_url: firstAttachmentPreview,
            attachments_count: resolvedAttachments.length,
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
      prev.map((note) => {
        if (note.id !== row.id) return note
        const next = { ...note, [column.id]: value }
        if (column.id === 'links') {
          const nextLinks = parseListValue(value)
          next.links_label = nextLinks.length > 0 ? nextLinks.join(', ') : '-'
          next.links_full_label = next.links_label
          next.links_url = ''
        }
        return next
      })
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
      {
        id: 'entity_label',
        label: 'Entity',
        type: 'link',
        width: '220px',
        linkHref: (row: unknown) => {
          const rowRecord =
            row && typeof row === 'object'
              ? (row as Record<string, unknown>)
              : {}
          return asText(rowRecord.entity_url).trim()
        },
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
        width: '220px',
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
        width: '280px',
        editable: true,
        editor: 'text',
        formatValue: (value: unknown, row: unknown) => {
          const rowRecord =
            row && typeof row === 'object'
              ? (row as Record<string, unknown>)
              : {}
          const label = asText(rowRecord.links_label).trim()
          if (label) return label
          return parseListValue(value).join(', ')
        },
        parseValue: (value: unknown) => parseListValue(value),
      },
      {
        id: 'links_open_label',
        label: 'Link',
        type: 'link',
        width: '90px',
        linkHref: (row: unknown) => {
          const rowRecord =
            row && typeof row === 'object'
              ? (row as Record<string, unknown>)
              : {}
          return asText(rowRecord.links_url).trim()
        },
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
      { id: 'entity_type', label: 'Type', type: 'text', width: '120px' },
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

        {notes.length === 0 ? (
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
