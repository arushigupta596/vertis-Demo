import { PythonShell } from "python-shell";
import path from "path";

export interface ExtractedTable {
  tableId: string;
  page: number;
  tableIndexOnPage: number;
  tableName: string | null;
  unit: string | null;
  periods: string[];
  rawTableGrid: string[][];
  normalizedRows: NormalizedRow[];
  contextAboveLines: string[];
  contextBelowLines: string[];
  confidence: number;
  extractionMethod?: "lattice" | "stream";
}

export interface NormalizedRow {
  rowLabel: string;
  columnLabel: string;
  period: string | null;
  value: string;
  numericValue: number | null;
  rowIndex: number;
  columnIndex: number;
}

/**
 * Extract tables from PDF using pdfplumber + Camelot (lattice + stream fallback)
 *
 * This replaces the heuristic approach with proper table extraction:
 * - Primary: Camelot lattice method (for tables with borders)
 * - Fallback: Camelot stream method (for tables without borders)
 * - Context extraction: pdfplumber with text coordinates
 */
export async function extractTablesFromPDF(
  pdfPath: string,
  documentId: number,
  contextLinesCount: number = 3
): Promise<ExtractedTable[]> {
  try {
    const scriptPath = path.join(process.cwd(), "scripts", "extract_tables.py");

    // Run Python script
    const results = await PythonShell.run(scriptPath, {
      args: [pdfPath, contextLinesCount.toString()],
      mode: "json",
    });

    if (!results || results.length === 0) {
      console.error("[Table Extraction] No results from Python script");
      return [];
    }

    const result = results[0] as {
      success: boolean;
      tables: Array<{
        page: number;
        table_index_on_page: number;
        table_name: string;
        unit: string | null;
        periods: string[];
        raw_table_grid: string[][];
        context_above_lines: string[];
        context_below_lines: string[];
        confidence: number;
        extraction_method: "lattice" | "stream";
      }>;
      page_count: number;
      errors: string[];
    };

    if (!result.success) {
      console.error("[Table Extraction] Errors:", result.errors);
      return [];
    }

    console.log(`[Table Extraction] Found ${result.tables.length} tables across ${result.page_count} pages`);

    if (result.errors && result.errors.length > 0) {
      console.warn("[Table Extraction] Warnings:", result.errors);
    }

    // Convert Python results to TypeScript format
    const tables: ExtractedTable[] = result.tables.map((table, idx) => {
      const tableId = `doc${documentId}_p${table.page}_t${table.table_index_on_page}`;
      const normalizedRows = normalizeTableRows(table.raw_table_grid);

      return {
        tableId,
        page: table.page,
        tableIndexOnPage: table.table_index_on_page,
        tableName: table.table_name,
        unit: table.unit,
        periods: table.periods,
        rawTableGrid: table.raw_table_grid,
        normalizedRows,
        contextAboveLines: table.context_above_lines,
        contextBelowLines: table.context_below_lines,
        confidence: table.confidence,
        extractionMethod: table.extraction_method,
      };
    });

    return tables;
  } catch (error) {
    console.error("[Table Extraction] Fatal error:", error);
    throw error;
  }
}

/**
 * Normalize table into long format (row-column pairs)
 */
function normalizeTableRows(grid: string[][]): NormalizedRow[] {
  if (grid.length < 2) return [];

  const rows: NormalizedRow[] = [];
  const headerRow = grid[0];

  for (let rowIdx = 1; rowIdx < grid.length; rowIdx++) {
    const row = grid[rowIdx];
    const rowLabel = row[0]; // First column is usually the row label

    for (let colIdx = 1; colIdx < row.length; colIdx++) {
      const value = row[colIdx];
      const columnLabel = headerRow[colIdx] || `Column ${colIdx}`;

      const numericValue = parseNumericValue(value);

      rows.push({
        rowLabel,
        columnLabel,
        period: columnLabel,
        value,
        numericValue,
        rowIndex: rowIdx,
        columnIndex: colIdx,
      });
    }
  }

  return rows;
}

/**
 * Parse numeric value from string
 */
function parseNumericValue(value: string): number | null {
  // Remove common formatting
  const cleaned = value.replace(/[,₹%]/g, "").trim();

  // Handle parentheses as negative
  if (/^\(.*\)$/.test(cleaned)) {
    const num = parseFloat(cleaned.replace(/[()]/g, ""));
    return isNaN(num) ? null : -num;
  }

  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

// Keep backward compatibility with old API
export function extractTablesFromPages(
  pages: any[],
  documentId: number,
  contextLines: { above: number; below: number } = { above: 3, below: 3 }
): ExtractedTable[] {
  // This function is deprecated, use extractTablesFromPDF instead
  console.warn("[Table Extraction] Using deprecated extractTablesFromPages. Please use extractTablesFromPDF.");
  return [];
}
