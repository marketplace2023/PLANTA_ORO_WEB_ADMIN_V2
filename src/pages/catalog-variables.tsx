import { Globe2, Pencil, Plus, Star, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { CheckGroup } from '@/components/check-group'
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
import { cn } from '@/lib/utils'
import { formatVariableValue } from '@/lib/variable-value'
import { EMPTY_FIELD, fromFieldState, sameValue, toFieldState, VARIABLE_TYPE_LABELS, type FieldState } from '@/lib/variables'


/** Un campo de valor según el tipo de la variable (el mismo en el valor general y en los datos del fabricante). */
function ValueInput({ id, type, unit, label, state, onChange }: { id: string; type: VariableType; unit: string | null; label: string; state: FieldState; onChange: (s: FieldState) => void }) {
  const unitText = unit ? <span className="shrink-0 text-xs text-muted-foreground">{unit}</span> : null
  switch (type) {
    case 'NUMBER':
      return (
        <div className="flex items-center gap-2">
          <Input id={id} inputMode="decimal" value={state.a} onChange={(e) => onChange({ ...state, a: e.target.value })} />
          {unitText}
        </div>
      )
    case 'RANGE':
      return (
        <div className="flex items-center gap-2">
          <Input id={id} inputMode="decimal" aria-label={`${label}, mínimo`} placeholder="Mín." value={state.a} onChange={(e) => onChange({ ...state, a: e.target.value })} />
          <span aria-hidden>–</span>
          <Input inputMode="decimal" aria-label={`${label}, máximo`} placeholder="Máx." value={state.b} onChange={(e) => onChange({ ...state, b: e.target.value })} />
          {unitText}
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

/** Sufijo de una sección de la ficha: «(Etapa 01)», «(Etapas 01, 02)», «(Red PTE)»… igual que en la ficha del geoportal. */
function scopeSuffix(v: Pick<VariableDef, 'stageCodes' | 'networkCodes'>): string {
  const stages = v.stageCodes.map((c) => c.replace(/^D/, ''))
  if (stages.length > 0 && stages.length <= 3) return ` (${stages.length === 1 ? 'Etapa' : 'Etapas'} ${stages.join(', ')})`
  const networks = v.networkCodes.map((c) => c.replace(/^FUR-/, ''))
  if (stages.length === 0 && networks.length > 0 && networks.length <= 3) return ` (${networks.length === 1 ? 'Red' : 'Redes'} ${networks.join(', ')})`
  return ''
}

const MAX_SHOWN = 3
/** «PROC, PTE, IOT +2»: lista corta de códigos para una celda. */
const shortList = (codes: string[], strip?: RegExp) => {
  const shown = codes.slice(0, MAX_SHOWN).map((c) => (strip ? c.replace(strip, '') : c))
  return codes.length > MAX_SHOWN ? `${shown.join(', ')} +${codes.length - MAX_SHOWN}` : shown.join(', ')
}

/** A qué aplica una variable: «Todos los equipos» si no tiene alcance, o sus redes, etapas y tipos. */
function ScopeCell({ v }: { v: VariableDef }) {
  const general = v.networkCodes.length === 0 && v.stageCodes.length === 0 && v.assetTypeCodes.length === 0
  if (general) return <Pill label="General · todos los equipos" color="var(--fur-green-500)" icon={Globe2} />
  const rows: Array<[string, string]> = []
  if (v.networkCodes.length > 0) rows.push(['Redes', shortList(v.networkCodes, /^FUR-/)])
  if (v.stageCodes.length > 0) rows.push(['Etapas', shortList(v.stageCodes, /^D/)])
  if (v.assetTypeCodes.length > 0) rows.push(['Tipos', shortList(v.assetTypeCodes)])
  return (
    <dl className="space-y-0.5 text-xs">
      {rows.map(([k, text]) => (
        <div key={k} className="flex gap-1.5" title={k === 'Tipos' ? v.assetTypeCodes.join(', ') : undefined}>
          <dt className="text-muted-foreground">{k}:</dt>
          <dd className="fur-code font-medium text-fur-navy-900">{text}</dd>
        </div>
      ))}
    </dl>
  )
}

/**
 * Alta y edición de una variable. Su alcance son listas de redes, etapas y tipos (vacío = todos), de modo que una misma
 * variable se comparte entre muchos equipos; con un valor general opcional que los modelos heredan.
 */
function VariableDialog({ row, onClose }: { row?: VariableDef; onClose: () => void }) {
  const networks = useNetworkMasters()
  const stages = useStageMasters()
  const types = useTypes()
  const create = useCreateVariable()
  const update = useUpdateVariable()
  const m = row ? update : create

  const [label, setLabel] = useState(row?.label ?? '')
  const [valueType, setValueType] = useState<VariableType>(row?.valueType ?? 'NUMBER')
  const [unit, setUnit] = useState(row?.unit ?? '')
  const [group, setGroup] = useState(row?.group ?? '')
  const [sortOrder, setSortOrder] = useState(String(row?.sortOrder ?? 0))
  const [isKey, setIsKey] = useState(row?.isKey ?? false)
  const [networkCodes, setNetworkCodes] = useState<string[]>(row?.networkCodes ?? [])
  const [stageCodes, setStageCodes] = useState<string[]>(row?.stageCodes ?? [])
  const [typeCodes, setTypeCodes] = useState<string[]>(row?.assetTypeCodes ?? [])
  const [general, setGeneral] = useState<FieldState>(row ? toFieldState(row.valueType, row.defaultValue) : EMPTY_FIELD)
  const [problem, setProblem] = useState<string | null>(null)

  const everything = networkCodes.length === 0 && stageCodes.length === 0 && typeCodes.length === 0

  function changeType(next: VariableType) {
    setValueType(next)
    setGeneral(EMPTY_FIELD) // el valor general de otro tipo de dato ya no sirve
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    setProblem(null)
    const parsed = fromFieldState(valueType, general)
    if (!parsed.ok) return setProblem(`Valor general: ${parsed.message}`)
    const done = { onSuccess: () => { toast.success(row ? 'Variable actualizada' : 'Variable creada'); onClose() } }
    const common = { label: label.trim(), valueType, networkCodes, stageCodes, assetTypeCodes: typeCodes, isKey, sortOrder: Number(sortOrder) || 0, defaultValue: parsed.value }
    if (row) update.mutate({ id: row.id, ...common, unit: unit.trim() || null, group: group.trim() || null }, done)
    else create.mutate({ ...common, unit: unit.trim() || undefined, group: group.trim() || undefined }, done)
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{row ? `Editar variable ${row.label}` : 'Nueva variable'}</DialogTitle>
          <DialogDescription>
            {row ? `Código ${row.code} (no cambia). ` : ''}Una variable se define una vez y se comparte entre todos los equipos a los que aplica.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4" aria-label={row ? 'Editar variable' : 'Nueva variable'}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="v-label">
                Nombre <span className="text-fur-red-500">*</span>
              </Label>
              <Input id="v-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Potencia instalada total" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="v-type">Tipo de dato</Label>
              <select id="v-type" className={selectClass} value={valueType} onChange={(e) => changeType(e.target.value as VariableType)}>
                {(Object.keys(VARIABLE_TYPE_LABELS) as VariableType[]).map((v) => (
                  <option key={v} value={v}>{VARIABLE_TYPE_LABELS[v]}</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">{row ? 'No se puede cambiar si algún modelo ya tiene un valor.' : 'Rango sirve para «600 – 800», «≤ 700» o «≥ 50».'}</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="v-unit">Unidad</Label>
              <Input id="v-unit" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="t/h, mm, kW…" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="v-group">Sección en la ficha</Label>
              <Input id="v-group" value={group} onChange={(e) => setGroup(e.target.value)} placeholder="Variables críticas del proceso" />
              <p className="text-xs text-muted-foreground">Se le añade la etapa o la red. Vacío = «Datos del fabricante».</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="v-order">Orden</Label>
              <Input id="v-order" type="number" min={0} value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
              <p className="text-xs text-muted-foreground">Menor número, más arriba.</p>
            </div>
            <label className="flex items-center gap-2 text-sm font-medium sm:col-span-2">
              <input type="checkbox" className="size-4 accent-fur-navy-900" checked={isKey} onChange={(e) => setIsKey(e.target.checked)} />
              Variable clave (se destaca en la ficha)
            </label>
          </div>

          <fieldset className="space-y-3 rounded-lg border border-border p-3">
            <legend className="px-1 text-sm font-semibold text-fur-navy-900">A qué aplica</legend>
            <p className="text-xs text-muted-foreground">
              Marca todas las que correspondan: la variable se comparte entre ellas. Lo que dejes sin marcar significa «todas»; sin marcar nada, la variable es{' '}
              <strong>general</strong> y aplica a todos los equipos.
            </p>
            <CheckGroup legend="Redes transversales" options={(networks.data ?? []).map((n) => ({ value: n.code, label: `${n.code} · ${n.name}` }))} value={networkCodes} onChange={setNetworkCodes} />
            <CheckGroup legend="Etapas del proceso" options={(stages.data ?? []).map((s) => ({ value: s.code, label: `${s.code} · ${s.name}` }))} value={stageCodes} onChange={setStageCodes} />
            <CheckGroup
              legend="Tipos de activo"
              options={(types.data ?? []).map((t) => ({ value: t.code, label: `${t.familyName} · ${t.name}` }))}
              value={typeCodes}
              onChange={setTypeCodes}
              help="Si marcas tipos, aplica a los modelos de esos tipos. Si no, a los tipos que estén en las redes y etapas marcadas (o a los equipos que ya pertenezcan a ellas)."
            />
            <p className="flex items-center gap-1.5 text-xs font-medium text-fur-navy-900" role="status">
              <Globe2 className="size-3.5" aria-hidden />
              {everything ? 'General: aplica a todos los equipos.' : `Aplica a: ${[networkCodes.length && `${networkCodes.length} red(es)`, stageCodes.length && `${stageCodes.length} etapa(s)`, typeCodes.length && `${typeCodes.length} tipo(s)`].filter(Boolean).join(' · ')}.`}
            </p>
          </fieldset>

          <div className="space-y-1.5">
            <Label htmlFor="v-general">Valor general (opcional)</Label>
            <ValueInput id="v-general" type={valueType} unit={unit.trim() || null} label="Valor general" state={general} onChange={setGeneral} />
            <p className="text-xs text-muted-foreground">
              Si lo llenas, todos los equipos a los que aplica muestran este valor, salvo que su modelo registre uno propio. Útil para datos iguales en toda la planta.
            </p>
          </div>

          {(problem || m.error) && <p role="alert" className="rounded-lg border border-fur-red-500/40 bg-fur-red-500/10 px-3 py-2 text-sm text-fur-red-500">{problem ?? errorMessage(m.error)}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={m.isPending || label.trim().length < 2}>{m.isPending ? 'Guardando…' : row ? 'Guardar cambios' : 'Crear variable'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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

/** Pestaña «Variables» del catálogo: qué datos del fabricante existen, dónde aplican y su valor general. */
export function VariablesTab() {
  const q = useVariables()
  const networks = useNetworkMasters()
  const [network, setNetwork] = useState('')
  const [dialog, setDialog] = useState<{ kind: 'edit'; row?: VariableDef } | { kind: 'delete'; row: VariableDef } | null>(null)
  // Con una red elegida: las que la incluyen y las generales (sin redes), que también le aplican.
  const rows = (q.data ?? []).filter((v) => !network || v.networkCodes.length === 0 || v.networkCodes.includes(network))

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
        subtitle="Aquí defines qué datos del fabricante existen y a qué equipos aplican (varias redes, etapas y tipos a la vez, o a todos). El valor de cada equipo se registra en Modelos → «Datos del fabricante»."
        flush
        action={<Button size="xs" onClick={() => setDialog({ kind: 'edit' })}><Plus /> Nueva variable</Button>}
      >
        {q.isLoading ? (
          <div className="p-4"><Loading rows={5} /></div>
        ) : q.isError ? (
          <Failed what="las variables" onRetry={() => void q.refetch()} />
        ) : rows.length === 0 ? (
          <Empty>No hay variables{network ? ' para esta red' : ''}. Crea la primera.</Empty>
        ) : (
          <DataTable head={['Nombre', 'Tipo de dato', 'Aplica a', 'Valor general', 'Sección', { label: '', right: true }]}>
            {rows.map((v) => {
              const general = v.defaultValue === null || v.defaultValue === undefined ? null : formatVariableValue(v.valueType, v.defaultValue, v.unit)
              return (
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
                  <td className={td}><ScopeCell v={v} /></td>
                  <td className={`${td} text-sm`}>{general ?? <span className="text-xs text-muted-foreground">—</span>}</td>
                  <td className={`${td} text-xs`}>{v.group ?? '—'}</td>
                  <td className={`${td} text-right`}>
                    <div className="flex justify-end gap-1.5">
                      <Button size="xs" variant="secondary" aria-label={`Editar ${v.label}`} onClick={() => setDialog({ kind: 'edit', row: v })}><Pencil /> Editar</Button>
                      <Button size="xs" variant="outline" aria-label={`Eliminar ${v.label}`} onClick={() => setDialog({ kind: 'delete', row: v })}><Trash2 /> Eliminar</Button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </DataTable>
        )}
      </Panel>
      {dialog?.kind === 'edit' && <VariableDialog row={dialog.row} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'delete' && <DeleteVariableDialog row={dialog.row} onClose={() => setDialog(null)} />}
    </>
  )
}

function ModelVariablesForm({ model, variables, onClose }: { model: Model; variables: ModelVariable[]; onClose: () => void }) {
  const set = useSetModelVariables()
  const [state, setState] = useState<Record<string, FieldState>>(() => Object.fromEntries(variables.map((v) => [v.code, toFieldState(v.valueType, v.value)])))
  const [problem, setProblem] = useState<string | null>(null)

  // Secciones en el orden en que se mostrarán en la ficha.
  const sections = new Map<string, ModelVariable[]>()
  for (const v of variables) {
    const title = `${v.group ?? 'Datos del fabricante'}${scopeSuffix(v)}`
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
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Datos del fabricante · {model.modelName}</DialogTitle>
          <DialogDescription>
            Valores de referencia del equipo ({model.type.name}). Solo aparecen las variables que aplican a este modelo; deja un campo vacío si el fabricante no lo informa
            (si la variable tiene un valor general, se usa ese).
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
              {list.map((v) => {
                const general = v.defaultValue === null || v.defaultValue === undefined ? null : formatVariableValue(v.valueType, v.defaultValue, v.unit)
                return (
                  <div key={v.id} className="grid items-start gap-2 sm:grid-cols-[12rem_minmax(0,1fr)]">
                    <Label htmlFor={`var-${v.code}`} className="pt-2 text-sm">
                      {v.label}
                      {v.isKey && <Star className="ml-1 inline size-3 fill-fur-gold-500 text-fur-gold-500" aria-label="Variable clave" />}
                    </Label>
                    <div className="space-y-1">
                      <ValueInput id={`var-${v.code}`} type={v.valueType} unit={v.unit} label={v.label} state={state[v.code] ?? EMPTY_FIELD} onChange={(s) => setState((cur) => ({ ...cur, [v.code]: s }))} />
                      {general && <p className="text-[11px] text-muted-foreground">Valor general: {general}{' '}(se usa si lo dejas vacío)</p>}
                    </div>
                  </div>
                )
              })}
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

/** Registro de los datos del fabricante de un modelo (variables que aplican a él). */
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
              No hay variables que apliquen a este modelo. Crea una en la pestaña Variables (déjala sin marcar para que aplique a todos los equipos) o asígnale las redes y etapas de este tipo.
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
