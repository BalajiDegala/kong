'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { User } from '@supabase/supabase-js'
import { LogOut, User as UserIcon, ChevronDown, Check } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { createClient } from '@/lib/supabase/client'
import { THEMES } from '@/components/theme-provider'

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
  const { theme, setTheme } = useTheme()

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
        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition hover:bg-accent"
      >
        <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 text-xs font-bold text-white">
          {currentProfile?.avatar_url ? (
            <img src={currentProfile.avatar_url} alt="" className="h-8 w-8 object-cover" />
          ) : (
            <span>{currentProfile?.display_name?.[0] || user.email?.[0].toUpperCase()}</span>
          )}
        </div>
        <span className="text-foreground">
          {currentProfile?.display_name || user.email?.split('@')[0]}
        </span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-lg border border-border bg-popover shadow-xl">
          {/* User Info */}
          <div className="border-b border-border p-4">
            <p className="font-medium text-foreground">
              {currentProfile?.display_name || 'User'}
            </p>
            <p className="text-sm text-muted-foreground">{currentProfile?.email || user.email}</p>
            <div className="mt-2">
              <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                {currentProfile?.role || 'member'}
              </span>
            </div>
          </div>

          {/* Theme Switcher */}
          <div className="border-b border-border px-4 py-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Theme</p>
            <div className="flex gap-2">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  title={t.label}
                  className={`relative flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all ${
                    theme === t.id
                      ? 'border-primary scale-110'
                      : 'border-transparent hover:border-muted-foreground/30'
                  }`}
                >
                  <span
                    className="block h-5 w-5 rounded-full"
                    style={{ backgroundColor: t.color }}
                  />
                  {theme === t.id && (
                    <Check
                      className="absolute h-3 w-3"
                      style={{ color: t.id === 'oled-black' ? '#fff' : t.id === 'dawn' ? '#fff' : '#000' }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Menu Items */}
          <div className="p-2">
            <Link
              href="/people?edit=me"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-popover-foreground/80 transition hover:bg-accent hover:text-accent-foreground"
            >
              <UserIcon className="h-4 w-4" />
              Profile Settings
            </Link>
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-popover-foreground/80 transition hover:bg-accent hover:text-accent-foreground"
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
