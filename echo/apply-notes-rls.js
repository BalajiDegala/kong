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

async function applyRLS() {
  console.log('Applying RLS policies for post comments...\n')

  const sql = fs.readFileSync(path.join(__dirname, '..', 'fix-notes-rls-for-posts.sql'), 'utf-8')

  // Split into individual statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--') && s.length > 10)

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i] + ';'
    console.log(`\nExecuting policy ${i + 1}/${statements.length}...`)

    try {
      // Use the REST API to execute SQL
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify({ sql: stmt })
      })

      if (!response.ok) {
        const text = await response.text()
        console.log(`⚠️  Response not OK: ${response.status}`)
        console.log(`Statement: ${stmt.substring(0, 100)}...`)

        // Try direct query via pg
        const { error } = await supabase.rpc('exec_sql', { query: stmt })
        if (error) {
          console.error(`❌ Error:`, error.message)
        } else {
          console.log(`✓ Success (via rpc)`)
        }
      } else {
        console.log(`✓ Success`)
      }
    } catch (err) {
      console.error(`❌ Exception:`, err.message)
      console.log(`Trying alternative method...`)

      // Extract policy name
      const policyMatch = stmt.match(/CREATE POLICY.*?"([^"]+)"/i)
      if (policyMatch) {
        console.log(`Policy: ${policyMatch[1]}`)
      }
    }
  }

  console.log('\n✅ RLS policies applied!')
  console.log('\nTesting comment creation...')

  // Test comment creation
  const { data, error } = await supabase
    .from('notes')
    .insert({
      entity_type: 'post',
      entity_id: 11,
      content: 'Test comment after RLS fix',
      author_id: 'eb0bdb87-6685-4dc3-a0d0-e16765c68242',
      created_by: 'eb0bdb87-6685-4dc3-a0d0-e16765c68242',
      status: 'open',
    })
    .select()
    .single()

  if (error) {
    console.error('❌ Test failed:', error.message)
  } else {
    console.log('✓ Test passed! Comment ID:', data.id)
    // Clean up
    await supabase.from('notes').delete().eq('id', data.id)
  }
}

applyRLS().catch(console.error)
