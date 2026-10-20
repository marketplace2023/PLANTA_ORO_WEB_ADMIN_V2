import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, formBody, jsonBody } from '@/lib/api'

export type Page<T> = { items: T[]; total: number; page: number; pageSize: number }

export type StageMaster = {
  id: string
  code: string
  name: string
  sequenceDefault: number
  description: string | null
  stageGroup: string
  colorToken: string | null
  /** Ruta (relativa a la API) de la imagen del layout; usar con `apiUrl`. null = sin imagen. */
  layoutImageUrl: string | null
}
export type NetworkMaster = {
  id: string
  code: string
  name: string
  description: string | null
  icon: string | null
  colorToken: string | null
  sequence: number
  /** Ruta (relativa a la API) de la imagen de la red; usar con `apiUrl`. null = sin imagen. */
  layoutImageUrl: string | null
}
export type Family = { id: string; code: string; name: string; icon: string | null }
export type AssetType = { id: string; code: string; name: string; description: string | null; familyCode: string; familyName: string; stageCodes: string[]; networkCodes: string[] }
export type Manufacturer = { id: string; name: string; countryCode: string | null }
export type Model = {
  id: string
  modelName: string
  status: 'ACTIVE' | 'INACTIVE'
  specifications: Record<string, unknown>
  /** Ruta (relativa a la API) de la foto del modelo; usar con `apiUrl`. null = sin foto. */
  imageUrl: string | null
  /** Etapas donde el modelo participa realmente (las que declaró o, si no, todas las de su tipo). */
  stageCodes: string[]
  /** `true` si no declaró etapas propias y hereda las del tipo. */
  stageInherited: boolean
  type: { id: string; code: string; name: string }
  family: { id: string; code: string; name: string; icon: string | null }
  manufacturer: Manufacturer | null
}
export type HealthStatus = { status: 'ok' | 'degraded'; service: string; database: 'up' | 'down'; timestamp: string }

export const useStageMasters = () => useQuery({ queryKey: ['catalog', 'stages'], queryFn: () => api<StageMaster[]>('/stages/catalog'), staleTime: 5 * 60_000 })
export const useNetworkMasters = () => useQuery({ queryKey: ['catalog', 'networks'], queryFn: () => api<NetworkMaster[]>('/networks/catalog'), staleTime: 5 * 60_000 })
export const useFamilies = () => useQuery({ queryKey: ['catalog', 'families'], queryFn: () => api<Family[]>('/catalog/families'), staleTime: 60_000 })
export const useTypes = () => useQuery({ queryKey: ['catalog', 'types'], queryFn: () => api<AssetType[]>('/catalog/types'), staleTime: 60_000 })
export const useManufacturers = () => useQuery({ queryKey: ['catalog', 'manufacturers'], queryFn: () => api<Manufacturer[]>('/catalog/manufacturers'), staleTime: 60_000 })
export const useModels = (filters: { search?: string; family?: string; status?: 'ACTIVE' | 'INACTIVE' | 'ALL'; page?: number }, pageSize = 20) =>
  useQuery({
    queryKey: ['catalog', 'models', filters, pageSize],
    queryFn: () => {
      const q = new URLSearchParams({ pageSize: String(pageSize) })
      for (const [k, v] of Object.entries(filters)) if (v !== undefined && v !== '') q.set(k, String(v))
      return api<Page<Model>>(`/catalog/assets?${q}`)
    },
    placeholderData: keepPreviousData,
  })
export const useHealth = () => useQuery({ queryKey: ['health'], queryFn: () => api<HealthStatus>('/health'), refetchInterval: 30_000, retry: false })

/** Cualquier cambio del catálogo invalida lo que cuelga de ['catalog'] y los totales del dashboard. */
function useCatalogMutation<V, T = unknown>(fn: (v: V) => Promise<T>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['catalog'] })
      void qc.invalidateQueries({ queryKey: ['admin'] })
      void qc.invalidateQueries({ queryKey: ['plant'] }) // redes habilitadas en las plantas (p. ej. al eliminar una red)
    },
  })
}
const send = <T = unknown>(method: 'POST' | 'PATCH', path: string, body: unknown) => api<T>(path, { method, ...jsonBody(body) })

export const useCreateFamily = () => useCatalogMutation((v: { code: string; name: string; description?: string; icon?: string }) => send('POST', '/catalog/families', v))
export const useUpdateFamily = () => useCatalogMutation(({ id, ...v }: { id: string; name?: string; description?: string | null; icon?: string | null }) => send('PATCH', `/catalog/families/${id}`, v))
export const useCreateType = () => useCatalogMutation((v: { familyCode: string; code: string; name: string; description?: string; stageCodes?: string[]; networkCodes?: string[] }) => send('POST', '/catalog/types', v))
export const useUpdateType = () => useCatalogMutation(({ id, ...v }: { id: string; name?: string; familyCode?: string; description?: string | null; stageCodes?: string[]; networkCodes?: string[] }) => send('PATCH', `/catalog/types/${id}`, v))
export const useCreateManufacturer = () => useCatalogMutation((v: { name: string; countryCode?: string; website?: string }) => send('POST', '/catalog/manufacturers', v))
export const useUpdateManufacturer = () => useCatalogMutation(({ id, ...v }: { id: string; name?: string; countryCode?: string | null; website?: string | null }) => send('PATCH', `/catalog/manufacturers/${id}`, v))
export const useCreateModel = () => useCatalogMutation((v: { typeCode: string; manufacturerId?: string; modelName: string; stageCodes?: string[] }) => send<{ id: string }>('POST', '/catalog/models', v))
export const useUpdateModel = () => useCatalogMutation(({ id, ...v }: { id: string; modelName?: string; manufacturerId?: string | null; status?: 'ACTIVE' | 'INACTIVE'; stageCodes?: string[] }) => send('PATCH', `/catalog/models/${id}`, v))

/** Eliminar del catálogo: la API lo rechaza (409) con el motivo si algo lo usa (activos, modelos, tipos…). */
const remove = (kind: 'families' | 'types' | 'manufacturers' | 'models') => (id: string) => api<void>(`/catalog/${kind}/${id}`, { method: 'DELETE' })
export const useDeleteFamily = () => useCatalogMutation(remove('families'))
export const useDeleteType = () => useCatalogMutation(remove('types'))
export const useDeleteManufacturer = () => useCatalogMutation(remove('manufacturers'))
export const useDeleteModel = () => useCatalogMutation(remove('models'))

/** Redes transversales: el administrador las crea, edita y elimina (el código no cambia). */
export type NetworkInput = { name: string; description?: string | null; icon?: string | null; colorToken?: string | null; sequence?: number }
export type NetworkUsage = { id: string; plants: number; assets: number; types: number }

/** Dónde se usa cada red (plantas que la habilitan, activos vinculados y tipos del catálogo). */
export const useNetworkUsage = () => useQuery({ queryKey: ['catalog', 'networks', 'usage'], queryFn: () => api<NetworkUsage[]>('/networks/catalog/usage') })
export const useCreateNetwork = () => useCatalogMutation((v: NetworkInput & { code: string }) => send<NetworkMaster>('POST', '/networks/catalog', v))
export const useUpdateNetwork = () => useCatalogMutation(({ id, ...v }: Partial<NetworkInput> & { id: string }) => send<NetworkMaster>('PATCH', `/networks/catalog/${id}`, v))
/** Imagen de la red (solo administrador). Reemplaza la anterior si ya había una. */
export const useUploadNetworkImage = () => useCatalogMutation(({ id, file }: { id: string; file: File }) => api<{ id: string; layoutImageUrl: string }>(`/networks/catalog/${id}/layout`, { method: 'POST', ...formBody({}, file) }))
export const useRemoveNetworkImage = () => useCatalogMutation((id: string) => api<void>(`/networks/catalog/${id}/layout`, { method: 'DELETE' }))
/** `force` la quita también de las plantas que la habilitan (y desvincula sus activos). */
export const useDeleteNetwork = () => useCatalogMutation(({ id, force }: { id: string; force: boolean }) => api<void>(`/networks/catalog/${id}${force ? '?force=true' : ''}`, { method: 'DELETE' }))

/** Variables de la ficha técnica (datos del fabricante): se definen una vez y aplican según red, etapa y tipo. */
export type VariableType = 'NUMBER' | 'RANGE' | 'TEXT' | 'LIST' | 'BOOLEAN'
export type VariableDef = {
  id: string
  code: string
  label: string
  unit: string | null
  valueType: VariableType
  group: string | null
  isKey: boolean
  sortOrder: number
  /** Alcance: listas de códigos; vacía = aplica a todas (una variable puede compartirse entre varios equipos). */
  networkCodes: string[]
  stageCodes: string[]
  assetTypeCodes: string[]
  /** Valor general: lo que muestran los modelos que no registraron uno propio. */
  defaultValue: unknown
}
export type ModelVariable = VariableDef & { value: unknown }
export type VariableInput = {
  label: string
  unit?: string | null
  valueType: VariableType
  networkCodes?: string[]
  stageCodes?: string[]
  assetTypeCodes?: string[]
  /** null quita el valor general. */
  defaultValue?: unknown
  group?: string | null
  isKey?: boolean
  sortOrder?: number
}

export const useVariables = () => useQuery({ queryKey: ['catalog', 'variables'], queryFn: () => api<VariableDef[]>('/catalog/variables') })
export const useCreateVariable = () =>
  useCatalogMutation((v: Omit<VariableInput, 'unit' | 'group'> & { unit?: string; group?: string }) => send<VariableDef>('POST', '/catalog/variables', v))
export const useUpdateVariable = () => useCatalogMutation(({ id, ...v }: Partial<VariableInput> & { id: string }) => send<VariableDef>('PATCH', `/catalog/variables/${id}`, v))
export const useDeleteVariable = () => useCatalogMutation((id: string) => api<void>(`/catalog/variables/${id}`, { method: 'DELETE' }))

/** Variables que aplican a un modelo (según su tipo) con el valor registrado; null si aún no tiene. */
export const useModelVariables = (modelId: string | undefined) =>
  useQuery({ queryKey: ['catalog', 'model-variables', modelId], queryFn: () => api<ModelVariable[]>(`/catalog/models/${modelId}/variables`), enabled: !!modelId })
/** Registra los datos del fabricante de un modelo: `{ CODIGO: valor }`, y `null` borra el valor. */
export const useSetModelVariables = () =>
  useCatalogMutation(({ id, values }: { id: string; values: Record<string, unknown> }) => api<ModelVariable[]>(`/catalog/models/${id}/variables`, { method: 'PUT', ...jsonBody({ values }) }))

/** Etapas (D01–D19): el código y el nombre son fijos; el administrador edita la descripción y la imagen del layout. */
export type StageInput = { name: string; stageGroup: string; colorToken: string | null; description: string | null; sequenceDefault: number }
/** Dónde se usa cada etapa (plantas que la habilitan, activos asignados y tipos del catálogo). */
export type StageUsage = { id: string; plants: number; assets: number; types: number }
export const useStageUsage = () => useQuery({ queryKey: ['catalog', 'stages', 'usage'], queryFn: () => api<StageUsage[]>('/stages/catalog/usage') })
export const useCreateStage = () =>
  useCatalogMutation((v: { code: string; name: string; stageGroup: string; colorToken?: string; description?: string; sequenceDefault?: number }) => send<StageMaster>('POST', '/stages/catalog', v))
export const useUpdateStage = () => useCatalogMutation(({ id, ...v }: Partial<StageInput> & { id: string }) => send<StageMaster>('PATCH', `/stages/catalog/${id}`, v))
/** `force` la quita también de las plantas que la habilitan (y deja sin etapa a sus activos). */
export const useDeleteStage = () => useCatalogMutation(({ id, force }: { id: string; force: boolean }) => api<void>(`/stages/catalog/${id}${force ? '?force=true' : ''}`, { method: 'DELETE' }))
export const useUploadStageLayout = () => useCatalogMutation(({ id, file }: { id: string; file: File }) => api<{ id: string; layoutImageUrl: string }>(`/stages/catalog/${id}/layout`, { method: 'POST', ...formBody({}, file) }))
export const useRemoveStageLayout = () => useCatalogMutation((id: string) => api<void>(`/stages/catalog/${id}/layout`, { method: 'DELETE' }))

/** Foto del modelo (solo administrador). Reemplaza la anterior si ya había una. */
export const useUploadModelImage = () => useCatalogMutation(({ id, file }: { id: string; file: File }) => api<{ id: string; imageUrl: string }>(`/catalog/models/${id}/image`, { method: 'POST', ...formBody({}, file) }))
export const useRemoveModelImage = () => useCatalogMutation((id: string) => api<void>(`/catalog/models/${id}/image`, { method: 'DELETE' }))
