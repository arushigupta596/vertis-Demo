"use client";

import { useState, useEffect } from "react";
import { FileText, Loader2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface PDFFile {
  fileName: string;
  displayName: string;
  date: string;
  category: string;
  tags: string[];
  status: "pending" | "processing" | "completed" | "error";
  documentId?: number;
  error?: string;
}

// Predefined PDFs from public/pdfs/
const AVAILABLE_PDFS: Omit<PDFFile, "status">[] = [
  {
    fileName: "1.-Financial-Statements.pdf",
    displayName: "Financial Statements",
    date: "2025-01-01",
    category: "Financial Results",
    tags: ["Financial", "Statements", "Q4 2024"],
  },
  {
    fileName: "709bed4f-f1c7-4920-83fc-e9b8cba4492b.pdf",
    displayName: "Board Outcome - July 2024",
    date: "2024-07-01",
    category: "Board Outcome",
    tags: ["Board", "Meeting", "July 2024"],
  },
  {
    fileName: "HIGHWAYS_08112024184010_Outcomesigned.pdf",
    displayName: "Highways Board Outcome - November 2024",
    date: "2024-11-08",
    category: "Board Outcome",
    tags: ["Highways", "Board", "November 2024"],
  },
  {
    fileName: "HIGHWAYS_13082025155011_Outcome.pdf",
    displayName: "Highways Board Outcome - August 2025",
    date: "2025-08-13",
    category: "Board Outcome",
    tags: ["Highways", "Board", "August 2025"],
  },
  {
    fileName: "HIGHWAYS_30012026202000_Outcome_F_1.pdf",
    displayName: "Highways Board Outcome - January 2026",
    date: "2026-01-30",
    category: "Board Outcome",
    tags: ["Highways", "Board", "January 2026"],
  },
];

export default function AdminPage() {
  const [files, setFiles] = useState<PDFFile[]>(
    AVAILABLE_PDFS.map((pdf) => ({ ...pdf, status: "pending" as const }))
  );
  const [configStatus, setConfigStatus] = useState<{
    hasSupabase: boolean;
    hasOpenRouter: boolean;
  } | null>(null);

  // Check configuration status on mount
  useEffect(() => {
    fetch("/api/config-check")
      .then((res) => res.json())
      .then((data) => setConfigStatus(data))
      .catch(() => setConfigStatus({ hasSupabase: false, hasOpenRouter: false }));
  }, []);

  const ingestDocument = async (file: PDFFile, index: number) => {
    // Update status to processing
    setFiles((prev) => {
      const updated = [...prev];
      updated[index] = { ...file, status: "processing" };
      return updated;
    });

    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.fileName,
          displayName: file.displayName,
          date: file.date,
          tags: file.tags,
          category: file.category,
        }),
      });

      // Check if response is JSON
      const contentType = res.headers.get("content-type");
      if (!contentType?.includes("application/json")) {
        throw new Error("Server returned non-JSON response. Please check server logs.");
      }

      const data = await res.json();

      if (data.success) {
        setFiles((prev) => {
          const updated = [...prev];
          updated[index] = {
            ...file,
            status: "completed",
            documentId: data.documentId,
          };
          return updated;
        });
      } else {
        const errorMsg = data.message || data.error || "Ingestion failed";
        throw new Error(errorMsg);
      }
    } catch (error) {
      console.error("Ingestion error:", error);
      setFiles((prev) => {
        const updated = [...prev];
        updated[index] = {
          ...file,
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        };
        return updated;
      });
    }
  };

  const ingestAll = async () => {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.status === "pending" || file.status === "error") {
        await ingestDocument(file, i);
      }
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Document Ingestion Admin
          </h1>
          <p className="text-[var(--foreground-muted)]">
            Process PDFs to extract text chunks and tables for Q&A
          </p>
        </div>

        {/* Configuration Status Warning */}
        {configStatus && (!configStatus.hasSupabase || !configStatus.hasOpenRouter) && (
          <div className="mb-6 p-4 rounded-lg border-2 border-yellow-500 bg-yellow-50">
            <h3 className="font-semibold text-yellow-900 mb-2">⚠️ Configuration Required</h3>
            <p className="text-sm text-yellow-800 mb-3">
              Please configure the following in your <code className="px-1 py-0.5 bg-yellow-100 rounded">.env.local</code> file:
            </p>
            <ul className="text-sm text-yellow-800 space-y-1 ml-4">
              {!configStatus.hasSupabase && (
                <li>
                  ❌ <strong>Supabase credentials</strong> - See <code>SUPABASE_API_KEYS.md</code>
                </li>
              )}
              {!configStatus.hasOpenRouter && (
                <li>
                  ❌ <strong>OpenRouter API key</strong> - Get from <a href="https://openrouter.ai" target="_blank" rel="noopener" className="underline">openrouter.ai</a>
                </li>
              )}
            </ul>
            <p className="text-xs text-yellow-700 mt-3">
              See <code>FINAL_SETUP_CHECKLIST.md</code> for complete setup instructions.
            </p>
          </div>
        )}

        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-[var(--foreground-muted)]">
              {files.filter((f) => f.status === "completed").length} /{" "}
              {files.length} completed
            </p>
          </div>
          <Button onClick={ingestAll}>Process All Documents</Button>
        </div>

        <div className="space-y-4">
          {files.map((file, index) => (
            <div
              key={file.fileName}
              className="p-4 rounded-lg border border-[var(--border)] bg-white"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <FileText className="w-5 h-5 mt-0.5 text-[var(--primary)]" />
                  <div className="flex-1">
                    <h3 className="font-medium text-foreground">
                      {file.displayName}
                    </h3>
                    <p className="text-sm text-[var(--foreground-muted)] mt-1">
                      {file.fileName}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs px-2 py-1 rounded bg-[var(--surface)] text-[var(--foreground-subtle)]">
                        {file.category}
                      </span>
                      <span className="text-xs text-[var(--foreground-muted)]">
                        {new Date(file.date).toLocaleDateString("en-IN")}
                      </span>
                    </div>
                    {file.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {file.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="text-xs px-2 py-0.5 rounded border border-[var(--border)] text-[var(--foreground-subtle)]"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {file.error && (
                      <div className="mt-2 p-2 rounded bg-red-50 text-red-700 text-sm">
                        {file.error}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {file.status === "pending" && (
                    <Button
                      size="sm"
                      onClick={() => ingestDocument(file, index)}
                    >
                      Process
                    </Button>
                  )}

                  {file.status === "processing" && (
                    <div className="flex items-center gap-2 text-[var(--foreground-muted)]">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span className="text-sm">Processing...</span>
                    </div>
                  )}

                  {file.status === "completed" && (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="w-5 h-5" />
                      <span className="text-sm">Completed</span>
                    </div>
                  )}

                  {file.status === "error" && (
                    <div className="flex items-center gap-2">
                      <XCircle className="w-5 h-5 text-red-600" />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => ingestDocument(file, index)}
                      >
                        Retry
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 p-4 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
          <h3 className="font-semibold mb-2">Important Notes:</h3>
          <ul className="text-sm text-[var(--foreground-muted)] space-y-1 list-disc list-inside">
            <li>Processing may take 2-5 minutes per document</li>
            <li>Embeddings are generated using OpenRouter API</li>
            <li>Tables are extracted with 3 context lines above/below by default</li>
            <li>Ensure DATABASE_URL and OPENROUTER_API_KEY are set in .env.local</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
