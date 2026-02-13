'use client'

import { useState, useCallback, useEffect } from 'react'
import { Send, Loader2, ImagePlus, Video, X, Tag } from 'lucide-react'
import { createPost } from '@/actions/posts'
import { uploadPostMedia } from '@/actions/post-media'
import { createClient } from '@/lib/supabase/client'
import { EntityHierarchySelector, SelectedEntities } from './entity-hierarchy-selector'

interface SimplePostComposerProps {
  authorProfile?: { display_name: string; avatar_url: string | null }
  onPostCreated?: () => void
}

export function SimplePostComposer({ authorProfile, onPostCreated }: SimplePostComposerProps) {
  const supabase = createClient()

  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mediaFiles, setMediaFiles] = useState<File[]>([])
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([])
  const [composerKey, setComposerKey] = useState(0) // Key to force remount

  // Entity selections (using hierarchy selector)
  const [entitySelections, setEntitySelections] = useState<SelectedEntities>({
    projects: [],
    sequences: [],
    shots: [],
    tasks: [],
  })

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setMediaFiles(prev => [...prev, ...files])

    files.forEach(file => {
      const url = URL.createObjectURL(file)
      setMediaPreviews(prev => [...prev, url])
    })

    e.target.value = ''
  }, [])

  const removeMedia = useCallback((index: number) => {
    URL.revokeObjectURL(mediaPreviews[index])
    setMediaFiles(prev => prev.filter((_, i) => i !== index))
    setMediaPreviews(prev => prev.filter((_, i) => i !== index))
  }, [mediaPreviews])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!content.trim() && mediaFiles.length === 0) {
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const projectIds = entitySelections.projects.map((p) => p.id)
      const sequenceIds = entitySelections.sequences.map((s) => s.id)
      const shotIds = entitySelections.shots.map((s) => s.id)
      const taskIds = entitySelections.tasks.map((t) => t.id)

      console.log('Creating post with entity associations:', {
        content,
        projectIds,
        sequenceIds,
        shotIds,
        taskIds,
        mediaCount: mediaFiles.length,
      })

      const result = await createPost({
        content: content.trim() || 'Shared media',
        projectIds,
        sequenceIds,
        shotIds,
        taskIds,
      })

      console.log('Result:', result)

      if (result.error) {
        setError(result.error)
        return
      }

      // Upload media files if any
      if (result.data && mediaFiles.length > 0) {
        for (let i = 0; i < mediaFiles.length; i++) {
          const file = mediaFiles[i]
          const ext = file.name.split('.').pop()
          const storagePath = `${result.data.id}/${Date.now()}-${i}.${ext}`

          console.log('Uploading file to:', storagePath, 'Size:', file.size, 'Type:', file.type)

          const { error: uploadError, data: uploadData } = await supabase.storage
            .from('post-media')
            .upload(storagePath, file)

          if (uploadError) {
            console.error('❌ Upload failed for', file.name, ':', uploadError)
            setError(`Failed to upload ${file.name}: ${uploadError.message}`)
            continue
          }

          console.log('✅ Upload successful:', uploadData)

          const mediaType = file.type.startsWith('video/') ? 'video' : 'image'

          await uploadPostMedia({
            post_id: result.data.id,
            file_name: file.name,
            file_size: file.size,
            mime_type: file.type,
            media_type: mediaType,
            storage_path: storagePath,
          })
        }
      }

      // Success - clear form
      setContent('')
      mediaPreviews.forEach((url) => URL.revokeObjectURL(url))
      setMediaFiles([])
      setMediaPreviews([])
      setEntitySelections({
        projects: [],
        sequences: [],
        shots: [],
        tasks: [],
      })
      // Force remount of entity selector to clear its internal state
      setComposerKey((prev) => prev + 1)
      onPostCreated?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create post')
    } finally {
      setIsSubmitting(false)
    }
  }

  const hasEntitySelections =
    entitySelections.projects.length > 0 ||
    entitySelections.sequences.length > 0 ||
    entitySelections.shots.length > 0 ||
    entitySelections.tasks.length > 0

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-3">
        <div className="h-8 w-8 rounded-full bg-zinc-700 flex items-center justify-center text-sm font-medium text-zinc-300">
          {authorProfile?.display_name?.[0]?.toUpperCase() || '?'}
        </div>
        <span className="text-sm font-medium text-zinc-300">
          {authorProfile?.display_name || 'You'}
        </span>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-4 mt-2 rounded-md bg-red-500/10 border border-red-500/20 p-2 text-sm text-red-500">
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's on your mind?"
          disabled={isSubmitting}
          rows={3}
          className="w-full px-4 py-3 bg-transparent text-zinc-200 text-sm placeholder:text-zinc-600 focus:outline-none resize-none"
        />

        {/* Entity Selector (Hierarchy) */}
        <div className="px-4 pb-3">
          <EntityHierarchySelector
            key={composerKey}
            onSelectionChange={setEntitySelections}
          />
        </div>

        {/* Media Previews */}
        {mediaPreviews.length > 0 && (
          <div className="flex gap-2 px-4 pb-2 flex-wrap">
            {mediaPreviews.map((url, index) => (
              <div key={index} className="relative group">
                {mediaFiles[index]?.type.startsWith('video/') ? (
                  <video
                    src={url}
                    className="h-20 w-20 rounded object-cover bg-zinc-800"
                  />
                ) : (
                  <img
                    src={url}
                    alt={`Upload ${index + 1}`}
                    className="h-20 w-20 rounded object-cover bg-zinc-800"
                  />
                )}
                <button
                  type="button"
                  onClick={() => removeMedia(index)}
                  className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between border-t border-zinc-800 px-4 py-2">
          <div className="flex items-center gap-1">
            <label className="cursor-pointer p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition">
              <ImagePlus className="h-4 w-4" />
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileSelect}
                disabled={isSubmitting}
              />
            </label>
            <label className="cursor-pointer p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition">
              <Video className="h-4 w-4" />
              <input
                type="file"
                accept="video/*"
                multiple
                className="hidden"
                onChange={handleFileSelect}
                disabled={isSubmitting}
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || (!content.trim() && mediaFiles.length === 0)}
            className="flex items-center gap-2 rounded-md bg-amber-500 px-4 py-1.5 text-sm font-medium text-zinc-900 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Post
          </button>
        </div>
      </form>
    </div>
  )
}
