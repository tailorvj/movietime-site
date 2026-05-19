import type { Config, Context } from '@netlify/functions'
import { mailQueueStore } from './_shared/blobs'
import { sendAccessLink } from './_shared/email'
import { logger } from './_shared/logger'
import { z } from 'zod'

const payloadSchema = z.object({
  tokenId: z.string().uuid(),
  email: z.string().email(),
  accessUrl: z.string().url(),
  locale: z.enum(['he', 'ru']),
})

/**
 * Background delivery for magic-link email. Invoked after request-access
 * returns 202 to the browser.
 */
export default async (req: Request, _context: Context): Promise<Response> => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  let payload: z.infer<typeof payloadSchema>
  try {
    payload = payloadSchema.parse(await req.json())
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  const { tokenId, email, accessUrl, locale } = payload
  const queue = mailQueueStore()
  const queueKey = `mail:${tokenId}`

  try {
    const result = await sendAccessLink({ to: email, accessUrl, locale })
    await queue.setJSON(queueKey, {
      status: result.delivered ? 'sent' : 'logged_only',
      updatedAt: new Date().toISOString(),
    })
    logger.info('access_mail_sent', {
      tokenId,
      locale,
      delivered: result.delivered,
    })
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  } catch (err) {
    await queue.setJSON(queueKey, {
      status: 'failed',
      updatedAt: new Date().toISOString(),
      error: String(err),
    })
    logger.error('access_mail_failed', { tokenId, err: String(err) })
    return new Response(JSON.stringify({ ok: false }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    })
  }
}

export const config: Config = {
  path: '/api/request-access-mail-background',
}
