import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const { data: docs, error } = await supabaseAdmin
      .from("documents")
      .select("*")
      .order("date", { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch documents: ${error.message}`);
    }

    // Convert snake_case to camelCase for frontend
    const formattedDocs = docs?.map(d => ({
      id: d.id,
      fileName: d.file_name,
      displayName: d.display_name,
      date: d.date,
      tags: d.tags,
      category: d.category,
      filePath: d.file_path,
      uploadedAt: d.uploaded_at,
      pageCount: d.page_count,
    }));

    return NextResponse.json({ documents: formattedDocs });
  } catch (error) {
    console.error("Documents API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 }
    );
  }
}
