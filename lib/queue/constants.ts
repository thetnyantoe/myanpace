export const CALL_WINDOW_MS = 3 * 60 * 1000;
export const TOTAL_WINDOW_MS = 4 * 60 * 1000;
export const WAIT_MINUTES_PER_GROUP = 6;

export const VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ??
  "BNbXwdqvTUVwovlL4C53Je40k2lZFt93ORZPRcq4Am_ETlapaJ6X-Wt3Pk-hOaANb7YL-flD_ji9VvTvHokm7Sc";

export function getPushUrl() {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base}/functions/v1/send-push`;
}

export function getSupabaseAnonKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
}
