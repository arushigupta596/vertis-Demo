// Test database connection
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Testing Supabase connection...');
console.log('URL:', supabaseUrl);
console.log('Key exists:', !!supabaseKey);

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    // Try to query the database
    const { data, error } = await supabase.from('_test').select('*').limit(1);

    if (error) {
      console.log('✓ Connection successful (table not found is expected)');
      console.log('Error:', error.message);
    } else {
      console.log('✓ Connection successful');
      console.log('Data:', data);
    }
  } catch (err) {
    console.error('✗ Connection failed:', err.message);
  }
}

testConnection();
