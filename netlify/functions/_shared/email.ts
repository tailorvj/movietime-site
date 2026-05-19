import { Resend } from 'resend'
import { env } from './env'
import { logger } from './logger'

const COPY = {
  he: {
    subject: 'הקישור הפרטי שלכם לצפייה בסרט "גט"',
    title: 'הגישה אושרה',
    body: 'הקישור הבא תקף לצפייה חד-פעמית במהלך 24 השעות הקרובות.',
    cta: 'פתחו את הצופה',
    note: 'אם לא ביקשתם את הקישור הזה, ניתן להתעלם מההודעה.',
  },
  ru: {
    subject: 'Ваша персональная ссылка для просмотра фильма «Гетт»',
    title: 'Доступ предоставлен',
    body: 'Эта ссылка действительна для одного просмотра в течение 24 часов.',
    cta: 'Открыть плеер',
    note: 'Если вы не запрашивали ссылку, просто игнорируйте это письмо.',
  },
} as const

const RESEND_TIMEOUT_MS = 15_000

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(
        () => reject(new Error(`${label} timed out after ${ms}ms`)),
        ms,
      )
    }),
  ])
}

function renderHtml(locale: 'he' | 'ru', accessUrl: string): string {
  const t = COPY[locale]
  const dir = locale === 'he' ? 'rtl' : 'ltr'
  return `<!doctype html>
<html lang="${locale}" dir="${dir}">
  <head><meta charset="utf-8"><title>${t.title}</title></head>
  <body style="margin:0;padding:32px;background:#0a0a0a;color:#f5f5f5;font-family:system-ui,sans-serif">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid #27272a;padding:32px">
          <tr><td>
            <h1 style="margin:0 0 16px;font-size:24px;color:#fff">${t.title}</h1>
            <p style="margin:0 0 24px;line-height:1.6;color:#a1a1aa">${t.body}</p>
            <p style="margin:0 0 24px">
              <a href="${accessUrl}" style="display:inline-block;background:#10b981;color:#000;font-weight:600;text-decoration:none;padding:14px 28px">${t.cta}</a>
            </p>
            <p style="margin:0;font-size:12px;color:#52525b">${t.note}</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`
}

export async function sendAccessLink(args: {
  to: string
  accessUrl: string
  locale: 'he' | 'ru'
}): Promise<{ delivered: boolean }> {
  const apiKey = env.resendApiKey()
  if (!apiKey) {
    logger.warn(
      'RESEND_API_KEY missing; logging access URL instead of sending',
      {
        accessUrl: args.accessUrl,
      },
    )
    return { delivered: false }
  }
  const resend = new Resend(apiKey)
  const subject = COPY[args.locale].subject
  await withTimeout(
    resend.emails.send({
      from: env.emailFrom(),
      to: args.to,
      subject,
      html: renderHtml(args.locale, args.accessUrl),
    }),
    RESEND_TIMEOUT_MS,
    'Resend API',
  )
  logger.info('access email dispatched', { locale: args.locale })
  return { delivered: true }
}
