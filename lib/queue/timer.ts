import { CALL_WINDOW_MS, TOTAL_WINDOW_MS } from "./constants";

export interface TimerState {
  warnRemain: number;
  totalRemain: number;
  inWarning: boolean;
  displayMs: number;
  isUrgent: boolean;
  isExpired: boolean;
}

export function formatCountdown(ms: number): string {
  const s = Math.ceil(Math.max(0, ms) / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function computeTimerState(
  calledAt: string | number,
  now = Date.now(),
): TimerState {
  const calledMs =
    typeof calledAt === "string" ? new Date(calledAt).getTime() : calledAt;
  const elapsed = now - calledMs;
  const warnRemain = CALL_WINDOW_MS - elapsed;
  const totalRemain = TOTAL_WINDOW_MS - elapsed;
  const inWarning = warnRemain <= 0 && totalRemain > 0;
  const displayMs = inWarning
    ? Math.max(0, totalRemain)
    : Math.max(0, warnRemain);
  const isUrgent = !inWarning && warnRemain < 60_000;

  return {
    warnRemain,
    totalRemain,
    inWarning,
    displayMs,
    isUrgent,
    isExpired: totalRemain <= 0,
  };
}
