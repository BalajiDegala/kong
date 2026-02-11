'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { EntityTable } from '@/components/table/entity-table'
import { ApexPageShell } from '@/components/apex/apex-page-shell'
import { ApexEmptyState } from '@/components/apex/apex-empty-state'
import { CreatePublishedFileDialog } from '@/components/apex/create-published-file-dialog'
import { DeleteConfirmDialog } from '@/components/apex/delete-confirm-dialog'
import { deletePublishedFile, updatePublishedFile } from '@/actions/published-files'
import { Plus } from 'lucide-react'

export default function PublishedFilesPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const [projectId, setProjectId] = useState<string>('')
  const [publishes, setPublishes] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedPublish, setSelectedPublish] = useState<any>(null)
  const listToString = (value: any) => (Array.isArray(value) ? value.join(', ') : '')
  const stringToList = (value: string) =>
    value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)

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

      const { data: publishesData, error } = await supabase
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
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading published files:', error)
        setPublishes([])
        return
      }

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
    } finally {
      setIsLoading(false)
    }
  }

  function handleDelete(publish: any) {
    setSelectedPublish(publish)
    setShowDeleteDialog(true)
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

  const columns = [
    { id: 'thumbnail_url', label: 'Thumbnail', type: 'thumbnail' as const, width: '80px' },
    { id: 'code', label: 'Published File Name', type: 'text' as const, width: '180px', editable: true, editor: 'text' as const },
    { id: 'file_type', label: 'Published File Type', type: 'text' as const, width: '160px', editable: true, editor: 'text' as const },
    { id: 'status', label: 'Status', type: 'status' as const, width: '90px', editable: true, editor: 'text' as const },
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
      editor: 'text' as const,
      formatValue: listToString,
      parseValue: stringToList,
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
            onAdd={() => setShowCreateDialog(true)}
            onDelete={handleDelete}
            onCellUpdate={handleCellUpdate}
          />
        )}
      </ApexPageShell>
    </>
  )
}
