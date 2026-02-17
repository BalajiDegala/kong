import { createClient } from '@/lib/supabase/server'
import { getEntityActivity } from '@/lib/supabase/queries'
import { ActivityFeed } from '@/components/apex/activity-feed'

export default async function AssetActivityPage({
  params,
}: {
  params: Promise<{ projectId: string; assetId: string }>
}) {
  const { assetId } = await params
  const supabase = await createClient()

  let events: any[] = []
  try {
    events = await getEntityActivity(supabase, 'asset', assetId)
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
