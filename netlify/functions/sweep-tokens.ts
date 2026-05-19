import type { Config } from '@netlify/functions'
import { rateLimitsStore, tokensStore } from './_shared/blobs'
import { logger } from './_shared/logger'

/**
 * Scheduled sweep: deletes expired / used access tokens and stale
 * rate-limit counters. Netlify scheduled functions run in UTC; @daily
 * triggers at 00:00 UTC (03:00 Asia/Jerusalem during summer).
 */
export default async (): Promise<Response> => {
  const tokens = tokensStore()
  const limits = rateLimitsStore()
  const now = Date.now()
  let removedTokens = 0
  let removedLimits = 0

  for await (const page of tokens.list({ paginate: true })) {
    for (const blob of page.blobs) {
      const meta = await tokens.getMetadata(blob.key)
      const fields = (meta?.metadata ?? {}) as {
        expiresAt?: number
        used?: boolean
      }
      const expired =
        typeof fields.expiresAt === 'number' && fields.expiresAt < now
      const used = fields.used === true
      if (expired || used) {
        await tokens.delete(blob.key)
        removedTokens += 1
      }
    }
  }

  for await (const page of limits.list({ paginate: true })) {
    for (const blob of page.blobs) {
      const meta = await limits.getMetadata(blob.key)
      const fields = (meta?.metadata ?? {}) as { expiresAt?: number }
      if (typeof fields.expiresAt === 'number' && fields.expiresAt < now) {
        await limits.delete(blob.key)
        removedLimits += 1
      }
    }
  }

  logger.info('scheduled sweep complete', { removedTokens, removedLimits })
  return new Response(
    JSON.stringify({ ok: true, removedTokens, removedLimits }),
    { headers: { 'content-type': 'application/json' } },
  )
}

export const config: Config = {
  schedule: '@daily',
}
