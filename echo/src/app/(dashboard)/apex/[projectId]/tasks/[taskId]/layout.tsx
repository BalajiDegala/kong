import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TaskTabs } from '@/components/layout/task-tabs'

export default async function TaskLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ projectId: string; taskId: string }>
}) {
  const { projectId, taskId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: task } = await supabase
    .from('tasks')
    .select(
      `
      *,
      step:steps(id, name, code),
      project:projects(id, code, name)
    `
    )
    .eq('id', taskId)
    .eq('project_id', projectId)
    .single()

  if (!task) {
    redirect(`/apex/${projectId}/tasks`)
  }

  let entityLabel = '-'
  if (task.entity_type === 'asset' && task.entity_id) {
    const { data: asset } = await supabase
      .from('assets')
      .select('id, code, name')
      .eq('id', task.entity_id)
      .single()
    if (asset) {
      entityLabel = `${asset.code} ${asset.name ? `· ${asset.name}` : ''}`
    }
  }
  if (task.entity_type === 'shot' && task.entity_id) {
    const { data: shot } = await supabase
      .from('shots')
      .select('id, code, name')
      .eq('id', task.entity_id)
      .single()
    if (shot) {
      entityLabel = `${shot.code} ${shot.name ? `· ${shot.name}` : ''}`
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-zinc-800 bg-zinc-950 px-6 py-4">
        <div className="flex gap-6">
          <div className="h-24 w-36 rounded-md border border-zinc-800 bg-zinc-900">
            <div className="flex h-full w-full items-center justify-center text-xs text-zinc-500">
              Task
            </div>
          </div>

          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-xl font-semibold text-zinc-100">{task.name}</h3>
              <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-200">
                {task.status || 'pending'}
              </span>
            </div>
            <p className="mt-2 text-sm text-zinc-400">
              {task.description || 'No description'}
            </p>

            <div className="mt-4 grid gap-4 text-xs sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Entity</p>
                <p className="mt-1 text-zinc-100">{entityLabel}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Step</p>
                <p className="mt-1 text-zinc-100">{task.step?.name || '-'}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Priority</p>
                <p className="mt-1 text-zinc-100">{task.priority || '-'}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Due Date</p>
                <p className="mt-1 text-zinc-100">{task.due_date || '-'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <TaskTabs projectId={projectId} taskId={taskId} />

      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  )
}
