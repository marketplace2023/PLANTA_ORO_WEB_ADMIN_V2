import { AlertTriangle, BadgeCheck, CheckCircle2, ChevronDown, Pause, Pencil, Plus, Search, Star, Trash2, UserPlus, Users } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { FormDialog, type Values } from '@/components/form-dialog'
import { DataTable, Empty, Failed, Loading, Panel, Pill, ScreenHeader, Segmented, td } from '@/components/kit'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { useEcosystemDashboard } from '@/features/dashboard/use-dashboard'
import {
  useAddOrgMember,
  useCreateOrg,
  useOrg,
  useOrgMembers,
  useOrgs,
  useRemoveOrgMember,
  useUpdateOrg,
  type Org,
  type OrgKind,
  type OrgStatus,
  type OrgStatusFilter,
} from '@/features/organizations/use-organizations'
import { errorMessage, selectClass } from '@/lib/forms'
import { formatDate } from '@/lib/format'
import { contractorAvailabilityLabel, countryName, countryOptions, ORG_STATUS_LABELS, parseRating, ratingText } from '@/lib/organizations'
import { useDebouncedValue } from '@/lib/use-debounced-value'

const STATUS_COLOR: Record<OrgStatus, string> = { PENDING: 'var(--fur-orange-500)', ACTIVE: 'var(--fur-green-500)', SUSPENDED: 'var(--fur-red-500)' }
const KIND_LABEL: Record<OrgKind, { plural: string; singular: string }> = { providers: { plural: 'Proveedores', singular: 'proveedor' }, contractors: { plural: 'Contratistas', singular: 'contratista' } }
const opt = (v: string | boolean | undefined) => (typeof v === 'string' && v.trim() ? v.trim() : undefined)

type Action =
  | { type: 'approve' | 'suspend' | 'reactivate' | 'rating' | 'members' | 'edit'; org: Org }
  | { type: 'create' }
  | null

/** Confirmación con contexto de lo que va a pasar (aprobar, suspender, reactivar). */
function ConfirmDialog({ title, description, confirmLabel, destructive, busy, error, extra, onConfirm, onClose }: { title: string; description: string; confirmLabel: string; destructive?: boolean; busy?: boolean; error?: string | null; extra?: React.ReactNode; onConfirm: () => void; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {extra}
        {error && <p role="alert" className="rounded-md bg-fur-red-500/10 p-3 text-sm text-fur-red-500">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button variant={destructive ? 'destructive' : 'default'} disabled={busy} onClick={onConfirm}>{busy ? 'Guardando…' : confirmLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ApproveDialog({ kind, org, onClose }: { kind: OrgKind; org: Org; onClose: () => void }) {
  const update = useUpdateOrg(kind)
  const [verify, setVerify] = useState(false)
  return (
    <ConfirmDialog
      title={`Aprobar a ${org.organizationName}`}
      description="Quedará activa: visible en el directorio y, si es proveedor, podrá publicar productos en el marketplace."
      confirmLabel="Aprobar"
      busy={update.isPending}
      error={errorMessage(update.error)}
      extra={
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" className="size-4 accent-[var(--fur-navy-900)]" checked={verify} onChange={(e) => setVerify(e.target.checked)} />
          Marcarla también como verificada
        </label>
      }
      onClose={onClose}
      onConfirm={() => update.mutate({ id: org.id, status: 'ACTIVE', ...(verify && { verified: true }) }, { onSuccess: () => { toast.success(`${org.organizationName} aprobada`); onClose() } })}
    />
  )
}

function StatusDialog({ kind, org, to, onClose }: { kind: OrgKind; org: Org; to: 'SUSPENDED' | 'ACTIVE'; onClose: () => void }) {
  const update = useUpdateOrg(kind)
  const suspend = to === 'SUSPENDED'
  return (
    <ConfirmDialog
      title={suspend ? `Suspender a ${org.organizationName}` : `Reactivar a ${org.organizationName}`}
      description={suspend ? 'Dejará de ser visible (y sus productos también) y sus miembros no podrán editarla. No se borra nada: puedes reactivarla cuando quieras.' : 'Volverá a ser visible y sus miembros podrán editarla de nuevo.'}
      confirmLabel={suspend ? 'Suspender' : 'Reactivar'}
      destructive={suspend}
      busy={update.isPending}
      error={errorMessage(update.error)}
      onClose={onClose}
      onConfirm={() => update.mutate({ id: org.id, status: to }, { onSuccess: () => { toast.success(suspend ? `${org.organizationName} suspendida` : `${org.organizationName} reactivada`); onClose() } })}
    />
  )
}

function RatingDialog({ kind, org, onClose }: { kind: OrgKind; org: Org; onClose: () => void }) {
  const update = useUpdateOrg(kind)
  const [local, setLocal] = useState<string | null>(null)
  return (
    <FormDialog
      title={`Calificación de ${org.organizationName}`}
      description="De 0 a 5 con hasta 2 decimales. Déjala vacía para «sin calificaciones»: nunca se inventa un valor."
      fields={[{ name: 'rating', label: 'Calificación', type: 'number', min: 0, step: '0.01', wide: true }]}
      initial={{ rating: org.rating === null ? '' : String(org.rating) }}
      busy={update.isPending}
      error={local ?? errorMessage(update.error)}
      onClose={onClose}
      onSubmit={(v: Values) => {
        const parsed = parseRating(String(v.rating))
        if (!parsed.ok) return setLocal(parsed.error)
        setLocal(null)
        update.mutate({ id: org.id, rating: parsed.value }, { onSuccess: () => { toast.success('Calificación actualizada'); onClose() } })
      }}
    />
  )
}

/** Carga el detalle (el NIF no viene en el listado) y abre el formulario de identidad. */
function EditIdentity({ kind, org, onClose }: { kind: OrgKind; org: Org; onClose: () => void }) {
  const detail = useOrg(kind, org.id)
  const update = useUpdateOrg(kind)
  if (!detail.data) return null
  const d = detail.data
  return (
    <FormDialog
      title={`Datos de ${org.organizationName}`}
      description="Identidad de la empresa: solo el administrador del ecosistema puede cambiarla."
      fields={[
        { name: 'organizationName', label: 'Razón social', required: true, wide: true },
        { name: 'taxId', label: 'Identificación tributaria', hint: 'RUC / NIT / CUIT. No puede repetirse en el mismo país.' },
        { name: 'countryCode', label: 'País', type: 'select', required: true, options: countryOptions() },
      ]}
      initial={{ organizationName: d.organizationName, taxId: d.taxId ?? '', countryCode: d.countryCode }}
      busy={update.isPending}
      error={errorMessage(update.error)}
      onClose={onClose}
      onSubmit={(v) => update.mutate({ id: org.id, organizationName: String(v.organizationName).trim(), taxId: opt(v.taxId) ?? null, countryCode: String(v.countryCode) }, { onSuccess: () => { toast.success('Datos actualizados'); onClose() } })}
    />
  )
}

function MembersDialog({ kind, org, onClose }: { kind: OrgKind; org: Org; onClose: () => void }) {
  const members = useOrgMembers(kind, org.id)
  const add = useAddOrgMember(kind, org.id)
  const remove = useRemoveOrgMember(kind, org.id)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'OWNER' | 'MEMBER'>('OWNER')
  const noOwner = members.data && !members.data.some((m) => m.role === 'OWNER')

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Responsables de {org.organizationName}</DialogTitle>
          <DialogDescription>Quién gestiona esta empresa en su portal. El responsable (OWNER) además agrega y quita personas.</DialogDescription>
        </DialogHeader>

        {noOwner && (
          <p role="status" className="flex items-start gap-2 rounded-lg border border-fur-orange-500 bg-fur-orange-500/10 p-3 text-sm">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-fur-orange-500" aria-hidden />
            Esta empresa no tiene responsable: nadie puede gestionarla desde el portal. Asigna a una persona con cuenta.
          </p>
        )}

        {members.isLoading ? (
          <Loading rows={2} />
        ) : members.isError ? (
          <Failed what="los miembros" onRetry={() => void members.refetch()} />
        ) : members.data && members.data.length > 0 ? (
          <ul className="divide-y divide-border rounded-lg border border-border text-sm">
            {members.data.map((m) => (
              <li key={m.userId} className="flex items-center gap-3 px-3 py-2">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-fur-navy-900">{m.firstName} {m.lastName}</span>
                  <span className="block truncate text-xs text-muted-foreground">{m.email} · desde {formatDate(m.createdAt)}</span>
                </span>
                <Pill label={m.role === 'OWNER' ? 'Responsable' : 'Miembro'} color={m.role === 'OWNER' ? 'var(--fur-navy-700)' : 'var(--fur-steel-500)'} />
                <Button size="xs" variant="outline" aria-label={`Quitar a ${m.email}`} disabled={remove.isPending} onClick={() => remove.mutate(m.userId, { onSuccess: () => toast.success('Persona quitada'), onError: (e) => toast.error(errorMessage(e) ?? 'No se pudo quitar') })}>
                  <Trash2 /> Quitar
                </Button>
              </li>
            ))}
          </ul>
        ) : null}

        <form
          className="flex flex-wrap items-end gap-2"
          aria-label="Agregar persona"
          onSubmit={(e) => {
            e.preventDefault()
            if (!email.trim()) return
            add.mutate({ email: email.trim(), role }, { onSuccess: () => { toast.success('Persona agregada'); setEmail('') } })
          }}
        >
          <div className="min-w-56 flex-1 space-y-1">
            <label htmlFor="om-email" className="text-xs font-medium">Correo de la persona</label>
            <Input id="om-email" type="email" placeholder="persona@empresa.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="w-40 space-y-1">
            <label htmlFor="om-role" className="text-xs font-medium">Rol</label>
            <select id="om-role" className={selectClass} value={role} onChange={(e) => setRole(e.target.value as 'OWNER' | 'MEMBER')}>
              <option value="OWNER">Responsable</option>
              <option value="MEMBER">Miembro</option>
            </select>
          </div>
          <Button type="submit" disabled={add.isPending || !email.trim()}><UserPlus /> Agregar</Button>
        </form>
        {add.isError && <p role="alert" className="text-sm text-fur-red-500">{errorMessage(add.error)}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CreateDialog({ kind, onClose }: { kind: OrgKind; onClose: () => void }) {
  const create = useCreateOrg(kind)
  return (
    <FormDialog
      title={`Nuevo ${KIND_LABEL[kind].singular}`}
      description="Se crea ya activa. Indica el correo del responsable para que pueda entrar a su portal."
      fields={[
        { name: 'organizationName', label: 'Razón social', required: true, wide: true },
        { name: 'taxId', label: 'Identificación tributaria', hint: 'RUC / NIT / CUIT.' },
        { name: 'countryCode', label: 'País', type: 'select', required: true, options: countryOptions() },
        { name: 'city', label: 'Ciudad' },
        { name: 'contactEmail', label: 'Correo de contacto', type: 'email' },
        { name: 'ownerEmail', label: 'Correo del responsable', type: 'email', placeholder: 'persona@empresa.com', hint: 'La persona debe tener una cuenta registrada.', wide: true },
      ]}
      initial={{ countryCode: 'PE' }}
      submitLabel="Crear"
      busy={create.isPending}
      error={errorMessage(create.error)}
      onClose={onClose}
      onSubmit={(v) =>
        create.mutate(
          { organizationName: String(v.organizationName).trim(), taxId: opt(v.taxId), countryCode: String(v.countryCode), city: opt(v.city), contactEmail: opt(v.contactEmail), ownerEmail: opt(v.ownerEmail) },
          { onSuccess: (o) => { toast.success(`${o.organizationName} creada`); onClose() } },
        )
      }
    />
  )
}

export function OrganizationsPage() {
  const [kind, setKind] = useState<OrgKind>('providers')
  const [status, setStatus] = useState<OrgStatusFilter>('ALL')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [action, setAction] = useState<Action>(null)
  const dash = useEcosystemDashboard()
  const q = useDebouncedValue(search.trim())
  const list = useOrgs(kind, { status, search: q || undefined, page })
  const update = useUpdateOrg(kind)

  const pending = { providers: dash.data?.organizations.providers.pending ?? 0, contractors: dash.data?.organizations.contractors.pending ?? 0 }
  const totals = { providers: dash.data?.organizations.providers.total, contractors: dash.data?.organizations.contractors.total }
  const totalPages = list.data ? Math.max(1, Math.ceil(list.data.total / list.data.pageSize)) : 1
  const close = () => setAction(null)

  const toggleVerified = (o: Org) =>
    update.mutate(
      { id: o.id, verified: !o.verified },
      { onSuccess: () => toast.success(o.verified ? 'Verificación retirada' : `${o.organizationName} verificada`), onError: (e) => toast.error(errorMessage(e) ?? 'No se pudo actualizar') },
    )

  return (
    <>
      <ScreenHeader
        title="Proveedores y contratistas"
        description="Aprueba las solicitudes de registro, verifica, califica y suspende empresas, y asigna a sus responsables."
        actions={<Button onClick={() => setAction({ type: 'create' })}><Plus /> Nuevo {KIND_LABEL[kind].singular}</Button>}
      />

      {pending.providers + pending.contractors > 0 && (
        <p role="status" className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-fur-orange-500 bg-fur-orange-500/10 p-3 text-sm">
          <AlertTriangle className="size-4 text-fur-orange-500" aria-hidden />
          <span className="font-medium">Solicitudes pendientes de aprobación:</span>
          {pending.providers > 0 && <Button size="xs" variant="secondary" onClick={() => { setKind('providers'); setStatus('PENDING'); setPage(1) }}>{pending.providers} proveedor{pending.providers === 1 ? '' : 'es'}</Button>}
          {pending.contractors > 0 && <Button size="xs" variant="secondary" onClick={() => { setKind('contractors'); setStatus('PENDING'); setPage(1) }}>{pending.contractors} contratista{pending.contractors === 1 ? '' : 's'}</Button>}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Segmented<OrgKind>
            label="Tipo de empresa"
            value={kind}
            onChange={(k) => { setKind(k); setPage(1) }}
            options={[
              { value: 'providers', label: 'Proveedores', count: totals.providers },
              { value: 'contractors', label: 'Contratistas', count: totals.contractors },
            ]}
          />
          <Segmented<OrgStatusFilter>
            label="Estado"
            value={status}
            onChange={(s) => { setStatus(s); setPage(1) }}
            options={[
              { value: 'ALL', label: 'Todas' },
              { value: 'PENDING', label: 'Pendientes', count: pending[kind] },
              { value: 'ACTIVE', label: 'Activas' },
              { value: 'SUSPENDED', label: 'Suspendidas' },
            ]}
          />
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fur-gray-500" aria-hidden />
          <Input className="w-64 pl-9" placeholder="Buscar empresa" aria-label="Buscar empresas" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
        </div>
      </div>

      <Panel className="mt-3" flush>
        {list.isLoading ? (
          <div className="p-4"><Loading rows={5} /></div>
        ) : list.isError ? (
          <Failed what="las empresas" onRetry={() => void list.refetch()} />
        ) : list.data && list.data.items.length > 0 ? (
          <>
            <DataTable head={['Empresa', 'Estado', 'Verificación', 'Calificación', kind === 'providers' ? 'Productos activos' : 'Disponibilidad', { label: 'Acciones', right: true }]}>
              {list.data.items.map((o) => (
                <tr key={o.id}>
                  <td className={td}>
                    <p className="font-medium text-fur-navy-900">{o.organizationName}</p>
                    <p className="text-xs text-muted-foreground">{[o.city, countryName(o.countryCode)].filter(Boolean).join(', ')}</p>
                  </td>
                  <td className={td}><Pill label={ORG_STATUS_LABELS[o.status]} color={STATUS_COLOR[o.status]} icon={o.status === 'ACTIVE' ? CheckCircle2 : o.status === 'SUSPENDED' ? Pause : AlertTriangle} /></td>
                  <td className={td}>{o.verified ? <Pill label="Verificada" color="var(--fur-green-500)" icon={BadgeCheck} /> : <span className="text-xs text-muted-foreground">Sin verificar</span>}</td>
                  <td className={td}><span className="inline-flex items-center gap-1 text-sm"><Star className={o.rating === null ? 'size-3.5 text-fur-gray-500' : 'size-3.5 fill-fur-orange-500 text-fur-orange-500'} aria-hidden />{ratingText(o.rating)}</span></td>
                  <td className={`${td} tabular-nums`}>{kind === 'providers' ? (o.activeListings ?? 0) : o.availability ? contractorAvailabilityLabel(o.availability) : '—'}</td>
                  <td className={`${td} text-right`}>
                    <div className="flex flex-wrap justify-end gap-1.5">
                      {o.status === 'PENDING' && <Button size="xs" onClick={() => setAction({ type: 'approve', org: o })}><CheckCircle2 /> Aprobar</Button>}
                      {o.status === 'ACTIVE' && <Button size="xs" variant="outline" onClick={() => setAction({ type: 'suspend', org: o })}><Pause /> Suspender</Button>}
                      {o.status === 'SUSPENDED' && <Button size="xs" variant="secondary" onClick={() => setAction({ type: 'reactivate', org: o })}>Reactivar</Button>}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="xs" variant="secondary" aria-label={`Gestionar ${o.organizationName}`}>Gestionar <ChevronDown /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => setAction({ type: 'members', org: o })}><Users /> Responsables y equipo</DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => toggleVerified(o)}><BadgeCheck /> {o.verified ? 'Quitar verificación' : 'Verificar'}</DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => setAction({ type: 'rating', org: o })}><Star /> Calificar</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onSelect={() => setAction({ type: 'edit', org: o })}><Pencil /> Editar datos</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </tr>
              ))}
            </DataTable>
            <div className="flex items-center justify-between border-t border-border px-4 py-2 text-xs text-muted-foreground">
              <span>{list.data.total} empresa{list.data.total === 1 ? '' : 's'} · página {list.data.page} de {totalPages}</span>
              <span className="flex gap-2">
                <Button size="xs" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
                <Button size="xs" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Siguiente</Button>
              </span>
            </div>
          </>
        ) : (
          <Empty>{status === 'PENDING' ? 'No hay solicitudes pendientes.' : 'No hay empresas con estos filtros.'}</Empty>
        )}
      </Panel>

      {action?.type === 'create' && <CreateDialog kind={kind} onClose={close} />}
      {action?.type === 'approve' && <ApproveDialog kind={kind} org={action.org} onClose={close} />}
      {action?.type === 'suspend' && <StatusDialog kind={kind} org={action.org} to="SUSPENDED" onClose={close} />}
      {action?.type === 'reactivate' && <StatusDialog kind={kind} org={action.org} to="ACTIVE" onClose={close} />}
      {action?.type === 'rating' && <RatingDialog kind={kind} org={action.org} onClose={close} />}
      {action?.type === 'members' && <MembersDialog kind={kind} org={action.org} onClose={close} />}
      {action?.type === 'edit' && <EditIdentity kind={kind} org={action.org} onClose={close} />}
    </>
  )
}
