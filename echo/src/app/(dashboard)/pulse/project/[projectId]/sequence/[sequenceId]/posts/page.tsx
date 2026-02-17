import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SequencePostsPage } from './sequence-posts-page'

export default async function SequencePostsRoute({
  params,
}: {
  params: Promise<{ projectId: string; sequenceId: string }>
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { projectId, sequenceId } = await params

  // Fetch project and sequence details
  const [projectResult, sequenceResult] = await Promise.all([
    supabase
      .from('projects')
      .select('id, name, code')
      .eq('id', projectId)
      .single(),
    supabase
      .from('sequences')
      .select('id, name')
      .eq('id', sequenceId)
      .eq('project_id', projectId)
      .single(),
  ])

  if (!projectResult.data || !sequenceResult.data) {
    redirect('/pulse')
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .eq('id', user.id)
    .single()

  return (
    <SequencePostsPage
      projectId={projectId}
      sequenceId={sequenceId}
      project={projectResult.data}
      sequence={sequenceResult.data}
      currentUserId={user.id}
      profile={profile}
    />
  )
}
