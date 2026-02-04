"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Download, Table as TableIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface Document {
  id: number;
  displayName: string;
  pageCount: number;
}

interface ExtractedTable {
  id: number;
  tableId: string;
  page: number;
  tableIndexOnPage: number;
  tableName: string | null;
  unit: string | null;
  periods: string[];
  rawTableGrid: string[][];
  contextAboveLines: string[];
  contextBelowLines: string[];
  confidence: number;
}

export default function TablesPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null);
  const [selectedPage, setSelectedPage] = useState<number | null>(null);
  const [tables, setTables] = useState<ExtractedTable[]>([]);
  const [selectedTable, setSelectedTable] = useState<ExtractedTable | null>(null);
  const [contextLinesCount, setContextLinesCount] = useState(3);

  useEffect(() => {
    fetchDocuments();
  }, []);

  useEffect(() => {
    if (selectedDocId) {
      fetchTables();
    }
  }, [selectedDocId, selectedPage]);

  const fetchDocuments = async () => {
    try {
      const res = await fetch("/api/documents");
      const data = await res.json();
      setDocuments(data.documents || []);
    } catch (error) {
      console.error("Failed to fetch documents:", error);
    }
  };

  const fetchTables = async () => {
    if (!selectedDocId) return;

    try {
      let url = `/api/tables?documentId=${selectedDocId}`;
      if (selectedPage) {
        url += `&page=${selectedPage}`;
      }

      const res = await fetch(url);
      const data = await res.json();
      setTables(data.tables || []);

      // Auto-select first table
      if (data.tables && data.tables.length > 0) {
        setSelectedTable(data.tables[0]);
      }
    } catch (error) {
      console.error("Failed to fetch tables:", error);
    }
  };

  const downloadTableCSV = (table: ExtractedTable) => {
    const csv = table.rawTableGrid.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${table.tableId}.csv`;
    a.click();
  };

  const downloadTableJSON = (table: ExtractedTable) => {
    const json = JSON.stringify(table, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${table.tableId}.json`;
    a.click();
  };

  const selectedDoc = documents.find((d) => d.id === selectedDocId);

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="p-4 border-b border-[var(--border)] bg-white">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Chat
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-foreground">
              Extracted Tables Viewer
            </h1>
            <p className="text-sm text-[var(--foreground-muted)]">
              Validate and audit extracted table data
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Document & Page Selector */}
        <div className="w-64 border-r border-[var(--border)] bg-[var(--surface)] overflow-y-auto">
          <div className="p-4">
            <h2 className="text-sm font-semibold mb-3">Select Document</h2>
            <div className="space-y-2">
              {documents.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => {
                    setSelectedDocId(doc.id);
                    setSelectedPage(null);
                  }}
                  className={`w-full p-2 text-left text-sm rounded border transition-colors ${
                    selectedDocId === doc.id
                      ? "bg-[var(--primary)]/10 border-[var(--primary)]"
                      : "bg-white border-[var(--border)] hover:bg-[var(--surface)]"
                  }`}
                >
                  <div className="font-medium">{doc.displayName}</div>
                  <div className="text-xs text-[var(--foreground-muted)] mt-1">
                    {doc.pageCount} pages
                  </div>
                </button>
              ))}
            </div>

            {selectedDoc && (
              <div className="mt-6">
                <h2 className="text-sm font-semibold mb-3">Filter by Page</h2>
                <button
                  onClick={() => setSelectedPage(null)}
                  className={`w-full p-2 text-left text-sm rounded border mb-2 ${
                    selectedPage === null
                      ? "bg-[var(--primary)]/10 border-[var(--primary)]"
                      : "bg-white border-[var(--border)]"
                  }`}
                >
                  All Pages
                </button>
                <div className="grid grid-cols-4 gap-2">
                  {Array.from(
                    { length: selectedDoc.pageCount || 0 },
                    (_, i) => i + 1
                  ).map((page) => (
                    <button
                      key={page}
                      onClick={() => setSelectedPage(page)}
                      className={`p-2 text-xs rounded border ${
                        selectedPage === page
                          ? "bg-[var(--primary)]/10 border-[var(--primary)]"
                          : "bg-white border-[var(--border)]"
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center Panel - Table List */}
        <div className="w-64 border-r border-[var(--border)] bg-white overflow-y-auto">
          <div className="p-4">
            <h2 className="text-sm font-semibold mb-3">
              Tables ({tables.length})
            </h2>
            {tables.length === 0 ? (
              <p className="text-sm text-[var(--foreground-muted)]">
                No tables found
              </p>
            ) : (
              <div className="space-y-2">
                {tables.map((table) => (
                  <button
                    key={table.id}
                    onClick={() => setSelectedTable(table)}
                    className={`w-full p-3 text-left text-sm rounded border transition-colors ${
                      selectedTable?.id === table.id
                        ? "bg-[var(--primary)]/10 border-[var(--primary)]"
                        : "border-[var(--border)] hover:bg-[var(--surface)]"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <TableIcon className="w-4 h-4 mt-0.5 text-[var(--primary)]" />
                      <div>
                        <div className="font-medium">
                          {table.tableName || "Unknown"}
                        </div>
                        <div className="text-xs text-[var(--foreground-muted)] mt-1">
                          Page {table.page} • Table {table.tableIndexOnPage + 1}
                        </div>
                        {table.confidence && (
                          <div className="text-xs text-[var(--foreground-subtle)] mt-1">
                            Confidence: {(table.confidence * 100).toFixed(0)}%
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Table Details */}
        <div className="flex-1 bg-white overflow-y-auto">
          {selectedTable ? (
            <div className="p-6">
              {/* Metadata */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">
                    {selectedTable.tableName || "Unknown Table"}
                  </h2>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadTableCSV(selectedTable)}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      CSV
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadTableJSON(selectedTable)}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      JSON
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 p-4 rounded-lg bg-[var(--surface)]">
                  <div>
                    <div className="text-xs text-[var(--foreground-muted)]">
                      Table ID
                    </div>
                    <div className="text-sm font-mono mt-1">
                      {selectedTable.tableId}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-[var(--foreground-muted)]">
                      Unit
                    </div>
                    <div className="text-sm mt-1">
                      {selectedTable.unit || "N/A"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-[var(--foreground-muted)]">
                      Confidence
                    </div>
                    <div className="text-sm mt-1">
                      {((selectedTable.confidence || 0) * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Context Above */}
              {selectedTable.contextAboveLines.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold">Context Above</h3>
                    <input
                      type="number"
                      min="1"
                      max="15"
                      value={contextLinesCount}
                      onChange={(e) =>
                        setContextLinesCount(parseInt(e.target.value))
                      }
                      className="w-16 px-2 py-1 text-xs border border-[var(--border)] rounded"
                    />
                  </div>
                  <div className="p-3 rounded bg-[var(--surface)] border-l-4 border-[var(--primary)]">
                    {selectedTable.contextAboveLines
                      .slice(0, contextLinesCount)
                      .map((line, i) => (
                        <div
                          key={i}
                          className="text-xs text-[var(--foreground-muted)] mb-1"
                        >
                          {line}
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Table Grid */}
              <div className="mb-4">
                <h3 className="text-sm font-semibold mb-2">Extracted Table</h3>
                <div className="overflow-x-auto border border-[var(--border)] rounded-lg">
                  <table className="min-w-full divide-y divide-[var(--border)]">
                    <thead className="bg-[var(--surface)]">
                      {selectedTable.rawTableGrid[0] && (
                        <tr>
                          {selectedTable.rawTableGrid[0].map((cell, idx) => (
                            <th
                              key={idx}
                              className="px-4 py-2 text-left text-xs font-semibold text-foreground"
                            >
                              {cell}
                            </th>
                          ))}
                        </tr>
                      )}
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {selectedTable.rawTableGrid.slice(1).map((row, rowIdx) => (
                        <tr key={rowIdx} className="hover:bg-[var(--surface)]">
                          {row.map((cell, cellIdx) => (
                            <td
                              key={cellIdx}
                              className="px-4 py-2 text-sm text-foreground"
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Context Below */}
              {selectedTable.contextBelowLines.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">Context Below</h3>
                  <div className="p-3 rounded bg-[var(--surface)] border-l-4 border-[var(--primary)]">
                    {selectedTable.contextBelowLines
                      .slice(0, contextLinesCount)
                      .map((line, i) => (
                        <div
                          key={i}
                          className="text-xs text-[var(--foreground-muted)] mb-1"
                        >
                          {line}
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <p className="text-[var(--foreground-muted)]">
                Select a table to view details
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
