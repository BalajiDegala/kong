'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface ShotTabsProps {
  projectId: string
  shotId: string | number
}

const tabs = [
  { id: 'activity', label: 'Activity', href: '/activity' },
  { id: 'info', label: 'Shot Info', href: '/info' },
  { id: 'tasks', label: 'Tasks', href: '/tasks' },
  { id: 'notes', label: 'Notes', href: '/notes' },
  { id: 'versions', label: 'Versions', href: '/versions' },
  { id: 'publishes', label: 'Publishes', href: '/publishes' },
  { id: 'assets', label: 'Assets', href: '/assets' },
  { id: 'history', label: 'History', href: '/history' },
]

export function ShotTabs({ projectId, shotId }: ShotTabsProps) {
  const pathname = usePathname()
  const basePath = `/apex/${projectId}/shots/${shotId}`

  return (
    <div className="border-b border-zinc-800 bg-zinc-950">
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
                    ? 'text-amber-400 border-amber-400'
                    : 'text-zinc-400 border-transparent hover:text-zinc-200 hover:border-zinc-700'
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
