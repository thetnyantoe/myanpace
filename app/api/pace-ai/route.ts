import { Groq } from "groq-sdk";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { ACTIVE_QUEUE_STATUSES } from "@/lib/queue/types";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

type ChatMessage = {
  role: "user" | "assistant" | "system" | "tool";
  content: string | null;
  tool_call_id?: string;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
};

const SYSTEM_PROMPT = {
  en: `You are PacePace, the friendly AI concierge for Myanpace — a modern queue management platform for restaurants and shops.
You help visitors discover shops, check how busy a queue is right now, and understand how the platform works.
You have READ-ONLY access to live shop and queue data via tools. ALWAYS call a tool when the user asks about specific shops, categories, or current busyness — never invent shop names, numbers, or wait estimates.
You CANNOT join a queue, cancel a ticket, or make a reservation on the user's behalf. If asked, politely point them to do it inside the Myanpace app.
Reservations are not yet supported on Myanpace — only walk-in queue tickets. Be honest about this if asked.
Be warm, concise, and helpful. Use markdown sparingly — bold key points and use short lists when useful.
Respond in English. Keep answers under 120 words unless the user clearly needs more detail.`,

  my: `သင်သည် Myanpace ၏ AI Concierge ဖြစ်သော PacePace ဖြစ်ပါသည်။ Myanpace သည် စားသောက်ဆိုင်နှင့် ဆိုင်များအတွက် ခေတ်မီသော တန်းစီစီမံခန့်ခွဲမှု ပလပ်ဖောင်းတစ်ခု ဖြစ်သည်။
ဆိုင်များကို ရှာဖွေဖို့၊ လက်ရှိတန်းစီ ဘယ်လောက်ရှည်နေသလဲ စစ်ဆေးဖို့၊ ပလပ်ဖောင်း အလုပ်လုပ်ပုံကို နားလည်ဖို့ ကူညီပါ။
သင်သည် tools မှတဆင့် live ဆိုင်နှင့် တန်းစီအချက်အလက်များကို read-only ဖြင့်သာ အသုံးပြုနိုင်သည်။ ဆိုင်အကြောင်း တိကျမေးခွန်း မေးလာပါက tools ကို အမြဲသုံးပါ — အချက်အလက်များကို ကိုယ်တိုင် မဖန်တီးပါနှင့်။
သင်သည် တန်းစီဝင်ခြင်း၊ ticket ဖျက်ခြင်း၊ reservation လုပ်ခြင်းများ ပြုလုပ်ပေး၍မရပါ။ မေးလာပါက app ထဲတွင် ပြုလုပ်ရန် ယဉ်ကျေးစွာ ညွှန်ပြပါ။
Myanpace တွင် ယခုထိ reservation စနစ်မရှိသေးပါ — walk-in တန်းစီ ticket များသာ ရှိသည်။ မေးခွန်းရှိပါက ပွင့်လင်းစွာ ပြောပါ။
ဖော်ရွေစွာ၊ တိုတောင်းရှင်းလင်းစွာ ဖြေပါ။ မြန်မာဘာသာဖြင့် ဖြေပါ။ ၁၂၀ စကားလုံးအောက် တိုတောင်းအောင် ဖြေပါ (ပိုရှည်ရန် လိုအပ်မှသာ ရှည်ပါ)။`,
};

const RATE_LIMIT_MAX = 15;
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const MAX_MESSAGES = 20;
const MAX_CONTENT_BYTES = 4 * 1024;
const MAX_TOOL_ROUNDS = 3;

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

function clientKey(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "anonymous";
}

function isValidIncomingMessage(value: unknown): value is {
  role: "user" | "assistant";
  content: string;
} {
  if (typeof value !== "object" || value === null) return false;
  const m = value as Record<string, unknown>;
  if (m.role !== "user" && m.role !== "assistant") return false;
  if (typeof m.content !== "string") return false;
  if (Buffer.byteLength(m.content, "utf8") > MAX_CONTENT_BYTES) return false;
  return true;
}

const tools = [
  {
    type: "function" as const,
    function: {
      name: "list_shops",
      description:
        "Search restaurants/shops on Myanpace. Filter by partial name, category (cuisine), and/or location keyword. Returns up to 10 matches.",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Partial shop name to match (case-insensitive).",
          },
          category: {
            type: "string",
            description:
              "Category / cuisine name to filter by (e.g. 'Burmese', 'Coffee').",
          },
          location: {
            type: "string",
            description: "Location keyword (e.g. 'Yangon', 'downtown').",
          },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_shop_busyness",
      description:
        "Look up how busy a specific shop's queue is right now. Returns active ticket count and how many tickets have been issued total.",
      parameters: {
        type: "object",
        properties: {
          shop_name: {
            type: "string",
            description: "Exact or partial shop name.",
          },
        },
        required: ["shop_name"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "list_categories",
      description:
        "List all shop categories (cuisine types) currently available on Myanpace.",
      parameters: { type: "object", properties: {} },
    },
  },
];

function pickFirst<T>(maybe: T | T[] | null | undefined): T | undefined {
  if (Array.isArray(maybe)) return maybe[0];
  return maybe ?? undefined;
}

async function executeTool(
  name: string,
  rawArgs: string,
): Promise<unknown> {
  let args: Record<string, unknown> = {};
  try {
    args = rawArgs ? JSON.parse(rawArgs) : {};
  } catch {
    return { error: "Invalid tool arguments JSON." };
  }

  const admin = createAdminClient();

  if (name === "list_shops") {
    let q = admin
      .from("Shop")
      .select(
        `id, name, description, location, is_available, brand:Brand(name), category:Category(category_name)`,
      )
      .limit(10);

    if (typeof args.name === "string" && args.name.trim()) {
      q = q.ilike("name", `%${args.name.trim()}%`);
    }
    if (typeof args.location === "string" && args.location.trim()) {
      q = q.ilike("location", `%${args.location.trim()}%`);
    }

    const { data, error } = await q;
    if (error) return { error: error.message };

    let shops = data ?? [];
    if (typeof args.category === "string" && args.category.trim()) {
      const cat = args.category.trim().toLowerCase();
      shops = shops.filter((s: any) =>
        pickFirst<any>(s.category)?.category_name?.toLowerCase().includes(cat),
      );
    }

    return shops.map((s: any) => ({
      name: s.name,
      description: s.description,
      location: s.location,
      available: s.is_available,
      brand: pickFirst<any>(s.brand)?.name,
      category: pickFirst<any>(s.category)?.category_name,
    }));
  }

  if (name === "get_shop_busyness") {
    if (typeof args.shop_name !== "string" || !args.shop_name.trim()) {
      return { error: "shop_name is required." };
    }
    const { data: shop, error: shopErr } = await admin
      .from("Shop")
      .select("id, name")
      .ilike("name", `%${args.shop_name.trim()}%`)
      .limit(1)
      .maybeSingle();
    if (shopErr) return { error: shopErr.message };
    if (!shop) return { error: `No shop matching "${args.shop_name}".` };

    const { data: tickets, error: tErr } = await admin
      .from("Ticket")
      .select("status")
      .eq("shopId", shop.id);
    if (tErr) return { error: tErr.message };

    const list = tickets ?? [];
    const active = list.filter((t: any) =>
      ACTIVE_QUEUE_STATUSES.includes(t.status),
    ).length;
    return {
      shop: shop.name,
      active_in_queue: active,
      total_tickets_issued: list.length,
    };
  }

  if (name === "list_categories") {
    const { data, error } = await admin
      .from("Category")
      .select("category_name");
    if (error) return { error: error.message };
    return (data ?? [])
      .map((c: any) => c.category_name)
      .filter((n: unknown) => typeof n === "string" && n.length > 0);
  }

  return { error: `Unknown tool: ${name}` };
}

export async function POST(req: NextRequest) {
  // 1. Per-IP rate limit. Endpoint is anonymous-friendly, so the key is the
  //    client IP, not user.id.
  if (!takeRateToken(clientKey(req))) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please try again in a few minutes." },
      { status: 429 },
    );
  }

  // 2. Parse + validate input.
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
  if (!messages.every(isValidIncomingMessage)) {
    return NextResponse.json(
      { error: "Each message must have role user|assistant and string content (≤4KB)." },
      { status: 400 },
    );
  }

  const selectedLang: "en" | "my" = lang === "my" ? "my" : "en";

  const working: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT[selectedLang] },
    ...(messages as Array<{ role: "user" | "assistant"; content: string }>)
      .slice(-10)
      .map((m) => ({ role: m.role, content: m.content }) as ChatMessage),
  ];

  // 3. Tool-calling loop, non-streaming. Groq's streaming API delivers
  //    tool_calls in chunks which makes mid-stream dispatch brittle — instead
  //    we resolve all tool rounds first, then stream the final assistant turn.
  try {
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: working as any,
        tools: tools as any,
        tool_choice: "auto",
        temperature: 0.5,
        max_tokens: 600,
      });

      const choice = completion.choices[0]?.message;
      if (!choice) break;

      const toolCalls = choice.tool_calls ?? [];
      if (toolCalls.length === 0) {
        // Model is ready to answer — stream a fresh completion for the same
        // state so the user sees the text appear progressively.
        break;
      }

      working.push({
        role: "assistant",
        content: choice.content ?? null,
        tool_calls: toolCalls.map((tc: any) => ({
          id: tc.id,
          type: "function",
          function: { name: tc.function.name, arguments: tc.function.arguments },
        })),
      });

      const results = await Promise.all(
        toolCalls.map(async (tc: any) => {
          const result = await executeTool(
            tc.function.name,
            tc.function.arguments ?? "{}",
          );
          return {
            role: "tool" as const,
            tool_call_id: tc.id,
            content: JSON.stringify(result),
          };
        }),
      );
      working.push(...results);
    }
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? `Upstream model error: ${e.message}`
            : "Upstream model error.",
      },
      { status: 502 },
    );
  }

  // 4. Stream the final assistant turn. tool_choice forced to "none" so the
  //    model commits to text instead of opening a new tool round we wouldn't
  //    handle.
  const stream = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: working as any,
    tools: tools as any,
    tool_choice: "none",
    temperature: 0.5,
    max_tokens: 600,
    stream: true,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content;
          if (content) controller.enqueue(encoder.encode(content));
        }
      } catch (e) {
        controller.enqueue(
          encoder.encode(
            `\n\n_(Sorry, the response was cut short${
              e instanceof Error ? `: ${e.message}` : ""
            }.)_`,
          ),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
