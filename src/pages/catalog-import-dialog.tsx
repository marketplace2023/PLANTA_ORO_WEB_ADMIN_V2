import { CheckCircle2, FileSpreadsheet, LoaderCircle } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { CheckGroup } from '@/components/check-group'
import { useApplyCatalogImport, usePreviewCatalogImport, useNetworkMasters, type CatalogImportPreview, type CatalogImportResult } from '@/features/catalog/use-catalog'
import { errorMessage } from '@/lib/forms'

export function CatalogImportDialog({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<CatalogImportPreview | null>(null)
  const [result, setResult] = useState<CatalogImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [networkCodes, setNetworkCodes] = useState<string[]>([])
  const [allowMissingSpecifications, setAllowMissingSpecifications] = useState(false)
  const networks = useNetworkMasters()
  const analyze = usePreviewCatalogImport()
  const apply = useApplyCatalogImport()
  const busy = analyze.isPending || apply.isPending
  const validNetworks = networks.isSuccess && networkCodes.length > 0 && networkCodes.every(code => networks.data.some(n => n.code === code))
  const missingSpecifications = preview?.issues.filter(i => i.code === 'MISSING_SPECIFICATIONS') ?? []
  const otherIssues = preview?.issues.filter(i => i.code !== 'MISSING_SPECIFICATIONS') ?? []
  const canImport = !!preview && otherIssues.length === 0 && (missingSpecifications.length === 0 || allowMissingSpecifications)
  async function inspect() {
    if (!file || !validNetworks) return
    setPreview(null)
    setAllowMissingSpecifications(false)
    setError(null)
    try { setPreview(await analyze.mutateAsync({ file, networkCodes })) }
    catch (e) { setError(errorMessage(e) ?? 'No se pudo analizar el Excel') }
  }
  async function save() {
    if (!file || !preview || !canImport || !validNetworks) return
    setError(null)
    try {
      const saved = await apply.mutateAsync({ file, fingerprint: preview.fingerprint, networkCodes, allowMissingSpecifications })
      setResult(saved)
      setPreview(null)
      toast.success(`${saved.imported} modelos importados al catálogo`)
      onImported()
    } catch (e) { setError(errorMessage(e) ?? 'No se pudo importar el Excel') }
  }
  return (
    <Dialog open onOpenChange={open => { if (!open && !busy) onClose() }}>
      <DialogContent className="sm:max-w-6xl" showCloseButton={!busy}>
        <div>
          <DialogTitle className="flex items-center gap-2 text-lg"><FileSpreadsheet className="size-5" /> Importar catálogo desde Excel</DialogTitle>
          <DialogDescription className="mt-1">Carga modelos del catálogo global desde el listado maestro. Repetir un TAG actualiza su modelo.</DialogDescription>
        </div>
        {result ? (
          <div role="status" className="space-y-3 py-4">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-fur-green-600"><CheckCircle2 /> Importación completada</h2>
            <p>{result.summary.models.create} modelos creados y {result.summary.models.update} actualizados. {result.summary.specifications} especificaciones asignadas por TAG.</p>
            <p>Redes asignadas a los modelos: {result.networks.map(n => n.name).join(' · ')}.</p>
            {result.issues.some(i => i.code === 'MISSING_SPECIFICATIONS') && <p>{result.issues.filter(i => i.code === 'MISSING_SPECIFICATIONS').length} modelos importados con especificaciones técnicas vacías.</p>}
            {result.summary.manufacturers.merged > 0 && <p>{result.summary.manufacturers.merged} variantes de fabricantes unificadas.</p>}
            <p className="text-sm text-muted-foreground">Los modelos ya están disponibles en el catálogo y sus fichas.</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">Hojas requeridas: Listado maestro, Categorías N4, Características y Especificaciones. Las familias se unifican por Código CA. Sin carga de fotos ni parámetros técnicos.</p>
            {networks.isLoading ? <p role="status" className="text-sm text-muted-foreground">Cargando redes transversales…</p> : networks.isError ? (
              <div role="alert" className="flex items-center gap-3 text-sm text-red-800">
                <span>No se pudieron cargar las redes transversales.</span>
                <Button variant="outline" size="sm" disabled={busy} onClick={() => void networks.refetch()}>Reintentar</Button>
              </div>
            ) : (
              <fieldset disabled={busy} className="min-w-0">
                <CheckGroup legend="Redes transversales de los modelos" options={(networks.data ?? []).map(n => ({ value: n.code, label: n.name }))} value={networkCodes} onChange={codes => {
                  setNetworkCodes(codes); setPreview(null); setAllowMissingSpecifications(false); setError(null)
                }} help="Selecciona al menos una red. Se aplicarán a todos los modelos del archivo y reemplazarán sus redes anteriores al actualizar. Las redes de otros modelos se conservan." />
                {networks.data?.length === 0 && <p className="mt-2 text-sm text-muted-foreground">Primero crea una red en Etapas y redes.</p>}
              </fieldset>
            )}
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-0 flex-1">
                <label htmlFor="catalog-master-file" className="mb-1 block text-sm font-medium">Archivo Excel (.xlsx, máximo 5 MB)</label>
                <Input id="catalog-master-file" type="file" accept=".xlsx" disabled={busy} onChange={e => {
                  const selected = e.target.files?.[0] ?? null
                  setPreview(null); setAllowMissingSpecifications(false); setError(null)
                  if (selected && (!selected.name.toLowerCase().endsWith('.xlsx') || selected.size > 5 * 1024 * 1024)) {
                    setFile(null); setError('Selecciona un archivo .xlsx de hasta 5 MB')
                  } else setFile(selected)
                }} />
              </div>
              <Button variant="outline" disabled={!file || !validNetworks || busy} onClick={() => void inspect()}>
                {analyze.isPending && <LoaderCircle className="animate-spin" />} {analyze.isPending ? 'Analizando…' : 'Analizar Excel'}
              </Button>
            </div>
            {preview && (
              <>
                <p className="text-sm font-medium">Redes de destino: {preview.networks.map(n => `${n.name} (${n.code})`).join(' · ')}.</p>
                {otherIssues.length > 0 ? (
                  <div role="alert" className="max-h-48 overflow-y-auto rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                    <p className="mb-2 font-semibold">Corrige {otherIssues.length} errores antes de importar. No se ha guardado ningún cambio.</p>
                    <ul className="list-disc space-y-1 pl-5">{otherIssues.map((i, n) => <li key={n}>{i.sheet}, fila {i.row}: {i.message}</li>)}</ul>
                  </div>
                ) : missingSpecifications.length === 0 && <p role="status" className="text-sm font-medium text-fur-green-600">Archivo válido: {preview.rows.length} modelos y {preview.summary.specifications} especificaciones.</p>}
                {missingSpecifications.length > 0 && (
                  <div className="space-y-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    <p className="font-semibold">{missingSpecifications.length} modelos sin especificaciones técnicas</p>
                    <ul className="max-h-40 list-disc space-y-1 overflow-y-auto pl-5">{missingSpecifications.map((i, n) => <li key={n}>{i.sheet}, fila {i.row}: {i.message}</li>)}</ul>
                    <label className="flex items-start gap-2 font-medium">
                      <input type="checkbox" className="mt-0.5 size-4 shrink-0 accent-[var(--fur-navy-900)]" disabled={busy} checked={allowMissingSpecifications} onChange={e => { setAllowMissingSpecifications(e.target.checked); setError(null) }} />
                      Importar también los modelos sin especificaciones técnicas
                    </label>
                    <p>Estos modelos se guardarán con las especificaciones vacías, incluso si tenían datos anteriores. Podrás completarlas después.</p>
                  </div>
                )}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead><tr className="border-b"><th className="py-2">Registros</th><th>Crear</th><th>Actualizar</th></tr></thead>
                    <tbody>{([['Modelos', preview.summary.models], ['Familias', preview.summary.families], ['Tipos', preview.summary.types], ['Fabricantes', preview.summary.manufacturers]] as const).map(([name, count]) => (
                      <tr key={name} className="border-b border-border/50"><th className="py-1.5 font-normal">{name}</th><td>{count.create}</td><td>{count.update}</td></tr>
                    ))}</tbody>
                  </table>
                </div>
                <p className="text-xs text-muted-foreground">Los fabricantes usan solo el nombre fuera de paréntesis. {preview.summary.manufacturers.merged > 0 ? `Se unificarán ${preview.summary.manufacturers.merged} variantes existentes conservando sus modelos y activos asociados.` : 'Las notas entre paréntesis no crean fabricantes diferentes.'}</p>
                <p className="text-xs text-muted-foreground">Las especificaciones, los componentes y las redes de los TAG del archivo se reemplazan con lo revisado aquí. Las fotos existentes se conservan.</p>
                <div className="max-h-64 overflow-auto rounded-md border border-border">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-muted"><tr>{['TAG / modelo', 'Familia / tipo', 'Fabricante', 'Etapa', 'Acción'].map(h => <th className="px-3 py-2" key={h}>{h}</th>)}</tr></thead>
                    <tbody>{preview.rows.map(r => (
                      <tr key={r.tag} className="border-t border-border align-top">
                        <td className="min-w-60 px-3 py-2"><span className="fur-code">{r.tag}</span><p className="mt-1 font-medium">{r.name}</p>
                          <details className="mt-2"><summary className="cursor-pointer text-fur-navy-700">Ver componente y {Object.keys(r.specifications).length} especificaciones</summary>
                            <p className="my-2 whitespace-pre-wrap">{r.components[0] ?? 'Sin componente informado'}</p>
                            <dl className="space-y-1">{Object.entries(r.specifications).map(([k, v]) => <div key={k}><dt className="font-medium">{k}</dt><dd>{v}</dd></div>)}</dl>
                          </details>
                        </td>
                        <td className="min-w-48 px-3 py-2"><p className="font-medium">{r.family}</p><p className="mt-1 text-muted-foreground">{r.type}</p></td>
                        <td className="px-3 py-2">{r.manufacturer}</td><td className="px-3 py-2">{r.stages.join(', ')}</td><td className="px-3 py-2">{r.action === 'create' ? 'Crear' : 'Actualizar'}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}
        {error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        <div className="flex justify-end gap-2 border-t border-border pt-3">
          <Button variant="outline" disabled={busy} onClick={onClose}>{result ? 'Cerrar' : 'Cancelar'}</Button>
          {!result && <Button disabled={!canImport || !validNetworks || busy} onClick={() => void save()}>
            {apply.isPending && <LoaderCircle className="animate-spin" />} {apply.isPending ? 'Importando…' : 'Importar al catálogo'}
          </Button>}
        </div>
      </DialogContent>
    </Dialog>
  )
}
