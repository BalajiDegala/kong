'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface SequenceTabsProps {
  projectId: string
  sequenceId: string | number
}

const tabs = [
  { id: 'activity', label: 'Activity', href: '/activity' },
  { id: 'info', label: 'Sequence Info', href: '/info' },
  { id: 'tasks', label: 'Tasks', href: '/tasks' },
  { id: 'shots', label: 'Shots', href: '/shots' },
  { id: 'assets', label: 'Assets', href: '/assets' },
  { id: 'notes', label: 'Notes', href: '/notes' },
  { id: 'publishes', label: 'Publishes', href: '/publishes' },
  { id: 'history', label: 'History', href: '/history' },
]

export function SequenceTabs({ projectId, sequenceId }: SequenceTabsProps) {
  const pathname = usePathname()
  const basePath = `/apex/${projectId}/sequences/${sequenceId}`

  return (
    <div className="border-b border-border bg-background">
      <div className="flex items-center gap-1 px-6">
        {tabs.map((tab) => {
          const href = `${basePath}${tab.href}`
          const isActive = pathname === href || pathname.startsWith(`${href}/`)

          return (
            <Link
              key={tab.id}
              href={href}
              className={`
                px-3 py-2 text-sm font-medium transition border-b-2
                ${
                  isActive
                    ? 'text-primary border-primary'
                    : 'text-muted-foreground border-transparent hover:text-foreground/80 hover:border-border'
                }
              `}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
