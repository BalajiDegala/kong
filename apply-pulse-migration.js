const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Read .env.local
const envPath = path.join(__dirname, 'echo', '.env.local')
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

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
})

async function applyMigration() {
  console.log('Reading migration file...')
  const migrationSQL = fs.readFileSync(path.join(__dirname, 'pulse-migration.sql'), 'utf-8')

  console.log('Applying migration...')
  console.log('Note: Using Supabase client to run SQL (may have limitations)')

  // Split by statement for better error handling
  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--'))

  console.log(`Found ${statements.length} SQL statements`)

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i]
    if (!stmt) continue

    try {
      console.log(`Executing statement ${i + 1}/${statements.length}...`)
      const { data, error } = await supabase.rpc('exec_sql', { sql: stmt + ';' })

      if (error) {
        console.error(`Error in statement ${i + 1}:`, error)
        console.error('Statement:', stmt.substring(0, 100) + '...')
      } else {
        console.log(`✓ Statement ${i + 1} executed successfully`)
      }
    } catch (err) {
      console.error(`Exception in statement ${i + 1}:`, err.message)
    }
  }

  console.log('\nMigration complete!')

  // Verify tables exist
  console.log('\nVerifying tables...')
  const tables = ['posts', 'post_media', 'post_reactions', 'annotations']
  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })

    if (error) {
      console.error(`✗ Table ${table} - Error: ${error.message}`)
    } else {
      console.log(`✓ Table ${table} exists (${count} rows)`)
    }
  }
}

applyMigration().catch(console.error)
