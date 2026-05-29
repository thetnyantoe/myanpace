import { Groq } from "groq-sdk";
import type { NextRequest } from "next/server";

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

export async function POST(req: NextRequest) {
  const { messages, lang } = (await req.json()) as {
    messages: ChatMessage[];
    lang?: "en" | "my";
  };

  const selectedLang = lang === "my" ? "my" : "en";

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
