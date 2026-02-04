#!/usr/bin/env node
/**
 * Test DATABASE_URL connection
 * Usage: node test-database-url.js
 */

const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });

const databaseUrl = process.env.DATABASE_URL;

console.log('🔍 Testing DATABASE_URL connection...\n');

if (!databaseUrl) {
  console.error('❌ DATABASE_URL is not set in .env.local');
  process.exit(1);
}

// Mask password in output
const maskedUrl = databaseUrl.replace(/:([^@]+)@/, ':****@');
console.log('URL:', maskedUrl);
console.log('');

async function testConnection() {
  try {
    const sql = neon(databaseUrl);

    console.log('⏳ Attempting to connect...');

    // Try a simple query
    const result = await sql`SELECT NOW() as current_time, version() as pg_version`;

    console.log('✅ Connection successful!\n');
    console.log('Server time:', result[0].current_time);
    console.log('PostgreSQL:', result[0].pg_version.split(' ').slice(0, 2).join(' '));
    console.log('');

    // Check for pgvector extension
    try {
      const ext = await sql`SELECT * FROM pg_extension WHERE extname = 'vector'`;
      if (ext.length > 0) {
        console.log('✅ pgvector extension is installed');
      } else {
        console.log('⚠️  pgvector extension not found - you need to enable it');
        console.log('   Run this SQL in Supabase: CREATE EXTENSION IF NOT EXISTS vector;');
      }
    } catch (err) {
      console.log('⚠️  Could not check for pgvector extension');
    }

    console.log('\n✅ DATABASE_URL is correctly configured!');
    console.log('\nYou can now run: npm run db:push');

  } catch (error) {
    console.error('❌ Connection failed!\n');

    if (error.message.includes('Tenant or user not found')) {
      console.error('Error: Tenant or user not found');
      console.error('\nThis usually means:');
      console.error('1. The database password is incorrect');
      console.error('2. The project reference is wrong');
      console.error('3. The connection string format is incorrect\n');
      console.error('💡 Solution:');
      console.error('Go to: https://supabase.com/dashboard/project/msjemxedaxqrxahbzthr/settings/database');
      console.error('Copy the connection string from "Connection string" → "URI" tab');
      console.error('Replace [YOUR-PASSWORD] with your actual database password');
      console.error('Add ?sslmode=require at the end\n');
    } else if (error.message.includes('ENOTFOUND')) {
      console.error('Error: Could not resolve hostname');
      console.error('\nThe database URL format is incorrect.');
      console.error('Make sure you copied the full connection string from Supabase.\n');
    } else {
      console.error('Error:', error.message);
      console.error('\nFull error:', error);
    }

    process.exit(1);
  }
}

testConnection();
