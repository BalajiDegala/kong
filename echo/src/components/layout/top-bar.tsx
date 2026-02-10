'use client'

import { User } from '@supabase/supabase-js'
import { Bell, Search, Settings } from 'lucide-react'
import Link from 'next/link'
import { UserMenu } from './user-menu'

interface TopBarProps {
  user: User
  profile: any
}

export function TopBar({ user, profile }: TopBarProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-zinc-800 bg-zinc-900 px-6">
      {/* Search */}
      <div className="flex flex-1 items-center gap-4">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search projects, assets, tasks..."
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 py-2 pl-10 pr-4 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <button className="relative rounded-lg p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-amber-500" />
        </button>

        {/* Settings */}
        <Link
          href="/settings"
          className="rounded-lg p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100"
        >
          <Settings className="h-5 w-5" />
        </Link>

        {/* User Menu */}
        <UserMenu user={user} profile={profile} />
      </div>
    </header>
  )
}
