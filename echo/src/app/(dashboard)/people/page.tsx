'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { createUser } from '@/actions/people'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Users, Plus, User, Mail, Shield } from 'lucide-react'

export default function PeoplePage() {
  const [profiles, setProfiles] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  useEffect(() => {
    loadProfiles()
  }, [])

  async function loadProfiles() {
    try {
      setIsLoading(true)
      const supabase = createClient()
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          department:departments(id, code, name)
        `)
        .eq('active', true)
        .order('display_name')

      if (error) throw error
      setProfiles(data || [])
    } catch (err) {
      console.error('Failed to load profiles:', err)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-zinc-400">Loading people...</p>
      </div>
    )
  }

  return (
    <>
      <CreateUserDialog
        open={showCreateDialog}
        onOpenChange={(open) => {
          setShowCreateDialog(open)
          if (!open) loadProfiles()
        }}
      />

      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="border-b border-zinc-800 bg-zinc-950 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-zinc-400" />
              <h2 className="text-lg font-semibold text-zinc-100">People</h2>
              <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                {profiles.length}
              </span>
            </div>
            <button
              onClick={() => setShowCreateDialog(true)}
              className="flex items-center gap-2 rounded-md bg-amber-500 px-3 py-2 text-sm font-medium text-black transition hover:bg-amber-400"
            >
              <Plus className="h-4 w-4" />
              Add User
            </button>
          </div>
        </div>

        {/* People Table */}
        <div className="flex-1 overflow-auto p-6">
          {profiles.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <Users className="mx-auto mb-4 h-12 w-12 text-zinc-700" />
                <h3 className="mb-2 text-lg font-semibold text-zinc-100">No users yet</h3>
                <p className="mb-4 text-sm text-zinc-400">
                  Create users to start using Kong.
                </p>
                <button
                  onClick={() => setShowCreateDialog(true)}
                  className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-black transition hover:bg-amber-400"
                >
                  Create First User
                </button>
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-5xl">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800 text-left text-xs uppercase tracking-wider text-zinc-500">
                    <th className="pb-3 pr-4">Name</th>
                    <th className="pb-3 pr-4">Email</th>
                    <th className="pb-3 pr-4">Role</th>
                    <th className="pb-3 pr-4">Department</th>
                    <th className="pb-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.map((profile) => (
                    <tr
                      key={profile.id}
                      className="border-b border-zinc-800/50 transition hover:bg-zinc-900/50"
                    >
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800">
                            {profile.avatar_url ? (
                              <img
                                src={profile.avatar_url}
                                alt=""
                                className="h-9 w-9 rounded-full object-cover"
                              />
                            ) : (
                              <User className="h-4 w-4 text-zinc-500" />
                            )}
                          </div>
                          <div>
                            <span className="text-sm font-medium text-zinc-100">
                              {profile.display_name || `${profile.firstname || ''} ${profile.lastname || ''}`.trim() || '—'}
                            </span>
                            {profile.firstname && (
                              <p className="text-xs text-zinc-500">
                                {profile.firstname} {profile.lastname}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-sm text-zinc-400">{profile.email}</td>
                      <td className="py-3 pr-4">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            profile.role === 'alpha'
                              ? 'bg-amber-500/10 text-amber-400'
                              : profile.role === 'beta'
                                ? 'bg-blue-500/10 text-blue-400'
                                : 'bg-zinc-800 text-zinc-400'
                          }`}
                        >
                          {profile.role || 'member'}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-sm text-zinc-400">
                        {profile.department?.name || '—'}
                      </td>
                      <td className="py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            profile.active
                              ? 'bg-green-500/10 text-green-400'
                              : 'bg-red-500/10 text-red-400'
                          }`}
                        >
                          {profile.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// =============================================================================
// Create User Dialog
// =============================================================================

function CreateUserDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [firstname, setFirstname] = useState('')
  const [lastname, setLastname] = useState('')
  const [departmentName, setDepartmentName] = useState('')
  const [role, setRole] = useState('member')
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  function resetForm() {
    setEmail('')
    setPassword('')
    setDisplayName('')
    setFirstname('')
    setLastname('')
    setDepartmentName('')
    setRole('member')
    setError('')
    setSuccess('')
  }

  async function handleCreate() {
    if (!email.trim() || !password.trim() || !displayName.trim()) {
      setError('Email, password, and display name are required')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setIsCreating(true)
    setError('')
    setSuccess('')

    const result = await createUser({
      email: email.trim(),
      password,
      display_name: displayName.trim(),
      firstname: firstname.trim() || undefined,
      lastname: lastname.trim() || undefined,
      department_name: departmentName.trim() || undefined,
      role,
    })

    setIsCreating(false)

    if (result.error) {
      setError(result.error)
      return
    }

    setSuccess(`User "${displayName.trim()}" created!`)
    setEmail('')
    setPassword('')
    setDisplayName('')
    setFirstname('')
    setLastname('')
    setDepartmentName('')
    setRole('member')
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) resetForm()
        onOpenChange(o)
      }}
    >
      <DialogContent className="border-zinc-800 bg-zinc-900 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-zinc-100">
            <Plus className="h-5 w-5" />
            Create User
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Create a new user account. They can log in with the email and password.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-300">First Name</label>
              <input
                type="text"
                value={firstname}
                onChange={(e) => setFirstname(e.target.value)}
                placeholder="Balaji"
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-300">Last Name</label>
              <input
                type="text"
                value={lastname}
                onChange={(e) => setLastname(e.target.value)}
                placeholder="Degala"
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-300">
              <span className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" /> Display Name
              </span>
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Balaji Degala"
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-300">
              <span className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" /> Email
              </span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="balajid@d2.com"
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-300">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 6 characters"
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-300">Department</label>
              <input
                type="text"
                value={departmentName}
                onChange={(e) => setDepartmentName(e.target.value)}
                placeholder="e.g. Pipeline TD"
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-300">
                <span className="flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5" /> Role
                </span>
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-amber-500/50 focus:outline-none"
              >
                <option value="member">Member</option>
                <option value="beta">Beta</option>
                <option value="alpha">Alpha</option>
              </select>
            </div>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}
          {success && <p className="text-sm text-green-400">{success}</p>}

          <button
            onClick={handleCreate}
            disabled={isCreating || !email.trim() || !password.trim() || !displayName.trim()}
            className="w-full rounded-md bg-amber-500 px-4 py-2.5 text-sm font-medium text-black transition hover:bg-amber-400 disabled:opacity-50"
          >
            {isCreating ? 'Creating...' : 'Create User'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
