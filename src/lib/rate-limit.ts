// Fixed-window rate limiting. Uses Upstash Redis (REST) when
// UPSTASH_REDIS_REST_URL/TOKEN are set so limits hold across all server
// instances; otherwise falls back to per-instance memory (fine for local dev).

export interface RateLimitResult {
  ok: boolean;
  retryAfterSeconds: number;
}

const memory = new Map<string, { count: number; resetAt: number }>();

function memoryLimit(key: string, limit: number, windowSeconds: number): RateLimitResult {
  const now = Date.now();
  if (memory.size > 5000) {
    for (const [k, v] of memory) if (v.resetAt <= now) memory.delete(k);
  }
  const entry = memory.get(key);
  if (!entry || entry.resetAt <= now) {
    memory.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { ok: true, retryAfterSeconds: 0 };
  }
  entry.count++;
  return {
    ok: entry.count <= limit,
    retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000),
  };
}

async function upstashLimit(
  url: string,
  token: string,
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const res = await fetch(`${url}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify([
      ["INCR", key],
      ["EXPIRE", key, String(windowSeconds), "NX"],
      ["TTL", key],
    ]),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Upstash responded ${res.status}`);
  const [incr, , ttl] = (await res.json()) as { result: number }[];
  return { ok: incr.result <= limit, retryAfterSeconds: Math.max(ttl.result, 0) };
}

export async function rateLimit(key: string, limit: number, windowSeconds: number) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  const namespaced = `egk:rl:${key}`;
  if (url && token) {
    try {
      return await upstashLimit(url, token, namespaced, limit, windowSeconds);
    } catch (error) {
      console.error("Rate limiter unavailable, using in-memory fallback", error);
    }
  }
  return memoryLimit(namespaced, limit, windowSeconds);
}

/** Best-effort client IP from proxy headers. */
export function clientIp(headers: Headers) {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}
