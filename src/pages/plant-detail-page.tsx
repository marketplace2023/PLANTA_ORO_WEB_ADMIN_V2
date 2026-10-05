import { ArrowLeft, Pencil, Plus, Trash2, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { FormDialog, type Field, type Values } from '@/components/form-dialog'
import { errorMessage, selectClass } from '@/lib/forms'
import { DataTable, Empty, Failed, Loading, Panel, Pill, ScreenHeader, Segmented, td } from '@/components/kit'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useNetworkMasters, useStageMasters } from '@/features/catalog/use-catalog'
import {
  useAssignableRoles,
  useAssignMember,
  useEnableNetwork,
  useEnableStage,
  useMembers,
  usePlant,
  usePlantNetworks,
  usePlantStages,
  useRemoveMember,
  useUpdateNetwork,
  useUpdatePlant,
  useUpdateStage,
  type Member,
  type PlantDetail,
  type PlantPatch,
  type PlantStatus,
  type Visibility,
} from '@/features/plants/use-plants'
import { formatDate } from '@/lib/format'
import { COMMON_TIMEZONES, PLANT_STATUS, statusMeta, VISIBILITY, visibilityMeta } from '@/lib/meta'
import { ROLE_LABELS } from '@/lib/roles'
import { cn } from '@/lib/utils'

type Tab = 'info' | 'members' | 'stages' | 'networks'

const nullable = (v: string) => (v.trim() === '' ? null : v.trim())

function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
      style={{ background: checked ? 'var(--fur-green-500)' : 'var(--fur-gray-300)' }}
    >
      <span className="inline-block size-5 rounded-full bg-white shadow transition-transform" style={{ transform: `translateX(${checked ? 22 : 2}px)` }} />
    </button>
  )
}

function InfoTab({ plant, onEdit }: { plant: PlantDetail; onEdit: () => void }) {
  const st = statusMeta(plant.status)
  const vis = visibilityMeta(plant.visibility)
  const s = plant.settings
  const flags: Array<[string, boolean | undefined]> = [
    ['Tablero', s?.publicDashboard],
    ['Procesos', s?.publicProcesses],
    ['Activos', s?.publicAssets],
    ['Documentos', s?.publicDocuments],
  ]
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Panel title="Información" className="lg:col-span-2" action={<Button size="xs" variant="secondary" onClick={onEdit}><Pencil /> Editar</Button>}>
        <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
          <div><dt className="text-xs text-muted-foreground">Nombre</dt><dd className="font-medium text-fur-navy-900">{plant.name}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Código</dt><dd className="fur-code">{plant.code}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Slug (URL)</dt><dd className="fur-code">/{plant.slug}</dd></div>
          <div><dt className="text-xs text-muted-foreground">País</dt><dd>{plant.countryCode ?? <span className="text-muted-foreground">Sin definir</span>}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Zona horaria</dt><dd>{plant.timezone}</dd></div>
          <div>
            <dt className="text-xs text-muted-foreground">Estado</dt>
            <dd><Pill label={st.label} color={st.color} icon={st.icon} /></dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Visibilidad</dt>
            <dd><Pill label={vis.label} color={vis.color} icon={vis.icon} /></dd>
          </div>
          <div className="sm:col-span-2"><dt className="text-xs text-muted-foreground">Descripción</dt><dd>{plant.description ?? <span className="text-muted-foreground">Sin descripción</span>}</dd></div>
        </dl>
      </Panel>
      <Panel title="Información operativa pública" subtitle="Qué puede ver quien no es miembro de la planta">
        <ul className="space-y-2 text-sm">
          {flags.map(([label, on]) => (
            <li key={label} className="flex items-center justify-between">
              {label}
              <Pill label={on ? 'Publicado' : 'No publicado'} color={on ? 'var(--fur-blue-500)' : 'var(--fur-steel-500)'} />
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  )
}

function MembersTab({ slug }: { slug: string }) {
  const members = useMembers(slug)
  const roles = useAssignableRoles(slug)
  const assign = useAssignMember(slug)
  const remove = useRemoveMember(slug)
  const [adding, setAdding] = useState(false)
  const [removing, setRemoving] = useState<Member | null>(null)

  const fields: Field[] = [
    { name: 'email', label: 'Correo del usuario', type: 'email', required: true, placeholder: 'persona@empresa.com', hint: 'La persona debe tener una cuenta registrada.', wide: true },
    { name: 'roleCode', label: 'Rol en la planta', type: 'select', required: true, options: (roles.data ?? []).map((r) => ({ value: r.code, label: ROLE_LABELS[r.code] ?? r.name })), wide: true },
  ]

  return (
    <>
      <Panel
        title="Miembros y roles"
        subtitle="Quién puede hacer qué en esta planta (usuario + planta + rol + permiso)"
        flush
        action={<Button size="xs" onClick={() => { assign.reset(); setAdding(true) }}><UserPlus /> Asignar miembro</Button>}
      >
        {members.isLoading ? (
          <div className="p-4"><Loading rows={4} /></div>
        ) : members.isError ? (
          <Failed what="los miembros" onRetry={() => void members.refetch()} />
        ) : members.data && members.data.length > 0 ? (
          <DataTable head={['Persona', 'Correo', 'Rol', 'Estado', 'Desde', { label: '', right: true }]}>
            {members.data.map((m) => (
              <tr key={m.id}>
                <td className={`${td} font-medium text-fur-navy-900`}>{m.firstName} {m.lastName}</td>
                <td className={td}>{m.email}</td>
                <td className={td}>{ROLE_LABELS[m.roleCode] ?? m.roleName}</td>
                <td className={td}><Pill label={m.status === 'ACTIVE' ? 'Activo' : m.status} color={m.status === 'ACTIVE' ? 'var(--fur-green-500)' : 'var(--fur-steel-500)'} /></td>
                <td className={td}>{formatDate(m.startsAt)}</td>
                <td className={`${td} text-right`}>
                  <Button size="xs" variant="outline" aria-label={`Quitar acceso de ${m.email}`} onClick={() => { remove.reset(); setRemoving(m) }}>
                    <Trash2 /> Quitar
                  </Button>
                </td>
              </tr>
            ))}
          </DataTable>
        ) : (
          <Empty>Esta planta aún no tiene miembros. Asigna un responsable.</Empty>
        )}
      </Panel>

      {adding && (
        <FormDialog
          title="Asignar miembro"
          fields={fields}
          initial={{ roleCode: 'PLANT_ADMIN' }}
          submitLabel="Asignar"
          busy={assign.isPending}
          error={errorMessage(assign.error)}
          onClose={() => setAdding(false)}
          onSubmit={(v) =>
            assign.mutate({ email: String(v.email).trim(), roleCode: String(v.roleCode) }, { onSuccess: () => { toast.success('Miembro asignado'); setAdding(false) } })
          }
        />
      )}

      {removing && (
        <Dialog open onOpenChange={(o) => !o && setRemoving(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Quitar acceso</DialogTitle>
              <DialogDescription>
                {removing.firstName} {removing.lastName} ({removing.email}) dejará de tener el rol «{ROLE_LABELS[removing.roleCode] ?? removing.roleName}» en esta planta. La acción queda en la auditoría.
              </DialogDescription>
            </DialogHeader>
            {remove.isError && <p role="alert" className="text-sm text-fur-red-500">{errorMessage(remove.error)}</p>}
            <DialogFooter>
              <Button variant="outline" onClick={() => setRemoving(null)}>Cancelar</Button>
              <Button variant="destructive" disabled={remove.isPending} onClick={() => remove.mutate(removing.id, { onSuccess: () => { toast.success('Acceso retirado'); setRemoving(null) } })}>
                {remove.isPending ? 'Quitando…' : 'Quitar acceso'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}

function StagesTab({ slug }: { slug: string }) {
  const stages = usePlantStages(slug)
  const masters = useStageMasters()
  const enable = useEnableStage(slug)
  const update = useUpdateStage(slug)
  const [pick, setPick] = useState('')

  const fail = (e: unknown) => toast.error(errorMessage(e) ?? 'No se pudo guardar')
  const present = new Set((stages.data ?? []).map((s) => s.code))
  const available = (masters.data ?? []).filter((m) => !present.has(m.code))
  const sorted = [...(stages.data ?? [])].sort((a, b) => a.sequence - b.sequence)

  return (
    <Panel
      title="Etapas del proceso"
      subtitle="Habilita solo las etapas que existen en esta planta. No se puede deshabilitar una etapa que aún tiene activos."
      flush
      action={
        <div className="flex items-center gap-2">
          <select className={cn(selectClass, 'h-9 w-56')} aria-label="Etapa a habilitar" value={pick} onChange={(e) => setPick(e.target.value)}>
            <option value="">Habilitar etapa…</option>
            {available.map((m) => <option key={m.code} value={m.code}>{m.code} · {m.name}</option>)}
          </select>
          <Button size="sm" disabled={!pick || enable.isPending} onClick={() => enable.mutate({ stageCode: pick }, { onSuccess: () => { toast.success('Etapa habilitada'); setPick('') }, onError: fail })}>
            <Plus /> Habilitar
          </Button>
        </div>
      }
    >
      {stages.isLoading ? (
        <div className="p-4"><Loading rows={5} /></div>
      ) : stages.isError ? (
        <Failed what="las etapas" onRetry={() => void stages.refetch()} />
      ) : sorted.length > 0 ? (
        <DataTable head={['#', 'Etapa', 'Grupo', 'Habilitada', 'Pública']}>
          {sorted.map((s) => (
            <tr key={s.id} className={s.isEnabled ? undefined : 'opacity-60'}>
              <td className={`${td} tabular-nums`}>{s.sequence}</td>
              <td className={td}><span className="fur-code text-xs text-muted-foreground">{s.code}</span><p className="font-medium text-fur-navy-900">{s.displayName}</p></td>
              <td className={td}>{s.stageGroup}</td>
              <td className={td}><Switch checked={s.isEnabled} label={`Habilitar ${s.displayName}`} disabled={update.isPending} onChange={(v) => update.mutate({ id: s.id, isEnabled: v }, { onError: fail })} /></td>
              <td className={td}><Switch checked={s.isPublic} label={`Publicar ${s.displayName}`} disabled={update.isPending || !s.isEnabled} onChange={(v) => update.mutate({ id: s.id, isPublic: v }, { onError: fail })} /></td>
            </tr>
          ))}
        </DataTable>
      ) : (
        <Empty>No hay etapas. Habilita las del proceso de esta planta.</Empty>
      )}
    </Panel>
  )
}

function NetworksTab({ slug }: { slug: string }) {
  const networks = usePlantNetworks(slug)
  const masters = useNetworkMasters()
  const enable = useEnableNetwork(slug)
  const update = useUpdateNetwork(slug)
  const [pick, setPick] = useState('')

  const fail = (e: unknown) => toast.error(errorMessage(e) ?? 'No se pudo guardar')
  const present = new Set((networks.data ?? []).map((n) => n.code))
  const available = (masters.data ?? []).filter((m) => !present.has(m.code))

  return (
    <Panel
      title="Redes transversales"
      subtitle="Sistemas que atraviesan las etapas (potencia, instrumentación, comunicaciones…)."
      flush
      action={
        <div className="flex items-center gap-2">
          <select className={cn(selectClass, 'h-9 w-56')} aria-label="Red a habilitar" value={pick} onChange={(e) => setPick(e.target.value)}>
            <option value="">Habilitar red…</option>
            {available.map((m) => <option key={m.code} value={m.code}>{m.code} · {m.name}</option>)}
          </select>
          <Button size="sm" disabled={!pick || enable.isPending} onClick={() => enable.mutate({ networkCode: pick }, { onSuccess: () => { toast.success('Red habilitada'); setPick('') }, onError: fail })}>
            <Plus /> Habilitar
          </Button>
        </div>
      }
    >
      {networks.isLoading ? (
        <div className="p-4"><Loading rows={4} /></div>
      ) : networks.isError ? (
        <Failed what="las redes" onRetry={() => void networks.refetch()} />
      ) : networks.data && networks.data.length > 0 ? (
        <DataTable head={['Red', 'Habilitada', 'Pública']}>
          {networks.data.map((n) => (
            <tr key={n.id} className={n.isEnabled ? undefined : 'opacity-60'}>
              <td className={td}>
                <span className="mr-2 inline-block size-2.5 rounded-sm align-middle" style={{ background: n.colorToken ? `var(--${n.colorToken})` : 'var(--fur-steel-500)' }} aria-hidden />
                <span className="fur-code text-xs text-muted-foreground">{n.code}</span>
                <span className="ml-2 font-medium text-fur-navy-900">{n.name}</span>
              </td>
              <td className={td}><Switch checked={n.isEnabled} label={`Habilitar ${n.name}`} disabled={update.isPending} onChange={(v) => update.mutate({ id: n.id, isEnabled: v }, { onError: fail })} /></td>
              <td className={td}><Switch checked={n.isPublic} label={`Publicar ${n.name}`} disabled={update.isPending || !n.isEnabled} onChange={(v) => update.mutate({ id: n.id, isPublic: v }, { onError: fail })} /></td>
            </tr>
          ))}
        </DataTable>
      ) : (
        <Empty>No hay redes habilitadas.</Empty>
      )}
    </Panel>
  )
}

export function PlantDetailPage() {
  const { slug = '' } = useParams()
  const plant = usePlant(slug)
  const update = useUpdatePlant(slug)
  const [tab, setTab] = useState<Tab>('info')
  const [editing, setEditing] = useState(false)
  const p = plant.data

  const fields: Field[] = [
    { name: 'name', label: 'Nombre', required: true },
    { name: 'countryCode', label: 'País (2 letras)', placeholder: 'PE' },
    { name: 'timezone', label: 'Zona horaria', type: 'select', required: true, options: [...new Set([...(p ? [p.timezone] : []), ...COMMON_TIMEZONES])].map((t) => ({ value: t, label: t })) },
    { name: 'status', label: 'Estado', type: 'select', required: true, options: (Object.keys(PLANT_STATUS) as PlantStatus[]).map((s) => ({ value: s, label: PLANT_STATUS[s].label })) },
    { name: 'visibility', label: 'Visibilidad', type: 'select', required: true, options: (Object.keys(VISIBILITY) as Visibility[]).map((v) => ({ value: v, label: VISIBILITY[v].label })), wide: true },
    { name: 'logoUrl', label: 'URL del logo', type: 'url', placeholder: 'https://…', wide: true },
    { name: 'heroImageUrl', label: 'URL de la imagen principal', type: 'url', placeholder: 'https://…', wide: true },
    { name: 'description', label: 'Descripción', type: 'textarea' },
  ]

  function submit(v: Values) {
    const patch: PlantPatch = {
      name: String(v.name).trim(),
      description: nullable(String(v.description)),
      countryCode: nullable(String(v.countryCode)),
      timezone: String(v.timezone),
      status: v.status as PlantStatus,
      visibility: v.visibility as Visibility,
      logoUrl: nullable(String(v.logoUrl)),
      heroImageUrl: nullable(String(v.heroImageUrl)),
    }
    update.mutate(patch, { onSuccess: () => { toast.success('Planta actualizada'); setEditing(false) } })
  }

  if (plant.isLoading) return <Loading rows={5} />
  if (plant.isError || !p) {
    return (
      <Panel>
        <Empty>
          No se encontró la planta «{slug}».
          <Button asChild variant="secondary" size="sm"><Link to="/plants"><ArrowLeft /> Volver a plantas</Link></Button>
        </Empty>
      </Panel>
    )
  }

  const st = statusMeta(p.status)
  return (
    <>
      <ScreenHeader
        title={p.name}
        description={`${p.code} · ${p.timezone}`}
        actions={
          <>
            <Pill label={st.label} color={st.color} icon={st.icon} />
            <Button asChild variant="outline" size="sm"><Link to="/plants"><ArrowLeft /> Plantas</Link></Button>
          </>
        }
      />
      <Segmented<Tab>
        label="Secciones de la planta"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'info', label: 'Información' },
          { value: 'members', label: 'Miembros y roles' },
          { value: 'stages', label: 'Etapas' },
          { value: 'networks', label: 'Redes' },
        ]}
      />
      <div className="mt-3">
        {tab === 'info' && <InfoTab plant={p} onEdit={() => { update.reset(); setEditing(true) }} />}
        {tab === 'members' && <MembersTab slug={slug} />}
        {tab === 'stages' && <StagesTab slug={slug} />}
        {tab === 'networks' && <NetworksTab slug={slug} />}
      </div>

      {editing && (
        <FormDialog
          title="Editar planta"
          fields={fields}
          initial={{
            name: p.name,
            countryCode: p.countryCode ?? '',
            timezone: p.timezone,
            status: p.status,
            visibility: p.visibility,
            logoUrl: p.logoUrl ?? '',
            heroImageUrl: p.heroImageUrl ?? '',
            description: p.description ?? '',
          }}
          busy={update.isPending}
          error={errorMessage(update.error)}
          onClose={() => setEditing(false)}
          onSubmit={submit}
        />
      )}
    </>
  )
}
