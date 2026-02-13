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

async function testComment() {
  console.log('Testing comment creation...\n')

  // Try to insert a test comment
  const { data, error } = await supabase
    .from('notes')
    .insert({
      entity_type: 'post',
      entity_id: 11, // Use a post ID that exists
      content: 'Test comment from script',
      author_id: 'eb0bdb87-6685-4dc3-a0d0-e16765c68242', // Use your user ID
      created_by: 'eb0bdb87-6685-4dc3-a0d0-e16765c68242',
      status: 'open',
    })
    .select()
    .single()

  if (error) {
    console.error('❌ Comment insert failed:', error.message)
    console.error('Details:', error)

    if (error.message.includes('violates check constraint')) {
      console.log('\n⚠️  The notes table entity_type constraint needs to be updated to include "post"')
      console.log('Run the pulse migration SQL to fix this.')
    }
  } else {
    console.log('✓ Comment created successfully:', data)

    // Clean up
    await supabase.from('notes').delete().eq('id', data.id)
    console.log('✓ Test comment deleted')
  }
}

testComment().catch(console.error)
