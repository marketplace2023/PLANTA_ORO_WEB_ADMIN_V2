import { ImageIcon, Info, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { FormDialog, type Field, type Values } from '@/components/form-dialog'
import { Empty, Failed, Loading, Panel, ScreenHeader } from '@/components/kit'
import { ModelImagePicker, type ImageChange } from '@/components/model-image-picker'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  useCreateNetwork,
  useCreateStage,
  useDeleteNetwork,
  useDeleteStage,
  useNetworkMasters,
  useNetworkUsage,
  useRemoveNetworkImage,
  useRemoveStageLayout,
  useStageMasters,
  useStageUsage,
  useUpdateNetwork,
  useUpdateStage,
  useUploadNetworkImage,
  useUploadStageLayout,
  type NetworkMaster,
  type NetworkUsage,
  type StageMaster,
  type StageUsage,
} from '@/features/catalog/use-catalog'
import { apiUrl } from '@/lib/api'
import { errorMessage } from '@/lib/forms'

/** Colores que ya definen las hojas de estilo de todos los portales (`--network-…`): una red nueva elige uno de ellos. */
const NETWORK_COLORS: Array<{ token: string; label: string }> = [
  { token: 'network-proc', label: 'Naranja' },
  { token: 'network-pte', label: 'Amarillo' },
  { token: 'network-iot', label: 'Azul claro' },
  { token: 'network-gpon', label: 'Violeta' },
  { token: 'network-cc', label: 'Rojo' },
  { token: 'network-lab', label: 'Verde azulado' },
  { token: 'network-mnt', label: 'Gris' },
  { token: 'network-rq', label: 'Verde' },
  { token: 'network-of', label: 'Rosa' },
  { token: 'network-cam', label: 'Azul' },
]

const opt = (v: string | boolean) => (String(v).trim() === '' ? undefined : String(v).trim())
const nul = (v: string | boolean) => (String(v).trim() === '' ? null : String(v).trim())

function NetworkDialog({ row, onClose }: { row?: NetworkMaster; onClose: () => void }) {
  const create = useCreateNetwork()
  const update = useUpdateNetwork()
  const upload = useUploadNetworkImage()
  const removeImage = useRemoveNetworkImage()
  const [image, setImage] = useState<ImageChange>({ file: null, remove: false })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fields: Field[] = [
    { name: 'code', label: 'Código', required: true, disabled: !!row, placeholder: 'FUR-AGUA', hint: 'FUR- y de 2 a 16 letras mayúsculas. No se puede cambiar.' },
    { name: 'name', label: 'Nombre', required: true },
    { name: 'colorToken', label: 'Color', type: 'select', options: NETWORK_COLORS.map((c) => ({ value: c.token, label: c.label })), hint: 'Se usa en las tarjetas y en los tableros de la red.' },
    { name: 'icon', label: 'Ícono', placeholder: 'droplets', hint: 'Nombre corto del ícono (opcional).' },
    { name: 'sequence', label: 'Orden', type: 'number', min: 0, hint: 'Menor número, más arriba en los listados. Vacío = al final.' },
    { name: 'description', label: 'Descripción', type: 'textarea', wide: true, placeholder: 'Qué cubre esta red, equipos principales, alcance…' },
  ]

  /** Guarda la red y, después, aplica el cambio de imagen. Si la imagen falla, la red ya quedó guardada y se avisa. */
  async function submit(v: Values) {
    setSaving(true)
    setError(null)
    try {
      const sequence = String(v.sequence).trim() !== '' ? { sequence: Number(v.sequence) } : {}
      const saved = row
        ? await update.mutateAsync({ id: row.id, name: String(v.name).trim(), description: nul(v.description), icon: nul(v.icon), colorToken: nul(v.colorToken), ...sequence })
        : await create.mutateAsync({ code: String(v.code).trim().toUpperCase(), name: String(v.name).trim(), description: opt(v.description), icon: opt(v.icon), colorToken: opt(v.colorToken), ...sequence })
      try {
        if (image.file) await upload.mutateAsync({ id: saved.id, file: image.file })
        else if (image.remove && row) await removeImage.mutateAsync(row.id)
      } catch (e) {
        toast.error(`Red guardada, pero la imagen no se pudo guardar: ${errorMessage(e) ?? 'error desconocido'}`)
        onClose()
        return
      }
      toast.success(row ? 'Red actualizada' : 'Red creada')
      onClose()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setSaving(false)
    }
  }
  return (
    <FormDialog
      title={row ? `Editar red ${row.code}` : 'Nueva red transversal'}
      description={row ? undefined : 'Después podrás habilitarla en cada planta y asignarla a los tipos del catálogo.'}
      fields={fields}
      initial={row ? { code: row.code, name: row.name, description: row.description ?? '', icon: row.icon ?? '', colorToken: row.colorToken ?? '', sequence: String(row.sequence) } : {}}
      busy={saving}
      error={error}
      extra={<ModelImagePicker title="Imagen de la red" noun="imagen" subject="red" wide currentUrl={row?.layoutImageUrl ?? null} value={image} onChange={setImage} />}
      onClose={onClose}
      onSubmit={(v) => void submit(v)}
    />
  )
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

function DeleteNetworkDialog({ row, usage, onClose }: { row: NetworkMaster; usage?: NetworkUsage; onClose: () => void }) {
  const remove = useDeleteNetwork()
  const inPlants = (usage?.plants ?? 0) > 0
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Eliminar la red {row.code}</DialogTitle>
          <DialogDescription>
            {row.name}. Esta acción no se puede deshacer.
          </DialogDescription>
        </DialogHeader>
        {usage && (usage.plants > 0 || usage.types > 0) ? (
          <ul className="space-y-1 rounded-md bg-muted p-3 text-sm">
            {usage.plants > 0 && <li>Se quitará de {plural(usage.plants, 'planta que la habilita', 'plantas que la habilitan')}{usage.assets > 0 ? ` y se desvinculará de ${plural(usage.assets, 'activo', 'activos')}` : ''}.</li>}
            {usage.types > 0 && <li>Se quitará de {plural(usage.types, 'tipo del catálogo', 'tipos del catálogo')}.</li>}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No la usa ninguna planta ni tipo del catálogo.</p>
        )}
        {remove.error && <p role="alert" className="rounded-md bg-fur-red-500/10 p-3 text-sm text-fur-red-500">{errorMessage(remove.error)}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button variant="destructive" disabled={remove.isPending} onClick={() => remove.mutate({ id: row.id, force: inPlants }, { onSuccess: () => { toast.success(`Red ${row.code} eliminada`); onClose() } })}>
            {remove.isPending ? 'Eliminando…' : inPlants ? 'Eliminar y quitar de las plantas' : 'Eliminar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Colores que ya definen las hojas de estilo de todos los portales (`--fur-<color>-500`): una etapa nueva elige uno. */
const STAGE_COLORS: Array<{ token: string; label: string }> = [
  { token: 'orange', label: 'Naranja' },
  { token: 'blue', label: 'Azul' },
  { token: 'green', label: 'Verde' },
  { token: 'purple', label: 'Violeta' },
  { token: 'yellow', label: 'Amarillo' },
  { token: 'cyan', label: 'Celeste' },
]
const stageColor = (token: string | null) => (token ? `var(--fur-${token}-500)` : 'var(--fur-navy-800)')

/** Crear o editar una etapa. El código se elige al crear y no cambia después; el resto (y la imagen del layout) sí se edita. */
function StageDialog({ row, groups, onClose }: { row?: StageMaster; groups: string[]; onClose: () => void }) {
  const create = useCreateStage()
  const update = useUpdateStage()
  const upload = useUploadStageLayout()
  const remove = useRemoveStageLayout()
  const [image, setImage] = useState<ImageChange>({ file: null, remove: false })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fields: Field[] = [
    { name: 'code', label: 'Código', required: true, disabled: !!row, placeholder: 'D20', hint: 'D seguida de 2 dígitos. No se puede cambiar.' },
    { name: 'name', label: 'Nombre', required: true },
    { name: 'stageGroup', label: 'Grupo', type: 'select', options: groups.map((g) => ({ value: g, label: g })), hint: 'Las etapas se agrupan por este valor en todos los portales.' },
    { name: 'newGroup', label: 'Grupo nuevo (opcional)', placeholder: 'FLOTACION', hint: 'Si lo escribes, se usa en lugar del grupo elegido.' },
    { name: 'colorToken', label: 'Color', type: 'select', options: STAGE_COLORS.map((c) => ({ value: c.token, label: c.label })) },
    { name: 'sequenceDefault', label: 'Orden', type: 'number', min: 1, hint: 'Menor número, más arriba en los listados. Vacío = al final.' },
    { name: 'description', label: 'Descripción', type: 'textarea', wide: true, placeholder: 'Qué ocurre en esta etapa, equipos principales, entradas y salidas…' },
  ]

  /** Guarda la etapa y, después, aplica el cambio de imagen. Si la imagen falla, la etapa ya quedó guardada y se avisa. */
  async function submit(v: Values) {
    setSaving(true)
    setError(null)
    try {
      const group = (String(v.newGroup ?? '').trim() || String(v.stageGroup ?? '').trim()).toUpperCase()
      const sequence = String(v.sequenceDefault ?? '').trim() !== '' ? { sequenceDefault: Number(v.sequenceDefault) } : {}
      const saved = row
        ? await update.mutateAsync({ id: row.id, name: String(v.name).trim(), stageGroup: group, colorToken: nul(v.colorToken), description: nul(v.description), ...sequence })
        : await create.mutateAsync({ code: String(v.code).trim().toUpperCase(), name: String(v.name).trim(), stageGroup: group, colorToken: opt(v.colorToken), description: opt(v.description), ...sequence })
      try {
        if (image.file) await upload.mutateAsync({ id: saved.id, file: image.file })
        else if (image.remove && row) await remove.mutateAsync(row.id)
      } catch (e) {
        toast.error(`Etapa guardada, pero la imagen no se pudo guardar: ${errorMessage(e) ?? 'error desconocido'}`)
        onClose()
        return
      }
      toast.success(row ? `Etapa ${row.code} actualizada` : 'Etapa creada')
      onClose()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormDialog
      title={row ? `Editar etapa ${row.code}` : 'Nueva etapa del proceso'}
      description={row ? undefined : 'Después podrás habilitarla en cada planta y asignarla a los tipos del catálogo.'}
      fields={fields}
      initial={
        row
          ? { code: row.code, name: row.name, stageGroup: row.stageGroup, newGroup: '', colorToken: row.colorToken ?? '', sequenceDefault: String(row.sequenceDefault), description: row.description ?? '' }
          : { stageGroup: groups[0] ?? '' }
      }
      busy={saving}
      error={error}
      extra={<ModelImagePicker title="Imagen del layout" noun="imagen" subject="etapa" wide currentUrl={row?.layoutImageUrl ?? null} value={image} onChange={setImage} />}
      onClose={onClose}
      onSubmit={(v) => void submit(v)}
    />
  )
}

function DeleteStageDialog({ row, usage, onClose }: { row: StageMaster; usage?: StageUsage; onClose: () => void }) {
  const remove = useDeleteStage()
  const inPlants = (usage?.plants ?? 0) > 0
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Eliminar la etapa {row.code}</DialogTitle>
          <DialogDescription>{row.name}. Esta acción no se puede deshacer.</DialogDescription>
        </DialogHeader>
        {usage && (usage.plants > 0 || usage.types > 0) ? (
          <ul className="space-y-1 rounded-md bg-muted p-3 text-sm">
            {usage.plants > 0 && (
              <li>
                Se quitará de {plural(usage.plants, 'planta que la habilita', 'plantas que la habilitan')}
                {usage.assets > 0 ? `; ${plural(usage.assets, 'activo quedará', 'activos quedarán')} sin etapa` : ''}, junto con sus conexiones de flujo.
              </li>
            )}
            {usage.types > 0 && <li>Se quitará de {plural(usage.types, 'tipo del catálogo', 'tipos del catálogo')}.</li>}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No la usa ninguna planta ni tipo del catálogo.</p>
        )}
        {remove.error && <p role="alert" className="rounded-md bg-fur-red-500/10 p-3 text-sm text-fur-red-500">{errorMessage(remove.error)}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button variant="destructive" disabled={remove.isPending} onClick={() => remove.mutate({ id: row.id, force: inPlants }, { onSuccess: () => { toast.success(`Etapa ${row.code} eliminada`); onClose() } })}>
            {remove.isPending ? 'Eliminando…' : inPlants ? 'Eliminar y quitar de las plantas' : 'Eliminar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function usageText(u: NetworkUsage | undefined) {
  if (!u) return null
  if (u.plants === 0 && u.types === 0) return 'Sin uso'
  return [u.plants > 0 && plural(u.plants, 'planta', 'plantas'), u.types > 0 && plural(u.types, 'tipo', 'tipos')].filter(Boolean).join(' · ')
}

export function MastersPage() {
  const stages = useStageMasters()
  const networks = useNetworkMasters()
  const usage = useNetworkUsage()
  const stageUsage = useStageUsage()
  const [dialog, setDialog] = useState<{ kind: 'edit'; row?: NetworkMaster } | { kind: 'delete'; row: NetworkMaster } | null>(null)
  const [stageDialog, setStageDialog] = useState<{ kind: 'edit'; row?: StageMaster } | { kind: 'delete'; row: StageMaster } | null>(null)
  const groups = [...new Set((stages.data ?? []).map((s) => s.stageGroup))]
  const usageById = new Map((usage.data ?? []).map((u) => [u.id, u]))
  const stageUsageById = new Map((stageUsage.data ?? []).map((u) => [u.id, u]))

  return (
    <>
      <ScreenHeader title="Etapas y redes maestras" description="Catálogo común a todas las plantas. Cada planta habilita solo las que le corresponden." />

      <p className="mb-4 flex items-start gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0 text-fur-blue-500" aria-hidden />
        Las redes (FUR-…) se crean, editan y eliminan aquí; de cada red y etapa puedes editar la descripción y la imagen que se muestran en la página principal. Las etapas (D01, D02…) se crean, editan y eliminan igual que las redes; el código no cambia una vez creado. Para habilitar o ocultar una red o etapa en una planta, ve a <strong className="font-semibold text-fur-navy-900">Plantas → Administrar</strong>.
      </p>

      <Panel
        title="Redes transversales"
        subtitle={networks.data ? `${networks.data.length} redes maestras` : undefined}
        action={<Button size="xs" onClick={() => setDialog({ kind: 'edit' })}><Plus /> Nueva red</Button>}
      >
        {networks.isLoading ? (
          <Loading rows={2} />
        ) : networks.isError ? (
          <Failed what="las redes" onRetry={() => void networks.refetch()} />
        ) : networks.data && networks.data.length > 0 ? (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {networks.data.map((n) => (
              <li key={n.id} className="flex flex-col rounded-lg border border-border bg-fur-gray-50 p-3" style={{ borderTopColor: n.colorToken ? `var(--${n.colorToken})` : 'var(--fur-navy-800)', borderTopWidth: 3 }}>
                <p className="fur-code text-[11px] text-muted-foreground">{n.code}</p>
                <p className="font-semibold text-fur-navy-900">{n.name}</p>
                <span className="mt-2 grid h-24 place-items-center overflow-hidden rounded-md border border-border bg-white">
                  {n.layoutImageUrl ? <img src={apiUrl(n.layoutImageUrl)} alt={`Imagen de la red ${n.code}`} loading="lazy" className="size-full object-contain" /> : <ImageIcon className="size-6 text-fur-gray-500" aria-label="Sin imagen" />}
                </span>
                {n.description ? <p className="mt-2 line-clamp-3 text-xs text-fur-gray-600">{n.description}</p> : <p className="mt-2 text-xs text-muted-foreground">Sin descripción</p>}
                <p className="mt-2 text-xs text-muted-foreground">{usageText(usageById.get(n.id)) ?? ' '}</p>
                <div className="mt-auto flex gap-1.5 pt-2">
                  <Button size="xs" variant="secondary" aria-label={`Editar ${n.name}`} onClick={() => setDialog({ kind: 'edit', row: n })}><Pencil /> Editar</Button>
                  <Button size="xs" variant="outline" aria-label={`Eliminar ${n.name}`} onClick={() => setDialog({ kind: 'delete', row: n })}><Trash2 /> Eliminar</Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>No hay redes maestras. Crea la primera.</Empty>
        )}
      </Panel>

      <div className="mt-6 mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-fur-navy-900">Etapas del proceso</h2>
          <p className="text-sm text-muted-foreground">{stages.data ? `${stages.data.length} etapas maestras` : ' '}</p>
        </div>
        <Button size="xs" onClick={() => setStageDialog({ kind: 'edit' })}><Plus /> Nueva etapa</Button>
      </div>

      <div className="space-y-4">
        {stages.isLoading ? (
          <Loading rows={4} />
        ) : stages.isError ? (
          <Panel><Failed what="las etapas" onRetry={() => void stages.refetch()} /></Panel>
        ) : (
          groups.map((g) => (
            <Panel key={g} title={g}>
              <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {stages.data!
                  .filter((s) => s.stageGroup === g)
                  .sort((a, b) => a.sequenceDefault - b.sequenceDefault)
                  .map((s) => (
                    <li key={s.id} className="flex flex-col rounded-lg border border-border bg-fur-gray-50 p-3" style={{ borderTopColor: stageColor(s.colorToken), borderTopWidth: 3 }}>
                      <p className="fur-code text-[11px] text-muted-foreground">{s.code}</p>
                      <p className="font-semibold text-fur-navy-900">{s.name}</p>
                      <span className="mt-2 grid h-24 place-items-center overflow-hidden rounded-md border border-border bg-white">
                        {s.layoutImageUrl ? <img src={apiUrl(s.layoutImageUrl)} alt={`Layout de la etapa ${s.code}`} loading="lazy" className="size-full object-contain" /> : <ImageIcon className="size-6 text-fur-gray-500" aria-label="Sin imagen de layout" />}
                      </span>
                      {s.description ? <p className="mt-2 line-clamp-3 text-xs text-fur-gray-600">{s.description}</p> : <p className="mt-2 text-xs text-muted-foreground">Sin descripción</p>}
                      <p className="mt-2 text-xs text-muted-foreground">{usageText(stageUsageById.get(s.id)) ?? ' '}</p>
                      <div className="mt-auto flex gap-1.5 pt-2">
                        <Button size="xs" variant="secondary" aria-label={`Editar etapa ${s.code}`} onClick={() => setStageDialog({ kind: 'edit', row: s })}><Pencil /> Editar</Button>
                        <Button size="xs" variant="outline" aria-label={`Eliminar etapa ${s.code}`} onClick={() => setStageDialog({ kind: 'delete', row: s })}><Trash2 /> Eliminar</Button>
                      </div>
                    </li>
                  ))}
              </ul>
            </Panel>
          ))
        )}
      </div>

      {stageDialog?.kind === 'edit' && <StageDialog row={stageDialog.row} groups={groups} onClose={() => setStageDialog(null)} />}
      {stageDialog?.kind === 'delete' && <DeleteStageDialog row={stageDialog.row} usage={stageUsageById.get(stageDialog.row.id)} onClose={() => setStageDialog(null)} />}
      {dialog?.kind === 'edit' && <NetworkDialog row={dialog.row} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'delete' && <DeleteNetworkDialog row={dialog.row} usage={usageById.get(dialog.row.id)} onClose={() => setDialog(null)} />}
    </>
  )
}
