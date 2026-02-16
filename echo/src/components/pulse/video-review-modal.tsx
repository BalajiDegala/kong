'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Pencil } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { createAnnotation } from '@/actions/annotations'
import { createPostComment } from '@/actions/posts'
import { VideoPlayer } from './video-player'
import { AnnotationCanvas } from './annotation-canvas'
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
  onClose: () => void
}

export function VideoReviewModal({ media, versionId, postId, onClose }: VideoReviewModalProps) {
  console.log('VideoReviewModal mounted with props:', { mediaId: media.id, versionId, postId })

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
      // Save annotations (only if there are shapes)
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

      // Create comment on post if annotation text was provided
      console.log('Annotation save - checking comment creation:', {
        hasText: !!annotationText.trim(),
        postId,
        text: annotationText,
      })

      if (annotationText.trim() && postId) {
        const commentContent = `[Frame ${currentFrame}] ${annotationText.trim()}`
        console.log('Creating comment on post:', postId, 'with content:', commentContent)

        const result = await createPostComment({
          post_id: postId,
          content: commentContent,
        })

        if (result.error) {
          console.error('Failed to create comment:', result.error)
        } else {
          console.log('✅ Comment created successfully:', result)
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
              url={videoUrl}
              fps={media.fps || 24}
              onFrameChange={handleFrameChange}
              onPause={() => setIsPaused(true)}
              onPlay={() => setIsPaused(false)}
              onFullscreen={() => setIsFullscreen(prev => !prev)}
            />
            <AnnotationCanvas
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
