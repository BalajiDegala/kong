import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PulseFeedPage } from './pulse-feed-page'

export default async function PulsePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
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
    />
  )
}
