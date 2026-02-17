import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProjectPulsePage } from './project-pulse-page'

export default async function ApexProjectPulsePage({
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
    .single()

  if (!project) {
    redirect('/apex')
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .eq('id', user.id)
    .single()

  return (
    <ProjectPulsePage
      projectId={projectId}
      project={project}
      currentUserId={user.id}
      profile={profile}
    />
  )
}
