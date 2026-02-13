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
  { id: 'published-files', label: 'Published Files', href: '/published-files' },
  { id: 'playlists', label: 'Playlists', href: '/playlists' },
  { id: 'pulse', label: 'Pulse', href: '/pulse' },
]

export function ProjectTabs({ projectId, projectName }: ProjectTabsProps) {
  const pathname = usePathname()
  const basePath = `/apex/${projectId}`

  return (
    <div className="border-b border-zinc-800 bg-zinc-950">
      {/* Project Name */}
      <div className="border-b border-zinc-800 px-6 py-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-zinc-100">{projectName}</h2>
          <button className="text-zinc-500 hover:text-amber-400 transition">
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
