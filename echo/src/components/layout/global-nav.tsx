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
  { id: 'pages', label: 'All Pages', href: '/pages' },
  { id: 'media', label: 'Media', href: '/media' },
  { id: 'fields', label: 'Fields', href: '/fields' },
  { id: 'pulse', label: 'Pulse', href: '/pulse' },
  { id: 'echo', label: 'Echo', href: '/echo' },
  { id: 'people', label: 'People', href: '/people' },
  { id: 'departments', label: 'Departments', href: '/departments' },
  { id: 'status', label: 'Status', href: '/status' },
  { id: 'tags', label: 'Tags', href: '/tags' },
  { id: 'skull-island', label: 'Skull Island', href: '/skull-island' },
]

const apexProjectPages = [
  { id: 'overview', label: 'Overview', path: '' },
  { id: 'assets', label: 'Assets', path: '/assets' },
  { id: 'sequences', label: 'Sequences', path: '/sequences' },
  { id: 'shots', label: 'Shots', path: '/shots' },
  { id: 'tasks', label: 'Tasks', path: '/tasks' },
  { id: 'notes', label: 'Notes', path: '/notes' },
  { id: 'versions', label: 'Versions', path: '/versions' },
  { id: 'media', label: 'Media', path: '/media' },
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
        .is('deleted_at', null)
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

    const handleProjectsChanged = () => {
      void loadProjects()
    }

    const handleFocus = () => {
      void loadProjects()
    }

    void loadProjects()
    window.addEventListener('apex:projects-changed', handleProjectsChanged)
    window.addEventListener('focus', handleFocus)

    return () => {
      active = false
      window.removeEventListener('apex:projects-changed', handleProjectsChanged)
      window.removeEventListener('focus', handleFocus)
    }
  }, [user.id, pathname])

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
    <nav className="flex h-14 items-center justify-between border-b border-border bg-background px-6">
      {/* Left: Logo + Nav Links */}
      <div className="flex items-center gap-6">
        <Link href="/kong" className="text-xl font-bold text-primary">
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
                            ? 'bg-card text-primary'
                            : 'text-muted-foreground hover:bg-card hover:text-foreground/80'
                        }
                      `}
                    >
                      {item.label}
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    className="w-72 border-border bg-background text-foreground"
                  >
                    <DropdownMenuLabel className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                      Apex
                    </DropdownMenuLabel>
                    <DropdownMenuItem asChild className="focus:bg-card">
                      <Link href="/apex" className="w-full">
                        Project Excel
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-accent" />
                    <DropdownMenuLabel className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                      Projects
                    </DropdownMenuLabel>
                    {projectsLoading ? (
                      <DropdownMenuItem disabled className="text-muted-foreground">
                        Loading projects...
                      </DropdownMenuItem>
                    ) : projects.length === 0 ? (
                      <DropdownMenuItem disabled className="text-muted-foreground">
                        No projects found
                      </DropdownMenuItem>
                    ) : (
                      projects.map((project) => (
                        <DropdownMenuSub key={project.id}>
                          <DropdownMenuSubTrigger className="focus:bg-card">
                            {project.code || project.name || project.id}
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent className="w-60 border-border bg-background text-foreground">
                            {apexProjectPages.map((page) => (
                              <DropdownMenuItem
                                key={`${project.id}-${page.id}`}
                                asChild
                                className="focus:bg-card"
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
                      ? 'text-primary bg-card'
                      : 'text-muted-foreground hover:text-foreground/80 hover:bg-card'
                  }
                `}
              >
                {item.label}
                {item.id === 'inbox' && unreadCount > 0 && (
                  <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground">
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
        <button className="p-2 text-muted-foreground hover:text-foreground/80 transition rounded-md hover:bg-card">
          <Search className="h-5 w-5" />
        </button>
        <button className="p-2 text-muted-foreground hover:text-foreground/80 transition rounded-md hover:bg-card">
          <Plus className="h-5 w-5" />
        </button>
        <UserMenu user={user} profile={profile} />
      </div>
    </nav>
  )
}
