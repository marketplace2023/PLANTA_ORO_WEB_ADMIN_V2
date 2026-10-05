import { ApiError } from '@/lib/api'

export const selectClass =
  'h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:bg-muted disabled:text-muted-foreground'

/** Mensaje legible de un error de API (con los errores de validación por campo, si vienen). */
export function errorMessage(e: unknown): string | null {
  if (!e) return null
  if (e instanceof ApiError) {
    const details = e.fieldErrors.map((f) => `${f.path}: ${f.message}`).join(' · ')
    return details ? `${e.message} (${details})` : e.message
  }
  return 'No se pudo completar la acción. Intenta de nuevo.'
}
