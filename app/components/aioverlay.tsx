"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  X,
  Bot,
  Mic,
  MicOff,
  ArrowUp,
  Shield,
  Loader2,
  Languages,
} from "lucide-react";

type AiOverlayProps = {
  aiOpen: boolean;
  setAiOpen: (value: boolean) => void;
};

type Message = { role: "user" | "assistant"; content: string };
type Lang = "en" | "my";

const UI = {
  en: {
    heroTitle: 'Call "PacePace" to Chat',
    heroBody:
      "Ask PacePace to find shops, check live queue busyness, or take a token for you (sign in required to take tokens).",
    placeholder: "Ask about shops or ask to take a token...",
    voiceActive: "Voice Active",
    secure: "Secure Context",
    recording: "Recording… tap mic to stop",
    transcribing: "Transcribing…",
    spinnerHint: "PacePace is checking the live data…",
    voiceUnsupported: "Voice input is not supported in this browser.",
    micBlocked: "Microphone access denied or unavailable.",
    transcribeFailed: "Couldn't transcribe that — please try again.",
  },
  my: {
    heroTitle: '"PacePace" ကိုခေါ်ပြီး စကားပြောပါ',
    heroBody:
      "ဆိုင်ရှာဖွေဖို့၊ လက်ရှိတန်းစီအခြေအနေ စစ်ဖို့၊ သို့မဟုတ် သင့်ကိုယ်စား token ယူဖို့ PacePace ကို ပြောပါ (token ယူဖို့ sign in လိုသည်)။",
    placeholder: "ဆိုင်အကြောင်း မေးပါ၊ ဒါမှမဟုတ် token ယူပေးပါ ပြောပါ...",
    voiceActive: "အသံ ဖွင့်ထား",
    secure: "လုံခြုံသော ဆက်သွယ်မှု",
    recording: "အသံဖမ်းနေသည်… ရပ်ရန် မိုက်ကို နှိပ်ပါ",
    transcribing: "စာသားပြောင်းနေသည်…",
    spinnerHint: "PacePace က အချက်အလက် စစ်နေသည်…",
    voiceUnsupported: "ဤ browser တွင် voice input မရရှိနိုင်ပါ။",
    micBlocked: "မိုက်ခရိုဖုန်း သုံးခွင့် မရရှိပါ။",
    transcribeFailed: "ဖမ်းယူ၍မရပါ — ထပ်စမ်းကြည့်ပါ။",
  },
};

// Cap a single voice clip — Whisper's hard limit is 25MB but most demos won't
// need more than ~60s. We auto-stop at this duration to keep costs predictable.
const MAX_RECORD_MS = 60_000;

function pickRecorderMime(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c)) return c;
  }
  return undefined;
}

export function AiOverlay({ aiOpen, setAiOpen }: AiOverlayProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lang, setLang] = useState<Lang>("en");
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState<boolean | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingStartRef = useRef<number>(0);
  const autoStopRef = useRef<number | null>(null);

  const ui = UI[lang];

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ok =
      typeof navigator !== "undefined" &&
      !!navigator.mediaDevices?.getUserMedia &&
      typeof window.MediaRecorder !== "undefined";
    setVoiceSupported(ok);
  }, []);

  useEffect(() => {
    if (aiOpen) setTimeout(() => inputRef.current?.focus(), 100);
  }, [aiOpen]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading]);

  const cleanupRecording = useCallback(() => {
    if (autoStopRef.current !== null) {
      window.clearTimeout(autoStopRef.current);
      autoStopRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    recorderRef.current = null;
    chunksRef.current = [];
  }, []);

  // Stop recording if the overlay closes mid-capture.
  useEffect(() => {
    if (!aiOpen && recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
      setRecording(false);
      cleanupRecording();
    }
  }, [aiOpen, cleanupRecording]);

  const stopRecording = useCallback(() => {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
  }, []);

  const sendToWhisper = useCallback(
    async (blob: Blob) => {
      setTranscribing(true);
      setError(null);
      try {
        const form = new FormData();
        form.set(
          "audio",
          new File([blob], "clip.webm", { type: blob.type || "audio/webm" }),
        );
        form.set("lang", lang);

        const res = await fetch("/api/transcribe", {
          method: "POST",
          body: form,
        });

        if (!res.ok) {
          let msg = ui.transcribeFailed;
          try {
            const j = await res.json();
            if (typeof j?.error === "string") msg = j.error;
          } catch {
            // not JSON — keep generic
          }
          setError(msg);
          return;
        }

        const data = (await res.json()) as { text?: string };
        const text = (data.text ?? "").trim();
        if (text) {
          setInput((prev) => (prev ? prev + " " + text : text));
          inputRef.current?.focus();
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : ui.transcribeFailed);
      } finally {
        setTranscribing(false);
      }
    },
    [lang, ui.transcribeFailed],
  );

  const startRecording = useCallback(async () => {
    if (voiceSupported === false) {
      setError(ui.voiceUnsupported);
      return;
    }
    setError(null);

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError(ui.micBlocked);
      return;
    }

    const mimeType = pickRecorderMime();
    let rec: MediaRecorder;
    try {
      rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    } catch {
      stream.getTracks().forEach((t) => t.stop());
      setError(ui.voiceUnsupported);
      return;
    }

    chunksRef.current = [];
    rec.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };
    rec.onstop = async () => {
      const chunks = chunksRef.current;
      const type = rec.mimeType || mimeType || "audio/webm";
      cleanupRecording();
      setRecording(false);
      if (chunks.length === 0) return;
      const blob = new Blob(chunks, { type });
      if (blob.size === 0) return;
      await sendToWhisper(blob);
    };
    rec.onerror = () => {
      cleanupRecording();
      setRecording(false);
      setError(ui.micBlocked);
    };

    recorderRef.current = rec;
    streamRef.current = stream;
    recordingStartRef.current = Date.now();
    rec.start();
    setRecording(true);

    // Auto-stop after MAX_RECORD_MS so a forgotten mic doesn't dump a huge
    // upload (and bill against the OpenAI credit) when the user wanders off.
    autoStopRef.current = window.setTimeout(() => {
      if (recorderRef.current?.state === "recording") {
        recorderRef.current.stop();
      }
    }, MAX_RECORD_MS);
  }, [
    voiceSupported,
    cleanupRecording,
    sendToWhisper,
    ui.voiceUnsupported,
    ui.micBlocked,
  ]);

  const toggleMic = useCallback(() => {
    if (recording) stopRecording();
    else startRecording();
  }, [recording, startRecording, stopRecording]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    setError(null);
    setInput("");
    if (recording) stopRecording();

    const next: Message[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setLoading(true);

    let res: Response;
    try {
      res = await fetch("/api/pace-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, lang }),
      });
    } catch (e) {
      setLoading(false);
      setError(e instanceof Error ? e.message : "Network error.");
      return;
    }

    if (!res.ok) {
      setLoading(false);
      let msg = `Request failed (${res.status}).`;
      try {
        const j = await res.json();
        if (typeof j?.error === "string") msg = j.error;
      } catch {
        // not JSON
      }
      setError(msg);
      return;
    }

    if (!res.body) {
      setLoading(false);
      setError("Empty response.");
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
  const placeholder = recording
    ? ui.recording
    : transcribing
    ? ui.transcribing
    : ui.placeholder;

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
            <h3 className="font-bold text-lg text-[#1d2846]">PaceAI Interface</h3>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#1d2846]/70 font-medium">
              Intelligent Dining Assistant
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLang((l) => (l === "en" ? "my" : "en"))}
            className="h-9 px-3 rounded-full bg-white/50 border border-white/40 flex items-center gap-1.5 text-xs font-semibold text-[#1d2846] cursor-pointer"
            aria-label="Toggle language"
            title={lang === "en" ? "Switch to Burmese" : "Switch to English"}
          >
            <Languages className="w-3.5 h-3.5" />
            {lang === "en" ? "EN" : "MY"}
          </button>
          <button
            onClick={() => setAiOpen(false)}
            className="w-10 h-10 rounded-full bg-white/50 border border-white/20 flex items-center justify-center cursor-pointer"
            aria-label="Close PaceAI"
          >
            <X className="w-5 h-5 text-[#1d2846]" />
          </button>
        </div>
      </div>

      {isEmpty ? (
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="w-20 h-20 rounded-3xl bg-white/50 backdrop-blur-md border border-white/50 shadow-xl flex items-center justify-center mb-8">
            <Bot className="w-9 h-9 text-[#1d2846]" />
          </div>
          <h2 className="text-4xl font-bold text-[#1d2846] text-center tracking-tight mb-4">
            {ui.heroTitle}
          </h2>
          <p className="text-center text-[#1d2846]/80 font-medium max-w-2xl mb-10">
            {ui.heroBody}
          </p>

          <ChatInput
            value={input}
            onChange={setInput}
            onSend={send}
            onKeyDown={onKeyDown}
            loading={loading}
            inputRef={inputRef}
            recording={recording}
            transcribing={transcribing}
            onToggleMic={toggleMic}
            voiceSupported={voiceSupported}
            placeholder={placeholder}
          />

          <div className="flex flex-wrap justify-center gap-4 mt-8">
            <div className="bg-white/50 backdrop-blur-md px-4 py-2 rounded-full border border-white/40 shadow-sm flex items-center gap-2 text-sm text-[#1d2846]">
              <Mic className="w-4 h-4" /> {ui.voiceActive}
            </div>
            <div className="bg-white/50 backdrop-blur-md px-4 py-2 rounded-full border border-white/40 shadow-sm flex items-center gap-2 text-sm text-[#1d2846]">
              <Shield className="w-4 h-4" /> {ui.secure}
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
                  {ui.spinnerHint}
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
            <div className="max-w-2xl mx-auto">
              <ChatInput
                value={input}
                onChange={setInput}
                onSend={send}
                onKeyDown={onKeyDown}
                loading={loading}
                inputRef={inputRef}
                recording={recording}
                transcribing={transcribing}
                onToggleMic={toggleMic}
                voiceSupported={voiceSupported}
                placeholder={placeholder}
              />
            </div>
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
  recording: boolean;
  transcribing: boolean;
  onToggleMic: () => void;
  voiceSupported: boolean | null;
  placeholder: string;
};

function ChatInput({
  value,
  onChange,
  onSend,
  onKeyDown,
  loading,
  inputRef,
  recording,
  transcribing,
  onToggleMic,
  voiceSupported,
  placeholder,
}: ChatInputProps) {
  const micDisabled =
    voiceSupported === false || transcribing || (loading && !recording);
  return (
    <div className="w-full max-w-2xl mx-auto bg-white/60 backdrop-blur-lg border border-white/50 rounded-2xl p-2 flex items-center shadow-xl">
      <button
        type="button"
        onClick={onToggleMic}
        disabled={micDisabled}
        title={
          voiceSupported === false
            ? "Voice not supported"
            : transcribing
            ? "Transcribing"
            : recording
            ? "Stop recording"
            : "Start voice input"
        }
        aria-label={recording ? "Stop voice input" : "Start voice input"}
        className={`mx-1 w-10 h-10 rounded-full flex items-center justify-center transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
          recording
            ? "bg-red-500/90 text-white animate-pulse"
            : transcribing
            ? "bg-white/60 text-[#1d2846]"
            : "text-[#1d2846]/70 hover:bg-white/50"
        }`}
      >
        {transcribing ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : voiceSupported === false ? (
          <MicOff className="w-5 h-5" />
        ) : (
          <Mic className="w-5 h-5" />
        )}
      </button>
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        disabled={loading || recording || transcribing}
        placeholder={placeholder}
        className="flex-1 bg-transparent outline-none py-4 text-[#1d2846] font-semibold placeholder:text-[#1d2846]/60 disabled:opacity-60"
      />
      <button
        onClick={onSend}
        disabled={loading || recording || transcribing || !value.trim()}
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
