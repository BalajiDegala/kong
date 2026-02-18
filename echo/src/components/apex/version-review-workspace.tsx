'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from 'react'
import ReactPlayer from 'react-player'
import { formatDistanceToNow } from 'date-fns'
import { ArrowUpRight, Circle, Eraser, Pencil, Square, Type, Undo2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { createAnnotation } from '@/actions/annotations'
import { createNote, uploadNoteAttachment } from '@/actions/notes'
import {
  AnnotationCanvas,
  type AnnotationCanvasRef,
  type AnnotationShape,
  type AnnotationCanvasTool,
} from '@/components/pulse/annotation-canvas'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

interface VersionReviewWorkspaceProps {
  projectId: string
  version: VersionReviewVersion
  showHeader?: boolean
}

type CanvasSize = { width: number; height: number }

type NoteRow = {
  id: number
  content: string | null
  created_at: string
  author_id: string | null
}

type AnnotationMetaRow = {
  note_id: number | null
  frame_number: number | null
  timecode: string | null
}

type NoteAttachmentRow = {
  id: number | string | null
  file_name: string | null
  file_type: string | null
  storage_path: string | null
}

interface VersionCommentAttachment {
  id: string
  file_name: string
  file_type: string
  storage_path: string
  signed_url: string
}

interface VersionComment {
  id: number
  content: string
  created_at: string
  author_name: string
  frame_number: number | null
  timecode: string | null
  attachments: VersionCommentAttachment[]
}

export interface VersionReviewVersion {
  id: number
  code: string | null
  version_number: number | null
  file_path: string | null
  movie_url: string | null
  uploaded_movie: string | null
  uploaded_movie_mp4: string | null
  uploaded_movie_webm: string | null
  frame_rate: number | null
}

function isHttpUrl(value: string) {
  return /^https?:\/\//i.test(value)
}

function formatTimecode(time: number, fps: number) {
  const safeTime = Number.isFinite(time) ? Math.max(time, 0) : 0
  const h = Math.floor(safeTime / 3600)
  const m = Math.floor((safeTime % 3600) / 60)
  const s = Math.floor(safeTime % 60)
  const f = Math.floor((safeTime % 1) * fps)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')}`
}

function formatRelativeTime(value: string) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'Recently'
  return formatDistanceToNow(parsed, { addSuffix: true })
}

function isImageAttachment(fileType: string, fileName: string) {
  if (fileType.toLowerCase().startsWith('image/')) return true
  return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(fileName)
}

const VERSION_ANNOTATION_COLORS = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#3b82f6',
  '#a855f7',
  '#ffffff',
]

const VERSION_ANNOTATION_STROKES = [1, 2, 3, 5, 8]

const VERSION_ANNOTATION_TOOLS: Array<{
  id: AnnotationCanvasTool
  label: string
  icon: ComponentType<{ className?: string }>
}> = [
  { id: 'freehand', label: 'Pen', icon: Pencil },
  { id: 'arrow', label: 'Arrow', icon: ArrowUpRight },
  { id: 'ellipse', label: 'Circle', icon: Circle },
  { id: 'rectangle', label: 'Rectangle', icon: Square },
  { id: 'text', label: 'Text', icon: Type },
]

export function VersionReviewWorkspace({
  projectId,
  version,
  showHeader = true,
}: VersionReviewWorkspaceProps) {
  const playerRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<AnnotationCanvasRef>(null)
  const isModalLayout = !showHeader

  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null)
  const [playbackError, setPlaybackError] = useState<string | null>(null)

  const [isPlaying, setIsPlaying] = useState(false)
  const [isAnnotating, setIsAnnotating] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [currentFrame, setCurrentFrame] = useState(1)
  const [totalFrames, setTotalFrames] = useState(0)

  const [commentText, setCommentText] = useState('')
  const [pendingShapes, setPendingShapes] = useState<AnnotationShape[]>([])
  const [frameAnnotations, setFrameAnnotations] = useState<AnnotationShape[]>([])
  const [comments, setComments] = useState<VersionComment[]>([])
  const [isLoadingComments, setIsLoadingComments] = useState(true)

  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [canvasSize, setCanvasSize] = useState<CanvasSize>({ width: 1920, height: 1080 })

  const fps = useMemo(() => {
    const parsed = Number(version.frame_rate)
    if (Number.isFinite(parsed) && parsed > 0) return parsed
    return 24
  }, [version.frame_rate])

  const candidates = useMemo(
    () =>
      [
        version.file_path,
        version.uploaded_movie_mp4,
        version.uploaded_movie_webm,
        version.uploaded_movie,
        version.movie_url,
      ].filter(Boolean) as string[],
    [
      version.file_path,
      version.movie_url,
      version.uploaded_movie,
      version.uploaded_movie_mp4,
      version.uploaded_movie_webm,
    ]
  )

  const [activeTool, setActiveTool] = useState<AnnotationCanvasTool>('freehand')
  const [activeColor, setActiveColor] = useState('#ef4444')
  const [strokeWidth, setStrokeWidth] = useState(5)

  const timeToFrame = useCallback((time: number) => Math.floor(time * fps) + 1, [fps])
  const frameToTime = useCallback((frame: number) => Math.max(frame - 1, 0) / fps, [fps])

  const loadFrameAnnotations = useCallback(
    async (frame: number) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('annotations')
        .select('annotation_data')
        .eq('version_id', version.id)
        .eq('frame_number', frame)
        .eq('status', 'active')

      if (error) {
        console.error('Failed to load frame annotations:', error)
        return
      }

      setFrameAnnotations((data || []).map((row) => row.annotation_data))
    },
    [version.id]
  )

  const loadComments = useCallback(async () => {
    setIsLoadingComments(true)
    try {
      const supabase = createClient()
      const { data: noteRows, error: noteError } = await supabase
        .from('notes')
        .select('id, content, created_at, author_id, attachments(id, file_name, file_type, storage_path)')
        .eq('entity_type', 'version')
        .eq('entity_id', version.id)
        .order('created_at', { ascending: false })
        .limit(100)

      if (noteError) {
        console.error('Failed to load version comments:', noteError)
        setComments([])
        return
      }

      const notes = (noteRows || []) as NoteRow[]
      const noteIds = notes.map((note) => note.id)

      const frameMetaByNote = new Map<number, { frame_number: number | null; timecode: string | null }>()
      if (noteIds.length > 0) {
        const { data: annotationRows, error: annotationError } = await supabase
          .from('annotations')
          .select('note_id, frame_number, timecode')
          .eq('version_id', version.id)
          .in('note_id', noteIds)
          .order('created_at', { ascending: false })

        if (annotationError) {
          console.error('Failed to load annotation metadata for comments:', annotationError)
        } else {
          for (const row of (annotationRows || []) as AnnotationMetaRow[]) {
            if (!row.note_id || frameMetaByNote.has(row.note_id)) continue
            frameMetaByNote.set(row.note_id, {
              frame_number: row.frame_number,
              timecode: row.timecode,
            })
          }
        }
      }

      const authorIds = [
        ...new Set(notes.map((note) => note.author_id).filter((value): value is string => Boolean(value))),
      ]
      const authorMap = new Map<string, string>()

      if (authorIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, display_name, full_name')
          .in('id', authorIds)

        if (profilesError) {
          console.error('Failed to load comment authors:', profilesError)
        } else {
          for (const profile of profiles || []) {
            const label = profile.display_name || profile.full_name || 'Unknown'
            authorMap.set(profile.id, label)
          }
        }
      }

      const attachmentPaths = Array.from(
        new Set(
          notes.flatMap((note) =>
            ((note as unknown as { attachments?: NoteAttachmentRow[] }).attachments || [])
              .map((attachment) => attachment.storage_path || '')
              .filter(Boolean)
          )
        )
      )
      const signedUrlByPath = new Map<string, string>()
      if (attachmentPaths.length > 0) {
        const { data: signedData, error: signedError } = await supabase.storage
          .from('note-attachments')
          .createSignedUrls(attachmentPaths, 3600)

        if (signedError) {
          console.error('Failed to sign note attachment URLs:', signedError)
        } else {
          signedData?.forEach((item, index) => {
            if (item?.signedUrl) {
              signedUrlByPath.set(attachmentPaths[index], item.signedUrl)
            }
          })
        }
      }

      const normalizedComments: VersionComment[] = notes.map((note) => {
        const meta = frameMetaByNote.get(note.id)
        const attachmentRows = ((note as unknown as { attachments?: NoteAttachmentRow[] }).attachments || [])
          .map((attachment) => {
            const storagePath = attachment.storage_path || ''
            const signedUrl = storagePath ? signedUrlByPath.get(storagePath) || '' : ''
            return {
              id: String(attachment.id ?? ''),
              file_name: attachment.file_name || 'Attachment',
              file_type: attachment.file_type || '',
              storage_path: storagePath,
              signed_url: signedUrl,
            }
          })
          .filter((attachment) => Boolean(attachment.storage_path && attachment.signed_url))

        return {
          id: note.id,
          content: note.content || 'Annotation',
          created_at: note.created_at,
          author_name: note.author_id ? authorMap.get(note.author_id) || 'Unknown' : 'Unknown',
          frame_number: meta?.frame_number ?? null,
          timecode: meta?.timecode ?? null,
          attachments: attachmentRows,
        }
      })

      setComments(normalizedComments)
    } finally {
      setIsLoadingComments(false)
    }
  }, [version.id])

  useEffect(() => {
    let cancelled = false

    async function resolvePlaybackUrl() {
      setPlaybackError(null)
      setPlaybackUrl(null)

      if (candidates.length === 0) {
        setPlaybackError('No movie is attached to this version yet.')
        return
      }

      const supabase = createClient()
      for (const candidate of candidates) {
        if (isHttpUrl(candidate)) {
          if (!cancelled) setPlaybackUrl(candidate)
          return
        }

        const { data, error } = await supabase.storage
          .from('versions')
          .createSignedUrl(candidate, 3600)

        if (!error && data?.signedUrl) {
          if (!cancelled) setPlaybackUrl(data.signedUrl)
          return
        }
      }

      if (!cancelled) {
        setPlaybackError('Unable to resolve a playable URL for this version.')
      }
    }

    void resolvePlaybackUrl()
    return () => {
      cancelled = true
    }
  }, [candidates])

  useEffect(() => {
    void loadFrameAnnotations(currentFrame)
  }, [currentFrame, loadFrameAnnotations])

  useEffect(() => {
    void loadComments()
  }, [loadComments])

  const seekToFrame = useCallback(
    (frame: number) => {
      const video = playerRef.current
      if (!video) return

      const safeTotalFrames = Math.max(totalFrames, 1)
      const clamped = Math.max(1, Math.min(frame, safeTotalFrames))
      const time = frameToTime(clamped)
      video.currentTime = time
      setCurrentTime(time)
      setCurrentFrame(clamped)
      setPendingShapes([])
    },
    [frameToTime, totalFrames]
  )

  const handleUndoPending = useCallback(() => {
    setPendingShapes((prev) => prev.slice(0, -1))
  }, [])

  const handleClearPending = useCallback(() => {
    setPendingShapes([])
  }, [])

  const handleSave = useCallback(async () => {
    const hasShapes = pendingShapes.length > 0
    const hasText = commentText.trim().length > 0

    if (!hasShapes && !hasText) {
      setSaveError('Add comment or mark an annotation first.')
      return
    }

    setIsSaving(true)
    setSaveError(null)

    try {
      const noteResult = await createNote({
        project_id: projectId,
        entity_type: 'version',
        entity_id: String(version.id),
        content: hasText ? commentText.trim() : 'Annotation',
      })

      if (noteResult.error || !noteResult.data?.id) {
        throw new Error(noteResult.error || 'Failed to create note for annotation')
      }

      const noteId = Number(noteResult.data.id)
      const timecode = formatTimecode(currentTime, fps)

      for (const shape of pendingShapes) {
        const annotationResult = await createAnnotation({
          version_id: version.id,
          note_id: noteId,
          project_id: projectId,
          frame_number: currentFrame,
          timecode,
          annotation_data: shape as unknown as Record<string, unknown>,
          annotation_text: commentText.trim() || undefined,
        })

        if (annotationResult.error) {
          throw new Error(annotationResult.error)
        }
      }

      if (hasShapes && canvasRef.current && playerRef.current) {
        const blob = await canvasRef.current.exportAnnotatedFrame(playerRef.current)
        if (blob) {
          const supabase = createClient()
          const fileName = `frame-${currentFrame}.png`
          const storagePath = `${noteId}/${Date.now()}_${fileName}`
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('note-attachments')
            .upload(storagePath, blob, {
              cacheControl: '3600',
              upsert: false,
              contentType: 'image/png',
            })

          if (uploadError) {
            console.error('Failed to upload annotation frame:', uploadError)
          } else if (uploadData?.path) {
            const attachResult = await uploadNoteAttachment({
              note_id: noteId,
              storage_path: uploadData.path,
              file_name: fileName,
              file_size: blob.size,
              file_type: 'image/png',
            })

            if (attachResult.error) {
              console.error('Failed to create note attachment record:', attachResult.error)
              await supabase.storage.from('note-attachments').remove([uploadData.path])
            }
          }
        }
      }

      setPendingShapes([])
      setCommentText('')
      setIsAnnotating(false)
      await Promise.all([loadFrameAnnotations(currentFrame), loadComments()])
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to save annotation')
    } finally {
      setIsSaving(false)
    }
  }, [
    commentText,
    currentFrame,
    currentTime,
    fps,
    pendingShapes,
    projectId,
    version.id,
    loadFrameAnnotations,
    loadComments,
  ])

  return (
    <div
      className={
        isModalLayout
          ? 'flex h-full min-h-0 flex-col bg-background text-foreground'
          : 'space-y-4 p-6'
      }
    >
      {showHeader ? (
        <div>
          <h3 className="text-sm font-semibold text-foreground">Review</h3>
          <p className="text-xs text-muted-foreground">
            {version.code || `Version ${version.version_number || version.id}`} • {fps} fps
          </p>
        </div>
      ) : (
        <div className="border-b border-border px-4 py-3">
          <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Version</p>
          <p className="text-3xl tracking-wide text-foreground">
            {version.code || `V${version.version_number || version.id}`}
          </p>
        </div>
      )}

      {saveError ? (
        <div
          className={
            isModalLayout
              ? 'mx-4 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-sm text-destructive'
              : 'rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400'
          }
        >
          {saveError}
        </div>
      ) : null}

      {playbackError ? (
        <div
          className={
            isModalLayout
              ? 'mx-4 rounded-md border border-border bg-card p-4 text-sm text-muted-foreground'
              : 'rounded-md border border-border bg-card/50 p-4 text-sm text-muted-foreground'
          }
        >
          {playbackError}
        </div>
      ) : (
        <div
          className={
            isModalLayout
              ? 'grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_360px]'
              : 'grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]'
          }
        >
          <div className={isModalLayout ? 'flex min-h-0 flex-col bg-black' : 'space-y-3'}>
            {isAnnotating ? (
              <div
                className={
                  isModalLayout
                    ? 'border-b border-border bg-card px-4 py-2'
                    : 'rounded-md border border-border bg-card p-2'
                }
              >
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1 rounded border border-border bg-background p-1">
                    {VERSION_ANNOTATION_TOOLS.map(({ id, label, icon: Icon }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setActiveTool(id)}
                        title={label}
                        className={cn(
                          'rounded p-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground',
                          activeTool === id ? 'bg-primary text-primary-foreground hover:bg-primary' : ''
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 rounded border border-border bg-background px-2 py-1">
                    <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Thickness</span>
                    <select
                      value={strokeWidth}
                      onChange={(event) => setStrokeWidth(Number(event.target.value))}
                      className="h-7 rounded border border-border bg-background px-2 text-xs text-foreground outline-none"
                    >
                      {VERSION_ANNOTATION_STROKES.map((value) => (
                        <option key={value} value={value}>
                          {value}px
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-1 rounded border border-border bg-background p-1">
                    {VERSION_ANNOTATION_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setActiveColor(color)}
                        className={cn(
                          'h-5 w-5 rounded border transition',
                          activeColor === color
                            ? 'scale-105 border-white'
                            : 'border-border hover:border-foreground/40'
                        )}
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>

                  <div className="ml-auto flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleUndoPending}
                      disabled={pendingShapes.length === 0}
                      className={
                        isModalLayout
                          ? 'border-border bg-background text-foreground hover:bg-accent hover:text-foreground'
                          : undefined
                      }
                    >
                      <Undo2 className="mr-1.5 h-4 w-4" />
                      Undo
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleClearPending}
                      disabled={pendingShapes.length === 0}
                      className={
                        isModalLayout
                          ? 'border-border bg-background text-foreground hover:bg-accent hover:text-foreground'
                          : undefined
                      }
                    >
                      <Eraser className="mr-1.5 h-4 w-4" />
                      Clear
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}

            <div
              className={
                isModalLayout
                  ? 'relative min-h-0 flex-1'
                  : 'overflow-hidden rounded-md border border-border bg-black'
              }
            >
              <div className={isModalLayout ? 'absolute inset-0' : 'relative aspect-video w-full'}>
                {playbackUrl ? (
                  <>
                    <div className="absolute inset-0">
                      <ReactPlayer
                        ref={playerRef}
                        src={playbackUrl}
                        width="100%"
                        height="100%"
                        controls
                        onPlay={() => setIsPlaying(true)}
                        onPause={() => setIsPlaying(false)}
                        onDurationChange={(event) => {
                          const nextDuration = Number(event.currentTarget.duration) || 0
                          setTotalFrames(Math.max(Math.floor(nextDuration * fps), 1))
                        }}
                        onTimeUpdate={(event) => {
                          const time = event.currentTarget.currentTime
                          setCurrentTime(time)
                          setCurrentFrame(timeToFrame(time))
                        }}
                        onLoadedMetadata={(event) => {
                          const video = event.currentTarget
                          if (video.videoWidth > 0 && video.videoHeight > 0) {
                            setCanvasSize({ width: video.videoWidth, height: video.videoHeight })
                          }
                          const nextDuration = Number(video.duration) || 0
                          setTotalFrames(Math.max(Math.floor(nextDuration * fps), 1))
                        }}
                        crossOrigin="anonymous"
                      />
                    </div>
                    <AnnotationCanvas
                      ref={canvasRef}
                      width={canvasSize.width}
                      height={canvasSize.height}
                      isDrawing={isAnnotating && !isPlaying}
                      activeTool={activeTool}
                      activeColor={activeColor}
                      strokeWidth={strokeWidth}
                      existingAnnotations={[...frameAnnotations, ...pendingShapes]}
                      onAnnotationCreated={(shape) => setPendingShapes((prev) => [...prev, shape])}
                    />
                  </>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    Loading media...
                  </div>
                )}
              </div>
            </div>
          </div>

          <div
            className={
              isModalLayout
                ? 'flex min-h-0 flex-col border-t border-border bg-card lg:border-t-0 lg:border-l lg:border-border'
                : 'flex min-h-[380px] flex-col overflow-hidden rounded-md border border-border bg-card'
            }
          >
            <div className={isModalLayout ? 'border-b border-border px-3 py-2' : 'border-b border-border px-3 py-2'}>
              <h3 className={isModalLayout ? 'text-sm font-semibold text-foreground' : 'text-sm font-semibold text-foreground'}>
                Comments
              </h3>
              <p className={isModalLayout ? 'text-xs text-muted-foreground' : 'text-xs text-muted-foreground'}>
                Saved comments create Notes automatically.
              </p>
              <div className="mt-2 flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={isAnnotating ? 'default' : 'outline'}
                  onClick={() => setIsAnnotating((prev) => !prev)}
                  className={
                    isModalLayout
                      ? isAnnotating
                        ? 'border-primary bg-primary text-primary-foreground hover:bg-primary'
                        : 'border-border bg-background text-foreground hover:bg-accent hover:text-foreground'
                      : undefined
                  }
                >
                  <Pencil className="mr-1.5 h-4 w-4" />
                  {isAnnotating ? 'Marking Annotation' : 'Mark Annotation'}
                </Button>
              </div>
              <p className={isModalLayout ? 'mt-2 text-[11px] text-muted-foreground' : 'mt-2 text-xs text-muted-foreground'}>
                {isAnnotating
                  ? `${formatTimecode(currentTime, fps)} • Frame ${currentFrame}`
                  : 'Click Mark Annotation to open pen, shape, text, color, and thickness tools.'}
              </p>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto p-3">
              {isLoadingComments ? (
                <p className={isModalLayout ? 'text-xs text-muted-foreground' : 'text-xs text-muted-foreground'}>
                  Loading comments...
                </p>
              ) : comments.length === 0 ? (
                <p className={isModalLayout ? 'text-xs text-muted-foreground' : 'text-xs text-muted-foreground'}>
                  No comments yet.
                </p>
              ) : (
                comments.map((comment) => {
                  const canJump = typeof comment.frame_number === 'number' && comment.frame_number > 0
                  return (
                    <button
                      key={comment.id}
                      type="button"
                      onClick={() => {
                        if (canJump) seekToFrame(comment.frame_number as number)
                      }}
                      disabled={!canJump}
                      className={cn(
                        'w-full rounded-md border px-3 py-2 text-left',
                        isModalLayout
                          ? 'border-border bg-background/70'
                          : 'border-border/70',
                        canJump
                          ? isModalLayout
                            ? 'hover:bg-accent/50'
                            : 'hover:bg-accent/40'
                          : ''
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={isModalLayout ? 'text-xs font-medium text-foreground' : 'text-xs font-medium text-foreground/90'}>
                          {comment.author_name}
                        </span>
                        <span className={isModalLayout ? 'text-[11px] text-muted-foreground' : 'text-[11px] text-muted-foreground'}>
                          {formatRelativeTime(comment.created_at)}
                        </span>
                      </div>
                      {(comment.timecode || canJump) ? (
                        <div className={isModalLayout ? 'mt-1 text-[11px] text-muted-foreground' : 'mt-1 text-[11px] text-muted-foreground'}>
                          {comment.timecode || 'No timecode'}
                          {canJump ? ` • Frame ${comment.frame_number}` : ''}
                        </div>
                      ) : null}
                      <p className={isModalLayout ? 'mt-1 text-sm text-foreground/90' : 'mt-1 text-sm text-muted-foreground'}>
                        {comment.content}
                      </p>
                      {comment.attachments.length > 0 ? (
                        <div className="mt-2 space-y-2">
                          {comment.attachments.map((attachment) => (
                            <div key={attachment.id}>
                              {isImageAttachment(attachment.file_type, attachment.file_name) ? (
                                <img
                                  src={attachment.signed_url}
                                  alt={attachment.file_name}
                                  className="max-h-40 w-auto rounded border border-border object-contain"
                                />
                              ) : (
                                <a
                                  href={attachment.signed_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs text-primary hover:underline"
                                  onClick={(event) => event.stopPropagation()}
                                >
                                  {attachment.file_name}
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </button>
                  )
                })
              )}
            </div>

            <div className={isModalLayout ? 'space-y-2 border-t border-border bg-card p-3' : 'space-y-2 border-t border-border p-3'}>
              <Textarea
                placeholder="Submit a new note or annotation..."
                value={commentText}
                onChange={(event) => setCommentText(event.target.value)}
                className={
                  isModalLayout
                    ? 'min-h-[96px] border-border bg-background text-foreground placeholder:text-muted-foreground'
                    : 'min-h-[96px]'
                }
              />
              <div className="flex items-center justify-between gap-2">
                <span className={isModalLayout ? 'text-xs text-muted-foreground' : 'text-xs text-muted-foreground'}>
                  {isAnnotating
                    ? `${formatTimecode(currentTime, fps)} • Frame ${currentFrame}`
                    : 'Add comment and save'}
                </span>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSave}
                  disabled={isSaving || (!commentText.trim() && pendingShapes.length === 0)}
                  className={isModalLayout ? 'bg-primary text-primary-foreground hover:bg-primary' : undefined}
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
