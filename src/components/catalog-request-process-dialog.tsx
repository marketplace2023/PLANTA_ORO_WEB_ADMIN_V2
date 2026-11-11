import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, X } from 'lucide-react'
import { toast } from 'sonner'
import { api, ApiError } from '@/lib/api'
import { errorMessage, selectClass } from '@/lib/forms'
import { useTypes, useUploadModelImage, useRemoveModelImage, type Family } from '@/features/catalog/use-catalog'
import type { CatalogSubmission } from './catalog-request-sheet'
import { FamilySpecificationFields } from './family-specification-fields'
import { ModelImagePicker, type ImageChange } from './model-image-picker'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { Label } from './ui/label'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './ui/dialog'

export function CatalogRequestProcessDialog({ request, family, onClose }: { request: CatalogSubmission; family?: Family; onClose: () => void }) {
  const client = useQueryClient()
  const types = useTypes(), upload = useUploadModelImage(), removeImage = useRemoveModelImage()
  const [typeSelection, setTypeSelection] = useState<string>()
  const typeCode = typeSelection ?? types.data?.find(t => t.id === request.reviewedModel?.assetTypeId)?.code ?? ''
  const [modelId, setModelId] = useState(request.modelId)
  const [name, setName] = useState(request.reviewedModel?.modelName ?? request.draft.name)
  const [specifications, setSpecifications] = useState<Record<string, unknown>>(() => structuredClone(request.reviewedModel?.specifications ?? request.draft.specifications ?? {}))
  const [components, setComponents] = useState((request.reviewedModel?.technicalData.componentes ?? request.draft.components ?? []).join('\n'))
  const [note, setNote] = useState('')
  const [image, setImage] = useState<ImageChange>({ file: null, remove: false })
  const [dirty, setDirty] = useState(!request.modelId)
  const [error, setError] = useState<string | null>(null)
  const action = useMutation({ mutationFn: async (kind: 'save' | 'approve' | 'reject') => {
    setError(null)
    if (kind === 'save') {
      const row = await api<CatalogSubmission>(`/catalog/requests/${request.id}`, { method: 'PATCH', body: JSON.stringify({ typeCode, modelName: name, specifications, components: components.split('\n').map(c => c.trim()).filter(Boolean) }) })
      setModelId(row.modelId)
      if (image.file && row.modelId) await upload.mutateAsync({ id: row.modelId, file: image.file })
      else if (image.remove && row.modelId) await removeImage.mutateAsync(row.modelId)
      await client.invalidateQueries({ queryKey: ['catalog'] })
      setDirty(false); setImage({ file: null, remove: false })
      toast.success('Ficha de catálogo guardada para revisión')
    } else {
      if (kind === 'reject' && !note.trim()) throw new Error('Indica el motivo del rechazo')
      await api(`/catalog/requests/${request.id}/${kind}`, { method: 'POST', body: JSON.stringify({ note }) })
      await client.invalidateQueries({ queryKey: ['catalog'] })
      toast.success(kind === 'approve' ? 'Solicitud aprobada: modelo publicado y activo registrado en la planta' : 'Solicitud rechazada')
      onClose()
    }
  }, onError: e => setError(e instanceof ApiError ? errorMessage(e) : e instanceof Error ? e.message : 'No se pudo completar la acción') })

  return <Dialog open onOpenChange={open => !open && !action.isPending && onClose()}>
    <DialogContent showCloseButton={false} className="flex max-h-[92dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
      <header className="flex shrink-0 items-start justify-between gap-4 border-b p-5 sm:px-6">
        <div className="min-w-0 space-y-2"><DialogTitle className="text-xl font-semibold">Procesar solicitud</DialogTitle><DialogDescription className="[overflow-wrap:anywhere]">{request.draft.name}</DialogDescription></div>
        <Button variant="ghost" size="icon-sm" disabled={action.isPending} aria-label="Cerrar procesamiento" onClick={onClose}><X /></Button>
      </header>
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain p-5 sm:p-6">
        <dl className="grid gap-4 rounded-lg bg-muted/40 p-4 text-sm sm:grid-cols-2">
          <div><dt className="text-xs text-muted-foreground">Planta solicitante</dt><dd className="mt-1 font-semibold [overflow-wrap:anywhere]">{request.plantName}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Familia</dt><dd className="mt-1 font-semibold [overflow-wrap:anywhere]">{family?.name ?? request.draft.familyId}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Etapa</dt><dd className="mt-1 font-medium">{request.draft.stageCode}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Red transversal</dt><dd className="mt-1 font-medium [overflow-wrap:anywhere]">{request.draft.networkCodes.join(', ')}</dd></div>
        </dl>
        <section className="space-y-2 border-l-2 border-fur-gold-500 pl-4"><h3 className="text-sm font-semibold">Nota de la solicitud</h3><p className="whitespace-pre-wrap text-sm leading-relaxed [overflow-wrap:anywhere]">{request.draft.requestNote || 'La planta no incluyó una nota.'}</p></section>
        <section className="space-y-5" aria-label="Ficha del modelo de catálogo">
          <div><h3 className="font-semibold">Ficha del modelo de catálogo</h3><p className="mt-1 text-xs text-muted-foreground">Completa y guarda el modelo antes de aprobar. La ficha original de planta se conserva.</p></div>
          <fieldset disabled={action.isPending} className="min-w-0 space-y-5">
            <div className="space-y-2"><Label htmlFor="request-type">Tipo de activo</Label><select id="request-type" className={selectClass} value={typeCode} disabled={types.isPending || types.isError} onChange={e => { setTypeSelection(e.target.value); setDirty(true) }}><option value="">Selecciona un tipo de esta familia</option>{types.data?.filter(t => t.familyCode === family?.code).map(t => <option key={t.id} value={t.code}>{t.name}</option>)}</select><p className="text-xs text-muted-foreground">Al aprobar, el tipo se asociará automáticamente a la etapa solicitada. Si el tipo no existe, créalo en la pestaña Tipos.</p>{types.isError && <Button variant="outline" onClick={() => void types.refetch()}>Reintentar carga de tipos</Button>}</div>
            <div className="space-y-2"><Label htmlFor="request-name">Nombre del modelo</Label><Input id="request-name" value={name} maxLength={200} onChange={e => { setName(e.target.value); setDirty(true) }} /></div>
            <FamilySpecificationFields familyId={request.draft.familyId} value={specifications} onChange={value => { setSpecifications(value); setDirty(true) }} />
            <div className="space-y-2"><Label htmlFor="request-components">Componentes del modelo (uno por línea)</Label><Textarea id="request-components" value={components} onChange={e => { setComponents(e.target.value); setDirty(true) }} /></div>
            <ModelImagePicker currentUrl={request.reviewedModel?.imageUrl ?? null} value={image} onChange={value => { setImage(value); setDirty(true) }} />
          </fieldset>
          <Button variant="outline" disabled={action.isPending || !typeCode || !name.trim()} onClick={() => action.mutate('save')}>{action.isPending && action.variables === 'save' ? 'Guardando ficha…' : 'Guardar ficha de catálogo'}</Button>
        </section>
        <section className="space-y-3 border-t pt-5" aria-label="Decisión de la solicitud"><h3 className="font-semibold">Decisión</h3><div className="space-y-2"><Label htmlFor="request-note">Comentario de la decisión (obligatorio al rechazar)</Label><Textarea id="request-note" value={note} maxLength={2000} disabled={action.isPending} onChange={e => setNote(e.target.value)} placeholder="Explica la decisión para que la planta pueda consultarla." /></div></section>
      </div>
      <footer className="shrink-0 space-y-3 border-t bg-muted/30 p-4 sm:px-6">
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {dirty && <p className="text-xs text-muted-foreground">Guarda la ficha antes de aprobar. Puedes rechazar sin guardar el modelo.</p>}
        <div className="flex flex-wrap justify-end gap-2"><Button variant="outline" disabled={action.isPending} onClick={onClose}>Cerrar</Button><Button variant="outline" className="text-destructive" disabled={action.isPending} onClick={() => action.mutate('reject')}>Rechazar solicitud</Button><Button disabled={action.isPending || !modelId || dirty} onClick={() => action.mutate('approve')}><Check className="size-4" />Aprobar y registrar activo</Button></div>
      </footer>
    </DialogContent>
  </Dialog>
}
