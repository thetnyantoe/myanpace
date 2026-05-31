// Switched off Groq for the demo — its free-tier TPM bucket runs out after a
// handful of tool-using turns. The SDK is kept installed in case we want to
// dual-route later, but the client below is commented out.
// import { Groq } from "groq-sdk";
import OpenAI from "openai";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import {
  createQueueTicket,
  cancelQueueTicket,
} from "@/backend/queue";
import { ACTIVE_QUEUE_STATUSES } from "@/lib/queue/types";

// gpt-5-mini: cheap+fast tier with reliable tool calling and natural Burmese.
// Replaces gpt-4o-mini which OpenAI retired — calls against the old name now
// 404 and surfaced as a 500 here because the streaming call below is outside
// the tool-loop try/catch.
const CHAT_MODEL = "gpt-5-mini";

// IMPORTANT: instantiate inside the handler, not at module top level. The
// OpenAI SDK throws synchronously when `apiKey` is undefined, and Next.js
// imports route files during build (Vercel's "Collecting page data" phase) —
// a missing env var would crash the build, not just the request.
function getOpenAI(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY;
  if (!key || !key.trim()) return null;
  return new OpenAI({ apiKey: key });
}

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

const SYSTEM_PROMPT_AUTHED = {
  en: `You are PacePace, the friendly AI concierge for Myanpace — a modern queue management platform for restaurants and shops.
The user is signed in as a customer, so you can help them discover shops, check live queue busyness, AND take a queue token on their behalf.

You have these tools:
- list_shops: search shops by name / category / location.
- get_shop_busyness: live active-ticket count for a specific shop.
- list_categories: all available cuisine categories.
- check_my_tickets: list this customer's currently active tickets.
- join_queue: take a queue token at a shop for N people. REQUIRES confirmation.
- cancel_my_ticket: cancel one of this customer's tickets. REQUIRES confirmation.

CRITICAL RULES:
1. NEVER invent shop names, busyness numbers, ticket numbers, or wait estimates — always call a tool.
2. Before calling join_queue, you MUST confirm BOTH the exact shop AND the party size with the user in chat. Example: "Just to confirm — take a token at Shwe Mandalay for 2 people?". Only call join_queue after the user says yes/confirms.
3. Before calling cancel_my_ticket, confirm WHICH ticket the user wants to cancel.
4. If the user names a shop loosely (e.g. "the burmese place"), call list_shops first to disambiguate, then confirm with the user.
5. Reservations do not exist yet — only walk-in queue tokens. Be honest if asked.

ANTI-HALLUCINATION RULES — these are not negotiable:
A. You may ONLY claim a token was taken if you JUST received a successful join_queue tool result with ok=true AND a numeric ticket_no in THIS turn. You may NOT rely on prior turns.
B. If join_queue returned an "error" field (or ok is missing/false), you MUST say "I couldn't take the token" and quote the error text. NEVER invent a ticket_no.
C. When the user clearly says yes / confirms / "go ahead" after you proposed taking a token, you MUST call join_queue immediately. Do NOT respond with success text without calling the tool.
D. Quote ticket_no and queue_position EXACTLY as they appear in the tool result. Never round, change, or guess them.
E. The same rules apply to cancel_my_ticket — only claim success after a successful tool result this turn.

Be warm, concise, helpful. Use markdown sparingly. English. Under 120 words unless detail is requested.`,

  my: `သင်သည် Myanpace ၏ AI Concierge ဖြစ်သော PacePace ဖြစ်ပါသည်။ Myanpace သည် စားသောက်ဆိုင်နှင့် ဆိုင်များအတွက် ခေတ်မီသော တန်းစီစီမံခန့်ခွဲမှု ပလပ်ဖောင်းဖြစ်သည်။
သုံးစွဲသူသည် customer အဖြစ် sign in ဝင်ထားသူဖြစ်သည်။ ဆိုင်ရှာဖွေပေးခြင်း၊ live queue ၏ အလုပ်များမှု စစ်ပေးခြင်းအပြင် သူ့ကိုယ်စား queue token ယူပေးနိုင်ပါသည်။

ရရှိနိုင်သော tools များ:
- list_shops: နာမည်/category/location ဖြင့် ဆိုင်ရှာသည်။
- get_shop_busyness: ဆိုင်တစ်ခု၏ လက်ရှိ active ticket အရေအတွက်။
- list_categories: ရရှိနိုင်သော cuisine category များ။
- check_my_tickets: သုံးစွဲသူ၏ လက်ရှိ active tickets စာရင်း။
- join_queue: ဆိုင်တစ်ခုတွင် N ယောက်အတွက် queue token ယူသည်။ ဥပစာအတည်ပြုခြင်း လိုသည်။
- cancel_my_ticket: ticket တစ်ခု ဖျက်သိမ်းသည်။ ဥပစာအတည်ပြုခြင်း လိုသည်။

အရေးကြီးသော စည်းမျဉ်းများ:
1. ဆိုင်နာမည်၊ အလုပ်များမှု၊ ticket နံပါတ်များကို ကိုယ်တိုင် မဖန်တီးပါနှင့် — အမြဲ tool ခေါ်ပါ။
2. join_queue မခေါ်မီ ဆိုင်နှင့် လူဦးရေကို သုံးစွဲသူနှင့် chat ထဲတွင် အတည်ပြုပါ။ ဥပမာ: "Shwe Mandalay တွင် ၂ ယောက်အတွက် token ယူလိုက်ပါမည်နော်?"။ သုံးစွဲသူက သဘောတူပြီးမှ join_queue ခေါ်ပါ။
3. cancel_my_ticket မခေါ်မီ မည်သည့် ticket ကို ဖျက်မည်ဆိုသည် အတည်ပြုပါ။
4. ဆိုင်နာမည်ကို ဝါးဝါးပြောလျှင် list_shops ဖြင့် ရှာဖွေပြီး အတည်ပြုပါ။
5. Myanpace တွင် reservation စနစ်မရှိသေးပါ — walk-in queue token များသာရှိသည်။

HALLUCINATION မဖြစ်စေရန် တင်းကြပ်သော စည်းမျဉ်းများ:
A. ဤ turn အတွင်း join_queue tool က ok=true နှင့် ticket_no ပါသော အောင်မြင်သည့် ရလဒ်ပြန်လာမှသာ "token ရပါပြီ" ဟု ပြောနိုင်သည်။ ယခင် turn ၏ ရလဒ်ကို မမှီခိုပါနှင့်။
B. join_queue က "error" field ပြန်ပါက (သို့မဟုတ် ok မပါ/false ဖြစ်ပါက) "token မရရှိပါ" ဟု ပြောပြီး error စာသားကို ပြန်ပြောရမည်။ ticket_no ကို ကိုယ်တိုင် မဖန်တီးပါနှင့်။
C. သုံးစွဲသူက "ဟုတ်ကဲ့"၊ "လုပ်ပါ"၊ "သဘောတူပါသည်" စသည် အတည်ပြုလျှင် join_queue ကို ချက်ချင်း ခေါ်ရမည်။ tool မခေါ်ဘဲ အောင်မြင်ကြောင်း မပြောပါနှင့်။
D. ticket_no နှင့် queue_position ကို tool result အတိုင်း တိကျစွာ ပြောရမည်။ ပြောင်းခြင်း/ခန့်မှန်းခြင်း မပြုပါနှင့်။
E. cancel_my_ticket အတွက်လည်း တူညီသော စည်းမျဉ်းများ — အောင်မြင်သည့် tool result ပြန်လာမှသာ အောင်မြင်ကြောင်း ပြောရမည်။

ဖော်ရွေစွာ၊ တိုတောင်းရှင်းလင်းစွာ မြန်မာဘာသာဖြင့် ဖြေပါ။ ၁၂၀ စကားလုံးအောက် တိုတောင်းအောင် ဖြေပါ။`,
};

const SYSTEM_PROMPT_ANON = {
  en: `You are PacePace, the friendly AI concierge for Myanpace — a modern queue management platform for restaurants and shops.
The user is NOT signed in, so you can only help them DISCOVER shops and check busyness. You CANNOT take a token or cancel one on their behalf — those require signing in.

Tools available:
- list_shops: search shops by name / category / location.
- get_shop_busyness: live active-ticket count for a specific shop.
- list_categories: all cuisine categories.

CRITICAL RULES:
1. NEVER invent shop names, busyness numbers, or wait estimates — always call a tool.
2. If the user asks you to join a queue / take a token / cancel a ticket, politely tell them they need to sign in first, then they can ask you again.
3. Reservations do not exist yet — only walk-in queue tokens.

Be warm, concise, helpful. Use markdown sparingly. English. Under 120 words.`,

  my: `သင်သည် Myanpace ၏ AI Concierge ဖြစ်သော PacePace ဖြစ်ပါသည်။
သုံးစွဲသူသည် sign in ဝင်မထားသေးပါ။ ထို့ကြောင့် ဆိုင်များ ရှာဖွေပေးခြင်းနှင့် busyness စစ်ပေးခြင်းသာ ပြုလုပ်နိုင်ပါသည်။ token ယူခြင်း သို့မဟုတ် ticket ဖျက်ခြင်းတို့ကို သုံးစွဲသူ ကိုယ်တိုင် sign in ဝင်ပြီးမှ ပြုလုပ်ရပါမည်။

ရရှိနိုင်သော tools များ:
- list_shops: နာမည်/category/location ဖြင့် ဆိုင်ရှာသည်။
- get_shop_busyness: ဆိုင်တစ်ခု၏ လက်ရှိ active ticket အရေအတွက်။
- list_categories: cuisine category များ။

အရေးကြီးသော စည်းမျဉ်းများ:
1. ဆိုင်နာမည်၊ နံပါတ်များကို ကိုယ်တိုင် မဖန်တီးပါနှင့် — အမြဲ tool ခေါ်ပါ။
2. သုံးစွဲသူက queue ဝင်ပေးပါ၊ token ယူပေးပါ၊ ticket ဖျက်ပေးပါဟု ပြောလျှင် sign in ဝင်ရန် ယဉ်ကျေးစွာ ပြောပါ။
3. Myanpace တွင် reservation စနစ်မရှိသေးပါ။

ဖော်ရွေစွာ၊ မြန်မာဘာသာဖြင့်၊ ၁၂၀ စကားလုံးအောက် ဖြေပါ။`,
};

const RATE_LIMIT_MAX_AUTHED = 30;
const RATE_LIMIT_MAX_ANON = 15;
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const MAX_MESSAGES = 20;
const MAX_CONTENT_BYTES = 4 * 1024;
const MAX_TOOL_ROUNDS = 4;

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

const READ_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "list_shops",
      description:
        "Search restaurants/shops on Myanpace. Filter by partial name, category (cuisine), and/or location keyword. Returns up to 10 matches.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Partial shop name." },
          category: {
            type: "string",
            description: "Category / cuisine (e.g. 'Burmese', 'Coffee').",
          },
          location: { type: "string", description: "Location keyword." },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_shop_busyness",
      description:
        "Look up how busy a specific shop's queue is right now. Returns active ticket count and total tickets issued.",
      parameters: {
        type: "object",
        properties: {
          shop_name: { type: "string", description: "Exact or partial shop name." },
        },
        required: ["shop_name"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "list_categories",
      description: "List all shop categories (cuisine types) on Myanpace.",
      parameters: { type: "object", properties: {} },
    },
  },
];

const CUSTOMER_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "check_my_tickets",
      description:
        "List the signed-in customer's currently active queue tickets (PENDING / NOTIFIED / SERVING).",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "join_queue",
      description:
        "Take a queue token at a shop on the user's behalf. ONLY call this after the user has explicitly confirmed both the shop and the party size in chat.",
      parameters: {
        type: "object",
        properties: {
          shop_name: {
            type: "string",
            description: "Exact or near-exact shop name to join.",
          },
          person_count: {
            type: "integer",
            description: "Number of people in the party (1-10).",
          },
        },
        required: ["shop_name", "person_count"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "cancel_my_ticket",
      description:
        "Cancel one of the signed-in customer's queue tickets. ONLY call after the user has confirmed which ticket to cancel.",
      parameters: {
        type: "object",
        properties: {
          ticket_id: {
            type: "string",
            description: "The id of the ticket to cancel (from check_my_tickets).",
          },
        },
        required: ["ticket_id"],
      },
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
  ctx: { userId: string | null },
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
    const { data, error } = await admin.from("Category").select("category_name");
    if (error) return { error: error.message };
    return (data ?? [])
      .map((c: any) => c.category_name)
      .filter((n: unknown) => typeof n === "string" && n.length > 0);
  }

  // ---- Customer-only mutations below ----

  if (name === "check_my_tickets") {
    if (!ctx.userId) {
      return { error: "Sign in required to view your tickets." };
    }
    const { data, error } = await admin
      .from("Ticket")
      .select(
        "id, shopId, ticketNo, status, personCount, createdAt, notifiedAt",
      )
      .eq("customerId", ctx.userId)
      .in("status", ACTIVE_QUEUE_STATUSES)
      .order("createdAt", { ascending: true });
    if (error) return { error: error.message };

    const tickets = data ?? [];
    if (tickets.length === 0) {
      return { tickets: [], note: "No active tickets." };
    }

    // Resolve shop names so the AI can talk about them naturally.
    const shopIds = Array.from(new Set(tickets.map((t: any) => t.shopId)));
    const { data: shops } = await admin
      .from("Shop")
      .select("id, name")
      .in("id", shopIds);
    const nameById = new Map(
      (shops ?? []).map((s: any) => [s.id, s.name] as const),
    );

    return {
      tickets: tickets.map((t: any) => ({
        ticket_id: t.id,
        shop: nameById.get(t.shopId) ?? "(unknown shop)",
        ticket_no: t.ticketNo,
        status: t.status,
        person_count: t.personCount,
      })),
    };
  }

  if (name === "join_queue") {
    if (!ctx.userId) {
      return {
        error: "Sign in required to join a queue. Please ask the user to sign in.",
      };
    }
    if (typeof args.shop_name !== "string" || !args.shop_name.trim()) {
      return { error: "shop_name is required." };
    }
    const personCount = Number(args.person_count);
    if (!Number.isInteger(personCount) || personCount < 1 || personCount > 10) {
      return { error: "person_count must be an integer between 1 and 10." };
    }

    const { data: shop, error: shopErr } = await admin
      .from("Shop")
      .select("id, name, is_available")
      .ilike("name", `%${args.shop_name.trim()}%`)
      .limit(1)
      .maybeSingle();
    if (shopErr) return { error: shopErr.message };
    if (!shop) return { error: `No shop matching "${args.shop_name}".` };
    if (shop.is_available === false) {
      return { error: `${shop.name} is currently not accepting tickets.` };
    }

    const result = await createQueueTicket(shop.id, personCount);
    if (!result.ok) return { error: result.error };

    return {
      ok: true,
      shop: shop.name,
      ticket_no: result.data.ticket?.ticketNo,
      queue_position: result.data.queuePosition,
      called_immediately: result.data.immediateCall,
      status: result.data.ticket?.status,
    };
  }

  if (name === "cancel_my_ticket") {
    if (!ctx.userId) {
      return { error: "Sign in required to cancel a ticket." };
    }
    if (typeof args.ticket_id !== "string" || !args.ticket_id.trim()) {
      return { error: "ticket_id is required." };
    }
    const result = await cancelQueueTicket(args.ticket_id.trim());
    if (!result.ok) return { error: result.error };
    return { ok: true, status: result.data?.status };
  }

  return { error: `Unknown tool: ${name}` };
}

export async function POST(req: NextRequest) {
  // 0. Bail early if OpenAI isn't configured. We do this before any DB work so
  //    a misconfigured deployment is cheap and obvious.
  const openai = getOpenAI();
  if (!openai) {
    return NextResponse.json(
      { error: "PaceAI is not configured (missing OPENAI_API_KEY)." },
      { status: 503 },
    );
  }

  // 1. Auth detection. Anonymous and authed visitors both allowed; tool surface
  //    and rate-limit budget differ.
  const supabase = createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isCustomer = false;
  if (user) {
    const { data: profile } = await supabase
      .from("User")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    isCustomer = profile?.role === "CUSTOMER";
  }

  const rateKey = user ? `u:${user.id}` : `ip:${clientKey(req)}`;
  const rateMax = isCustomer ? RATE_LIMIT_MAX_AUTHED : RATE_LIMIT_MAX_ANON;
  if (!takeRateToken(rateKey, rateMax)) {
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
  const systemPrompt = isCustomer
    ? SYSTEM_PROMPT_AUTHED[selectedLang]
    : SYSTEM_PROMPT_ANON[selectedLang];
  const tools = isCustomer
    ? [...READ_TOOLS, ...CUSTOMER_TOOLS]
    : READ_TOOLS;

  const working: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...(messages as Array<{ role: "user" | "assistant"; content: string }>)
      .slice(-10)
      .map((m) => ({ role: m.role, content: m.content }) as ChatMessage),
  ];

  // Short id so we can correlate log lines from one chat turn.
  const turnId = Math.random().toString(36).slice(2, 8);
  // Track mutation outcomes — we append a deterministic footer for these so
  // the user sees ground truth even if the model paraphrases incorrectly.
  type MutationOutcome = {
    tool: "join_queue" | "cancel_my_ticket";
    ok: boolean;
    payload: any;
  };
  const mutationOutcomes: MutationOutcome[] = [];

  console.log(
    `[pace-ai ${turnId}] start user=${user?.id ?? "anon"} isCustomer=${isCustomer} lang=${selectedLang}`,
  );

  // 3. Tool-calling loop, non-streaming. OpenAI streaming delivers tool calls
  //    in chunks which makes mid-stream dispatch brittle — resolve all tool
  //    rounds first, then stream the final assistant turn.
  try {
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const completion = await openai.chat.completions.create({
        model: CHAT_MODEL,
        messages: working as any,
        tools: tools as any,
        tool_choice: "auto",
        temperature: 0.4,
        max_completion_tokens: 600,
      });

      const choice = completion.choices[0]?.message;
      if (!choice) break;

      const toolCalls = choice.tool_calls ?? [];
      if (toolCalls.length === 0) {
        console.log(`[pace-ai ${turnId}] round=${round} no tool calls → finalize`);
        break;
      }

      console.log(
        `[pace-ai ${turnId}] round=${round} tool_calls=[${toolCalls
          .map((tc: any) => tc.function.name)
          .join(", ")}]`,
      );

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
            { userId: isCustomer ? user!.id : null },
          );

          // Per-call log line: name, raw args, summary of result. Truncate
          // payload to keep Vercel function logs readable.
          const resultStr = JSON.stringify(result);
          console.log(
            `[pace-ai ${turnId}]   ${tc.function.name}(${
              tc.function.arguments
            }) → ${resultStr.slice(0, 500)}${resultStr.length > 500 ? "…" : ""}`,
          );

          // Capture mutation outcomes for the deterministic footer.
          if (tc.function.name === "join_queue") {
            mutationOutcomes.push({
              tool: "join_queue",
              ok: !!(result as any)?.ok,
              payload: result,
            });
          } else if (tc.function.name === "cancel_my_ticket") {
            mutationOutcomes.push({
              tool: "cancel_my_ticket",
              ok: !!(result as any)?.ok,
              payload: result,
            });
          }

          return {
            role: "tool" as const,
            tool_call_id: tc.id,
            content: resultStr,
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

  // 4. Stream the final assistant turn. tool_choice "none" so the model
  //    commits to text and doesn't open another tool round we won't handle.
  const stream = await openai.chat.completions.create({
    model: CHAT_MODEL,
    messages: working as any,
    tools: tools as any,
    tool_choice: "none",
    temperature: 0.4,
    max_completion_tokens: 600,
    stream: true,
  });

  // Build a deterministic footer from the actual mutation outcomes. We append
  // this AFTER the model finishes streaming so the user sees ground truth even
  // if the model paraphrased the result incorrectly (e.g. claims success when
  // join_queue returned an error, or fabricates a ticket number).
  function buildOutcomeFooter(): string {
    if (mutationOutcomes.length === 0) return "";
    const lines: string[] = [];
    for (const m of mutationOutcomes) {
      if (m.tool === "join_queue") {
        if (m.ok) {
          const p = m.payload ?? {};
          lines.push(
            `✅ **Ticket #${p.ticket_no ?? "?"} taken** at ${p.shop ?? "?"} — position ${p.queue_position ?? "?"} in queue${
              p.called_immediately ? " (you're up next!)" : ""
            }.`,
          );
        } else {
          lines.push(
            `❌ **Could not take a token** — ${
              (m.payload as { error?: string })?.error ?? "unknown error"
            }.`,
          );
        }
      } else if (m.tool === "cancel_my_ticket") {
        if (m.ok) {
          lines.push(`✅ **Ticket cancelled.**`);
        } else {
          lines.push(
            `❌ **Could not cancel ticket** — ${
              (m.payload as { error?: string })?.error ?? "unknown error"
            }.`,
          );
        }
      }
    }
    return `\n\n---\n${lines.join("\n")}`;
  }

  const footer = buildOutcomeFooter();

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
        if (footer) {
          controller.enqueue(encoder.encode(footer));
          console.log(
            `[pace-ai ${turnId}] footer appended (${mutationOutcomes.length} mutation outcome(s))`,
          );
        }
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
