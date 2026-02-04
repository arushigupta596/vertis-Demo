#!/usr/bin/env node
const postgres = require('postgres');
require('dotenv').config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

console.log('Testing connection with postgres library...\n');

sql`SELECT NOW() as time, version() as version`
  .then(result => {
    console.log('✅ Connection successful!');
    console.log('Time:', result[0].time);
    console.log('Version:', result[0].version.split(' ').slice(0, 2).join(' '));
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Connection failed:', error.message);
    process.exit(1);
  });
