'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { EntityTable } from '@/components/table/entity-table'
import { updateShot } from '@/actions/shots'
import { CreateShotDialog } from '@/components/apex/create-shot-dialog'

export default function AssetShotsPage({
  params,
}: {
  params: Promise<{ projectId: string; assetId: string }>
}) {
  const [projectId, setProjectId] = useState('')
  const [assetId, setAssetId] = useState('')
  const [shots, setShots] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [defaultSequenceId, setDefaultSequenceId] = useState<string | null>(null)
  const listToString = (value: any) => (Array.isArray(value) ? value.join(', ') : '')
  const stringToList = (value: string) =>
    value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)

  useEffect(() => {
    params.then((p) => {
      setProjectId(p.projectId)
      setAssetId(p.assetId)
      loadShots(p.projectId, p.assetId)
    })
  }, [params])

  async function loadShots(projId: string, aId: string) {
    try {
      setIsLoading(true)
      const supabase = createClient()
      const assetIdNum = Number(aId)
      const assetIdFilter = Number.isNaN(assetIdNum) ? aId : assetIdNum

      const { data: asset } = await supabase
        .from('assets')
        .select('id, code, sequence_id, shot_id, shots')
        .eq('id', assetIdFilter)
        .maybeSingle()

      if (!asset) {
        setDefaultSequenceId(null)
        setShots([])
        return
      }

      setDefaultSequenceId(
        asset.sequence_id !== null && asset.sequence_id !== undefined
          ? String(asset.sequence_id)
          : null
      )

      const results: any[] = []
      const seen = new Set<number>()

      const baseSelect = `
        *,
        sequences(code, name),
        project:projects(id, code, name)
      `

      if (asset.shot_id) {
        const { data } = await supabase
          .from('shots')
          .select(baseSelect)
          .eq('project_id', projId)
          .in('id', [asset.shot_id])
        results.push(...(data || []))
      }

      if (Array.isArray(asset.shots) && asset.shots.length > 0) {
        const { data } = await supabase
          .from('shots')
          .select(baseSelect)
          .eq('project_id', projId)
          .in('code', asset.shots)
        results.push(...(data || []))
      }

      if (asset.code) {
        const { data } = await supabase
          .from('shots')
          .select(baseSelect)
          .eq('project_id', projId)
          .contains('assets', [asset.code])
        results.push(...(data || []))
      }

      const merged = results.filter((shot) => {
        if (!shot?.id || seen.has(shot.id)) return false
        seen.add(shot.id)
        return true
      })

      const tableData = merged.map((shot) => ({
        ...shot,
        sequence_name: shot.sequences?.name || 'No Sequence',
        sequence_code: shot.sequences?.code || '-',
        project_label: shot.project ? shot.project.code || shot.project.name : '',
      }))

      setShots(tableData)
    } catch (error) {
      console.error('Error loading asset shots:', error)
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
          if (!open) loadShots(projectId, assetId)
        }}
        projectId={projectId}
        defaultSequenceId={defaultSequenceId ?? undefined}
        lockSequence={Boolean(defaultSequenceId)}
      />

      <div className="p-6">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center text-sm text-zinc-400">
            Loading shots...
          </div>
        ) : shots.length === 0 ? (
          <div className="rounded-md border border-zinc-800 bg-zinc-950/70 p-6">
            <h3 className="text-sm font-semibold text-zinc-100">Shots</h3>
            <p className="mt-2 text-sm text-zinc-400">No shots linked to this asset yet.</p>
            <button
              onClick={() => setShowCreateDialog(true)}
              className="mt-4 rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-black transition hover:bg-amber-400"
            >
              Add Shot
            </button>
          </div>
        ) : (
          <EntityTable
            columns={columns as any}
            data={shots}
            entityType="shots_asset"
            onAdd={() => setShowCreateDialog(true)}
            onCellUpdate={handleCellUpdate}
          />
        )}
      </div>
    </>
  )
}
