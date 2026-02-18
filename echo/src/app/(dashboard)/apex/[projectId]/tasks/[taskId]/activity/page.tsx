import { createClient } from '@/lib/supabase/server'
import { getEntityActivity } from '@/lib/supabase/queries'
import { ActivityFeed } from '@/components/apex/activity-feed'

export default async function TaskActivityPage({
  params,
}: {
  params: Promise<{ projectId: string; taskId: string }>
}) {
  const { taskId } = await params
  const supabase = await createClient()

  let events: any[] = []
  try {
    events = await getEntityActivity(supabase, 'task', taskId)
  } catch {
    // Graceful fallback
  }

  return (
    <div className="p-6">
      <h3 className="mb-4 text-sm font-semibold text-foreground">Activity</h3>
      <ActivityFeed events={events} />
    </div>
  )
}
