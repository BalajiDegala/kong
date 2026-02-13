const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Read .env.local
const envPath = path.join(__dirname, '.env.local')
const envContent = fs.readFileSync(envPath, 'utf-8')
const env = {}
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/)
  if (match) {
    env[match[1].trim()] = match[2].trim()
  }
})

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
})

async function verify() {
  console.log('Checking Pulse tables...\n')

  const tables = ['posts', 'post_media', 'post_reactions', 'annotations']

  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })

    if (error) {
      console.log(`✗ ${table}: ${error.message}`)
    } else {
      console.log(`✓ ${table}: exists with ${count} rows`)
    }
  }

  console.log('\nTrying to insert a test post...')

  // Get current user (will fail without auth)
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    console.log('Not authenticated. Trying service role insert...')

    // Try direct insert with service role
    const { data, error } = await supabase
      .from('posts')
      .insert({
        author_id: '00000000-0000-0000-0000-000000000000', // dummy UUID
        content: 'Test post from verification script',
        visibility: 'global'
      })
      .select()

    if (error) {
      console.error('Insert failed:', error.message)
    } else {
      console.log('Insert successful:', data)

      // Clean up
      if (data && data[0]) {
        await supabase.from('posts').delete().eq('id', data[0].id)
        console.log('Test post deleted')
      }
    }
  } else {
    console.log('Authenticated as:', user.id)

    const { data, error } = await supabase
      .from('posts')
      .insert({
        author_id: user.id,
        content: 'Test post from verification script',
        visibility: 'global'
      })
      .select()

    if (error) {
      console.error('Insert failed:', error.message)
    } else {
      console.log('Insert successful:', data)

      // Clean up
      if (data && data[0]) {
        await supabase.from('posts').delete().eq('id', data[0].id)
        console.log('Test post deleted')
      }
    }
  }
}

verify().catch(console.error)
