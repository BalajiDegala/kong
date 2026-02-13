'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getUserProjects } from '@/lib/supabase/queries'
import { EntityTable } from '@/components/table/entity-table'
import { CreateProjectDialog } from '@/components/apex/create-project-dialog'
import { EditProjectDialog } from '@/components/apex/edit-project-dialog'
import { DeleteConfirmDialog } from '@/components/apex/delete-confirm-dialog'
import { deleteProject, updateProject } from '@/actions/projects'
import type { TableColumn } from '@/components/table/types'
import { listTagNames, parseTagsValue } from '@/lib/tags/options'
import { listStatusNames } from '@/lib/status/options'
import { Plus } from 'lucide-react'

export default function ApexPage() {
  const [projects, setProjects] = useState<any[]>([])
  const [availableTags, setAvailableTags] = useState<string[]>([])
  const [availableStatuses, setAvailableStatuses] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedProject, setSelectedProject] = useState<any>(null)

  useEffect(() => {
    void loadProjects()
    void loadTagOptions()
    void loadStatusOptions()
  }, [])

  const tagOptions = useMemo(
    () =>
      Array.from(
        new Set([
          ...availableTags,
          ...projects.flatMap((project) => parseTagsValue(project?.tags)),
        ])
      ).sort((a, b) => a.localeCompare(b)),
    [availableTags, projects]
  )
  const statusOptions = useMemo(
    () =>
      Array.from(
        new Set([
          ...availableStatuses,
          ...projects
            .map((project) => String(project?.status ?? '').trim())
            .filter(Boolean),
        ])
      ),
    [availableStatuses, projects]
  )

  async function loadProjects() {
    try {
      setIsLoading(true)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) return

      const projectData = await getUserProjects(supabase, user.id)
      setProjects(projectData)
    } catch (error) {
      console.error('Error fetching projects:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function loadTagOptions() {
    try {
      setAvailableTags(await listTagNames())
    } catch (error) {
      console.error('Error fetching tags:', error)
      setAvailableTags([])
    }
  }

  async function loadStatusOptions() {
    try {
      setAvailableStatuses(await listStatusNames('project'))
    } catch (error) {
      console.error('Error fetching status options:', error)
      setAvailableStatuses([])
    }
  }

  function handleEdit(project: any) {
    setSelectedProject(project)
    setShowEditDialog(true)
  }

  function handleDelete(project: any) {
    setSelectedProject(project)
    setShowDeleteDialog(true)
  }

  async function handleDeleteConfirm() {
    if (!selectedProject) return { error: 'No project selected' }
    return await deleteProject(selectedProject.id)
  }

  async function handleCellUpdate(row: any, column: TableColumn, value: any) {
    const payload: Record<string, any> = {}

    if (column.id === 'name') {
      payload.name = String(value ?? '').trim()
      if (!payload.name) {
        throw new Error('Project name is required')
      }
    } else if (column.id === 'code') {
      payload.code = String(value ?? '').trim()
      if (!payload.code) {
        throw new Error('Project code is required')
      }
    } else if (column.id === 'status') {
      payload.status = String(value ?? '').trim() || 'active'
    } else if (column.id === 'description') {
      payload.description = String(value ?? '')
    } else if (column.id === 'tags') {
      payload.tags = parseTagsValue(value)
    } else {
      return
    }

    const result = await updateProject(String(row.id), payload)
    if (result.error) {
      throw new Error(result.error)
    }

    await loadProjects()
  }

  // Prepare columns for table view
  const columns = [
    { id: 'thumbnail_url', label: 'Thumbnail', type: 'thumbnail' as const, width: '90px' },
    {
      id: 'name',
      label: 'Project Name',
      type: 'link' as const,
      width: '160px',
      editable: true,
      editor: 'text' as const,
      linkHref: (row: any) => `/apex/${row.id}`,
    },
    {
      id: 'code',
      label: 'Code',
      type: 'text' as const,
      width: '120px',
      editable: true,
      editor: 'text' as const,
    },
    {
      id: 'status',
      label: 'Status',
      type: 'status' as const,
      width: '90px',
      editable: true,
      editor: 'select' as const,
      options: [
        ...statusOptions.map((status) => ({ value: status, label: status })),
      ],
    },
    {
      id: 'description',
      label: 'Description',
      type: 'text' as const,
      width: '220px',
      editable: true,
      editor: 'textarea' as const,
    },
    { id: 'project_type', label: 'Type', type: 'text' as const, width: '120px' },
    {
      id: 'tags',
      label: 'Tags',
      type: 'text' as const,
      width: '220px',
      editable: true,
      editor: 'multiselect' as const,
      options: tagOptions.map((tag) => ({ value: tag, label: tag })),
      formatValue: (value: unknown) => parseTagsValue(value).join(', '),
      parseValue: (value: unknown) => parseTagsValue(value),
    },
    { id: 'created_at', label: 'Date Created', type: 'datetime' as const, width: '180px' },
    { id: 'updated_at', label: 'Date Updated', type: 'datetime' as const, width: '180px' },
    { id: 'archived', label: 'Archived', type: 'boolean' as const, width: '90px' },
  ]

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-zinc-400">Loading projects...</p>
      </div>
    )
  }

  return (
    <>
      <CreateProjectDialog
        open={showCreateDialog}
        onOpenChange={(open) => {
          setShowCreateDialog(open)
          if (!open) {
            void loadProjects()
            void loadTagOptions()
            void loadStatusOptions()
          }
        }}
      />

      <EditProjectDialog
        open={showEditDialog}
        onOpenChange={(open) => {
          setShowEditDialog(open)
          if (!open) {
            void loadProjects()
            void loadTagOptions()
            void loadStatusOptions()
          }
        }}
        project={selectedProject}
      />

      <DeleteConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Project"
        description="Are you sure you want to delete this project? This will also delete all associated assets, sequences, shots, and tasks."
        itemName={selectedProject?.name || ''}
        onConfirm={handleDeleteConfirm}
        redirectTo="/apex"
      />

      <div className="flex h-full flex-col">
        {/* Page Header */}
        <div className="border-b border-zinc-800 bg-zinc-950 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-zinc-100">Projects</h1>
              <p className="mt-1 text-sm text-zinc-400">
                Manage your production projects and workflows
              </p>
            </div>
            <button
              onClick={() => setShowCreateDialog(true)}
              className="flex items-center gap-2 rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-black transition hover:bg-amber-400"
            >
              <Plus className="h-4 w-4" />
              New Project
            </button>
          </div>
        </div>

        {/* Empty State or Table */}
        {projects.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="flex max-w-md flex-col items-center justify-center rounded-lg border-2 border-dashed border-zinc-800 p-12 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800">
              <Plus className="h-8 w-8 text-zinc-500" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-zinc-100">
              No projects yet
            </h3>
            <p className="mb-6 text-sm text-zinc-400">
              Get started by creating your first project. Projects help you organize assets, shots, and tasks for your production.
            </p>
            <button
              onClick={() => setShowCreateDialog(true)}
              className="rounded-lg bg-amber-500 px-6 py-2 text-sm font-medium text-black transition hover:bg-amber-400"
            >
              Create Your First Project
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <EntityTable
            columns={columns}
            data={projects}
            entityType="projects"
            onAdd={() => setShowCreateDialog(true)}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onCellUpdate={handleCellUpdate}
          />
        </div>
      )}
      </div>
    </>
  )
}
