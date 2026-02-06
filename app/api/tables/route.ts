import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

type TableRow = {
  id: number;
  table_id: string;
  document_id: number;
  page: number;
  table_index: number;
  context_above_lines: string[];
  context_below_lines: string[];
  table_name: string | null;
  table_type: string | null;
  confidence: number;
  created_at: string;
};

/**
 * GET /api/tables?documentId=X&page=Y
 * Returns tables for a specific document and optionally a specific page
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get("documentId");
    const page = searchParams.get("page");

    if (!documentId) {
      return NextResponse.json(
        { error: "documentId is required" },
        { status: 400 }
      );
    }

    let query = supabaseAdmin
      .from("tables")
      .select("*")
      .eq("document_id", parseInt(documentId));

    if (page) {
      query = query.eq("page", parseInt(page));
    }

    const { data: result, error } = await query.returns<TableRow[]>();

    if (error) {
      throw new Error(`Failed to fetch tables: ${error.message}`);
    }

    // Convert snake_case to camelCase for frontend
    const formattedTables = result?.map(t => ({
      id: t.id,
      tableId: t.table_id,
      documentId: t.document_id,
      page: t.page,
      tableIndex: t.table_index,
      contextAboveLines: t.context_above_lines,
      contextBelowLines: t.context_below_lines,
      tableName: t.table_name,
      tableType: t.table_type,
      confidence: t.confidence,
      createdAt: t.created_at,
    }));

    return NextResponse.json({ tables: formattedTables });
  } catch (error) {
    console.error("Tables API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch tables" },
      { status: 500 }
    );
  }
}
