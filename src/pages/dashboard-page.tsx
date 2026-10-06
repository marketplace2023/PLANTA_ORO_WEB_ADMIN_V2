import { Activity, ArrowRight, BookOpen, Cable, CheckCircle2, Cog, Database, Factory, Plug, ScrollText, ShieldCheck, Users, AlertOctagon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { BarRows, DataTable, Empty, Failed, Kpi, Loading, Panel, Pill, ScreenHeader, td, type BarRow } from '@/components/kit'
import { useEcosystemDashboard } from '@/features/dashboard/use-dashboard'
import { usePlants } from '@/features/plants/use-plants'
import { formatDateTime } from '@/lib/format'
import { actionLabel, moduleLabel, PLANT_STATUS, statusMeta, VISIBILITY } from '@/lib/meta'

export function DashboardPage() {
  const dash = useEcosystemDashboard()
  const plants = usePlants()
  const d = dash.data

  const statusRows: BarRow[] = Object.keys(PLANT_STATUS).map((k) => ({ key: k, label: PLANT_STATUS[k].label, value: d?.plants.byStatus[k] ?? 0, color: PLANT_STATUS[k].color, icon: PLANT_STATUS[k].icon }))
  const visibilityRows: BarRow[] = Object.keys(VISIBILITY).map((k) => ({ key: k, label: VISIBILITY[k].label, value: d?.plants.byVisibility[k] ?? 0, color: VISIBILITY[k].color, icon: VISIBILITY[k].icon }))
  const active = d?.plants.byStatus.ACTIVE ?? 0
  const dbDown = d?.health.database === 'down'

  return (
    <>
      <ScreenHeader title="Resumen del ecosistema" description="Plantas, usuarios, accesos, catálogos y salud del sistema." />

      {dash.isError ? (
        <Panel>
          <Failed what="el resumen del ecosistema" onRetry={() => void dash.refetch()} />
        </Panel>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            <Kpi label="Plantas" value={d?.plants.total ?? '—'} icon={Factory} to="/plants" tone="default" hint={d ? `${active} activas` : undefined} />
            <Kpi label="Usuarios" value={d?.users.total ?? '—'} icon={Users} hint={d ? `${d.users.activeLast30Days} con sesión en 30 días · ${d.users.globalAdmins} admin.` : undefined} />
            <Kpi label="Roles y permisos" value={d?.access.roles ?? '—'} icon={ShieldCheck} hint={d ? `${d.access.permissions} permisos · ${d.access.assignments} asignaciones` : undefined} />
            <Kpi label="Modelos de catálogo" value={d?.catalog.models ?? '—'} icon={BookOpen} to="/catalog" hint={d ? `${d.catalog.families} familias · ${d.catalog.types} tipos · ${d.catalog.manufacturers} fabricantes` : undefined} />
            <Kpi label="Etapas y redes" value={d ? `${d.masters.stages} / ${d.masters.networks}` : '—'} icon={Cog} to="/masters" hint="Maestras: etapas / redes" />
            <Kpi label="Actividad 24 h" value={d?.audit.last24Hours ?? '—'} icon={ScrollText} to="/activity" hint={d ? `${d.audit.last7Days} en 7 días` : undefined} />
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <Panel title="Plantas por estado">{dash.isLoading ? <Loading rows={3} /> : <BarRows rows={statusRows} empty="No hay plantas" />}</Panel>
            <Panel title="Plantas por visibilidad">{dash.isLoading ? <Loading rows={3} /> : <BarRows rows={visibilityRows} empty="No hay plantas" />}</Panel>
            <Panel title="Estado del sistema" subtitle={d ? `Actualizado ${formatDateTime(d.generatedAt)}` : undefined}>
              {dash.isLoading || !d ? (
                <Loading rows={3} />
              ) : (
                <ul className="space-y-3 text-sm">
                  <li className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2"><Activity className="size-4 text-fur-gray-500" aria-hidden /> API</span>
                    <Pill label="En línea" color="var(--fur-green-500)" icon={CheckCircle2} />
                  </li>
                  <li className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2"><Database className="size-4 text-fur-gray-500" aria-hidden /> Base de datos</span>
                    {dbDown ? <Pill label="Caída" color="var(--fur-red-500)" icon={AlertOctagon} /> : <Pill label={`${d.health.latencyMs} ms`} color="var(--fur-green-500)" icon={CheckCircle2} />}
                  </li>
                  <li className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2"><Plug className="size-4 text-fur-gray-500" aria-hidden /> Integraciones</span>
                    <span className="text-xs text-muted-foreground">Aún no hay integraciones externas</span>
                  </li>
                  <li className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2"><Cable className="size-4 text-fur-gray-500" aria-hidden /> Redes maestras</span>
                    <span className="font-semibold text-fur-navy-900 tabular-nums">{d.masters.networks}</span>
                  </li>
                </ul>
              )}
            </Panel>
          </div>

          {d && d.access.pendingRequests > 0 && (
            <Panel className="mt-6" title="Requiere tu atención">
              <Link to="/access-requests" className="flex flex-wrap items-center gap-2 text-sm text-fur-gray-900 hover:underline">
                <AlertOctagon className="size-4 text-fur-orange-500" aria-hidden />
                <span>{d.access.pendingRequests} solicitud{d.access.pendingRequests === 1 ? '' : 'es'} de acceso a plantas pendiente{d.access.pendingRequests === 1 ? '' : 's'}</span>
                <span className="ml-auto inline-flex items-center gap-1 font-semibold text-fur-navy-900">Revisar <ArrowRight className="size-3.5" /></span>
              </Link>
            </Panel>
          )}

          {d && d.organizations.providers.pending + d.organizations.contractors.pending > 0 && (
            <Panel className="mt-6" title="Requiere tu atención">
              <Link to="/organizations" className="flex flex-wrap items-center gap-2 text-sm text-fur-gray-900 hover:underline">
                <AlertOctagon className="size-4 text-fur-orange-500" aria-hidden />
                {d.organizations.providers.pending > 0 && <span>{d.organizations.providers.pending} proveedor{d.organizations.providers.pending === 1 ? '' : 'es'} pendiente{d.organizations.providers.pending === 1 ? '' : 's'} de aprobación</span>}
                {d.organizations.contractors.pending > 0 && <span>{d.organizations.contractors.pending} contratista{d.organizations.contractors.pending === 1 ? '' : 's'} pendiente{d.organizations.contractors.pending === 1 ? '' : 's'} de aprobación</span>}
                <span className="ml-auto inline-flex items-center gap-1 font-semibold text-fur-navy-900">Revisar <ArrowRight className="size-3.5" /></span>
              </Link>
            </Panel>
          )}

          {dbDown && (
            <Panel className="mt-6" title="Requiere tu atención">
              <p className="flex items-center gap-2 text-sm text-fur-red-500"><AlertOctagon className="size-4" aria-hidden /> La base de datos no responde. Las plantas no podrán operar hasta que se restablezca.</p>
            </Panel>
          )}

          <div className="mt-6 grid gap-4 lg:grid-cols-5">
            <Panel title="Plantas" className="lg:col-span-2" flush action={<Link to="/plants" className="inline-flex items-center gap-1 text-xs font-semibold text-fur-navy-900 hover:underline">Administrar <ArrowRight className="size-3.5" /></Link>}>
              {plants.isLoading ? (
                <div className="p-4"><Loading rows={4} /></div>
              ) : plants.isError ? (
                <Failed what="las plantas" onRetry={() => void plants.refetch()} />
              ) : plants.data && plants.data.length > 0 ? (
                <ul className="divide-y divide-border">
                  {plants.data.map((p) => {
                    const st = statusMeta(p.status)
                    return (
                      <li key={p.id}>
                        <Link to={`/plants/${p.slug}`} className="flex items-center gap-3 px-4 py-2.5 text-sm outline-none hover:bg-muted focus-visible:bg-muted">
                          <span className="grid size-8 shrink-0 place-items-center rounded-md bg-fur-navy-900 text-[10px] font-bold text-fur-gold-400">{p.code.slice(0, 3)}</span>
                          <span className="min-w-0 flex-1"><span className="block truncate font-medium text-fur-navy-900">{p.name}</span><span className="fur-code text-xs text-muted-foreground">{p.code}</span></span>
                          <Pill label={st.label} color={st.color} icon={st.icon} />
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <Empty>Aún no hay plantas.</Empty>
              )}
            </Panel>

            <Panel title="Actividad reciente" subtitle="Últimos eventos de auditoría" className="lg:col-span-3" flush action={<Link to="/activity" className="inline-flex items-center gap-1 text-xs font-semibold text-fur-navy-900 hover:underline">Ver todo <ArrowRight className="size-3.5" /></Link>}>
              {dash.isLoading ? (
                <div className="p-4"><Loading rows={4} /></div>
              ) : d && d.audit.recent.length > 0 ? (
                <DataTable head={['Fecha', 'Módulo', 'Acción', 'Entidad', 'Usuario']}>
                  {d.audit.recent.slice(0, 6).map((e) => (
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
                <Empty>Sin actividad reciente.</Empty>
              )}
            </Panel>
          </div>
        </>
      )}
    </>
  )
}
