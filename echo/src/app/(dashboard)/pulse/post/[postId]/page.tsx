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

  // Fetch post without FK join to profiles (author_id FK points to auth.users, not profiles)
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

  return (
    <PostDetailPage
      post={{ ...post, author }}
      currentUserId={user.id}
    />
  )
}
