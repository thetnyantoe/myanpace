import { X, Bot, Mic, ArrowUp, Shield } from "lucide-react";
type AiOverlayProps = {
  aiOpen: boolean;
  setAiOpen: (value: boolean) => void;
};
export function AiOverlay({ aiOpen, setAiOpen }: AiOverlayProps) {
  if (!aiOpen) return null;
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
        >
          <X className="w-5 h-5 text-[#1d2846]" />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-20 h-20 rounded-3xl bg-white/50 backdrop-blur-md border border-white/50 shadow-xl flex items-center justify-center mb-8">
          <Bot className="w-9 h-9 text-[#1d2846]" />
        </div>
        <h2 className="text-4xl font-bold text-[#1d2846] text-center tracking-tight mb-4">
          Call &quot;PacePace&quot; to Chat
        </h2>
        <p className="text-center text-[#1d2846]/80 font-medium max-w-2xl mb-10">
          Type your message below to instruct our intelligent AI formally with
          priority reservations, queue management, or customized dining
          curation.
        </p>

        <div className="w-full max-w-2xl bg-white/60 backdrop-blur-lg border border-white/50 rounded-2xl p-2 flex items-center shadow-xl">
          <div className="px-4 text-[#1d2846]/70">
            <Mic className="w-5 h-5" />
          </div>
          <input
            placeholder="Type your instruction or message..."
            className="flex-1 bg-transparent outline-none py-4 text-[#1d2846] font-semibold placeholder:text-[#1d2846]/60"
          />
          <button className="w-12 h-12 rounded-xl bg-[#1d2846] text-white flex items-center justify-center">
            <ArrowUp className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-wrap justify-center gap-4 mt-8">
          <div className="bg-white/50 backdrop-blur-md px-4 py-2 rounded-full border border-white/40 shadow-sm flex items-center gap-2 text-sm text-[#1d2846]">
            <Mic className="w-4 h-4" /> Voice Active
          </div>
          <div className="bg-white/50 backdrop-blur-md px-4 py-2 rounded-full border border-white/40 shadow-sm flex items-center gap-2 text-sm text-[#1d2846]">
            <Shield className="w-4 h-4" /> Secure Context
          </div>
        </div>
      </div>
    </div>
  );
}
