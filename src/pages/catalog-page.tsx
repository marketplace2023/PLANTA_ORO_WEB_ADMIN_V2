import { ImageIcon, ListChecks, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { CheckGroup } from '@/components/check-group'
import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog'
import { FormDialog, type Field, type Values } from '@/components/form-dialog'
import { errorMessage, selectClass } from '@/lib/forms'
import { DataTable, Empty, Failed, Loading, Panel, Pill, ScreenHeader, Segmented, td } from '@/components/kit'
import { ModelImagePicker, type ImageChange } from '@/components/model-image-picker'
import { ModelVariablesDialog, VariablesTab } from '@/pages/catalog-variables'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  useCreateFamily,
  useCreateManufacturer,
  useCreateModel,
  useCreateType,
  useDeleteFamily,
  useDeleteManufacturer,
  useDeleteModel,
  useDeleteType,
  useFamilies,
  useManufacturers,
  useModels,
  useNetworkMasters,
  useStageMasters,
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

type Tab = 'families' | 'types' | 'manufacturers' | 'models' | 'variables'

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
  const del = useDeleteFamily()
  const [removing, setRemoving] = useState<Family | null>(null)
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
                <td className={`${td} text-right`}>
                  <div className="flex justify-end gap-1.5">
                    <Button size="xs" variant="secondary" aria-label={`Editar ${f.name}`} onClick={() => { update.reset(); setForm({ row: f }) }}><Pencil /> Editar</Button>
                    <Button size="xs" variant="outline" aria-label={`Eliminar ${f.name}`} onClick={() => { del.reset(); setRemoving(f) }}><Trash2 /> Eliminar</Button>
                  </div>
                </td>
              </tr>
            ))}
          </DataTable>
        ) : <Empty>No hay familias.</Empty>}
      </Section>
      {removing && (
        <ConfirmDeleteDialog
          title={`Eliminar la familia ${removing.name}`}
          description="Se elimina del catálogo. Solo es posible si no tiene tipos."
          pending={del.isPending}
          error={errorMessage(del.error)}
          onConfirm={() => del.mutate(removing.id, { onSuccess: () => { toast.success('Familia eliminada'); setRemoving(null) } })}
          onClose={() => setRemoving(null)}
        />
      )}
      {form && <FormDialog title={editing ? `Editar familia ${editing.code}` : 'Nueva familia'} fields={fields} initial={editing ? { code: editing.code, name: editing.name, icon: editing.icon ?? '' } : {}} busy={m.isPending} error={errorMessage(m.error)} onClose={() => setForm(null)} onSubmit={submit} />}
    </>
  )
}

/** Alta/edición de un tipo, con las etapas del proceso y las redes transversales donde se usa (con eso se filtra el catálogo público). */
function TypeDialog({ row, onClose }: { row?: AssetType; onClose: () => void }) {
  const families = useFamilies()
  const stages = useStageMasters()
  const networks = useNetworkMasters()
  const create = useCreateType()
  const update = useUpdateType()
  const [stageCodes, setStageCodes] = useState<string[]>(row?.stageCodes ?? [])
  const [networkCodes, setNetworkCodes] = useState<string[]>(row?.networkCodes ?? [])
  const m = row ? update : create
  const fields: Field[] = [
    { name: 'familyCode', label: 'Familia', type: 'select', required: true, options: (families.data ?? []).map((f) => ({ value: f.code, label: f.name })) },
    { name: 'code', label: 'Código', required: true, disabled: !!row, placeholder: 'PUMP_CENTRIFUGAL', hint: 'No se puede cambiar.' },
    { name: 'name', label: 'Nombre', required: true, wide: true },
    { name: 'description', label: 'Descripción', type: 'textarea', placeholder: 'Criba / parrilla de recepción de mineral ROM', hint: 'Aparece bajo el nombre en la ficha técnica del activo.' },
  ]
  const submit = (v: Values) => {
    const done = { onSuccess: () => { toast.success(row ? 'Tipo actualizado' : 'Tipo creado'); onClose() } }
    if (row) update.mutate({ id: row.id, name: String(v.name).trim(), familyCode: String(v.familyCode), description: nul(v.description), stageCodes, networkCodes }, done)
    else create.mutate({ familyCode: String(v.familyCode), code: upper(v.code), name: String(v.name).trim(), description: opt(v.description), stageCodes, networkCodes }, done)
  }
  return (
    <FormDialog
      title={row ? `Editar tipo ${row.code}` : 'Nuevo tipo'}
      fields={fields}
      initial={row ? { familyCode: row.familyCode, code: row.code, name: row.name, description: row.description ?? '' } : {}}
      busy={m.isPending}
      error={errorMessage(m.error)}
      extra={
        <>
          <CheckGroup legend="Etapas del proceso posibles" options={(stages.data ?? []).map((s) => ({ value: s.code, label: `${s.code} · ${s.name}` }))} value={stageCodes} onChange={setStageCodes} help="Son las etapas posibles para los modelos de este tipo: cada modelo elige en cuáles participa realmente." />
          <CheckGroup legend="Redes transversales" options={(networks.data ?? []).map((n) => ({ value: n.code, label: n.name }))} value={networkCodes} onChange={setNetworkCodes} help="Así aparece el tipo al filtrar el catálogo por red transversal." />
        </>
      }
      onClose={onClose}
      onSubmit={submit}
    />
  )
}

function TypesTab() {
  const q = useTypes()
  const del = useDeleteType()
  const [removing, setRemoving] = useState<AssetType | null>(null)
  const [form, setForm] = useState<{ row?: AssetType } | null>(null)
  const summary = (codes: string[], max: number) => (codes.length === 0 ? null : codes.length > max ? `${codes.slice(0, max).join(', ')} +${codes.length - max}` : codes.join(', '))
  return (
    <>
      <Section title="Tipos de activo" subtitle="Qué clase de equipo es (bomba centrífuga, molino, chancadora…) y dónde se usa." addLabel="Nuevo tipo" onAdd={() => setForm({})}>
        {q.isLoading ? <div className="p-4"><Loading rows={5} /></div> : q.isError ? <Failed what="los tipos" onRetry={() => void q.refetch()} /> : q.data && q.data.length > 0 ? (
          <DataTable head={['Código', 'Tipo', 'Familia', 'Etapas', 'Redes', { label: '', right: true }]}>
            {q.data.map((t) => (
              <tr key={t.id}>
                <td className={`${td} fur-code text-xs`}>{t.code}</td>
                <td className={`${td} font-medium text-fur-navy-900`}>{t.name}</td>
                <td className={td}>{t.familyName}</td>
                <td className={`${td} fur-code text-xs`} title={t.stageCodes.join(', ')}>{summary(t.stageCodes, 4) ?? <span className="text-muted-foreground">Sin etapas</span>}</td>
                <td className={`${td} text-xs`} title={t.networkCodes.join(', ')}>{summary(t.networkCodes.map((c) => c.replace('FUR-', '')), 4) ?? <span className="text-muted-foreground">Sin redes</span>}</td>
                <td className={`${td} text-right`}>
                  <div className="flex justify-end gap-1.5">
                    <Button size="xs" variant="secondary" aria-label={`Editar ${t.name}`} onClick={() => setForm({ row: t })}><Pencil /> Editar</Button>
                    <Button size="xs" variant="outline" aria-label={`Eliminar ${t.name}`} onClick={() => { del.reset(); setRemoving(t) }}><Trash2 /> Eliminar</Button>
                  </div>
                </td>
              </tr>
            ))}
          </DataTable>
        ) : <Empty>No hay tipos.</Empty>}
      </Section>
      {removing && (
        <ConfirmDeleteDialog
          title={`Eliminar el tipo ${removing.name}`}
          description="Se elimina del catálogo junto con sus etapas y redes. Solo es posible si no tiene modelos."
          pending={del.isPending}
          error={errorMessage(del.error)}
          onConfirm={() => del.mutate(removing.id, { onSuccess: () => { toast.success('Tipo eliminado'); setRemoving(null) } })}
          onClose={() => setRemoving(null)}
        />
      )}
      {form && <TypeDialog row={form.row} onClose={() => setForm(null)} />}
    </>
  )
}

function ManufacturersTab() {
  const q = useManufacturers()
  const create = useCreateManufacturer()
  const update = useUpdateManufacturer()
  const del = useDeleteManufacturer()
  const [removing, setRemoving] = useState<Manufacturer | null>(null)
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
                <td className={`${td} text-right`}>
                  <div className="flex justify-end gap-1.5">
                    <Button size="xs" variant="secondary" aria-label={`Editar ${f.name}`} onClick={() => { update.reset(); setForm({ row: f }) }}><Pencil /> Editar</Button>
                    <Button size="xs" variant="outline" aria-label={`Eliminar ${f.name}`} onClick={() => { del.reset(); setRemoving(f) }}><Trash2 /> Eliminar</Button>
                  </div>
                </td>
              </tr>
            ))}
          </DataTable>
        ) : <Empty>No hay fabricantes.</Empty>}
      </Section>
      {removing && (
        <ConfirmDeleteDialog
          title={`Eliminar el fabricante ${removing.name}`}
          description="Se elimina del catálogo. Solo es posible si ningún modelo ni activo lo usa."
          pending={del.isPending}
          error={errorMessage(del.error)}
          onConfirm={() => del.mutate(removing.id, { onSuccess: () => { toast.success('Fabricante eliminado'); setRemoving(null) } })}
          onClose={() => setRemoving(null)}
        />
      )}
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
  const del = useDeleteModel()
  const [removing, setRemoving] = useState<Model | null>(null)
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
  const [variablesOf, setVariablesOf] = useState<Model | null>(null)
  const stageMasters = useStageMasters()
  /** Etapas elegidas para el modelo, con el tipo al que corresponden (al cambiar de tipo se vuelve a empezar). */
  const [stageSel, setStageSel] = useState<{ typeCode: string; codes: string[] } | null>(null)
  const editing = form?.row
  const stageName = (code: string) => stageMasters.data?.find((x) => x.code === code)?.name
  /** Etapas posibles del tipo y las que quedan marcadas: las del modelo, o todas las posibles mientras no declare otras. */
  const stagesFor = (typeCode: string) => {
    const possible = types.data?.find((t) => t.code === typeCode)?.stageCodes ?? []
    return { possible, selected: stageSel && stageSel.typeCode === typeCode ? stageSel.codes.filter((c) => possible.includes(c)) : possible }
  }
  const mfOptions = (manufacturers.data ?? []).map((f) => ({ value: f.id, label: f.name }))
  const fields: Field[] = editing
    ? [
        { name: 'modelName', label: 'Modelo', required: true, wide: true },
        { name: 'manufacturerId', label: 'Fabricante', type: 'select', options: mfOptions },
        { name: 'status', label: 'Estado', type: 'select', required: true, options: [{ value: 'ACTIVE', label: 'Activo' }, { value: 'INACTIVE', label: 'Inactivo' }], hint: 'Desactívalo si hay activos que lo usan; si está repetido y nadie lo usa, elimínalo desde la tabla.' },
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
        await update.mutateAsync({ id: editing.id, modelName: String(v.modelName).trim(), manufacturerId: nul(v.manufacturerId), status: v.status as 'ACTIVE' | 'INACTIVE', stageCodes: stagesFor(editing.type.code).selected })
      } else {
        id = (await create.mutateAsync({ typeCode: String(v.typeCode), modelName: String(v.modelName).trim(), manufacturerId: opt(v.manufacturerId), stageCodes: stagesFor(String(v.typeCode)).selected })).id
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
      <Section title="Modelos" subtitle="Describen qué existe; los activos de cada planta se crean a partir de un modelo." addLabel="Nuevo modelo" onAdd={() => { setImage({ file: null, remove: false }); setSaveError(null); setStageSel(null); setForm({}) }}>
        {q.isLoading ? <div className="p-4"><Loading rows={6} /></div> : q.isError ? <Failed what="los modelos" onRetry={() => void q.refetch()} /> : q.data && q.data.items.length > 0 ? (
          <>
            <DataTable head={['Foto', 'Modelo', 'Tipo', 'Etapas', 'Familia', 'Fabricante', 'Estado', { label: '', right: true }]}>
              {q.data.items.map((r) => (
                <tr key={r.id} className={r.status === 'INACTIVE' ? 'opacity-60' : undefined}>
                  <td className={td}>
                    <span className="grid size-12 place-items-center overflow-hidden rounded-md border border-border bg-white">
                      {r.imageUrl ? <img src={apiUrl(r.imageUrl)} alt={`Foto de ${r.modelName}`} loading="lazy" className="size-full object-contain" /> : <ImageIcon className="size-5 text-fur-gray-500" aria-label="Sin foto" />}
                    </span>
                  </td>
                  <td className={`${td} font-medium text-fur-navy-900`}>{r.modelName}</td>
                  <td className={td}>{r.type.name}</td>
                  <td className={td}>
                    {r.stageCodes.length === 0 ? (
                      '—'
                    ) : (
                      <span className="fur-code text-xs" title={r.stageCodes.map((c) => `${c} · ${stageName(c) ?? ''}`).join('\n')}>
                        {r.stageCodes.length > 4 ? `${r.stageCodes.slice(0, 4).join(', ')} +${r.stageCodes.length - 4}` : r.stageCodes.join(', ')}
                        {r.stageInherited && <span className="ml-1 font-sans text-[10px] text-muted-foreground">(del tipo)</span>}
                      </span>
                    )}
                  </td>
                  <td className={td}>{r.family.name}</td>
                  <td className={td}>{r.manufacturer?.name ?? '—'}</td>
                  <td className={td}><Pill label={r.status === 'ACTIVE' ? 'Activo' : 'Inactivo'} color={r.status === 'ACTIVE' ? 'var(--fur-green-500)' : 'var(--fur-steel-500)'} /></td>
                  <td className={`${td} text-right`}>
                    <div className="flex justify-end gap-1.5">
                      <Button size="xs" variant="outline" aria-label={`Datos del fabricante de ${r.modelName}`} onClick={() => setVariablesOf(r)}><ListChecks /> Datos del fabricante</Button>
                      <Button size="xs" variant="secondary" aria-label={`Editar ${r.modelName}`} onClick={() => { setImage({ file: null, remove: false }); setSaveError(null); setStageSel({ typeCode: r.type.code, codes: r.stageCodes }); setForm({ row: r }) }}><Pencil /> Editar</Button>
                      <Button size="xs" variant="outline" aria-label={`Eliminar ${r.modelName}`} onClick={() => { del.reset(); setRemoving(r) }}><Trash2 /> Eliminar</Button>
                    </div>
                  </td>
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
      {variablesOf && <ModelVariablesDialog model={variablesOf} onClose={() => setVariablesOf(null)} />}
      {removing && (
        <ConfirmDeleteDialog
          title={`Eliminar el modelo ${removing.modelName}`}
          description="Se elimina del catálogo junto con su foto y sus datos del fabricante. Solo es posible si ningún activo lo usa; si lo usa, desactívalo."
          pending={del.isPending}
          error={errorMessage(del.error)}
          onConfirm={() => del.mutate(removing.id, { onSuccess: () => { toast.success('Modelo eliminado'); setRemoving(null) } })}
          onClose={() => setRemoving(null)}
        />
      )}
      {form && (
        <FormDialog
          title={editing ? `Editar ${editing.modelName}` : 'Nuevo modelo'}
          fields={fields}
          initial={editing ? { modelName: editing.modelName, manufacturerId: editing.manufacturer?.id ?? '', status: editing.status } : {}}
          busy={saving}
          error={saveError}
          extra={(v) => {
            const typeCode = editing ? editing.type.code : String(v.typeCode ?? '')
            const { possible, selected } = stagesFor(typeCode)
            return (
              <>
                {typeCode !== '' &&
                  (possible.length > 0 ? (
                    <CheckGroup
                      legend="Etapas del proceso donde participa"
                      options={possible.map((c) => ({ value: c, label: `${c} · ${stageName(c) ?? ''}` }))}
                      value={selected}
                      onChange={(codes) => setStageSel({ typeCode, codes })}
                      help={selected.length === possible.length ? 'Se muestran las etapas posibles del tipo. Todas marcadas = hereda las del tipo: si el tipo agrega etapas, este modelo también las tendrá.' : 'Solo participa en las marcadas: así aparece al filtrar el catálogo por etapa.'}
                    />
                  ) : (
                    <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">El tipo aún no tiene etapas posibles. Agrégalas en la pestaña «Tipos» para poder elegir en cuáles participa este modelo.</p>
                  ))}
                <ModelImagePicker currentUrl={editing?.imageUrl ?? null} value={image} onChange={setImage} />
              </>
            )
          }}
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
          { value: 'variables', label: 'Variables' },
        ]}
      />
      <div className="mt-3">
        {tab === 'models' && <ModelsTab />}
        {tab === 'types' && <TypesTab />}
        {tab === 'families' && <FamiliesTab />}
        {tab === 'manufacturers' && <ManufacturersTab />}
        {tab === 'variables' && <VariablesTab />}
      </div>
    </>
  )
}
