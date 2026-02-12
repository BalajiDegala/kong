'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { User } from '@supabase/supabase-js'
import { LogOut, User as UserIcon, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface UserMenuProps {
  user: User
  profile: any
}

type ProfileRecord = {
  id?: string
  email?: string | null
  display_name?: string | null
  role?: string | null
  avatar_url?: string | null
}

export function UserMenu({ user, profile }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentProfile, setCurrentProfile] = useState<ProfileRecord>(profile || {})
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const loadProfile = useCallback(async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, email, display_name, role, avatar_url')
      .eq('id', user.id)
      .maybeSingle()

    if (data) {
      setCurrentProfile(data)
    }
  }, [supabase, user.id])

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    setCurrentProfile(profile || {})
  }, [profile])

  useEffect(() => {
    void loadProfile()
  }, [loadProfile])

  useEffect(() => {
    if (!isOpen) return
    void loadProfile()
  }, [isOpen, loadProfile])

  useEffect(() => {
    const handleProfileUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<ProfileRecord | undefined>
      const detail = customEvent.detail
      if (!detail || detail.id !== user.id) return
      setCurrentProfile((prev) => ({
        ...prev,
        ...detail,
      }))
    }

    window.addEventListener('kong:profile-updated', handleProfileUpdated as EventListener)
    return () => {
      window.removeEventListener('kong:profile-updated', handleProfileUpdated as EventListener)
    }
  }, [user.id])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition hover:bg-zinc-800"
      >
        <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 text-xs font-bold text-white">
          {currentProfile?.avatar_url ? (
            <img src={currentProfile.avatar_url} alt="" className="h-8 w-8 object-cover" />
          ) : (
            <span>{currentProfile?.display_name?.[0] || user.email?.[0].toUpperCase()}</span>
          )}
        </div>
        <span className="text-zinc-100">
          {currentProfile?.display_name || user.email?.split('@')[0]}
        </span>
        <ChevronDown className={`h-4 w-4 text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-lg border border-zinc-800 bg-zinc-900 shadow-xl">
          {/* User Info */}
          <div className="border-b border-zinc-800 p-4">
            <p className="font-medium text-zinc-100">
              {currentProfile?.display_name || 'User'}
            </p>
            <p className="text-sm text-zinc-400">{currentProfile?.email || user.email}</p>
            <div className="mt-2">
              <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-400">
                {currentProfile?.role || 'member'}
              </span>
            </div>
          </div>

          {/* Menu Items */}
          <div className="p-2">
            <Link
              href="/people?edit=me"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800 hover:text-zinc-100"
            >
              <UserIcon className="h-4 w-4" />
              Profile Settings
            </Link>
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800 hover:text-zinc-100"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
