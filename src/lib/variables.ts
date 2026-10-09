import type { VariableType } from '@/features/catalog/use-catalog'

export const VARIABLE_TYPE_LABELS: Record<VariableType, string> = {
  NUMBER: 'Número',
  RANGE: 'Rango (mínimo y/o máximo)',
  TEXT: 'Texto',
  LIST: 'Lista de textos',
  BOOLEAN: 'Sí / No',
}

/** Lo que se escribe en el formulario: un campo de texto (a) o dos (a y b, en los rangos). */
export type FieldState = { a: string; b: string }
export const EMPTY_FIELD: FieldState = { a: '', b: '' }

const text = (n: unknown) => (typeof n === 'number' ? String(n) : '')

/** Del valor guardado al estado del formulario. */
export function toFieldState(type: VariableType, value: unknown): FieldState {
  if (value === null || value === undefined) return EMPTY_FIELD
  switch (type) {
    case 'NUMBER':
      return { a: text(value), b: '' }
    case 'RANGE': {
      const r = value as { min?: number; max?: number }
      return { a: text(r.min), b: text(r.max) }
    }
    case 'TEXT':
      return { a: typeof value === 'string' ? value : '', b: '' }
    case 'LIST':
      return { a: Array.isArray(value) ? value.join(', ') : '', b: '' }
    case 'BOOLEAN':
      return { a: typeof value === 'boolean' ? String(value) : '', b: '' }
  }
}

export type Parsed = { ok: true; value: unknown } | { ok: false; message: string }

/** Del formulario al valor que se envía: `null` si el campo está vacío (sin dato), o un mensaje si no se entiende. */
export function fromFieldState(type: VariableType, st: FieldState): Parsed {
  const a = st.a.trim()
  const b = st.b.trim()
  const num = (s: string) => Number(s.replace(',', '.'))
  switch (type) {
    case 'NUMBER':
      if (a === '') return { ok: true, value: null }
      return Number.isFinite(num(a)) ? { ok: true, value: num(a) } : { ok: false, message: 'Debe ser un número' }
    case 'RANGE': {
      if (a === '' && b === '') return { ok: true, value: null }
      if ((a !== '' && !Number.isFinite(num(a))) || (b !== '' && !Number.isFinite(num(b)))) return { ok: false, message: 'Mínimo y máximo deben ser números' }
      if (a !== '' && b !== '' && num(a) > num(b)) return { ok: false, message: 'El mínimo no puede ser mayor que el máximo' }
      return { ok: true, value: { ...(a !== '' && { min: num(a) }), ...(b !== '' && { max: num(b) }) } }
    }
    case 'TEXT':
      return { ok: true, value: a === '' ? null : a }
    case 'LIST': {
      const items = [...new Set(a.split(',').map((s) => s.trim()).filter(Boolean))]
      return { ok: true, value: items.length === 0 ? null : items }
    }
    case 'BOOLEAN':
      return { ok: true, value: a === '' ? null : a === 'true' }
  }
}

export const sameValue = (x: unknown, y: unknown) => JSON.stringify(x ?? null) === JSON.stringify(y ?? null)
