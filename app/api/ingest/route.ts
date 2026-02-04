import { NextRequest, NextResponse } from "next/server";
import { ingestDocument } from "@/lib/ingestion/ingest-supabase";
import path from "path";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes for ingestion

/**
 * POST /api/ingest
 * Trigger ingestion for a document
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fileName, displayName, date, tags, category } = body;

    if (!fileName || !displayName || !date || !category) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Construct file path (assumes PDFs are in public/pdfs/)
    const filePath = path.join(process.cwd(), "public", "pdfs", fileName);

    console.log(`[Ingest API] Starting ingestion for ${fileName}`);

    const result = await ingestDocument(
      filePath,
      {
        fileName,
        displayName,
        date: new Date(date),
        tags: tags || [],
        category,
      },
      {
        generateEmbeddings: true,
        contextLines: { above: 3, below: 3 },
      }
    );

    if (result.success) {
      return NextResponse.json({
        success: true,
        documentId: result.documentId,
        message: "Document ingested successfully",
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Ingestion failed",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Ingest API error:", error);

    // Check for missing API key error
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const isConfigError = errorMessage.includes("OPENROUTER_API_KEY") ||
                         errorMessage.includes("SUPABASE");

    return NextResponse.json(
      {
        success: false,
        error: isConfigError ? "Configuration error" : "Internal server error",
        message: errorMessage,
      },
      { status: isConfigError ? 503 : 500 }
    );
  }
}
