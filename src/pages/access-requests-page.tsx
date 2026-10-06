import { Check, X } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { DataTable, Empty, Failed, Loading, Panel, Pill, ScreenHeader, Segmented, td } from '@/components/kit'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
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
import { useAssignableRoles } from '@/features/plants/use-plants'
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
  const rows = q.data ?? []

  return (
    <>
      <ScreenHeader
        title="Solicitudes de acceso a plantas"
        description="Quien se registra en el panel de planta pide acceso a una planta. Al aprobar eliges el rol; mientras esté pendiente no puede hacer nada."
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
          <Empty>{filter === 'PENDING' ? 'No hay solicitudes pendientes.' : 'No hay solicitudes con este filtro.'}</Empty>
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
    </>
  )
}
