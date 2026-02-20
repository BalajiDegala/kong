'use client'

import { useState, useEffect, useCallback, useRef, type ComponentType } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { ArrowUpRight, Circle, Eraser, Pencil, Square, Type, Undo2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { createAnnotation } from '@/actions/annotations'
import { createPostComment, uploadCommentAttachment } from '@/actions/posts'
import { VideoPlayer } from './video-player'
import {
  AnnotationCanvas,
  type AnnotationCanvasRef,
  type AnnotationShape,
  type AnnotationCanvasTool,
} from './annotation-canvas'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

interface VideoReviewModalProps {
  media: {
    id: number
    storage_path: string
    file_name: string
    fps?: number
  }
  versionId?: number
  postId?: number
  projectId?: string
  onClose: () => void
}

type PulseCommentAttachment = {
  id: string
  file_name: string
  file_type: string
  storage_path: string
  signed_url: string
}

type PulseComment = {
  id: number
  content: string
  created_at: string
  author_name: string
  frame_number: number | null
  timecode: string | null
  attachments: PulseCommentAttachment[]
}

type NoteRow = {
  id: number
  content: string | null
  created_at: string
  author_id: string | null
  attachments?: Array<{
    id?: number | string | null
    file_name?: string | null
    file_type?: string | null
    storage_path?: string | null
  }> | null
}

type AnnotationMetaRow = {
  note_id: number | null
  frame_number: number | null
  timecode: string | null
}

const PULSE_ANNOTATION_COLORS = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#3b82f6',
  '#a855f7',
  '#ffffff',
]

const PULSE_ANNOTATION_STROKES = [1, 2, 3, 5, 8]

const PULSE_ANNOTATION_TOOLS: Array<{
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

function formatTimecode(frame: number, fps: number) {
  const safeFrame = Math.max(frame, 1)
  const timeInSeconds = (safeFrame - 1) / fps
  const h = Math.floor(timeInSeconds / 3600)
  const m = Math.floor((timeInSeconds % 3600) / 60)
  const s = Math.floor(timeInSeconds % 60)
  const f = Math.floor((timeInSeconds % 1) * fps)
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

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message.trim()
  if (typeof error === 'string') return error.trim()
  if (!error || typeof error !== 'object') return ''

  const errorRecord = error as Record<string, unknown>
  const parts = [errorRecord.message, errorRecord.details, errorRecord.hint, errorRecord.code]
    .map((part) => (typeof part === 'string' ? part.trim() : ''))
    .filter(Boolean)

  return Array.from(new Set(parts)).join(' | ')
}

function isMissingAnnotationNoteIdColumn(error: unknown): boolean {
  const message = extractErrorMessage(error).toLowerCase()
  if (!message) return false

  return (
    (message.includes('note_id') &&
      message.includes('column') &&
      message.includes('does not exist')) ||
    (message.includes('pgrst204') && message.includes('note_id'))
  )
}

export function VideoReviewModal({ media, versionId, postId, projectId, onClose }: VideoReviewModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<AnnotationCanvasRef>(null)

  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [isAnnotating, setIsAnnotating] = useState(false)
  const [activeTool, setActiveTool] = useState<AnnotationCanvasTool>('freehand')
  const [activeColor, setActiveColor] = useState('#ef4444')
  const [strokeWidth, setStrokeWidth] = useState(5)
  const [currentFrame, setCurrentFrame] = useState(1)
  const [isPaused, setIsPaused] = useState(false)
  const [pendingShapes, setPendingShapes] = useState<AnnotationShape[]>([])
  const [frameAnnotations, setFrameAnnotations] = useState<AnnotationShape[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [comments, setComments] = useState<PulseComment[]>([])
  const [isLoadingComments, setIsLoadingComments] = useState(true)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const fps = media.fps || 24

  useEffect(() => {
    let cancelled = false

    async function resolveVideoUrl() {
      const supabase = createClient()
      const { data, error } = await supabase.storage
        .from('post-media')
        .createSignedUrl(media.storage_path, 3600)

      if (cancelled) return
      if (error || !data?.signedUrl) {
        setVideoUrl(null)
        return
      }
      setVideoUrl(data.signedUrl)
    }

    void resolveVideoUrl()
    return () => {
      cancelled = true
    }
  }, [media.storage_path])

  const loadFrameAnnotations = useCallback(async (frame: number) => {
    const supabase = createClient()
    let query = supabase
      .from('annotations')
      .select('annotation_data')
      .eq('frame_number', frame)
      .eq('status', 'active')

    if (versionId) {
      query = query.eq('version_id', versionId)
    } else {
      query = query.eq('post_media_id', media.id)
    }

    const { data, error } = await query
    if (error) {
      console.error('Failed to load frame annotations:', error)
      setFrameAnnotations([])
      return
    }

    setFrameAnnotations(
      (data || []).map((row) => row.annotation_data as unknown as AnnotationShape)
    )
  }, [media.id, versionId])

  const loadComments = useCallback(async () => {
    setIsLoadingComments(true)
    try {
      const supabase = createClient()
      let commentsQuery = supabase
        .from('notes')
        .select('id, content, created_at, author_id, attachments(id, file_name, file_type, storage_path)')
        .order('created_at', { ascending: false })
        .limit(100)

      if (postId) {
        commentsQuery = commentsQuery
          .eq('entity_type', 'post')
          .eq('entity_id', postId)
          .is('deleted_at', null)
      } else if (versionId) {
        commentsQuery = commentsQuery
          .eq('entity_type', 'version')
          .eq('entity_id', versionId)
          .is('deleted_at', null)
      } else {
        setComments([])
        return
      }

      const { data: noteRows, error: noteError } = await commentsQuery
      if (noteError) {
        console.error('Failed to load video comments:', noteError)
        setComments([])
        return
      }

      const notes = (noteRows || []) as NoteRow[]
      const noteIds = notes.map((note) => note.id)

      let annotationQuery = supabase
        .from('annotations')
        .select('note_id, frame_number, timecode')
        .in('note_id', noteIds)
        .order('created_at', { ascending: false })

      if (versionId) {
        annotationQuery = annotationQuery.eq('version_id', versionId)
      } else {
        annotationQuery = annotationQuery.eq('post_media_id', media.id)
      }

      const { data: annotationRows, error: annotationError } = noteIds.length > 0
        ? await annotationQuery
        : { data: [], error: null }

      if (annotationError) {
        if (!isMissingAnnotationNoteIdColumn(annotationError)) {
          const details = extractErrorMessage(annotationError)
          if (details) {
            console.warn(`Failed to load annotation metadata for comments: ${details}`)
          } else {
            console.warn('Failed to load annotation metadata for comments.')
          }
        }
      }

      const frameMetaByNote = new Map<number, { frame_number: number | null; timecode: string | null }>()
      for (const row of (annotationRows || []) as AnnotationMetaRow[]) {
        if (!row.note_id || frameMetaByNote.has(row.note_id)) continue
        frameMetaByNote.set(row.note_id, {
          frame_number: row.frame_number,
          timecode: row.timecode,
        })
      }

      const authorIds = [
        ...new Set(notes.map((note) => note.author_id).filter((value): value is string => Boolean(value))),
      ]
      const authorMap = new Map<string, string>()
      if (authorIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name, full_name')
          .in('id', authorIds)

        for (const profile of profiles || []) {
          authorMap.set(profile.id, profile.display_name || profile.full_name || 'Unknown')
        }
      }

      const attachmentPaths = Array.from(
        new Set(
          notes.flatMap((note) =>
            (note.attachments || [])
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
          console.error('Failed to sign video comment attachments:', signedError)
        } else {
          signedData?.forEach((item, index) => {
            if (item?.signedUrl) {
              signedUrlByPath.set(attachmentPaths[index], item.signedUrl)
            }
          })
        }
      }

      const normalizedComments: PulseComment[] = notes.map((note) => {
        const meta = frameMetaByNote.get(note.id)
        const attachments = (note.attachments || [])
          .map((attachment) => {
            const storagePath = attachment.storage_path || ''
            const signedUrl = signedUrlByPath.get(storagePath) || ''
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
          attachments,
        }
      })

      setComments(normalizedComments)
    } finally {
      setIsLoadingComments(false)
    }
  }, [media.id, postId, versionId])

  useEffect(() => {
    void loadFrameAnnotations(currentFrame)
  }, [currentFrame, loadFrameAnnotations])

  useEffect(() => {
    void loadComments()
  }, [loadComments])

  const handleFrameChange = useCallback((frame: number) => {
    setCurrentFrame(frame)
    setPendingShapes([])
  }, [])

  const handleSave = useCallback(async () => {
    const hasShapes = pendingShapes.length > 0
    const hasText = commentText.trim().length > 0

    if (!hasShapes && !hasText) {
      setSaveError('Add comment or mark an annotation first.')
      return
    }

    setSaveError(null)
    setIsSaving(true)

    try {
      const timecode = formatTimecode(currentFrame, fps)

      if (hasShapes) {
        for (const shape of pendingShapes) {
          const annotationResult = await createAnnotation({
            post_media_id: versionId ? undefined : media.id,
            version_id: versionId,
            frame_number: currentFrame,
            timecode,
            annotation_data: shape as unknown as Record<string, unknown>,
            annotation_text: commentText.trim() || undefined,
          })

          if (annotationResult.error) {
            throw new Error(annotationResult.error)
          }
        }
      }

      let noteId: number | null = null
      if (postId) {
        const commentContent = hasText
          ? `[Frame ${currentFrame}] ${commentText.trim()}`
          : `[Frame ${currentFrame}] Annotation`

        const commentResult = await createPostComment({
          post_id: postId,
          content: commentContent,
          project_id: projectId,
        })

        if (commentResult.error || !commentResult.data?.id) {
          throw new Error(commentResult.error || 'Failed to create comment')
        }
        noteId = Number(commentResult.data.id)
      }

      if (hasShapes && noteId && videoRef.current && canvasRef.current) {
        const blob = await canvasRef.current.exportAnnotatedFrame(videoRef.current)
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
            console.error('Failed to upload annotation image:', uploadError)
          } else if (uploadData?.path) {
            const attachResult = await uploadCommentAttachment({
              note_id: noteId,
              storage_path: uploadData.path,
              file_name: fileName,
              file_size: blob.size,
            })

            if (attachResult.error) {
              await supabase.storage.from('note-attachments').remove([uploadData.path])
              throw new Error(attachResult.error)
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
    fps,
    media.id,
    pendingShapes,
    postId,
    projectId,
    versionId,
    loadComments,
    loadFrameAnnotations,
  ])

  const handleUndo = useCallback(() => {
    setPendingShapes((prev) => prev.slice(0, -1))
  }, [])

  const handleClear = useCallback(() => {
    setPendingShapes([])
  }, [])

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (isFullscreen) {
          setIsFullscreen(false)
        } else {
          onClose()
        }
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isFullscreen, onClose])

  if (!videoUrl) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
        <div className="text-muted-foreground">Loading video...</div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex bg-black/95">
      <div className={cn('flex min-h-0 min-w-0 flex-1 flex-col', isFullscreen ? 'w-full' : '')}>
        <div className="flex items-center justify-between border-b border-border bg-card px-4 py-2">
          <div className="flex min-w-0 items-center gap-3">
            <h3 className="truncate text-sm font-medium text-foreground">{media.file_name}</h3>
            <Button
              type="button"
              size="sm"
              variant={isAnnotating ? 'default' : 'outline'}
              onClick={() => setIsAnnotating((prev) => !prev)}
              className={
                isAnnotating
                  ? 'bg-primary text-primary-foreground hover:bg-primary'
                  : 'border-border bg-background text-foreground hover:bg-accent'
              }
            >
              <Pencil className="mr-1.5 h-4 w-4" />
              {isAnnotating ? 'Marking Annotation' : 'Mark Annotation'}
            </Button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-muted-foreground transition hover:bg-accent hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {isAnnotating && !isFullscreen ? (
          <div className="border-b border-border bg-card px-4 py-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 rounded border border-border bg-background p-1">
                {PULSE_ANNOTATION_TOOLS.map(({ id, label, icon: Icon }) => (
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
                  {PULSE_ANNOTATION_STROKES.map((value) => (
                    <option key={value} value={value}>
                      {value}px
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1 rounded border border-border bg-background p-1">
                {PULSE_ANNOTATION_COLORS.map((color) => (
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
                  onClick={handleUndo}
                  disabled={pendingShapes.length === 0}
                >
                  <Undo2 className="mr-1.5 h-4 w-4" />
                  Undo
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleClear}
                  disabled={pendingShapes.length === 0}
                >
                  <Eraser className="mr-1.5 h-4 w-4" />
                  Clear
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        <div className="relative flex flex-1 min-h-0 items-end bg-black p-4">
          <div className="relative mr-auto w-full max-w-full overflow-hidden rounded-md border border-border bg-black">
            <VideoPlayer
              ref={videoRef}
              url={videoUrl}
              fps={fps}
              onFrameChange={handleFrameChange}
              onPause={() => setIsPaused(true)}
              onPlay={() => setIsPaused(false)}
              onFullscreen={() => setIsFullscreen((prev) => !prev)}
            />
            <AnnotationCanvas
              ref={canvasRef}
              width={1920}
              height={1080}
              isDrawing={isAnnotating && isPaused}
              activeTool={activeTool}
              activeColor={activeColor}
              strokeWidth={strokeWidth}
              existingAnnotations={[...frameAnnotations, ...pendingShapes]}
              onAnnotationCreated={(shape) => setPendingShapes((prev) => [...prev, shape])}
            />
          </div>
        </div>
      </div>

      {!isFullscreen ? (
        <div className="flex w-[360px] min-w-[320px] flex-col border-l border-border bg-card">
          <div className="border-b border-border px-3 py-2">
            <h3 className="text-sm font-semibold text-foreground">Comments</h3>
            <p className="text-xs text-muted-foreground">
              Saved comments create Notes automatically.
            </p>
            <p className="mt-2 text-[11px] text-muted-foreground">
              {isAnnotating
                ? `${formatTimecode(currentFrame, fps)} • Frame ${currentFrame}`
                : 'Click Mark Annotation to draw on current frame.'}
            </p>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto p-3">
            {isLoadingComments ? (
              <p className="text-xs text-muted-foreground">Loading comments...</p>
            ) : comments.length === 0 ? (
              <p className="text-xs text-muted-foreground">No comments yet.</p>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="rounded-md border border-border bg-background/70 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-foreground">{comment.author_name}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {formatRelativeTime(comment.created_at)}
                    </span>
                  </div>
                  {(comment.timecode || comment.frame_number) ? (
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      {comment.timecode || 'No timecode'}
                      {comment.frame_number ? ` • Frame ${comment.frame_number}` : ''}
                    </div>
                  ) : null}
                  <p className="mt-1 text-sm text-foreground/90">{comment.content}</p>
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
                            >
                              {attachment.file_name}
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>

          <div className="space-y-2 border-t border-border p-3">
            {saveError ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
                {saveError}
              </div>
            ) : null}
            <Textarea
              placeholder="Submit a new note or annotation..."
              value={commentText}
              onChange={(event) => setCommentText(event.target.value)}
              className="min-h-[96px]"
            />
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">
                {isAnnotating
                  ? `${formatTimecode(currentFrame, fps)} • Frame ${currentFrame}`
                  : 'Add comment and save'}
              </span>
              <Button
                type="button"
                size="sm"
                onClick={handleSave}
                disabled={isSaving || (!commentText.trim() && pendingShapes.length === 0)}
              >
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
