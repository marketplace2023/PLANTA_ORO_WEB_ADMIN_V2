import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { api, jsonBody } from '@/lib/api'
import { useFamilies } from '@/features/catalog/use-catalog'
import { DataTable, Empty, Failed, Loading, Panel, td } from '@/components/kit'
import { FormDialog, type Field, type Values } from '@/components/form-dialog'
import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { errorMessage, selectClass } from '@/lib/forms'
import { VARIABLE_TYPE_LABELS } from '@/lib/variables'
import type { FamilySpecification } from '@/components/family-specification-fields'

export function SpecificationsTab() {
  const families = useFamilies()
  const [familyId, setFamilyId] = useState('')
  const [search, setSearch] = useState('')
  const [form, setForm] = useState<{ row?: FamilySpecification } | null>(null)
  const [removing, setRemoving] = useState<FamilySpecification | null>(null)
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['catalog', 'specifications', familyId], enabled: !!familyId,
    queryFn: () => api<FamilySpecification[]>(`/catalog/specifications?familyId=${encodeURIComponent(familyId)}`) })
  const save = useMutation({ mutationFn: ({ id, ...body }: { id?: string; familyId?: string; label: string; unit: string | null; valueType: string; required: boolean; sortOrder: number }) => api(`/catalog/specifications${id ? '/' + id : ''}`, { method: id ? 'PATCH' : 'POST', ...jsonBody(body) }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['catalog', 'specifications'] }); toast.success('Especificación guardada'); setForm(null) } })
  const remove = useMutation({ mutationFn: (id: string) => api(`/catalog/specifications/${id}`, { method: 'DELETE' }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['catalog', 'specifications'] }); toast.success('Especificación eliminada'); setRemoving(null) } })
  const editing = form?.row
  const fields: Field[] = [
    { name: 'label', label: 'Nombre', required: true, wide: true },
    { name: 'unit', label: 'Unidad', placeholder: 'kW, mm, t/h…' },
    { name: 'valueType', label: 'Tipo de dato', type: 'select', required: true, options: Object.entries(VARIABLE_TYPE_LABELS).map(([value, label]) => ({ value, label })) },
    { name: 'required', label: 'Obligatoria', type: 'checkbox' },
    { name: 'sortOrder', label: 'Orden', type: 'number', min: 0, step: '1' },
  ]
  const submit = (v: Values) => save.mutate({ ...(editing ? { id: editing.id } : { familyId }), label: String(v.label).trim(), unit: String(v.unit).trim() || null, valueType: String(v.valueType), required: !!v.required, sortOrder: Number(v.sortOrder) || 0 })
  const filtered = q.data?.filter(d => `${d.label} ${d.unit ?? ''}`.toLocaleLowerCase().includes(search.toLocaleLowerCase())) ?? []
  const familyName = families.data?.find(f => f.id === familyId)?.name
  return <div className="space-y-4">
    <div className="flex flex-wrap items-end gap-3">
      <label className="grid min-w-64 gap-1 text-sm font-medium">Familia
        <select className={selectClass} value={familyId} disabled={families.isPending || families.isError} onChange={e => { setFamilyId(e.target.value); setSearch('') }}><option value="">Selecciona una familia</option>{families.data?.map(f => <option key={f.id} value={f.id}>{f.tagCode ?? f.code} · {f.name}</option>)}</select>
      </label>
      <label className="grid gap-1 text-sm font-medium">Buscar especificación<Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Nombre o unidad…" /></label>
      <Button className="ml-auto" disabled={!familyId} onClick={() => { save.reset(); setForm({}) }}><Plus /> Nueva especificación</Button>
    </div>
    {families.isError && <Failed what="las familias" onRetry={() => void families.refetch()} />}
    <Panel title={familyName ? `Especificaciones de ${familyName}` : 'Especificaciones por familia'} subtitle="Define el nombre, la unidad, el tipo y la obligatoriedad. Estos parámetros se comparten entre el catálogo y los activos de planta." flush>
      {!familyId ? <Empty>Selecciona una familia para administrar sus especificaciones.</Empty> : q.isPending ? <Loading /> : q.isError ? <Failed what="las especificaciones" onRetry={() => void q.refetch()} /> : !filtered.length ? <Empty>No hay especificaciones con estos filtros.</Empty> : <DataTable head={['Nombre', 'Unidad', 'Tipo', 'Obligatoria', 'Orden', { label: '', right: true }]}>
        {filtered.map(d => <tr key={d.id}><td className={`${td} font-medium`}>{d.label}</td><td className={td}>{d.unit || '—'}</td><td className={td}>{VARIABLE_TYPE_LABELS[d.valueType]}</td><td className={td}>{d.required ? 'Sí' : 'No'}</td><td className={td}>{d.sortOrder}</td><td className={td}><div className="flex justify-end gap-2"><Button size="xs" variant="secondary" aria-label={`Editar ${d.label}`} onClick={() => { save.reset(); setForm({ row: d }) }}><Pencil /> Editar</Button><Button size="xs" variant="outline" aria-label={`Eliminar ${d.label}`} onClick={() => { remove.reset(); setRemoving(d) }}><Trash2 /> Eliminar</Button></div></td></tr>)}
      </DataTable>}
    </Panel>
    {form && <FormDialog title={editing ? 'Editar especificación' : 'Nueva especificación'} description={`Familia: ${familyName ?? ''}. Solo aplica a esta familia.`} fields={fields} initial={editing ? { label: editing.label, unit: editing.unit ?? '', valueType: editing.valueType, required: editing.required, sortOrder: String(editing.sortOrder) } : { valueType: 'TEXT', sortOrder: '0' }} busy={save.isPending} error={errorMessage(save.error)} onClose={() => setForm(null)} onSubmit={submit} />}
    {removing && <ConfirmDeleteDialog title={`Eliminar ${removing.label}`} description="Solo se puede eliminar si no tiene valores registrados en modelos o activos." pending={remove.isPending} error={errorMessage(remove.error)} onClose={() => setRemoving(null)} onConfirm={() => remove.mutate(removing.id)} />}
  </div>
}
