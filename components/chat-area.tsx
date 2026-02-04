"use client";

import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { Send, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ChatResponse } from "@/lib/qa/chat";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  response?: ChatResponse;
}

interface ChatAreaProps {
  documentIds?: number[];
  onResponse: (response: ChatResponse | null) => void;
}

export interface ChatAreaRef {
  setQuestion: (question: string) => void;
}

export const ChatArea = forwardRef<ChatAreaRef, ChatAreaProps>(
  ({ documentIds, onResponse }, ref) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useImperativeHandle(ref, () => ({
      setQuestion: (question: string) => {
        setInput(question);
      },
    }));

    const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
      scrollToBottom();
    }, [messages]);

    const sendMessage = async () => {
      if (!input.trim() || loading) return;

      const userMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content: input.trim(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setLoading(true);
      onResponse(null);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: userMessage.content,
            documentIds,
          }),
        });

        const data: ChatResponse = await res.json();

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.answer,
          response: data,
        };

        setMessages((prev) => [...prev, assistantMessage]);
        onResponse(data);
      } catch (error) {
        console.error("Chat error:", error);
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "An error occurred. Please try again.",
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setLoading(false);
      }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    };

    return (
    <div className="flex-1 flex flex-col h-full bg-white">
      {/* Header */}
      <div className="p-4 border-b border-[var(--border)] bg-[var(--surface)]">
        <h1 className="text-xl font-semibold text-foreground">
          Vertis Document Chat
        </h1>
        <p className="text-sm text-[var(--foreground-muted)] mt-1">
          Ask questions about your documents
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-2xl px-4">
              <h2 className="text-2xl font-semibold text-foreground mb-2">
                Welcome to Vertis Document Chat
              </h2>
              <p className="text-[var(--foreground-muted)] mb-6">
                Ask factual questions or financial queries about your documents.
                The system will provide verbatim citations and table-based answers.
              </p>

              {/* Example Questions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                {/* Factual Questions (from document chunks) */}
                <div className="text-left">
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-blue-500"></span>
                    Factual Questions
                    <span className="text-xs font-normal text-[var(--foreground-muted)]">(from text)</span>
                  </h3>
                  <div className="space-y-2">
                    <button
                      onClick={() => handleExampleQuestion("Who is the auditor?")}
                      className="w-full text-left p-3 rounded-lg border border-[var(--border)] hover:bg-[var(--surface)] hover:border-[var(--primary)] transition-all text-sm text-foreground"
                    >
                      Who is the auditor?
                    </button>
                    <button
                      onClick={() => handleExampleQuestion("What is the company's registered office address?")}
                      className="w-full text-left p-3 rounded-lg border border-[var(--border)] hover:bg-[var(--surface)] hover:border-[var(--primary)] transition-all text-sm text-foreground"
                    >
                      What is the company's registered office address?
                    </button>
                    <button
                      onClick={() => handleExampleQuestion("What were the key decisions in the board meeting?")}
                      className="w-full text-left p-3 rounded-lg border border-[var(--border)] hover:bg-[var(--surface)] hover:border-[var(--primary)] transition-all text-sm text-foreground"
                    >
                      What were the key decisions in the board meeting?
                    </button>
                  </div>
                </div>

                {/* Financial Questions (from tables) */}
                <div className="text-left">
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
                    Financial Questions
                    <span className="text-xs font-normal text-[var(--foreground-muted)]">(from tables)</span>
                  </h3>
                  <div className="space-y-2">
                    <button
                      onClick={() => handleExampleQuestion("What are the financial ratios?")}
                      className="w-full text-left p-3 rounded-lg border border-[var(--border)] hover:bg-[var(--surface)] hover:border-[var(--primary)] transition-all text-sm text-foreground"
                    >
                      What are the financial ratios?
                    </button>
                    <button
                      onClick={() => handleExampleQuestion("What is the total distribution amount?")}
                      className="w-full text-left p-3 rounded-lg border border-[var(--border)] hover:bg-[var(--surface)] hover:border-[var(--primary)] transition-all text-sm text-foreground"
                    >
                      What is the total distribution amount?
                    </button>
                    <button
                      onClick={() => handleExampleQuestion("What is the NDCF for the current period?")}
                      className="w-full text-left p-3 rounded-lg border border-[var(--border)] hover:bg-[var(--surface)] hover:border-[var(--primary)] transition-all text-sm text-foreground"
                    >
                      What is the NDCF for the current period?
                    </button>
                  </div>
                </div>
              </div>

              <p className="text-xs text-[var(--foreground-subtle)] mt-6">
                💡 Click any question above to try it out
              </p>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[70%] rounded-lg px-4 py-3",
                  message.role === "user"
                    ? "bg-[var(--primary)] text-white"
                    : "bg-[var(--surface)] text-foreground border border-[var(--border)]"
                )}
              >
                <div className="text-sm whitespace-pre-wrap">
                  {message.content}
                </div>

                {message.response && (
                  <div className="mt-2 pt-2 border-t border-[var(--border-subtle)]">
                    <div className="text-xs text-[var(--foreground-muted)]">
                      Type: {message.response.questionType} • Confidence:{" "}
                      {message.response.confidence}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {loading && (
          <div className="flex justify-start">
            <div className="max-w-[70%] rounded-lg px-4 py-3 bg-[var(--surface)] border border-[var(--border)]">
              <div className="flex items-center gap-2 text-[var(--foreground-muted)]">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Analyzing documents...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-[var(--border)] bg-[var(--surface)]">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask a question about your documents..."
            disabled={loading}
            className="flex-1"
          />
          <Button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            size="icon"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>

        <div className="mt-2 text-xs text-[var(--foreground-subtle)]">
          💡 Tip: Click suggested questions in the left sidebar
        </div>
      </div>
    </div>
    );
  }
);

ChatArea.displayName = "ChatArea";
