import { ImageIcon, Pencil, Plus, Search } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { FormDialog, type Field, type Values } from '@/components/form-dialog'
import { errorMessage, selectClass } from '@/lib/forms'
import { DataTable, Empty, Failed, Loading, Panel, Pill, ScreenHeader, Segmented, td } from '@/components/kit'
import { ModelImagePicker, type ImageChange } from '@/components/model-image-picker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  useCreateFamily,
  useCreateManufacturer,
  useCreateModel,
  useCreateType,
  useFamilies,
  useManufacturers,
  useModels,
  useTypes,
  useUpdateFamily,
  useUpdateManufacturer,
  useUpdateModel,
  useRemoveModelImage,
  useUpdateType,
  useUploadModelImage,
  type AssetType,
  type Family,
  type Manufacturer,
  type Model,
} from '@/features/catalog/use-catalog'
import { cn } from '@/lib/utils'
import { apiUrl } from '@/lib/api'
import { useDebouncedValue } from '@/lib/use-debounced-value'

type Tab = 'families' | 'types' | 'manufacturers' | 'models'

const opt = (v: string | boolean) => (String(v).trim() === '' ? undefined : String(v).trim())
const nul = (v: string | boolean) => (String(v).trim() === '' ? null : String(v).trim())
const upper = (v: string | boolean) => String(v).trim().toUpperCase()

/** Tarjeta de sección con botón de alta y tabla; el contenido lo decide cada pestaña. */
function Section({ title, subtitle, addLabel, onAdd, children }: { title: string; subtitle: string; addLabel: string; onAdd: () => void; children: React.ReactNode }) {
  return (
    <Panel title={title} subtitle={subtitle} flush action={<Button size="xs" onClick={onAdd}><Plus /> {addLabel}</Button>}>
      {children}
    </Panel>
  )
}

function FamiliesTab() {
  const q = useFamilies()
  const create = useCreateFamily()
  const update = useUpdateFamily()
  const [form, setForm] = useState<{ row?: Family } | null>(null)
  const editing = form?.row
  const m = editing ? update : create
  const fields: Field[] = [
    { name: 'code', label: 'Código', required: true, disabled: !!editing, placeholder: 'ROTATING', hint: 'Mayúsculas, números y guion bajo. No se puede cambiar.' },
    { name: 'name', label: 'Nombre', required: true },
    { name: 'icon', label: 'Icono', placeholder: 'cog', hint: 'Nombre corto del icono (opcional).' },
    { name: 'description', label: 'Descripción', type: 'textarea' },
  ]
  const submit = (v: Values) => {
    const done = { onSuccess: () => { toast.success(editing ? 'Familia actualizada' : 'Familia creada'); setForm(null) } }
    if (editing) update.mutate({ id: editing.id, name: String(v.name).trim(), icon: nul(v.icon), description: nul(v.description) }, done)
    else create.mutate({ code: upper(v.code), name: String(v.name).trim(), icon: opt(v.icon), description: opt(v.description) }, done)
  }
  return (
    <>
      <Section title="Familias de activos" subtitle="Agrupan los tipos (rotativos, eléctricos, instrumentación…)." addLabel="Nueva familia" onAdd={() => { create.reset(); update.reset(); setForm({}) }}>
        {q.isLoading ? <div className="p-4"><Loading rows={5} /></div> : q.isError ? <Failed what="las familias" onRetry={() => void q.refetch()} /> : q.data && q.data.length > 0 ? (
          <DataTable head={['Código', 'Nombre', 'Icono', { label: '', right: true }]}>
            {q.data.map((f) => (
              <tr key={f.id}>
                <td className={`${td} fur-code text-xs`}>{f.code}</td>
                <td className={`${td} font-medium text-fur-navy-900`}>{f.name}</td>
                <td className={td}>{f.icon ?? '—'}</td>
                <td className={`${td} text-right`}><Button size="xs" variant="secondary" aria-label={`Editar ${f.name}`} onClick={() => { update.reset(); setForm({ row: f }) }}><Pencil /> Editar</Button></td>
              </tr>
            ))}
          </DataTable>
        ) : <Empty>No hay familias.</Empty>}
      </Section>
      {form && <FormDialog title={editing ? `Editar familia ${editing.code}` : 'Nueva familia'} fields={fields} initial={editing ? { code: editing.code, name: editing.name, icon: editing.icon ?? '' } : {}} busy={m.isPending} error={errorMessage(m.error)} onClose={() => setForm(null)} onSubmit={submit} />}
    </>
  )
}

function TypesTab() {
  const q = useTypes()
  const families = useFamilies()
  const create = useCreateType()
  const update = useUpdateType()
  const [form, setForm] = useState<{ row?: AssetType } | null>(null)
  const editing = form?.row
  const m = editing ? update : create
  const fields: Field[] = [
    { name: 'familyCode', label: 'Familia', type: 'select', required: true, options: (families.data ?? []).map((f) => ({ value: f.code, label: f.name })) },
    { name: 'code', label: 'Código', required: true, disabled: !!editing, placeholder: 'PUMP_CENTRIFUGAL', hint: 'No se puede cambiar.' },
    { name: 'name', label: 'Nombre', required: true, wide: true },
  ]
  const submit = (v: Values) => {
    const done = { onSuccess: () => { toast.success(editing ? 'Tipo actualizado' : 'Tipo creado'); setForm(null) } }
    if (editing) update.mutate({ id: editing.id, name: String(v.name).trim(), familyCode: String(v.familyCode) }, done)
    else create.mutate({ familyCode: String(v.familyCode), code: upper(v.code), name: String(v.name).trim() }, done)
  }
  return (
    <>
      <Section title="Tipos de activo" subtitle="Qué clase de equipo es (bomba centrífuga, molino, chancadora…)." addLabel="Nuevo tipo" onAdd={() => { create.reset(); update.reset(); setForm({}) }}>
        {q.isLoading ? <div className="p-4"><Loading rows={5} /></div> : q.isError ? <Failed what="los tipos" onRetry={() => void q.refetch()} /> : q.data && q.data.length > 0 ? (
          <DataTable head={['Código', 'Tipo', 'Familia', { label: '', right: true }]}>
            {q.data.map((t) => (
              <tr key={t.id}>
                <td className={`${td} fur-code text-xs`}>{t.code}</td>
                <td className={`${td} font-medium text-fur-navy-900`}>{t.name}</td>
                <td className={td}>{t.familyName}</td>
                <td className={`${td} text-right`}><Button size="xs" variant="secondary" aria-label={`Editar ${t.name}`} onClick={() => { update.reset(); setForm({ row: t }) }}><Pencil /> Editar</Button></td>
              </tr>
            ))}
          </DataTable>
        ) : <Empty>No hay tipos.</Empty>}
      </Section>
      {form && <FormDialog title={editing ? `Editar tipo ${editing.code}` : 'Nuevo tipo'} fields={fields} initial={editing ? { familyCode: editing.familyCode, code: editing.code, name: editing.name } : {}} busy={m.isPending} error={errorMessage(m.error)} onClose={() => setForm(null)} onSubmit={submit} />}
    </>
  )
}

function ManufacturersTab() {
  const q = useManufacturers()
  const create = useCreateManufacturer()
  const update = useUpdateManufacturer()
  const [form, setForm] = useState<{ row?: Manufacturer } | null>(null)
  const editing = form?.row
  const m = editing ? update : create
  const fields: Field[] = [
    { name: 'name', label: 'Nombre', required: true },
    { name: 'countryCode', label: 'País (2 letras)', placeholder: 'SE' },
    { name: 'website', label: 'Sitio web', type: 'url', placeholder: 'https://…', wide: true },
  ]
  const submit = (v: Values) => {
    const done = { onSuccess: () => { toast.success(editing ? 'Fabricante actualizado' : 'Fabricante creado'); setForm(null) } }
    if (editing) update.mutate({ id: editing.id, name: String(v.name).trim(), countryCode: nul(v.countryCode), website: nul(v.website) }, done)
    else create.mutate({ name: String(v.name).trim(), countryCode: opt(v.countryCode), website: opt(v.website) }, done)
  }
  return (
    <>
      <Section title="Fabricantes" subtitle="Marcas de los modelos del catálogo." addLabel="Nuevo fabricante" onAdd={() => { create.reset(); update.reset(); setForm({}) }}>
        {q.isLoading ? <div className="p-4"><Loading rows={5} /></div> : q.isError ? <Failed what="los fabricantes" onRetry={() => void q.refetch()} /> : q.data && q.data.length > 0 ? (
          <DataTable head={['Fabricante', 'País', { label: '', right: true }]}>
            {q.data.map((f) => (
              <tr key={f.id}>
                <td className={`${td} font-medium text-fur-navy-900`}>{f.name}</td>
                <td className={td}>{f.countryCode ?? '—'}</td>
                <td className={`${td} text-right`}><Button size="xs" variant="secondary" aria-label={`Editar ${f.name}`} onClick={() => { update.reset(); setForm({ row: f }) }}><Pencil /> Editar</Button></td>
              </tr>
            ))}
          </DataTable>
        ) : <Empty>No hay fabricantes.</Empty>}
      </Section>
      {form && <FormDialog title={editing ? `Editar ${editing.name}` : 'Nuevo fabricante'} fields={fields} initial={editing ? { name: editing.name, countryCode: editing.countryCode ?? '' } : {}} busy={m.isPending} error={errorMessage(m.error)} onClose={() => setForm(null)} onSubmit={submit} />}
    </>
  )
}

function ModelsTab() {
  const types = useTypes()
  const manufacturers = useManufacturers()
  const families = useFamilies()
  const create = useCreateModel()
  const update = useUpdateModel()
  const uploadImage = useUploadModelImage()
  const removeImage = useRemoveModelImage()
  const [image, setImage] = useState<ImageChange>({ file: null, remove: false })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [family, setFamily] = useState('')
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE' | 'ALL'>('ALL')
  const [page, setPage] = useState(1)
  const q = useModels({ search: useDebouncedValue(search.trim()) || undefined, family: family || undefined, status, page })
  const [form, setForm] = useState<{ row?: Model } | null>(null)
  const editing = form?.row
  const mfOptions = (manufacturers.data ?? []).map((f) => ({ value: f.id, label: f.name }))
  const fields: Field[] = editing
    ? [
        { name: 'modelName', label: 'Modelo', required: true, wide: true },
        { name: 'manufacturerId', label: 'Fabricante', type: 'select', options: mfOptions },
        { name: 'status', label: 'Estado', type: 'select', required: true, options: [{ value: 'ACTIVE', label: 'Activo' }, { value: 'INACTIVE', label: 'Inactivo' }], hint: 'Los modelos se desactivan, no se borran: hay activos que los usan.' },
      ]
    : [
        { name: 'typeCode', label: 'Tipo de activo', type: 'select', required: true, options: (types.data ?? []).map((t) => ({ value: t.code, label: `${t.familyName} · ${t.name}` })), wide: true },
        { name: 'modelName', label: 'Modelo', required: true, placeholder: 'Ej. HM 300', wide: true },
        { name: 'manufacturerId', label: 'Fabricante', type: 'select', options: mfOptions, wide: true },
      ]
  /** Guarda el modelo y, después, aplica el cambio de foto. Si la foto falla, el modelo ya quedó guardado y se avisa. */
  async function submit(v: Values) {
    setSaving(true)
    setSaveError(null)
    try {
      let id = editing?.id
      if (editing) {
        await update.mutateAsync({ id: editing.id, modelName: String(v.modelName).trim(), manufacturerId: nul(v.manufacturerId), status: v.status as 'ACTIVE' | 'INACTIVE' })
      } else {
        id = (await create.mutateAsync({ typeCode: String(v.typeCode), modelName: String(v.modelName).trim(), manufacturerId: opt(v.manufacturerId) })).id
      }
      try {
        if (id && image.file) await uploadImage.mutateAsync({ id, file: image.file })
        else if (id && image.remove) await removeImage.mutateAsync(id)
      } catch (e) {
        toast.error(`${editing ? 'Modelo actualizado' : 'Modelo creado'}, pero la foto no se pudo guardar: ${errorMessage(e) ?? 'error desconocido'}`)
        setForm(null)
        return
      }
      toast.success(editing ? 'Modelo actualizado' : 'Modelo creado')
      setForm(null)
    } catch (e) {
      setSaveError(errorMessage(e))
    } finally {
      setSaving(false)
    }
  }
  const totalPages = q.data ? Math.max(1, Math.ceil(q.data.total / q.data.pageSize)) : 1

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fur-gray-500" aria-hidden />
          <Input className="w-64 pl-9" placeholder="Buscar modelo, tipo o fabricante" aria-label="Buscar modelos" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <select className={cn(selectClass, 'w-48')} aria-label="Familia" value={family} onChange={(e) => { setFamily(e.target.value); setPage(1) }}>
          <option value="">Toda familia</option>
          {(families.data ?? []).map((f) => <option key={f.id} value={f.code}>{f.name}</option>)}
        </select>
        <select className={cn(selectClass, 'w-40')} aria-label="Estado del modelo" value={status} onChange={(e) => { setStatus(e.target.value as typeof status); setPage(1) }}>
          <option value="ALL">Todo estado</option>
          <option value="ACTIVE">Activos</option>
          <option value="INACTIVE">Inactivos</option>
        </select>
      </div>
      <Section title="Modelos" subtitle="Describen qué existe; los activos de cada planta se crean a partir de un modelo." addLabel="Nuevo modelo" onAdd={() => { setImage({ file: null, remove: false }); setSaveError(null); setForm({}) }}>
        {q.isLoading ? <div className="p-4"><Loading rows={6} /></div> : q.isError ? <Failed what="los modelos" onRetry={() => void q.refetch()} /> : q.data && q.data.items.length > 0 ? (
          <>
            <DataTable head={['Foto', 'Modelo', 'Tipo', 'Familia', 'Fabricante', 'Estado', { label: '', right: true }]}>
              {q.data.items.map((r) => (
                <tr key={r.id} className={r.status === 'INACTIVE' ? 'opacity-60' : undefined}>
                  <td className={td}>
                    <span className="grid size-12 place-items-center overflow-hidden rounded-md border border-border bg-white">
                      {r.imageUrl ? <img src={apiUrl(r.imageUrl)} alt={`Foto de ${r.modelName}`} loading="lazy" className="size-full object-contain" /> : <ImageIcon className="size-5 text-fur-gray-500" aria-label="Sin foto" />}
                    </span>
                  </td>
                  <td className={`${td} font-medium text-fur-navy-900`}>{r.modelName}</td>
                  <td className={td}>{r.type.name}</td>
                  <td className={td}>{r.family.name}</td>
                  <td className={td}>{r.manufacturer?.name ?? '—'}</td>
                  <td className={td}><Pill label={r.status === 'ACTIVE' ? 'Activo' : 'Inactivo'} color={r.status === 'ACTIVE' ? 'var(--fur-green-500)' : 'var(--fur-steel-500)'} /></td>
                  <td className={`${td} text-right`}><Button size="xs" variant="secondary" aria-label={`Editar ${r.modelName}`} onClick={() => { setImage({ file: null, remove: false }); setSaveError(null); setForm({ row: r }) }}><Pencil /> Editar</Button></td>
                </tr>
              ))}
            </DataTable>
            <div className="flex items-center justify-between border-t border-border px-4 py-2 text-xs text-muted-foreground">
              <span>{q.data.total} modelos · página {q.data.page} de {totalPages}</span>
              <span className="flex gap-2">
                <Button size="xs" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
                <Button size="xs" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Siguiente</Button>
              </span>
            </div>
          </>
        ) : <Empty>No hay modelos con estos filtros.</Empty>}
      </Section>
      {form && (
        <FormDialog
          title={editing ? `Editar ${editing.modelName}` : 'Nuevo modelo'}
          fields={fields}
          initial={editing ? { modelName: editing.modelName, manufacturerId: editing.manufacturer?.id ?? '', status: editing.status } : {}}
          busy={saving}
          error={saveError}
          extra={<ModelImagePicker currentUrl={editing?.imageUrl ?? null} value={image} onChange={setImage} />}
          onClose={() => setForm(null)}
          onSubmit={(v) => void submit(v)}
        />
      )}
    </>
  )
}

export function CatalogPage() {
  const [tab, setTab] = useState<Tab>('models')
  return (
    <>
      <ScreenHeader title="Catálogo de activos" description="Catálogo maestro global: describe qué existe, no qué posee cada planta. Los códigos son inmutables." />
      <Segmented<Tab>
        label="Catálogo"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'models', label: 'Modelos' },
          { value: 'types', label: 'Tipos' },
          { value: 'families', label: 'Familias' },
          { value: 'manufacturers', label: 'Fabricantes' },
        ]}
      />
      <div className="mt-3">
        {tab === 'models' && <ModelsTab />}
        {tab === 'types' && <TypesTab />}
        {tab === 'families' && <FamiliesTab />}
        {tab === 'manufacturers' && <ManufacturersTab />}
      </div>
    </>
  )
}
