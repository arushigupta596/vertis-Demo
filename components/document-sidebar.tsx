"use client";

import { useEffect, useState } from "react";
import { FileText, Calendar, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

interface Document {
  id: number;
  fileName: string;
  displayName: string;
  date: string;
  tags: string[];
  category: string;
}

interface DocumentSidebarProps {
  selectedDocuments: number[];
  onSelectionChange: (ids: number[]) => void;
  searchAllDocs: boolean;
  onSearchAllChange: (value: boolean) => void;
  onQuestionClick?: (question: string) => void;
}

export function DocumentSidebar({
  selectedDocuments,
  onSelectionChange,
  searchAllDocs,
  onSearchAllChange,
  onQuestionClick,
}: DocumentSidebarProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const res = await fetch("/api/documents");
      const data = await res.json();
      setDocuments(data.documents || []);
    } catch (error) {
      console.error("Failed to fetch documents:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleDocument = (id: number) => {
    if (selectedDocuments.includes(id)) {
      onSelectionChange(selectedDocuments.filter((docId) => docId !== id));
    } else {
      onSelectionChange([...selectedDocuments, id]);
    }
  };

  return (
    <div className="w-80 border-r border-[var(--border)] bg-[var(--surface)] flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-[var(--border)]">
        <h2 className="text-lg font-semibold text-foreground">Documents</h2>
        <p className="text-sm text-[var(--foreground-muted)] mt-1">
          {documents.length} PDFs available
        </p>
      </div>

      {/* Search Toggle */}
      <div className="p-4 border-b border-[var(--border)] bg-white">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={searchAllDocs}
            onChange={(e) => onSearchAllChange(e.target.checked)}
            className="w-4 h-4 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
          />
          <span className="text-sm font-medium">Search in all documents</span>
        </label>
      </div>

      {/* Documents List */}
      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="p-4 text-center text-[var(--foreground-muted)]">
            Loading...
          </div>
        ) : documents.length === 0 ? (
          <div className="p-4 text-center text-[var(--foreground-muted)]">
            No documents found
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <button
                key={doc.id}
                onClick={() => toggleDocument(doc.id)}
                disabled={searchAllDocs}
                className={cn(
                  "w-full p-3 rounded-lg text-left transition-colors",
                  "border border-[var(--border)]",
                  searchAllDocs
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-white hover:shadow-sm cursor-pointer",
                  selectedDocuments.includes(doc.id) &&
                    !searchAllDocs &&
                    "bg-[var(--primary)]/5 border-[var(--primary)]"
                )}
              >
                <div className="flex items-start gap-2">
                  <FileText className="w-4 h-4 mt-0.5 text-[var(--primary)]" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-foreground line-clamp-2">
                      {doc.displayName}
                    </div>

                    <div className="flex items-center gap-1 mt-1 text-xs text-[var(--foreground-muted)]">
                      <Calendar className="w-3 h-3" />
                      {new Date(doc.date).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </div>

                    {doc.tags && doc.tags.length > 0 && (
                      <div className="flex items-center gap-1 mt-1">
                        <Tag className="w-3 h-3 text-[var(--foreground-subtle)]" />
                        <div className="flex flex-wrap gap-1">
                          {doc.tags.slice(0, 2).map((tag, idx) => (
                            <span
                              key={idx}
                              className="text-xs px-1.5 py-0.5 rounded bg-[var(--surface)] text-[var(--foreground-subtle)]"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-1 text-xs font-medium text-[var(--primary)]">
                      {doc.category}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Suggested Questions */}
      <div className="border-t border-[var(--border)] bg-white">
        <div className="p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            💡 Suggested Questions
          </h3>

          <div className="space-y-3">
            {/* Factual Questions Section */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <span className="inline-block w-2 h-2 rounded-full bg-blue-500"></span>
                <h4 className="text-xs font-medium text-[var(--foreground-muted)]">Factual (from text)</h4>
              </div>
              <div className="space-y-1">
                <button
                  onClick={() => onQuestionClick?.("Who is the auditor?")}
                  className="w-full text-left px-2 py-1.5 rounded text-xs border border-[var(--border)] hover:bg-[var(--surface)] hover:border-[var(--primary)] transition-all text-foreground"
                >
                  Who is the auditor?
                </button>
                <button
                  onClick={() => onQuestionClick?.("What is the company's registered office address?")}
                  className="w-full text-left px-2 py-1.5 rounded text-xs border border-[var(--border)] hover:bg-[var(--surface)] hover:border-[var(--primary)] transition-all text-foreground"
                >
                  What is the registered office address?
                </button>
                <button
                  onClick={() => onQuestionClick?.("What were the key decisions in the board meeting?")}
                  className="w-full text-left px-2 py-1.5 rounded text-xs border border-[var(--border)] hover:bg-[var(--surface)] hover:border-[var(--primary)] transition-all text-foreground"
                >
                  Key board meeting decisions?
                </button>
                <button
                  onClick={() => onQuestionClick?.("Who are the directors of the company?")}
                  className="w-full text-left px-2 py-1.5 rounded text-xs border border-[var(--border)] hover:bg-[var(--surface)] hover:border-[var(--primary)] transition-all text-foreground"
                >
                  Who are the directors?
                </button>
                <button
                  onClick={() => onQuestionClick?.("What are the risk factors mentioned?")}
                  className="w-full text-left px-2 py-1.5 rounded text-xs border border-[var(--border)] hover:bg-[var(--surface)] hover:border-[var(--primary)] transition-all text-foreground"
                >
                  What are the risk factors?
                </button>
              </div>
            </div>

            {/* Financial Questions Section */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
                <h4 className="text-xs font-medium text-[var(--foreground-muted)]">Financial (from tables)</h4>
              </div>
              <div className="space-y-1">
                <button
                  onClick={() => onQuestionClick?.("What are the financial ratios?")}
                  className="w-full text-left px-2 py-1.5 rounded text-xs border border-[var(--border)] hover:bg-[var(--surface)] hover:border-[var(--primary)] transition-all text-foreground"
                >
                  What are the financial ratios?
                </button>
                <button
                  onClick={() => onQuestionClick?.("What is the total distribution amount?")}
                  className="w-full text-left px-2 py-1.5 rounded text-xs border border-[var(--border)] hover:bg-[var(--surface)] hover:border-[var(--primary)] transition-all text-foreground"
                >
                  What is the distribution amount?
                </button>
                <button
                  onClick={() => onQuestionClick?.("What is the NDCF for the current period?")}
                  className="w-full text-left px-2 py-1.5 rounded text-xs border border-[var(--border)] hover:bg-[var(--surface)] hover:border-[var(--primary)] transition-all text-foreground"
                >
                  NDCF for current period?
                </button>
                <button
                  onClick={() => onQuestionClick?.("What is the debt service coverage ratio?")}
                  className="w-full text-left px-2 py-1.5 rounded text-xs border border-[var(--border)] hover:bg-[var(--surface)] hover:border-[var(--primary)] transition-all text-foreground"
                >
                  Debt service coverage ratio?
                </button>
                <button
                  onClick={() => onQuestionClick?.("Show me the profit and loss statement")}
                  className="w-full text-left px-2 py-1.5 rounded text-xs border border-[var(--border)] hover:bg-[var(--surface)] hover:border-[var(--primary)] transition-all text-foreground"
                >
                  Profit and loss statement?
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-[var(--border)] bg-white">
        <a
          href="/tables"
          className="block w-full px-4 py-2 text-center text-sm font-medium rounded-md border border-[var(--border)] hover:bg-[var(--surface)] transition-colors"
        >
          View Extracted Tables
        </a>
      </div>
    </div>
  );
}
