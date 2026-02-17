'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { listStatusNames } from '@/lib/status/options'
import { listTagNames } from '@/lib/tags/options'
import { EntityTable } from '@/components/table/entity-table'
import { CreatePublishedFileDialog } from '@/components/apex/create-published-file-dialog'
import { EditPublishedFileDialog } from '@/components/apex/edit-published-file-dialog'
import { DeleteConfirmDialog } from '@/components/apex/delete-confirm-dialog'
import { deletePublishedFile, updatePublishedFile } from '@/actions/published-files'

function asText(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value)
}

function parseListValue(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => asText(item).trim())
      .filter(Boolean)
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }

  return []
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b))
}

export default function SequencePublishesPage({
  params,
}: {
  params: Promise<{ projectId: string; sequenceId: string }>
}) {
  const [projectId, setProjectId] = useState('')
  const [sequenceId, setSequenceId] = useState('')
  const [publishes, setPublishes] = useState<any[]>([])
  const [statusNames, setStatusNames] = useState<string[]>([])
  const [tagNames, setTagNames] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedPublish, setSelectedPublish] = useState<any>(null)
  const listToString = (value: unknown) => parseListValue(value).join(', ')
  const stringToList = (value: string) => parseListValue(value)

  useEffect(() => {
    params.then((p) => {
      setProjectId(p.projectId)
      setSequenceId(p.sequenceId)
      loadPublishes(p.projectId, p.sequenceId)
    })
  }, [params])

  async function loadPublishes(projId: string, seqId: string) {
    try {
      setIsLoading(true)
      const supabase = createClient()
      const seqIdNum = Number(seqId)

      const [publishesResult, nextStatusNames, nextTagNames] = await Promise.all([
        supabase
          .from('published_files')
          .select(
            `
            *,
            task:tasks(id, name),
            version:versions(id, code),
            project:projects(id, code, name),
            published_by_profile:profiles!published_files_published_by_fkey(id, display_name, full_name)
          `
          )
          .eq('project_id', projId)
          .eq('entity_type', 'sequence')
          .eq('entity_id', Number.isNaN(seqIdNum) ? seqId : seqIdNum)
          .order('created_at', { ascending: false }),
        listStatusNames('published_file'),
        listTagNames(),
      ])

      const { data: publishesData, error } = publishesResult

      if (error) {
        console.error('Error loading sequence publishes:', error)
        setPublishes([])
        return
      }

      setStatusNames(uniqueSorted(nextStatusNames))
      setTagNames(uniqueSorted(nextTagNames))

      const normalized =
        publishesData?.map((publish) => ({
          ...publish,
          link: publish.link || publish.file_path || '',
          task_label: publish.task?.name || '',
          version_label: publish.version?.code || '',
          created_by_label:
            publish.published_by_profile?.display_name ||
            publish.published_by_profile?.full_name ||
            '',
          project_label: publish.project
            ? publish.project.code || publish.project.name
            : '',
        })) || []

      setPublishes(normalized)
    } catch (error) {
      console.error('Error loading sequence publishes:', error)
      setPublishes([])
      setStatusNames([])
      setTagNames([])
    } finally {
      setIsLoading(false)
    }
  }

  function handleDelete(publish: any) {
    setSelectedPublish(publish)
    setShowDeleteDialog(true)
  }

  function handleEdit(publish: any) {
    setSelectedPublish(publish)
    setShowEditDialog(true)
  }

  async function handleDeleteConfirm() {
    if (!selectedPublish) return { error: 'No published file selected' }
    return await deletePublishedFile(selectedPublish.id, projectId)
  }

  async function handleCellUpdate(row: any, column: any, value: any) {
    const result = await updatePublishedFile(row.id, { [column.id]: value }, { revalidate: false })
    if (result.error) {
      throw new Error(result.error)
    }
    setPublishes((prev) =>
      prev.map((publish) => {
        if (publish.id !== row.id) return publish
        const next = { ...publish, [column.id]: value }
        if (column.id === 'file_path') {
          next.link = value
        }
        return next
      })
    )
  }

  const statusOptions = useMemo(() => {
    const values = new Set<string>()
    for (const status of statusNames) {
      const normalized = status.trim()
      if (normalized) values.add(normalized)
    }
    for (const publish of publishes) {
      const normalized = asText(publish.status).trim()
      if (normalized) values.add(normalized)
    }
    return Array.from(values).map((value) => ({ value, label: value }))
  }, [publishes, statusNames])

  const tagOptions = useMemo(() => {
    const values = new Set<string>()
    for (const tag of tagNames) {
      const normalized = tag.trim()
      if (normalized) values.add(normalized)
    }
    for (const publish of publishes) {
      for (const tag of parseListValue(publish.tags)) {
        values.add(tag)
      }
    }
    return Array.from(values)
      .sort((a, b) => a.localeCompare(b))
      .map((value) => ({ value, label: value }))
  }, [publishes, tagNames])

  const columns = [
    { id: 'thumbnail_url', label: 'Thumbnail', type: 'thumbnail' as const, width: '80px' },
    { id: 'code', label: 'Published File Name', type: 'text' as const, width: '180px', editable: true, editor: 'text' as const },
    { id: 'file_type', label: 'Published File Type', type: 'text' as const, width: '160px', editable: true, editor: 'text' as const },
    {
      id: 'status',
      label: 'Status',
      type: 'status' as const,
      width: '90px',
      editable: true,
      editor: 'select' as const,
      options: statusOptions,
    },
    { id: 'description', label: 'Description', type: 'text' as const, editable: true, editor: 'textarea' as const },
    { id: 'link', label: 'Link', type: 'text' as const, width: '200px', editable: true, editor: 'text' as const },
    { id: 'task_label', label: 'Task', type: 'text' as const, width: '140px' },
    { id: 'version_label', label: 'Version', type: 'text' as const, width: '140px' },
    { id: 'file_path', label: 'Path', type: 'text' as const, width: '200px', editable: true, editor: 'text' as const },
    {
      id: 'downstream_published_files',
      label: 'Downstream Published Files',
      type: 'text' as const,
      width: '190px',
      editable: true,
      editor: 'text' as const,
      formatValue: listToString,
      parseValue: stringToList,
    },
    {
      id: 'upstream_published_files',
      label: 'Upstream Published Files',
      type: 'text' as const,
      width: '190px',
      editable: true,
      editor: 'text' as const,
      formatValue: listToString,
      parseValue: stringToList,
    },
    { id: 'created_by_label', label: 'Created by', type: 'text' as const, width: '140px' },
    { id: 'created_at', label: 'Date Created', type: 'datetime' as const, width: '140px' },
    {
      id: 'tags',
      label: 'Tags',
      type: 'text' as const,
      width: '120px',
      editable: true,
      editor: 'multiselect' as const,
      options: tagOptions,
      formatValue: listToString,
      parseValue: (value: unknown) => parseListValue(value),
    },
    { id: 'client_version', label: 'Client Version', type: 'text' as const, width: '140px', editable: true, editor: 'text' as const },
    { id: 'element', label: 'Element', type: 'text' as const, width: '120px', editable: true, editor: 'text' as const },
    { id: 'id', label: 'Id', type: 'text' as const, width: '80px' },
    { id: 'name', label: 'Name', type: 'text' as const, width: '140px', editable: true, editor: 'text' as const },
    { id: 'output', label: 'Output', type: 'text' as const, width: '140px', editable: true, editor: 'text' as const },
    { id: 'path_cache', label: 'Path Cache', type: 'text' as const, width: '160px', editable: true, editor: 'text' as const },
    { id: 'path_cache_storage', label: 'Path Cache Storage', type: 'text' as const, width: '180px', editable: true, editor: 'text' as const },
    { id: 'path_to_source', label: 'Path to Source', type: 'text' as const, width: '180px', editable: true, editor: 'text' as const },
    { id: 'project_label', label: 'Project', type: 'text' as const, width: '120px' },
    { id: 'snapshot_id', label: 'Snapshot ID', type: 'text' as const, width: '130px', editable: true, editor: 'text' as const },
    { id: 'snapshot_type', label: 'Snapshot Type', type: 'text' as const, width: '140px', editable: true, editor: 'text' as const },
    { id: 'submission_notes', label: 'Submission Notes', type: 'text' as const, width: '180px', editable: true, editor: 'textarea' as const },
    { id: 'target_name', label: 'Target Name', type: 'text' as const, width: '140px', editable: true, editor: 'text' as const },
    { id: 'version_number', label: 'Version Number', type: 'number' as const, width: '140px', editable: true, editor: 'text' as const },
  ]

  return (
    <>
      <CreatePublishedFileDialog
        open={showCreateDialog}
        onOpenChange={(open) => {
          setShowCreateDialog(open)
          if (!open) loadPublishes(projectId, sequenceId)
        }}
        projectId={projectId}
        defaultEntityType="sequence"
        defaultEntityId={sequenceId}
        lockEntity
      />

      <EditPublishedFileDialog
        open={showEditDialog}
        onOpenChange={(open) => {
          setShowEditDialog(open)
          if (!open) loadPublishes(projectId, sequenceId)
        }}
        projectId={projectId}
        publishedFile={selectedPublish}
      />

      <DeleteConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Published File"
        description="Are you sure you want to delete this published file?"
        itemName={selectedPublish?.code || ''}
        onConfirm={handleDeleteConfirm}
      />

      <div className="p-6">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center text-sm text-zinc-400">
            Loading publishes...
          </div>
        ) : publishes.length === 0 ? (
          <div className="rounded-md border border-zinc-800 bg-zinc-950/70 p-6">
            <h3 className="text-sm font-semibold text-zinc-100">Publishes</h3>
            <p className="mt-2 text-sm text-zinc-400">
              No published files linked to this sequence yet.
            </p>
            <button
              onClick={() => setShowCreateDialog(true)}
              className="mt-4 rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-black transition hover:bg-amber-400"
            >
              Add Published File
            </button>
          </div>
        ) : (
          <EntityTable
            columns={columns}
            data={publishes}
            entityType="publishes_sequence"
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
