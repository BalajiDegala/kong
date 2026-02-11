'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown } from 'lucide-react'
import { createSequence } from '@/actions/sequences'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { SchemaExtraFields } from '@/components/schema/schema-extra-fields'

interface CreateSequenceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
}

const labelClass = 'pt-2 text-sm font-semibold text-zinc-200'
const inputClass =
  'border-zinc-700 bg-zinc-900 text-zinc-100 placeholder:text-zinc-400 focus:border-sky-500 focus:ring-sky-500/30'

export function CreateSequenceDialog({
  open,
  onOpenChange,
  projectId,
}: CreateSequenceDialogProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [projectLabel, setProjectLabel] = useState(projectId)
  const [showMoreFields, setShowMoreFields] = useState(false)
  const [extraFields, setExtraFields] = useState<Record<string, any>>({})

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    client_name: '',
    dd_client_name: '',
    description: '',
    task_template: '',
    status: 'active',
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const normalizedName = formData.name.trim()
      const normalizedCode = (formData.code.trim() || normalizedName)
        .trim()
        .replace(/\s+/g, '_')

      if (!normalizedName) {
        throw new Error('Sequence name is required')
      }
      if (!normalizedCode) {
        throw new Error('Sequence code could not be generated')
      }

      const result = await createSequence({
        project_id: projectId,
        name: normalizedName,
        code: normalizedCode,
        client_name: formData.client_name || null,
        dd_client_name: formData.dd_client_name || null,
        description: formData.description || null,
        task_template: formData.task_template || null,
        status: formData.status || 'active',
        ...extraFields,
      })

      if (result.error) throw new Error(result.error)

      setFormData({
        name: '',
        code: '',
        client_name: '',
        dd_client_name: '',
        description: '',
        task_template: '',
        status: 'active',
      })
      setExtraFields({})
      setShowMoreFields(false)
      onOpenChange(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create sequence')
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
              Create a new Sequence
            </DialogTitle>
            <DialogDescription className="sr-only">
              Create a new sequence for this project.
            </DialogDescription>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
            {error && (
              <div className="rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <div className="grid grid-cols-[130px_1fr] items-start gap-3">
              <Label htmlFor="name" className={labelClass}>
                Sequence Name:
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                disabled={isLoading}
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-[130px_1fr] items-start gap-3">
              <Label htmlFor="client_name" className={labelClass}>
                Client Name:
              </Label>
              <Input
                id="client_name"
                value={formData.client_name}
                onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                disabled={isLoading}
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-[130px_1fr] items-start gap-3">
              <Label htmlFor="dd_client_name" className={labelClass}>
                DD Client Name:
              </Label>
              <Input
                id="dd_client_name"
                value={formData.dd_client_name}
                onChange={(e) => setFormData({ ...formData, dd_client_name: e.target.value })}
                disabled={isLoading}
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-[130px_1fr] items-start gap-3">
              <Label htmlFor="project_label" className={labelClass}>
                Project:
              </Label>
              <Input id="project_label" value={projectLabel} readOnly className={inputClass} />
            </div>

            <div className="pl-[130px]">
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
                <div className="grid grid-cols-[130px_1fr] items-start gap-3">
                  <Label htmlFor="code" className={labelClass}>
                    Sequence Code:
                  </Label>
                  <div>
                    <Input
                      id="code"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      disabled={isLoading}
                      className={inputClass}
                    />
                    <p className="mt-1 text-xs text-zinc-400">
                      If blank, code is generated from sequence name.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-[130px_1fr] items-start gap-3">
                  <Label htmlFor="description" className={labelClass}>
                    Description:
                  </Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    disabled={isLoading}
                    className={inputClass}
                  />
                </div>

                <div className="grid grid-cols-[130px_1fr] items-start gap-3">
                  <Label htmlFor="task_template" className={labelClass}>
                    Task Template:
                  </Label>
                  <Input
                    id="task_template"
                    value={formData.task_template}
                    onChange={(e) => setFormData({ ...formData, task_template: e.target.value })}
                    disabled={isLoading}
                    className={inputClass}
                  />
                </div>

                <div className="grid grid-cols-[130px_1fr] items-start gap-3">
                  <Label htmlFor="status" className={labelClass}>
                    Status:
                  </Label>
                  <Input
                    id="status"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    disabled={isLoading}
                    className={inputClass}
                  />
                </div>

                <SchemaExtraFields
                  entity="sequence"
                  values={extraFields}
                  onChange={setExtraFields}
                  disabled={isLoading}
                  title="More schema fields"
                  excludeColumns={new Set([
                    'name',
                    'description',
                    'client_name',
                    'dd_client_name',
                    'task_template',
                    'status',
                    'thumbnail_url',
                  ])}
                />
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
                {isLoading ? 'Creating...' : 'Create Sequence'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
