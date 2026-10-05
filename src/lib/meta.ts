import { Archive, CheckCircle2, Globe, Lock, PauseCircle, Users, type LucideIcon } from 'lucide-react'

type Meta = { label: string; color: string; icon: LucideIcon }

/** Estados de planta: icono + texto + color, nunca solo color (design.md §16). */
export const PLANT_STATUS: Record<string, Meta> = {
  ACTIVE: { label: 'Activa', color: 'var(--fur-green-500)', icon: CheckCircle2 },
  INACTIVE: { label: 'Inactiva', color: 'var(--fur-orange-500)', icon: PauseCircle },
  ARCHIVED: { label: 'Archivada', color: 'var(--fur-steel-500)', icon: Archive },
}

export const VISIBILITY: Record<string, Meta> = {
  PUBLIC: { label: 'Pública', color: 'var(--fur-blue-500)', icon: Globe },
  AUTHENTICATED: { label: 'Solo con sesión', color: 'var(--fur-cyan-500)', icon: Users },
  PRIVATE: { label: 'Privada', color: 'var(--fur-navy-700)', icon: Lock },
}

export const statusMeta = (s: string): Meta => PLANT_STATUS[s] ?? { label: s, color: 'var(--fur-steel-500)', icon: Archive }
export const visibilityMeta = (v: string): Meta => VISIBILITY[v] ?? { label: v, color: 'var(--fur-steel-500)', icon: Lock }

const ACTION_LABELS: Record<string, string> = {
  created: 'Creó',
  updated: 'Modificó',
  deleted: 'Eliminó',
  assigned: 'Asignó',
  removed: 'Quitó',
  login: 'Inició sesión',
  logout: 'Cerró sesión',
  transitioned: 'Cambió de estado',
  approved: 'Aprobó',
  closed: 'Cerró',
}
export const actionLabel = (a: string) => ACTION_LABELS[a] ?? a

const MODULE_LABELS: Record<string, string> = {
  plants: 'Plantas',
  catalog: 'Catálogo',
  iam: 'Accesos',
  assets: 'Activos',
  maintenance: 'Mantenimiento',
  inventory: 'Inventario',
  procurement: 'Compras',
  budget: 'Presupuestos',
  documents: 'Documentos',
  process: 'Procesos',
}
export const moduleLabel = (m: string) => MODULE_LABELS[m] ?? m

/** Lista legible de países/zonas frecuentes para los formularios (el servidor valida el valor final). */
export const COMMON_TIMEZONES = ['America/Lima', 'America/Bogota', 'America/Caracas', 'America/Mexico_City', 'America/Santiago', 'America/La_Paz', 'America/Guayaquil', 'America/Argentina/Buenos_Aires', 'UTC']
