"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { X, Bot, Mic, ArrowUp, Shield, Loader2 } from "lucide-react";

type AiOverlayProps = {
  aiOpen: boolean;
  setAiOpen: (value: boolean) => void;
};

type Message = { role: "user" | "assistant"; content: string };

export function AiOverlay({ aiOpen, setAiOpen }: AiOverlayProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (aiOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [aiOpen]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    setError(null);
    setInput("");
    const next: Message[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setLoading(true);

    let res: Response;
    try {
      res = await fetch("/api/pace-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, lang: "en" }),
      });
    } catch (e) {
      setLoading(false);
      setError(
        e instanceof Error ? e.message : "Network error reaching PacePace.",
      );
      return;
    }

    if (!res.ok) {
      setLoading(false);
      let msg = `Request failed (${res.status}).`;
      try {
        const j = await res.json();
        if (typeof j?.error === "string") msg = j.error;
      } catch {
        // body wasn't JSON — keep generic message
      }
      setError(msg);
      return;
    }

    if (!res.body) {
      setLoading(false);
      setError("Empty response from PacePace.");
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let reply = "";
    let appended = false;

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      reply += decoder.decode(value, { stream: true });
      if (!appended) {
        setLoading(false);
        setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
        appended = true;
      } else {
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: reply };
          return updated;
        });
      }
    }

    // Flush any final bytes the decoder was holding back, and cover the
    // empty-stream case where we never appended anything.
    reply += decoder.decode();
    if (!appended) {
      setLoading(false);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: reply || "_(no response)_" },
      ]);
    } else if (reply) {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: reply };
        return updated;
      });
    }

    inputRef.current?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  if (!aiOpen) return null;

  const isEmpty = messages.length === 0;

  return (
    <div className="fixed inset-0 z-[200] bg-[#f3f4f5]/80 backdrop-blur-xl flex flex-col">
      <div className="w-full bg-white/60 backdrop-blur-lg border-b border-white/30 px-5 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-[2px] text-[#1d2846]">
            {[1, 2, 3, 4].map((bar) => (
              <span
                key={bar}
                className="w-[3px] bg-[#1d2846] rounded-full animate-wave"
                style={{ height: `${10 + (bar % 2) * 6}px` }}
              />
            ))}
          </div>
          <div>
            <h3 className="font-bold text-lg text-[#1d2846]">
              PaceAI Interface
            </h3>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#1d2846]/70 font-medium">
              Intelligent Dining Assistant
            </p>
          </div>
        </div>
        <button
          onClick={() => setAiOpen(false)}
          className="w-10 h-10 rounded-full bg-white/50 border border-white/20 flex items-center justify-center cursor-pointer"
          aria-label="Close PaceAI"
        >
          <X className="w-5 h-5 text-[#1d2846]" />
        </button>
      </div>

      {isEmpty ? (
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="w-20 h-20 rounded-3xl bg-white/50 backdrop-blur-md border border-white/50 shadow-xl flex items-center justify-center mb-8">
            <Bot className="w-9 h-9 text-[#1d2846]" />
          </div>
          <h2 className="text-4xl font-bold text-[#1d2846] text-center tracking-tight mb-4">
            Call &quot;PacePace&quot; to Chat
          </h2>
          <p className="text-center text-[#1d2846]/80 font-medium max-w-2xl mb-10">
            Ask PacePace to find shops by cuisine, check how busy a queue is
            right now, or explain how Myanpace works.
          </p>

          <ChatInput
            value={input}
            onChange={setInput}
            onSend={send}
            onKeyDown={onKeyDown}
            loading={loading}
            inputRef={inputRef}
          />

          <div className="flex flex-wrap justify-center gap-4 mt-8">
            <div className="bg-white/50 backdrop-blur-md px-4 py-2 rounded-full border border-white/40 shadow-sm flex items-center gap-2 text-sm text-[#1d2846]">
              <Mic className="w-4 h-4" /> Voice Active
            </div>
            <div className="bg-white/50 backdrop-blur-md px-4 py-2 rounded-full border border-white/40 shadow-sm flex items-center gap-2 text-sm text-[#1d2846]">
              <Shield className="w-4 h-4" /> Secure Context
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0">
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-4 py-6 space-y-4"
          >
            <div className="max-w-2xl mx-auto w-full space-y-4">
              {messages.map((m, i) => (
                <MessageBubble key={i} role={m.role} content={m.content} />
              ))}
              {loading && (
                <div className="flex items-center gap-2 text-sm text-[#1d2846]/70 px-1">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  PacePace is checking the live data…
                </div>
              )}
              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-xl">
                  {error}
                </div>
              )}
            </div>
          </div>
          <div className="px-4 pb-6 pt-2">
            <ChatInput
              value={input}
              onChange={setInput}
              onSend={send}
              onKeyDown={onKeyDown}
              loading={loading}
              inputRef={inputRef}
            />
          </div>
        </div>
      )}
    </div>
  );
}

type ChatInputProps = {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  loading: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
};

function ChatInput({
  value,
  onChange,
  onSend,
  onKeyDown,
  loading,
  inputRef,
}: ChatInputProps) {
  return (
    <div className="w-full max-w-2xl mx-auto bg-white/60 backdrop-blur-lg border border-white/50 rounded-2xl p-2 flex items-center shadow-xl">
      <div className="px-4 text-[#1d2846]/70">
        <Mic className="w-5 h-5" />
      </div>
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        disabled={loading}
        placeholder="Ask about shops, cuisines, or queue times..."
        className="flex-1 bg-transparent outline-none py-4 text-[#1d2846] font-semibold placeholder:text-[#1d2846]/60 disabled:opacity-60"
      />
      <button
        onClick={onSend}
        disabled={loading || !value.trim()}
        aria-label="Send message"
        className="w-12 h-12 rounded-xl bg-[#1d2846] text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <ArrowUp className="w-5 h-5" />
        )}
      </button>
    </div>
  );
}

function MessageBubble({
  role,
  content,
}: {
  role: "user" | "assistant";
  content: string;
}) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={
          isUser
            ? "max-w-[80%] bg-[#1d2846] text-white px-4 py-3 rounded-2xl rounded-br-md shadow-md whitespace-pre-wrap"
            : "max-w-[85%] bg-white/70 backdrop-blur-md border border-white/60 text-[#1d2846] px-4 py-3 rounded-2xl rounded-bl-md shadow-md prose prose-sm prose-slate max-w-none"
        }
      >
        {isUser ? (
          content
        ) : (
          <ReactMarkdown
            components={{
              p: ({ children }) => (
                <p className="my-1 leading-relaxed">{children}</p>
              ),
              ul: ({ children }) => (
                <ul className="list-disc ml-5 my-1 space-y-0.5">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal ml-5 my-1 space-y-0.5">
                  {children}
                </ol>
              ),
              strong: ({ children }) => (
                <strong className="font-semibold">{children}</strong>
              ),
              code: ({ children }) => (
                <code className="bg-[#1d2846]/10 px-1 py-0.5 rounded text-[0.85em]">
                  {children}
                </code>
              ),
            }}
          >
            {content}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}
