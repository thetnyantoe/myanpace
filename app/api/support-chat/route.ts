import { Groq } from "groq-sdk";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

type ChatMessage = { role: "user" | "assistant" | "system"; content: string };

const SYSTEM_PROMPT = {
  en: `You are the friendly support assistant for Myanpace, a modern queue management and service platform.
You help users with general questions, how things work, troubleshooting, and anything they need.
Be warm, concise, and helpful. Respond in English. Use markdown sparingly — bold key points, use short lists when needed.
If asked about queues, tokens, or services, answer helpfully based on general knowledge of queue systems.
Keep answers under 120 words unless the user clearly needs a longer explanation.`,

  my: `သင်သည် Myanpace ၏ ဖော်ရွေသော Support Assistant ဖြစ်ပါသည်။ Myanpace သည် ခေတ်မီသော တန်းစီစီမံခန့်ခွဲမှုနှင့် ဝန်ဆောင်မှုပလပ်ဖောင်းတစ်ခုဖြစ်သည်။
သုံးစွဲသူများ၏ မေးမြန်းချက်များ၊ နည်းပညာပြဿနာများ၊ ဝန်ဆောင်မှုအကြောင်းများကို ကူညီပေးပါ။
မြန်မာဘာသာဖြင့် ဖော်ရွေစွာ ဖြေကြားပါ။ တိုတောင်းရှင်းလင်းသော ဖြေကြားချက်ပေးပါ။
တိုကင်များ၊ တန်းစီ၊ ဝန်ဆောင်မှုများနှင့် ပတ်သက်သည့် မေးမြန်းချက်များကိုလည်း ကူညီဖြေကြားပါ။
ဖြေကြားချက်ကို ၁၂၀ စကားလုံးအောက် တိုတောင်းအောင် ရေးပါ (ပိုရှည်ရန် လိုအပ်မှသာ ရှည်ပါ)။`,
};

// Lightweight in-memory rate limit. Sufficient for single-instance / hackathon
// scale. Production should swap in Upstash/Redis so limits survive restarts
// and multi-instance deploys.
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const MAX_MESSAGES = 20;
const MAX_CONTENT_BYTES = 4 * 1024;

const rateBuckets = new Map<string, { count: number; windowStart: number }>();

function takeRateToken(key: string): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(key);
  if (!bucket || now - bucket.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateBuckets.set(key, { count: 1, windowStart: now });
    return true;
  }
  if (bucket.count >= RATE_LIMIT_MAX) return false;
  bucket.count++;
  return true;
}

function isValidMessage(value: unknown): value is ChatMessage {
  if (typeof value !== "object" || value === null) return false;
  const m = value as Record<string, unknown>;
  if (m.role !== "user" && m.role !== "assistant" && m.role !== "system") {
    return false;
  }
  if (typeof m.content !== "string") return false;
  if (Buffer.byteLength(m.content, "utf8") > MAX_CONTENT_BYTES) return false;
  return true;
}

export async function POST(req: NextRequest) {
  // 1. Require an authenticated user — this endpoint streams paid completions.
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Per-user rate limit.
  if (!takeRateToken(user.id)) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please try again later." },
      { status: 429 },
    );
  }

  // 3. Parse + validate input.
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { messages, lang } = (body ?? {}) as {
    messages?: unknown;
    lang?: unknown;
  };

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json(
      { error: "`messages` must be a non-empty array." },
      { status: 400 },
    );
  }
  if (messages.length > MAX_MESSAGES) {
    return NextResponse.json(
      { error: `Too many messages (max ${MAX_MESSAGES}).` },
      { status: 400 },
    );
  }
  if (!messages.every(isValidMessage)) {
    return NextResponse.json(
      { error: "Each message must have role and string content (≤4KB)." },
      { status: 400 },
    );
  }

  const selectedLang: "en" | "my" = lang === "my" ? "my" : "en";

  const fullMessages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT[selectedLang] },
    ...messages.slice(-10), // keep last 10 turns for context
  ];

  const stream = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: fullMessages,
    temperature: 0.7,
    max_tokens: 400,
    stream: true,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) controller.enqueue(encoder.encode(content));
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
