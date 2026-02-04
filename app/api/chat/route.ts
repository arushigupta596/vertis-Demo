import { NextRequest, NextResponse } from "next/server";
import { chat } from "@/lib/qa/chat";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { question, documentIds } = body;

    if (!question || typeof question !== "string") {
      return NextResponse.json(
        { error: "Question is required and must be a string" },
        { status: 400 }
      );
    }

    // Execute chat
    const response = await chat(
      question,
      documentIds && Array.isArray(documentIds) ? documentIds : undefined
    );

    return NextResponse.json(response);
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
