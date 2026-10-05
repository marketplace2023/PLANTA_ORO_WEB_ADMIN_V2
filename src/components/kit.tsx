import { AlertTriangle, Inbox, Lock, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export type Tone = 'default' | 'ok' | 'warning' | 'danger'

const TONE_COLOR: Record<Tone, string> = {
  default: 'var(--fur-navy-800)',
  ok: 'var(--fur-green-500)',
  warning: 'var(--fur-orange-500)',
  danger: 'var(--fur-red-500)',
}

/** Encabezado de pantalla: título, descripción y acciones a la derecha. */
export function ScreenHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-fur-navy-900">{title}</h1>
        {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

/** Contenedor de bloque del tablero. */
export function Panel({
  title,
  subtitle,
  action,
  children,
  className,
  flush,
}: {
  title?: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
  className?: string
  /** Sin relleno interno (tablas a sangre). */
  flush?: boolean
}) {
  return (
    <section className={cn('rounded-xl border border-border bg-card shadow-sm', className)}>
      {(title || action) && (
        <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            {title && <h2 className="text-sm font-semibold text-fur-navy-900">{title}</h2>}
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={flush ? '' : 'p-4'}>{children}</div>
    </section>
  )
}

/** Indicador principal. Con `to`, toda la tarjeta lleva al módulo. */
export function Kpi({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'default',
  to,
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  icon: LucideIcon
  tone?: Tone
  to?: string
}) {
  const body = (
    <div
      className="relative flex h-full flex-col gap-2 overflow-hidden rounded-xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
      style={{ borderTopColor: TONE_COLOR[tone], borderTopWidth: 3 }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{label}</span>
        <span className="grid size-8 place-items-center rounded-lg bg-fur-navy-900 text-fur-gold-400">
          <Icon className="size-4" aria-hidden />
        </span>
      </div>
      <div className={cn('leading-none font-bold text-fur-navy-900 tabular-nums', typeof value === 'string' && value.length > 9 ? 'text-2xl' : 'text-3xl')}>{value}</div>
      {hint && (
        <p className="text-xs" style={{ color: tone === 'default' ? 'var(--fur-gray-600)' : TONE_COLOR[tone] }}>
          {hint}
        </p>
      )}
    </div>
  )
  return to ? (
    <Link to={to} className="block rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
      {body}
    </Link>
  ) : (
    body
  )
}

export type BarRow = { key: string; label: string; value: number; color?: string; icon?: LucideIcon }

/** Barras horizontales con etiqueta directa y valor: sin ejes ni leyendas aparte. */
export function BarRows({ rows, empty = 'Sin datos' }: { rows: BarRow[]; empty?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value))
  if (rows.length === 0 || rows.every((r) => r.value === 0)) return <p className="py-6 text-center text-sm text-muted-foreground">{empty}</p>
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.key} className="grid grid-cols-[minmax(0,9rem)_1fr_2.5rem] items-center gap-3 text-sm">
          <span className="flex items-center gap-1.5 truncate text-fur-gray-800">
            {r.icon && <r.icon className="size-3.5 shrink-0" style={{ color: r.color }} aria-hidden />}
            {r.label}
          </span>
          <span className="h-2.5 overflow-hidden rounded-full bg-fur-gray-100" aria-hidden>
            <span className="block h-full rounded-full" style={{ width: `${(r.value / max) * 100}%`, background: r.color ?? 'var(--fur-navy-800)' }} />
          </span>
          <span className="text-right font-semibold text-fur-navy-900 tabular-nums">{r.value}</span>
        </li>
      ))}
    </ul>
  )
}

/** Barra de avance 0-100 con valor. */
export function Progress({ pct, tone = 'default', label }: { pct: number | null; tone?: Tone; label?: string }) {
  const v = pct === null ? 0 : Math.max(0, Math.min(100, pct))
  return (
    <div className="flex items-center gap-2" role="progressbar" aria-valuenow={pct ?? undefined} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <span className="h-2 flex-1 overflow-hidden rounded-full bg-fur-gray-100">
        <span className="block h-full rounded-full" style={{ width: `${v}%`, background: tone === 'default' ? 'var(--fur-gold-500)' : TONE_COLOR[tone] }} />
      </span>
      <span className="w-12 text-right text-xs font-semibold text-fur-navy-900 tabular-nums">{pct === null ? '—' : `${Math.round(pct)} %`}</span>
    </div>
  )
}

/** Estado: icono + texto + color (nunca solo color). */
export function Pill({ label, color, icon: Icon }: { label: string; color: string; icon?: LucideIcon }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold whitespace-nowrap" style={{ color, borderColor: color, background: `color-mix(in srgb, ${color} 10%, white)` }}>
      {Icon && <Icon className="size-3" aria-hidden />}
      {label}
    </span>
  )
}

export function Loading({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Cargando">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-8" />
      ))}
    </div>
  )
}

export function Empty({ children = 'Sin registros' }: { children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 py-8 text-sm text-muted-foreground">
      <Inbox className="size-6" aria-hidden />
      {children}
    </div>
  )
}

export function Failed({ onRetry, what = 'estos datos' }: { onRetry?: () => void; what?: string }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-2 py-8 text-sm text-fur-red-500">
      <AlertTriangle className="size-6" aria-hidden />
      No se pudo cargar {what}.
      {onRetry && (
        <button type="button" onClick={onRetry} className="font-semibold text-fur-navy-900 underline underline-offset-2">
          Reintentar
        </button>
      )}
    </div>
  )
}

/** Muestra el contenido solo con el permiso; si no, lo explica (no lo deja en blanco). */
export function Gate({ allowed, module, children }: { allowed: boolean; module: string; children: ReactNode }) {
  if (allowed) return <>{children}</>
  return (
    <Panel>
      <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
        <Lock className="size-6" aria-hidden />
        <p className="font-semibold text-fur-navy-900">Sin acceso a {module}</p>
        <p>Tu rol en esta planta no incluye este módulo. Pide a un administrador de planta que te lo asigne.</p>
      </div>
    </Panel>
  )
}

/** Selector segmentado para filtros rápidos. */
export function Segmented<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: Array<{ value: T; label: string; count?: number }>; label: string }) {
  return (
    <div role="group" aria-label={label} className="inline-flex flex-wrap gap-1 rounded-lg border border-border bg-card p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded-md px-3 py-1.5 text-xs font-semibold transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
            value === o.value ? 'bg-fur-navy-900 text-white' : 'text-fur-gray-600 hover:bg-muted',
          )}
        >
          {o.label}
          {o.count !== undefined && <span className={cn('ml-1.5 tabular-nums', value === o.value ? 'text-fur-gold-400' : 'text-fur-gray-500')}>{o.count}</span>}
        </button>
      ))}
    </div>
  )
}

export const th = 'px-4 py-2.5 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase whitespace-nowrap'
export const td = 'px-4 py-2.5 text-sm'

/** Tabla de datos con encabezado fijo y scroll horizontal en pantallas angostas. */
export function DataTable({ head, children }: { head: Array<string | { label: string; right?: boolean }>; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead className="bg-fur-gray-50">
          <tr>
            {head.map((h) => {
              const o = typeof h === 'string' ? { label: h } : h
              return (
                <th key={o.label} className={cn(th, (o as { right?: boolean }).right && 'text-right')}>
                  {o.label}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">{children}</tbody>
      </table>
    </div>
  )
}
