import { rateLimitsStore } from './blobs'
import { logger } from './logger'

type Counter = { count: number; firstAt: number }

/**
 * Best-effort sliding-window rate limit backed by Netlify Blobs. Race
 * conditions can let an extra request slip through under concurrent
 * load; that is acceptable for a soft throttle on a low-volume endpoint.
 */
export async function bump(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<{ ok: boolean; count: number }> {
  const store = rateLimitsStore()
  const now = Date.now()
  let current: Counter | null = null
  try {
    const existing = await store.get(key, { type: 'json' })
    current = (existing as Counter | null) ?? null
  } catch (err) {
    logger.warn('rate-limit read failed', { key, err: String(err) })
  }

  if (!current || now - current.firstAt > windowSeconds * 1000) {
    current = { count: 0, firstAt: now }
  }

  current.count += 1

  try {
    await store.setJSON(key, current, {
      metadata: { expiresAt: current.firstAt + windowSeconds * 1000 },
    })
  } catch (err) {
    logger.warn('rate-limit write failed', { key, err: String(err) })
  }

  return { ok: current.count <= limit, count: current.count }
}
