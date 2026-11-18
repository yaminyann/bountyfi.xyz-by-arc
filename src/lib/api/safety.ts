import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { del, get, post, request, toQuery } from './client'
import { useAuth } from '@/contexts/AuthContext'
import type { BountySummary } from './types'

// Reports, link safety, saved bounties, access rules and project verification.

export type LinkLevel = 'ok' | 'warn' | 'block'

export interface LinkVerdict {
  level: LinkLevel
  host: string
  reasons: string[]
}

export const checkLink = (url: string) => get<LinkVerdict>(`/links/check${toQuery({ url })}`, { auth: false })

/** Asks the server about several addresses at once. Used before a transaction, so a person never pays gas for text that will be refused. */
export const checkLinks = (urls: string[]) => post<{ items: (LinkVerdict & { url: string })[] }>('/links/check', { urls }, { auth: false }).then((r) => r.items)

// ---- reports ------------------------------------------------------------------------------------------------------

export type ReportTarget = 'bounty' | 'submission' | 'profile' | 'project'
export const REPORT_REASONS = [
  ['scam', 'Scam or fake bounty'],
  ['phishing', 'Phishing or harmful link'],
  ['spam', 'Spam'],
  ['impersonation', 'Pretending to be someone else'],
  ['plagiarism', 'Copied work'],
  ['inappropriate', 'Inappropriate content'],
  ['other', 'Something else'],
] as const
export type ReportReason = (typeof REPORT_REASONS)[number][0]

export const useReport = () =>
  useMutation({
    mutationFn: (input: { targetType: ReportTarget; targetId: string; reason: ReportReason; details: string }) => post<{ ok: true; alreadyReported: boolean }>('/reports', input),
  })

// ---- saved bounties -------------------------------------------------------------------------------------------------

export function useSavedIds() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['mine', 'saved', 'ids'],
    queryFn: () => get<{ ids: number[] }>('/me/saved/ids').then((r) => r.ids),
    enabled: Boolean(user),
    staleTime: 30_000,
  })
}

export function useSavedBounties(offset = 0) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['mine', 'saved', 'list', offset],
    queryFn: () => get<{ items: BountySummary[]; total: number }>(`/me/saved${toQuery({ offset, limit: 24 })}`),
    enabled: Boolean(user),
  })
}

export function useToggleSaved() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ onchainId, saved }: { onchainId: number; saved: boolean }) => (saved ? request('PUT', `/me/saved/${onchainId}`).then(() => undefined) : del(`/me/saved/${onchainId}`).then(() => undefined)),
    onMutate: async ({ onchainId, saved }) => {
      await qc.cancelQueries({ queryKey: ['mine', 'saved', 'ids'] })
      const before = qc.getQueryData<number[]>(['mine', 'saved', 'ids']) ?? []
      qc.setQueryData<number[]>(['mine', 'saved', 'ids'], saved ? [...new Set([...before, onchainId])] : before.filter((id) => id !== onchainId))
      return { before }
    },
    onError: (_e, _v, ctx) => ctx && qc.setQueryData(['mine', 'saved', 'ids'], ctx.before),
    onSettled: () => void qc.invalidateQueries({ queryKey: ['mine', 'saved'] }),
  })
}

// ---- access rules ------------------------------------------------------------------------------------------------------

export interface Eligibility {
  eligible: boolean
  reasons: string[]
  progress: { accountAgeDays: number; hasGithub: boolean; approvedSubmissions: number }
  dailyLimit: { used: number; cap: number }
}

export const useEligibility = (onchainId: number | undefined, enabled: boolean) =>
  useQuery({
    queryKey: ['bounty', onchainId, 'eligibility'],
    queryFn: () => get<Eligibility>(`/bounties/${onchainId}/eligibility`),
    enabled: enabled && onchainId !== undefined,
    staleTime: 15_000,
  })

// ---- verified projects ---------------------------------------------------------------------------------------------------

export interface VerificationStart {
  token: string
  file: string
  repository: string
  verified: boolean
}

export const useStartVerification = (slug: string) => useMutation({ mutationFn: () => post<VerificationStart>(`/projects/${slug}/verification`) })

export function useVerifyProject(slug: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => post<{ verified: boolean; verifiedBy: string }>(`/projects/${slug}/verify`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['project'] }),
  })
}

// ---- admin ----------------------------------------------------------------------------------------------------------------

export interface AdminReport {
  id: string
  targetType: ReportTarget
  targetId: string
  reason: ReportReason
  details: string
  status: 'open' | 'actioned' | 'dismissed'
  adminNote: string
  createdAt: string
  resolvedAt: string | null
  reporterEmail: string
  reportsOnTarget: number
}

export const useAdminReports = (params: { status: string; offset: number; limit: number }) =>
  useQuery({
    queryKey: ['admin', 'reports', params],
    queryFn: () => get<{ items: AdminReport[]; total: number }>(`/admin/reports${toQuery(params)}`),
    placeholderData: (prev) => prev,
  })

export function useResolveReport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status, note }: { id: string; status: 'actioned' | 'dismissed'; note: string }) => post(`/admin/reports/${id}`, { status, note }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin', 'reports'] }),
  })
}

export interface BlockedDomain {
  domain: string
  reason: string
  createdBy: string | null
  createdAt: string
}

export const useBlockedDomains = () => useQuery({ queryKey: ['admin', 'domains'], queryFn: () => get<{ items: BlockedDomain[] }>('/admin/blocked-domains').then((r) => r.items) })

export function useBlockDomain() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { domain: string; reason: string }) => post('/admin/blocked-domains', input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin', 'domains'] }),
  })
}

export function useUnblockDomain() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (domain: string) => request('DELETE', `/admin/blocked-domains/${encodeURIComponent(domain)}`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin', 'domains'] }),
  })
}
