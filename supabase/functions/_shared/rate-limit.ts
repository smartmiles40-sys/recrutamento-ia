import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface RateLimitConfig {
  functionName: string;
  windowSeconds: number;
  maxRequests: number;
}

export function clientKey(req: Request, userId: string | null): string {
  if (userId) return `u:${userId}`;
  const fwd = req.headers.get("x-forwarded-for") ?? "";
  const ip = fwd.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  return `ip:${ip}`;
}

export async function checkRateLimit(
  admin: SupabaseClient,
  key: string,
  cfg: RateLimitConfig,
): Promise<{ allowed: boolean; currentCount: number; resetAt: string | null }> {
  const { data, error } = await admin.rpc("check_rate_limit", {
    p_function_name: cfg.functionName,
    p_client_key: key,
    p_window_seconds: cfg.windowSeconds,
    p_max_requests: cfg.maxRequests,
  });

  // Fail open: if the rate-limit infrastructure is broken, do not block legit
  // traffic. Log so it's visible.
  if (error) {
    console.warn("[rate-limit] RPC failed, allowing request:", error.message);
    return { allowed: true, currentCount: 0, resetAt: null };
  }

  const row = Array.isArray(data) ? data[0] : data;
  return {
    allowed: row?.allowed ?? true,
    currentCount: row?.current_count ?? 0,
    resetAt: row?.reset_at ?? null,
  };
}
