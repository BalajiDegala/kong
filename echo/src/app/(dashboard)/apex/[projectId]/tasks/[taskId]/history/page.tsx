import { createClient } from '@/lib/supabase/server'
import { getEntityHistory } from '@/lib/supabase/queries'
import { HistoryTable } from '@/components/apex/history-table'

export default async function TaskHistoryPage({
  params,
}: {
  params: Promise<{ projectId: string; taskId: string }>
}) {
  const { taskId } = await params
  const supabase = await createClient()

  let events: any[] = []
  try {
    events = await getEntityHistory(supabase, 'task', taskId)
  } catch {
    // Graceful fallback
  }

  return (
    <div className="p-6">
      <h3 className="mb-4 text-sm font-semibold text-foreground">History</h3>
      <HistoryTable events={events} />
    </div>
  )
}
