import { Plus, Search, Settings2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { DataTable, Empty, Failed, Loading, Panel, Pill, ScreenHeader, Segmented, td } from '@/components/kit'
import { FormDialog, type Field, type Values } from '@/components/form-dialog'
import { errorMessage } from '@/lib/forms'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCreatePlant, usePlants, type PlantCreate, type Visibility } from '@/features/plants/use-plants'
import { COMMON_TIMEZONES, statusMeta, VISIBILITY, visibilityMeta } from '@/lib/meta'

type View = 'ALL' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED'

const opt = (v: string) => (v.trim() === '' ? undefined : v.trim())

const plantCreateFields: Field[] = [
  { name: 'code', label: 'Código', required: true, placeholder: 'REV-II', hint: 'Identificador corto y único. No se puede cambiar después.' },
  { name: 'name', label: 'Nombre', required: true, placeholder: 'REVEMIN II' },
  { name: 'slug', label: 'Slug (URL)', placeholder: 'revemin-ii', hint: 'Opcional: minúsculas, números y guiones. Si lo dejas vacío se genera del nombre.' },
  { name: 'countryCode', label: 'País (2 letras)', placeholder: 'PE' },
  { name: 'timezone', label: 'Zona horaria', type: 'select', options: COMMON_TIMEZONES.map((t) => ({ value: t, label: t })) },
  {
    name: 'visibility',
    label: 'Visibilidad',
    type: 'select',
    required: true,
    options: (Object.keys(VISIBILITY) as Visibility[]).map((v) => ({ value: v, label: VISIBILITY[v].label })),
    hint: 'Privada por defecto: publicar una planta es una decisión explícita.',
  },
  { name: 'description', label: 'Descripción', type: 'textarea' },
]

export function PlantsPage() {
  const plants = usePlants()
  const create = useCreatePlant()
  const navigate = useNavigate()
  const [view, setView] = useState<View>('ALL')
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)

  const all = plants.data ?? []
  const count = (s: string) => all.filter((p) => p.status === s).length
  const q = search.trim().toLowerCase()
  const rows = all.filter((p) => (view === 'ALL' || p.status === view) && (!q || `${p.name} ${p.code} ${p.slug}`.toLowerCase().includes(q)))

  function submit(v: Values) {
    const input: PlantCreate = {
      code: String(v.code).trim(),
      name: String(v.name).trim(),
      slug: opt(String(v.slug)),
      description: opt(String(v.description)),
      countryCode: opt(String(v.countryCode)),
      timezone: opt(String(v.timezone)),
      visibility: v.visibility as Visibility,
    }
    create.mutate(input, {
      onSuccess: (p) => {
        toast.success(`Planta ${p.name} creada`)
        setCreating(false)
        navigate(`/plants/${p.slug}`)
      },
    })
  }

  return (
    <>
      <ScreenHeader
        title="Plantas"
        description="Crea y configura las plantas del ecosistema. Cada planta es independiente: su operación no se ve desde otra."
        actions={
          <Button onClick={() => { create.reset(); setCreating(true) }}>
            <Plus /> Nueva planta
          </Button>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented<View>
          label="Estado"
          value={view}
          onChange={setView}
          options={[
            { value: 'ALL', label: 'Todas', count: all.length },
            { value: 'ACTIVE', label: 'Activas', count: count('ACTIVE') },
            { value: 'INACTIVE', label: 'Inactivas', count: count('INACTIVE') },
            { value: 'ARCHIVED', label: 'Archivadas', count: count('ARCHIVED') },
          ]}
        />
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fur-gray-500" aria-hidden />
          <Input className="w-64 pl-9" placeholder="Buscar planta" aria-label="Buscar plantas" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <Panel className="mt-3" flush>
        {plants.isLoading ? (
          <div className="p-4"><Loading rows={5} /></div>
        ) : plants.isError ? (
          <Failed what="las plantas" onRetry={() => void plants.refetch()} />
        ) : rows.length > 0 ? (
          <DataTable head={['Planta', 'País', 'Zona horaria', 'Estado', 'Visibilidad', { label: '', right: true }]}>
            {rows.map((p) => {
              const st = statusMeta(p.status)
              const vis = visibilityMeta(p.visibility)
              return (
                <tr key={p.id}>
                  <td className={td}>
                    <Link to={`/plants/${p.slug}`} className="font-medium text-fur-navy-900 hover:underline">{p.name}</Link>
                    <p className="fur-code text-xs text-muted-foreground">{p.code} · /{p.slug}</p>
                  </td>
                  <td className={td}>{p.countryCode ?? <span className="text-muted-foreground">Sin definir</span>}</td>
                  <td className={td}>{p.timezone}</td>
                  <td className={td}><Pill label={st.label} color={st.color} icon={st.icon} /></td>
                  <td className={td}><Pill label={vis.label} color={vis.color} icon={vis.icon} /></td>
                  <td className={`${td} text-right`}>
                    <Button asChild size="xs" variant="secondary">
                      <Link to={`/plants/${p.slug}`}><Settings2 /> Administrar</Link>
                    </Button>
                  </td>
                </tr>
              )
            })}
          </DataTable>
        ) : (
          <Empty>{all.length === 0 ? 'Aún no hay plantas. Crea la primera.' : 'No hay plantas con estos filtros.'}</Empty>
        )}
      </Panel>

      {creating && (
        <FormDialog
          title="Nueva planta"
          description="Se crea privada y sin etapas habilitadas. Después podrás asignar responsables y configurar su proceso."
          fields={plantCreateFields}
          initial={{ visibility: 'PRIVATE', timezone: 'America/Lima' }}
          submitLabel="Crear planta"
          busy={create.isPending}
          error={errorMessage(create.error)}
          onClose={() => setCreating(false)}
          onSubmit={submit}
        />
      )}
    </>
  )
}
