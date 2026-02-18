import { createClient } from '@/lib/supabase/server'
import { getEntityActivity } from '@/lib/supabase/queries'
import { ActivityFeedItem } from '@/components/apex/activity-feed'
import type { ActivityEvent } from '@/components/apex/activity-feed'
import { VersionActivityPanel } from '@/components/apex/version-activity-panel'
import type { VersionReviewVersion } from '@/components/apex/version-review-workspace'
import { formatDistanceToNow } from 'date-fns'

interface VersionActivityRecord extends VersionReviewVersion {
  created_at: string | null
  creator?: {
    display_name?: string | null
    full_name?: string | null
  } | null
}

interface VersionNoteAttachment {
  id: string
  file_name: string
  file_type: string
  signed_url: string
}

interface VersionNoteActivity {
  id: number
  content: string
  created_at: string
  author_name: string
  attachments: VersionNoteAttachment[]
}

type VersionNoteAuthor = {
  display_name?: string | null
  full_name?: string | null
}

interface VersionTimelineItem {
  key: string
  kind: 'version' | 'note' | 'event'
  timestamp: number
  sortId: number
  note?: VersionNoteActivity
  event?: ActivityEvent
}

function isImageAttachment(fileType: string, fileName: string) {
  if (fileType.toLowerCase().startsWith('image/')) return true
  return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(fileName)
}

function getTimestamp(value: string | null | undefined) {
  if (!value) return 0
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? 0 : parsed
}

export default async function VersionActivityPage({
  params,
}: {
  params: Promise<{ projectId: string; versionId: string }>
}) {
  const { projectId, versionId } = await params
  const supabase = await createClient()

  let events: ActivityEvent[] = []
  try {
    events = (await getEntityActivity(supabase, 'version', versionId)) as ActivityEvent[]
  } catch {
    // Graceful fallback
  }

  const { data: version } = await supabase
    .from('versions')
    .select(
      'id, code, version_number, file_path, movie_url, uploaded_movie, uploaded_movie_mp4, uploaded_movie_webm, frame_rate, created_at, creator:profiles!versions_created_by_fkey(display_name, full_name)'
    )
    .eq('id', versionId)
    .eq('project_id', projectId)
    .maybeSingle()

  const { data: noteRows } = await supabase
    .from('notes')
    .select(
      'id, content, created_at, author:profiles!notes_author_id_fkey(display_name, full_name), attachments(id, file_name, file_type, storage_path)'
    )
    .eq('project_id', projectId)
    .eq('entity_type', 'version')
    .eq('entity_id', Number(versionId))
    .order('created_at', { ascending: false })
    .limit(50)

  const noteAttachmentPaths = Array.from(
    new Set(
      (noteRows || []).flatMap((note) =>
        ((note.attachments as Array<{ storage_path?: string | null }> | null) || [])
          .map((attachment) => attachment.storage_path || '')
          .filter(Boolean)
      )
    )
  )
  const signedUrlByPath = new Map<string, string>()
  if (noteAttachmentPaths.length > 0) {
    const { data: signedData } = await supabase.storage
      .from('note-attachments')
      .createSignedUrls(noteAttachmentPaths, 3600)

    signedData?.forEach((item, index) => {
      if (item?.signedUrl) {
        signedUrlByPath.set(noteAttachmentPaths[index], item.signedUrl)
      }
    })
  }

  const noteActivities: VersionNoteActivity[] = (noteRows || []).map((note) => {
    const attachments = (((note.attachments as Array<{
      id?: string | number | null
      file_name?: string | null
      file_type?: string | null
      storage_path?: string | null
    }> | null) || []))
      .map((attachment) => {
        const storagePath = attachment.storage_path || ''
        const signedUrl = signedUrlByPath.get(storagePath) || ''
        return {
          id: String(attachment.id ?? ''),
          file_name: attachment.file_name || 'Attachment',
          file_type: attachment.file_type || '',
          signed_url: signedUrl,
        }
      })
      .filter((attachment) => Boolean(attachment.signed_url))

    const noteAuthor = note.author as VersionNoteAuthor | VersionNoteAuthor[] | null | undefined
    const resolvedAuthor = Array.isArray(noteAuthor) ? noteAuthor[0] : noteAuthor

    return {
      id: Number(note.id),
      content: note.content || '',
      created_at: note.created_at || '',
      author_name: resolvedAuthor?.display_name || resolvedAuthor?.full_name || 'Unknown',
      attachments,
    }
  })

  const typedVersion = version as VersionActivityRecord | null
  const hasVersionMedia =
    !!typedVersion?.file_path ||
    !!typedVersion?.uploaded_movie_mp4 ||
    !!typedVersion?.uploaded_movie_webm ||
    !!typedVersion?.uploaded_movie ||
    !!typedVersion?.movie_url
  const actorName =
    typedVersion?.creator?.display_name ||
    typedVersion?.creator?.full_name ||
    'Someone'

  const feedEvents = hasVersionMedia || noteActivities.length > 0
    ? events.filter(
        (event) =>
          event.event_type !== 'version_uploaded' &&
          event.event_type !== 'version_created' &&
          event.event_type !== 'note_created' &&
          event.event_type !== 'note_reply'
      )
    : events

  const timelineItems: VersionTimelineItem[] = []
  if (typedVersion && hasVersionMedia) {
    timelineItems.push({
      key: `version-${typedVersion.id}`,
      kind: 'version',
      timestamp: getTimestamp(typedVersion.created_at),
      sortId: Number(typedVersion.id || 0),
    })
  }
  noteActivities.forEach((note) => {
    timelineItems.push({
      key: `note-${note.id}`,
      kind: 'note',
      timestamp: getTimestamp(note.created_at),
      sortId: Number(note.id || 0),
      note,
    })
  })
  feedEvents.forEach((event) => {
    timelineItems.push({
      key: `event-${event.id}`,
      kind: 'event',
      timestamp: getTimestamp(event.created_at),
      sortId: Number(event.id || 0),
      event,
    })
  })
  timelineItems.sort((a, b) => {
    const timeDiff = b.timestamp - a.timestamp
    if (timeDiff !== 0) return timeDiff
    return b.sortId - a.sortId
  })

  return (
    <div className="space-y-3 p-6">
      {timelineItems.length > 0 ? (
        timelineItems.map((item) => {
          if (item.kind === 'version' && typedVersion) {
            return (
              <VersionActivityPanel
                key={item.key}
                projectId={projectId}
                version={typedVersion as VersionReviewVersion}
                actorName={actorName}
                createdAt={typedVersion.created_at}
              />
            )
          }

          if (item.kind === 'note' && item.note) {
            const note = item.note
            return (
              <div
                key={item.key}
                className="rounded-md border border-border bg-background/50 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground/90">{note.author_name}</span> added a note
                  </p>
                  <span className="text-xs text-muted-foreground">
                    {note.created_at
                      ? formatDistanceToNow(new Date(note.created_at), { addSuffix: true })
                      : ''}
                  </span>
                </div>
                {note.content ? (
                  <p className="mt-2 text-sm text-foreground/90">{note.content}</p>
                ) : null}
                {note.attachments.length > 0 ? (
                  <div className="mt-2 space-y-2">
                    {note.attachments.map((attachment) => (
                      <div key={attachment.id}>
                        {isImageAttachment(attachment.file_type, attachment.file_name) ? (
                          <img
                            src={attachment.signed_url}
                            alt={attachment.file_name}
                            className="max-h-72 w-auto rounded border border-border object-contain"
                          />
                        ) : (
                          <a
                            href={attachment.signed_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-primary hover:underline"
                          >
                            {attachment.file_name}
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            )
          }

          if (item.kind === 'event' && item.event) {
            return (
              <ActivityFeedItem
                key={item.key}
                event={item.event}
              />
            )
          }

          return null
        })
      ) : (
        <div className="rounded-md border border-border bg-background/70 p-6">
          <p className="text-sm text-muted-foreground">No activity yet.</p>
        </div>
      )}
    </div>
  )
}
