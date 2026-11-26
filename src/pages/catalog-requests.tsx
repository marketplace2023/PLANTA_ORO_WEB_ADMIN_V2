import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ClipboardCheck, Eye, Search, X } from 'lucide-react'
import { api } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import { MagicSurface } from '@/components/ui/studio'
import { useFamilies } from '@/features/catalog/use-catalog'
import { CatalogRequestSheet, type CatalogSubmission } from '@/components/catalog-request-sheet'
import { CatalogRequestProcessDialog } from '@/components/catalog-request-process-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { DataTable, Loading, Failed, Empty, Segmented, td } from '@/components/kit'

const FILTERS = [
  { value: 'PENDING', label: 'Pendientes' }, { value: 'APPROVED', label: 'Aprobadas' },
  { value: 'REJECTED', label: 'Rechazadas' }, { value: 'ALL', label: 'Todas' },
] as const
type StatusFilter = typeof FILTERS[number]['value']
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().trim()
const PAGE_SIZE = 20

function Status({ status }: { status: string }) {
  const label = status === 'APPROVED' ? 'Aprobada' : status === 'REJECTED' ? 'Rechazada' : 'Pendiente'
  return <span className="fur-request-status" data-status={status}>{label}</span>
}

export function CatalogRequestsTab() {
  const query = useQuery({ queryKey: ['catalog', 'requests'], queryFn: () => api<CatalogSubmission[]>('/catalog/requests') })
  const families = useFamilies()
  const [status, setStatus] = useState<StatusFilter>('PENDING')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selection, setSelection] = useState<{ id: string; mode: 'view' | 'process' } | null>(null)
  const rows = query.data ?? []
  const filtered = rows.filter(row => {
    if (status !== 'ALL' && row.status !== status) return false
    const family = families.data?.find(f => f.id === row.draft.familyId)
    return normalize([row.draft.name, row.plantName, family?.name, family?.tagCode, row.draft.stageCode, ...row.draft.networkCodes].join(' ')).includes(normalize(search))
  })
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pages)
  const selected = rows.find(row => row.id === selection?.id)
  const family = families.data?.find(f => f.id === selected?.draft.familyId)

  if (query.isPending) return <Loading rows={6} />
  if (query.isError) return <Failed what="las solicitudes de catálogo" onRetry={() => void query.refetch()} />
  return <section className="min-w-0 space-y-5" aria-label="Bandeja de solicitudes">
    <header className="space-y-1"><h2 className="text-xl font-semibold tracking-tight text-fur-navy-900">Solicitudes de plantas</h2><p className="text-sm text-muted-foreground">Consulta las fichas recibidas y procesa las incorporaciones pendientes.</p></header>
    <MagicSurface className="request-inbox min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b p-4">
        <Segmented label="Filtrar solicitudes por estado" value={status} onChange={value => { setStatus(value); setPage(1) }} options={FILTERS.map(f => ({ ...f, count: f.value === 'ALL' ? rows.length : rows.filter(r => r.status === f.value).length }))} />
        <div className="relative w-full sm:w-72"><Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><Input aria-label="Buscar solicitudes" className="pl-9" placeholder="Equipo, planta o familia…" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} /></div>
      </div>
      {filtered.length ? <DataTable head={['Equipo solicitado', 'Planta', 'Familia', 'Etapa / red', 'Enviada', 'Estado', 'Acciones']}>
        {filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map(row => {
          const rowFamily = families.data?.find(f => f.id === row.draft.familyId)
          return <tr key={row.id} className="align-top transition-colors hover:bg-muted/30">
            <td className={`${td} min-w-40 max-w-72`}><span className="font-semibold text-fur-navy-900 [overflow-wrap:anywhere]">{row.draft.name}</span>{row.draft.serialNumber && <span className="mt-1 block text-xs text-muted-foreground [overflow-wrap:anywhere]">Serie: {row.draft.serialNumber}</span>}</td>
            <td className={`${td} min-w-28`}>{row.plantName}</td>
            <td className={`${td} min-w-28`}>{rowFamily?.name ?? row.draft.familyId}</td>
            <td className={`${td} whitespace-nowrap`}><span className="font-medium">{row.draft.stageCode}</span><span className="mt-1 block text-xs text-muted-foreground">{row.draft.networkCodes.join(', ')}</span></td>
            <td className={`${td} whitespace-nowrap text-xs text-muted-foreground`}>{row.createdAt ? formatDateTime(row.createdAt) : 'Sin fecha'}</td>
            <td className={td}><Status status={row.status} /></td>
            <td className={td}><div className="flex flex-wrap gap-2 sm:flex-nowrap">
              <Button variant="outline" size="sm" aria-label={`Ver ficha de ${row.draft.name}`} onClick={() => setSelection({ id: row.id, mode: 'view' })}><Eye className="size-4" />Ver ficha</Button>
              {row.status === 'PENDING' && <Button size="sm" aria-label={`Procesar ${row.draft.name}`} onClick={() => setSelection({ id: row.id, mode: 'process' })}><ClipboardCheck className="size-4" />Procesar</Button>}
            </div></td>
          </tr>
        })}
      </DataTable> : <div className="px-4 py-10 text-center">
        <Empty>{!rows.length ? 'No hay solicitudes de plantas.' : search ? 'No hay solicitudes que coincidan con tu búsqueda.' : status === 'PENDING' ? 'No hay solicitudes pendientes.' : 'No hay solicitudes en este estado.'}</Empty>
        {(status !== 'ALL' || search) && rows.length > 0 && <Button variant="outline" onClick={() => { setStatus('ALL'); setSearch(''); setPage(1) }}>Ver todas las solicitudes</Button>}
      </div>}
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-xs text-muted-foreground">
        <span role="status">{filtered.length} {filtered.length === 1 ? 'solicitud' : 'solicitudes'}{search && ' encontradas'}</span>
        {pages > 1 && <div className="flex items-center gap-3"><Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Anterior</Button><span>Página {currentPage} de {pages}</span><Button variant="outline" size="sm" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}>Siguiente</Button></div>}
      </footer>
    </MagicSurface>
    {selected && selection?.mode === 'view' && <Dialog open onOpenChange={open => !open && setSelection(null)}>
      <DialogContent showCloseButton={false} className="fur-asset-dialog flex max-h-[92dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b p-5"><div className="space-y-1"><DialogTitle className="text-lg font-semibold">Ficha de solicitud</DialogTitle><DialogDescription>Información original enviada por la planta.</DialogDescription></div><Button variant="ghost" size="icon-sm" aria-label="Cerrar ficha" onClick={() => setSelection(null)}><X /></Button></header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5"><CatalogRequestSheet request={selected} family={family} /></div>
      </DialogContent>
    </Dialog>}
    {selected?.status === 'PENDING' && selection?.mode === 'process' && <CatalogRequestProcessDialog key={selected.id} request={selected} family={family} onClose={() => setSelection(null)} />}
  </section>
}
