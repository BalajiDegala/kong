import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { GlobalNav } from '@/components/layout/global-nav'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-zinc-950">
      {/* Global Navigation */}
      <GlobalNav user={user} profile={profile} />

      {/* Page Content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
