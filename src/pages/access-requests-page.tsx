import { Check, UserPlus, X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { DataTable, Empty, Failed, Loading, Panel, Pill, ScreenHeader, Segmented, td } from '@/components/kit'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  ACCESS_STATUS_LABELS,
  useAccessRequests,
  useApproveAccessRequest,
  useRejectAccessRequest,
  type AccessRequest,
  type AccessRequestFilter,
  type AccessRequestStatus,
} from '@/features/plants/use-access-requests'
import { useAssignableRoles, useAssignMember, usePlants } from '@/features/plants/use-plants'
import { errorMessage, selectClass } from '@/lib/forms'
import { formatDateTime } from '@/lib/format'
import { ROLE_LABELS } from '@/lib/roles'

const STATUS_COLOR: Record<AccessRequestStatus, string> = {
  PENDING: 'var(--fur-orange-500)',
  APPROVED: 'var(--fur-green-500)',
  REJECTED: 'var(--fur-red-500)',
  CANCELLED: 'var(--fur-steel-500)',
}

/** Rol por defecto sugerido: el de menor alcance, para que ampliar el acceso sea una decisión consciente. */
const DEFAULT_ROLE = 'CONSUMER'

function AssignAccessDialog({ onClose }: { onClose: () => void }) {
  const plants = usePlants()
  const [slug, setSlug] = useState('')
  const [email, setEmail] = useState('')
  const [roleCode, setRoleCode] = useState(DEFAULT_ROLE)
  const roles = useAssignableRoles(slug)
  const assign = useAssignMember(slug)
  const validRole = roles.data?.some(role => role.code === roleCode)
  return <Dialog open onOpenChange={open => !open && !assign.isPending && onClose()}>
    <DialogContent>
      <DialogHeader><DialogTitle>Asignar acceso a una planta</DialogTitle><DialogDescription>Asigna una cuenta ya registrada sin esperar una solicitud. El rol determina sus permisos; no es un cargo laboral.</DialogDescription></DialogHeader>
      <form className="space-y-4" onSubmit={event => {
        event.preventDefault()
        if (!slug || !validRole || assign.isPending) return
        assign.mutate({ email: email.trim(), roleCode }, { onSuccess: () => { toast.success('Acceso a planta asignado'); onClose() } })
      }}>
        <div className="space-y-1.5"><Label htmlFor="access-plant">Planta de destino</Label><select id="access-plant" required disabled={assign.isPending} className={selectClass} value={slug} onChange={event => { setSlug(event.target.value); setRoleCode(DEFAULT_ROLE); assign.reset() }}><option value="">Selecciona una planta</option>{plants.data?.map(plant => <option value={plant.slug} key={plant.id}>{plant.name} · {plant.code}</option>)}</select></div>
        {plants.isLoading && <p role="status">Cargando plantas…</p>}
        {plants.isError && <p role="alert">No se pudieron cargar las plantas. <Button type="button" variant="outline" size="sm" onClick={() => void plants.refetch()}>Reintentar</Button></p>}
        {!plants.isLoading && !plants.isError && !plants.data?.length && <p>No hay plantas creadas. Crea una desde Plantas antes de asignar accesos.</p>}
        <div className="space-y-1.5"><Label htmlFor="access-email">Correo del usuario registrado</Label><Input id="access-email" type="email" required disabled={assign.isPending} value={email} onChange={event => setEmail(event.target.value)} placeholder="persona@empresa.com" /></div>
        <div className="space-y-1.5"><Label htmlFor="access-role">Rol en la planta</Label><select id="access-role" className={selectClass} required disabled={!slug || roles.isLoading || roles.isError || assign.isPending} value={validRole ? roleCode : ''} onChange={event => setRoleCode(event.target.value)}><option value="">Selecciona un rol</option>{roles.data?.map(role => <option key={role.code} value={role.code}>{ROLE_LABELS[role.code] ?? role.name}</option>)}</select><p className="text-xs text-muted-foreground">Elige el alcance necesario. «Usuario común» tiene acceso de lectura; presupuesto/costos, mantenimiento y otros roles habilitan sus operaciones.</p></div>
        {slug && roles.isError && <p role="alert">No se pudieron cargar los roles. <Button type="button" variant="outline" size="sm" onClick={() => void roles.refetch()}>Reintentar roles</Button></p>}
        {assign.isError && <p role="alert" className="text-sm text-destructive">{errorMessage(assign.error)}</p>}
        <DialogFooter><Button type="button" variant="outline" disabled={assign.isPending} onClick={onClose}>Cancelar</Button><Button type="submit" disabled={!slug || !email.trim() || !validRole || roles.isError || assign.isPending}>{assign.isPending ? 'Asignando…' : 'Confirmar asignación'}</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
}

function DecideDialog({ request, mode, onClose }: { request: AccessRequest; mode: 'approve' | 'reject'; onClose: () => void }) {
  const approve = useApproveAccessRequest()
  const reject = useRejectAccessRequest()
  const roles = useAssignableRoles(request.plantSlug)
  const [roleCode, setRoleCode] = useState(DEFAULT_ROLE)
  const [note, setNote] = useState('')
  const approving = mode === 'approve'
  const m = approving ? approve : reject
  const person = `${request.firstName} ${request.lastName}`

  function submit() {
    const done = {
      onSuccess: () => {
        toast.success(approving ? `${person} ya tiene acceso a ${request.plantName}` : 'Solicitud rechazada')
        onClose()
      },
    }
    if (approving) approve.mutate({ id: request.id, roleCode, note: note.trim() || undefined }, done)
    else reject.mutate({ id: request.id, note: note.trim() || undefined }, done)
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{approving ? `Aprobar a ${person}` : `Rechazar a ${person}`}</DialogTitle>
          <DialogDescription>
            {approving ? `Se le asignará el rol elegido en ${request.plantName} y podrá entrar al panel de planta.` : `No se le dará acceso a ${request.plantName}. Podrá volver a solicitarlo.`}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {request.message && <p className="rounded-md bg-muted p-3 text-sm"><span className="text-xs font-semibold text-muted-foreground">Mensaje: </span>{request.message}</p>}
          {approving && (
            <div className="space-y-1.5">
              <Label htmlFor="role">Rol en la planta</Label>
              <select id="role" className={selectClass} value={roleCode} onChange={(e) => setRoleCode(e.target.value)}>
                {(roles.data ?? [{ code: DEFAULT_ROLE, name: ROLE_LABELS[DEFAULT_ROLE] }]).map((r) => (
                  <option key={r.code} value={r.code}>{ROLE_LABELS[r.code] ?? r.name}</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">«Usuario común» solo lee. Elige un rol operativo si va a trabajar en la planta.</p>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="note">Nota (opcional)</Label>
            <Textarea id="note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
          </div>
          {m.error && <p role="alert" className="rounded-md bg-fur-red-500/10 p-3 text-sm text-fur-red-500">{errorMessage(m.error)}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button variant={approving ? 'default' : 'destructive'} disabled={m.isPending} onClick={submit}>
            {m.isPending ? 'Guardando…' : approving ? 'Aprobar' : 'Rechazar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function AccessRequestsPage() {
  const [filter, setFilter] = useState<AccessRequestFilter>('PENDING')
  const q = useAccessRequests(filter)
  const [action, setAction] = useState<{ request: AccessRequest; mode: 'approve' | 'reject' } | null>(null)
  const [assigning, setAssigning] = useState(false)
  const rows = q.data ?? []

  return (
    <>
      <ScreenHeader
        title="Solicitudes de acceso a plantas"
        description="Registrarse crea una cuenta, no una solicitud. Aquí aparecen quienes pulsaron Solicitar acceso desde el panel de planta. También puedes asignar una planta y un rol directamente."
        actions={<Button onClick={() => setAssigning(true)}><UserPlus /> Asignar acceso</Button>}
      />

      <Segmented<AccessRequestFilter>
        label="Estado"
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'PENDING', label: 'Pendientes' },
          { value: 'APPROVED', label: 'Aprobadas' },
          { value: 'REJECTED', label: 'Rechazadas' },
          { value: 'ALL', label: 'Todas' },
        ]}
      />

      <Panel className="mt-3" flush>
        {q.isLoading ? (
          <div className="p-4"><Loading rows={4} /></div>
        ) : q.isError ? (
          <Failed what="las solicitudes" onRetry={() => void q.refetch()} />
        ) : rows.length === 0 ? (
          <Empty><div className="space-y-3"><p>{filter === 'PENDING' ? 'No hay solicitudes pendientes.' : 'No hay solicitudes con este filtro.'}</p><p className="max-w-xl text-sm">Los usuarios registrados no aparecen automáticamente en esta lista. Para dar acceso sin solicitud, usa «Asignar acceso» e indica correo, planta y rol.</p><Link className="text-sm font-semibold underline" to="/plants">Ver plantas y miembros</Link></div></Empty>
        ) : (
          <DataTable head={['Persona', 'Planta', 'Mensaje', 'Fecha', 'Estado', { label: 'Acciones', right: true }]}>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className={td}>
                  <p className="font-medium text-fur-navy-900">{r.firstName} {r.lastName}</p>
                  <p className="text-xs text-muted-foreground">{r.email}</p>
                </td>
                <td className={td}>{r.plantName}</td>
                <td className={`${td} max-w-64`}><p className="truncate text-xs text-muted-foreground" title={r.message ?? undefined}>{r.message ?? '—'}</p></td>
                <td className={`${td} text-xs whitespace-nowrap`}>{formatDateTime(r.createdAt)}</td>
                <td className={td}>
                  <Pill label={ACCESS_STATUS_LABELS[r.status]} color={STATUS_COLOR[r.status]} />
                  {r.status === 'APPROVED' && r.roleCode && <p className="mt-0.5 text-xs text-muted-foreground">{ROLE_LABELS[r.roleCode] ?? r.roleCode}</p>}
                  {r.status !== 'PENDING' && r.decidedByEmail && <p className="text-xs text-muted-foreground">por {r.decidedByEmail}</p>}
                </td>
                <td className={`${td} text-right`}>
                  {r.status === 'PENDING' && (
                    <div className="flex justify-end gap-1.5">
                      <Button size="xs" aria-label={`Aprobar a ${r.email} en ${r.plantName}`} onClick={() => setAction({ request: r, mode: 'approve' })}><Check /> Aprobar</Button>
                      <Button size="xs" variant="outline" aria-label={`Rechazar a ${r.email} en ${r.plantName}`} onClick={() => setAction({ request: r, mode: 'reject' })}><X /> Rechazar</Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </DataTable>
        )}
      </Panel>

      {action && <DecideDialog request={action.request} mode={action.mode} onClose={() => setAction(null)} />}
      {assigning && <AssignAccessDialog onClose={() => setAssigning(false)} />}
    </>
  )
}
