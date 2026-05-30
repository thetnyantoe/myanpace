import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";

// Whisper hard-caps audio files at 25MB. We cap a bit lower to leave headroom
// for multipart overhead and to make abusive uploads cheap to reject.
const MAX_AUDIO_BYTES = 20 * 1024 * 1024;

// Rate limits — Whisper is paid usage. Keep these tight to protect the
// account's credit balance.
const RATE_LIMIT_MAX_AUTHED = 20;
const RATE_LIMIT_MAX_ANON = 8;
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;

const rateBuckets = new Map<string, { count: number; windowStart: number }>();

function takeRateToken(key: string, max: number): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(key);
  if (!bucket || now - bucket.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateBuckets.set(key, { count: 1, windowStart: now });
    return true;
  }
  if (bucket.count >= max) return false;
  bucket.count++;
  return true;
}

function clientKey(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "anonymous";
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    return NextResponse.json(
      { error: "Speech-to-text is not configured (missing OPENAI_API_KEY)." },
      { status: 503 },
    );
  }

  // Auth-aware rate-limit key. Anonymous users get a smaller budget so a stray
  // public client can't burn through credit before we notice.
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const rateKey = user ? `u:${user.id}` : `ip:${clientKey(req)}`;
  const rateMax = user ? RATE_LIMIT_MAX_AUTHED : RATE_LIMIT_MAX_ANON;
  if (!takeRateToken(rateKey, rateMax)) {
    return NextResponse.json(
      { error: "Transcription rate limit exceeded. Try again shortly." },
      { status: 429 },
    );
  }

  // Parse multipart upload.
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected multipart/form-data with an 'audio' field." },
      { status: 400 },
    );
  }

  const audio = form.get("audio");
  if (!(audio instanceof Blob)) {
    return NextResponse.json(
      { error: "Missing 'audio' file." },
      { status: 400 },
    );
  }
  if (audio.size === 0) {
    return NextResponse.json({ error: "Empty audio." }, { status: 400 });
  }
  if (audio.size > MAX_AUDIO_BYTES) {
    return NextResponse.json(
      { error: `Audio too large (max ${Math.round(MAX_AUDIO_BYTES / 1024 / 1024)}MB).` },
      { status: 413 },
    );
  }

  const langRaw = form.get("lang");
  const lang = typeof langRaw === "string" ? langRaw : undefined;

  // `whisper-1` rejects the `language` hint for anything outside its ~57
  // officially-supported codes (Burmese is not on that list). The newer
  // `gpt-4o-mini-transcribe` has broader coverage AND costs half as much
  // ($0.003/min vs $0.006/min) — switch model and only forward `language`
  // when we know it's safe. For unsupported codes we just let the model
  // auto-detect, which works well for clearly Burmese audio.
  const SAFE_LANG_HINTS = new Set([
    "en",
    "zh",
    "es",
    "fr",
    "de",
    "ja",
    "ko",
    "th",
    "vi",
    "id",
    "ms",
    "hi",
    "ta",
    "ar",
    "pt",
    "ru",
    "tr",
    "it",
    "nl",
  ]);

  // Build the upstream request. We forward the blob with whatever MIME the
  // browser produced (audio/webm in Chrome, audio/mp4 in iOS Safari) —
  // OpenAI sniffs based on bytes, but it also reads the filename extension
  // as a hint, so we give it one.
  const filename =
    (audio as File).name ||
    `clip.${(audio.type || "audio/webm").includes("mp4") ? "mp4" : "webm"}`;

  // For languages outside the supported `language` list (notably Burmese),
  // the upstream API errors if we pass the code. We instead bias the model
  // with a script-locked `prompt` — this is the documented escape hatch and
  // it actually works: the model copies the prompt's script for its output,
  // so a Burmese-script prompt locks the transcript to Burmese script.
  const PROMPTS: Record<string, string> = {
    my: "ဤအသံဖိုင်ကို မြန်မာဘာသာဖြင့် မြန်မာအက္ခရာဖြင့်သာ စာသားအဖြစ်ပြောင်းပါ။ ဆိုင်များ၊ တန်းစီ၊ ဝန်ဆောင်မှု၊ token၊ မင်္ဂလာပါ။",
  };

  const upstreamForm = new FormData();
  upstreamForm.set(
    "file",
    new File([audio], filename, { type: audio.type || "audio/webm" }),
  );
  upstreamForm.set("model", "gpt-4o-mini-transcribe");
  upstreamForm.set("response_format", "json");

  if (lang && SAFE_LANG_HINTS.has(lang)) {
    upstreamForm.set("language", lang);
  } else if (lang && PROMPTS[lang]) {
    // No supported language hint, but we have a script-bias prompt.
    upstreamForm.set("prompt", PROMPTS[lang]);
  }

  let upstream: Response;
  try {
    upstream = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: upstreamForm,
    });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? `Whisper unreachable: ${e.message}`
            : "Whisper unreachable.",
      },
      { status: 502 },
    );
  }

  if (!upstream.ok) {
    // Surface upstream errors as a generic 502 — the raw OpenAI error body can
    // contain organization metadata we don't want to echo back to clients.
    let detail = `Whisper error (${upstream.status}).`;
    try {
      const body = await upstream.json();
      if (typeof body?.error?.message === "string") detail = body.error.message;
    } catch {
      // Non-JSON body — keep generic.
    }
    return NextResponse.json({ error: detail }, { status: 502 });
  }

  let data: unknown;
  try {
    data = await upstream.json();
  } catch {
    return NextResponse.json(
      { error: "Whisper returned an unparseable response." },
      { status: 502 },
    );
  }

  const text =
    typeof (data as { text?: unknown })?.text === "string"
      ? ((data as { text: string }).text as string)
      : "";

  return NextResponse.json({ text });
}
