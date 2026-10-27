import { CheckCircle2, Download, FileSpreadsheet, LoaderCircle } from 'lucide-react'
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
          <DialogDescription className="mt-1">Carga modelos del catálogo global desde el listado maestro. Los TAG existentes bloquean la carga: se mostrarán sus redes actuales y no se sobrescribirán sus datos.</DialogDescription>
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
            <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border bg-muted/40 p-4">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-sm font-medium">Prepara tu archivo con la plantilla</p>
                <p className="text-sm text-muted-foreground">Incluye instrucciones, las hojas de datos, fabricantes de referencia, las familias del listado original y filas de activos vacías. Conserva los nombres de las hojas y sus encabezados.</p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <a href={`${import.meta.env.BASE_URL}templates/plantilla-importacion-catalogo.xlsx`} download="plantilla-importacion-catalogo.xlsx"><Download /> Descargar plantilla Excel</a>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">Completa Listado maestro y repite el mismo TAG ACTIVO en las otras hojas: una fila por componente en Características, una por parámetro en Especificaciones y una por fabricante en Fabricantes de referencia. Si no hay componentes o referencias, omite sus filas. Si faltan especificaciones, podrás aceptarlo después del análisis. Las familias se unifican por Código CA y su nombre en Categorías N4. Las redes se eligen aquí.</p>
            {networks.isLoading ? <p role="status" className="text-sm text-muted-foreground">Cargando redes transversales…</p> : networks.isError ? (
              <div role="alert" className="flex items-center gap-3 text-sm text-red-800">
                <span>No se pudieron cargar las redes transversales.</span>
                <Button variant="outline" size="sm" disabled={busy} onClick={() => void networks.refetch()}>Reintentar</Button>
              </div>
            ) : (
              <fieldset disabled={busy} className="min-w-0">
                <CheckGroup legend="Redes transversales de los modelos" options={(networks.data ?? []).map(n => ({ value: n.code, label: n.name }))} value={networkCodes} onChange={codes => {
                  setNetworkCodes(codes); setPreview(null); setAllowMissingSpecifications(false); setError(null)
                }} help="Selecciona al menos una red. Se aplicarán a los modelos importados. Un TAG existente no puede importarse, aunque elijas otra red." />
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
                    <p>Estos modelos se guardarán con las especificaciones vacías. Podrás completarlas después. Esta opción no permite importar TAG existentes.</p>
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
                <p className="text-xs text-muted-foreground">Si algún TAG ya existe en el catálogo, se bloquea toda la carga sin guardar cambios. Retira esas filas y sus detalles del Excel y vuelve a analizar.</p>
                <p className="text-xs text-muted-foreground">Cada TAG nuevo recibirá las especificaciones, los componentes y los fabricantes de referencia revisados aquí.</p>
                <div className="max-h-64 overflow-auto rounded-md border border-border">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-muted"><tr>{['TAG / modelo', 'Familia / tipo', 'Fabricante', 'Etapa', 'Acción'].map(h => <th className="px-3 py-2" key={h}>{h}</th>)}</tr></thead>
                    <tbody>{preview.rows.map(r => (
                      <tr key={r.tag} className="border-t border-border align-top">
                        <td className="min-w-60 px-3 py-2"><span className="fur-code">{r.tag}</span><p className="mt-1 font-medium">{r.name}</p>
                          <details className="mt-2"><summary className="cursor-pointer text-fur-navy-700">Ver componentes, especificaciones y fabricantes</summary>
                            <p className="mt-3 mb-1 font-medium">Componentes principales</p>
                            {r.components.length > 0 ? <ol className="mb-3 list-decimal space-y-1 pl-5">{r.components.map((component, i) => <li key={i} className="whitespace-pre-wrap">{component}</li>)}</ol> : <p className="mb-3">Sin componentes informados</p>}
                            <p className="mb-1 font-medium">Especificaciones técnicas</p>
                            <dl className="space-y-1">{Object.entries(r.specifications).map(([k, v]) => <div key={k}><dt className="font-medium">{k}</dt><dd>{v}</dd></div>)}</dl>
                            <p className="mt-3 mb-1 font-medium">Fabricantes de referencia y web</p>
                            {r.referenceManufacturers == null ? <p>El archivo no incluye la hoja de fabricantes de referencia.</p> : r.referenceManufacturers.length === 0 ? <p>Sin fabricantes de referencia informados.</p> : (
                              <ul className="list-disc space-y-2 pl-5">{r.referenceManufacturers.map((m, i) => <li key={i}><p className="font-medium">{m.nombre}</p>{m.alcance && <p className="whitespace-pre-wrap">{m.alcance}</p>}{m.sitioWeb && <p className="break-all">{m.sitioWeb}</p>}</li>)}</ul>
                            )}
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
