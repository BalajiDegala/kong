'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import {
  LayoutGrid,
  MessageSquare,
  Activity,
  FolderKanban,
  Boxes,
  Film,
  CheckSquare,
  PlaySquare,
} from 'lucide-react'

interface SidebarProps {
  user: User
  profile: any
}

const navigation = [
  {
    title: 'APEX',
    subtitle: 'Projects',
    items: [
      { name: 'Projects', href: '/apex', icon: FolderKanban },
      { name: 'Assets', href: '/apex/assets', icon: Boxes },
      { name: 'Shots', href: '/apex/shots', icon: Film },
      { name: 'Tasks', href: '/apex/tasks', icon: CheckSquare },
    ],
  },
  {
    title: 'ECHO',
    subtitle: 'Chat',
    items: [
      { name: 'Inbox', href: '/echo', icon: MessageSquare },
    ],
  },
  {
    title: 'PULSE',
    subtitle: 'Reviews',
    items: [
      { name: 'Activity', href: '/pulse', icon: Activity },
      { name: 'Versions', href: '/pulse/versions', icon: PlaySquare },
      { name: 'Playlists', href: '/pulse/playlists', icon: LayoutGrid },
    ],
  },
]

export function Sidebar({ user, profile }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="flex w-64 flex-col border-r border-zinc-800 bg-zinc-900">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-zinc-800 px-6">
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500" />
        <div className="leading-none">
          <p className="font-[var(--font-display)] text-lg tracking-[0.35em] text-amber-200">
            KONG
          </p>
          <p className="text-[10px] uppercase tracking-[0.4em] text-zinc-500">
            Rule Your Workflow
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4">
        <div className="space-y-6">
          {navigation.map((section) => (
            <div key={section.title}>
              <div className="mb-2 px-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-zinc-500">
                  {section.title}
                </p>
                <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-600">
                  {section.subtitle}
                </p>
              </div>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
                  const Icon = item.icon

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-amber-500/10 text-amber-400'
                          : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {item.name}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </nav>

      {/* User Info */}
      <div className="border-t border-zinc-800 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 text-xs font-bold text-white">
            {profile?.display_name?.[0] || user.email?.[0].toUpperCase()}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-sm font-medium text-zinc-100">
              {profile?.display_name || 'User'}
            </p>
            <p className="truncate text-xs text-zinc-500">
              {profile?.role || 'member'}
            </p>
          </div>
        </div>
      </div>
    </aside>
  )
}
