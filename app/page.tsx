"use client";

import { useState, useRef } from "react";
import { DocumentSidebar } from "@/components/document-sidebar";
import { ChatArea } from "@/components/chat-area";
import { EvidencePanel } from "@/components/evidence-panel";
import { ChatResponse } from "@/lib/qa/chat";

export default function Home() {
  const [selectedDocuments, setSelectedDocuments] = useState<number[]>([]);
  const [searchAllDocs, setSearchAllDocs] = useState(true);
  const [currentResponse, setCurrentResponse] = useState<ChatResponse | null>(null);
  const chatAreaRef = useRef<{ setQuestion: (question: string) => void }>(null);

  const handleQuestionClick = (question: string) => {
    chatAreaRef.current?.setQuestion(question);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Left Sidebar - Documents */}
      <DocumentSidebar
        selectedDocuments={selectedDocuments}
        onSelectionChange={setSelectedDocuments}
        searchAllDocs={searchAllDocs}
        onSearchAllChange={setSearchAllDocs}
        onQuestionClick={handleQuestionClick}
      />

      {/* Center - Chat */}
      <ChatArea
        ref={chatAreaRef}
        documentIds={searchAllDocs ? undefined : selectedDocuments}
        onResponse={setCurrentResponse}
      />

      {/* Right Sidebar - Evidence */}
      <EvidencePanel response={currentResponse} />
    </div>
  );
}
