'use client'

import { useState, useCallback, useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { ImagePlus, Video, Send, X, Loader2 } from 'lucide-react'
import { createPost } from '@/actions/posts'
import { uploadPostMedia } from '@/actions/post-media'
import { createClient } from '@/lib/supabase/client'

interface PostComposerProps {
  projectId?: number
  authorProfile?: { display_name: string; avatar_url: string | null }
  onPostCreated?: () => void
}

export function PostComposer({ projectId, authorProfile, onPostCreated }: PostComposerProps) {
  const [mediaFiles, setMediaFiles] = useState<File[]>([])
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const editor = useEditor({
    immediatelyRender: typeof window !== 'undefined',
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: "What's on your mind?",
      }),
    ],
    editorProps: {
      attributes: {
        class: 'prose prose-invert prose-sm max-w-none focus:outline-none min-h-[60px] px-4 py-3',
      },
    },
  })

  useEffect(() => {
    if (isMounted) {
      console.log('Component mounted. Editor state:', { editor: !!editor, isDestroyed: editor?.isDestroyed })
      if (editor) {
        console.log('Editor initialized successfully')
        console.log('Editor can be used:', editor.can())
      }
    }
  }, [editor, isMounted])

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

  const handleSubmit = async () => {
    console.log('handleSubmit called', { editor: !!editor, editorText: editor?.getText(), mediaFiles: mediaFiles.length })

    if (!editor) {
      console.error('Editor not initialized')
      setError('Editor not ready. Please try again.')
      return
    }

    const text = editor.getText().trim()
    if (!text && mediaFiles.length === 0) {
      console.log('No content to post')
      return
    }

    setIsSubmitting(true)
    setError(null)
    try {
      const content = editor.getText()
      const contentHtml = editor.getHTML()

      console.log('Creating post:', { content, contentHtml, project_id: projectId })

      const result = await createPost({
        content,
        content_html: contentHtml,
        project_id: projectId || null,
      })

      console.log('createPost result:', result)

      if (result.error) {
        console.error('Failed to create post:', result.error)
        setError(result.error)
        return
      }

      // Upload media files
      if (result.data && mediaFiles.length > 0) {
        const supabase = createClient()

        for (let i = 0; i < mediaFiles.length; i++) {
          const file = mediaFiles[i]
          const ext = file.name.split('.').pop()
          const storagePath = `${result.data.id}/${Date.now()}-${i}.${ext}`

          const { error: uploadError } = await supabase.storage
            .from('post-media')
            .upload(storagePath, file)

          if (uploadError) {
            console.error('Upload failed:', uploadError)
            continue
          }

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

      // Reset
      editor.commands.clearContent()
      mediaPreviews.forEach(url => URL.revokeObjectURL(url))
      setMediaFiles([])
      setMediaPreviews([])
      onPostCreated?.()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900">
      {/* Author bar */}
      <div className="flex items-center gap-3 px-4 pt-3">
        <div className="h-8 w-8 rounded-full bg-zinc-700 flex items-center justify-center text-sm font-medium text-zinc-300">
          {authorProfile?.display_name?.[0]?.toUpperCase() || '?'}
        </div>
        <span className="text-sm font-medium text-zinc-300">
          {authorProfile?.display_name || 'You'}
        </span>
        {projectId && (
          <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">
            Project Post
          </span>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-4 mt-2 rounded-md bg-red-500/10 border border-red-500/20 p-2 text-sm text-red-500">
          {error}
        </div>
      )}

      {/* Editor */}
      <EditorContent editor={editor} />

      {/* Media Previews */}
      {mediaPreviews.length > 0 && (
        <div className="flex gap-2 px-4 pb-2 flex-wrap">
          {mediaPreviews.map((url, index) => (
            <div key={index} className="relative group">
              {mediaFiles[index]?.type.startsWith('video/') ? (
                <video
                  src={url}
                  className="h-20 w-20 rounded object-cover"
                />
              ) : (
                <img
                  src={url}
                  alt={`Upload ${index + 1}`}
                  className="h-20 w-20 rounded object-cover"
                />
              )}
              <button
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
            />
          </label>
        </div>

        <button
          onClick={() => {
            console.log('Post button clicked', {
              editor: !!editor,
              text: editor?.getText(),
              trimmed: editor?.getText().trim(),
              hasMedia: mediaFiles.length > 0
            })
            handleSubmit()
          }}
          disabled={isSubmitting || (!editor?.getText().trim() && mediaFiles.length === 0)}
          className="flex items-center gap-2 rounded-md bg-amber-500 px-4 py-1.5 text-sm font-medium text-zinc-900 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition"
          title={
            !editor ? 'Editor not ready' :
            !editor?.getText().trim() && mediaFiles.length === 0 ? 'Type something or add media' :
            isSubmitting ? 'Posting...' :
            'Click to post'
          }
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          Post
        </button>
      </div>
    </div>
  )
}
