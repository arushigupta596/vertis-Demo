-- Vertis Document Chat - Database Setup Script
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/msjemxedaxqrxahbzthr/sql/new

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
  id SERIAL PRIMARY KEY,
  file_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  date TIMESTAMP NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  category TEXT NOT NULL,
  file_path TEXT NOT NULL,
  uploaded_at TIMESTAMP DEFAULT NOW(),
  page_count INTEGER
);

-- Create text_chunks table
CREATE TABLE IF NOT EXISTS text_chunks (
  id SERIAL PRIMARY KEY,
  document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  page INTEGER NOT NULL,
  chunk_index INTEGER NOT NULL,
  text TEXT NOT NULL,
  start_char INTEGER,
  end_char INTEGER,
  embedding vector(1536),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create tables table
CREATE TABLE IF NOT EXISTS tables (
  id SERIAL PRIMARY KEY,
  table_id TEXT UNIQUE NOT NULL,
  document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  page INTEGER NOT NULL,
  table_index INTEGER NOT NULL,
  context_above_lines TEXT[] NOT NULL DEFAULT '{}',
  context_below_lines TEXT[] NOT NULL DEFAULT '{}',
  table_name TEXT,
  table_type TEXT,
  confidence REAL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create table_rows table
CREATE TABLE IF NOT EXISTS table_rows (
  id SERIAL PRIMARY KEY,
  table_id TEXT NOT NULL REFERENCES tables(table_id) ON DELETE CASCADE,
  row_index INTEGER NOT NULL,
  cells JSONB NOT NULL,
  raw_text TEXT,
  embedding vector(1536),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id SERIAL PRIMARY KEY,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create ingestion_logs table
CREATE TABLE IF NOT EXISTS ingestion_logs (
  id SERIAL PRIMARY KEY,
  document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  message TEXT,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_text_chunks_document ON text_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_text_chunks_page ON text_chunks(page);
CREATE INDEX IF NOT EXISTS idx_tables_document ON tables(document_id);
CREATE INDEX IF NOT EXISTS idx_tables_page ON tables(page);
CREATE INDEX IF NOT EXISTS idx_table_rows_table ON table_rows(table_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_ingestion_logs_document ON ingestion_logs(document_id);

-- Create vector similarity search indexes (these may take a moment if tables have data)
CREATE INDEX IF NOT EXISTS idx_text_chunks_embedding ON text_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_table_rows_embedding ON table_rows USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
