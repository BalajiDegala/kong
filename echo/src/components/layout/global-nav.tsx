'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ChevronDown, Plus, Search } from 'lucide-react'
import { UserMenu } from './user-menu'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { getUnreadNotificationCount } from '@/actions/notifications'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface GlobalNavProps {
  user: User
  profile: {
    display_name?: string | null
    role?: string | null
  } | null
}

type ProjectNavItem = {
  id: string
  name: string | null
  code: string | null
}

const navItems = [
  { id: 'inbox', label: 'Inbox', href: '/inbox' },
  { id: 'my-tasks', label: 'My Tasks', href: '/my-tasks' },
  { id: 'apex', label: 'Apex', href: '/apex' },
  { id: 'fields', label: 'Fields', href: '/fields' },
  { id: 'pulse', label: 'Pulse', href: '/pulse' },
  { id: 'echo', label: 'Echo', href: '/echo' },
  { id: 'people', label: 'People', href: '/people' },
  { id: 'departments', label: 'Departments', href: '/departments' },
  { id: 'status', label: 'Status', href: '/status' },
  { id: 'tags', label: 'Tags', href: '/tags' },
]

const apexProjectPages = [
  { id: 'overview', label: 'Overview', path: '' },
  { id: 'assets', label: 'Assets', path: '/assets' },
  { id: 'sequences', label: 'Sequences', path: '/sequences' },
  { id: 'shots', label: 'Shots', path: '/shots' },
  { id: 'tasks', label: 'Tasks', path: '/tasks' },
  { id: 'notes', label: 'Notes', path: '/notes' },
  { id: 'versions', label: 'Versions', path: '/versions' },
  { id: 'published-files', label: 'Published Files', path: '/published-files' },
  { id: 'playlists', label: 'Playlists', path: '/playlists' },
]

export function GlobalNav({ user, profile }: GlobalNavProps) {
  const pathname = usePathname()
  const [projects, setProjects] = useState<ProjectNavItem[]>([])
  const [projectsLoading, setProjectsLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    let active = true

    async function loadProjects() {
      setProjectsLoading(true)
      const supabase = createClient()
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, code')
        .order('name', { ascending: true })
        .limit(20)

      if (!active) return
      if (error) {
        console.error('Failed to load apex projects for navigation:', error)
        setProjects([])
        setProjectsLoading(false)
        return
      }

      setProjects(
        (data || []).map((project) => ({
          id: String(project.id),
          name: project.name ?? null,
          code: project.code ?? null,
        }))
      )
      setProjectsLoading(false)
    }

    loadProjects()
    return () => {
      active = false
    }
  }, [user.id])

  // Poll unread notification count
  useEffect(() => {
    let active = true

    async function fetchCount() {
      const count = await getUnreadNotificationCount()
      if (active) setUnreadCount(count)
    }

    fetchCount()
    const interval = setInterval(fetchCount, 30000)
    return () => {
      active = false
      clearInterval(interval)
    }
  }, [user.id])

  return (
    <nav className="flex h-14 items-center justify-between border-b border-zinc-800 bg-zinc-950 px-6">
      {/* Left: Logo + Nav Links */}
      <div className="flex items-center gap-6">
        <Link href="/apex" className="text-xl font-bold text-amber-400">
          K O N G
        </Link>

        <div className="flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href)

            if (item.id === 'apex') {
              return (
                <DropdownMenu key={item.id}>
                  <DropdownMenuTrigger asChild>
                    <button
                      className={`
                        flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition
                        ${
                          isActive
                            ? 'bg-zinc-900 text-amber-400'
                            : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                        }
                      `}
                    >
                      {item.label}
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    className="w-72 border-zinc-800 bg-zinc-950 text-zinc-100"
                  >
                    <DropdownMenuLabel className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">
                      Apex
                    </DropdownMenuLabel>
                    <DropdownMenuItem asChild className="focus:bg-zinc-900">
                      <Link href="/apex" className="w-full">
                        Project Excel
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-zinc-800" />
                    <DropdownMenuLabel className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">
                      Projects
                    </DropdownMenuLabel>
                    {projectsLoading ? (
                      <DropdownMenuItem disabled className="text-zinc-500">
                        Loading projects...
                      </DropdownMenuItem>
                    ) : projects.length === 0 ? (
                      <DropdownMenuItem disabled className="text-zinc-500">
                        No projects found
                      </DropdownMenuItem>
                    ) : (
                      projects.map((project) => (
                        <DropdownMenuSub key={project.id}>
                          <DropdownMenuSubTrigger className="focus:bg-zinc-900">
                            {project.code || project.name || project.id}
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent className="w-60 border-zinc-800 bg-zinc-950 text-zinc-100">
                            {apexProjectPages.map((page) => (
                              <DropdownMenuItem
                                key={`${project.id}-${page.id}`}
                                asChild
                                className="focus:bg-zinc-900"
                              >
                                <Link href={`/apex/${project.id}${page.path}`} className="w-full">
                                  {page.label}
                                </Link>
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                      ))
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )
            }

            return (
              <Link
                key={item.id}
                href={item.href}
                className={`
                  relative px-3 py-2 text-sm font-medium transition rounded-md
                  ${
                    isActive
                      ? 'text-amber-400 bg-zinc-900'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                  }
                `}
              >
                {item.label}
                {item.id === 'inbox' && unreadCount > 0 && (
                  <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-xs font-bold text-zinc-950">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      </div>

      {/* Right: Search, Notifications, User */}
      <div className="flex items-center gap-3">
        <button className="p-2 text-zinc-400 hover:text-zinc-200 transition rounded-md hover:bg-zinc-900">
          <Search className="h-5 w-5" />
        </button>
        <button className="p-2 text-zinc-400 hover:text-zinc-200 transition rounded-md hover:bg-zinc-900">
          <Plus className="h-5 w-5" />
        </button>
        <UserMenu user={user} profile={profile} />
      </div>
    </nav>
  )
}
