/**
 * Document Ingestion using Supabase Client
 * This version uses the Supabase API instead of direct PostgreSQL connection
 */

import { supabaseAdmin } from "../supabase";
import { extractTextFromPDF, chunkText } from "./text-extraction";
import { extractTablesFromPDF } from "./table-extraction";
import { generateEmbedding } from "../openrouter";

if (!supabaseAdmin) {
  throw new Error("Supabase admin client is not initialized");
}

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
    console.log(`[Ingest] Starting ingestion for ${metadata.fileName}`);

    // 1. Check if document already exists
    const { data: existingDoc } = await supabaseAdmin
      .from("documents")
      .select("id, display_name")
      .eq("file_name", metadata.fileName)
      .single();

    if (existingDoc) {
      console.log(`[Ingest] ⚠️  Document already exists: ${existingDoc.display_name} (ID: ${existingDoc.id})`);
      console.log(`[Ingest] Skipping duplicate ingestion`);
      return {
        documentId: existingDoc.id,
        success: true,
        error: "Document already ingested (skipped duplicate)",
      };
    }

    // 2. Create document record
    const { data: doc, error: docError } = await supabaseAdmin
      .from("documents")
      .insert({
        file_name: metadata.fileName,
        display_name: metadata.displayName,
        date: metadata.date.toISOString(),
        tags: metadata.tags,
        category: metadata.category,
        file_path: filePath,
      })
      .select()
      .single();

    if (docError) {
      throw new Error(`Failed to create document: ${docError.message}`);
    }

    const documentId = doc.id;
    console.log(`[Ingest] Created document with ID: ${documentId}`);

    // Create ingestion log
    await supabaseAdmin.from("ingestion_logs").insert({
      document_id: documentId,
      status: "processing",
      message: "Starting ingestion",
    });

    // 3. Extract text
    console.log(`[Ingest] Extracting text from ${metadata.fileName}...`);
    const { text, pageCount, pages } = await extractTextFromPDF(filePath);

    // Update page count
    await supabaseAdmin
      .from("documents")
      .update({ page_count: pageCount })
      .eq("id", documentId);

    // 4. Chunk text
    console.log(`[Ingest] Chunking text...`);
    const chunks = chunkText(pages, { chunkSize: 500, overlap: 100 });

    // 5. Generate embeddings for chunks (if enabled)
    console.log(`[Ingest] Processing ${chunks.length} chunks...`);
    const chunksToInsert = [];

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

      chunksToInsert.push({
        document_id: documentId,
        page: chunk.page,
        chunk_index: chunk.chunkIndex,
        text: chunk.text,
        start_char: chunk.startChar,
        end_char: chunk.endChar,
        embedding: embedding ? `[${embedding.join(",")}]` : null,
      });

      // Insert in batches of 50
      if (chunksToInsert.length >= 50) {
        const { error } = await supabaseAdmin.from("text_chunks").insert(chunksToInsert);
        if (error) {
          console.error("Failed to insert text chunks:", error.message);
        }
        chunksToInsert.length = 0; // Clear array
      }
    }

    // Insert remaining chunks
    if (chunksToInsert.length > 0) {
      const { error } = await supabaseAdmin.from("text_chunks").insert(chunksToInsert);
      if (error) {
        console.error("Failed to insert text chunks:", error.message);
      }
    }

    console.log(`[Ingest] Inserted ${chunks.length} text chunks`);

    // 6. Extract tables using pdfplumber + Camelot
    console.log(`[Ingest] Extracting tables using pdfplumber + Camelot...`);
    const contextLinesCount = opts.contextLines.above;
    const extractedTables = await extractTablesFromPDF(filePath, documentId, contextLinesCount);

    console.log(`[Ingest] Found ${extractedTables.length} tables`);

    for (const table of extractedTables) {
      // Insert table metadata
      const { data: insertedTable, error: tableError } = await supabaseAdmin
        .from("tables")
        .insert({
          table_id: table.tableId,
          document_id: documentId,
          page: table.page,
          table_index: table.tableIndexOnPage,
          context_above_lines: table.contextAboveLines || [],
          context_below_lines: table.contextBelowLines || [],
          table_name: table.tableName,
          table_type: null, // Will be added from table classification later
          confidence: table.confidence,
        })
        .select()
        .single();

      if (tableError) {
        console.error(`Failed to insert table ${table.tableId}:`, tableError.message);
        continue;
      }

      // Insert table rows from rawTableGrid
      const rowsToInsert = [];

      if (table.rawTableGrid && table.rawTableGrid.length > 0) {
        for (let rowIndex = 0; rowIndex < table.rawTableGrid.length; rowIndex++) {
          const rowCells = table.rawTableGrid[rowIndex];
          const rowText = rowCells.join(" | ");

          let rowEmbedding: number[] | undefined;

          if (opts.generateEmbeddings && rowText.trim().length > 0) {
            try {
              rowEmbedding = await generateEmbedding(rowText);
            } catch (err) {
              console.error(`Failed to generate embedding for table row:`, err);
              rowEmbedding = undefined;
            }
          }

          // Convert array to object for JSONB storage
          const cellsObject: Record<string, string> = {};
          rowCells.forEach((cell, idx) => {
            cellsObject[`col_${idx}`] = cell;
          });

          rowsToInsert.push({
            table_id: table.tableId,
            row_index: rowIndex,
            cells: cellsObject,
            raw_text: rowText,
            embedding: rowEmbedding ? `[${rowEmbedding.join(",")}]` : null,
          });
        }
      }

      // Insert all rows for this table
      if (rowsToInsert.length > 0) {
        const { error: rowsError } = await supabaseAdmin
          .from("table_rows")
          .insert(rowsToInsert);

        if (rowsError) {
          console.error(`Failed to insert rows for table ${table.tableId}:`, rowsError.message);
        }
      }
    }

    // Log success
    await supabaseAdmin.from("ingestion_logs").insert({
      document_id: documentId,
      status: "completed",
      message: `Successfully ingested ${chunks.length} chunks and ${extractedTables.length} tables`,
    });

    console.log(`[Ingest] ✅ Successfully ingested document ${metadata.fileName}`);

    return { documentId, success: true };
  } catch (error) {
    console.error("[Ingest] Error:", error);

    // Log error if we have a documentId
    try {
      await supabaseAdmin.from("ingestion_logs").insert({
        document_id: undefined,
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
