import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, jsonBody } from '@/lib/api'

export type AccessRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
export type AccessRequestFilter = AccessRequestStatus | 'ALL'

export type AccessRequest = {
  id: string
  status: AccessRequestStatus
  message: string | null
  roleCode: string | null
  decisionNote: string | null
  decidedAt: string | null
  decidedByEmail: string | null
  createdAt: string
  plantId: string
  plantName: string
  plantSlug: string
  userId: string
  email: string
  firstName: string
  lastName: string
}

export const ACCESS_STATUS_LABELS: Record<AccessRequestStatus, string> = { PENDING: 'Pendiente', APPROVED: 'Aprobada', REJECTED: 'Rechazada', CANCELLED: 'Retirada' }

export const useAccessRequests = (status: AccessRequestFilter) =>
  useQuery({ queryKey: ['admin', 'plant-access-requests', status], queryFn: () => api<AccessRequest[]>(`/admin/plant-access-requests?status=${status}`) })

function useInvalidate() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'plant-access-requests'] })
    void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
    void queryClient.invalidateQueries({ queryKey: ['plant'] })
  }
}

export function useApproveAccessRequest() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; roleCode: string; note?: string }) => api<AccessRequest>(`/admin/plant-access-requests/${id}/approve`, { method: 'POST', ...jsonBody(body) }),
    onSuccess: invalidate,
  })
}

export function useRejectAccessRequest() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; note?: string }) => api<AccessRequest>(`/admin/plant-access-requests/${id}/reject`, { method: 'POST', ...jsonBody(body) }),
    onSuccess: invalidate,
  })
}
