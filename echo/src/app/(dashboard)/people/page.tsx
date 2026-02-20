'use client'

import { useEffect, useMemo, useState, type MouseEvent } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  createUser,
  deleteUser,
  setUserProjectAccess,
  updateProfile,
} from '@/actions/people'
import { EntityTable } from '@/components/table/entity-table'
import type { TableColumn } from '@/components/table/types'
import { DeleteConfirmDialog } from '@/components/apex/delete-confirm-dialog'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Users, Plus, User, Mail, Shield, KeyRound, Trash2, Pencil } from 'lucide-react'

type ProjectRole = 'lead' | 'member' | 'viewer'

interface ProjectOption {
  id: number
  code?: string | null
  name?: string | null
  archived?: boolean | null
}

interface ProjectMembership {
  user_id: string
  project_id: number
  role?: string | null
  project?: ProjectOption | ProjectOption[] | null
}

interface DepartmentOption {
  id: number
  code?: string | null
  name?: string | null
}

const PROJECT_ROLE_OPTIONS: Array<{ value: ProjectRole; label: string }> = [
  { value: 'member', label: 'Member' },
  { value: 'lead', label: 'Lead' },
  { value: 'viewer', label: 'Viewer' },
]

function projectDisplayName(project: ProjectOption | null | undefined) {
  if (!project) return 'Unknown Project'
  return project.code || project.name || `Project ${project.id}`
}

function membershipProject(membership: ProjectMembership) {
  if (!membership.project) return undefined
  return Array.isArray(membership.project)
    ? membership.project[0]
    : membership.project
}

function normalizeProjectRole(role?: string | null): ProjectRole {
  if (role === 'lead' || role === 'viewer') return role
  return 'member'
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Failed to read image file'))
    reader.readAsDataURL(file)
  })
}

async function optimizeAvatarDataUrl(file: File) {
  const rawDataUrl = await fileToDataUrl(file)
  const img = new Image()
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('Invalid image file'))
    img.src = rawDataUrl
  })

  const maxSide = 256
  const ratio = Math.min(maxSide / img.width, maxSide / img.height, 1)
  const width = Math.max(1, Math.round(img.width * ratio))
  const height = Math.max(1, Math.round(img.height * ratio))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Failed to process image')
  ctx.drawImage(img, 0, 0, width, height)
  return canvas.toDataURL('image/jpeg', 0.84)
}

export default function PeoplePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editParam = searchParams.get('edit')
  const [profiles, setProfiles] = useState<any[]>([])
  const [projects, setProjects] = useState<ProjectOption[]>([])
  const [departments, setDepartments] = useState<DepartmentOption[]>([])
  const [membershipsByUser, setMembershipsByUser] = useState<Record<string, ProjectMembership[]>>({})
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [profileSettingsHandled, setProfileSettingsHandled] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [accessProfile, setAccessProfile] = useState<any | null>(null)
  const [editProfile, setEditProfile] = useState<any | null>(null)
  const [deleteProfile, setDeleteProfile] = useState<any | null>(null)
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    row: any
  } | null>(null)

  useEffect(() => {
    loadPeopleData()
  }, [])

  useEffect(() => {
    if (!contextMenu) return
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setContextMenu(null)
      }
    }
    window.addEventListener('keydown', onEscape)
    return () => {
      window.removeEventListener('keydown', onEscape)
    }
  }, [contextMenu])

  useEffect(() => {
    if (editParam === 'me') {
      setProfileSettingsHandled(false)
    }
  }, [editParam])

  useEffect(() => {
    if (profileSettingsHandled) return
    if (isLoading) return
    if (editParam !== 'me') return
    if (!currentUserId) return

    const currentProfile = profiles.find((profile) => profile.id === currentUserId)
    if (!currentProfile) return

    setEditProfile(currentProfile)
    setProfileSettingsHandled(true)
    router.replace('/people')
  }, [
    currentUserId,
    editParam,
    isLoading,
    profileSettingsHandled,
    profiles,
    router,
  ])

  async function loadPeopleData() {
    try {
      setIsLoading(true)
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setCurrentUserId(user?.id || null)

      const [profilesResult, projectsResult, membershipsResult, departmentsResult] =
        await Promise.all([
          supabase
            .from('profiles')
            .select(`
              *,
              department:departments(id, code, name)
            `)
            .eq('active', true)
            .order('display_name'),
          supabase
            .from('projects')
            .select('id, code, name, archived')
            .is('deleted_at', null)
            .order('name'),
          supabase
            .from('project_members')
            .select(`
              user_id,
              project_id,
              role,
              project:projects(id, code, name, archived)
            `),
          supabase.from('departments').select('id, code, name').order('name'),
        ])

      if (profilesResult.error) { console.error('[people] PROFILES:', profilesResult.error.message); throw profilesResult.error }
      if (projectsResult.error) { console.error('[people] PROJECTS:', projectsResult.error.message); throw projectsResult.error }
      if (membershipsResult.error) { console.error('[people] MEMBERSHIPS:', membershipsResult.error.message); throw membershipsResult.error }
      if (departmentsResult.error) { console.error('[people] DEPARTMENTS:', departmentsResult.error.message); throw departmentsResult.error }

      const profileRows = profilesResult.data || []
      const projectRows = (projectsResult.data || []) as ProjectOption[]
      const membershipRows = (membershipsResult.data || []) as ProjectMembership[]
      const departmentRows = (departmentsResult.data || []) as DepartmentOption[]

      const nextMembershipMap: Record<string, ProjectMembership[]> = {}
      for (const membership of membershipRows) {
        if (!nextMembershipMap[membership.user_id]) {
          nextMembershipMap[membership.user_id] = []
        }
        nextMembershipMap[membership.user_id].push(membership)
      }

      for (const userId of Object.keys(nextMembershipMap)) {
        nextMembershipMap[userId].sort((a, b) =>
          projectDisplayName(membershipProject(a)).localeCompare(
            projectDisplayName(membershipProject(b))
          )
        )
      }

      setProfiles(profileRows)
      setProjects(projectRows)
      setDepartments(departmentRows)
      setMembershipsByUser(nextMembershipMap)
    } catch (err) {
      console.error('Failed to load people data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  function openAccessDialog(profile: any) {
    setAccessProfile(profile)
  }

  function openEditDialog(profile: any) {
    setEditProfile(profile)
  }

  function openDeleteDialog(profile: any) {
    setDeleteProfile(profile)
  }

  function handleRowContextMenu(row: any, event: MouseEvent<HTMLTableRowElement>) {
    event.preventDefault()
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      row,
    })
  }

  async function deleteUserIds(userIds: string[]) {
    const uniqueIds = Array.from(
      new Set(userIds.map((id) => String(id || '').trim()).filter(Boolean))
    )
    if (uniqueIds.length === 0) {
      return { error: 'Missing user id' as const }
    }

    const failures: string[] = []
    for (const userId of uniqueIds) {
      const result = await deleteUser(userId)
      if (result.error) failures.push(result.error)
    }

    if (failures.length > 0) {
      return { error: failures[0] }
    }

    await loadPeopleData()
    return { success: true as const }
  }

  async function handleBulkDelete(rows: Record<string, unknown>[]) {
    const userIds = rows
      .map((row) => String(row?.id || '').trim())
      .filter(Boolean)
    const result = await deleteUserIds(userIds)
    if (result.error) {
      throw new Error(result.error)
    }
  }

  async function handleCsvImport(rows: Record<string, unknown>[]) {
    const failed: Array<{ row: number; message: string }> = []
    let imported = 0

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index]
      const email = String(row.email ?? '').trim()
      const password = String(row.password ?? '').trim()
      const displayName = String(row.display_name ?? row.name ?? '').trim()
      const firstname = String(row.firstname ?? row.first_name ?? '').trim()
      const lastname = String(row.lastname ?? row.last_name ?? '').trim()
      const departmentName = String(row.department_name ?? row.department ?? '').trim()
      const role = String(row.role ?? '').trim() || 'member'
      const avatarUrl = String(row.avatar_url ?? '').trim() || null

      if (!email) {
        failed.push({ row: index + 2, message: 'Email is required.' })
        continue
      }
      if (!password) {
        failed.push({ row: index + 2, message: 'Password is required for user creation.' })
        continue
      }

      const resolvedDisplayName =
        displayName || `${firstname} ${lastname}`.trim() || email

      const result = await createUser({
        email,
        password,
        display_name: resolvedDisplayName,
        firstname: firstname || undefined,
        lastname: lastname || undefined,
        department_name: departmentName || undefined,
        role,
        avatar_url: avatarUrl,
      })

      if (result.error) {
        failed.push({ row: index + 2, message: result.error })
        continue
      }

      imported += 1
    }

    await loadPeopleData()
    return { imported, failed }
  }

  const peopleRows = useMemo(
    () =>
      profiles.map((profile) => {
        const userMemberships = membershipsByUser[profile.id] || []
        const projectLabels = userMemberships.map((membership) =>
          projectDisplayName(membershipProject(membership))
        )
        const preview = projectLabels.slice(0, 2)
        const remaining = Math.max(projectLabels.length - preview.length, 0)

        return {
          ...profile,
          name:
            profile.display_name ||
            `${profile.firstname || ''} ${profile.lastname || ''}`.trim() ||
            '—',
          department_name: profile.department?.name || '',
          status: profile.active ? 'Active' : 'Inactive',
          projects: projectLabels.length === 0 ? 'No project access' : projectLabels.join(', '),
          projects_preview:
            projectLabels.length === 0
              ? 'No project access'
              : remaining > 0
                ? `${preview.join(', ')} +${remaining} more`
                : preview.join(', '),
        }
      }),
    [profiles, membershipsByUser]
  )

  async function handlePeopleCellUpdate(row: any, column: TableColumn, value: any) {
    if (!row?.id) return

    let result: Awaited<ReturnType<typeof updateProfile>> | null = null
    let selectedDepartment: DepartmentOption | null | undefined

    if (column.id === 'name') {
      const nextName = String(value ?? '').trim()
      if (!nextName) {
        throw new Error('Name is required')
      }
      result = await updateProfile(row.id, {
        display_name: nextName,
      })
    } else if (column.id === 'role') {
      const nextRole = String(value ?? '').trim() || 'member'
      result = await updateProfile(row.id, {
        role: nextRole,
      })
    } else if (column.id === 'department_name') {
      const selectedName = String(value ?? '').trim()
      const matchedDepartment = departments.find(
        (department) =>
          (department.name || '').toLowerCase() === selectedName.toLowerCase()
      )
      selectedDepartment = matchedDepartment || null

      result = await updateProfile(row.id, {
        department_id: matchedDepartment ? matchedDepartment.id : null,
      })
    } else if (column.id === 'status') {
      const nextStatus = String(value ?? '').toLowerCase()
      result = await updateProfile(row.id, {
        active: nextStatus === 'active',
      })
    } else {
      return
    }

    if (result?.error) {
      throw new Error(result.error)
    }

    if (result?.data?.id) {
      setProfiles((prev) =>
        prev.map((profile) => {
          if (profile.id !== result!.data.id) return profile

          const next = {
            ...profile,
            ...result!.data,
          }

          if (column.id === 'department_name') {
            next.department_id = selectedDepartment ? selectedDepartment.id : null
            next.department = selectedDepartment
              ? {
                  id: selectedDepartment.id,
                  code: selectedDepartment.code || null,
                  name: selectedDepartment.name || null,
                }
              : null
          }

          return next
        })
      )

      window.dispatchEvent(
        new CustomEvent('kong:profile-updated', {
          detail: result.data,
        })
      )
    }
  }

  const columns = useMemo<TableColumn[]>(
    () => [
      { id: 'avatar_url', label: 'Avatar', type: 'thumbnail', width: '88px' },
      {
        id: 'name',
        label: 'Name',
        type: 'text',
        width: '220px',
        editable: true,
        editor: 'text',
      },
      { id: 'email', label: 'Email', type: 'text', width: '230px' },
      {
        id: 'role',
        label: 'Role',
        type: 'text',
        width: '120px',
        editable: true,
        editor: 'select',
        options: [
          { value: 'member', label: 'Member' },
          { value: 'beta', label: 'Beta' },
          { value: 'alpha', label: 'Alpha' },
        ],
      },
      {
        id: 'department_name',
        label: 'Department',
        type: 'text',
        width: '170px',
        editable: true,
        editor: 'select',
        options: [
          { value: '', label: 'No Department' },
          ...departments.map((department) => ({
            value: department.name || '',
            label: department.name || department.code || `Department ${department.id}`,
          })),
        ],
      },
      { id: 'projects_preview', label: 'Projects', type: 'text', width: '260px' },
      {
        id: 'status',
        label: 'Status',
        type: 'status',
        width: '130px',
        editable: true,
        editor: 'select',
        options: [
          { value: 'Active', label: 'Active' },
          { value: 'Inactive', label: 'Inactive' },
        ],
      },
    ],
    [departments]
  )

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Loading people...</p>
      </div>
    )
  }

  return (
    <>
      <CreateUserDialog
        open={showCreateDialog}
        projects={projects}
        onCreated={loadPeopleData}
        onOpenChange={(open) => {
          setShowCreateDialog(open)
          if (!open) loadPeopleData()
        }}
      />

      <ManageProjectAccessDialog
        open={Boolean(accessProfile)}
        user={accessProfile}
        projects={projects}
        memberships={accessProfile ? membershipsByUser[accessProfile.id] || [] : []}
        onSaved={loadPeopleData}
        onOpenChange={(open) => {
          if (!open) setAccessProfile(null)
        }}
      />

      <EditUserDialog
        open={Boolean(editProfile)}
        user={editProfile}
        departments={departments}
        onSaved={loadPeopleData}
        onOpenChange={(open) => {
          if (!open) setEditProfile(null)
        }}
      />

      <DeleteConfirmDialog
        open={Boolean(deleteProfile)}
        onOpenChange={(open) => {
          if (!open) setDeleteProfile(null)
        }}
        title="Deactivate User"
        description="This will disable login and remove this user from active people lists."
        itemName={
          deleteProfile?.display_name ||
          `${deleteProfile?.firstname || ''} ${deleteProfile?.lastname || ''}`.trim() ||
          deleteProfile?.email ||
          'User'
        }
        onConfirm={async () => {
          if (!deleteProfile?.id) return { error: 'Missing user id' }
          return await deleteUserIds([deleteProfile.id])
        }}
      />

      <div className="flex h-full flex-col">
        <div className="border-b border-border bg-background px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold text-foreground">People</h2>
              <span className="rounded-full bg-accent px-2 py-0.5 text-xs text-muted-foreground">
                {profiles.length}
              </span>
            </div>
            <button
              onClick={() => setShowCreateDialog(true)}
              className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-black transition hover:bg-primary"
            >
              <Plus className="h-4 w-4" />
              Add User
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <EntityTable
            columns={columns}
            data={peopleRows}
            entityType="profiles"
            csvExportFilename="people"
            onCsvImport={handleCsvImport}
            onAdd={() => setShowCreateDialog(true)}
            onRowContextMenu={handleRowContextMenu}
            onCellUpdate={handlePeopleCellUpdate}
            onBulkDelete={(rows) => handleBulkDelete(rows as Record<string, unknown>[])}
            emptyState={
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <Users className="mx-auto mb-4 h-12 w-12 text-muted-foreground/70" />
                  <h3 className="mb-2 text-lg font-semibold text-foreground">No users yet</h3>
                  <p className="mb-4 text-sm text-muted-foreground">
                    Create users and assign project access to start using Kong.
                  </p>
                  <button
                    onClick={() => setShowCreateDialog(true)}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-black transition hover:bg-primary"
                  >
                    Create First User
                  </button>
                </div>
              </div>
            }
          />
        </div>
      </div>

      {contextMenu ? (
        <div
          className="fixed inset-0 z-50"
          onClick={() => setContextMenu(null)}
          onContextMenu={(event) => {
            event.preventDefault()
            setContextMenu(null)
          }}
        >
          <div
            className="absolute min-w-[180px] rounded-md border border-border bg-card p-1 shadow-2xl"
            style={{ top: contextMenu.y, left: contextMenu.x }}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-foreground transition hover:bg-accent"
              onClick={() => {
                openEditDialog(contextMenu.row)
                setContextMenu(null)
              }}
            >
              <Pencil className="h-4 w-4" />
              Edit
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-foreground transition hover:bg-accent"
              onClick={() => {
                openAccessDialog(contextMenu.row)
                setContextMenu(null)
              }}
            >
              <KeyRound className="h-4 w-4" />
              Manage Access
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-red-400 transition hover:bg-accent"
              onClick={() => {
                openDeleteDialog(contextMenu.row)
                setContextMenu(null)
              }}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
        </div>
      ) : null}
    </>
  )
}

function CreateUserDialog({
  open,
  onOpenChange,
  onCreated,
  projects,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void | Promise<void>
  projects: ProjectOption[]
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [firstname, setFirstname] = useState('')
  const [lastname, setLastname] = useState('')
  const [departmentName, setDepartmentName] = useState('')
  const [role, setRole] = useState('member')
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null)
  const [avatarFileName, setAvatarFileName] = useState('')
  const [projectAccess, setProjectAccess] = useState<Record<number, ProjectRole>>({})
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState('')

  function resetForm() {
    setEmail('')
    setPassword('')
    setDisplayName('')
    setFirstname('')
    setLastname('')
    setDepartmentName('')
    setRole('member')
    setAvatarDataUrl(null)
    setAvatarFileName('')
    setProjectAccess({})
    setError('')
  }

  function toggleProjectAccess(projectId: number, checked: boolean) {
    setProjectAccess((prev) => {
      const next = { ...prev }
      if (!checked) {
        delete next[projectId]
        return next
      }
      next[projectId] = next[projectId] || 'member'
      return next
    })
  }

  function setProjectRole(projectId: number, nextRole: string) {
    const roleValue = normalizeProjectRole(nextRole)
    setProjectAccess((prev) => ({
      ...prev,
      [projectId]: roleValue,
    }))
  }

  async function handleAvatarSelect(file: File | null) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Avatar must be an image file')
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      setError('Avatar image is too large (max 8MB before compression)')
      return
    }
    try {
      const optimized = await optimizeAvatarDataUrl(file)
      setAvatarDataUrl(optimized)
      setAvatarFileName(file.name)
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to process avatar')
    }
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

    const projectMemberships = Object.entries(projectAccess).map(([projectId, membershipRole]) => ({
      project_id: Number(projectId),
      role: membershipRole,
    }))

    const result = await createUser({
      email: email.trim(),
      password,
      display_name: displayName.trim(),
      firstname: firstname.trim() || undefined,
      lastname: lastname.trim() || undefined,
      department_name: departmentName.trim() || undefined,
      role,
      avatar_url: avatarDataUrl,
      project_memberships: projectMemberships,
    })

    setIsCreating(false)

    if (result.error) {
      setError(result.error)
      return
    }

    await onCreated()
    resetForm()
    onOpenChange(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) resetForm()
        onOpenChange(o)
      }}
    >
      <DialogContent className="max-h-[92vh] overflow-hidden border-border bg-card sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Plus className="h-5 w-5" />
            Create User
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Create a new user account and assign project access.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground/70">First Name</label>
              <input
                type="text"
                value={firstname}
                onChange={(e) => setFirstname(e.target.value)}
                placeholder="Balaji"
                className="w-full rounded-md border border-border bg-accent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground/70">Last Name</label>
              <input
                type="text"
                value={lastname}
                onChange={(e) => setLastname(e.target.value)}
                placeholder="Degala"
                className="w-full rounded-md border border-border bg-accent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-foreground/70">Avatar</label>
            <div className="flex items-center gap-3 rounded-md border border-border bg-card/40 p-2">
              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-accent">
                {avatarDataUrl ? (
                  <img src={avatarDataUrl} alt="" className="h-12 w-12 object-cover" />
                ) : (
                  <User className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => void handleAvatarSelect(e.target.files?.[0] || null)}
                  className="w-full text-xs text-foreground/70 file:mr-3 file:rounded file:border-0 file:bg-accent file:px-2 file:py-1 file:text-xs file:text-foreground/80 hover:file:bg-secondary"
                />
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {avatarFileName || 'Optional'}
                </p>
              </div>
              {avatarDataUrl ? (
                <button
                  type="button"
                  onClick={() => {
                    setAvatarDataUrl(null)
                    setAvatarFileName('')
                  }}
                  className="rounded-md border border-border px-2 py-1 text-xs text-foreground/70 hover:border-border"
                >
                  Remove
                </button>
              ) : null}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-foreground/70">
              <span className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" /> Display Name
              </span>
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Balaji Degala"
              className="w-full rounded-md border border-border bg-accent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-foreground/70">
              <span className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" /> Email
              </span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="balajid@d2.com"
              className="w-full rounded-md border border-border bg-accent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-foreground/70">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 6 characters"
              className="w-full rounded-md border border-border bg-accent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground/70">Department</label>
              <input
                type="text"
                value={departmentName}
                onChange={(e) => setDepartmentName(e.target.value)}
                placeholder="e.g. Pipeline TD"
                className="w-full rounded-md border border-border bg-accent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground/70">
                <span className="flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5" /> Role
                </span>
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-md border border-border bg-accent px-3 py-2 text-sm text-foreground focus:border-primary/50 focus:outline-none"
              >
                <option value="member">Member</option>
                <option value="beta">Beta</option>
                <option value="alpha">Alpha</option>
              </select>
            </div>
          </div>

          <div className="rounded-md border border-border bg-card/40 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-foreground/80">Projects</p>
              <span className="text-xs text-muted-foreground">
                {Object.keys(projectAccess).length} selected
              </span>
            </div>

            {projects.length === 0 ? (
              <p className="text-sm text-muted-foreground">No projects available to assign.</p>
            ) : (
              <div className="max-h-44 space-y-2 overflow-y-auto pr-1">
                {projects.map((project) => {
                  const checked = Boolean(projectAccess[project.id])
                  const selectedRole = projectAccess[project.id] || 'member'
                  return (
                    <div
                      key={project.id}
                      className="grid grid-cols-[1fr_110px] items-center gap-2 rounded-md border border-border bg-card px-2 py-1.5"
                    >
                      <label className="flex items-center gap-2 text-sm text-foreground/80">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => toggleProjectAccess(project.id, e.target.checked)}
                          className="h-4 w-4 rounded border border-border bg-card"
                        />
                        <span>{projectDisplayName(project)}</span>
                      </label>

                      <select
                        value={selectedRole}
                        disabled={!checked}
                        onChange={(e) => setProjectRole(project.id, e.target.value)}
                        className="rounded-md border border-border bg-accent px-2 py-1 text-xs text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {PROJECT_ROLE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            onClick={handleCreate}
            disabled={isCreating || !email.trim() || !password.trim() || !displayName.trim()}
            className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-black transition hover:bg-primary disabled:opacity-50"
          >
            {isCreating ? 'Creating...' : 'Create User'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function EditUserDialog({
  open,
  onOpenChange,
  onSaved,
  user,
  departments,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void | Promise<void>
  user: any | null
  departments: DepartmentOption[]
}) {
  const [displayName, setDisplayName] = useState('')
  const [firstname, setFirstname] = useState('')
  const [lastname, setLastname] = useState('')
  const [role, setRole] = useState('member')
  const [departmentId, setDepartmentId] = useState('')
  const [active, setActive] = useState(true)
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null)
  const [fileName, setFileName] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setDisplayName(user?.display_name || '')
    setFirstname(user?.firstname || '')
    setLastname(user?.lastname || '')
    setRole(user?.role || 'member')
    setDepartmentId(
      user?.department_id === null || user?.department_id === undefined
        ? ''
        : String(user.department_id)
    )
    setActive(Boolean(user?.active))
    setAvatarDataUrl(user?.avatar_url || null)
    setFileName('')
    setError('')
    setIsSaving(false)
  }, [open, user?.id, user?.avatar_url, user?.department_id, user?.active, user?.role])

  async function handleAvatarSelect(file: File | null) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Avatar must be an image file')
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      setError('Avatar image is too large (max 8MB before compression)')
      return
    }

    try {
      const optimized = await optimizeAvatarDataUrl(file)
      setAvatarDataUrl(optimized)
      setFileName(file.name)
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to process avatar')
    }
  }

  async function handleSave() {
    if (!user?.id) return
    if (!displayName.trim()) {
      setError('Display name is required')
      return
    }

    const parsedDepartmentId =
      departmentId.trim() === '' ? null : Number.parseInt(departmentId, 10)
    if (
      parsedDepartmentId !== null &&
      (Number.isNaN(parsedDepartmentId) || parsedDepartmentId <= 0)
    ) {
      setError('Invalid department selection')
      return
    }

    setIsSaving(true)
    setError('')

    const result = await updateProfile(user.id, {
      display_name: displayName.trim(),
      firstname: firstname.trim() || null,
      lastname: lastname.trim() || null,
      avatar_url: avatarDataUrl || null,
      department_id: parsedDepartmentId,
      role,
      active,
    })
    setIsSaving(false)

    if (result.error) {
      setError(result.error)
      return
    }

    if (result.data?.id) {
      window.dispatchEvent(
        new CustomEvent('kong:profile-updated', {
          detail: result.data,
        })
      )
    }

    await onSaved()
    onOpenChange(false)
  }

  const userName =
    user?.display_name ||
    `${user?.firstname || ''} ${user?.lastname || ''}`.trim() ||
    user?.email ||
    'User'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-hidden border-border bg-card sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Pencil className="h-5 w-5" />
            Edit User
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Update profile details for {userName}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 overflow-y-auto pr-1">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground/70">Email</label>
            <input
              type="text"
              value={user?.email || ''}
              disabled
              className="w-full rounded-md border border-border bg-accent px-3 py-2 text-sm text-muted-foreground"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground/70">First Name</label>
              <input
                type="text"
                value={firstname}
                onChange={(e) => setFirstname(e.target.value)}
                className="w-full rounded-md border border-border bg-accent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground/70">Last Name</label>
              <input
                type="text"
                value={lastname}
                onChange={(e) => setLastname(e.target.value)}
                className="w-full rounded-md border border-border bg-accent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-foreground/70">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-md border border-border bg-accent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground/70">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-md border border-border bg-accent px-3 py-2 text-sm text-foreground focus:border-primary/50 focus:outline-none"
              >
                <option value="member">Member</option>
                <option value="beta">Beta</option>
                <option value="alpha">Alpha</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground/70">Status</label>
              <select
                value={active ? 'active' : 'inactive'}
                onChange={(e) => setActive(e.target.value === 'active')}
                className="w-full rounded-md border border-border bg-accent px-3 py-2 text-sm text-foreground focus:border-primary/50 focus:outline-none"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-foreground/70">Department</label>
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="w-full rounded-md border border-border bg-accent px-3 py-2 text-sm text-foreground focus:border-primary/50 focus:outline-none"
            >
              <option value="">None</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name || department.code || `Department ${department.id}`}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3 rounded-md border border-border bg-card/40 p-3">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-accent">
              {avatarDataUrl ? (
                <img src={avatarDataUrl} alt="" className="h-16 w-16 object-cover" />
              ) : (
                <User className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => void handleAvatarSelect(e.target.files?.[0] || null)}
                className="w-full text-xs text-foreground/70 file:mr-3 file:rounded file:border-0 file:bg-accent file:px-2 file:py-1 file:text-xs file:text-foreground/80 hover:file:bg-secondary"
              />
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {fileName || 'JPEG/PNG/WebP accepted'}
              </p>
            </div>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setAvatarDataUrl(null)}
              className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs text-foreground/70 transition hover:border-border"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remove Avatar
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenChange(false)}
                className="rounded-md border border-border px-3 py-1.5 text-sm text-foreground/80 transition hover:border-border"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-black transition hover:bg-primary disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ManageProjectAccessDialog({
  open,
  onOpenChange,
  onSaved,
  user,
  projects,
  memberships,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void | Promise<void>
  user: any | null
  projects: ProjectOption[]
  memberships: ProjectMembership[]
}) {
  const [projectAccess, setProjectAccess] = useState<Record<number, ProjectRole>>({})
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    const next: Record<number, ProjectRole> = {}
    for (const membership of memberships || []) {
      const projectId = Number(membership.project_id)
      if (Number.isNaN(projectId)) continue
      next[projectId] = normalizeProjectRole(membership.role)
    }
    setProjectAccess(next)
    setError('')
    setIsSaving(false)
  }, [open, memberships, user?.id])

  function toggleProjectAccess(projectId: number, checked: boolean) {
    setProjectAccess((prev) => {
      const next = { ...prev }
      if (!checked) {
        delete next[projectId]
        return next
      }
      next[projectId] = next[projectId] || 'member'
      return next
    })
  }

  function setProjectRole(projectId: number, nextRole: string) {
    const roleValue = normalizeProjectRole(nextRole)
    setProjectAccess((prev) => ({
      ...prev,
      [projectId]: roleValue,
    }))
  }

  async function handleSave() {
    if (!user?.id) return
    setIsSaving(true)
    setError('')

    const rows = Object.entries(projectAccess).map(([projectId, role]) => ({
      project_id: Number(projectId),
      role,
    }))

    const result = await setUserProjectAccess(user.id, rows)
    setIsSaving(false)

    if (result.error) {
      setError(result.error)
      return
    }

    await onSaved()
    onOpenChange(false)
  }

  const userName =
    user?.display_name ||
    `${user?.firstname || ''} ${user?.lastname || ''}`.trim() ||
    user?.email ||
    'User'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-hidden border-border bg-card sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <KeyRound className="h-5 w-5" />
            Manage Project Access
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Assign shows/projects for {userName}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 overflow-y-auto pr-1">
          <div className="rounded-md border border-border bg-card/40 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-foreground/80">Projects</p>
              <span className="text-xs text-muted-foreground">
                {Object.keys(projectAccess).length} selected
              </span>
            </div>

            {projects.length === 0 ? (
              <p className="text-sm text-muted-foreground">No projects available.</p>
            ) : (
              <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                {projects.map((project) => {
                  const checked = Boolean(projectAccess[project.id])
                  const selectedRole = projectAccess[project.id] || 'member'
                  return (
                    <div
                      key={project.id}
                      className="grid grid-cols-[1fr_110px] items-center gap-2 rounded-md border border-border bg-card px-2 py-1.5"
                    >
                      <label className="flex items-center gap-2 text-sm text-foreground/80">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => toggleProjectAccess(project.id, e.target.checked)}
                          className="h-4 w-4 rounded border border-border bg-card"
                        />
                        <span>{projectDisplayName(project)}</span>
                      </label>

                      <select
                        value={selectedRole}
                        disabled={!checked}
                        onChange={(e) => setProjectRole(project.id, e.target.value)}
                        className="rounded-md border border-border bg-accent px-2 py-1 text-xs text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {PROJECT_ROLE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => onOpenChange(false)}
              className="rounded-md border border-border px-3 py-2 text-sm text-foreground/80 transition hover:border-border"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-black transition hover:bg-primary disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Access'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
