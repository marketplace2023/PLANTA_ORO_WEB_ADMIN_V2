import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Archive, CheckCircle2 } from 'lucide-react'
import { Panel } from '@/components/kit'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { api, jsonBody } from '@/lib/api'
import { MASTER_KINDS, type CatalogDraft, type CatalogRelease } from './types'

export function CatalogReleases({ batchId, selectedIds, onClear }: { batchId: string; selectedIds: string[]; onClear: () => void }) {
  const client = useQueryClient()
  const [name, setName] = useState('')
  const [reason, setReason] = useState('')
  const [chosen, setChosen] = useState('')
  const [page, setPage] = useState(1)
  const [publishReason, setPublishReason] = useState('')
  const [activationReason, setActivationReason] = useState('')
  const publications = useQuery({ queryKey: ['lulo', 'publications-admin'], queryFn: () => api<{ id: string; releaseId: string; active: boolean; demo: boolean }[]>('/admin/budget-catalog/publications') })
  const publication = publications.data?.find(p => p.releaseId === chosen)
  const versions = useQuery({ queryKey: ['lulo', 'releases', batchId], queryFn: () => api<CatalogRelease[]>(`/admin/budget-catalog/batches/${batchId}/releases`) })
  const preview = useQuery({ queryKey: ['lulo', 'release', chosen, page], enabled: !!chosen, queryFn: () => api<CatalogRelease & { items: { id: string; code: string; name: string; kind: string; revision: number; snapshot: { draft: CatalogDraft } }[]; events?: { id: string; occurredAt: string; action: string; data: { actorName: string; reason: string } }[] }>(`/admin/budget-catalog/releases/${chosen}?page=${page}`) })
  const prepare = useMutation({ mutationFn: () => api<CatalogRelease>(`/admin/budget-catalog/batches/${batchId}/releases`, { method: 'POST', ...jsonBody({ name, reason, entryIds: selectedIds }) }), onSuccess: async release => { setChosen(release.id); setPage(1); onClear(); await client.invalidateQueries({ queryKey: ['lulo', 'releases'] }) } })
  const publish = useMutation({ mutationFn: () => api<CatalogRelease>(`/admin/budget-catalog/releases/${chosen}/publish`, { method: 'POST', ...jsonBody({ expectedHash: preview.data!.contentHash, reason: publishReason }) }), onSuccess: async () => { setPublishReason(''); await client.invalidateQueries({ queryKey: ['lulo'] }) } })
  const activation = useMutation({ mutationFn: (withdraw: boolean) => api(withdraw ? `/admin/budget-catalog/publications/${publication!.id}/withdraw` : `/admin/budget-catalog/releases/${chosen}/activate`, { method: 'POST', ...jsonBody(withdraw ? { reason: activationReason } : { expectedHash: preview.data!.contentHash, label: preview.data!.name, reason: activationReason }) }), onSuccess: async () => { setActivationReason(''); await client.invalidateQueries({ queryKey: ['lulo'] }) } })
  return <div className="space-y-5">
    <Panel title="Preparar una versión del catálogo" subtitle="Seleccione maestros en la biblioteca. Se incluirán automáticamente sus partidas, familias e insumos relacionados.">
      <p className="mb-4 text-sm text-muted-foreground">La selección completa debe estar aprobada, con precios vigentes y dependencias actualizadas. La versión guarda una copia fija de esas revisiones.</p>
      <form className="space-y-4" onSubmit={e => { e.preventDefault(); prepare.mutate() }}>
        <div className="flex items-center justify-between gap-3 rounded-xl bg-muted p-3"><p className="text-sm"><strong>{selectedIds.length}</strong> maestros seleccionados · máximo 200</p><Button type="button" variant="ghost" disabled={!selectedIds.length} onClick={onClear}>Vaciar selección</Button></div>
        <label className="block space-y-2 text-xs font-medium">Nombre de la versión<Input aria-label="Nombre de la versión" value={name} minLength={3} maxLength={160} required onChange={e => setName(e.target.value)} placeholder="Ej.: Biblioteca piloto de mantenimiento" /></label>
        <label className="block space-y-2 text-xs font-medium">Alcance y motivo<Textarea aria-label="Motivo de la versión" value={reason} minLength={8} maxLength={1000} required onChange={e => setReason(e.target.value)} placeholder="Qué incluye esta selección y qué revisión se ha realizado" /></label>
        {prepare.isError && <p role="alert" className="text-sm text-destructive">{prepare.error.message}</p>}
        <Button disabled={!selectedIds.length || name.trim().length < 3 || reason.trim().length < 8 || prepare.isPending}><Archive /> {prepare.isPending ? 'Preparando versión…' : 'Preparar versión'}</Button>
      </form>
    </Panel>
    <Panel title="Versiones preparadas y publicadas">
      <p className="mb-4 text-xs leading-relaxed text-muted-foreground">Cada versión conserva sus revisiones. Después de publicarla, actívala para habilitar su biblioteca de APU en el home y en las plantas. La activación comprueba las bases de cálculo y la vigencia de los precios.</p>
      {versions.isLoading ? <p>Cargando versiones…</p> : versions.isError ? <p role="alert">No se pudieron cargar las versiones.</p> : !versions.data?.length ? <p className="py-6 text-sm text-muted-foreground">Prepare una primera selección aprobada para crear una versión.</p> : <ul className="space-y-2">{versions.data.map(v => <li key={v.id}><button onClick={() => { setChosen(v.id); setPage(1); setPublishReason(''); publish.reset() }} className={`flex w-full items-center justify-between gap-3 rounded-xl border p-4 text-left text-sm transition-colors hover:bg-muted ${chosen === v.id ? 'border-primary bg-muted/50' : 'border-border'}`}>
        <span><strong>v{v.version} · {v.name}</strong><small className="mt-1 block text-muted-foreground">{v.entryCount} registros con dependencias · {new Date(v.createdAt).toLocaleDateString('es-VE')}</small></span><span className="text-xs font-medium">{v.state === 'PUBLISHED' ? 'Publicada' : 'Preparada'}</span>
      </button></li>)}</ul>}
    </Panel>
    {chosen && <Panel title="Contenido de la versión" action={<Button size="sm" variant="ghost" onClick={() => setChosen('')}>Cerrar versión</Button>}>
      {preview.isLoading ? <p>Cargando contenido…</p> : preview.isError ? <p role="alert">No se pudo cargar la versión.</p> : preview.data && <div className="space-y-4"><h3 className="font-semibold">v{preview.data.version} · {preview.data.name}</h3><p className="break-all font-mono text-[10px] text-muted-foreground">Huella del contenido: {preview.data.contentHash}</p>
        {!!preview.data.events?.length && <section className="space-y-3 rounded-xl bg-muted/40 p-4" aria-label="Historial de la versión">{preview.data.events.map(event => <article key={event.id}><p className="text-xs font-semibold">{event.action === 'PUBLISH_RELEASE' ? 'Publicada' : 'Preparada'} por {event.data.actorName} · {new Date(event.occurredAt).toLocaleString('es-VE')}</p><p className="mt-1 text-xs text-muted-foreground">{event.data.reason}</p></article>)}</section>}
        <ul className="space-y-2">{preview.data.items.map(item => <li key={item.id} className="rounded-xl bg-muted/40 p-3"><p className="text-sm"><strong className="font-mono">{item.code}</strong> · {item.name}</p><p className="mt-1 text-xs text-muted-foreground">{MASTER_KINDS[item.kind]} · revisión {item.revision}</p><details className="mt-2 text-xs"><summary className="cursor-pointer">Ver datos de esta versión</summary><pre className="mt-2 max-h-60 overflow-auto">{JSON.stringify(item.snapshot.draft, null, 2)}</pre></details></li>)}</ul>
        <div className="flex justify-between gap-3"><Button variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>Contenido anterior</Button><span className="self-center text-xs">Página {page} de {Math.max(1, Math.ceil(preview.data.entryCount / 30))}</span><Button variant="outline" disabled={page * 30 >= preview.data.entryCount} onClick={() => setPage(page + 1)}>Más contenido</Button></div>
        {preview.data.state === 'PUBLISHED' ? <p role="status" className="flex items-center gap-2 rounded-xl bg-muted p-4 text-sm"><CheckCircle2 className="size-5" /> Publicación interna de referencia. Su contenido permanece fijo aunque cambien los maestros.</p> : <form className="space-y-3 border-t border-border pt-4" onSubmit={e => { e.preventDefault(); publish.mutate() }}>
          <p className="text-xs leading-relaxed text-muted-foreground">Antes de publicar se volverán a comprobar la vigencia y las revisiones aprobadas. Si cambió algún maestro, prepare una nueva versión.</p><label className="block space-y-2 text-xs font-medium">Motivo de publicación<Textarea aria-label="Motivo de publicación" value={publishReason} minLength={8} required onChange={e => setPublishReason(e.target.value)} /></label>
          {publish.isError && <p role="alert" className="text-sm text-destructive">{publish.error.message}</p>}<Button disabled={publishReason.trim().length < 8 || publish.isPending}><CheckCircle2 /> {publish.isPending ? 'Publicando…' : 'Publicar versión de referencia'}</Button>
        </form>}
        {preview.data.state === 'PUBLISHED' && <section className="space-y-3 rounded-xl border border-border p-4"><h3 className="font-semibold">Catálogo compartido: home y planta</h3><p role="status" className="text-sm">{publication?.active ? `Disponible para estimaciones y presupuestos${publication.demo ? ' como demostración' : ''}.` : 'Esta versión todavía no está habilitada para calcular desde la web.'}</p><p className="text-xs text-muted-foreground">Retirar una publicación impide usarla en nuevos trabajos. Los presupuestos que ya guardaron sus precios conservan su copia.</p>
          <label className="block space-y-2 text-xs font-medium">Motivo de activación o retiro<Textarea aria-label="Motivo de activación o retiro" value={activationReason} minLength={8} maxLength={1000} onChange={e => setActivationReason(e.target.value)} /></label>
          {activation.isError && <p role="alert" className="text-sm text-destructive">{activation.error.message}</p>}{publications.isError && <p role="alert" className="text-sm text-destructive">No se pudo comprobar la publicación compartida.</p>}
          <Button variant={publication?.active ? 'outline' : 'default'} disabled={publications.isLoading || publications.isError || activationReason.trim().length < 8 || activation.isPending} onClick={() => activation.mutate(!!publication?.active)}>{publication?.active ? 'Retirar del catálogo compartido' : 'Activar en home y planta'}</Button>
        </section>}
      </div>}
    </Panel>}
  </div>
}
