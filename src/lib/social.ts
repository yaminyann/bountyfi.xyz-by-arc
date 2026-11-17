export type SocialKey = 'x' | 'linkedin' | 'telegram' | 'discord'

const DOMAIN = 'https://bountyfi.xyz'

const fromEnv = (value: unknown): string => (typeof value === 'string' && /^https:\/\//i.test(value) ? value : DOMAIN)

/**
 * BountyFi's public profiles. Until each account exists, every icon points at the domain itself so no link is dead.
 * Replace an address here, or provide it at build time (public addresses, not secrets). Only https links count, and an
 * empty value hides the icon.
 */
export const SOCIAL: Record<SocialKey, string> = {
  x: fromEnv(import.meta.env.VITE_SOCIAL_X),
  linkedin: fromEnv(import.meta.env.VITE_SOCIAL_LINKEDIN),
  telegram: fromEnv(import.meta.env.VITE_SOCIAL_TELEGRAM),
  discord: fromEnv(import.meta.env.VITE_SOCIAL_DISCORD),
}
