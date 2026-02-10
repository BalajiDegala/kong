'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { EntityTable } from '@/components/table/entity-table'
import { CreateSequenceDialog } from '@/components/apex/create-sequence-dialog'
import { EditSequenceDialog } from '@/components/apex/edit-sequence-dialog'
import { DeleteConfirmDialog } from '@/components/apex/delete-confirm-dialog'
import { deleteSequence, updateSequence } from '@/actions/sequences'
import { Plus } from 'lucide-react'

export default function SequencesPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const [projectId, setProjectId] = useState<string>('')
  const [sequences, setSequences] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedSequence, setSelectedSequence] = useState<any>(null)
  const listToString = (value: any) =>
    Array.isArray(value) ? value.join(', ') : ''
  const stringToList = (value: string) =>
    value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)

  useEffect(() => {
    params.then((p) => {
      setProjectId(p.projectId)
      loadSequences(p.projectId)
    })
  }, [params])

  async function loadSequences(projId: string) {
    try {
      setIsLoading(true)
      const supabase = createClient()

      const { data } = await supabase
        .from('sequences')
        .select(
          `
          *,
          project:projects(id, code, name)
        `
        )
        .eq('project_id', projId)
        .order('code')

      const normalized =
        data?.map((sequence) => ({
          ...sequence,
          project_label: sequence.project
            ? sequence.project.code || sequence.project.name
            : '',
        })) || []

      setSequences(normalized)
    } catch (error) {
      console.error('Error loading sequences:', error)
    } finally {
      setIsLoading(false)
    }
  }

  function handleEdit(sequence: any) {
    setSelectedSequence(sequence)
    setShowEditDialog(true)
  }

  function handleDelete(sequence: any) {
    setSelectedSequence(sequence)
    setShowDeleteDialog(true)
  }

  async function handleDeleteConfirm() {
    if (!selectedSequence) return { error: 'No sequence selected' }
    return await deleteSequence(selectedSequence.id, projectId)
  }

  async function handleCellUpdate(row: any, column: any, value: any) {
    const result = await updateSequence(row.id, { [column.id]: value }, { revalidate: false })
    if (result.error) {
      throw new Error(result.error)
    }
    setSequences((prev) =>
      prev.map((sequence) =>
        sequence.id === row.id ? { ...sequence, [column.id]: value } : sequence
      )
    )
  }

  const columns = [
    { id: 'thumbnail_url', label: 'Thumbnail', type: 'thumbnail' as const, width: '80px' },
    {
      id: 'name',
      label: 'Sequence Name',
      type: 'link' as const,
      editable: true,
      editor: 'text' as const,
      linkHref: (row: any) => `/apex/${projectId}/sequences/${row.id}`,
      formatValue: (value: any, row: any) => value || row.code || '',
    },
    { id: 'status', label: 'Status', type: 'status' as const, width: '80px', editable: true, editor: 'text' as const },
    { id: 'description', label: 'Description', type: 'text' as const, editable: true, editor: 'textarea' as const },
    {
      id: 'shots',
      label: 'Shots',
      type: 'text' as const,
      width: '160px',
      editable: true,
      editor: 'text' as const,
      formatValue: listToString,
      parseValue: stringToList,
    },
    {
      id: 'assets',
      label: 'Assets',
      type: 'text' as const,
      width: '160px',
      editable: true,
      editor: 'text' as const,
      formatValue: listToString,
      parseValue: stringToList,
    },
    { id: 'cc', label: 'Cc', type: 'text' as const, width: '120px', editable: true, editor: 'text' as const },
    { id: 'client_name', label: 'Client Name', type: 'text' as const, width: '160px', editable: true, editor: 'text' as const },
    { id: 'id', label: 'Id', type: 'text' as const, width: '80px' },
    { id: 'plates', label: 'Plates', type: 'text' as const, width: '120px', editable: true, editor: 'text' as const },
    { id: 'project_label', label: 'Project', type: 'text' as const, width: '120px' },
    {
      id: 'tags',
      label: 'Tags',
      type: 'text' as const,
      width: '160px',
      editable: true,
      editor: 'text' as const,
      formatValue: listToString,
      parseValue: stringToList,
    },
    { id: 'task_template', label: 'Task Template', type: 'text' as const, width: '160px', editable: true, editor: 'text' as const },
    { id: 'sequence_type', label: 'Type', type: 'text' as const, width: '120px', editable: true, editor: 'text' as const },
    { id: 'dd_client_name', label: 'DD Client Name', type: 'text' as const, width: '160px', editable: true, editor: 'text' as const },
    { id: 'cuts', label: 'Cuts', type: 'text' as const, width: '120px', editable: true, editor: 'text' as const },
  ]

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-zinc-400">Loading sequences...</p>
      </div>
    )
  }

  return (
    <>
      <CreateSequenceDialog
        open={showCreateDialog}
        onOpenChange={(open) => {
          setShowCreateDialog(open)
          if (!open) loadSequences(projectId)
        }}
        projectId={projectId}
      />

      <EditSequenceDialog
        open={showEditDialog}
        onOpenChange={(open) => {
          setShowEditDialog(open)
          if (!open) loadSequences(projectId)
        }}
        sequence={selectedSequence}
      />

      <DeleteConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Sequence"
        description="Are you sure you want to delete this sequence? This will also delete all associated shots and tasks."
        itemName={selectedSequence?.name || ''}
        onConfirm={handleDeleteConfirm}
      />

      <div className="flex h-full flex-col">
        <div className="border-b border-zinc-800 bg-zinc-950 px-6 py-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-100">Sequences</h2>
            <button
              onClick={() => setShowCreateDialog(true)}
              className="flex items-center gap-2 rounded-md bg-amber-500 px-3 py-2 text-sm font-medium text-black transition hover:bg-amber-400"
            >
              <Plus className="h-4 w-4" />
              Add Sequence
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {sequences.length === 0 ? (
            <div className="flex h-full items-center justify-center p-6">
              <div className="text-center">
                <p className="mb-2 text-zinc-400">No sequences yet</p>
                <button
                  onClick={() => setShowCreateDialog(true)}
                  className="text-sm text-amber-400 hover:text-amber-300"
                >
                  Create your first sequence
                </button>
              </div>
            </div>
          ) : (
            <EntityTable
              columns={columns}
              data={sequences}
              entityType="sequences"
              onAdd={() => setShowCreateDialog(true)}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onCellUpdate={handleCellUpdate}
            />
          )}
        </div>
      </div>
    </>
  )
}
