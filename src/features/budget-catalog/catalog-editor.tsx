import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, History, Save, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Panel } from '@/components/kit'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { api, ApiError, jsonBody } from '@/lib/api'
import { CatalogLookup } from './catalog-lookup'
import { MASTER_KINDS, RESOURCE_TYPES, selectClass, type CatalogDraft, type CatalogReview } from './types'

function Field({ title, children, className = '' }: { title: string; children: ReactNode; className?: string }) {
  return <label className={`block space-y-1.5 text-xs font-medium ${className}`}><span>{title}</span>{children}</label>
}

function HistoryList({ id }: { id: string }) {
  const [page, setPage] = useState(1)
  const history = useQuery({ queryKey: ['lulo', 'history', id, page], queryFn: () => api<{ id: string; occurredAt: string; action: string; oldData: unknown; newData: { reason: string; actorName: string; value: unknown } }[]>(`/admin/budget-catalog/entries/${id}/history?page=${page}`) })
  return <div className="space-y-4">{history.isLoading ? <p>Cargando historial…</p> : history.isError ? <p role="alert">No se pudo cargar el historial.</p> : <>
    {!history.data?.length && <p className="text-sm text-muted-foreground">Todavía no hay cambios en esta página del historial.</p>}
    {history.data?.map(h => <article key={h.id} className="border-l-2 border-border pl-4"><p className="text-sm font-semibold">{h.action === 'EDIT' ? 'Corrección guardada' : 'Aprobación registrada'} · {h.newData.actorName}</p>
      <p className="mt-1 text-xs text-muted-foreground">{new Date(h.occurredAt).toLocaleString('es-VE')}</p><p className="my-2 text-sm">{h.newData.reason}</p>
      <details className="text-xs"><summary className="cursor-pointer text-muted-foreground">Ver antes y después</summary><pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-muted p-3">{JSON.stringify({ antes: h.oldData, despues: h.newData.value }, null, 2)}</pre></details></article>)}
    <div className="flex justify-between"><Button variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>Historial anterior</Button><Button variant="outline" disabled={(history.data?.length ?? 0) < 20} onClick={() => setPage(page + 1)}>Más historial</Button></div>
  </>}</div>
}

export function CatalogEditor({ id, onClose, onNavigate }: { id: string; onClose: () => void; onNavigate: (id: string) => void }) {
  const container = useRef<HTMLDivElement>(null)
  useEffect(() => { container.current?.scrollIntoView({ block: 'start' }) }, [id])
  const review = useQuery({ queryKey: ['lulo', 'review', id], queryFn: () => api<CatalogReview>(`/admin/budget-catalog/entries/${id}/review`), refetchOnWindowFocus: false })
  return <div ref={container} className="order-first min-w-0 scroll-mt-24 xl:order-last"><Panel title="Revisar maestro" action={<Button variant="ghost" size="sm" onClick={onClose}>Cerrar editor</Button>}>
    {review.isLoading ? <p>Cargando revisión…</p> : review.isError ? <p role="alert">No se pudo abrir la revisión. <Button variant="outline" onClick={() => void review.refetch()}>Reintentar</Button></p> : review.data && <ReviewForm key={`${id}:${review.data.revision}`} review={review.data} onNavigate={onNavigate} />}
  </Panel></div>
}

function ReviewForm({ review, onNavigate }: { review: CatalogReview; onNavigate: (id: string) => void }) {
  const client = useQueryClient()
  const [draft, setDraft] = useState<CatalogDraft>(review.draft)
  const [reason, setReason] = useState('')
  const [tab, setTab] = useState<'edit' | 'history'>('edit')
  const [lookup, setLookup] = useState<'family' | number | 'new' | null>(null)
  const [newType, setNewType] = useState('MATERIAL')
  const original = review.original
  const dirty = JSON.stringify(draft) !== JSON.stringify(review.draft)
  const update = <K extends keyof CatalogDraft>(key: K, value: CatalogDraft[K]) => setDraft(d => ({ ...d, [key]: value }))
  const price = (key: string, value: string) => setDraft(d => ({ ...d, price: d.price ? { ...d.price, [key]: value } : null }))
  const mutation = useMutation({ mutationFn: (action: 'review' | 'approve') => api(`/admin/budget-catalog/entries/${original.id}/${action}`, {
    method: action === 'review' ? 'PATCH' : 'POST', ...jsonBody({ expectedRevision: review.revision, reason, ...(action === 'review' ? { draft } : {}) }),
  }), onSuccess: async (_data, action) => { toast.success(action === 'review' ? 'Corrección guardada. Revise las validaciones antes de aprobar.' : 'Aprobación registrada.'); await client.invalidateQueries({ queryKey: ['lulo'] }) } })
  const canApprove = !dirty && (review.state !== 'APPROVED' || review.blockers.length > 0) && review.blockers.every(e => e.startsWith('Cambió '))
  const family = review.dependencies.find(d => d.kind === 'FAMILY')

  return <div className="space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-wide text-muted-foreground">{MASTER_KINDS[original.kind]} · {RESOURCE_TYPES[original.resourceType] ?? 'Maestro'}</p><h3 className="mt-1 font-mono text-lg font-semibold">{original.code}</h3></div>
      <span className="rounded-lg bg-muted px-3 py-2 text-xs">Revisión {review.revision} · {review.state === 'APPROVED' ? review.blockers.length ? 'Requiere revalidación' : 'Aprobada' : 'Borrador'}</span></div>
    <div className="flex gap-2" aria-label="Vista del maestro"><Button variant={tab === 'edit' ? 'default' : 'outline'} onClick={() => setTab('edit')}>Corrección y validación</Button><Button variant={tab === 'history' ? 'default' : 'outline'} onClick={() => setTab('history')}><History /> Historial</Button></div>
    {tab === 'history' ? <HistoryList id={original.id} /> : <>
      <p className="text-xs leading-relaxed text-muted-foreground">Los cambios crean una revisión de trabajo. El registro importado permanece intacto. Guardar una modificación deja el maestro pendiente de aprobación.</p>
      <form className="space-y-5" onSubmit={e => { e.preventDefault(); mutation.mutate('review') }}>
        <Field title="Descripción"><Textarea aria-label="Descripción del maestro" value={draft.name} maxLength={2000} onChange={e => update('name', e.target.value)} /></Field>
        {original.kind !== 'FAMILY' && <Field title="Unidad"><Input aria-label="Unidad del maestro" placeholder="Ej.: KG, UND, H o DIA" value={draft.unit ?? ''} onChange={e => update('unit', e.target.value || null)} /></Field>}
        {original.kind === 'RESOURCE' && <>
          <section className="rounded-xl bg-muted/40 p-4"><p className="text-xs font-medium">Familia</p><p className="mt-1 text-sm">{family?.sourceId === draft.familySourceId ? `${family.code} · ${family.name}` : draft.familySourceId ? 'Nueva familia seleccionada; guarde para validar' : 'Sin familia'}</p><Button className="mt-3" variant="outline" type="button" onClick={() => setLookup('family')}>Cambiar familia</Button>
            {lookup === 'family' && <CatalogLookup batchId={original.batchId as string} kind="FAMILY" type={original.resourceType} onClose={() => setLookup(null)} onChoose={e => { update('familySourceId', e.sourceId); setLookup(null) }} />}</section>
          <section className="space-y-4 rounded-xl border border-border p-4"><div><h4 className="font-semibold">Verificación económica</h4><p className="mt-1 text-xs text-muted-foreground">Registre un precio comprobado y su vigencia. Para equipos se requiere la tarifa de uso; el costo de adquisición del original se conserva como referencia.</p></div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!draft.price} onChange={e => update('price', e.target.checked ? { amount: '', currency: '', denomination: '', baseDate: '', validUntil: '', costBasis: '', evidence: '' } : null)} /> Registrar precio verificado</label>
            {draft.price && <div className="grid gap-4 sm:grid-cols-2">
              <Field title="Precio validado"><Input aria-label="Precio validado" inputMode="decimal" value={draft.price.amount} onChange={e => price('amount', e.target.value)} placeholder="0.00" /></Field>
              <Field title="Moneda"><Input aria-label="Moneda" placeholder="Código de 3 letras" maxLength={3} value={draft.price.currency} onChange={e => price('currency', e.target.value.toUpperCase())} /></Field>
              <Field title="Denominación monetaria" className="sm:col-span-2"><Input aria-label="Denominación monetaria" placeholder="Nombre y denominación que corresponden a estos importes" value={draft.price.denomination} onChange={e => price('denomination', e.target.value)} /></Field>
              <Field title="Fecha base"><Input aria-label="Fecha base" type="date" value={draft.price.baseDate} onChange={e => price('baseDate', e.target.value)} /></Field>
              <Field title="Vigente hasta"><Input aria-label="Vigente hasta" type="date" value={draft.price.validUntil} onChange={e => price('validUntil', e.target.value)} /></Field>
              <Field title="Base de costo" className="sm:col-span-2"><select aria-label="Base de costo" className={selectClass} value={draft.price.costBasis} onChange={e => { const basis = e.target.value; setDraft(d => ({ ...d, unit: basis === 'HOUR' ? 'H' : basis === 'DAY' ? 'DIA' : d.unit, price: { ...d.price!, costBasis: basis } })) }}>
                <option value="">Seleccione la base</option>{original.resourceType === 'MATERIAL' ? <option value="UNIT">Por unidad del material</option> : <><option value="HOUR">Tarifa por hora (H)</option><option value="DAY">Tarifa por día (DIA)</option></>}</select></Field>
              <Field title="Fuente de verificación" className="sm:col-span-2"><Textarea aria-label="Fuente de verificación" placeholder="Cotización, documento, proveedor o referencia y criterio usados para verificar el precio" value={draft.price.evidence} onChange={e => price('evidence', e.target.value)} /></Field>
            </div>}
          </section>
        </>}
        {(original.kind === 'ITEM' || original.kind === 'APU') && <Field title="Rendimiento"><Input aria-label="Rendimiento" inputMode="decimal" value={draft.yieldValue ?? ''} onChange={e => update('yieldValue', e.target.value || null)} /></Field>}
        {original.kind === 'APU' && <>
          <div className="grid gap-4 sm:grid-cols-2"><Field title="Base del rendimiento"><select aria-label="Base del rendimiento" className={selectClass} value={draft.yieldBasis ?? ''} onChange={e => update('yieldBasis', e.target.value || null)}><option value="">Seleccione una base</option><option value="ITEM">Por unidad de partida</option><option value="HOUR">Por hora</option><option value="DAY">Por jornada</option></select></Field>
            {draft.yieldBasis === 'DAY' && <Field title="Horas de jornada"><Input aria-label="Horas de jornada" inputMode="decimal" value={draft.hoursPerDay ?? ''} onChange={e => update('hoursPerDay', e.target.value || null)} /></Field>}</div>
          <Field title="Criterio de composición y rendimiento"><Textarea aria-label="Criterio de composición" value={draft.methodNote} onChange={e => update('methodNote', e.target.value)} placeholder="Documente qué representan las cantidades y el rendimiento verificados" /></Field>
          <section className="space-y-3"><h4 className="font-semibold">Composición · {draft.composition.length} renglones</h4><p className="text-xs text-muted-foreground">Los coeficientes de depreciación se conservan para la revisión del legado. Esta entrega todavía no los aplica a un motor de cálculo.</p>
            {draft.composition.map((c, i) => <article key={i} className="space-y-3 rounded-xl border border-border p-3">
              <div className="flex items-start justify-between gap-3"><div><p className="font-mono text-sm font-semibold">{c.code || 'Referencia pendiente'}</p><p className="text-xs text-muted-foreground">{RESOURCE_TYPES[c.resourceType]} · {review.dependencies.find(d => d.sourceId === c.resourceSourceId && d.resourceType === c.resourceType)?.name ?? 'Guarde para comprobar la referencia'}</p></div>
                <Button type="button" size="sm" variant="ghost" aria-label={`Eliminar renglón ${i + 1}`} onClick={() => update('composition', draft.composition.filter((_c, j) => j !== i))}><Trash2 /></Button></div>
              <div className="grid gap-3 sm:grid-cols-3">{[['quantity', 'Cantidad'], ['wastePct', 'Desperdicio (%)'], ['sourceDepreciation', 'Depreciación (0–1)']].map(([key, label]) => <Field key={key} title={label}><Input aria-label={`${label} del renglón ${i + 1}`} inputMode="decimal" value={c[key as keyof typeof c] ?? ''} onChange={e => update('composition', draft.composition.map((row, j) => j === i ? { ...row, [key]: key === 'quantity' ? e.target.value : e.target.value || null } : row))} /></Field>)}</div>
              <Button type="button" size="sm" variant="outline" onClick={() => setLookup(i)}>Cambiar insumo del renglón {i + 1}</Button>
              {lookup === i && <CatalogLookup batchId={original.batchId as string} kind="RESOURCE" type={c.resourceType} onClose={() => setLookup(null)} onChoose={e => { update('composition', draft.composition.map((row, j) => j === i ? { ...row, resourceSourceId: e.sourceId, code: e.code } : row)); setLookup(null) }} />}
            </article>)}
            <div className="flex flex-wrap gap-2"><select className={`${selectClass} max-w-48`} aria-label="Tipo de nuevo insumo" value={newType} onChange={e => setNewType(e.target.value)}>{Object.entries(RESOURCE_TYPES).map(([k, label]) => <option key={k} value={k}>{label}</option>)}</select><Button type="button" variant="outline" disabled={draft.composition.length >= 1000} onClick={() => setLookup('new')}>Agregar insumo</Button></div>
            {lookup === 'new' && <CatalogLookup batchId={original.batchId as string} kind="RESOURCE" type={newType} onClose={() => setLookup(null)} onChoose={e => { update('composition', [...draft.composition, { resourceSourceId: e.sourceId, resourceType: e.resourceType, code: e.code, quantity: '1', wastePct: null, sourceDepreciation: null }]); setLookup(null) }} />}
          </section>
        </>}
        <section className="rounded-xl bg-muted/40 p-4"><h4 className="mb-2 text-sm font-semibold">Validación de la revisión guardada</h4>{review.blockers.length ? <ul className="list-inside list-disc space-y-1 text-xs text-muted-foreground">{review.blockers.map(b => <li key={b}>{b}</li>)}</ul> : <p className="flex items-center gap-2 text-sm"><CheckCircle2 className="size-4" /> Sin observaciones para esta revisión.</p>}
          {dirty && <p className="mt-3 text-xs font-medium">Guarde los cambios para actualizar las validaciones.</p>}</section>
        {review.dependencies.length > 0 && <section><h4 className="mb-2 text-sm font-semibold">Referencias que deben estar aprobadas</h4><ul className="max-h-48 space-y-1 overflow-auto">{review.dependencies.map((dep, i) => <li key={`${dep.sourceId}-${i}`}><button type="button" disabled={!dep.id || dirty} onClick={() => dep.id && onNavigate(dep.id)} className="rounded px-2 py-1 text-left text-xs underline underline-offset-4 disabled:no-underline disabled:opacity-60">{dep.code} · {dep.name} · {dep.state === 'APPROVED' ? 'Aprobada' : 'Pendiente'}</button></li>)}</ul>{dirty && <p className="text-xs text-muted-foreground">Guarde antes de abrir otra referencia.</p>}</section>}
        <Field title="Motivo del cambio o de la aprobación"><Textarea aria-label="Motivo de revisión" value={reason} minLength={8} maxLength={1000} required onChange={e => setReason(e.target.value)} placeholder="Explique qué verificó o corrigió" /></Field>
        {mutation.isError && <div role="alert" className="space-y-2 text-sm text-destructive"><p>{mutation.error.message}</p>{mutation.error instanceof ApiError && mutation.error.status === 409 && <Button type="button" variant="outline" onClick={() => void client.invalidateQueries({ queryKey: ['lulo', 'review', original.id] })}>Cargar revisión guardada y descartar cambios locales</Button>}</div>}
        <div className="flex flex-wrap gap-2"><Button type="submit" disabled={!dirty || reason.trim().length < 8 || mutation.isPending}><Save /> Guardar corrección</Button><Button type="button" variant="outline" disabled={!canApprove || reason.trim().length < 8 || mutation.isPending} onClick={() => mutation.mutate('approve')}><CheckCircle2 /> {review.state === 'APPROVED' ? 'Revalidar aprobación' : 'Aprobar maestro'}</Button></div>
      </form>
      <details className="border-t border-border pt-4"><summary className="cursor-pointer text-sm font-medium">Datos originales de la importación</summary><p className="my-3 text-xs text-muted-foreground">Los importes siguientes son históricos y no constituyen precios vigentes aprobados.</p><pre className="max-h-80 overflow-auto rounded-xl bg-muted p-4 text-[11px]">{JSON.stringify(original.data, null, 2)}</pre></details>
    </>}
  </div>
}
