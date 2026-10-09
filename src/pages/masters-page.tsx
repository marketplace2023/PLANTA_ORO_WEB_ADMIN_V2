import { Info, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { FormDialog, type Field, type Values } from '@/components/form-dialog'
import { Empty, Failed, Loading, Panel, ScreenHeader } from '@/components/kit'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  useCreateNetwork,
  useDeleteNetwork,
  useNetworkMasters,
  useNetworkUsage,
  useStageMasters,
  useUpdateNetwork,
  type NetworkMaster,
  type NetworkUsage,
} from '@/features/catalog/use-catalog'
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
  const m = row ? update : create
  const fields: Field[] = [
    { name: 'code', label: 'Código', required: true, disabled: !!row, placeholder: 'FUR-AGUA', hint: 'FUR- y de 2 a 16 letras mayúsculas. No se puede cambiar.' },
    { name: 'name', label: 'Nombre', required: true },
    { name: 'colorToken', label: 'Color', type: 'select', options: NETWORK_COLORS.map((c) => ({ value: c.token, label: c.label })), hint: 'Se usa en las tarjetas y en los tableros de la red.' },
    { name: 'icon', label: 'Ícono', placeholder: 'droplets', hint: 'Nombre corto del ícono (opcional).' },
    { name: 'sequence', label: 'Orden', type: 'number', min: 0, hint: 'Menor número, más arriba en los listados. Vacío = al final.' },
    { name: 'description', label: 'Descripción', type: 'textarea', wide: true },
  ]
  const submit = (v: Values) => {
    const done = { onSuccess: () => { toast.success(row ? 'Red actualizada' : 'Red creada'); onClose() } }
    if (row) update.mutate({ id: row.id, name: String(v.name).trim(), description: nul(v.description), icon: nul(v.icon), colorToken: nul(v.colorToken), ...(String(v.sequence).trim() !== '' && { sequence: Number(v.sequence) }) }, done)
    else create.mutate({ code: String(v.code).trim().toUpperCase(), name: String(v.name).trim(), description: opt(v.description), icon: opt(v.icon), colorToken: opt(v.colorToken), ...(String(v.sequence).trim() !== '' && { sequence: Number(v.sequence) }) }, done)
  }
  return (
    <FormDialog
      title={row ? `Editar red ${row.code}` : 'Nueva red transversal'}
      description={row ? undefined : 'Después podrás habilitarla en cada planta y asignarla a los tipos del catálogo.'}
      fields={fields}
      initial={row ? { code: row.code, name: row.name, description: row.description ?? '', icon: row.icon ?? '', colorToken: row.colorToken ?? '', sequence: String(row.sequence) } : {}}
      busy={m.isPending}
      error={errorMessage(m.error)}
      onClose={onClose}
      onSubmit={submit}
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

function usageText(u: NetworkUsage | undefined) {
  if (!u) return null
  if (u.plants === 0 && u.types === 0) return 'Sin uso'
  return [u.plants > 0 && plural(u.plants, 'planta', 'plantas'), u.types > 0 && plural(u.types, 'tipo', 'tipos')].filter(Boolean).join(' · ')
}

export function MastersPage() {
  const stages = useStageMasters()
  const networks = useNetworkMasters()
  const usage = useNetworkUsage()
  const [dialog, setDialog] = useState<{ kind: 'edit'; row?: NetworkMaster } | { kind: 'delete'; row: NetworkMaster } | null>(null)
  const groups = [...new Set((stages.data ?? []).map((s) => s.stageGroup))]
  const usageById = new Map((usage.data ?? []).map((u) => [u.id, u]))

  return (
    <>
      <ScreenHeader title="Etapas y redes maestras" description="Catálogo común a todas las plantas. Cada planta habilita solo las que le corresponden." />

      <p className="mb-4 flex items-start gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0 text-fur-blue-500" aria-hidden />
        Las redes (FUR-…) se crean, editan y eliminan aquí. Las etapas (D01–D19) son parte de la arquitectura del ecosistema y son de solo lectura. Para habilitar o ocultar una red o etapa en una planta, ve a <strong className="font-semibold text-fur-navy-900">Plantas → Administrar</strong>.
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
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {networks.data.map((n) => (
              <li key={n.id} className="flex flex-col rounded-lg border border-border border-l-4 bg-card p-3" style={{ borderLeftColor: n.colorToken ? `var(--${n.colorToken})` : undefined }}>
                <p className="fur-code text-[11px] text-muted-foreground">{n.code}</p>
                <p className="font-semibold text-fur-navy-900">{n.name}</p>
                {n.description && <p className="mt-1 line-clamp-2 text-xs text-fur-gray-600">{n.description}</p>}
                <p className="mt-2 text-xs text-muted-foreground">{usageText(usageById.get(n.id)) ?? ' '}</p>
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

      <div className="mt-6 space-y-4">
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
                    <li key={s.id} className="rounded-lg border border-border bg-fur-gray-50 p-3" style={{ borderTopColor: 'var(--fur-navy-800)', borderTopWidth: 3 }}>
                      <p className="fur-code text-[11px] text-muted-foreground">{s.code}</p>
                      <p className="font-semibold text-fur-navy-900">{s.name}</p>
                      {s.description && <p className="mt-1 line-clamp-2 text-xs text-fur-gray-600">{s.description}</p>}
                    </li>
                  ))}
              </ul>
            </Panel>
          ))
        )}
      </div>

      {dialog?.kind === 'edit' && <NetworkDialog row={dialog.row} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'delete' && <DeleteNetworkDialog row={dialog.row} usage={usageById.get(dialog.row.id)} onClose={() => setDialog(null)} />}
    </>
  )
}
