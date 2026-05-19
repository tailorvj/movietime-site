import type { Config, Context } from '@netlify/functions'
import { clearSessionCookie } from './_shared/cookies'
import { json } from './_shared/responses'

export default async (req: Request, _context: Context): Promise<Response> => {
  if (req.method !== 'POST') {
    return json(405, { error: 'method_not_allowed' })
  }
  return json(200, { ok: true }, { 'set-cookie': clearSessionCookie() })
}

export const config: Config = {
  path: '/api/logout',
}
