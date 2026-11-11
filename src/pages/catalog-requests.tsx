import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { errorMessage, selectClass } from '@/lib/forms'
import { useFamilies, useTypes, useUploadModelImage, useRemoveModelImage } from '@/features/catalog/use-catalog'
import { FamilySpecificationFields } from '@/components/family-specification-fields'
import { ModelImagePicker, type ImageChange } from '@/components/model-image-picker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Panel, Loading, Failed, Empty } from '@/components/kit'

type Submission = { id: string; plantName: string; status: string; modelId: string | null; decisionNote: string | null; draft: { name: string; familyId: string; stageCode: string; networkCodes: string[]; serialNumber?: string; requestNote?: string; specifications: Record<string, unknown>; components: string[] }; reviewedModel: { modelName: string; assetTypeId: string; specifications: Record<string, unknown>; technicalData: { componentes?: string[] }; imageUrl: string | null } | null }
export function CatalogRequestsTab() {
  const client = useQueryClient()
  const query = useQuery({ queryKey: ['catalog', 'requests'], queryFn: () => api<Submission[]>('/catalog/requests') })
  const families = useFamilies(); const types = useTypes(); const upload = useUploadModelImage(); const removeImage = useRemoveModelImage()
  const [selected, setSelected] = useState<Submission | null>(null)
  const [typeCode, setTypeCode] = useState(''); const [name, setName] = useState('')
  const [specifications, setSpecifications] = useState<Record<string, unknown>>({})
  const [components, setComponents] = useState(''); const [note, setNote] = useState('')
  const [image, setImage] = useState<ImageChange>({ file: null, remove: false })
  const [dirty, setDirty] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const family = families.data?.find(f => f.id === selected?.draft.familyId)
  function select(row: Submission) {
    setSelected(row); setName(row.reviewedModel?.modelName ?? row.draft.name)
    setTypeCode(types.data?.find(t => t.id === row.reviewedModel?.assetTypeId)?.code ?? '')
    setSpecifications(row.reviewedModel?.specifications ?? row.draft.specifications ?? {})
    setComponents((row.reviewedModel?.technicalData.componentes ?? row.draft.components ?? []).join('\n'))
    setNote(''); setError(null); setImage({ file: null, remove: false }); setDirty(!row.modelId)
  }
  const action = useMutation({ mutationFn: async (kind: 'save' | 'approve' | 'reject') => {
    if (!selected) return
    setError(null)
    if (kind === 'save') {
      const row = await api<Submission>(`/catalog/requests/${selected.id}`, { method: 'PATCH', body: JSON.stringify({ typeCode, modelName: name, specifications, components: components.split('\n').map(c => c.trim()).filter(Boolean) }) })
      setSelected({ ...selected, modelId: row.modelId })
      if (image.file && row.modelId) await upload.mutateAsync({ id: row.modelId, file: image.file })
      else if (image.remove && row.modelId) await removeImage.mutateAsync(row.modelId)
      const refreshed = await query.refetch()
      setSelected(refreshed.data?.find(item => item.id === selected.id) ?? { ...selected, modelId: row.modelId })
      setDirty(false); setImage({ file: null, remove: false })
      toast.success('Ficha de catálogo guardada para revisión')
    } else {
      if (kind === 'reject' && !note.trim()) throw new Error('Indica el motivo del rechazo')
      await api(`/catalog/requests/${selected.id}/${kind}`, { method: 'POST', body: JSON.stringify({ note }) })
      toast.success(kind === 'approve' ? 'Solicitud aprobada: modelo publicado y activo registrado en la planta' : 'Solicitud rechazada')
      setSelected(null)
    }
    await client.invalidateQueries({ queryKey: ['catalog'] })
  }, onError: e => setError(errorMessage(e) ?? (e instanceof Error ? e.message : 'No se pudo completar la acción')) })
  if (query.isPending) return <Loading rows={4} />
  if (query.isError) return <Failed what="las solicitudes de catálogo" onRetry={() => void query.refetch()} />
  return <div className="grid items-start gap-5 lg:grid-cols-[minmax(16rem,1fr)_minmax(0,2fr)]">
    <Panel title="Solicitudes de plantas" subtitle="Revisa la ficha antes de incorporar el modelo y registrar la unidad.">
      {!query.data.length && <Empty>No hay solicitudes.</Empty>}
      <div className="space-y-2">{query.data.map(row => <button key={row.id} type="button" onClick={() => select(row)} className={`block w-full rounded-lg border p-3 text-left text-sm ${selected?.id === row.id ? 'border-primary bg-muted' : ''}`}><strong className="block">{row.draft.name}</strong><span>{row.plantName} · {row.status === 'PENDING' ? 'Pendiente' : row.status === 'APPROVED' ? 'Aprobada' : 'Rechazada'}</span></button>)}</div>
    </Panel>
    {selected && <Panel title={selected.draft.name} subtitle={`${selected.plantName} · ${family?.name ?? ''} · ${selected.draft.stageCode} · ${selected.draft.networkCodes.join(', ')}`}>
      <div className="space-y-5">
        <p className="text-sm text-muted-foreground">La ficha de planta se conserva como fue enviada. Los ajustes siguientes corresponden al modelo del catálogo.</p>
        <section className="space-y-2 rounded-lg border bg-muted/30 p-4">
          <h3 className="text-sm font-semibold">Nota de la solicitud</h3>
          <p className="whitespace-pre-wrap text-sm [overflow-wrap:anywhere]">{selected.draft.requestNote || 'La planta no incluyó una nota.'}</p>
        </section>
        {selected.draft.serialNumber && <p className="text-sm">Serie de la unidad: {selected.draft.serialNumber}</p>}
        {selected.status === 'PENDING' ? <>
          <div className="space-y-2"><Label htmlFor="request-type">Tipo de activo</Label><select id="request-type" className={selectClass} value={typeCode} onChange={e => { setTypeCode(e.target.value); setDirty(true) }}><option value="">Selecciona un tipo de esta familia</option>{types.data?.filter(t => t.familyCode === family?.code).map(t => <option key={t.id} value={t.code}>{t.name}</option>)}</select><p className="text-xs text-muted-foreground">Si falta el tipo o su etapa, configúralos en la pestaña Tipos.</p></div>
          <div className="space-y-2"><Label htmlFor="request-name">Nombre del modelo</Label><Input id="request-name" value={name} onChange={e => { setName(e.target.value); setDirty(true) }} /></div>
          <FamilySpecificationFields familyId={selected.draft.familyId} value={specifications} onChange={value => { setSpecifications(value); setDirty(true) }} />
          <div className="space-y-2"><Label htmlFor="request-components">Componentes del modelo (uno por línea)</Label><Textarea id="request-components" value={components} onChange={e => { setComponents(e.target.value); setDirty(true) }} /></div>
          <ModelImagePicker currentUrl={selected.reviewedModel?.imageUrl ?? null} value={image} onChange={value => { setImage(value); setDirty(true) }} />
          <Button disabled={action.isPending || !typeCode || !name.trim()} onClick={() => action.mutate('save')}>Guardar ficha de catálogo</Button>
          <div className="space-y-2 border-t pt-4"><Label htmlFor="request-note">Comentario de la decisión (obligatorio al rechazar)</Label><Textarea id="request-note" value={note} onChange={e => setNote(e.target.value)} /></div>
          <div className="flex flex-wrap gap-2"><Button disabled={action.isPending || !selected.modelId || dirty} onClick={() => action.mutate('approve')}>Aprobar y registrar activo</Button><Button variant="outline" disabled={action.isPending} onClick={() => action.mutate('reject')}>Rechazar solicitud</Button></div>
          {dirty && <p className="text-xs text-muted-foreground">Guarda la ficha antes de aprobar.</p>}
        </> : <><p>{selected.status === 'APPROVED' ? 'Modelo publicado y activo registrado en planta.' : 'Solicitud rechazada. No se creó un activo.'}</p>{selected.decisionNote && <p>{selected.decisionNote}</p>}</>}
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      </div>
    </Panel>}
  </div>
}
