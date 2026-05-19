import { createHash } from 'node:crypto'
import { env } from './env'

/** Salted SHA-256 of the normalized email, hex-encoded (16 chars). */
export function emailHash(email: string): string {
  const salt = env.emailHashSalt()
  return createHash('sha256')
    .update(`${salt}:${email.trim().toLowerCase()}`)
    .digest('hex')
    .slice(0, 16)
}

/** Salted SHA-256 of an IP address. */
export function ipHash(ip: string): string {
  const salt = env.emailHashSalt()
  return createHash('sha256')
    .update(`${salt}:ip:${ip}`)
    .digest('hex')
    .slice(0, 16)
}
