"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type Lang = "en" | "my";

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResult {
  readonly length: number;
  readonly [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  readonly [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognition extends EventTarget {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

const QUICK_PROMPTS = {
  en: [
    "What is Myanpace?",
    "How does the queue work?",
    "What services are available?",
    "How do I get a token?",
  ],
  my: [
    "Myanpace ဆိုတာ ဘာလဲ?",
    "တန်းစီစနစ် ဘယ်လိုအလုပ်လုပ်လဲ?",
    "ဘယ်ဝန်ဆောင်မှုတွေ ရှိသလဲ?",
    "တိုကင် ဘယ်လို ယူမလဲ?",
  ],
};

const UI = {
  en: {
    title: "Myanpace Support",
    subtitle: "Ask me anything",
    placeholder: "Type a message...",
    thinking: "Thinking...",
    listeningLabel: "Listening...",
    speakTip: "Click mic to speak",
  },
  my: {
    title: "Myanpace ကူညီမှု",
    subtitle: "ဘာမဆို မေးနိုင်ပါသည်",
    placeholder: "စာရိုက်ပါ...",
    thinking: "တွေးနေသည်...",
    listeningLabel: "နားထောင်နေသည်...",
    speakTip: "မိုက်နှိပ်ပြီး ပြောပါ",
  },
};

// TS 5.x's DOM lib ships a built-in `Window.SpeechRecognition`, so augmenting
// the global here collides with it. Resolve the constructor via an unknown
// cast instead — keeps the local SpeechRecognition interface unambiguous.
type SpeechRecognitionCtor = new () => SpeechRecognition;
function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export default function ChatClient() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [lang, setLang] = useState<Lang>("en");
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [open, setOpen] = useState(false);
  const [showQuick, setShowQuick] = useState(true);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  // Init speech synthesis
  useEffect(() => {
    synthRef.current = window.speechSynthesis;
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Focus input when chat opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const speak = useCallback(
    (text: string) => {
      if (!synthRef.current) return;
      synthRef.current.cancel();
      const clean = text.replace(/[*_`#>]/g, "").slice(0, 300);
      const utter = new SpeechSynthesisUtterance(clean);
      utter.lang = lang === "my" ? "my-MM" : "en-US";
      utter.rate = 0.95;
      utter.pitch = 1;
      const voices = synthRef.current.getVoices();
      const preferred = voices.find((v) =>
        lang === "my" ? v.lang.startsWith("my") : v.lang.startsWith("en"),
      );
      if (preferred) utter.voice = preferred;
      utter.onstart = () => setSpeaking(true);
      utter.onend = () => setSpeaking(false);
      utter.onerror = () => setSpeaking(false);
      synthRef.current.speak(utter);
    },
    [lang],
  );

  const stopSpeaking = () => {
    synthRef.current?.cancel();
    setSpeaking(false);
  };

  const startListening = useCallback(() => {
    const SR = getSpeechRecognitionCtor();
    if (!SR) return;
    const rec = new SR();
    rec.lang = lang === "my" ? "my-MM" : "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onstart = () => setListening(true);
    rec.onresult = (e: SpeechRecognitionEvent) => {
      const transcript = e.results[0][0].transcript;
      setInput(transcript);
      setListening(false);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
  }, [lang]);

  const stopListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  async function sendMessage(text?: string) {
    const content = (text ?? input).trim();
    if (!content || loading) return;

    setShowQuick(false);
    setInput("");
    const newMessages: Message[] = [...messages, { role: "user", content }];
    setMessages(newMessages);
    setLoading(true);
    stopSpeaking();

    const res = await fetch("/api/support-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: newMessages, lang }),
    });

    if (!res.body) {
      setLoading(false);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let reply = "";

    setLoading(false);
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      reply += decoder.decode(value);
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: reply };
        return updated;
      });
    }

    speak(reply);
    inputRef.current?.focus();
  }

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const ui = UI[lang];

  return (
    <>
      {/* Floating bubble */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Open support chat"
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          background: open ? "#1a1a2e" : "#e63946",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
          zIndex: 9999,
          transition: "background 0.2s, transform 0.15s",
          transform: open ? "scale(0.92)" : "scale(1)",
        }}
      >
        <svg width="26" height="26" fill="none" viewBox="0 0 24 24">
          {open ? (
            <path
              d="M6 6l12 12M6 18L18 6"
              stroke="#fff"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          ) : (
            <path
              d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
              stroke="#fff"
              strokeWidth="2"
              strokeLinejoin="round"
              fill="none"
            />
          )}
        </svg>
      </button>

      {/* Chat window */}
      {open && (
        <div
          style={{
            position: "fixed",
            bottom: "92px",
            right: "24px",
            width: "min(390px, calc(100vw - 32px))",
            height: "min(580px, calc(100vh - 110px))",
            background: "#0f0f1a",
            borderRadius: "18px",
            boxShadow: "0 8px 40px rgba(0,0,0,0.35)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            zIndex: 9998,
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "16px 18px 14px",
              background: "#16162a",
              borderBottom: "1px solid rgba(255,255,255,0.07)",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "12px",
                background: "#e63946",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "18px",
                flexShrink: 0,
              }}
            >
              🤖
            </div>
            <div style={{ flex: 1 }}>
              <p
                style={{
                  margin: 0,
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "#f0f0f0",
                  fontFamily: "'Syne', 'Noto Sans Myanmar', sans-serif",
                }}
              >
                {ui.title}
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: "11px",
                  color: "rgba(255,255,255,0.45)",
                  fontFamily: "'Syne', 'Noto Sans Myanmar', sans-serif",
                }}
              >
                {ui.subtitle}
              </p>
            </div>

            {/* Lang toggle */}
            <div
              style={{
                display: "flex",
                background: "rgba(255,255,255,0.07)",
                borderRadius: "8px",
                padding: "3px",
                gap: "2px",
              }}
            >
              {(["en", "my"] as Lang[]).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  style={{
                    padding: "3px 9px",
                    borderRadius: "6px",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "11px",
                    fontWeight: 600,
                    fontFamily: "'Syne', sans-serif",
                    background: lang === l ? "#e63946" : "transparent",
                    color: lang === l ? "#fff" : "rgba(255,255,255,0.5)",
                    transition: "all 0.15s",
                  }}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Speaking indicator */}
            {speaking && (
              <button
                onClick={stopSpeaking}
                title="Stop speaking"
                style={{
                  background: "rgba(230,57,70,0.15)",
                  border: "1px solid rgba(230,57,70,0.4)",
                  borderRadius: "8px",
                  padding: "4px 8px",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                🔊
              </button>
            )}
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "16px 14px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              scrollbarWidth: "thin",
              scrollbarColor: "rgba(255,255,255,0.1) transparent",
            }}
          >
            {messages.length === 0 && (
              <div
                style={{
                  textAlign: "center",
                  color: "rgba(255,255,255,0.3)",
                  fontSize: "13px",
                  marginTop: "30px",
                  fontFamily: "'Syne', 'Noto Sans Myanmar', sans-serif",
                  lineHeight: 1.7,
                }}
              >
                <div style={{ fontSize: "32px", marginBottom: "8px" }}>👋</div>
                {lang === "en"
                  ? "Hi! How can I help you today?"
                  : "မင်္ဂလာပါ! ဘာကူညီရမလဲ?"}
              </div>
            )}

            {messages.map((m, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: m.role === "user" ? "flex-end" : "flex-start",
                }}
              >
                <div
                  style={{
                    maxWidth: "80%",
                    padding: "9px 13px",
                    borderRadius:
                      m.role === "user"
                        ? "14px 14px 4px 14px"
                        : "14px 14px 14px 4px",
                    background:
                      m.role === "user" ? "#e63946" : "rgba(255,255,255,0.07)",
                    border:
                      m.role === "assistant"
                        ? "1px solid rgba(255,255,255,0.08)"
                        : "none",
                    fontSize: "13px",
                    lineHeight: "1.65",
                    color:
                      m.role === "user" ? "#fff" : "rgba(255,255,255,0.88)",
                    fontFamily: "'Syne', 'Noto Sans Myanmar', sans-serif",
                  }}
                >
                  {m.role === "assistant" ? (
                    <ReactMarkdown
                      components={{
                        a: ({ ...props }) => (
                          <a
                            {...props}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: "#e63946" }}
                          />
                        ),
                        p: ({ ...props }) => (
                          <p style={{ margin: "0 0 6px" }} {...props} />
                        ),
                      }}
                    >
                      {m.content}
                    </ReactMarkdown>
                  ) : (
                    m.content
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <div
                  style={{
                    padding: "9px 14px",
                    background: "rgba(255,255,255,0.07)",
                    borderRadius: "14px 14px 14px 4px",
                    border: "1px solid rgba(255,255,255,0.08)",
                    display: "flex",
                    gap: "4px",
                    alignItems: "center",
                  }}
                >
                  {[0, 1, 2].map((j) => (
                    <span
                      key={j}
                      style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        background: "rgba(255,255,255,0.4)",
                        display: "inline-block",
                        animation: "bounce 1.2s infinite",
                        animationDelay: `${j * 0.2}s`,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Quick prompts */}
            {showQuick && messages.length === 0 && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "7px",
                  marginTop: "12px",
                }}
              >
                {QUICK_PROMPTS[lang].map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    style={{
                      background: "rgba(230,57,70,0.08)",
                      border: "1px solid rgba(230,57,70,0.25)",
                      borderRadius: "10px",
                      padding: "8px 12px",
                      color: "rgba(255,255,255,0.75)",
                      fontSize: "12px",
                      cursor: "pointer",
                      textAlign: "left",
                      fontFamily: "'Syne', 'Noto Sans Myanmar', sans-serif",
                      transition: "background 0.15s",
                    }}
                    onMouseOver={(e) =>
                      (e.currentTarget.style.background =
                        "rgba(230,57,70,0.15)")
                    }
                    onMouseOut={(e) =>
                      (e.currentTarget.style.background =
                        "rgba(230,57,70,0.08)")
                    }
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input bar */}
          <div
            style={{
              padding: "10px 12px",
              borderTop: "1px solid rgba(255,255,255,0.07)",
              background: "#16162a",
              display: "flex",
              alignItems: "flex-end",
              gap: "8px",
              flexShrink: 0,
            }}
          >
            {/* Mic button */}
            <button
              onClick={listening ? stopListening : startListening}
              title={listening ? "Stop" : ui.speakTip}
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                border: listening
                  ? "1px solid rgba(230,57,70,0.6)"
                  : "1px solid rgba(255,255,255,0.12)",
                background: listening
                  ? "rgba(230,57,70,0.15)"
                  : "rgba(255,255,255,0.05)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "16px",
                flexShrink: 0,
                animation: listening ? "pulse 1s infinite" : "none",
              }}
              aria-label={listening ? "Stop listening" : "Start voice input"}
            >
              {listening ? "🔴" : "🎙️"}
            </button>

            <textarea
              ref={inputRef}
              value={listening ? ui.listeningLabel : input}
              readOnly={listening}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder={ui.placeholder}
              rows={1}
              style={{
                flex: 1,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "10px",
                padding: "8px 12px",
                color: listening ? "rgba(255,255,255,0.45)" : "#f0f0f0",
                fontSize: "13px",
                fontFamily: "'Syne', 'Noto Sans Myanmar', sans-serif",
                resize: "none",
                outline: "none",
                lineHeight: "1.5",
                minHeight: "36px",
                maxHeight: "80px",
              }}
            />

            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              aria-label="Send message"
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                border: "none",
                background:
                  input.trim() && !loading
                    ? "#e63946"
                    : "rgba(255,255,255,0.08)",
                cursor: input.trim() && !loading ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                transition: "background 0.15s",
              }}
            >
              <svg
                width="16"
                height="16"
                fill="none"
                viewBox="0 0 24 24"
                style={{ transform: "rotate(45deg)" }}
              >
                <path
                  d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"
                  stroke={
                    input.trim() && !loading ? "#fff" : "rgba(255,255,255,0.3)"
                  }
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Myanmar:wght@400;500;700&family=Syne:wght@400;500;600;700&display=swap');
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-5px); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </>
  );
}
