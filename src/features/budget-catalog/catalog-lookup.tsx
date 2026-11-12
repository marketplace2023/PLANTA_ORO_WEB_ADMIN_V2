import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { MasterEntry } from './types'

export function CatalogLookup({ batchId, kind, type, onChoose, onClose }: {
  batchId: string; kind: string; type?: string; onChoose: (entry: MasterEntry) => void; onClose: () => void;
}) {
  const [term, setTerm] = useState('')
  const [search, setSearch] = useState('')
  const params = new URLSearchParams({ kind, pageSize: '10', ...(type ? { type } : {}), ...(search ? { search } : {}) })
  const result = useQuery({ queryKey: ['lulo', 'lookup', batchId, params.toString()], queryFn: () => api<{ items: MasterEntry[]; total: number }>(`/admin/budget-catalog/batches/${batchId}/entries?${params}`) })
  return <section className="my-3 rounded-xl border border-border bg-muted/40 p-3" aria-label="Seleccionar referencia">
    <div className="flex gap-2"><Input aria-label="Buscar referencia" placeholder="Código o descripción" value={term} onChange={e => setTerm(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); setSearch(term) } }} />
      <Button type="button" variant="outline" onClick={() => setSearch(term)}>Buscar referencia</Button><Button type="button" variant="ghost" onClick={onClose}>Cerrar</Button></div>
    {result.isLoading ? <p className="mt-3 text-sm">Buscando referencias…</p> : result.isError ? <p role="alert">No se pudieron buscar las referencias.</p> : <ul className="mt-3 max-h-60 space-y-1 overflow-auto">{result.data?.items.map(e => <li key={e.id}>
      <button type="button" className="w-full rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring" onClick={() => onChoose(e)}>
        <strong className="mr-2 font-mono">{e.code}</strong>{e.name}<small className="ml-2 text-muted-foreground">{e.reviewState === 'APPROVED' ? 'Con aprobación registrada' : 'Pendiente'}</small>
      </button></li>)}{!result.data?.items.length && <li className="p-3 text-sm text-muted-foreground">No hay coincidencias en este lote.</li>}</ul>}
  </section>
}
