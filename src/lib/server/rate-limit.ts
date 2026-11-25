import "server-only";
import { createHash } from "node:crypto";
import { supabaseAdmin } from "./supabase-admin";

export const MAX_FAILURES = 10;
export const WINDOW_MINUTES = 15;

/** Hash of the client IP (never store the raw IP). */
export function ipKey(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || headers.get("x-real-ip") || "unknown";
  return createHash("sha256")
    .update(`${process.env.SESSION_SECRET ?? ""}:${ip}`)
    .digest("hex");
}

export async function isRateLimited(key: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin().rpc("login_rate_limited", {
    p_ip_key: key,
    p_max_failures: MAX_FAILURES,
    p_window_minutes: WINDOW_MINUTES,
  });
  if (error) throw error;
  return data === true;
}

export async function recordFailure(key: string): Promise<void> {
  const { error } = await supabaseAdmin().rpc("record_login_failure", { p_ip_key: key });
  if (error) throw error;
}

export async function clearFailures(key: string): Promise<void> {
  await supabaseAdmin().rpc("clear_login_failures", { p_ip_key: key });
}
