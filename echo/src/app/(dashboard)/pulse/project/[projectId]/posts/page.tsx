import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProjectPostsPage } from './project-posts-page'

export default async function ProjectPostsRoute({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { projectId } = await params

  // Fetch project details
  const { data: project } = await supabase
    .from('projects')
    .select('id, name, code')
    .eq('id', projectId)
    .is('deleted_at', null)
    .single()

  if (!project) {
    redirect('/pulse')
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .eq('id', user.id)
    .single()

  return (
    <ProjectPostsPage
      projectId={projectId}
      project={project}
      currentUserId={user.id}
      profile={profile}
    />
  )
}
