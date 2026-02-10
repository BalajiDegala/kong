'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Search, Bell, Plus } from 'lucide-react'
import { UserMenu } from './user-menu'
import type { User } from '@supabase/supabase-js'

interface GlobalNavProps {
  user: User
  profile: any
}

const navItems = [
  { id: 'inbox', label: 'Inbox', href: '/inbox' },
  { id: 'my-tasks', label: 'My Tasks', href: '/my-tasks' },
  { id: 'projects', label: 'Projects', href: '/apex' },
  { id: 'echo', label: 'Echo', href: '/echo' },
  { id: 'people', label: 'People', href: '/people' },
]

export function GlobalNav({ user, profile }: GlobalNavProps) {
  const pathname = usePathname()

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

            return (
              <Link
                key={item.id}
                href={item.href}
                className={`
                  px-3 py-2 text-sm font-medium transition rounded-md
                  ${
                    isActive
                      ? 'text-amber-400 bg-zinc-900'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                  }
                `}
              >
                {item.label}
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
          <Bell className="h-5 w-5" />
        </button>
        <button className="p-2 text-zinc-400 hover:text-zinc-200 transition rounded-md hover:bg-zinc-900">
          <Plus className="h-5 w-5" />
        </button>
        <UserMenu user={user} profile={profile} />
      </div>
    </nav>
  )
}
