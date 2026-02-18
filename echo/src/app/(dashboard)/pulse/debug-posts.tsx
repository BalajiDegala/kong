'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

export function DebugPosts() {
  const [logs, setLogs] = useState<string[]>([])
  const [isRunning, setIsRunning] = useState(false)

  const addLog = (msg: string) => {
    console.log(msg)
    setLogs((prev) => [...prev, msg])
  }

  const runTests = async () => {
    setIsRunning(true)
    setLogs([])
    const supabase = createClient()

    addLog('🔍 Starting diagnostic tests...')

    // Test 1: Check auth
    addLog('\n1️⃣ Checking authentication...')
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) {
      addLog(`❌ Auth error: ${authError.message}`)
    } else if (!user) {
      addLog('❌ No user logged in')
    } else {
      addLog(`✅ Logged in as: ${user.email}`)
    }

    // Test 2: Count posts
    addLog('\n2️⃣ Counting posts...')
    const { count, error: countError } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })

    if (countError) {
      addLog(`❌ Count failed: ${countError.message}`)
      addLog(`   Code: ${countError.code}`)
      addLog(`   Details: ${countError.details}`)
      addLog(`   Hint: ${countError.hint}`)
    } else {
      addLog(`✅ Found ${count} posts in database`)
    }

    // Test 3: Simple select
    addLog('\n3️⃣ Simple query (no joins)...')
    const { data: simplePosts, error: simpleError } = await supabase
      .from('posts')
      .select('id, content, author_id, created_at')
      .limit(5)

    if (simpleError) {
      addLog(`❌ Query failed: ${simpleError.message}`)
      addLog(`   Code: ${simpleError.code}`)
    } else {
      addLog(`✅ Loaded ${simplePosts?.length || 0} posts`)
      simplePosts?.forEach((p) => {
        addLog(`   - Post ${p.id}: "${p.content?.substring(0, 40)}..."`)
      })
    }

    // Test 4: Query with post_media join
    addLog('\n4️⃣ Query with post_media join...')
    const { data: withMedia, error: mediaError } = await supabase
      .from('posts')
      .select('id, content, post_media(*)')
      .limit(3)

    if (mediaError) {
      addLog(`❌ Join failed: ${mediaError.message}`)
    } else {
      addLog(`✅ Join worked, loaded ${withMedia?.length || 0} posts`)
    }

    // Test 5: Query with post_reactions join
    addLog('\n5️⃣ Query with post_reactions join...')
    const { data: withReactions, error: reactionsError } = await supabase
      .from('posts')
      .select('id, content, post_reactions(reaction_type, user_id)')
      .limit(3)

    if (reactionsError) {
      addLog(`❌ Join failed: ${reactionsError.message}`)
    } else {
      addLog(`✅ Join worked, loaded ${withReactions?.length || 0} posts`)
    }

    // Test 6: Check junction tables
    addLog('\n6️⃣ Checking junction tables...')
    const tables = ['post_projects', 'post_sequences', 'post_shots', 'post_tasks', 'post_users']

    for (const table of tables) {
      const { count: tableCount, error: tableError } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })

      if (tableError) {
        addLog(`   ❌ ${table}: ${tableError.message}`)
      } else {
        addLog(`   ✅ ${table}: ${tableCount} rows`)
      }
    }

    addLog('\n✅ All tests complete!')
    setIsRunning(false)
  }

  return (
    <div className="p-6 bg-card border border-border rounded-lg">
      <h2 className="text-lg font-semibold text-foreground mb-4">🔧 Posts Debug Tool</h2>

      <Button onClick={runTests} disabled={isRunning} className="mb-4">
        {isRunning ? 'Running tests...' : 'Run Diagnostic Tests'}
      </Button>

      {logs.length > 0 && (
        <pre className="bg-background p-4 rounded text-xs text-foreground/70 overflow-auto max-h-[500px] font-mono whitespace-pre-wrap">
          {logs.join('\n')}
        </pre>
      )}
    </div>
  )
}
