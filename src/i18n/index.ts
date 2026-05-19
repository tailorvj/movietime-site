import he from './he.json'
import ru from './ru.json'

export type Locale = 'he' | 'ru'
export const LOCALES: Locale[] = ['he', 'ru']
export const DEFAULT_LOCALE: Locale = 'he'

export type Messages = typeof he

export function isLocale(value: string | undefined): value is Locale {
  return value === 'he' || value === 'ru'
}

export function messages(locale: Locale): Messages {
  return locale === 'ru' ? ru : he
}
