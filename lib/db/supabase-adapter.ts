/**
 * Supabase Database Adapter
 * Uses Supabase client instead of direct PostgreSQL connection
 * This bypasses connection pooler authentication issues
 */

import { supabaseAdmin } from "../supabase";
import type { documents, textChunks, tables, tableRows, chatMessages, ingestionLogs } from "./schema";
import type { SupabaseClient } from "@supabase/supabase-js";

// Use supabaseAdmin directly (it's a lazy-loading Proxy)
// Cast to SupabaseClient to help TypeScript infer types
const client = supabaseAdmin as unknown as SupabaseClient<any>;

// Helper to convert Drizzle insert objects to Supabase format
type InsertDocument = typeof documents.$inferInsert;
type InsertTextChunk = typeof textChunks.$inferInsert;
type InsertTable = typeof tables.$inferInsert;
type InsertTableRow = typeof tableRows.$inferInsert;
type InsertChatMessage = typeof chatMessages.$inferInsert;
type InsertIngestionLog = typeof ingestionLogs.$inferInsert;

// Database row types
type DocumentRow = {
  id: number;
  file_name: string;
  display_name: string;
  date: string;
  tags: string[];
  category: string;
  file_path: string;
  page_count: number;
  uploaded_at: string;
};

type TextChunkRow = {
  id: number;
  document_id: number;
  page: number;
  chunk_index: number;
  text: string;
  start_char: number;
  end_char: number;
  embedding: string | null;
  created_at: string;
};

type TableRow = {
  id: number;
  table_id: string;
  document_id: number;
  document_name: string | null;
  page: number;
  table_index_on_page: number;
  context_above_lines: string[];
  context_below_lines: string[];
  table_name: string | null;
  confidence: number;
  created_at: string;
};

type TableRowRow = {
  id: number;
  table_id: string;
  document_id: number;
  document_name: string | null;
  page: number;
  table_name: string | null;
  row_label: string;
  column_label: string;
  period: string | null;
  value: string;
  numeric_value: number | null;
  unit: string | null;
  row_index: number;
  column_index: number;
  embedding: string | null;
  created_at: string;
};

type ChatMessageRow = {
  id: number;
  session_id: string;
  role: string;
  content: string;
  metadata: any;
  created_at: string;
};

type IngestionLogRow = {
  id: number;
  document_id: number;
  status: string;
  message: string;
  chunks_extracted: number | null;
  tables_extracted: number | null;
  created_at: string;
};

export const db = {
  // Documents
  async insertDocument(data: InsertDocument) {
    const { data: result, error } = await client
      .from("documents")
      .insert({
        file_name: data.fileName,
        display_name: data.displayName,
        date: data.date,
        tags: data.tags || [],
        category: data.category,
        file_path: data.filePath,
        page_count: data.pageCount,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to insert document: ${error.message}`);
    return result as DocumentRow;
  },

  async getDocuments() {
    const { data, error } = await client
      .from("documents")
      .select("*");
    if (error) throw new Error(`Failed to get documents: ${error.message}`);
    return data as DocumentRow[];
  },

  // Text Chunks
  async insertTextChunks(chunks: InsertTextChunk[]) {
    const formattedChunks = chunks.map((chunk) => ({
      document_id: chunk.documentId,
      page: chunk.page,
      chunk_index: chunk.chunkIndex,
      text: chunk.text,
      start_char: chunk.startChar,
      end_char: chunk.endChar,
      embedding: chunk.embedding ? `[${chunk.embedding.join(",")}]` : null,
    }));

    const { data, error } = await client
      .from("text_chunks")
      .insert(formattedChunks)
      .select();

    if (error) throw new Error(`Failed to insert text chunks: ${error.message}`);
    return data as TextChunkRow[];
  },

  // Tables
  async insertTable(tableData: InsertTable) {
    const { data, error } = await client
      .from("tables")
      .insert({
        table_id: tableData.tableId,
        document_id: tableData.documentId,
        document_name: tableData.documentName,
        page: tableData.page,
        table_index_on_page: tableData.tableIndexOnPage,
        context_above_lines: tableData.contextAboveLines || [],
        context_below_lines: tableData.contextBelowLines || [],
        table_name: tableData.tableName,
        confidence: tableData.confidence,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to insert table: ${error.message}`);
    return data as TableRow;
  },

  // Table Rows
  async insertTableRows(rows: InsertTableRow[]) {
    const formattedRows = rows.map((row) => ({
      table_id: row.tableId,
      document_id: row.documentId,
      document_name: row.documentName,
      page: row.page,
      table_name: row.tableName,
      row_label: row.rowLabel,
      column_label: row.columnLabel,
      period: row.period,
      value: row.value,
      numeric_value: row.numericValue,
      unit: row.unit,
      row_index: row.rowIndex,
      column_index: row.columnIndex,
      embedding: row.embedding ? `[${row.embedding.join(",")}]` : null,
    }));

    const { data, error } = await client
      .from("table_rows")
      .insert(formattedRows)
      .select();

    if (error) throw new Error(`Failed to insert table rows: ${error.message}`);
    return data as TableRowRow[];
  },

  // Chat Messages
  async insertChatMessage(message: InsertChatMessage) {
    const { data, error } = await client
      .from("chat_messages")
      .insert({
        session_id: message.sessionId,
        role: message.role,
        content: message.content,
        metadata: message.metadata,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to insert chat message: ${error.message}`);
    return data as ChatMessageRow;
  },

  async getChatMessages(sessionId: string) {
    const { data, error } = await client
      .from("chat_messages")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (error) throw new Error(`Failed to get chat messages: ${error.message}`);
    return data as ChatMessageRow[];
  },

  // Ingestion Logs
  async insertIngestionLog(log: InsertIngestionLog) {
    const { data, error } = await client
      .from("ingestion_logs")
      .insert({
        document_id: log.documentId,
        status: log.status,
        message: log.message,
        chunks_extracted: log.chunksExtracted,
        tables_extracted: log.tablesExtracted,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to insert ingestion log: ${error.message}`);
    return data as IngestionLogRow;
  },

  // Vector Search
  async searchTextChunks(embedding: number[], limit: number = 5) {
    const embeddingStr = `[${embedding.join(",")}]`;

    const { data, error } = await client.rpc("match_text_chunks", {
      query_embedding: embeddingStr,
      match_count: limit,
    });

    if (error) {
      // If RPC doesn't exist, fall back to regular query
      const { data: fallbackData, error: fallbackError } = await client
        .from("text_chunks")
        .select("*")
        .limit(limit);

      if (fallbackError)
        throw new Error(`Failed to search text chunks: ${fallbackError.message}`);
      return fallbackData as TextChunkRow[];
    }

    return data as TextChunkRow[];
  },

  async searchTableRows(embedding: number[], limit: number = 5) {
    const embeddingStr = `[${embedding.join(",")}]`;

    const { data, error } = await client.rpc("match_table_rows", {
      query_embedding: embeddingStr,
      match_count: limit,
    });

    if (error) {
      // If RPC doesn't exist, fall back to regular query
      const { data: fallbackData, error: fallbackError } = await client
        .from("table_rows")
        .select("*")
        .limit(limit);

      if (fallbackError)
        throw new Error(`Failed to search table rows: ${fallbackError.message}`);
      return fallbackData as TableRowRow[];
    }

    return data as TableRowRow[];
  },
};
