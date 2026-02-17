'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { X, Pencil } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { createAnnotation } from '@/actions/annotations'
import { createPostComment, uploadCommentAttachment } from '@/actions/posts'
import { VideoPlayer } from './video-player'
import { AnnotationCanvas, type AnnotationCanvasRef } from './annotation-canvas'
import { AnnotationToolbar, type AnnotationTool } from './annotation-toolbar'
import { AnnotationList } from './annotation-list'

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

export function VideoReviewModal({ media, versionId, postId, projectId, onClose }: VideoReviewModalProps) {
  console.log('VideoReviewModal mounted with props:', { mediaId: media.id, versionId, postId, projectId })

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<AnnotationCanvasRef>(null)

  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [isAnnotating, setIsAnnotating] = useState(false)
  const [activeTool, setActiveTool] = useState<AnnotationTool>('rectangle')
  const [activeColor, setActiveColor] = useState('#ef4444')
  const [strokeWidth, setStrokeWidth] = useState(3)
  const [currentFrame, setCurrentFrame] = useState(1)
  const [isPaused, setIsPaused] = useState(false)
  const [pendingShapes, setPendingShapes] = useState<any[]>([])
  const [frameAnnotations, setFrameAnnotations] = useState<any[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [annotationText, setAnnotationText] = useState('')
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Get signed URL
  useEffect(() => {
    console.log('Fetching signed URL for:', media.storage_path)
    const supabase = createClient()
    supabase.storage
      .from('post-media')
      .createSignedUrl(media.storage_path, 3600)
      .then(({ data, error }) => {
        if (error) {
          console.error('Error getting signed URL:', error)
        } else if (data?.signedUrl) {
          console.log('Got signed URL:', data.signedUrl)
          setVideoUrl(data.signedUrl)
        } else {
          console.error('No signed URL in response')
        }
      })
  }, [media.storage_path])

  // Load annotations for current frame
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

    const { data } = await query
    setFrameAnnotations(data?.map(a => a.annotation_data) || [])
  }, [media.id, versionId])

  useEffect(() => {
    loadFrameAnnotations(currentFrame)
  }, [currentFrame, loadFrameAnnotations])

  const handleFrameChange = (frame: number) => {
    setCurrentFrame(frame)
    setPendingShapes([])
  }

  const handleAnnotationCreated = (shape: any) => {
    setPendingShapes(prev => [...prev, shape])
  }

  const handleSave = async () => {
    // Allow saving if there are shapes OR annotation text
    if (pendingShapes.length === 0 && !annotationText.trim()) return

    setIsSaving(true)
    try {
      // Save annotations to database (only if there are shapes)
      if (pendingShapes.length > 0) {
        for (const shape of pendingShapes) {
          await createAnnotation({
            post_media_id: versionId ? undefined : media.id,
            version_id: versionId,
            frame_number: currentFrame,
            annotation_data: shape,
            annotation_text: annotationText || undefined,
          })
        }
      }

      // Create comment on post
      if ((annotationText.trim() || pendingShapes.length > 0) && postId) {
        const commentContent = annotationText.trim()
          ? `[Frame ${currentFrame}] ${annotationText.trim()}`
          : `[Frame ${currentFrame}] Annotation`

        console.log('Creating comment on post:', postId, 'with content:', commentContent)

        const commentResult = await createPostComment({
          post_id: postId,
          content: commentContent,
          project_id: projectId,
        })

        if (commentResult.error) {
          console.error('Failed to create comment:', commentResult.error)
        } else if (commentResult.data) {
          console.log('✅ Comment created successfully:', commentResult.data.id)

          // Capture annotated frame as image if there are shapes
          if (pendingShapes.length > 0 && videoRef.current && canvasRef.current) {
            try {
              console.log('🎬 Starting image capture for frame', currentFrame, 'with', pendingShapes.length, 'shapes')
              const blob = await canvasRef.current.exportAnnotatedFrame(videoRef.current)
              console.log('📸 Canvas export result:', blob ? `${blob.size} bytes` : 'null')

              if (blob) {
                const supabase = createClient()
                const timestamp = Date.now()
                const filename = `frame-${currentFrame}.png`
                const filePath = `${commentResult.data.id}/${timestamp}_${filename}`

                console.log('⬆️ Uploading directly to storage:', filePath)

                // Upload directly from client to storage (bypasses 1MB server action limit)
                const { data: uploadData, error: uploadError } = await supabase.storage
                  .from('note-attachments')
                  .upload(filePath, blob, {
                    cacheControl: '3600',
                    upsert: false,
                    contentType: 'image/png',
                  })

                if (uploadError) {
                  console.error('❌ Failed to upload to storage:', uploadError)
                } else {
                  console.log('✅ Upload successful, creating attachment record')

                  // Create attachment record with just the metadata (small payload)
                  const attachmentResult = await uploadCommentAttachment({
                    note_id: commentResult.data.id,
                    storage_path: uploadData.path,
                    file_name: filename,
                    file_size: blob.size,
                  })

                  if (attachmentResult.error) {
                    console.error('❌ Failed to create attachment record:', attachmentResult.error)
                    // Clean up uploaded file
                    await supabase.storage.from('note-attachments').remove([uploadData.path])
                  } else {
                    console.log('✅ Attachment record created:', attachmentResult.data)
                  }
                }
              } else {
                console.warn('⚠️ Blob is null - canvas export failed')
              }
            } catch (error) {
              console.error('❌ Failed to capture/upload annotation image:', error)
              // Continue - comment was created successfully
            }
          } else {
            console.log('⏭️ Skipping image capture:', {
              hasShapes: pendingShapes.length > 0,
              hasVideoRef: !!videoRef.current,
              hasCanvasRef: !!canvasRef.current
            })
          }
        }
      }

      setPendingShapes([])
      setAnnotationText('')
      loadFrameAnnotations(currentFrame)
    } finally {
      setIsSaving(false)
    }
  }

  const handleClear = () => {
    setPendingShapes([])
  }

  // Escape to close or exit fullscreen
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isFullscreen) {
          setIsFullscreen(false)
        } else {
          onClose()
        }
      }
      if (e.key === 'f' || e.key === 'F') {
        setIsFullscreen(prev => !prev)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose, isFullscreen])

  if (!videoUrl) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
        <div className="text-zinc-400">Loading video...</div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex bg-black/95">
      {/* Main video area */}
      <div className={`flex flex-col ${isFullscreen ? 'w-full' : 'flex-1'}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-medium text-zinc-300">{media.file_name}</h3>
            <button
              onClick={() => setIsAnnotating(!isAnnotating)}
              className={`
                flex items-center gap-1.5 px-2 py-1 text-xs rounded transition
                ${isAnnotating
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                  : 'text-zinc-400 hover:text-zinc-200 border border-zinc-700 hover:border-zinc-600'
                }
              `}
            >
              <Pencil className="h-3.5 w-3.5" />
              {isAnnotating ? 'Drawing' : 'Annotate'}
            </button>
          </div>
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onClose()
            }}
            className="p-1 text-zinc-400 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Toolbar */}
        {isAnnotating && !isFullscreen && (
          <div className="flex items-center justify-center px-4 py-2 border-b border-zinc-800">
            <AnnotationToolbar
              activeTool={activeTool}
              activeColor={activeColor}
              strokeWidth={strokeWidth}
              annotationText={annotationText}
              onToolChange={setActiveTool}
              onColorChange={setActiveColor}
              onStrokeWidthChange={setStrokeWidth}
              onAnnotationTextChange={setAnnotationText}
              onClear={handleClear}
              onSave={handleSave}
              isSaving={isSaving}
            />
          </div>
        )}

        {/* Video + Canvas overlay */}
        <div className="flex-1 relative flex items-center justify-center p-4">
          <div className={`relative w-full aspect-video ${isFullscreen ? 'h-full' : 'max-w-[90vw] max-h-[calc(100vh-200px)]'}`}>
            <VideoPlayer
              ref={videoRef}
              url={videoUrl}
              fps={media.fps || 24}
              onFrameChange={handleFrameChange}
              onPause={() => setIsPaused(true)}
              onPlay={() => setIsPaused(false)}
              onFullscreen={() => setIsFullscreen(prev => !prev)}
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
              onAnnotationCreated={handleAnnotationCreated}
            />
          </div>
        </div>

        {/* Annotation text input */}
        {isAnnotating && pendingShapes.length > 0 && !isFullscreen && (
          <div className="px-4 py-2 border-t border-zinc-800">
            <input
              type="text"
              value={annotationText}
              onChange={(e) => setAnnotationText(e.target.value)}
              placeholder="Add a note about this annotation..."
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-500 focus:border-amber-500 focus:outline-none"
            />
          </div>
        )}
      </div>

      {/* Sidebar: annotation list */}
      {!isFullscreen && (
        <div className="w-72 border-l border-zinc-800 bg-zinc-900">
          <AnnotationList
            postMediaId={versionId ? undefined : media.id}
            versionId={versionId}
            currentFrame={currentFrame}
            onFrameClick={(frame) => handleFrameChange(frame)}
            onAnnotationsChange={() => loadFrameAnnotations(currentFrame)}
          />
        </div>
      )}
    </div>
  )
}
