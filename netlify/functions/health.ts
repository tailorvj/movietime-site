import type { Config, Context } from '@netlify/functions'
import { json } from './_shared/responses'

export default async (_req: Request, _context: Context): Promise<Response> => {
  return json(200, { status: 'ok', time: new Date().toISOString() })
}

export const config: Config = {
  path: '/api/health',
}
