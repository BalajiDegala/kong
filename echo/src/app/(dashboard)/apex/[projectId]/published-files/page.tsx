'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { listStatusNames } from '@/lib/status/options'
import { listTagNames } from '@/lib/tags/options'
import { EntityTable } from '@/components/table/entity-table'
import { ApexPageShell } from '@/components/apex/apex-page-shell'
import { ApexEmptyState } from '@/components/apex/apex-empty-state'
import { CreatePublishedFileDialog } from '@/components/apex/create-published-file-dialog'
import { EditPublishedFileDialog } from '@/components/apex/edit-published-file-dialog'
import { DeleteConfirmDialog } from '@/components/apex/delete-confirm-dialog'
import {
  createPublishedFile,
  deletePublishedFile,
  updatePublishedFile,
} from '@/actions/published-files'
import { Plus } from 'lucide-react'

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

function normalizePublishedEntityType(
  value: unknown
): 'shot' | 'sequence' | 'asset' | 'task' | 'version' | 'note' | 'project' | null {
  const normalized = asText(value).trim().toLowerCase()
  if (
    normalized === 'shot' ||
    normalized === 'sequence' ||
    normalized === 'asset' ||
    normalized === 'task' ||
    normalized === 'version' ||
    normalized === 'note' ||
    normalized === 'project'
  ) {
    return normalized
  }
  return null
}

export default function PublishedFilesPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const [projectId, setProjectId] = useState<string>('')
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
      loadPublishes(p.projectId)
    })
  }, [params])

  async function loadPublishes(projId: string) {
    try {
      setIsLoading(true)
      const supabase = createClient()

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
          .order('created_at', { ascending: false }),
        listStatusNames('published_file'),
        listTagNames(),
      ])

      const { data: publishesData, error } = publishesResult

      if (error) {
        console.error('Error loading published files:', error)
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
      console.error('Error loading published files:', error)
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

  async function handleBulkDelete(rows: any[]) {
    const failures: string[] = []

    for (const row of rows) {
      const rowId = asText(row?.id).trim()
      if (!rowId) continue
      const result = await deletePublishedFile(rowId, projectId)
      if (result?.error) {
        failures.push(`${asText(row?.code).trim() || rowId}: ${result.error}`)
      }
    }

    loadPublishes(projectId)

    if (failures.length > 0) {
      const preview = failures.slice(0, 3).join('; ')
      throw new Error(
        failures.length > 3 ? `${preview}; and ${failures.length - 3} more` : preview
      )
    }
  }

  async function handleCsvImport(rows: Record<string, unknown>[]) {
    const failed: Array<{ row: number; message: string }> = []
    let imported = 0

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index]
      const entityType = normalizePublishedEntityType(row.entity_type)
      const entityId = asText(row.entity_id).trim()
      const code = asText(row.code).trim() || asText(row.name).trim()

      if (!entityType || !entityId || !code) {
        failed.push({
          row: index + 2,
          message: 'entity_type, entity_id, and code are required.',
        })
        continue
      }

      try {
        const result = await createPublishedFile({
          ...(row as Record<string, unknown>),
          project_id: projectId,
          entity_type: entityType,
          entity_id: entityId,
          code,
          name: asText(row.name).trim() || undefined,
          status: asText(row.status).trim() || undefined,
          description: asText(row.description).trim() || undefined,
          link: asText(row.link).trim() || undefined,
          file_type: asText(row.file_type).trim() || undefined,
          file_path: asText(row.file_path).trim() || undefined,
          task_id: asText(row.task_id).trim() || undefined,
          version_id: asText(row.version_id).trim() || undefined,
          tags: parseListValue(row.tags),
          downstream_published_files: parseListValue(row.downstream_published_files),
          upstream_published_files: parseListValue(row.upstream_published_files),
        })

        if (result?.error) {
          throw new Error(result.error)
        }
        imported += 1
      } catch (error) {
        failed.push({
          row: index + 2,
          message:
            error instanceof Error
              ? error.message
              : 'Failed to import published file row.',
        })
      }
    }

    loadPublishes(projectId)
    return { imported, failed }
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

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-zinc-400">Loading published files...</p>
      </div>
    )
  }

  return (
    <>
      <CreatePublishedFileDialog
        open={showCreateDialog}
        onOpenChange={(open) => {
          setShowCreateDialog(open)
          if (!open) loadPublishes(projectId)
        }}
        projectId={projectId}
      />

      <EditPublishedFileDialog
        open={showEditDialog}
        onOpenChange={(open) => {
          setShowEditDialog(open)
          if (!open) loadPublishes(projectId)
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

      <ApexPageShell
        title="Published Files"
        action={
          <button
            onClick={() => setShowCreateDialog(true)}
            className="flex items-center gap-2 rounded-md bg-amber-500 px-3 py-2 text-sm font-medium text-black transition hover:bg-amber-400"
          >
            <Plus className="h-4 w-4" />
            Add Published File
          </button>
        }
      >
        {publishes.length === 0 ? (
          <ApexEmptyState
            icon={<Plus className="h-10 w-10" />}
            title="No published files yet"
            description="Create your first published file entry."
            action={
              <button
                onClick={() => setShowCreateDialog(true)}
                className="rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-black transition hover:bg-amber-400"
              >
                Create First Published File
              </button>
            }
          />
        ) : (
          <EntityTable
            columns={columns}
            data={publishes}
            entityType="published_files"
            csvExportFilename="apex-published-files"
            onCsvImport={handleCsvImport}
            onBulkDelete={handleBulkDelete}
            onAdd={() => setShowCreateDialog(true)}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onCellUpdate={handleCellUpdate}
          />
        )}
      </ApexPageShell>
    </>
  )
}
