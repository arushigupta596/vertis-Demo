import { pgTable, text, serial, timestamp, integer, real, jsonb, boolean, vector } from "drizzle-orm/pg-core";

// Documents table - stores PDF metadata
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  fileName: text("file_name").notNull(),
  displayName: text("display_name").notNull(),
  date: timestamp("date").notNull(),
  tags: text("tags").array().notNull().default([]),
  category: text("category").notNull(), // "Board Outcome" | "Financial Results" | etc.
  filePath: text("file_path").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  pageCount: integer("page_count"),
});

// Text chunks for factual Q&A
export const textChunks = pgTable("text_chunks", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").references(() => documents.id).notNull(),
  documentName: text("document_name").notNull(),
  page: integer("page").notNull(),
  chunkIndex: integer("chunk_index").notNull(),
  text: text("text").notNull(),
  startChar: integer("start_char"),
  endChar: integer("end_char"),
  embedding: vector("embedding", { dimensions: 1536 }), // OpenAI ada-002 or similar
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Tables extracted from PDFs
export const tables = pgTable("tables", {
  id: serial("id").primaryKey(),
  tableId: text("table_id").unique().notNull(), // format: doc{id}_p{page}_t{index}
  documentId: integer("document_id").references(() => documents.id).notNull(),
  documentName: text("document_name").notNull(),
  page: integer("page").notNull(),
  tableIndexOnPage: integer("table_index_on_page").notNull(),
  tableName: text("table_name"), // RATIOS | NDCF | DISTRIBUTION | P&L | UNKNOWN
  unit: text("unit"), // INR | ₹ millions | % | times
  periods: jsonb("periods").$type<string[]>(), // ["Quarter ended 31 Dec 2025", "Year-to-date", etc.]
  rawTableGrid: jsonb("raw_table_grid").$type<string[][]>(), // raw 2D array
  contextAboveLines: text("context_above_lines").array().notNull().default([]),
  contextBelowLines: text("context_below_lines").array().notNull().default([]),
  confidence: real("confidence"),
  extractedAt: timestamp("extracted_at").defaultNow().notNull(),
});

// Normalized table rows (long format for easy querying)
export const tableRows = pgTable("table_rows", {
  id: serial("id").primaryKey(),
  tableId: text("table_id").references(() => tables.tableId).notNull(),
  documentId: integer("document_id").references(() => documents.id).notNull(),
  documentName: text("document_name").notNull(),
  page: integer("page").notNull(),
  tableName: text("table_name"),
  rowLabel: text("row_label").notNull(), // e.g., "Debt service coverage ratio"
  columnLabel: text("column_label").notNull(), // e.g., "Quarter ended 31 Dec 2025"
  period: text("period"), // normalized period
  value: text("value").notNull(), // stored as text to preserve exact formatting
  numericValue: real("numeric_value"), // parsed numeric value if applicable
  unit: text("unit"),
  rowIndex: integer("row_index").notNull(),
  columnIndex: integer("column_index").notNull(),
  embedding: vector("embedding", { dimensions: 1536 }), // for semantic search over row labels
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Chat history (optional, for multi-turn conversations)
export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  role: text("role").notNull(), // "user" | "assistant"
  content: text("content").notNull(),
  metadata: jsonb("metadata").$type<{
    questionType?: "factual" | "financial";
    citations?: Array<{ docName: string; page: number; tableId?: string }>;
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Ingestion logs
export const ingestionLogs = pgTable("ingestion_logs", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").references(() => documents.id),
  status: text("status").notNull(), // "pending" | "processing" | "completed" | "failed"
  message: text("message"),
  chunksExtracted: integer("chunks_extracted"),
  tablesExtracted: integer("tables_extracted"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});
