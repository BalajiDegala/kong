'use client'

import { useEffect, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { createPlaylist } from '@/actions/playlists'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface CreatePlaylistDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
}

const labelClass = 'pt-2 text-sm font-semibold text-zinc-200'
const inputClass =
  'border-zinc-700 bg-zinc-900 text-zinc-100 placeholder:text-zinc-400 focus:border-sky-500 focus:ring-sky-500/30'

export function CreatePlaylistDialog({
  open,
  onOpenChange,
  projectId,
}: CreatePlaylistDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [projectLabel, setProjectLabel] = useState(projectId)
  const [showMoreFields, setShowMoreFields] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    date_and_time: '',
    code: '',
    locked: false,
  })

  useEffect(() => {
    if (!open) return
    setShowMoreFields(false)
    loadProject()
  }, [open, projectId])

  async function loadProject() {
    const supabase = createClient()
    const { data } = await supabase
      .from('projects')
      .select('name, code')
      .eq('id', projectId)
      .maybeSingle()
    setProjectLabel(data?.code || data?.name || projectId)
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const normalizedName = formData.name.trim()
      const normalizedCode =
        formData.code.trim() ||
        `${normalizedName}_${formData.date_and_time || 'playlist'}`
          .trim()
          .replace(/\s+/g, '_')
          .toUpperCase()

      if (!normalizedName) {
        throw new Error('Playlist name is required')
      }
      if (!normalizedCode) {
        throw new Error('Playlist code could not be generated')
      }

      const result = await createPlaylist({
        project_id: projectId,
        name: normalizedName,
        code: normalizedCode,
        description: formData.description || undefined,
        locked: formData.locked,
      })

      if (result.error) throw new Error(result.error)

      setFormData({
        name: '',
        description: '',
        date_and_time: '',
        code: '',
        locked: false,
      })
      setShowMoreFields(false)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create playlist')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[90vh] w-full max-w-3xl overflow-hidden border-zinc-800 bg-zinc-950 p-0 text-zinc-100"
      >
        <form onSubmit={handleSubmit} className="flex max-h-[90vh] flex-col">
          <div className="border-b border-zinc-800 px-6 py-4">
            <DialogTitle className="whitespace-nowrap text-2xl font-semibold leading-tight text-zinc-100">
              Create a new Playlist
            </DialogTitle>
            <DialogDescription className="sr-only">
              Create a new playlist for this project.
            </DialogDescription>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
            {error && (
              <div className="rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <div className="grid grid-cols-[120px_1fr] items-start gap-3">
              <Label htmlFor="playlist-name" className={labelClass}>
                Playlist Name:
              </Label>
              <Input
                id="playlist-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                disabled={isLoading}
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-[120px_1fr] items-start gap-3">
              <Label htmlFor="playlist-description" className={labelClass}>
                Description:
              </Label>
              <Textarea
                id="playlist-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                disabled={isLoading}
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-[120px_1fr] items-start gap-3">
              <Label htmlFor="playlist-date-time" className={labelClass}>
                Date and Time:
              </Label>
              <Input
                id="playlist-date-time"
                type="datetime-local"
                value={formData.date_and_time}
                onChange={(e) =>
                  setFormData({ ...formData, date_and_time: e.target.value })
                }
                disabled={isLoading}
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-[120px_1fr] items-start gap-3">
              <Label htmlFor="project_label" className={labelClass}>
                Project:
              </Label>
              <Input id="project_label" value={projectLabel} readOnly className={inputClass} />
            </div>

            <div className="pl-[120px]">
              <button
                type="button"
                onClick={() => setShowMoreFields((prev) => !prev)}
                className="inline-flex items-center gap-1 text-sm text-zinc-300 transition hover:text-zinc-100"
              >
                More fields
                <ChevronDown
                  className={`h-4 w-4 transition ${showMoreFields ? 'rotate-180' : ''}`}
                />
              </button>
            </div>

            {showMoreFields && (
              <div className="space-y-4 rounded-md border border-zinc-800 bg-zinc-900/30 p-4">
                <div className="grid grid-cols-[120px_1fr] items-start gap-3">
                  <Label htmlFor="playlist-code" className={labelClass}>
                    Playlist Code:
                  </Label>
                  <div>
                    <Input
                      id="playlist-code"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      disabled={isLoading}
                      className={inputClass}
                    />
                    <p className="mt-1 text-xs text-zinc-400">
                      If blank, code is generated from name and date.
                    </p>
                  </div>
                </div>

                <label className="flex items-center gap-2 text-sm text-zinc-300">
                  <input
                    type="checkbox"
                    checked={formData.locked}
                    onChange={(e) => setFormData({ ...formData, locked: e.target.checked })}
                    className="h-4 w-4 rounded border border-zinc-700 bg-zinc-900"
                    disabled={isLoading}
                  />
                  Locked
                </label>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end border-t border-zinc-800 px-6 py-3">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
                className="border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-900/30"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-sky-600 text-white hover:bg-sky-500"
              >
                {isLoading ? 'Creating...' : 'Create Playlist'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
