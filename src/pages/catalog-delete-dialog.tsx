import { CheckCircle2, LoaderCircle, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useApplyCatalogDelete, usePreviewCatalogDelete, type CatalogDeletePreview, type CatalogDeleteResult } from '@/features/catalog/use-catalog'
import { errorMessage } from '@/lib/forms'

export function CatalogDeleteDialog({ onClose, onDeleted }: { onClose: () => void; onDeleted: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<CatalogDeletePreview | null>(null)
  const [result, setResult] = useState<CatalogDeleteResult | null>(null)
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const analyze = usePreviewCatalogDelete()
  const remove = useApplyCatalogDelete()
  const busy = analyze.isPending || remove.isPending
  const canDelete = !!preview && preview.issues.length === 0 && preview.summary.blocked === 0 && preview.summary.deletable > 0

  async function inspect() {
    if (!file) return
    setPreview(null); setConfirm(''); setError(null)
    try { setPreview(await analyze.mutateAsync(file)) }
    catch (e) { setError(errorMessage(e) ?? 'No se pudo analizar el Excel') }
  }
  async function save() {
    if (!file || !preview || !canDelete || confirm !== 'ELIMINAR') return
    setError(null)
    try {
      const saved = await remove.mutateAsync({ file, fingerprint: preview.fingerprint, confirm })
      setResult(saved); setPreview(null); setConfirm('')
      toast.success(`Modelos eliminados: ${saved.deleted}`)
      onDeleted()
    } catch (e) { setPreview(null); setConfirm(''); setError(errorMessage(e) ?? 'No se pudo eliminar el listado. Vuelve a analizar el archivo.') }
  }

  return (
    <Dialog open onOpenChange={open => { if (!open && !busy) onClose() }}>
      <DialogContent className="sm:max-w-5xl" showCloseButton={!busy}>
        <div>
          <DialogTitle className="flex items-center gap-2 text-lg"><Trash2 className="size-5" /> Eliminar modelos por Excel</DialogTitle>
          <DialogDescription className="mt-1">Busca por TAG ACTIVO en la hoja Listado maestro del mismo Excel que usas para importar. Revisa las coincidencias antes de confirmar.</DialogDescription>
        </div>
        {result ? (
          <div role="status" className="space-y-2 py-4">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-fur-green-600"><CheckCircle2 /> Eliminación completada</h2>
            <p>Modelos eliminados: {result.deleted}. TAG no encontrados: {result.summary.missing}.</p>
            {result.summary.unlinkedListings > 0 && <p>Publicaciones del marketplace desvinculadas: {result.summary.unlinkedListings}.</p>}
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">Solo se usa la columna TAG ACTIVO. La eliminación afecta a los modelos encontrados y sus fichas, fotos y asignaciones de etapas y redes. Un modelo en uso por activos de planta o inventario bloquea todo el listado.</p>
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-0 flex-1">
                <label htmlFor="catalog-delete-file" className="mb-1 block text-sm font-medium">Archivo Excel para eliminar (.xlsx, máximo 5 MB)</label>
                <Input id="catalog-delete-file" type="file" accept=".xlsx" disabled={busy} onChange={e => {
                  const selected = e.target.files?.[0] ?? null
                  setPreview(null); setConfirm(''); setError(null)
                  if (selected && (!selected.name.toLowerCase().endsWith('.xlsx') || selected.size > 5 * 1024 * 1024)) {
                    setFile(null); setError('Selecciona un archivo .xlsx de hasta 5 MB')
                  } else setFile(selected)
                }} />
              </div>
              <Button variant="outline" disabled={!file || busy} onClick={() => void inspect()}>
                {analyze.isPending && <LoaderCircle className="animate-spin" />} {analyze.isPending ? 'Analizando…' : 'Analizar eliminación'}
              </Button>
            </div>
            {preview && (
              <>
                <p role="status" className="text-sm">TAG del archivo: {preview.summary.listed} · Por eliminar: {preview.summary.deletable} · No encontrados: {preview.summary.missing} · Bloqueados: {preview.summary.blocked}</p>
                {preview.issues.length > 0 && <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  <p className="font-semibold">Corrige los errores del listado antes de eliminar.</p>
                  <ul className="mt-2 max-h-40 list-disc overflow-y-auto pl-5">{preview.issues.map((issue, i) => <li key={i}>{issue.sheet}, fila {issue.row}: {issue.message}</li>)}</ul>
                </div>}
                {preview.summary.blocked > 0 && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">Hay modelos en uso. Desvincúlalos de los activos de planta o del inventario antes de eliminar este listado. No se eliminará ningún modelo mientras existan bloqueos.</p>}
                {preview.summary.found === 0 && <p className="text-sm text-muted-foreground">Ningún TAG del archivo coincide con un modelo del catálogo.</p>}
                {preview.summary.unlinkedListings > 0 && <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Publicaciones del marketplace que quedarán sin modelo: {preview.summary.unlinkedListings}.</p>}
                <div className="max-h-72 overflow-auto rounded-md border border-border">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-muted"><tr>{['TAG / fila', 'Modelo / familia', 'Resultado', 'Uso'].map(title => <th className="px-3 py-2" key={title}>{title}</th>)}</tr></thead>
                    <tbody>{preview.rows.map(row => <tr key={row.tag} className="border-t border-border align-top">
                      <td className="px-3 py-2"><span className="fur-code">{row.tag}</span><p className="text-muted-foreground">Fila {row.row}</p></td>
                      <td className="px-3 py-2"><p className="font-medium">{row.modelName ?? '—'}</p><p className="text-muted-foreground">{[row.family, row.type].filter(Boolean).join(' · ')}</p></td>
                      <td className="px-3 py-2">{row.state === 'DELETE' ? 'Se eliminará' : row.state === 'BLOCKED' ? 'Bloqueado' : 'No encontrado'}</td>
                      <td className="px-3 py-2">Activos de planta: {row.assets} · Ítems de inventario: {row.inventoryItems}{row.listings > 0 && ` · Publicaciones: ${row.listings}`}</td>
                    </tr>)}</tbody>
                  </table>
                </div>
                {canDelete && <div className="space-y-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  <p>Esta acción elimina definitivamente {preview.summary.deletable} modelos del catálogo.</p>
                  <label htmlFor="catalog-delete-confirm" className="block font-medium">Escribe ELIMINAR para confirmar</label>
                  <Input id="catalog-delete-confirm" value={confirm} disabled={busy} autoComplete="off" onChange={e => setConfirm(e.target.value)} />
                </div>}
              </>
            )}
          </>
        )}
        {error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        <div className="flex justify-end gap-2 border-t border-border pt-3">
          <Button variant="outline" disabled={busy} onClick={onClose}>{result ? 'Cerrar' : 'Cancelar'}</Button>
          {!result && <Button variant="destructive" disabled={!canDelete || confirm !== 'ELIMINAR' || busy} onClick={() => void save()}>
            {remove.isPending ? <LoaderCircle className="animate-spin" /> : <Trash2 />} {remove.isPending ? 'Eliminando…' : 'Eliminar modelos'}
          </Button>}
        </div>
      </DialogContent>
    </Dialog>
  )
}
