export type SocialKey = 'x' | 'linkedin' | 'telegram' | 'discord'

const fromEnv = (value: unknown): string => (typeof value === 'string' && /^https:\/\//i.test(value) ? value : '')

/**
 * BountyFi's public profiles. An icon is shown only when its address is set, so the footer never carries a dead link.
 * Put the address in the string, or provide it at build time (public addresses, not secrets). Only https links count.
 */
export const SOCIAL: Record<SocialKey, string> = {
  x: fromEnv(import.meta.env.VITE_SOCIAL_X),
  linkedin: fromEnv(import.meta.env.VITE_SOCIAL_LINKEDIN),
  telegram: fromEnv(import.meta.env.VITE_SOCIAL_TELEGRAM),
  discord: fromEnv(import.meta.env.VITE_SOCIAL_DISCORD),
}
