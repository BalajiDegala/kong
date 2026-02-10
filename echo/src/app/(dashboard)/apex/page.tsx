'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getUserProjects } from '@/lib/supabase/queries'
import { EntityTable } from '@/components/table/entity-table'
import { CreateProjectDialog } from '@/components/apex/create-project-dialog'
import { EditProjectDialog } from '@/components/apex/edit-project-dialog'
import { DeleteConfirmDialog } from '@/components/apex/delete-confirm-dialog'
import { deleteProject } from '@/actions/projects'
import { Plus } from 'lucide-react'

export default function ApexPage() {
  const [projects, setProjects] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedProject, setSelectedProject] = useState<any>(null)

  useEffect(() => {
    loadProjects()
  }, [])

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

  // Prepare columns for table view
  const columns = [
    { id: 'thumbnail_url', label: 'Thumbnail', type: 'thumbnail' as const, width: '90px' },
    { id: 'name', label: 'Project Name', type: 'link' as const, width: '160px' },
    { id: 'code', label: 'Code', type: 'text' as const, width: '120px' },
    { id: 'status', label: 'Status', type: 'status' as const, width: '90px' },
    { id: 'description', label: 'Description', type: 'text' as const, width: '220px' },
    { id: 'project_type', label: 'Type', type: 'text' as const, width: '120px' },
    { id: 'updated_at', label: 'Date Updated', type: 'text' as const, width: '180px' },
    { id: 'archived', label: 'Archived', type: 'text' as const, width: '90px' },
    { id: 'updated_by', label: 'Updated By', type: 'text' as const, width: '140px' },
    { id: 'tags', label: 'Tags', type: 'text' as const, width: '160px' },
    { id: 'billboard', label: 'Billboard', type: 'text' as const, width: '140px' },
    { id: 'duration', label: 'Duration', type: 'text' as const, width: '100px' },
    { id: 'end_date', label: 'End Date', type: 'text' as const, width: '120px' },
    { id: 'favorite', label: 'Favorite', type: 'text' as const, width: '90px' },
    { id: 'sg_id', label: 'Id', type: 'text' as const, width: '90px' },
    { id: 'tank_name', label: 'Tank Name', type: 'text' as const, width: '140px' },
    { id: 'task_template', label: 'Task Template', type: 'text' as const, width: '160px' },
    { id: 'users', label: 'Users', type: 'text' as const, width: '160px' },
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
          if (!open) loadProjects()
        }}
      />

      <EditProjectDialog
        open={showEditDialog}
        onOpenChange={(open) => {
          setShowEditDialog(open)
          if (!open) loadProjects()
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
            onRowClick={(project) => {
              window.location.href = `/apex/${project.id}`
            }}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </div>
      )}
      </div>
    </>
  )
}
