import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Get project data
  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single()

  if (!project) {
    redirect('/apex')
  }

  // Get project stats
  const { count: assetCount } = await supabase
    .from('assets')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', projectId)

  const { count: shotCount } = await supabase
    .from('shots')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', projectId)

  const { count: taskCount } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', projectId)

  const { count: sequenceCount } = await supabase
    .from('sequences')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', projectId)

  // Get task stats by status
  const { data: taskStats } = await supabase
    .from('tasks')
    .select('status')
    .eq('project_id', projectId)

  const tasksByStatus = (taskStats || []).reduce((acc: any, task) => {
    acc[task.status] = (acc[task.status] || 0) + 1
    return acc
  }, {})

  const statusColors: Record<string, string> = {
    active: 'bg-green-500',
    on_hold: 'bg-yellow-500',
    completed: 'bg-blue-500',
    archived: 'bg-muted-foreground/40',
  }

  return (
    <div className="p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Project Info Widget */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold text-foreground">Project Information</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Project Code</p>
              <p className="font-mono text-foreground">{project.code}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <div className="mt-1 flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${statusColors[project.status] || 'bg-muted-foreground/30'}`} />
                <span className="capitalize text-foreground">{project.status.replace('_', ' ')}</span>
              </div>
            </div>
            {project.description && (
              <div className="sm:col-span-2">
                <p className="text-sm text-muted-foreground">Description</p>
                <p className="text-foreground">{project.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-border bg-card p-6">
            <p className="text-sm text-muted-foreground">Assets</p>
            <p className="mt-2 text-3xl font-bold text-foreground">{assetCount || 0}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-6">
            <p className="text-sm text-muted-foreground">Sequences</p>
            <p className="mt-2 text-3xl font-bold text-foreground">{sequenceCount || 0}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-6">
            <p className="text-sm text-muted-foreground">Shots</p>
            <p className="mt-2 text-3xl font-bold text-foreground">{shotCount || 0}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-6">
            <p className="text-sm text-muted-foreground">Tasks</p>
            <p className="mt-2 text-3xl font-bold text-foreground">{taskCount || 0}</p>
          </div>
        </div>

        {/* Task Progress */}
        {taskCount && taskCount > 0 && (
          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="mb-4 text-lg font-semibold text-foreground">Task Progress</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="mt-1 text-2xl font-bold text-foreground">{tasksByStatus.pending || 0}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="mt-1 text-2xl font-bold text-green-500">{tasksByStatus.ip || 0}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Review</p>
                <p className="mt-1 text-2xl font-bold text-yellow-500">{tasksByStatus.review || 0}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Approved</p>
                <p className="mt-1 text-2xl font-bold text-blue-500">{tasksByStatus.approved || 0}</p>
              </div>
            </div>
          </div>
        )}

        {/* Placeholder Widgets */}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="mb-4 text-lg font-semibold text-foreground">Recent Activity</h3>
            <p className="text-sm text-muted-foreground">No recent activity</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="mb-4 text-lg font-semibold text-foreground">Project Team</h3>
            <p className="text-sm text-muted-foreground">No team members yet</p>
          </div>
        </div>
      </div>
    </div>
  )
}
