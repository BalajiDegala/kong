// Quick test to verify posts can be loaded
// Run this with: node test-posts-query.js

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://10.100.222.197:8000'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ewogICAgInJvbGUiOiAiYW5vbiIsCiAgICAiaXNzIjogInN1cGFiYXNlIiwKICAgICJpYXQiOiAxNzM1NTU4ODAwLAogICAgImV4cCI6IDE4OTMzMjUyMDAKfQ.Y8v5doKC0yH_Huh3Z0uqZ7OehxdlVl2n6KgU-P7EDNs'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testQueries() {
  console.log('\n=== Testing Posts Queries ===\n')

  // Test 1: Count posts
  console.log('1. Counting posts...')
  const { count, error: countError } = await supabase
    .from('posts')
    .select('*', { count: 'exact', head: true })

  if (countError) {
    console.error('   ❌ Count failed:', countError.message)
  } else {
    console.log(`   ✅ Found ${count} posts`)
  }

  // Test 2: Simple select
  console.log('\n2. Simple select (no joins)...')
  const { data: simplePosts, error: simpleError } = await supabase
    .from('posts')
    .select('id, content, created_at, author_id')
    .limit(5)

  if (simpleError) {
    console.error('   ❌ Simple query failed:', simpleError.message)
  } else {
    console.log(`   ✅ Loaded ${simplePosts.length} posts`)
    simplePosts.forEach(p => {
      console.log(`      - Post ${p.id}: "${p.content?.substring(0, 50)}..."`)
    })
  }

  // Test 3: With joins
  console.log('\n3. Query with joins...')
  const { data: joinedPosts, error: joinError } = await supabase
    .from('posts')
    .select(`
      *,
      post_media(*),
      post_reactions(reaction_type, user_id)
    `)
    .limit(3)

  if (joinError) {
    console.error('   ❌ Join query failed:', joinError.message)
    console.error('      Details:', joinError.details)
    console.error('      Hint:', joinError.hint)
  } else {
    console.log(`   ✅ Loaded ${joinedPosts.length} posts with joins`)
  }

  // Test 4: Check if junction tables exist
  console.log('\n4. Checking junction tables...')
  const tables = ['post_projects', 'post_sequences', 'post_shots', 'post_tasks', 'post_users']

  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })

    if (error) {
      console.log(`   ❌ ${table}: Does not exist or RLS blocks access`)
    } else {
      console.log(`   ✅ ${table}: ${count} rows`)
    }
  }

  console.log('\n=== Test Complete ===\n')
}

testQueries().catch(console.error)
