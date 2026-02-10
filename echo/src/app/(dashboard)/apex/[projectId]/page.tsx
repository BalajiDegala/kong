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
    archived: 'bg-zinc-600',
  }

  return (
    <div className="p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Project Info Widget */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <h3 className="mb-4 text-lg font-semibold text-zinc-100">Project Information</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-zinc-400">Project Code</p>
              <p className="font-mono text-zinc-100">{project.code}</p>
            </div>
            <div>
              <p className="text-sm text-zinc-400">Status</p>
              <div className="mt-1 flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${statusColors[project.status] || 'bg-zinc-500'}`} />
                <span className="capitalize text-zinc-100">{project.status.replace('_', ' ')}</span>
              </div>
            </div>
            {project.description && (
              <div className="sm:col-span-2">
                <p className="text-sm text-zinc-400">Description</p>
                <p className="text-zinc-100">{project.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
            <p className="text-sm text-zinc-400">Assets</p>
            <p className="mt-2 text-3xl font-bold text-zinc-100">{assetCount || 0}</p>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
            <p className="text-sm text-zinc-400">Sequences</p>
            <p className="mt-2 text-3xl font-bold text-zinc-100">{sequenceCount || 0}</p>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
            <p className="text-sm text-zinc-400">Shots</p>
            <p className="mt-2 text-3xl font-bold text-zinc-100">{shotCount || 0}</p>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
            <p className="text-sm text-zinc-400">Tasks</p>
            <p className="mt-2 text-3xl font-bold text-zinc-100">{taskCount || 0}</p>
          </div>
        </div>

        {/* Task Progress */}
        {taskCount && taskCount > 0 && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
            <h3 className="mb-4 text-lg font-semibold text-zinc-100">Task Progress</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-sm text-zinc-400">Pending</p>
                <p className="mt-1 text-2xl font-bold text-zinc-100">{tasksByStatus.pending || 0}</p>
              </div>
              <div>
                <p className="text-sm text-zinc-400">In Progress</p>
                <p className="mt-1 text-2xl font-bold text-green-500">{tasksByStatus.ip || 0}</p>
              </div>
              <div>
                <p className="text-sm text-zinc-400">Review</p>
                <p className="mt-1 text-2xl font-bold text-yellow-500">{tasksByStatus.review || 0}</p>
              </div>
              <div>
                <p className="text-sm text-zinc-400">Approved</p>
                <p className="mt-1 text-2xl font-bold text-blue-500">{tasksByStatus.approved || 0}</p>
              </div>
            </div>
          </div>
        )}

        {/* Placeholder Widgets */}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
            <h3 className="mb-4 text-lg font-semibold text-zinc-100">Recent Activity</h3>
            <p className="text-sm text-zinc-400">No recent activity</p>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
            <h3 className="mb-4 text-lg font-semibold text-zinc-100">Project Team</h3>
            <p className="text-sm text-zinc-400">No team members yet</p>
          </div>
        </div>
      </div>
    </div>
  )
}
