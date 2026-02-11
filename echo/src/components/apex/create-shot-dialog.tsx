'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown } from 'lucide-react'
import { createShot } from '@/actions/shots'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SchemaExtraFields } from '@/components/schema/schema-extra-fields'

interface CreateShotDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  defaultSequenceId?: string | number
  lockSequence?: boolean
}

const labelClass = 'pt-2 text-sm font-semibold text-zinc-200'
const inputClass =
  'border-zinc-700 bg-zinc-900 text-zinc-100 placeholder:text-zinc-400 focus:border-sky-500 focus:ring-sky-500/30'
const selectClass = 'w-full border-zinc-700 bg-zinc-900 text-zinc-100 focus:border-sky-500 focus:ring-sky-500/30'

export function CreateShotDialog({
  open,
  onOpenChange,
  projectId,
  defaultSequenceId,
  lockSequence = false,
}: CreateShotDialogProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sequences, setSequences] = useState<any[]>([])
  const [projectLabel, setProjectLabel] = useState(projectId)
  const [showMoreFields, setShowMoreFields] = useState(false)
  const [extraFields, setExtraFields] = useState<Record<string, any>>({})

  const [formData, setFormData] = useState({
    sequence_id: defaultSequenceId ? String(defaultSequenceId) : '',
    name: '',
    code: '',
    description: '',
    task_template: '',
    cut_in: '',
    cut_out: '',
    client_name: '',
    dd_client_name: '',
  })

  useEffect(() => {
    if (!open) return
    setShowMoreFields(false)
    loadSequences()
    loadProject()
  }, [open, projectId])

  useEffect(() => {
    if (!open) return
    if (!defaultSequenceId) return
    setFormData((prev) => ({ ...prev, sequence_id: String(defaultSequenceId) }))
  }, [open, defaultSequenceId])

  async function loadSequences() {
    const supabase = createClient()
    const { data } = await supabase
      .from('sequences')
      .select('id, code, name')
      .eq('project_id', projectId)
      .order('code')
    setSequences(data || [])
  }

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
      if (!formData.sequence_id) {
        throw new Error('Please select a sequence')
      }

      const normalizedName = formData.name.trim()
      const normalizedCode = (formData.code.trim() || normalizedName)
        .trim()
        .replace(/\s+/g, '_')

      if (!normalizedName) {
        throw new Error('Shot name is required')
      }
      if (!normalizedCode) {
        throw new Error('Shot code could not be generated')
      }

      const result = await createShot({
        project_id: projectId,
        sequence_id: formData.sequence_id,
        name: normalizedName,
        code: normalizedCode,
        description: formData.description || null,
        task_template: formData.task_template || null,
        cut_in: formData.cut_in ? Number.parseInt(formData.cut_in, 10) : undefined,
        cut_out: formData.cut_out ? Number.parseInt(formData.cut_out, 10) : undefined,
        client_name: formData.client_name || null,
        dd_client_name: formData.dd_client_name || null,
        ...extraFields,
      })

      if (result.error) throw new Error(result.error)

      setFormData({
        sequence_id: defaultSequenceId ? String(defaultSequenceId) : '',
        name: '',
        code: '',
        description: '',
        task_template: '',
        cut_in: '',
        cut_out: '',
        client_name: '',
        dd_client_name: '',
      })
      setExtraFields({})
      setShowMoreFields(false)
      onOpenChange(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create shot')
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
              Create a new Shot
            </DialogTitle>
            <DialogDescription className="sr-only">
              Create a new shot and assign it to a sequence.
            </DialogDescription>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
            {error && (
              <div className="rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
                {error}
              </div>
            )}

            {sequences.length === 0 ? (
              <div className="rounded-md border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-300">
                No sequences found. Create a sequence first.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-[120px_1fr] items-start gap-3">
                  <Label htmlFor="name" className={labelClass}>
                    Shot Name:
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

                <div className="grid grid-cols-[120px_1fr] items-start gap-3">
                  <Label htmlFor="sequence_id" className={labelClass}>
                    Sequence:
                  </Label>
                  <Select
                    value={formData.sequence_id || 'none'}
                    onValueChange={(value) =>
                      setFormData({ ...formData, sequence_id: value === 'none' ? '' : value })
                    }
                    disabled={isLoading || lockSequence}
                  >
                    <SelectTrigger id="sequence_id" className={selectClass}>
                      <SelectValue placeholder="Select a sequence" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select a sequence</SelectItem>
                      {sequences.map((sequence) => (
                        <SelectItem key={sequence.id} value={sequence.id.toString()}>
                          {sequence.code} - {sequence.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-[120px_1fr] items-start gap-3">
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

                <div className="grid grid-cols-[120px_1fr] items-start gap-3">
                  <Label htmlFor="task_template" className={labelClass}>
                    Task Template:
                  </Label>
                  <Input
                    id="task_template"
                    value={formData.task_template}
                    onChange={(e) =>
                      setFormData({ ...formData, task_template: e.target.value })
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
                      <Label htmlFor="code" className={labelClass}>
                        Shot Code:
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
                          If blank, code is generated from shot name.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-2">
                        <Label htmlFor="cut_in" className="text-sm font-medium text-zinc-300">
                          Cut In
                        </Label>
                        <Input
                          id="cut_in"
                          type="number"
                          value={formData.cut_in}
                          onChange={(e) => setFormData({ ...formData, cut_in: e.target.value })}
                          disabled={isLoading}
                          className={inputClass}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="cut_out" className="text-sm font-medium text-zinc-300">
                          Cut Out
                        </Label>
                        <Input
                          id="cut_out"
                          type="number"
                          value={formData.cut_out}
                          onChange={(e) => setFormData({ ...formData, cut_out: e.target.value })}
                          disabled={isLoading}
                          className={inputClass}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-2">
                        <Label htmlFor="client_name" className="text-sm font-medium text-zinc-300">
                          Client Name
                        </Label>
                        <Input
                          id="client_name"
                          value={formData.client_name}
                          onChange={(e) =>
                            setFormData({ ...formData, client_name: e.target.value })
                          }
                          disabled={isLoading}
                          className={inputClass}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label
                          htmlFor="dd_client_name"
                          className="text-sm font-medium text-zinc-300"
                        >
                          DD Client Name
                        </Label>
                        <Input
                          id="dd_client_name"
                          value={formData.dd_client_name}
                          onChange={(e) =>
                            setFormData({ ...formData, dd_client_name: e.target.value })
                          }
                          disabled={isLoading}
                          className={inputClass}
                        />
                      </div>
                    </div>

                    <SchemaExtraFields
                      entity="shot"
                      values={extraFields}
                      onChange={setExtraFields}
                      disabled={isLoading}
                      title="More schema fields"
                      excludeColumns={new Set([
                        'sequence_id',
                        'name',
                        'code',
                        'description',
                        'task_template',
                        'cut_in',
                        'cut_out',
                        'client_name',
                        'dd_client_name',
                        'thumbnail_url',
                      ])}
                    />
                  </div>
                )}
              </>
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
                disabled={isLoading || sequences.length === 0}
                className="bg-sky-600 text-white hover:bg-sky-500"
              >
                {isLoading ? 'Creating...' : 'Create Shot'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
