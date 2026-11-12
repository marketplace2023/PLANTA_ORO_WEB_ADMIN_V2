import type { ReactNode } from 'react'
import { ClipboardList } from 'lucide-react'
import { useStageMasters, useNetworkMasters, type Family } from '@/features/catalog/use-catalog'
import { formatDate, formatDateTime } from '@/lib/format'

export type CatalogSubmission = {
  id: string; plantName: string; status: string; modelId: string | null; decisionNote: string | null
  createdAt?: string; decidedAt?: string | null
  draft: {
    name: string; familyId: string; stageCode: string; networkCodes: string[]
    serialNumber?: string; requestNote?: string; status?: string; criticality?: string
    isPublic?: boolean; location?: string; installationDate?: string; commissionDate?: string
    specifications: Record<string, unknown>; components: string[]
  }
  reviewedModel: { modelName: string; assetTypeId: string; specifications: Record<string, unknown>; technicalData: { componentes?: string[] }; imageUrl: string | null } | null
}

const statuses: Record<string, string> = { OPERATIVE: 'Operativo', MAINTENANCE: 'En mantenimiento', REPAIR: 'En reparación', OUT_OF_SERVICE: 'Fuera de servicio', DECOMMISSIONED: 'Dado de baja', CRITICAL: 'Crítico', STANDBY: 'En reserva', COMMISSIONING: 'En puesta en marcha', STOCK: 'En almacén' }
const criticalities: Record<string, string> = { LOW: 'Baja', MEDIUM: 'Media', HIGH: 'Alta', CRITICAL: 'Crítica' }
const decisions: Record<string, string> = { PENDING: 'Pendiente de revisión', APPROVED: 'Aprobada', REJECTED: 'Rechazada' }

function Fields({ rows }: { rows: Array<[string, ReactNode]> }) {
  return <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
    {rows.map(([label, value]) => <div key={label} className="min-w-0 space-y-1">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="whitespace-pre-wrap text-sm font-semibold text-fur-navy-900 [overflow-wrap:anywhere]">{value ?? '—'}</dd>
    </div>)}
  </dl>
}

function specificationText(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Sí' : 'No'
  if (Array.isArray(value)) return value.map(specificationText).join('\n')
  if (typeof value === 'object') {
    const range = value as Record<string, unknown>
    if (typeof range.min === 'number' && typeof range.max === 'number') return `${range.min} – ${range.max}`
    if (typeof range.min === 'number') return `≥ ${range.min}`
    if (typeof range.max === 'number') return `≤ ${range.max}`
    return JSON.stringify(value)
  }
  return String(value)
}

/** Ficha original, independiente de los cambios que administración haga al modelo del catálogo. */
export function CatalogRequestSheet({ request, family }: { request: CatalogSubmission; family?: Family }) {
  const stages = useStageMasters(), networks = useNetworkMasters()
  const { draft } = request
  const stage = stages.data?.find(s => s.code === draft.stageCode)
  const specifications = Object.entries(draft.specifications ?? {})
  const components = draft.components ?? []

  return <section aria-label="Ficha de la solicitud" className="request-sheet min-w-0 overflow-hidden border border-border bg-card">
    <header className="space-y-5 border-b border-border bg-muted/30 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><ClipboardList className="size-4" aria-hidden="true" />Ficha de la solicitud</span>
        <span className="fur-request-status" data-status={request.status}>{decisions[request.status] ?? request.status}</span>
      </div>
      <h2 className="text-2xl leading-tight font-semibold tracking-tight text-fur-navy-900 [overflow-wrap:anywhere]">{draft.name}</h2>
      <Fields rows={[
        ['Planta solicitante', request.plantName],
        ['Familia', family ? `${family.tagCode ? `${family.tagCode} · ` : ''}${family.name}` : draft.familyId],
        ['Etapa', stage ? `${stage.code} · ${stage.name}` : draft.stageCode],
        ['Red transversal', draft.networkCodes.map(code => { const network = networks.data?.find(n => n.code === code); return network ? `${code} · ${network.name}` : code }).join('\n')],
      ]} />
    </header>
    <div className="divide-y divide-border">
      <section className="space-y-4 p-5 sm:p-6" aria-label="Datos de la unidad solicitada">
        <h3 className="font-semibold text-fur-navy-900">Datos de la unidad solicitada</h3>
        <Fields rows={[
          ['Número de serie', draft.serialNumber || 'Sin registrar'],
          ['Criticidad', draft.criticality ? criticalities[draft.criticality] ?? draft.criticality : 'Sin registrar'],
          ['Estado del equipo', draft.status ? statuses[draft.status] ?? draft.status : 'Sin registrar'],
          ['Visibilidad', draft.isPublic ? 'Público' : 'Privado'],
          ...(draft.location ? [['Ubicación', draft.location] as [string, ReactNode]] : []),
          ...(draft.installationDate ? [['Fecha de instalación', formatDate(draft.installationDate)] as [string, ReactNode]] : []),
          ...(draft.commissionDate ? [['Puesta en servicio', formatDate(draft.commissionDate)] as [string, ReactNode]] : []),
          ['Fecha de envío', formatDateTime(request.createdAt)],
          ...(request.decidedAt ? [['Fecha de decisión', formatDateTime(request.decidedAt)] as [string, ReactNode]] : []),
        ]} />
      </section>
      <section className="space-y-2 border-l-4 border-l-fur-gold-500 bg-muted/20 p-5 sm:p-6">
        <h3 className="font-semibold text-fur-navy-900">Nota de la solicitud</h3>
        <p className="whitespace-pre-wrap text-sm leading-relaxed [overflow-wrap:anywhere]">{draft.requestNote || 'La planta no incluyó una nota.'}</p>
      </section>
      <section className="p-5 sm:p-6" aria-label="Ficha técnica enviada">
        <h3 className="font-semibold text-fur-navy-900">Ficha técnica enviada</h3>
        <p className="mt-1 mb-4 text-xs text-muted-foreground">Valores originales de la planta, conservados como fueron enviados.</p>
        <dl className="divide-y divide-border">{specifications.map(([key, value]) => <div key={key} className="grid gap-1 py-3 text-sm sm:grid-cols-2 sm:gap-4">
          <dt className="font-medium [overflow-wrap:anywhere]">{key}</dt>
          <dd className="min-w-0 whitespace-pre-wrap [overflow-wrap:anywhere]">{specificationText(value)}</dd>
        </div>)}</dl>
        {!specifications.length && <p className="text-sm text-muted-foreground">Sin especificaciones registradas.</p>}
        <h4 className="mt-5 mb-2 text-sm font-semibold">Componentes enviados</h4>
        {components.length ? <ol className="list-decimal space-y-2 pl-5 text-sm">{components.map((component, i) => <li key={i} className="whitespace-pre-wrap [overflow-wrap:anywhere]">{component}</li>)}</ol> : <p className="text-sm text-muted-foreground">Sin componentes registrados.</p>}
      </section>
      {request.status !== 'PENDING' && <section className="space-y-2 p-5 sm:p-6">
        <h3 className="font-semibold text-fur-navy-900">Decisión de administración</h3>
        <p className="text-sm">{request.status === 'APPROVED' ? 'Modelo publicado y activo registrado en planta.' : 'Solicitud rechazada. No se creó un activo.'}</p>
        <p className="whitespace-pre-wrap text-sm [overflow-wrap:anywhere]">{request.decisionNote || 'Sin comentarios de administración.'}</p>
      </section>}
    </div>
  </section>
}
