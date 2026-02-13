'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { EntityTable } from '@/components/table/entity-table'
import { deleteShot, updateShot } from '@/actions/shots'
import { CreateShotDialog } from '@/components/apex/create-shot-dialog'
import { EditShotDialog } from '@/components/apex/edit-shot-dialog'
import { DeleteConfirmDialog } from '@/components/apex/delete-confirm-dialog'

export default function SequenceShotsPage({
  params,
}: {
  params: Promise<{ projectId: string; sequenceId: string }>
}) {
  const [projectId, setProjectId] = useState('')
  const [sequenceId, setSequenceId] = useState('')
  const [shots, setShots] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedShot, setSelectedShot] = useState<any>(null)

  const listToString = (value: any) => (Array.isArray(value) ? value.join(', ') : '')
  const stringToList = (value: string) =>
    value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)

  useEffect(() => {
    params.then((p) => {
      setProjectId(p.projectId)
      setSequenceId(p.sequenceId)
      loadShots(p.projectId, p.sequenceId)
    })
  }, [params])

  async function loadShots(projId: string, seqId: string) {
    try {
      setIsLoading(true)
      const supabase = createClient()
      const sequenceIdNum = Number(seqId)

      const { data } = await supabase
        .from('shots')
        .select(
          `
          *,
          sequences(code, name),
          project:projects(id, code, name)
        `
        )
        .eq('project_id', projId)
        .eq('sequence_id', Number.isNaN(sequenceIdNum) ? seqId : sequenceIdNum)
        .order('code')

      const tableData = (data || []).map((shot) => ({
        ...shot,
        sequence_name: shot.sequences?.name || 'No Sequence',
        sequence_code: shot.sequences?.code || '-',
        project_label: shot.project ? shot.project.code || shot.project.name : '',
      }))

      setShots(tableData)
    } catch (error) {
      console.error('Error loading sequence shots:', error)
      setShots([])
    } finally {
      setIsLoading(false)
    }
  }

  async function handleCellUpdate(row: any, column: any, value: any) {
    const result = await updateShot(row.id, { [column.id]: value }, { revalidate: false })
    if (result.error) {
      throw new Error(result.error)
    }
    setShots((prev) =>
      prev.map((shot) => (shot.id === row.id ? { ...shot, [column.id]: value } : shot))
    )
  }

  function refreshShots() {
    if (!projectId || !sequenceId) return
    void loadShots(projectId, sequenceId)
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
    return deleteShot(String(selectedShot.id), projectId)
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
    {
      id: 'shot_notes',
      label: 'Shot Notes',
      type: 'text' as const,
      width: '220px',
      editable: true,
      editor: 'textarea' as const,
    },
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

  return (
    <>
      <CreateShotDialog
        open={showCreateDialog}
        onOpenChange={(open) => {
          setShowCreateDialog(open)
          if (!open) refreshShots()
        }}
        projectId={projectId}
        defaultSequenceId={sequenceId}
        lockSequence
      />

      <EditShotDialog
        open={showEditDialog}
        onOpenChange={(open) => {
          setShowEditDialog(open)
          if (!open) refreshShots()
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

      <div className="p-6">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center text-sm text-zinc-400">
            Loading shots...
          </div>
        ) : shots.length === 0 ? (
          <div className="rounded-md border border-zinc-800 bg-zinc-950/70 p-6">
            <h3 className="text-sm font-semibold text-zinc-100">Shots</h3>
            <p className="mt-2 text-sm text-zinc-400">No shots linked to this sequence yet.</p>
            <button
              onClick={() => setShowCreateDialog(true)}
              className="mt-4 rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-black transition hover:bg-amber-400"
            >
              Add Shot
            </button>
          </div>
        ) : (
          <EntityTable
            columns={columns}
            data={shots}
            entityType="shots_sequence"
            onAdd={() => setShowCreateDialog(true)}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onCellUpdate={handleCellUpdate}
          />
        )}
      </div>
    </>
  )
}
