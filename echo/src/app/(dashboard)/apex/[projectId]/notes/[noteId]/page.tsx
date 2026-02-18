'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowLeft, Loader2, MessageSquare, Paperclip, Send } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { createNote } from '@/actions/notes'

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

type NoteAttachment = {
  id: string
  file_name: string
  file_type: string
  storage_path: string
  thumbnail_url: string
  signed_url: string
  preview_url: string
}

type DisplayNote = Record<string, unknown> & {
  id: string
  author_label: string
  project_label: string
  task_label: string
  entity_label: string
  entity_url: string
  links_resolved: ResolvedNoteLinkRef[]
  attachments_resolved: NoteAttachment[]
}

function asText(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value)
}

function toNumber(value: unknown): number | null {
  const text = asText(value).trim()
  if (!text) return null
  const parsed = Number(text)
  return Number.isNaN(parsed) ? null : parsed
}

function parseListValue(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => asText(item).trim()).filter(Boolean)
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }
  return []
}

function toEntityKey(entityType: string, entityId: unknown): string {
  return `${entityType}:${asText(entityId).trim()}`
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

function formatDateTime(value: unknown) {
  const date = new Date(asText(value))
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString()
}

function AttachmentGrid({ attachments }: { attachments: NoteAttachment[] }) {
  if (attachments.length === 0) return null

  return (
    <div className="mt-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Paperclip className="h-3.5 w-3.5" />
        Attachments ({attachments.length})
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {attachments.map((attachment) => {
          const previewUrl = asText(attachment.preview_url).trim()
          const hasPreview = Boolean(previewUrl)
          return (
            <div
              key={attachment.id || attachment.storage_path || attachment.file_name}
              className="rounded-md border border-border bg-background/60 p-2"
            >
              {hasPreview ? (
                <img
                  src={previewUrl}
                  alt={attachment.file_name}
                  className="h-28 w-full cursor-pointer rounded bg-accent/40 object-contain transition hover:opacity-90"
                  onClick={() => window.open(previewUrl, '_blank')}
                />
              ) : (
                <div className="flex h-28 w-full items-center justify-center rounded bg-accent text-xs text-muted-foreground">
                  No Preview
                </div>
              )}
              <p className="mt-2 break-words text-xs text-foreground" title={attachment.file_name}>
                {attachment.file_name}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function NoteDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; noteId: string }>
}) {
  const [projectId, setProjectId] = useState('')
  const [noteId, setNoteId] = useState('')
  const [rootNote, setRootNote] = useState<DisplayNote | null>(null)
  const [replies, setReplies] = useState<DisplayNote[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [isReplying, setIsReplying] = useState(false)

  useEffect(() => {
    params.then((resolved) => {
      setProjectId(resolved.projectId)
      setNoteId(resolved.noteId)
      void loadNoteData(resolved.projectId, resolved.noteId)
    })
  }, [params])

  async function loadNoteData(nextProjectId: string, nextNoteId: string) {
    try {
      setIsLoading(true)
      setLoadError(null)
      const supabase = createClient()

      const [rootResult, repliesResult] = await Promise.all([
        supabase
          .from('notes')
          .select(
            `
            *,
            created_by_profile:profiles!notes_created_by_fkey(id, full_name, email),
            project_ref:projects!notes_project_id_fkey(id, code, name),
            task_ref:tasks(id, name),
            attachment_rows:attachments(
              id,
              file_name,
              file_type,
              storage_path,
              thumbnail_url
            )
          `
          )
          .eq('project_id', nextProjectId)
          .eq('id', nextNoteId)
          .maybeSingle(),
        supabase
          .from('notes')
          .select(
            `
            *,
            created_by_profile:profiles!notes_created_by_fkey(id, full_name, email),
            project_ref:projects!notes_project_id_fkey(id, code, name),
            task_ref:tasks(id, name),
            attachment_rows:attachments(
              id,
              file_name,
              file_type,
              storage_path,
              thumbnail_url
            )
          `
          )
          .eq('project_id', nextProjectId)
          .eq('parent_note_id', nextNoteId)
          .order('created_at', { ascending: true }),
      ])

      if (rootResult.error) throw rootResult.error
      if (repliesResult.error) throw repliesResult.error
      if (!rootResult.data) {
        setRootNote(null)
        setReplies([])
        setLoadError('Note not found.')
        return
      }

      const notesInThread = [rootResult.data, ...(repliesResult.data || [])]
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

      for (const note of notesInThread) {
        const rawEntityType = asText(note.entity_type).trim().toLowerCase()
        const entityId = toNumber(note.entity_id)
        if (entityId !== null && entityIdsByType[rawEntityType]) {
          entityIdsByType[rawEntityType].push(entityId)
        }

        const taskId = toNumber(note.task_id)
        if (taskId !== null) {
          entityIdsByType.task.push(taskId)
        }

        const noteIdKey = asText(note.id).trim()
        const parsedLinkRefs = parseListValue(note.links)
          .map((token) => parseNoteLinkRef(token, nextProjectId))
          .filter((item): item is ParsedNoteLinkRef => Boolean(item))
        parsedLinkRefsByNoteId[noteIdKey] = parsedLinkRefs

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

      for (const key of Object.keys(entityIdsByType)) {
        entityIdsByType[key] = Array.from(new Set(entityIdsByType[key]))
      }

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
        entityIdsByType.project.length > 0
          ? supabase
              .from('projects')
              .select('id, code, name')
              .in('id', entityIdsByType.project)
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
          url: `/apex/${nextProjectId}/assets/${id}`,
        }
      }

      for (const row of shotsResult.data || []) {
        const id = asText(row.id)
        const sequenceCode = Array.isArray(row.sequence)
          ? asText(row.sequence[0]?.code).trim()
          : asText((row.sequence as Record<string, unknown> | null)?.code).trim()
        const shotCode = asText(row.code).trim()
        const baseCode = sequenceCode && shotCode ? `${sequenceCode}${shotCode}` : shotCode || `Shot #${id}`
        const label = `${baseCode}${asText(row.name).trim() ? ` - ${asText(row.name).trim()}` : ''}`
        entityMap[toEntityKey('shot', id)] = {
          label,
          url: `/apex/${nextProjectId}/shots/${id}`,
        }
      }

      for (const row of sequencesResult.data || []) {
        const id = asText(row.id)
        const label = `${asText(row.code).trim() || `Sequence #${id}`}${asText(row.name).trim() ? ` - ${asText(row.name).trim()}` : ''}`
        entityMap[toEntityKey('sequence', id)] = {
          label,
          url: `/apex/${nextProjectId}/sequences/${id}`,
        }
      }

      for (const row of tasksResult.data || []) {
        const id = asText(row.id)
        const label = asText(row.name).trim() || `Task #${id}`
        entityMap[toEntityKey('task', id)] = {
          label,
          url: `/apex/${nextProjectId}/tasks/${id}`,
        }
      }

      for (const row of versionsResult.data || []) {
        const id = asText(row.id)
        const code = asText(row.code).trim() || `Version #${id}`
        const versionNumber = toNumber(row.version_number)
        const label = versionNumber === null ? code : `${code} v${versionNumber}`
        entityMap[toEntityKey('version', id)] = {
          label,
          url: `/apex/${nextProjectId}/versions/${id}`,
        }
      }

      for (const row of publishedFilesResult.data || []) {
        const id = asText(row.id)
        const label = `${asText(row.code).trim() || asText(row.name).trim() || `Published File #${id}`}`
        entityMap[toEntityKey('published_file', id)] = {
          label,
          url: `/apex/${nextProjectId}/published-files?selected=${id}`,
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
          console.error('Error loading signed attachment URLs:', signedError)
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

      const normalizeNote = (note: Record<string, unknown>): DisplayNote => {
        const currentNoteId = asText(note.id).trim()
        const authorLabel =
          asText((note.created_by_profile as Record<string, unknown> | null)?.full_name).trim() ||
          asText((note.created_by_profile as Record<string, unknown> | null)?.email).trim() ||
          'Unknown'

        const entityType = asText(note.entity_type).trim().toLowerCase()
        const entityId = asText(note.entity_id).trim()
        const entityRef = entityType && entityId ? entityMap[toEntityKey(entityType, entityId)] : null
        const entityLabel = entityRef?.label || (entityType && entityId ? `${entityType} #${entityId}` : '-')
        const entityUrl = entityRef?.url || buildFallbackLink(nextProjectId, entityType, entityId)

        const projectName = asText((note.project_ref as Record<string, unknown> | null)?.name).trim()
        const projectCode = asText((note.project_ref as Record<string, unknown> | null)?.code).trim()
        const projectLabel = projectName || projectCode || asText(note.project_id).trim() || '-'

        const taskId = asText(note.task_id).trim()
        const taskName = asText((note.task_ref as Record<string, unknown> | null)?.name).trim()
        const taskRef = taskId ? entityMap[toEntityKey('task', taskId)] : null
        const taskLabel = taskRef?.label || taskName || (taskId ? `Task #${taskId}` : '-')

        const parsedLinkRefs = parsedLinkRefsByNoteId[currentNoteId] || []
        const resolvedLinks = parsedLinkRefs.map((parsedLinkRef) =>
          resolveNoteLinkRef(parsedLinkRef, nextProjectId, entityMap, postMap)
        )

        const noteAttachmentRows = Array.isArray(note.attachment_rows) ? note.attachment_rows : []
        const resolvedAttachments = noteAttachmentRows
          .map((attachment) => {
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
          .filter(
            (attachment) =>
              Boolean(
                attachment.id ||
                  attachment.storage_path ||
                  attachment.file_name ||
                  attachment.preview_url
              )
          )

        return {
          ...note,
          id: currentNoteId,
          author_label: authorLabel,
          project_label: projectLabel,
          task_label: taskLabel,
          entity_label: entityLabel,
          entity_url: entityUrl,
          links_resolved: resolvedLinks,
          attachments_resolved: resolvedAttachments,
        }
      }

      setRootNote(normalizeNote(rootResult.data as Record<string, unknown>))
      setReplies((repliesResult.data || []).map((note) => normalizeNote(note as Record<string, unknown>)))
    } catch (error) {
      console.error('Error loading note detail:', error)
      setRootNote(null)
      setReplies([])
      setLoadError(error instanceof Error ? error.message : 'Failed to load note detail')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleReplySubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const content = replyContent.trim()
    if (!content || !projectId || !noteId || !rootNote) return

    setIsReplying(true)
    try {
      const rootEntityType = asText(rootNote.entity_type).trim().toLowerCase()
      const normalizedEntityType =
        rootEntityType === 'asset' ||
        rootEntityType === 'shot' ||
        rootEntityType === 'sequence' ||
        rootEntityType === 'task' ||
        rootEntityType === 'version' ||
        rootEntityType === 'project' ||
        rootEntityType === 'published_file'
          ? rootEntityType
          : undefined

      const result = await createNote({
        project_id: projectId,
        content,
        subject: '',
        status: asText(rootNote.status).trim() || 'open',
        entity_type: normalizedEntityType,
        entity_id: asText(rootNote.entity_id).trim() || undefined,
        task_id: asText(rootNote.task_id).trim() || undefined,
        parent_note_id: Number(noteId),
      })

      if (result?.error) {
        throw new Error(result.error)
      }

      setReplyContent('')
      await loadNoteData(projectId, noteId)
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Failed to add reply')
    } finally {
      setIsReplying(false)
    }
  }

  const backHref = projectId ? `/apex/${projectId}/notes` : '/apex'

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading note...
        </div>
      </div>
    )
  }

  if (!rootNote) {
    return (
      <div className="p-6">
        <div className="mb-4">
          <Link href={backHref} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground/80">
            <ArrowLeft className="h-4 w-4" />
            Back to Notes
          </Link>
        </div>
        <div className="rounded-md border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
          {loadError || 'Note not found.'}
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col p-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <Link href={backHref} className="mb-2 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground/80">
            <ArrowLeft className="h-4 w-4" />
            Back to Notes
          </Link>
          <h1 className="text-2xl font-semibold text-foreground">
            {asText(rootNote.subject).trim() || `Note #${rootNote.id}`}
          </h1>
        </div>
      </div>

      {loadError && (
        <div className="mb-4 rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
          {loadError}
        </div>
      )}

      <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-h-0 overflow-y-auto rounded-md border border-border bg-background/70">
          <div className="border-b border-border px-4 py-3 text-sm font-semibold text-foreground">
            Conversation
          </div>

          <div className="space-y-4 p-4">
            {[rootNote, ...replies].map((note, index) => (
              <div
                key={note.id}
                className={`rounded-md border p-3 ${
                  index === 0
                    ? 'border-border bg-background'
                    : 'border-border/70 bg-card/40'
                }`}
              >
                <div className="mb-2 flex items-center justify-between gap-4">
                  <p className="text-sm font-medium text-foreground">{note.author_label}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(note.created_at)}</p>
                </div>
                <p className="whitespace-pre-wrap text-sm text-foreground/90">
                  {asText(note.content).trim() || '-'}
                </p>
                <AttachmentGrid attachments={note.attachments_resolved} />
              </div>
            ))}
          </div>

          <form onSubmit={handleReplySubmit} className="border-t border-border p-4">
            <label className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <MessageSquare className="h-3.5 w-3.5" />
              Add Reply
            </label>
            <div className="flex gap-2">
              <textarea
                value={replyContent}
                onChange={(event) => setReplyContent(event.target.value)}
                placeholder="Write a reply..."
                rows={2}
                className="min-h-[76px] flex-1 resize-y rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                type="submit"
                disabled={isReplying || !replyContent.trim()}
                className="inline-flex h-10 items-center gap-2 self-end rounded-md bg-primary px-3 text-sm font-medium text-black transition hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isReplying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Reply
              </button>
            </div>
          </form>
        </div>

        <div className="min-h-0 overflow-y-auto rounded-md border border-border bg-background/70">
          <div className="border-b border-border px-4 py-3 text-sm font-semibold text-foreground">
            Note Info
          </div>

          <div className="space-y-4 p-4 text-sm">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Author</p>
              <p className="mt-1 text-foreground">{rootNote.author_label || '-'}</p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Project</p>
              <p className="mt-1 text-foreground">{rootNote.project_label || '-'}</p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Task</p>
              <p className="mt-1 text-foreground">{rootNote.task_label || '-'}</p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Entity</p>
              {asText(rootNote.entity_url).trim() ? (
                <Link href={asText(rootNote.entity_url).trim()} className="mt-1 inline-flex text-primary transition hover:text-primary/80">
                  {rootNote.entity_label || '-'}
                </Link>
              ) : (
                <p className="mt-1 text-foreground">{rootNote.entity_label || '-'}</p>
              )}
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Status</p>
              <p className="mt-1 text-foreground">{asText(rootNote.status).trim() || '-'}</p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Type</p>
              <p className="mt-1 text-foreground">{asText(rootNote.note_type).trim() || '-'}</p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Date Created</p>
              <p className="mt-1 text-foreground">{formatDateTime(rootNote.created_at)}</p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Links</p>
              {rootNote.links_resolved.length === 0 ? (
                <p className="mt-1 text-muted-foreground">No links</p>
              ) : (
                <div className="mt-1 flex flex-col gap-1">
                  {rootNote.links_resolved.map((link, index) => {
                    const key = `${link.label}-${index}`
                    if (asText(link.url).trim()) {
                      return (
                        <a
                          key={key}
                          href={link.url}
                          className="text-primary transition hover:text-primary/80"
                          target={link.url.startsWith('http') ? '_blank' : undefined}
                          rel={link.url.startsWith('http') ? 'noreferrer' : undefined}
                        >
                          {link.label}
                        </a>
                      )
                    }
                    return (
                      <p key={key} className="text-foreground">
                        {link.label}
                      </p>
                    )
                  })}
                </div>
              )}
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Attachments ({rootNote.attachments_resolved.length})
              </p>
              <AttachmentGrid attachments={rootNote.attachments_resolved} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
