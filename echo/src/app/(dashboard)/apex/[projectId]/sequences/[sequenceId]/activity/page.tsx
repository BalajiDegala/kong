import { createClient } from '@/lib/supabase/server'
import { getEntityActivity } from '@/lib/supabase/queries'
import { ActivityFeed } from '@/components/apex/activity-feed'

export default async function SequenceActivityPage({
  params,
}: {
  params: Promise<{ projectId: string; sequenceId: string }>
}) {
  const { sequenceId } = await params
  const supabase = await createClient()

  let events: any[] = []
  try {
    events = await getEntityActivity(supabase, 'sequence', sequenceId)
  } catch {
    // Graceful fallback
  }

  return (
    <div className="p-6">
      <h3 className="mb-4 text-sm font-semibold text-zinc-100">Activity</h3>
      <ActivityFeed events={events} />
    </div>
  )
}
