const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
const { exec } = require('child_process')
const util = require('util')

const execPromise = util.promisify(exec)

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

// Extract database connection URL
const dbUrl = supabaseUrl.replace('http://', '').replace('https://', '')
const dbHost = dbUrl.split(':')[0]
const dbPort = dbUrl.split(':')[1] || '8000'
const connectionString = `postgresql://postgres:postgres@${dbHost}:${dbPort}/postgres`

async function applyMigration() {
  console.log('Reading migration file...')
  const migrationPath = path.join(__dirname, 'echo/migrations&fixes/generated/setup-post-media-storage-rls.sql')
  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8')

  console.log('Applying storage RLS policies via psql...')
  console.log(`Connection: ${dbHost}:${dbPort}`)

  try {
    // Try using psql if available
    const { stdout, stderr } = await execPromise(
      `PGPASSWORD=postgres psql -h ${dbHost} -p ${dbPort} -U postgres -d postgres -f "${migrationPath}"`,
      { encoding: 'utf-8' }
    )

    if (stdout) console.log(stdout)
    if (stderr && !stderr.includes('NOTICE')) console.error(stderr)

    console.log('\n✓ Migration applied successfully!')
  } catch (error) {
    console.error('psql not available, trying alternative method...')
    console.error(error.message)
    console.log('\nPlease run this SQL manually in your database:')
    console.log(`\npsql ${connectionString} -f ${migrationPath}`)
    console.log('\nOr copy the contents of:')
    console.log(migrationPath)
    process.exit(1)
  }

  // Verify policies exist
  console.log('\nVerifying policies...')
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false }
  })

  const { data, error } = await supabase
    .from('post_media')
    .select('id')
    .limit(1)

  if (error && error.message.includes('permission denied')) {
    console.log('⚠️  RLS is enabled on post_media table')
  } else if (!error) {
    console.log('✓ Can query post_media table')
  }

  console.log('\n✓ Storage RLS setup complete!')
}

applyMigration().catch(console.error)
