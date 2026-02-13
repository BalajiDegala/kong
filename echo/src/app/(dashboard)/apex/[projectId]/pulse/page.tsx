import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PulseFeedPage } from '@/app/(dashboard)/pulse/pulse-feed-page'

export default async function ProjectPulsePage({
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

  const { data: project } = await supabase
    .from('projects')
    .select('id, name')
    .eq('id', projectId)
    .single()

  if (!project) {
    redirect('/apex')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .eq('id', user.id)
    .single()

  return (
    <PulseFeedPage
      currentUserId={user.id}
      profile={profile}
      projectId={project.id}
      projectName={project.name}
    />
  )
}
