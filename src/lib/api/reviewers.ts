import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { del, get, post } from './client'

export interface BountyReviewer {
  wallet: string
  displayName: string | null
  addedAt: string
}

export function useBountyReviewers(onchainId: number, enabled: boolean) {
  return useQuery({
    queryKey: ['bounty', onchainId, 'reviewers'],
    queryFn: () => get<{ items: BountyReviewer[]; max: number }>(`/bounties/${onchainId}/reviewers`),
    enabled,
  })
}

export function useAddReviewer(onchainId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (wallet: string) => post(`/bounties/${onchainId}/reviewers`, { wallet }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['bounty', onchainId, 'reviewers'] }),
  })
}

export function useRemoveReviewer(onchainId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (wallet: string) => del(`/bounties/${onchainId}/reviewers/${wallet}`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['bounty', onchainId, 'reviewers'] }),
  })
}
