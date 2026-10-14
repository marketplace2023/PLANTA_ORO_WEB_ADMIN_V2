import { ImagePlus, Trash2, Undo2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { apiUrl } from '@/lib/api'
import { MODEL_IMAGE_TYPES, validateModelImage } from '@/lib/model-image'

const ACCEPT = MODEL_IMAGE_TYPES.join(',')

export type ImageChange = { file: File | null; remove: boolean }

/**
 * Selector de la foto de un modelo: muestra la actual (si la hay), permite elegir otra, ver cómo quedará y quitarla.
 * No sube nada: entrega el cambio a quien lo usa, que lo envía al guardar el modelo.
 */
export function ModelImagePicker({
  currentUrl,
  value,
  onChange,
  title = 'Foto del modelo',
  noun = 'foto',
  subject = 'modelo',
  wide = false,
}: {
  currentUrl: string | null
  value: ImageChange
  onChange: (v: ImageChange) => void
  /** Etiquetas: por defecto las de la foto de un modelo. */
  title?: string
  noun?: string
  subject?: string
  /** Vista previa grande y apaisada (para diagramas y layouts). */
  wide?: boolean
}) {
  const input = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)

  // La vista previa es un object URL: se libera al cambiar de archivo o al cerrar, para no acumular memoria.
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  const shown = preview ?? (value.remove || !currentUrl ? null : apiUrl(currentUrl))

  function pick(file: File | undefined) {
    if (!file) return
    const problem = validateModelImage(file)
    setError(problem)
    if (!problem) {
      setPreview(URL.createObjectURL(file))
      onChange({ file, remove: false })
    }
    if (input.current) input.current.value = ''
  }

  function discard() {
    setError(null)
    setPreview(null)
    onChange({ file: null, remove: !!currentUrl })
  }

  return (
    <div className="space-y-2 sm:col-span-2">
      <p className="text-sm font-medium">{title}</p>
      <div className="flex items-center gap-4 rounded-lg border border-dashed border-border bg-fur-gray-50 p-3">
        <div className={`grid shrink-0 place-items-center overflow-hidden rounded-md border border-border bg-white ${wide ? 'h-28 w-44' : 'size-24'}`}>
          {shown ? <img src={shown} alt={title} className="size-full object-contain" /> : <ImagePlus className="size-7 text-fur-gray-500" aria-hidden />}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-xs text-muted-foreground">
            {value.file ? `Se subirá «${value.file.name}» al guardar.` : value.remove ? `La ${noun} actual se quitará al guardar.` : currentUrl ? `${noun[0].toUpperCase()}${noun.slice(1)} actual de${subject === 'modelo' ? 'l' : ' la'} ${subject}.` : `${subject === 'modelo' ? 'Este' : 'Esta'} ${subject} aún no tiene ${noun}.`} PNG, JPG o WebP, hasta 5 MB.
          </p>
          <div className="flex flex-wrap gap-2">
            <input ref={input} type="file" accept={ACCEPT} className="sr-only" aria-label={`Elegir ${noun} de${subject === 'modelo' ? 'l' : ' la'} ${subject}`} onChange={(e) => pick(e.target.files?.[0])} />
            <Button type="button" size="xs" variant="secondary" onClick={() => input.current?.click()}>
              <ImagePlus /> {currentUrl || value.file ? `Cambiar ${noun}` : `Elegir ${noun}`}
            </Button>
            {(value.file || (currentUrl && !value.remove)) && (
              <Button type="button" size="xs" variant="outline" onClick={discard}>
                <Trash2 /> {value.file && currentUrl ? 'Descartar y quitar' : value.file ? 'Descartar' : `Quitar ${noun}`}
              </Button>
            )}
            {value.remove && currentUrl && (
              <Button type="button" size="xs" variant="outline" onClick={() => onChange({ file: null, remove: false })}>
                <Undo2 /> Conservar {noun} actual
              </Button>
            )}
          </div>
          {error && <p role="alert" className="text-xs text-fur-red-500">{error}</p>}
        </div>
      </div>
    </div>
  )
}
