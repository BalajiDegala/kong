'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { EntityTable } from '@/components/table/entity-table'
import { updateShot } from '@/actions/shots'

export default function SequenceShotsPage({
  params,
}: {
  params: Promise<{ projectId: string; sequenceId: string }>
}) {
  const [projectId, setProjectId] = useState('')
  const [sequenceId, setSequenceId] = useState('')
  const [shots, setShots] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

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
    { id: 'cc', label: 'Cc', type: 'text' as const, width: '120px', editable: true, editor: 'text' as const },
    { id: 'client_name', label: 'Client Name', type: 'text' as const, width: '160px', editable: true, editor: 'text' as const },
    { id: 'comp_note', label: 'Comp Note', type: 'text' as const, width: '160px', editable: true, editor: 'text' as const },
    { id: 'cut_order', label: 'Cut Order', type: 'text' as const, width: '120px', editable: true, editor: 'text' as const },
    { id: 'dd_client_name', label: 'DD Client Name', type: 'text' as const, width: '160px', editable: true, editor: 'text' as const },
    { id: 'dd_location', label: 'DD Location', type: 'text' as const, width: '140px', editable: true, editor: 'text' as const },
    { id: 'delivery_date', label: 'Delivery Date', type: 'text' as const, width: '140px', editable: true, editor: 'text' as const },
    { id: 'head_duration', label: 'Head Duration', type: 'number' as const, width: '120px', editable: true, editor: 'text' as const },
    { id: 'head_in', label: 'Head In', type: 'number' as const, width: '100px', editable: true, editor: 'text' as const },
    { id: 'id', label: 'Id', type: 'text' as const, width: '80px' },
    { id: 'next_review', label: 'Next Review', type: 'text' as const, width: '140px', editable: true, editor: 'text' as const },
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
    { id: 'plates', label: 'Plates', type: 'text' as const, width: '120px', editable: true, editor: 'text' as const },
    { id: 'project_label', label: 'Project', type: 'text' as const, width: '120px' },
    { id: 'seq_shot', label: 'Seq Shot', type: 'text' as const, width: '120px', editable: true, editor: 'text' as const },
    {
      id: 'shot_notes',
      label: 'Shot Notes',
      type: 'text' as const,
      width: '160px',
      editable: true,
      editor: 'text' as const,
      formatValue: listToString,
      parseValue: stringToList,
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
    { id: 'target_date', label: 'Target Date', type: 'text' as const, width: '140px', editable: true, editor: 'text' as const },
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
    <div className="p-6">
      {isLoading ? (
        <div className="flex h-40 items-center justify-center text-sm text-zinc-400">
          Loading shots...
        </div>
      ) : shots.length === 0 ? (
        <div className="rounded-md border border-zinc-800 bg-zinc-950/70 p-6">
          <h3 className="text-sm font-semibold text-zinc-100">Shots</h3>
          <p className="mt-2 text-sm text-zinc-400">No shots linked to this sequence yet.</p>
        </div>
      ) : (
        <EntityTable
          columns={columns}
          data={shots}
          entityType="shots"
          onCellUpdate={handleCellUpdate}
        />
      )}
    </div>
  )
}
