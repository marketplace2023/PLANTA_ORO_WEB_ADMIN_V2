import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Archive, ArrowRight, Search } from 'lucide-react'
import { ScreenHeader, Panel } from '@/components/kit'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CatalogEditor } from '@/features/budget-catalog/catalog-editor'
import { CatalogReleases } from '@/features/budget-catalog/catalog-releases'
import { MASTER_KINDS, RESOURCE_TYPES, selectClass, type MasterEntry } from '@/features/budget-catalog/types'

type Batch = { id: string; fingerprint: string; source: string; createdAt: string; report: { counts: Record<string, number>; quarantined: number; compositionLines: number; issues: Record<string, number> } }
const NAMES: Record<string, string> = { families: 'Familias', materials: 'Materiales', equipment: 'Equipos', labor: 'Mano de obra', items: 'Partidas', apus: 'APU' }

export function BudgetCatalogPage() {
  const batches = useQuery({ queryKey: ['lulo', 'batches'], queryFn: () => api<Batch[]>('/admin/budget-catalog/batches') })
  const [chosen, setChosen] = useState('')
  const batch = batches.data?.find(b => b.id === chosen) ?? batches.data?.[0]
  return <>
    <ScreenHeader title="Maestros de Presupuestos LULO" description="Corrige, verifica y prepara versiones de la biblioteca compartida." />
    <div role="status" className="mb-6 rounded-xl border border-border bg-fur-gold-500/10 p-4 text-sm leading-relaxed">Los precios originales son referencias históricas sin moneda ni base de costo confirmadas. Verifica los valores antes de aprobarlos. Las versiones publicadas pueden activarse para que visitantes y plantas utilicen la misma biblioteca, conservando el historial de correcciones.</div>
    {batches.isLoading ? <p>Cargando lotes…</p> : batches.isError ? <Panel><p role="alert">No se pudieron cargar los lotes.</p><Button variant="outline" onClick={() => void batches.refetch()}>Reintentar</Button></Panel> : !batch ? <Panel><div className="py-10 text-center"><Archive className="mx-auto mb-3 size-8 text-muted-foreground" /><h2 className="font-semibold">Aún no hay maestros recuperados</h2><p className="mt-2 text-sm text-muted-foreground">Los lotes del recuperador local aparecerán aquí para su revisión.</p></div></Panel> : <>
      <div className="mb-5 grid gap-3 sm:grid-cols-3 xl:grid-cols-6">{Object.entries(batch.report.counts).map(([key, value]) => <div key={key} className="rounded-2xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">{NAMES[key] ?? key}</p><strong className="mt-2 block text-2xl font-semibold tabular-nums">{value.toLocaleString('es-VE')}</strong></div>)}</div>
      <Panel><div className="grid items-start gap-5 lg:grid-cols-[minmax(14rem,1fr)_2fr]"><label className="block space-y-2 text-xs font-medium">Lote de recuperación<select aria-label="Lote de recuperación" className={selectClass} value={batch.id} onChange={e => setChosen(e.target.value)}>{batches.data?.map(b => <option key={b.id} value={b.id}>{b.source} · {new Date(b.createdAt).toLocaleDateString('es-VE')}</option>)}</select></label>
        <div className="text-xs text-muted-foreground"><p>{batch.report.compositionLines.toLocaleString('es-VE')} renglones conservados · {batch.report.quarantined} registros con observaciones en el origen.</p><p className="mt-2 break-all font-mono text-[10px]">Huella del lote: {batch.fingerprint}</p><p className="mt-2">Revise primero familias e insumos; después partidas y APU. Las observaciones de la importación se conservan como evidencia.</p></div></div></Panel>
      <BatchWorkspace key={batch.id} batchId={batch.id} />
    </>}
  </>
}

function BatchWorkspace({ batchId }: { batchId: string }) {
  const [tab, setTab] = useState('library')
  const [kind, setKind] = useState('')
  const [type, setType] = useState('')
  const [state, setState] = useState('')
  const [sourceStatus, setSourceStatus] = useState('')
  const [term, setTerm] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const params = new URLSearchParams({ page: String(page), pageSize: '30', ...(kind ? { kind } : {}), ...(type ? { type } : {}), ...(state ? { reviewState: state } : {}), ...(sourceStatus ? { status: sourceStatus } : {}), ...(search ? { search } : {}) })
  const summary = useQuery({ queryKey: ['lulo', 'summary', batchId], queryFn: () => api<{ state: string; count: number }[]>(`/admin/budget-catalog/batches/${batchId}/review-summary`) })
  const entries = useQuery({ queryKey: ['lulo', 'entries', batchId, params.toString()], queryFn: () => api<{ items: MasterEntry[]; total: number }>(`/admin/budget-catalog/batches/${batchId}/entries?${params}`) })
  const select = (id: string) => setSelectedIds(ids => ids.includes(id) ? ids.filter(x => x !== id) : ids.length < 200 ? [...ids, id] : ids)

  return <div className="mt-5 space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-4"><div className="flex flex-wrap gap-2" aria-label="Secciones de maestros"><Button variant={tab === 'library' ? 'default' : 'outline'} onClick={() => setTab('library')}>Biblioteca y revisión</Button><Button variant={tab === 'versions' ? 'default' : 'outline'} onClick={() => setTab('versions')}>Versiones del catálogo{selectedIds.length ? ` (${selectedIds.length})` : ''}</Button></div>
      <p className="text-xs text-muted-foreground">{summary.isError ? 'No se pudo cargar el avance de revisión' : summary.isLoading ? 'Cargando avance…' : `${summary.data?.find(s => s.state === 'APPROVED')?.count ?? 0} con aprobación registrada · ${summary.data?.find(s => s.state === 'DRAFT')?.count ?? 0} pendientes`}</p></div>
    {tab === 'versions' ? <CatalogReleases batchId={batchId} selectedIds={selectedIds} onClear={() => setSelectedIds([])} /> : <>
      <div className={`grid items-start gap-5 ${selected ? 'xl:grid-cols-[minmax(0,1fr)_minmax(25rem,0.9fr)]' : ''}`}>
        <Panel title="Biblioteca recuperada" subtitle="Seleccione filas para preparar una versión; abra el código para corregir y aprobar.">
          <form className="mb-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3" onSubmit={e => { e.preventDefault(); setSearch(term); setPage(1) }}><Input aria-label="Buscar maestro" placeholder="Código o descripción…" value={term} onChange={e => setTerm(e.target.value)} /><Button type="submit" variant="outline"><Search /> Buscar</Button>
            <select className={selectClass} aria-label="Tipo de maestro" value={kind} onChange={e => { setKind(e.target.value); if (['ITEM', 'APU'].includes(e.target.value)) setType(''); setPage(1) }}><option value="">Todos los maestros</option>{Object.entries(MASTER_KINDS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}</select>
            <select className={selectClass} aria-label="Tipo de insumo" value={type} onChange={e => { setType(e.target.value); setPage(1) }}><option value="">Todos los tipos de insumo</option>{Object.entries(RESOURCE_TYPES).map(([k, label]) => <option key={k} value={k}>{label}</option>)}</select>
            <select className={selectClass} aria-label="Estado de revisión" value={state} onChange={e => { setState(e.target.value); setPage(1) }}><option value="">Todos los estados</option><option value="DRAFT">Pendientes de aprobar</option><option value="APPROVED">Aprobados</option></select>
            <select className={selectClass} aria-label="Observaciones de origen" value={sourceStatus} onChange={e => { setSourceStatus(e.target.value); setPage(1) }}><option value="">Con y sin observaciones de origen</option><option value="QUARANTINED">Con observaciones en la importación</option><option value="RECOVERED">Sin observaciones en la importación</option></select>
          </form>
          {selectedIds.length > 0 && <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted p-3"><p className="text-xs">{selectedIds.length} maestros seleccionados</p><Button size="sm" variant="outline" onClick={() => setTab('versions')}>Preparar versión <ArrowRight /></Button></div>}
          {entries.isLoading ? <p>Cargando registros…</p> : entries.isError ? <p role="alert" className="text-sm text-destructive">No se pudieron cargar los registros.</p> : <>
            <p className="mb-3 text-xs text-muted-foreground">{entries.data?.total.toLocaleString('es-VE')} registros encontrados</p><div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="text-muted-foreground"><tr><th className="p-2">Incluir</th><th className="p-2">Código</th><th className="p-2">Descripción</th><th className="p-2">Unidad</th><th className="p-2">Revisión</th></tr></thead><tbody>{entries.data?.items.map(e => <tr key={e.id} className={`border-t border-border align-top ${selected === e.id ? 'bg-muted/50' : ''}`}>
              <td className="p-2"><input type="checkbox" aria-label={`Incluir ${e.code} en la versión`} checked={selectedIds.includes(e.id)} disabled={selectedIds.length >= 200 && !selectedIds.includes(e.id)} onChange={() => select(e.id)} /></td>
              <td className="p-2"><button className="rounded font-mono font-semibold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring" onClick={() => setSelected(e.id)}>{e.code}</button><small className="mt-1 block text-muted-foreground">{RESOURCE_TYPES[e.resourceType] ?? MASTER_KINDS[e.kind]}</small></td>
              <td className="min-w-44 max-w-xl p-2">{e.name}</td><td className="p-2">{e.unit ?? '—'}</td><td className="p-2"><span>{e.reviewState === 'APPROVED' ? 'Con aprobación' : 'Pendiente'}</span><small className="mt-1 block text-muted-foreground">Revisión {e.revision ?? 0}</small></td>
            </tr>)}</tbody></table></div>{entries.data?.total === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No hay maestros con estos filtros.</p>}
            <nav className="mt-4 flex items-center justify-between gap-3" aria-label="Páginas de maestros"><Button variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>Anterior</Button><span className="text-xs">Página {page} de {Math.max(1, Math.ceil((entries.data?.total ?? 0) / 30))}</span><Button variant="outline" disabled={page * 30 >= (entries.data?.total ?? 0)} onClick={() => setPage(page + 1)}>Siguiente</Button></nav>
          </>}
        </Panel>
        {selected && <CatalogEditor key={selected} id={selected} onClose={() => setSelected('')} onNavigate={setSelected} />}
      </div>
    </>}
  </div>
}
