"use client";

import { FileText, Table, ExternalLink } from "lucide-react";
import { ChatResponse } from "@/lib/qa/chat";
import { cn } from "@/lib/utils";

interface EvidencePanelProps {
  response: ChatResponse | null;
}

export function EvidencePanel({ response }: EvidencePanelProps) {
  if (!response) {
    return (
      <div className="w-96 border-l border-[var(--border)] bg-[var(--surface)] flex items-center justify-center">
        <div className="text-center p-6">
          <FileText className="w-12 h-12 mx-auto text-[var(--foreground-subtle)] mb-3" />
          <p className="text-sm text-[var(--foreground-muted)]">
            Evidence and citations will appear here
          </p>
        </div>
      </div>
    );
  }

  const { questionType, evidence, citations, confidence } = response;

  return (
    <div className="w-96 border-l border-[var(--border)] bg-[var(--surface)] flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-[var(--border)] bg-white">
        <h2 className="text-lg font-semibold text-foreground">Evidence</h2>
        <div className="flex items-center gap-2 mt-2">
          <span
            className={cn(
              "text-xs px-2 py-1 rounded-full font-medium",
              questionType === "factual"
                ? "bg-blue-100 text-blue-700"
                : "bg-green-100 text-green-700"
            )}
          >
            {questionType}
          </span>
          <span
            className={cn(
              "text-xs px-2 py-1 rounded-full font-medium",
              confidence === "high"
                ? "bg-emerald-100 text-emerald-700"
                : confidence === "medium"
                ? "bg-yellow-100 text-yellow-700"
                : confidence === "low"
                ? "bg-orange-100 text-orange-700"
                : "bg-gray-100 text-gray-700"
            )}
          >
            {confidence} confidence
          </span>
        </div>
      </div>

      {/* Evidence Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {evidence.type === "factual" && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">
              Quoted Evidence
            </h3>
            {evidence.quotedEvidence ? (
              <div className="p-3 rounded-lg bg-white border border-[var(--border)]">
                <p className="text-sm text-foreground italic">
                  "{evidence.quotedEvidence}"
                </p>
              </div>
            ) : (
              <p className="text-sm text-[var(--foreground-muted)]">
                No direct quote available
              </p>
            )}
          </div>
        )}

        {evidence.type === "financial" && evidence.values.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
              <Table className="w-4 h-4" />
              Table Values
            </h3>
            <div className="space-y-3">
              {evidence.values.map((value, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-white border border-[var(--border)]"
                >
                  <div className="text-sm font-medium text-foreground mb-1">
                    {value.rowLabel}
                  </div>
                  <div className="text-xs text-[var(--foreground-muted)] mb-2">
                    {value.columnLabel}
                  </div>
                  <div className="text-lg font-semibold text-[var(--primary)]">
                    {value.value} {value.unit || ""}
                  </div>

                  <div className="mt-2 pt-2 border-t border-[var(--border-subtle)]">
                    <div className="text-xs text-[var(--foreground-subtle)]">
                      Table: {value.tableName || "Unknown"} • Page {value.page}
                    </div>
                  </div>

                  {value.contextAboveLines.length > 0 && (
                    <details className="mt-2">
                      <summary className="text-xs text-[var(--foreground-muted)] cursor-pointer">
                        Context ({value.contextAboveLines.length} lines above)
                      </summary>
                      <div className="mt-1 pl-2 border-l-2 border-[var(--border)] text-xs text-[var(--foreground-subtle)]">
                        {value.contextAboveLines.slice(0, 3).map((line, i) => (
                          <div key={i}>{line}</div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Citations */}
        {citations.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">
              Citations
            </h3>
            <div className="space-y-2">
              {citations.map((citation, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-white border border-[var(--border)]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-foreground">
                        {citation.documentName}
                      </div>
                      <div className="text-xs text-[var(--foreground-muted)] mt-1">
                        Page {citation.page}
                        {citation.tableId && ` • Table ${citation.tableId}`}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        // Open PDF viewer (to be implemented)
                        console.log("View PDF:", citation);
                      }}
                      className="p-1 rounded hover:bg-[var(--surface)]"
                      title="View in PDF"
                    >
                      <ExternalLink className="w-4 h-4 text-[var(--primary)]" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
