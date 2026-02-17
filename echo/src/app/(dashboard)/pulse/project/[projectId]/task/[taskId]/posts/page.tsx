import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TaskPostsPage } from './task-posts-page'

export default async function TaskPostsRoute({
  params,
}: {
  params: Promise<{ projectId: string; taskId: string }>
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { projectId, taskId } = await params

  // Fetch task details with entity context
  const { data: task } = await supabase
    .from('tasks')
    .select('id, name, entity_type, entity_id')
    .eq('id', taskId)
    .single()

  if (!task) {
    redirect('/pulse')
  }

  // Fetch project
  const { data: project } = await supabase
    .from('projects')
    .select('id, name, code')
    .eq('id', projectId)
    .single()

  if (!project) {
    redirect('/pulse')
  }

  // Fetch entity details based on task's entity_type
  let entityDetails: any = null
  if (task.entity_type === 'shot' && task.entity_id) {
    const { data: shot } = await supabase
      .from('shots')
      .select('id, name, sequence_id')
      .eq('id', task.entity_id)
      .single()

    if (shot && shot.sequence_id) {
      const { data: sequence } = await supabase
        .from('sequences')
        .select('id, name')
        .eq('id', shot.sequence_id)
        .single()

      entityDetails = { shot, sequence }
    } else {
      entityDetails = { shot }
    }
  } else if (task.entity_type === 'asset' && task.entity_id) {
    const { data: asset } = await supabase
      .from('assets')
      .select('id, name')
      .eq('id', task.entity_id)
      .single()

    entityDetails = { asset }
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .eq('id', user.id)
    .single()

  return (
    <TaskPostsPage
      projectId={projectId}
      taskId={taskId}
      project={project}
      task={task}
      entityDetails={entityDetails}
      currentUserId={user.id}
      profile={profile}
    />
  )
}
