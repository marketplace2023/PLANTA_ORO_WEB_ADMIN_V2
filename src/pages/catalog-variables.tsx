import { Pencil, Plus, Star, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { FormDialog, type Field, type Values } from '@/components/form-dialog'
import { DataTable, Empty, Failed, Loading, Panel, Pill, td } from '@/components/kit'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  useCreateVariable,
  useDeleteVariable,
  useModelVariables,
  useNetworkMasters,
  useSetModelVariables,
  useStageMasters,
  useTypes,
  useUpdateVariable,
  useVariables,
  type Model,
  type ModelVariable,
  type VariableDef,
  type VariableType,
} from '@/features/catalog/use-catalog'
import { errorMessage, selectClass } from '@/lib/forms'
import { EMPTY_FIELD, fromFieldState, sameValue, toFieldState, VARIABLE_TYPE_LABELS, type FieldState } from '@/lib/variables'
import { cn } from '@/lib/utils'

const nul = (v: string | boolean) => (String(v).trim() === '' ? null : String(v).trim())
const opt = (v: string | boolean) => (String(v).trim() === '' ? undefined : String(v).trim())

/** Alta y edición de una variable: su alcance (red, etapa, tipo) decide a qué modelos aplica. */
function VariableDialog({ row, onClose }: { row?: VariableDef; onClose: () => void }) {
  const networks = useNetworkMasters()
  const stages = useStageMasters()
  const types = useTypes()
  const create = useCreateVariable()
  const update = useUpdateVariable()
  const m = row ? update : create
  const fields: Field[] = [
    { name: 'label', label: 'Nombre', required: true, wide: true, placeholder: 'Capacidad nominal' },
    {
      name: 'valueType',
      label: 'Tipo de dato',
      type: 'select',
      required: true,
      options: (Object.keys(VARIABLE_TYPE_LABELS) as VariableType[]).map((v) => ({ value: v, label: VARIABLE_TYPE_LABELS[v] })),
      hint: row ? 'No se puede cambiar si algún modelo ya tiene un valor.' : 'Rango sirve para «600 – 800», «≤ 700» o «≥ 50».',
    },
    { name: 'unit', label: 'Unidad', placeholder: 't/h, mm, kW…', hint: 'Opcional.' },
    {
      name: 'networkCode',
      label: 'Red transversal',
      type: 'select',
      options: (networks.data ?? []).map((n) => ({ value: n.code, label: `${n.code} · ${n.name}` })),
      hint: 'Vacío = aplica a todas las redes.',
    },
    {
      name: 'stageCode',
      label: 'Etapa',
      type: 'select',
      options: (stages.data ?? []).map((s) => ({ value: s.code, label: `${s.code} · ${s.name}` })),
      hint: 'Vacío = todas las etapas.',
    },
    {
      name: 'assetTypeCode',
      label: 'Tipo de activo',
      type: 'select',
      wide: true,
      options: (types.data ?? []).map((t) => ({ value: t.code, label: `${t.familyName} · ${t.name}` })),
      hint: 'Si eliges un tipo, la variable aplica a los modelos de ese tipo. Si lo dejas vacío, aplica a los tipos que estén en la red y la etapa elegidas.',
    },
    { name: 'group', label: 'Sección en la ficha', placeholder: 'Variables críticas del proceso', hint: 'Título bajo el que se muestra; se le añade la etapa o la red. Vacío = «Datos del fabricante».' },
    { name: 'sortOrder', label: 'Orden', type: 'number', min: 0, hint: 'Menor número, más arriba.' },
    { name: 'isKey', label: 'Variable clave (se destaca en la ficha)', type: 'checkbox', wide: true },
  ]
  const submit = (v: Values) => {
    const done = { onSuccess: () => { toast.success(row ? 'Variable actualizada' : 'Variable creada'); onClose() } }
    const sortOrder = Number(v.sortOrder) || 0
    if (row) {
      update.mutate(
        { id: row.id, label: String(v.label).trim(), valueType: v.valueType as VariableType, unit: nul(v.unit), networkCode: nul(v.networkCode), stageCode: nul(v.stageCode), assetTypeCode: nul(v.assetTypeCode), group: nul(v.group), isKey: !!v.isKey, sortOrder },
        done,
      )
    } else {
      create.mutate(
        { label: String(v.label).trim(), valueType: v.valueType as VariableType, unit: opt(v.unit), networkCode: opt(v.networkCode), stageCode: opt(v.stageCode), assetTypeCode: opt(v.assetTypeCode), group: opt(v.group), isKey: !!v.isKey, sortOrder },
        done,
      )
    }
  }
  return (
    <FormDialog
      title={row ? `Editar variable ${row.label}` : 'Nueva variable'}
      description={row ? `Código ${row.code} (no cambia).` : 'Define un dato que se registra por modelo según la red, etapa y tipo donde aplique.'}
      fields={fields}
      initial={
        row
          ? { label: row.label, valueType: row.valueType, unit: row.unit ?? '', networkCode: row.networkCode ?? '', stageCode: row.stageCode ?? '', assetTypeCode: row.assetTypeCode ?? '', group: row.group ?? '', sortOrder: String(row.sortOrder), isKey: row.isKey }
          : { valueType: 'NUMBER', sortOrder: '0' }
      }
      busy={m.isPending}
      error={errorMessage(m.error)}
      onClose={onClose}
      onSubmit={submit}
    />
  )
}

function DeleteVariableDialog({ row, onClose }: { row: VariableDef; onClose: () => void }) {
  const remove = useDeleteVariable()
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Eliminar la variable {row.label}</DialogTitle>
          <DialogDescription>Se borra también el valor que los modelos tengan registrado para ella. No se puede deshacer.</DialogDescription>
        </DialogHeader>
        {remove.error && <p role="alert" className="rounded-md bg-fur-red-500/10 p-3 text-sm text-fur-red-500">{errorMessage(remove.error)}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button variant="destructive" disabled={remove.isPending} onClick={() => remove.mutate(row.id, { onSuccess: () => { toast.success('Variable eliminada'); onClose() } })}>
            {remove.isPending ? 'Eliminando…' : 'Eliminar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Pestaña «Variables» del catálogo: qué datos del fabricante se registran y dónde aplican. */
export function VariablesTab() {
  const q = useVariables()
  const networks = useNetworkMasters()
  const [network, setNetwork] = useState('')
  const [dialog, setDialog] = useState<{ kind: 'edit'; row?: VariableDef } | { kind: 'delete'; row: VariableDef } | null>(null)
  const rows = (q.data ?? []).filter((v) => !network || v.networkCode === network)

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <select className={cn(selectClass, 'w-64')} aria-label="Filtrar por red" value={network} onChange={(e) => setNetwork(e.target.value)}>
          <option value="">Todas las redes</option>
          {(networks.data ?? []).map((n) => <option key={n.id} value={n.code}>{n.code} · {n.name}</option>)}
        </select>
      </div>
      <Panel
        title="Variables de la ficha técnica"
        subtitle="Aquí defines qué datos del fabricante existen y dónde aplican (red, etapa y tipo). El valor de cada equipo se registra en Modelos → «Datos del fabricante»."
        flush
        action={<Button size="xs" onClick={() => setDialog({ kind: 'edit' })}><Plus /> Nueva variable</Button>}
      >
        {q.isLoading ? (
          <div className="p-4"><Loading rows={5} /></div>
        ) : q.isError ? (
          <Failed what="las variables" onRetry={() => void q.refetch()} />
        ) : rows.length === 0 ? (
          <Empty>No hay variables{network ? ' en esta red' : ''}. Crea la primera.</Empty>
        ) : (
          <DataTable head={['Nombre', 'Tipo de dato', 'Red', 'Etapa', 'Tipo de activo', 'Sección', { label: '', right: true }]}>
            {rows.map((v) => (
              <tr key={v.id}>
                <td className={td}>
                  <p className="flex items-center gap-1.5 font-medium text-fur-navy-900">
                    {v.label}
                    {v.isKey && <Star className="size-3.5 fill-fur-gold-500 text-fur-gold-500" aria-label="Variable clave" />}
                  </p>
                  <p className="fur-code text-[11px] text-muted-foreground">{v.code}</p>
                </td>
                <td className={td}>
                  {VARIABLE_TYPE_LABELS[v.valueType].split(' (')[0]}
                  {v.unit && <span className="ml-1 text-xs text-muted-foreground">({v.unit})</span>}
                </td>
                <td className={td}>{v.networkCode ? <Pill label={v.networkCode} color="var(--fur-navy-700)" /> : <span className="text-xs text-muted-foreground">Todas</span>}</td>
                <td className={`${td} fur-code text-xs`}>{v.stageCode ?? <span className="font-sans text-muted-foreground">Todas</span>}</td>
                <td className={`${td} fur-code text-xs`}>{v.assetTypeCode ?? <span className="font-sans text-muted-foreground">Todos</span>}</td>
                <td className={`${td} text-xs`}>{v.group ?? '—'}</td>
                <td className={`${td} text-right`}>
                  <div className="flex justify-end gap-1.5">
                    <Button size="xs" variant="secondary" aria-label={`Editar ${v.label}`} onClick={() => setDialog({ kind: 'edit', row: v })}><Pencil /> Editar</Button>
                    <Button size="xs" variant="outline" aria-label={`Eliminar ${v.label}`} onClick={() => setDialog({ kind: 'delete', row: v })}><Trash2 /> Eliminar</Button>
                  </div>
                </td>
              </tr>
            ))}
          </DataTable>
        )}
      </Panel>
      {dialog?.kind === 'edit' && <VariableDialog row={dialog.row} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'delete' && <DeleteVariableDialog row={dialog.row} onClose={() => setDialog(null)} />}
    </>
  )
}

/** Un campo de valor según el tipo de la variable. */
function ValueInput({ v, state, onChange }: { v: ModelVariable; state: FieldState; onChange: (s: FieldState) => void }) {
  const id = `var-${v.code}`
  const unit = v.unit ? <span className="shrink-0 text-xs text-muted-foreground">{v.unit}</span> : null
  switch (v.valueType) {
    case 'NUMBER':
      return (
        <div className="flex items-center gap-2">
          <Input id={id} inputMode="decimal" value={state.a} onChange={(e) => onChange({ ...state, a: e.target.value })} />
          {unit}
        </div>
      )
    case 'RANGE':
      return (
        <div className="flex items-center gap-2">
          <Input id={id} inputMode="decimal" aria-label={`${v.label}, mínimo`} placeholder="Mín." value={state.a} onChange={(e) => onChange({ ...state, a: e.target.value })} />
          <span aria-hidden>–</span>
          <Input inputMode="decimal" aria-label={`${v.label}, máximo`} placeholder="Máx." value={state.b} onChange={(e) => onChange({ ...state, b: e.target.value })} />
          {unit}
        </div>
      )
    case 'BOOLEAN':
      return (
        <select id={id} className={selectClass} value={state.a} onChange={(e) => onChange({ ...state, a: e.target.value })}>
          <option value="">Sin dato</option>
          <option value="true">Sí</option>
          <option value="false">No</option>
        </select>
      )
    case 'LIST':
      return <Input id={id} placeholder="Separados por comas" value={state.a} onChange={(e) => onChange({ ...state, a: e.target.value })} />
    default:
      return <Input id={id} value={state.a} onChange={(e) => onChange({ ...state, a: e.target.value })} />
  }
}

function ModelVariablesForm({ model, variables, onClose }: { model: Model; variables: ModelVariable[]; onClose: () => void }) {
  const set = useSetModelVariables()
  const [state, setState] = useState<Record<string, FieldState>>(() => Object.fromEntries(variables.map((v) => [v.code, toFieldState(v.valueType, v.value)])))
  const [problem, setProblem] = useState<string | null>(null)

  // Secciones en el orden en que se mostrarán en la ficha.
  const sections = new Map<string, ModelVariable[]>()
  for (const v of variables) {
    const base = v.group ?? 'Datos del fabricante'
    const title = v.stageCode ? `${base} (Etapa ${v.stageCode.replace(/^D/, '')})` : v.networkCode ? `${base} (Red ${v.networkCode.replace(/^FUR-/, '')})` : base
    sections.set(title, [...(sections.get(title) ?? []), v])
  }

  function submit() {
    setProblem(null)
    const values: Record<string, unknown> = {}
    for (const v of variables) {
      const parsed = fromFieldState(v.valueType, state[v.code] ?? EMPTY_FIELD)
      if (!parsed.ok) return setProblem(`${v.label}: ${parsed.message}`)
      if (!sameValue(parsed.value, v.value)) values[v.code] = parsed.value // solo lo que cambió
    }
    if (Object.keys(values).length === 0) return onClose()
    set.mutate({ id: model.id, values }, { onSuccess: () => { toast.success('Datos del fabricante guardados'); onClose() } })
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Datos del fabricante · {model.modelName}</DialogTitle>
          <DialogDescription>
            Valores de referencia del equipo ({model.type.name}). Solo aparecen las variables que aplican a su tipo; deja un campo vacío si el fabricante no lo informa.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
          className="space-y-5"
          aria-label="Datos del fabricante"
        >
          {[...sections].map(([title, list]) => (
            <fieldset key={title} className="space-y-3">
              <legend className="text-sm font-semibold text-fur-navy-900">{title}</legend>
              {list.map((v) => (
                <div key={v.id} className="grid items-center gap-2 sm:grid-cols-[12rem_minmax(0,1fr)]">
                  <Label htmlFor={`var-${v.code}`} className="text-sm">
                    {v.label}
                    {v.isKey && <Star className="ml-1 inline size-3 fill-fur-gold-500 text-fur-gold-500" aria-label="Variable clave" />}
                  </Label>
                  <ValueInput v={v} state={state[v.code] ?? EMPTY_FIELD} onChange={(s) => setState((cur) => ({ ...cur, [v.code]: s }))} />
                </div>
              ))}
            </fieldset>
          ))}
          {(problem || set.error) && <p role="alert" className="rounded-md bg-fur-red-500/10 p-3 text-sm text-fur-red-500">{problem ?? errorMessage(set.error)}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={set.isPending}>{set.isPending ? 'Guardando…' : 'Guardar'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** Registro de los datos del fabricante de un modelo (variables que aplican a su tipo). */
export function ModelVariablesDialog({ model, onClose }: { model: Model; onClose: () => void }) {
  const q = useModelVariables(model.id)
  if (q.isLoading) {
    return (
      <Dialog open onOpenChange={(o) => !o && onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Datos del fabricante · {model.modelName}</DialogTitle>
            <DialogDescription>Cargando variables…</DialogDescription>
          </DialogHeader>
          <Loading rows={4} />
        </DialogContent>
      </Dialog>
    )
  }
  if (q.isError || !q.data) {
    return (
      <Dialog open onOpenChange={(o) => !o && onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Datos del fabricante · {model.modelName}</DialogTitle>
          </DialogHeader>
          <Failed what="las variables" onRetry={() => void q.refetch()} />
        </DialogContent>
      </Dialog>
    )
  }
  if (q.data.length === 0) {
    return (
      <Dialog open onOpenChange={(o) => !o && onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Datos del fabricante · {model.modelName}</DialogTitle>
            <DialogDescription>
              No hay variables definidas para el tipo «{model.type.name}». Crea variables en la pestaña Variables, o asigna al tipo las redes y etapas donde aplican.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={onClose}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }
  return <ModelVariablesForm model={model} variables={q.data} onClose={onClose} />
}
