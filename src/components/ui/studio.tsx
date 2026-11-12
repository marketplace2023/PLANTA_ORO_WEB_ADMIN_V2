import { useId, type CSSProperties, type ReactNode } from 'react'
import { ArrowUpRight, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

/** Superficie de luz puntual, adaptada al lenguaje de Magic Card y Bento Grid. */
export function MagicSurface({ children, className, style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return <div className={cn('magic-surface', className)} style={style} onPointerMove={(event) => {
    if (event.pointerType === 'touch') return
    const box = event.currentTarget.getBoundingClientRect()
    event.currentTarget.style.setProperty('--light-x', `${event.clientX - box.left}px`)
    event.currentTarget.style.setProperty('--light-y', `${event.clientY - box.top}px`)
  }}>{children}</div>
}

export function BorderBeam() { return <span className="border-beam" aria-hidden><i /></span> }

/** La proporción siempre se calcula a partir de los datos de la consulta. */
export function RadialMetric({ value, total, label, loading = false }: { value: number; total: number; label: string; loading?: boolean }) {
  const id = useId()
  const fraction = total > 0 ? Math.max(0, Math.min(1, value / total)) : 0
  const pct = Math.round(fraction * 100)
  return <div className="radial-metric" role="img" aria-labelledby={id}>
    <svg viewBox="0 0 160 160" aria-hidden><circle cx="80" cy="80" r="66" className="radial-track" /><circle cx="80" cy="80" r="66" pathLength="100" strokeDasharray={`${fraction * 100} 100`} className="radial-value" /></svg>
    <div aria-hidden><strong>{loading || total === 0 ? '—' : `${pct}%`}</strong><span>{loading ? 'Cargando' : total === 0 ? 'Sin datos' : `${value} de ${total}`}</span></div>
    <span className="sr-only" id={id}>{label}: {loading ? 'Cargando' : total === 0 ? 'Sin datos' : `${pct} %, ${value} de ${total}`}</span>
  </div>
}

export type DeckAction = { to: string; title: string; description: string; icon: LucideIcon }

export function CommandDeck({ eyebrow, title, description, metric, actions }: {
  eyebrow: string; title: string; description: string; metric: ReactNode; actions: DeckAction[]
}) {
  return <div className="command-deck">
    <MagicSurface className="command-feature">
      <BorderBeam />
      <div className="command-feature-copy"><span className="studio-eyebrow"><i />{eyebrow}</span><h2>{title}</h2><p>{description}</p><span className="command-footnote">FUR / Centro de gestión</span></div>
      <div className="command-feature-metric">{metric}</div>
    </MagicSurface>
    <div className="command-actions" aria-label="Accesos de gestión">
      {actions.map(({ to, title: actionTitle, description: detail, icon: Icon }) => <Link key={to} to={to} className="command-action"><span className="command-action-icon"><Icon aria-hidden /></span><span><strong>{actionTitle}</strong><small>{detail}</small></span><ArrowUpRight aria-hidden /></Link>)}
    </div>
  </div>
}
