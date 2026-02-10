import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function MyTasksPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  return (
    <div className="p-6">
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-6 text-3xl font-bold text-zinc-100">My Tasks</h1>
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border-2 border-dashed border-zinc-800 p-12 text-center">
          <h3 className="mb-2 text-lg font-semibold text-zinc-100">My Tasks Coming Soon</h3>
          <p className="text-sm text-zinc-400">
            Your assigned tasks across all projects will appear here.
          </p>
        </div>
      </div>
    </div>
  )
}
