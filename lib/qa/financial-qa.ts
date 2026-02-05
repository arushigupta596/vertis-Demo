import { supabaseAdmin } from "../supabase";
import { generateEmbedding, generateChatCompletion } from "../openrouter";

export interface FinancialAnswer {
  answer: string;
  values: Array<{
    tableId: string;
    tableName: string | null;
    page: number;
    rawText: string;
    cells: Record<string, string>;
    contextAboveLines: string[];
    contextBelowLines: string[];
  }>;
  citations: Array<{
    documentName: string;
    page: number;
    tableId: string;
  }>;
  confidence: "high" | "medium" | "low" | "not_found";
}

export async function answerFinancialQuestion(
  question: string,
  documentIds?: number[]
): Promise<FinancialAnswer> {
  try {
    if (!supabaseAdmin) {
      throw new Error("Supabase admin client not initialized");
    }

    const targetTableTypes = identifyTableTypes(question);
    const questionEmbedding = await generateEmbedding(question);

    let rowQuery = supabaseAdmin
      .from("table_rows")
      .select("id, table_id, row_index, cells, raw_text, embedding")
      .limit(100);

    const { data: rows, error: rowsError } = await rowQuery;

    if (rowsError) {
      throw new Error(`Failed to fetch table rows: ${rowsError.message}`);
    }

    if (!rows || rows.length === 0) {
      return {
        answer: "Not available in the provided documents.",
        values: [],
        citations: [],
        confidence: "not_found",
      };
    }

    const rowsWithSimilarity = rows
      .map((row) => {
        const rowEmbedding = row.embedding ? JSON.parse(row.embedding) : null;
        if (!rowEmbedding) return null;

        let dotProduct = 0;
        let mag1 = 0;
        let mag2 = 0;

        for (let i = 0; i < questionEmbedding.length; i++) {
          dotProduct += questionEmbedding[i] * rowEmbedding[i];
          mag1 += questionEmbedding[i] * questionEmbedding[i];
          mag2 += rowEmbedding[i] * rowEmbedding[i];
        }

        const similarity = dotProduct / (Math.sqrt(mag1) * Math.sqrt(mag2));

        return {
          ...row,
          similarity,
        };
      })
      .filter((r) => r !== null)
      .sort((a, b) => (b?.similarity || 0) - (a?.similarity || 0))
      .slice(0, 10);

    if (rowsWithSimilarity.length === 0) {
      return {
        answer: "Not available in the provided documents.",
        values: [],
        citations: [],
        confidence: "not_found",
      };
    }

    const uniqueTableIds = [...new Set(rowsWithSimilarity.map((r) => r.table_id))];

    const { data: tableMetadata } = await supabaseAdmin
      .from("tables")
      .select("table_id, document_id, page, table_name, context_above_lines, context_below_lines")
      .in("table_id", uniqueTableIds);

    const tableMetadataMap = new Map(
      tableMetadata?.map((t) => [t.table_id, t]) || []
    );

    let filteredRows = rowsWithSimilarity;
    if (targetTableTypes.length > 0) {
      filteredRows = rowsWithSimilarity.filter((row) => {
        const meta = tableMetadataMap.get(row.table_id);
        return meta && targetTableTypes.includes(meta.table_name || "");
      });

      if (filteredRows.length === 0) {
        filteredRows = rowsWithSimilarity;
      }
    }

    if (documentIds && documentIds.length > 0) {
      filteredRows = filteredRows.filter((row) => {
        const meta = tableMetadataMap.get(row.table_id);
        return meta && documentIds.includes(meta.document_id);
      });
    }

    const documentIdsToFetch = [
      ...new Set(
        filteredRows
          .map((r) => {
            const meta = tableMetadataMap.get(r.table_id);
            return meta?.document_id;
          })
          .filter((id) => id !== undefined)
      ),
    ];

    const { data: documents } = await supabaseAdmin
      .from("documents")
      .select("id, display_name")
      .in("id", documentIdsToFetch as number[]);

    const documentMap = new Map(documents?.map((d) => [d.id, d.display_name]) || []);

    const tableContext = filteredRows
      .slice(0, 5)
      .map((row: any) => {
        const meta = tableMetadataMap.get(row.table_id);
        const docName = meta ? documentMap.get(meta.document_id) || "Unknown" : "Unknown";
        const tableName = meta?.table_name || "Unknown";
        const page = meta?.page || 0;
        const contextAbove = meta?.context_above_lines?.slice(0, 2).join("; ") || "N/A";
        const contextBelow = meta?.context_below_lines?.slice(0, 2).join("; ") || "N/A";
        
        return `[Table: ${tableName} | Document: ${docName} | Page: ${page}]
Row Data: ${row.raw_text}
Context Above: ${contextAbove}
Context Below: ${contextBelow}`;
      })
      .join("\n\n---\n\n");

    const systemPrompt = `You are a financial Q&A assistant for structured table data.

CRITICAL RULES:
1. Answer using ONLY the exact values from the provided table data
2. Do NOT calculate, derive, or extrapolate ANY values
3. Do NOT perform any arithmetic operations
4. If the exact value is not in the tables, respond with "Not available in the provided documents."
5. Include the table name and exact values in your answer
6. DO NOT mention "search results", "web search", "provided context", "retrieval", or "table data" - just answer the question directly with the values
7. Format: "[Answer with specific values] (Source: [Table Name], Page X)"

Example response:
"Debt service coverage ratio: 1.45 times (Source: RATIOS table, Page 52)"`;

    const userPrompt = `Question: ${question}

Table Data:
${tableContext}

Provide your answer using the exact values from the tables above.`;

    const llmResponse = await generateChatCompletion(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { temperature: 0, maxTokens: 500 }
    );

    if (llmResponse.toLowerCase().includes("not available")) {
      return {
        answer: "Not available in the provided documents.",
        values: [],
        citations: [],
        confidence: "not_found",
      };
    }

    const values = filteredRows.slice(0, 5).map((row: any) => {
      const meta = tableMetadataMap.get(row.table_id);
      return {
        tableId: row.table_id,
        tableName: meta?.table_name || null,
        page: meta?.page || 0,
        rawText: row.raw_text,
        cells: row.cells,
        contextAboveLines: meta?.context_above_lines || [],
        contextBelowLines: meta?.context_below_lines || [],
      };
    });

    const citations = values.slice(0, 3).map((v) => {
      const meta = tableMetadataMap.get(v.tableId);
      const docName = meta ? documentMap.get(meta.document_id) || "Unknown Document" : "Unknown Document";

      return {
        documentName: docName,
        page: v.page,
        tableId: v.tableId,
      };
    });

    const topSimilarity = filteredRows[0]?.similarity || 0;
    const confidence: FinancialAnswer["confidence"] =
      topSimilarity > 0.75 ? "high" : topSimilarity > 0.5 ? "medium" : "low";

    return {
      answer: llmResponse,
      values,
      citations,
      confidence,
    };
  } catch (error) {
    console.error("Error in financial Q&A:", error);
    return {
      answer: "An error occurred while processing your question.",
      values: [],
      citations: [],
      confidence: "not_found",
    };
  }
}

function identifyTableTypes(question: string): string[] {
  const q = question.toLowerCase();
  const types: string[] = [];

  if (/ratio|coverage|debt service|icr/i.test(q)) {
    types.push("RATIOS");
  }

  if (/ndcf|net distributable cash flow/i.test(q)) {
    types.push("NDCF");
  }

  if (/distribution|per unit|dpu/i.test(q)) {
    types.push("DISTRIBUTION");
  }

  if (/profit|loss|revenue|income|expense|p&l/i.test(q)) {
    types.push("P&L");
  }

  if (/balance sheet|assets|liabilities|equity/i.test(q)) {
    types.push("BALANCE_SHEET");
  }

  return types;
}
