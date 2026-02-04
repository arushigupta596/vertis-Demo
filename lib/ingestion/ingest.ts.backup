import { db } from "../db/supabase-adapter";
import type { documents, textChunks, tables, tableRows, ingestionLogs } from "../db/schema";
import { extractTextFromPDF, chunkText } from "./text-extraction";
import { extractTablesFromPDF } from "./table-extraction";
import { generateEmbedding } from "../openrouter";
import { eq } from "drizzle-orm";

export interface IngestionOptions {
  generateEmbeddings?: boolean;
  contextLines?: { above: number; below: number };
}

/**
 * Main ingestion function: processes a PDF and stores everything in the database
 */
export async function ingestDocument(
  filePath: string,
  metadata: {
    fileName: string;
    displayName: string;
    date: Date;
    tags: string[];
    category: string;
  },
  options: IngestionOptions = {}
): Promise<{ documentId: number; success: boolean; error?: string }> {
  const opts = {
    generateEmbeddings: options.generateEmbeddings ?? true,
    contextLines: options.contextLines ?? { above: 3, below: 3 },
  };

  try {
    // 1. Create document record
    const [doc] = await db
      .insert(documents)
      .values({
        fileName: metadata.fileName,
        displayName: metadata.displayName,
        date: metadata.date,
        tags: metadata.tags,
        category: metadata.category,
        filePath: filePath,
      })
      .returning();

    const documentId = doc.id;

    // Create ingestion log
    await db.insert(ingestionLogs).values({
      documentId,
      status: "processing",
      message: "Starting ingestion",
    });

    // 2. Extract text
    console.log(`[Ingest] Extracting text from ${metadata.fileName}...`);
    const { text, pageCount, pages } = await extractTextFromPDF(filePath);

    // Update page count
    await db.update(documents).set({ pageCount }).where(eq(documents.id, documentId));

    // 3. Chunk text
    console.log(`[Ingest] Chunking text...`);
    const chunks = chunkText(pages, { chunkSize: 500, overlap: 100 });

    // 4. Generate embeddings for chunks (if enabled)
    console.log(`[Ingest] Processing ${chunks.length} chunks...`);
    for (const chunk of chunks) {
      let embedding: number[] | undefined;

      if (opts.generateEmbeddings) {
        try {
          embedding = await generateEmbedding(chunk.text);
        } catch (err) {
          console.error(`Failed to generate embedding for chunk ${chunk.chunkIndex}:`, err);
          embedding = undefined;
        }
      }

      await db.insert(textChunks).values({
        documentId,
        documentName: metadata.displayName,
        page: chunk.page,
        chunkIndex: chunk.chunkIndex,
        text: chunk.text,
        startChar: chunk.startChar,
        endChar: chunk.endChar,
        embedding: embedding as any, // Drizzle typing for vector
      });
    }

    // 5. Extract tables using pdfplumber + Camelot
    console.log(`[Ingest] Extracting tables using pdfplumber + Camelot...`);
    const contextLinesCount = opts.contextLines.above; // Use 'above' as the count for both
    const extractedTables = await extractTablesFromPDF(filePath, documentId, contextLinesCount);

    console.log(`[Ingest] Found ${extractedTables.length} tables`);

    for (const table of extractedTables) {
      // Insert table metadata
      await db.insert(tables).values({
        tableId: table.tableId,
        documentId,
        documentName: metadata.displayName,
        page: table.page,
        tableIndexOnPage: table.tableIndexOnPage,
        tableName: table.tableName,
        unit: table.unit,
        periods: table.periods as any,
        rawTableGrid: table.rawTableGrid as any,
        contextAboveLines: table.contextAboveLines,
        contextBelowLines: table.contextBelowLines,
        confidence: table.confidence,
      });

      // Insert normalized rows
      for (const row of table.normalizedRows) {
        let embedding: number[] | undefined;

        if (opts.generateEmbeddings) {
          try {
            // Generate embedding for row label (helps with semantic search)
            embedding = await generateEmbedding(`${row.rowLabel}: ${row.columnLabel}`);
          } catch (err) {
            console.error(`Failed to generate embedding for table row:`, err);
            embedding = undefined;
          }
        }

        await db.insert(tableRows).values({
          tableId: table.tableId,
          documentId,
          documentName: metadata.displayName,
          page: table.page,
          tableName: table.tableName,
          rowLabel: row.rowLabel,
          columnLabel: row.columnLabel,
          period: row.period,
          value: row.value,
          numericValue: row.numericValue,
          unit: table.unit,
          rowIndex: row.rowIndex,
          columnIndex: row.columnIndex,
          embedding: embedding as any,
        });
      }
    }

    // 6. Mark ingestion as complete
    await db.insert(ingestionLogs).values({
      documentId,
      status: "completed",
      message: "Ingestion completed successfully",
      chunksExtracted: chunks.length,
      tablesExtracted: extractedTables.length,
      completedAt: new Date(),
    });

    console.log(`[Ingest] ✓ Completed for ${metadata.fileName}`);
    console.log(`  - ${chunks.length} text chunks`);
    console.log(`  - ${extractedTables.length} tables`);

    return { documentId, success: true };
  } catch (error) {
    console.error("[Ingest] Error:", error);

    // Log error
    try {
      await db.insert(ingestionLogs).values({
        documentId: undefined,
        status: "failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } catch (logError) {
      console.error("Failed to log ingestion error:", logError);
    }

    return {
      documentId: -1,
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
