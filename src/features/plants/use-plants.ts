import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, jsonBody } from '@/lib/api'

export type Visibility = 'PUBLIC' | 'AUTHENTICATED' | 'PRIVATE'
export type PlantStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED'

export type Plant = {
  id: string
  code: string
  name: string
  slug: string
  description: string | null
  countryCode: string | null
  timezone: string
  status: PlantStatus
  visibility: Visibility
  logoUrl: string | null
  heroImageUrl: string | null
}

export type PlantDetail = Plant & {
  settings: { publicDashboard: boolean; publicProcesses: boolean; publicAssets: boolean; publicDocuments: boolean } | null
}

export type PlantStage = { id: string; code: string; name: string; displayName: string; stageGroup: string; colorToken: string | null; sequence: number; isEnabled: boolean; isPublic: boolean }
export type PlantNetwork = { id: string; code: string; name: string; colorToken: string | null; isEnabled: boolean; isPublic: boolean }
export type Member = { id: string; userId: string; email: string; firstName: string; lastName: string; roleCode: string; roleName: string; status: string; startsAt: string | null; endsAt: string | null }
export type AssignableRole = { code: string; name: string; scope: string }

export type PlantCreate = { code: string; name: string; slug?: string; description?: string; countryCode?: string; timezone?: string; visibility: Visibility }
export type PlantPatch = { name?: string; description?: string | null; countryCode?: string | null; timezone?: string; status?: PlantStatus; visibility?: Visibility; logoUrl?: string | null; heroImageUrl?: string | null }

export const usePlants = () => useQuery({ queryKey: ['plants'], queryFn: () => api<Plant[]>('/plants') })
export const usePlant = (slug: string | undefined) => useQuery({ queryKey: ['plant', slug, 'detail'], queryFn: () => api<PlantDetail>(`/plants/${slug}`), enabled: !!slug, retry: false })
export const usePlantStages = (slug: string) => useQuery({ queryKey: ['plant', slug, 'stages'], queryFn: () => api<PlantStage[]>(`/plants/${slug}/stages`) })
export const usePlantNetworks = (slug: string) => useQuery({ queryKey: ['plant', slug, 'networks'], queryFn: () => api<PlantNetwork[]>(`/plants/${slug}/networks`) })
export const useMembers = (slug: string) => useQuery({ queryKey: ['plant', slug, 'members'], queryFn: () => api<Member[]>(`/plants/${slug}/members`) })
export const useAssignableRoles = (slug: string) => useQuery({ queryKey: ['plant', slug, 'members', 'roles'], queryFn: () => api<AssignableRole[]>(`/plants/${slug}/members/roles`), staleTime: 5 * 60_000 })

/** Un cambio en una planta invalida su detalle, el listado y los indicadores del ecosistema. */
function useInvalidate(slug?: string) {
  const qc = useQueryClient()
  return () => {
    void qc.invalidateQueries({ queryKey: ['plants'] })
    void qc.invalidateQueries({ queryKey: ['admin'] })
    if (slug) void qc.invalidateQueries({ queryKey: ['plant', slug] })
  }
}

export function useCreatePlant() {
  const invalidate = useInvalidate()
  return useMutation({ mutationFn: (v: PlantCreate) => api<Plant>('/plants', { method: 'POST', ...jsonBody(v) }), onSuccess: invalidate })
}
export function useUpdatePlant(slug: string) {
  const invalidate = useInvalidate(slug)
  return useMutation({ mutationFn: (v: PlantPatch) => api<Plant>(`/plants/${slug}`, { method: 'PATCH', ...jsonBody(v) }), onSuccess: invalidate })
}
export function useAssignMember(slug: string) {
  const invalidate = useInvalidate(slug)
  return useMutation({ mutationFn: (v: { email: string; roleCode: string }) => api<Member>(`/plants/${slug}/members`, { method: 'POST', ...jsonBody(v) }), onSuccess: invalidate })
}
export function useRemoveMember(slug: string) {
  const invalidate = useInvalidate(slug)
  return useMutation({ mutationFn: (assignmentId: string) => api<void>(`/plants/${slug}/members/${assignmentId}`, { method: 'DELETE' }), onSuccess: invalidate })
}
export function useEnableStage(slug: string) {
  const invalidate = useInvalidate(slug)
  return useMutation({ mutationFn: (v: { stageCode: string; sequence?: number; isPublic?: boolean }) => api(`/plants/${slug}/stages`, { method: 'POST', ...jsonBody(v) }), onSuccess: invalidate })
}
export function useUpdateStage(slug: string) {
  const invalidate = useInvalidate(slug)
  return useMutation({
    mutationFn: ({ id, ...v }: { id: string; sequence?: number; isEnabled?: boolean; isPublic?: boolean }) => api(`/plants/${slug}/stages/${id}`, { method: 'PATCH', ...jsonBody(v) }),
    onSuccess: invalidate,
  })
}
export function useEnableNetwork(slug: string) {
  const invalidate = useInvalidate(slug)
  return useMutation({ mutationFn: (v: { networkCode: string; isPublic?: boolean }) => api(`/plants/${slug}/networks`, { method: 'POST', ...jsonBody(v) }), onSuccess: invalidate })
}
export function useUpdateNetwork(slug: string) {
  const invalidate = useInvalidate(slug)
  return useMutation({
    mutationFn: ({ id, ...v }: { id: string; isEnabled?: boolean; isPublic?: boolean }) => api(`/plants/${slug}/networks/${id}`, { method: 'PATCH', ...jsonBody(v) }),
    onSuccess: invalidate,
  })
}
