import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, jsonBody } from '@/lib/api'

/** Proveedores (venden en el marketplace) y contratistas (prestan servicios): comparten perfil, estados y miembros. */
export type OrgKind = 'providers' | 'contractors'
export type OrgStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED'
export type Tag = { code: string; name: string }
export type Page<T> = { items: T[]; total: number; page: number; pageSize: number }

export type Org = {
  id: string
  organizationName: string
  countryCode: string
  city: string | null
  description: string | null
  logoUrl: string | null
  certifications: string[]
  status: OrgStatus
  verified: boolean
  /** null = sin calificaciones (no se inventa un valor). */
  rating: number | null
  website: string | null
  contactEmail: string | null
  stages: Tag[]
  /** Solo proveedores. */
  families?: Tag[]
  activeListings?: number
  /** Solo contratistas. */
  availability?: 'AVAILABLE' | 'LIMITED' | 'UNAVAILABLE'
  specialties?: string[]
}
export type OrgDetail = Org & { taxId: string | null; canManage: boolean; myRole: string | null }
export type OrgMember = { userId: string; email: string; firstName: string; lastName: string; role: 'OWNER' | 'MEMBER'; createdAt: string }

export type OrgStatusFilter = OrgStatus | 'ALL'

const toQuery = (params: Record<string, string | number | undefined>) => {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') q.set(k, String(v))
  const s = q.toString()
  return s ? `?${s}` : ''
}

// Todo cuelga de ['orgs', …] y los cambios también invalidan el resumen del ecosistema (contadores de pendientes).
export const useOrgs = (kind: OrgKind, filters: { status: OrgStatusFilter; search?: string; page?: number }, pageSize = 25) =>
  useQuery({
    queryKey: ['orgs', kind, filters, pageSize],
    queryFn: () => api<Page<Org>>(`/${kind}${toQuery({ ...filters, pageSize })}`),
    placeholderData: keepPreviousData,
  })

export const useOrg = (kind: OrgKind, id: string | undefined) =>
  useQuery({ queryKey: ['orgs', kind, 'detail', id], queryFn: () => api<OrgDetail>(`/${kind}/${id}`), enabled: !!id, retry: false })

export const useOrgMembers = (kind: OrgKind, id: string | undefined) =>
  useQuery({ queryKey: ['orgs', kind, 'members', id], queryFn: () => api<OrgMember[]>(`/${kind}/${id}/members`), enabled: !!id })

function useInvalidate() {
  const qc = useQueryClient()
  return () => {
    void qc.invalidateQueries({ queryKey: ['orgs'] })
    void qc.invalidateQueries({ queryKey: ['admin'] })
  }
}

/** Lo que el administrador puede cambiar: además del perfil, identidad y confianza. */
export type OrgPatch = {
  organizationName?: string
  taxId?: string | null
  countryCode?: string
  status?: OrgStatus
  verified?: boolean
  rating?: number | null
}

export function useUpdateOrg(kind: OrgKind) {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, ...v }: { id: string } & OrgPatch) => api<OrgDetail>(`/${kind}/${id}`, { method: 'PATCH', ...jsonBody(v) }),
    onSuccess: invalidate,
  })
}

export type OrgCreate = { organizationName: string; taxId?: string; countryCode: string; city?: string; contactEmail?: string; ownerEmail?: string }

/** El administrador crea la organización ya ACTIVA y puede asignarle su responsable de una vez. */
export function useCreateOrg(kind: OrgKind) {
  const invalidate = useInvalidate()
  return useMutation({ mutationFn: (v: OrgCreate) => api<OrgDetail>(`/${kind}`, { method: 'POST', ...jsonBody(v) }), onSuccess: invalidate })
}

export function useAddOrgMember(kind: OrgKind, id: string) {
  const invalidate = useInvalidate()
  return useMutation({ mutationFn: (v: { email: string; role: 'OWNER' | 'MEMBER' }) => api<OrgMember[]>(`/${kind}/${id}/members`, { method: 'POST', ...jsonBody(v) }), onSuccess: invalidate })
}

export function useRemoveOrgMember(kind: OrgKind, id: string) {
  const invalidate = useInvalidate()
  return useMutation({ mutationFn: (userId: string) => api<void>(`/${kind}/${id}/members/${userId}`, { method: 'DELETE' }), onSuccess: invalidate })
}
