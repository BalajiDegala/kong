'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function DebugPostData() {
  const [postData, setPostData] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => {
    loadLatestPost()
  }, [])

  const loadLatestPost = async () => {
    // Get latest post
    const { data: posts } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)

    if (!posts || posts.length === 0) {
      setPostData({ error: 'No posts found' })
      return
    }

    const post = posts[0]

    // Get junction data
    const [projectLinks, seqLinks, shotLinks, taskLinks] = await Promise.all([
      supabase.from('post_projects').select('*').eq('post_id', post.id).then(r => r.data || []),
      supabase.from('post_sequences').select('*').eq('post_id', post.id).then(r => r.data || []),
      supabase.from('post_shots').select('*').eq('post_id', post.id).then(r => r.data || []),
      supabase.from('post_tasks').select('*').eq('post_id', post.id).then(r => r.data || []),
    ])

    // Get entity details
    const projectIds = projectLinks.map(l => l.project_id)
    const seqIds = seqLinks.map(l => l.sequence_id)
    const shotIds = shotLinks.map(l => l.shot_id)
    const taskIds = taskLinks.map(l => l.task_id)

    const [projects, sequences, shots, tasks] = await Promise.all([
      projectIds.length > 0 ? supabase.from('projects').select('id, name').in('id', projectIds).then(r => r.data || []) : [],
      seqIds.length > 0 ? supabase.from('sequences').select('id, name, project_id').in('id', seqIds).then(r => r.data || []) : [],
      shotIds.length > 0 ? supabase.from('shots').select('id, name, sequence_id').in('id', shotIds).then(r => r.data || []) : [],
      taskIds.length > 0 ? supabase.from('tasks').select('id, name, entity_id, entity_type').in('id', taskIds).then(r => r.data || []) : [],
    ])

    setPostData({
      post,
      junctions: { projectLinks, seqLinks, shotLinks, taskLinks },
      entities: { projects, sequences, shots, tasks },
    })
  }

  if (!postData) return <div className="p-4 text-zinc-500">Loading...</div>

  return (
    <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg mb-4">
      <h3 className="text-sm font-semibold mb-2 text-zinc-300">🔍 Latest Post Debug Data</h3>
      <pre className="text-xs text-zinc-400 overflow-auto max-h-96 whitespace-pre-wrap">
        {JSON.stringify(postData, null, 2)}
      </pre>
    </div>
  )
}
