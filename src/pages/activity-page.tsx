import { Info, ScrollText } from 'lucide-react'
import { useState } from 'react'
import { DataTable, Empty, Failed, Kpi, Loading, Panel, ScreenHeader, Segmented, td } from '@/components/kit'
import { useEcosystemDashboard } from '@/features/dashboard/use-dashboard'
import { formatDateTime } from '@/lib/format'
import { actionLabel, moduleLabel } from '@/lib/meta'

export function ActivityPage() {
  const q = useEcosystemDashboard()
  const [mod, setMod] = useState('ALL')
  const d = q.data
  const events = d?.audit.recent ?? []
  const modules = [...new Set(events.map((e) => e.module))]
  const rows = events.filter((e) => mod === 'ALL' || e.module === mod)

  return (
    <>
      <ScreenHeader title="Actividad y auditoría" description="Altas, cambios y asignaciones del ecosistema, con quién y cuándo." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Kpi label="Últimas 24 horas" value={d?.audit.last24Hours ?? '—'} icon={ScrollText} />
        <Kpi label="Últimos 7 días" value={d?.audit.last7Days ?? '—'} icon={ScrollText} />
        <Kpi label="Eventos mostrados" value={events.length} icon={ScrollText} hint="Los más recientes registrados" />
      </div>

      {modules.length > 1 && (
        <div className="mt-6">
          <Segmented<string> label="Módulo" value={mod} onChange={setMod} options={[{ value: 'ALL', label: 'Todos', count: events.length }, ...modules.map((m) => ({ value: m, label: moduleLabel(m), count: events.filter((e) => e.module === m).length }))]} />
        </div>
      )}

      <Panel className="mt-3" flush>
        {q.isLoading ? (
          <div className="p-4"><Loading rows={6} /></div>
        ) : q.isError ? (
          <Failed what="la actividad" onRetry={() => void q.refetch()} />
        ) : rows.length > 0 ? (
          <DataTable head={['Fecha', 'Módulo', 'Acción', 'Entidad', 'Usuario']}>
            {rows.map((e) => (
              <tr key={e.id}>
                <td className={`${td} whitespace-nowrap`}>{formatDateTime(e.occurredAt)}</td>
                <td className={td}>{moduleLabel(e.module)}</td>
                <td className={td}>{actionLabel(e.action)}</td>
                <td className={`${td} fur-code text-xs`}>{e.entityType}</td>
                <td className={td}>{e.actor ?? <span className="text-muted-foreground">Sistema</span>}</td>
              </tr>
            ))}
          </DataTable>
        ) : (
          <Empty>No hay actividad registrada.</Empty>
        )}
      </Panel>
      <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        Se muestran los eventos más recientes que entrega la API. Un historial completo con búsqueda y filtros por fecha requiere un endpoint de auditoría que aún no existe.
      </p>
    </>
  )
}
