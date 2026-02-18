'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Star } from 'lucide-react'

interface ProjectTabsProps {
  projectId: string
  projectName: string
}

const tabs = [
  { id: 'overview', label: 'Project Details', href: '' },
  { id: 'assets', label: 'Assets', href: '/assets' },
  { id: 'sequences', label: 'Sequences', href: '/sequences' },
  { id: 'shots', label: 'Shots', href: '/shots' },
  { id: 'tasks', label: 'Tasks', href: '/tasks' },
  { id: 'notes', label: 'Notes', href: '/notes' },
  { id: 'versions', label: 'Versions', href: '/versions' },
  { id: 'media', label: 'Media', href: '/media' },
  { id: 'published-files', label: 'Published Files', href: '/published-files' },
  { id: 'playlists', label: 'Playlists', href: '/playlists' },
  { id: 'event-log', label: 'Event Log', href: '/event-log' },
]

export function ProjectTabs({ projectId, projectName }: ProjectTabsProps) {
  const pathname = usePathname()
  const basePath = `/apex/${projectId}`

  return (
    <div className="border-b border-border bg-background">
      {/* Project Name */}
      <div className="border-b border-border px-6 py-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-foreground">{projectName}</h2>
          <button className="text-muted-foreground hover:text-primary transition">
            <Star className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Horizontal Tabs */}
      <div className="flex items-center gap-1 px-6">
        {tabs.map((tab) => {
          const href = `${basePath}${tab.href}`
          const isActive = pathname === href || (tab.href && pathname.startsWith(href))

          return (
            <Link
              key={tab.id}
              href={href}
              className={`
                px-4 py-3 text-sm font-medium transition border-b-2
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
