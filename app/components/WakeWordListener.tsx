"use client";

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  useSyncExternalStore,
} from "react";
import { usePathname } from "next/navigation";
import { Mic, MicOff, X } from "lucide-react";

const STORAGE_KEY = "pacepace:voice-enabled";
const DISMISS_KEY = "pacepace:prompt-dismissed";
const WAKE_REGEX = /\bhey\b/i;
const COOLDOWN_MS = 4000;
const OPEN_AI_EVENT = "pace:open-ai";

// Routes where the listener should sleep (auth flows only).
const SLEEP_PREFIXES = ["/login", "/register", "/auth"];

type RecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<{
    0: { transcript: string };
    isFinal: boolean;
    length: number;
  }>;
};

function getRecognitionCtor(): (new () => RecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => RecognitionLike;
    webkitSpeechRecognition?: new () => RecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const noopSubscribe = () => () => {};

function readEnabledPreference(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function readDismissedPreference(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === "true";
  } catch {
    return false;
  }
}

export default function WakeWordListener() {
  const pathname = usePathname();

  const supported = useSyncExternalStore(
    noopSubscribe,
    () => getRecognitionCtor() !== null,
    () => false,
  );

  const [enabled, setEnabled] = useState<boolean>(readEnabledPreference);
  const [listening, setListening] = useState(false);
  const [showPrompt, setShowPrompt] = useState<boolean>(
    () => !readEnabledPreference() && !readDismissedPreference(),
  );
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<RecognitionLike | null>(null);
  const lastTriggerRef = useRef<number>(0);
  const enabledRef = useRef(enabled);
  const shouldRunRef = useRef(false);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startRef = useRef<() => void>(() => {});

  // Keep refs in sync so async recognition callbacks see current values.
  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  const sleeping = SLEEP_PREFIXES.some((p) => pathname?.startsWith(p));

  const speakGreeting = useCallback(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    try {
      const utter = new SpeechSynthesisUtterance("What's up?");
      utter.rate = 1.05;
      utter.pitch = 1;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utter);
    } catch {
      // Speech synthesis is best-effort; ignore failures.
    }
  }, []);

  const stopRecognition = useCallback(() => {
    shouldRunRef.current = false;
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    const rec = recognitionRef.current;
    if (rec) {
      try {
        rec.onend = null;
        rec.onerror = null;
        rec.onresult = null;
        rec.abort();
      } catch {
        // ignore
      }
    }
    recognitionRef.current = null;
    // Defer to keep this out of any sync effect path (React 19 lint rule).
    queueMicrotask(() => setListening(false));
  }, []);

  const startRecognition = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    if (recognitionRef.current) return;

    let rec: RecognitionLike;
    try {
      rec = new Ctor();
    } catch {
      return;
    }
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";

    rec.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        // Only act on final results — interim transcripts re-fire constantly.
        if (!result.isFinal) continue;
        const transcript = result[0].transcript;
        if (!WAKE_REGEX.test(transcript)) continue;

        const now = Date.now();
        if (now - lastTriggerRef.current < COOLDOWN_MS) return;
        lastTriggerRef.current = now;

        speakGreeting();
        window.dispatchEvent(new CustomEvent(OPEN_AI_EVENT));
        return;
      }
    };

    rec.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setError("Microphone permission denied");
        setEnabled(false);
        enabledRef.current = false;
        shouldRunRef.current = false;
        try {
          localStorage.setItem(STORAGE_KEY, "false");
        } catch {
          // ignore
        }
      }
      // For 'no-speech', 'aborted', 'network', etc., onend will handle restart.
    };

    rec.onend = () => {
      setListening(false);
      recognitionRef.current = null;
      // Browsers cut continuous recognition after ~60s. Restart while we should.
      if (shouldRunRef.current && enabledRef.current) {
        restartTimerRef.current = setTimeout(() => {
          startRef.current();
        }, 300);
      }
    };

    try {
      rec.start();
      recognitionRef.current = rec;
      shouldRunRef.current = true;
      // setState deferred — keeps the effect body free of synchronous setState.
      queueMicrotask(() => {
        setListening(true);
        setError(null);
      });
    } catch {
      // start() throws if called too quickly after stop(); retry shortly.
      recognitionRef.current = null;
      restartTimerRef.current = setTimeout(() => {
        if (enabledRef.current && !sleeping) startRef.current();
      }, 500);
    }
  }, [speakGreeting, sleeping]);

  // Keep the ref pointing at the latest start function.
  useEffect(() => {
    startRef.current = startRecognition;
  }, [startRecognition]);

  // Drive recognition lifecycle from `enabled` + `sleeping`.
  useEffect(() => {
    if (!supported) return;
    if (enabled && !sleeping) {
      startRecognition();
    } else {
      stopRecognition();
    }
    return () => {
      stopRecognition();
    };
  }, [supported, enabled, sleeping, startRecognition, stopRecognition]);

  const handleEnable = useCallback(async () => {
    setShowPrompt(false);
    setError(null);
    try {
      // Explicit permission request — gives a clean prompt and a clear failure path.
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
    } catch {
      setError("Microphone permission denied");
      try {
        localStorage.setItem(STORAGE_KEY, "false");
      } catch {
        // ignore
      }
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, "true");
      localStorage.removeItem(DISMISS_KEY);
    } catch {
      // ignore
    }
    setEnabled(true);
  }, []);

  const handleDisable = useCallback(() => {
    setEnabled(false);
    try {
      localStorage.setItem(STORAGE_KEY, "false");
    } catch {
      // ignore
    }
  }, []);

  const handleDismissPrompt = useCallback(() => {
    setShowPrompt(false);
    try {
      localStorage.setItem(DISMISS_KEY, "true");
    } catch {
      // ignore
    }
  }, []);

  if (!supported) return null;

  return (
    <>
      {showPrompt && !enabled && (
        <div className="fixed bottom-8 right-left z-[60] max-w-xs rounded-xl bg-white shadow-lg ring-1 ring-black/5 p-4 flex gap-3 items-start">
          <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
            <Mic className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900">
              Enable Pace AI voice
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Say <span className="font-medium">&ldquo;hey&rdquo;</span>{" "}
              anywhere on the site to open Pace AI hands-free.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={handleEnable}
                className="px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium"
              >
                Enable
              </button>
              <button
                onClick={handleDismissPrompt}
                className="px-3 py-1.5 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium"
              >
                Not now
              </button>
            </div>
          </div>
          <button
            onClick={handleDismissPrompt}
            aria-label="Dismiss"
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Persistent floating toggle once user has made a choice. */}
      {!showPrompt && (
        <button
          onClick={enabled ? handleDisable : handleEnable}
          aria-label={
            enabled ? "Disable Pace AI voice" : "Enable Pace AI voice"
          }
          title={
            error
              ? error
              : enabled
                ? sleeping
                  ? "Voice paused on this page"
                  : listening
                    ? "Listening for “hey”"
                    : "Voice enabled"
                : "Enable “hey” voice"
          }
          className={`fixed bottom-[80px] left-4 z-[55] rounded-full p-3 shadow-lg ring-1 ring-black/5 transition ${
            enabled
              ? "bg-indigo-600 text-white hover:bg-indigo-700"
              : "bg-white text-gray-700 hover:bg-gray-50"
          }`}
        >
          <span className="relative flex items-center justify-center">
            {enabled ? (
              <Mic className="w-5 h-5" />
            ) : (
              <MicOff className="w-5 h-5" />
            )}
            {enabled && listening && !sleeping && (
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
              </span>
            )}
          </span>
        </button>
      )}
    </>
  );
}
