import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { selectClass } from '@/lib/forms'

export type Field = {
  name: string
  label: string
  type?: 'text' | 'textarea' | 'select' | 'checkbox' | 'email' | 'url'
  required?: boolean
  options?: Array<{ value: string; label: string }>
  placeholder?: string
  hint?: string
  disabled?: boolean
  /** Ocupa las dos columnas del formulario. */
  wide?: boolean
}

export type Values = Record<string, string | boolean>

/**
 * Formulario en diálogo, dirigido por una lista de campos. Se monta solo mientras está abierto, así su estado
 * siempre parte de `initial`. Los campos de texto vacíos se entregan como cadena vacía: quien lo usa decide.
 */
export function FormDialog({
  title,
  description,
  fields,
  initial = {},
  submitLabel = 'Guardar',
  busy,
  error,
  extra,
  onClose,
  onSubmit,
}: {
  title: string
  description?: string
  fields: Field[]
  initial?: Values
  submitLabel?: string
  busy?: boolean
  error?: string | null
  /** Contenido adicional dentro del formulario, tras los campos (p. ej. un selector de archivo). */
  extra?: React.ReactNode
  onClose: () => void
  onSubmit: (values: Values) => void
}) {
  const [values, setValues] = useState<Values>(() => Object.fromEntries(fields.map((f) => [f.name, initial[f.name] ?? (f.type === 'checkbox' ? false : '')])))
  const set = (name: string, v: string | boolean) => setValues((s) => ({ ...s, [name]: v }))
  const valid = fields.every((f) => !f.required || f.type === 'checkbox' || String(values[f.name] ?? '').trim() !== '')

  function submit(e: FormEvent) {
    e.preventDefault()
    if (valid && !busy) onSubmit(values)
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4" aria-label={title}>
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map((f) => {
              const id = `f-${f.name}`
              return (
                <div key={f.name} className={f.wide || f.type === 'textarea' ? 'space-y-1.5 sm:col-span-2' : 'space-y-1.5'}>
                  {f.type === 'checkbox' ? (
                    <label htmlFor={id} className="flex items-center gap-2 text-sm font-medium">
                      <input id={id} type="checkbox" className="size-4 accent-[var(--fur-navy-900)]" checked={!!values[f.name]} disabled={f.disabled} onChange={(e) => set(f.name, e.target.checked)} />
                      {f.label}
                    </label>
                  ) : (
                    <>
                      <Label htmlFor={id}>
                        {f.label}
                        {f.required && <span className="text-fur-red-500"> *</span>}
                      </Label>
                      {f.type === 'textarea' ? (
                        <Textarea id={id} rows={3} value={String(values[f.name])} disabled={f.disabled} placeholder={f.placeholder} onChange={(e) => set(f.name, e.target.value)} />
                      ) : f.type === 'select' ? (
                        <select id={id} className={selectClass} value={String(values[f.name])} disabled={f.disabled} onChange={(e) => set(f.name, e.target.value)}>
                          {!f.required && <option value="">—</option>}
                          {f.required && values[f.name] === '' && <option value="">Elegir…</option>}
                          {f.options?.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <Input id={id} type={f.type ?? 'text'} value={String(values[f.name])} disabled={f.disabled} placeholder={f.placeholder} onChange={(e) => set(f.name, e.target.value)} />
                      )}
                    </>
                  )}
                  {f.hint && <p className="text-xs text-muted-foreground">{f.hint}</p>}
                </div>
              )
            })}
          </div>
          {extra}
          {error && (
            <p role="alert" className="rounded-lg border border-fur-red-500/40 bg-fur-red-500/10 px-3 py-2 text-sm text-fur-red-500">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!valid || busy}>
              {busy ? 'Guardando…' : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
