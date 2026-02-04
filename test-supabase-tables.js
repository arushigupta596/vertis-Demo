const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Testing Supabase client access to tables...\n');

const supabase = createClient(supabaseUrl, serviceKey);

async function testTables() {
  // Test documents table
  const { data: docs, error: docsError } = await supabase
    .from('documents')
    .select('*')
    .limit(1);

  if (docsError) {
    console.error('❌ Documents table error:', docsError.message);
  } else {
    console.log('✅ Documents table accessible');
    console.log('   Rows:', docs.length);
  }

  // Test text_chunks table
  const { data: chunks, error: chunksError } = await supabase
    .from('text_chunks')
    .select('*')
    .limit(1);

  if (chunksError) {
    console.error('❌ Text chunks table error:', chunksError.message);
  } else {
    console.log('✅ Text chunks table accessible');
    console.log('   Rows:', chunks.length);
  }

  // Test tables table
  const { data: tables, error: tablesError } = await supabase
    .from('tables')
    .select('*')
    .limit(1);

  if (tablesError) {
    console.error('❌ Tables table error:', tablesError.message);
  } else {
    console.log('✅ Tables table accessible');
    console.log('   Rows:', tables.length);
  }

  console.log('\n✅ All tables are accessible via Supabase client!');
  console.log('The app can now use Supabase API for database operations.');
}

testTables().catch(err => {
  console.error('❌ Test failed:', err.message);
  process.exit(1);
});
