import { env } from './env'

/** Path registered on `request-access-mail-background` (Config.path). */
export const MAIL_BACKGROUND_PATH = '/api/request-access-mail-background'

/** Cap background self-invoke so `waitUntil` does not burn the 30s sync limit in dev. */
export const MAIL_BACKGROUND_FETCH_MS = 5_000

export function mailBackgroundUrl(): string {
  return `${env.appUrl()}${MAIL_BACKGROUND_PATH}`
}
