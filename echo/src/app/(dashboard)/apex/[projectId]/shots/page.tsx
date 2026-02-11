'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { EntityTable } from '@/components/table/entity-table'
import { CreateShotDialog } from '@/components/apex/create-shot-dialog'
import { EditShotDialog } from '@/components/apex/edit-shot-dialog'
import { DeleteConfirmDialog } from '@/components/apex/delete-confirm-dialog'
import { ApexPageShell } from '@/components/apex/apex-page-shell'
import { ApexEmptyState } from '@/components/apex/apex-empty-state'
import { deleteShot, updateShot } from '@/actions/shots'
import { Clapperboard, Plus } from 'lucide-react'

export default function ShotsPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const [projectId, setProjectId] = useState<string>('')
  const [shots, setShots] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedShot, setSelectedShot] = useState<any>(null)
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
      loadShots(p.projectId)
    })
  }, [params])

  async function loadShots(projId: string) {
    try {
      setIsLoading(true)
      const supabase = createClient()

      const { data } = await supabase
        .from('shots')
        .select(`
          *,
          sequences (
            code,
            name
          ),
          project:projects(id, code, name)
        `)
        .eq('project_id', projId)
        .order('code')

      // Transform data for table
      const tableData = (data || []).map((shot) => ({
        ...shot,
        sequence_name: shot.sequences?.name || 'No Sequence',
        sequence_code: shot.sequences?.code || '-',
        project_label: shot.project ? shot.project.code || shot.project.name : '',
      }))

      setShots(tableData)
    } catch (error) {
      console.error('Error loading shots:', error)
    } finally {
      setIsLoading(false)
    }
  }

  function handleEdit(shot: any) {
    setSelectedShot(shot)
    setShowEditDialog(true)
  }

  function handleDelete(shot: any) {
    setSelectedShot(shot)
    setShowDeleteDialog(true)
  }

  async function handleDeleteConfirm() {
    if (!selectedShot) return { error: 'No shot selected' }
    return await deleteShot(selectedShot.id, projectId)
  }

  async function handleCellUpdate(row: any, column: any, value: any) {
    const result = await updateShot(row.id, { [column.id]: value }, { revalidate: false })
    if (result.error) {
      throw new Error(result.error)
    }
    setShots((prev) =>
      prev.map((shot) =>
        shot.id === row.id ? { ...shot, [column.id]: value } : shot
      )
    )
  }

  const columns = [
    { id: 'thumbnail_url', label: 'Thumbnail', type: 'thumbnail' as const, width: '80px' },
    { id: 'sequence_code', label: 'Sequence', type: 'text' as const, width: '100px' },
    {
      id: 'code',
      label: 'Shot Code',
      type: 'link' as const,
      editable: true,
      editor: 'text' as const,
      linkHref: (row: any) => `/apex/${projectId}/shots/${row.id}`,
    },
    { id: 'shot_type', label: 'Type', type: 'text' as const, width: '120px', editable: true, editor: 'text' as const },
    { id: 'description', label: 'Description', type: 'text' as const, editable: true, editor: 'textarea' as const },
    { id: 'status', label: 'Status', type: 'status' as const, width: '80px', editable: true, editor: 'text' as const },
    { id: 'cut_in', label: 'Cut In', type: 'number' as const, width: '80px', editable: true, editor: 'text' as const },
    { id: 'cut_out', label: 'Cut Out', type: 'number' as const, width: '80px', editable: true, editor: 'text' as const },
    { id: 'cut_duration', label: 'Cut Duration', type: 'number' as const, width: '100px' },
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
    {
      id: 'cc',
      label: 'Cc',
      type: 'text' as const,
      width: '120px',
      editable: true,
      editor: 'text' as const,
      formatValue: listToString,
      parseValue: stringToList,
    },
    { id: 'client_name', label: 'Client Name', type: 'text' as const, width: '160px', editable: true, editor: 'text' as const },
    { id: 'comp_note', label: 'Comp Note', type: 'text' as const, width: '160px', editable: true, editor: 'text' as const },
    { id: 'cut_order', label: 'Cut Order', type: 'number' as const, width: '120px', editable: true, editor: 'text' as const },
    { id: 'dd_client_name', label: 'DD Client Name', type: 'text' as const, width: '160px', editable: true, editor: 'text' as const },
    { id: 'dd_location', label: 'DD Location', type: 'text' as const, width: '140px', editable: true, editor: 'text' as const },
    { id: 'delivery_date', label: 'Delivery Date', type: 'date' as const, width: '140px', editable: true, editor: 'date' as const },
    { id: 'head_duration', label: 'Head Duration', type: 'number' as const, width: '120px', editable: true, editor: 'text' as const },
    { id: 'head_in', label: 'Head In', type: 'number' as const, width: '100px', editable: true, editor: 'text' as const },
    { id: 'id', label: 'Id', type: 'text' as const, width: '80px' },
    { id: 'next_review', label: 'Next Review', type: 'date' as const, width: '140px', editable: true, editor: 'date' as const },
    {
      id: 'open_notes',
      label: 'Open Notes',
      type: 'text' as const,
      width: '160px',
      editable: true,
      editor: 'text' as const,
      formatValue: listToString,
      parseValue: stringToList,
    },
    { id: 'open_notes_count', label: 'Open Notes Count', type: 'number' as const, width: '140px', editable: true, editor: 'text' as const },
    {
      id: 'parent_shots',
      label: 'Parent Shots',
      type: 'text' as const,
      width: '160px',
      editable: true,
      editor: 'text' as const,
      formatValue: listToString,
      parseValue: stringToList,
    },
    {
      id: 'plates',
      label: 'Plates',
      type: 'text' as const,
      width: '120px',
      editable: true,
      editor: 'text' as const,
      formatValue: listToString,
      parseValue: stringToList,
    },
    { id: 'project_label', label: 'Project', type: 'text' as const, width: '120px' },
    { id: 'seq_shot', label: 'Seq Shot', type: 'text' as const, width: '120px', editable: true, editor: 'text' as const },
    { id: 'shot_notes', label: 'Shot Notes', type: 'text' as const, width: '220px', editable: true, editor: 'textarea' as const },
    {
      id: 'sub_shots',
      label: 'Sub Shots',
      type: 'text' as const,
      width: '160px',
      editable: true,
      editor: 'text' as const,
      formatValue: listToString,
      parseValue: stringToList,
    },
    { id: 'tail_out', label: 'Tail Out', type: 'number' as const, width: '100px', editable: true, editor: 'text' as const },
    { id: 'target_date', label: 'Target Date', type: 'date' as const, width: '140px', editable: true, editor: 'date' as const },
    { id: 'task_template', label: 'Task Template', type: 'text' as const, width: '160px', editable: true, editor: 'text' as const },
    {
      id: 'vendor_groups',
      label: 'Vendor Groups',
      type: 'text' as const,
      width: '160px',
      editable: true,
      editor: 'text' as const,
      formatValue: listToString,
      parseValue: stringToList,
    },
  ]

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-zinc-400">Loading shots...</p>
      </div>
    )
  }

  return (
    <>
      <CreateShotDialog
        open={showCreateDialog}
        onOpenChange={(open) => {
          setShowCreateDialog(open)
          if (!open) loadShots(projectId)
        }}
        projectId={projectId}
      />

      <EditShotDialog
        open={showEditDialog}
        onOpenChange={(open) => {
          setShowEditDialog(open)
          if (!open) loadShots(projectId)
        }}
        shot={selectedShot}
      />

      <DeleteConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Shot"
        description="Are you sure you want to delete this shot? This will also delete all associated tasks and versions."
        itemName={selectedShot?.name || ''}
        onConfirm={handleDeleteConfirm}
      />

      <ApexPageShell
        title="Shots"
        action={
          <button
            onClick={() => setShowCreateDialog(true)}
            className="flex items-center gap-2 rounded-md bg-amber-500 px-3 py-2 text-sm font-medium text-black transition hover:bg-amber-400"
          >
            <Plus className="h-4 w-4" />
            Add Shot
          </button>
        }
      >
        {shots.length === 0 ? (
          <ApexEmptyState
            icon={<Clapperboard className="h-12 w-12" />}
            title="No shots yet"
            description="Create your first shot to start tracking work."
            action={
              <button
                onClick={() => setShowCreateDialog(true)}
                className="rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-black transition hover:bg-amber-400"
              >
                Create First Shot
              </button>
            }
          />
        ) : (
          <EntityTable
            columns={columns}
            data={shots}
            entityType="shots"
            onAdd={() => setShowCreateDialog(true)}
            groupBy="sequence_name"
            onEdit={handleEdit}
            onDelete={handleDelete}
            onCellUpdate={handleCellUpdate}
          />
        )}
      </ApexPageShell>
    </>
  )
}
