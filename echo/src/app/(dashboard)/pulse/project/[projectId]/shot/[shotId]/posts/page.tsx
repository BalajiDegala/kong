import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ShotPostsPage } from './shot-posts-page'

export default async function ShotPostsRoute({
  params,
}: {
  params: Promise<{ projectId: string; shotId: string }>
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { projectId, shotId } = await params

  // Fetch project, sequence, and shot details
  const { data: shot } = await supabase
    .from('shots')
    .select('id, name, sequence_id')
    .eq('id', shotId)
    .single()

  if (!shot) {
    redirect('/pulse')
  }

  const [projectResult, sequenceResult] = await Promise.all([
    supabase
      .from('projects')
      .select('id, name, code')
      .eq('id', projectId)
      .single(),
    shot.sequence_id
      ? supabase
          .from('sequences')
          .select('id, name')
          .eq('id', shot.sequence_id)
          .single()
      : Promise.resolve({ data: null }),
  ])

  if (!projectResult.data) {
    redirect('/pulse')
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .eq('id', user.id)
    .single()

  return (
    <ShotPostsPage
      projectId={projectId}
      shotId={shotId}
      project={projectResult.data}
      sequence={sequenceResult.data}
      shot={shot}
      currentUserId={user.id}
      profile={profile}
    />
  )
}
