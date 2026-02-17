export type MyTasksBucket = 'active' | 'upcoming' | 'done'

const DONE_KEYWORDS = [
  'done',
  'complete',
  'completed',
  'approved',
  'final',
  'closed',
  'delivered',
  'published',
  'omit',
  'omitted',
]

const UPCOMING_KEYWORDS = [
  'pending',
  'todo',
  'to do',
  'not started',
  'ready',
  'waiting',
  'queued',
  'backlog',
  'on hold',
]

function normalizedStatusText(status: unknown): string {
  if (status === null || status === undefined) return ''
  return String(status)
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
}

function matchesKeyword(status: string, keywords: string[]): boolean {
  for (const keyword of keywords) {
    if (status.includes(keyword)) return true
  }
  return false
}

export function getMyTasksBucket(status: unknown): MyTasksBucket {
  const normalized = normalizedStatusText(status)
  if (!normalized) return 'active'

  if (matchesKeyword(normalized, DONE_KEYWORDS)) return 'done'
  if (matchesKeyword(normalized, UPCOMING_KEYWORDS)) return 'upcoming'

  return 'active'
}
