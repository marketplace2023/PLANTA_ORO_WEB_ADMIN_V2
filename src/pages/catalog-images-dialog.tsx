import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, ImagePlus, LoaderCircle, Trash2, UploadCloud } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { usePreviewCatalogImages, useUploadCatalogImage, type CatalogImageRow } from '@/features/catalog/use-catalog'
import { ApiError, apiUrl } from '@/lib/api'
import { errorMessage } from '@/lib/forms'
import { MODEL_IMAGE_TYPES, validateModelImage } from '@/lib/model-image'

const MAX_FILES = 500
type Result = { state: 'UPLOADING' | 'UPLOADED' | 'ERROR' | 'STALE'; message: string }

function ImageThumbnail({ file }: { file: File }) {
  const image = useRef<HTMLImageElement>(null)
  const valid = !validateModelImage(file)
  useEffect(() => {
    if (!valid || !image.current) return
    const objectUrl = URL.createObjectURL(file)
    image.current.src = objectUrl
    return () => URL.revokeObjectURL(objectUrl)
  }, [file, valid])
  return valid ? <img ref={image} alt={`Vista previa de ${file.name}`} loading="lazy" className="h-14 w-20 shrink-0 rounded-md border object-contain" /> : <ImagePlus className="m-3 size-6 text-muted-foreground" aria-hidden />
}

export function CatalogImagesDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const preview = usePreviewCatalogImages()
  const upload = useUploadCatalogImage()
  const input = useRef<HTMLInputElement>(null)
  const stop = useRef(false)
  const [files, setFiles] = useState<File[]>([])
  const [rows, setRows] = useState<CatalogImageRow[] | null>(null)
  const [results, setResults] = useState<Record<number, Result>>({})
  const [replaceExisting, setReplaceExisting] = useState(false)
  const [phase, setPhase] = useState<'idle' | 'analyzing' | 'uploading'>('idle')
  const [dragging, setDragging] = useState(false)
  const [stopping, setStopping] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const busy = phase !== 'idle'
  const eligible = (row: CatalogImageRow) => !validateModelImage(files[row.index]) &&
    (row.state === 'READY' || (row.state === 'EXISTING' && replaceExisting)) &&
    !['UPLOADED', 'STALE'].includes(results[row.index]?.state)
  const pending = rows?.filter(eligible) ?? []
  const uploaded = Object.values(results).filter(result => result.state === 'UPLOADED').length
  const failed = Object.values(results).filter(result => result.state === 'ERROR' || result.state === 'STALE').length

  function changeFiles(next: File[]) {
    if (busy) return
    if (next.length > MAX_FILES) { setError(`Puedes cargar hasta ${MAX_FILES} imágenes por lote.`); return }
    setFiles(next); setRows(null); setResults({}); setError(null)
  }

  async function analyze() {
    setPhase('analyzing'); setError(null); setRows(null); setResults({})
    try { setRows((await preview.mutateAsync(files)).rows) }
    catch (e) { setError(errorMessage(e)) }
    finally { setPhase('idle') }
  }

  async function save() {
    stop.current = false; setStopping(false); setPhase('uploading'); setError(null)
    let changed = false
    try {
      for (const row of pending) {
        if (stop.current) break
        setResults(previous => ({ ...previous, [row.index]: { state: 'UPLOADING', message: 'Subiendo…' } }))
        try {
          await upload.mutateAsync({ file: files[row.index], row, replaceExisting })
          changed = true
          setResults(previous => ({ ...previous, [row.index]: { state: 'UPLOADED', message: 'Imagen adjuntada' } }))
        } catch (e) {
          setResults(previous => ({ ...previous, [row.index]: {
            state: e instanceof ApiError && [404, 409].includes(e.status) ? 'STALE' : 'ERROR',
            message: errorMessage(e) ?? 'No se pudo subir la imagen.',
          } }))
          // Una sesión perdida no debe generar cientos de solicitudes fallidas.
          if (e instanceof ApiError && [401, 403].includes(e.status)) { setError('La sesión no permite continuar. Revisa tu acceso antes de reintentar.'); break }
        }
      }
    } finally {
      if (changed) void qc.invalidateQueries({ queryKey: ['catalog'] })
      setPhase('idle'); setStopping(false)
    }
  }

  return (
    <Dialog open onOpenChange={open => !open && !busy && onClose()}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-5xl" showCloseButton={!busy}
        onEscapeKeyDown={e => { if (busy) e.preventDefault() }} onInteractOutside={e => { if (busy) e.preventDefault() }}>
        <DialogHeader>
          <DialogTitle>Cargar imágenes por TAG</DialogTitle>
          <DialogDescription>Adjunta fotos a los modelos del catálogo usando el nombre de cada archivo. Ejemplo: CAND-12-02.jpg corresponde al TAG CAND-12-02.</DialogDescription>
        </DialogHeader>

        <div className={`rounded-xl border-2 border-dashed p-6 text-center transition-colors ${dragging ? 'border-fur-navy-700 bg-fur-gray-100' : 'border-border bg-fur-gray-50'}`}
          onDragOver={e => { e.preventDefault(); if (!busy) setDragging(true) }}
          onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false) }}
          onDrop={e => { e.preventDefault(); setDragging(false); if (!busy) changeFiles([...files, ...Array.from(e.dataTransfer.files)]) }}>
          <UploadCloud className="mx-auto mb-3 size-8 text-fur-navy-700" aria-hidden />
          <p className="font-semibold">Arrastra aquí las imágenes de tus activos</p>
          <p className="mt-1 text-xs text-muted-foreground">PNG, JPG o WebP, hasta 5 MB por imagen y 500 imágenes por lote. Se ignoran mayúsculas y minúsculas al comparar el TAG.</p>
          <input ref={input} type="file" multiple accept={MODEL_IMAGE_TYPES.join(',')} aria-label="Seleccionar imágenes por TAG" className="sr-only" disabled={busy}
            onChange={e => { changeFiles([...files, ...Array.from(e.target.files ?? [])]); e.target.value = '' }} />
          <Button className="mt-4" type="button" variant="outline" disabled={busy} onClick={() => input.current?.click()}><ImagePlus /> Seleccionar imágenes</Button>
        </div>

        {files.length > 0 && <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium">{files.length} archivos seleccionados</p>
            <div className="flex gap-2"><Button variant="outline" disabled={busy} onClick={() => changeFiles([])}>Vaciar lista</Button>
              <Button variant="secondary" disabled={busy} onClick={() => void analyze()}>{phase === 'analyzing' && <LoaderCircle className="animate-spin" />} Analizar coincidencias</Button></div>
          </div>
          {rows && <label className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <input type="checkbox" className="mt-0.5 size-4 accent-[var(--fur-navy-900)]" checked={replaceExisting} disabled={busy} onChange={e => setReplaceExisting(e.target.checked)} />
            <span><strong>Reemplazar imágenes existentes</strong><span className="mt-1 block text-xs">Por defecto se conservan las fotos actuales. Esta opción permite sustituirlas con los archivos seleccionados.</span></span>
          </label>}
          <div className="max-h-[42svh] overflow-auto rounded-lg border border-border">
            <table className="w-full min-w-[740px] text-left text-sm">
              <thead className="sticky top-0 bg-muted"><tr><th className="p-3">Imagen / archivo</th><th className="p-3">TAG / modelo</th><th className="p-3">Resultado</th><th className="p-3"><span className="sr-only">Acciones</span></th></tr></thead>
              <tbody>{files.map((file, index) => {
                const row = rows?.[index], result = results[index], problem = validateModelImage(file)
                return <tr key={`${index}:${file.name}`} className="border-t align-top">
                  <td className="p-3"><div className="flex items-center gap-3"><ImageThumbnail file={file} /><div className="min-w-44 max-w-60 break-all"><p>{file.name}</p><p className="mt-1 text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p></div></div></td>
                  <td className="p-3"><p className="fur-code text-xs">{row?.tag ?? 'Sin analizar'}</p><p className="mt-1 min-w-36">{row?.modelName}</p>
                    {row?.imageUrl && <a href={apiUrl(row.imageUrl)} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs underline">Ver imagen actual</a>}</td>
                  <td className={`min-w-48 p-3 text-xs ${problem || result?.state === 'ERROR' || result?.state === 'STALE' ? 'text-red-700' : result?.state === 'UPLOADED' ? 'text-green-700' : 'text-muted-foreground'}`}>
                    {result?.state === 'UPLOADING' && <LoaderCircle className="mb-1 size-4 animate-spin" aria-hidden />}
                    {result?.state === 'UPLOADED' && <CheckCircle2 className="mb-1 size-4" aria-hidden />}
                    {problem ?? result?.message ?? (row?.state === 'EXISTING' && replaceExisting ? 'Se reemplazará la imagen actual.' : row?.message ?? 'Pendiente de análisis')}
                  </td>
                  <td className="p-3"><Button type="button" variant="ghost" size="icon-sm" aria-label={`Quitar ${file.name}`} disabled={busy} onClick={() => changeFiles(files.filter((_, i) => i !== index))}><Trash2 /></Button></td>
                </tr>
              })}</tbody>
            </table>
          </div>
        </>}
        {rows && <p role="status" aria-live="polite" className="text-sm">{phase === 'uploading' ? 'Cargando imágenes. ' : ''}{uploaded} adjuntadas · {pending.length} pendientes de carga · {failed} con error · {rows.filter(row => validateModelImage(files[row.index]) || !['READY', 'EXISTING'].includes(row.state) || (row.state === 'EXISTING' && !replaceExisting)).length} omitidas.{failed > 0 && ' Puedes reintentar los fallos o volver a analizar si cambió el catálogo.'}</p>}
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        <DialogFooter>
          {phase === 'uploading' ? <Button variant="outline" disabled={stopping} onClick={() => { stop.current = true; setStopping(true) }}>{stopping ? 'Deteniendo al finalizar la imagen actual…' : 'Detener carga'}</Button> : <Button variant="outline" disabled={busy} onClick={onClose}>Cerrar</Button>}
          <Button disabled={busy || !pending.length} onClick={() => void save()}>{phase === 'uploading' && <LoaderCircle className="animate-spin" />} Adjuntar imágenes{pending.length > 0 && ` (${pending.length})`}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
