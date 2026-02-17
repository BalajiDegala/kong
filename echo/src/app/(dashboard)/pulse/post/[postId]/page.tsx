import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PostDetailPage } from './post-detail-page'

export default async function PostPage({
  params,
}: {
  params: Promise<{ postId: string }>
}) {
  const { postId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Fetch post with media and reactions
  const { data: post, error } = await supabase
    .from('posts')
    .select(`
      *,
      project:projects(id, name, code),
      post_media(*),
      post_reactions(reaction_type, user_id)
    `)
    .eq('id', postId)
    .single()

  if (error || !post) {
    redirect('/pulse')
  }

  // Resolve author profile separately
  let author = null
  if (post.author_id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .eq('id', post.author_id)
      .single()
    author = profile
  }

  // Fetch entity associations for breadcrumbs
  const [projectsData, sequencesData, shotsData, tasksData, usersData] = await Promise.all([
    supabase
      .from('post_projects')
      .select('project:projects(id, name, code)')
      .eq('post_id', postId),
    supabase
      .from('post_sequences')
      .select('sequence:sequences(id, name)')
      .eq('post_id', postId),
    supabase
      .from('post_shots')
      .select('shot:shots(id, name)')
      .eq('post_id', postId),
    supabase
      .from('post_tasks')
      .select('task:tasks(id, name)')
      .eq('post_id', postId),
    supabase
      .from('post_users')
      .select('user_id')
      .eq('post_id', postId),
  ])

  const entities = {
    projects: projectsData.data?.map((p: any) => p.project).filter(Boolean) || [],
    sequences: sequencesData.data?.map((s: any) => s.sequence).filter(Boolean) || [],
    shots: shotsData.data?.map((s: any) => s.shot).filter(Boolean) || [],
    tasks: tasksData.data?.map((t: any) => t.task).filter(Boolean) || [],
    users: usersData.data?.map((u: any) => u.user_id).filter(Boolean) || [],
  }

  return (
    <PostDetailPage
      post={{ ...post, author }}
      entities={entities}
      currentUserId={user.id}
    />
  )
}
