interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const store = new Map<string, RateLimitEntry>();

// Periodically clean up expired entries to prevent memory leaks
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
let cleanupTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleCleanup(): void {
  if (cleanupTimer !== null) return;
  cleanupTimer = setTimeout(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      // Remove entries that haven't been used in a long time (10 minutes)
      if (now - entry.windowStart > 10 * 60 * 1000) {
        store.delete(key);
      }
    }
    cleanupTimer = null;
    if (store.size > 0) {
      scheduleCleanup();
    }
  }, CLEANUP_INTERVAL_MS);
}

/**
 * Check whether a request identified by `key` is within the allowed rate.
 *
 * @param key        Unique identifier (e.g. IP address + route)
 * @param maxRequests Maximum number of requests allowed in the window
 * @param windowMs   Duration of the sliding window in milliseconds
 * @returns `true` if the request is allowed, `false` if rate-limited
 */
export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const existing = store.get(key);

  if (!existing || now - existing.windowStart >= windowMs) {
    // Start a fresh window
    store.set(key, { count: 1, windowStart: now });
    scheduleCleanup();
    return true;
  }

  if (existing.count >= maxRequests) {
    return false;
  }

  existing.count += 1;
  return true;
}
