import { getStore } from '@netlify/blobs'

/**
 * Returns the access-tokens Blobs store. Token id is the key; value is a
 * `TokenRecord` JSON. Metadata carries `expiresAt` (epoch ms) so the
 * scheduled sweep can purge stale entries.
 */
export function tokensStore() {
  return getStore({ name: 'access-tokens', consistency: 'strong' })
}

/**
 * Returns the rate-limits Blobs store. Keys are short-lived per-IP and
 * per-email counters; the scheduled sweep clears day-old entries.
 */
export function rateLimitsStore() {
  // Eventual consistency is enough for a best-effort throttle and is faster in
  // the local Blobs sandbox (strong reads can add seconds per call).
  return getStore({ name: 'rate-limits', consistency: 'eventual' })
}

/** Outbound mail job status for async Resend delivery. */
export function mailQueueStore() {
  return getStore({ name: 'mail-queue', consistency: 'eventual' })
}
