import { Info } from 'lucide-react'
import { Empty, Failed, Loading, Panel, ScreenHeader } from '@/components/kit'
import { useNetworkMasters, useStageMasters } from '@/features/catalog/use-catalog'

export function MastersPage() {
  const stages = useStageMasters()
  const networks = useNetworkMasters()
  const groups = [...new Set((stages.data ?? []).map((s) => s.stageGroup))]

  return (
    <>
      <ScreenHeader title="Etapas y redes maestras" description="Catálogo común a todas las plantas. Cada planta habilita solo las que le corresponden." />

      <p className="mb-4 flex items-start gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0 text-fur-blue-500" aria-hidden />
        Las etapas (D01–D20) y las redes (FUR-…) son parte de la arquitectura del ecosistema y aquí son de solo lectura. Para habilitarlas o ocultarlas en una planta, ve a <strong className="font-semibold text-fur-navy-900">Plantas → Administrar</strong>.
      </p>

      <Panel title="Redes transversales" subtitle={networks.data ? `${networks.data.length} redes maestras` : undefined}>
        {networks.isLoading ? (
          <Loading rows={2} />
        ) : networks.isError ? (
          <Failed what="las redes" onRetry={() => void networks.refetch()} />
        ) : networks.data && networks.data.length > 0 ? (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {networks.data.map((n) => (
              <li key={n.id} className="rounded-lg border border-border border-l-4 bg-card p-3" style={{ borderLeftColor: n.colorToken ? `var(--${n.colorToken})` : undefined }}>
                <p className="fur-code text-[11px] text-muted-foreground">{n.code}</p>
                <p className="font-semibold text-fur-navy-900">{n.name}</p>
                {n.description && <p className="mt-1 line-clamp-2 text-xs text-fur-gray-600">{n.description}</p>}
              </li>
            ))}
          </ul>
        ) : (
          <Empty>No hay redes maestras.</Empty>
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
    </>
  )
}
