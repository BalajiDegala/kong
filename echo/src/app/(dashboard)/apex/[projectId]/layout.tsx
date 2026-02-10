import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProjectTabs } from '@/components/layout/project-tabs'

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Get project info
  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single()

  if (!project) {
    redirect('/apex')
  }

  return (
    <div className="flex h-full flex-col">
      {/* Project Tabs */}
      <ProjectTabs projectId={projectId} projectName={project.name} />

      {/* Page Content */}
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  )
}
