import { createClient } from '@/lib/supabase/server'
import { getEntityHistory } from '@/lib/supabase/queries'
import { HistoryTable } from '@/components/apex/history-table'

export default async function ShotHistoryPage({
  params,
}: {
  params: Promise<{ projectId: string; shotId: string }>
}) {
  const { shotId } = await params
  const supabase = await createClient()

  let events: any[] = []
  try {
    events = await getEntityHistory(supabase, 'shot', shotId)
  } catch {
    // Graceful fallback
  }

  return (
    <div className="p-6">
      <h3 className="mb-4 text-sm font-semibold text-zinc-100">History</h3>
      <HistoryTable events={events} />
    </div>
  )
}
