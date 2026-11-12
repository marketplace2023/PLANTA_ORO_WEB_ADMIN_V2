import { Cable, Camera, ClipboardCheck, FlaskConical, Network, Radio, Settings2, ShoppingBag, ShoppingCart, Wrench, Zap, type LucideIcon } from 'lucide-react'
import type { CSSProperties } from 'react'

const ICONS: Record<string, LucideIcon> = {
  'FUR-PROC': Settings2, 'FUR-PTE': Zap, 'FUR-IOT': Radio, 'FUR-GPON': Cable,
  'FUR-CC': ClipboardCheck, 'FUR-LAB': FlaskConical, 'FUR-MNT': Wrench,
  'FUR-RQ': ShoppingCart, 'FUR-OF': ShoppingBag, 'FUR-CAM': Camera,
}

export function NetworkMark({ code, colorToken }: { code: string; colorToken: string | null }) {
  const Icon = ICONS[code] ?? Network
  return <span className="network-mark" style={{ '--network-color': colorToken ? `var(--${colorToken})` : 'var(--fur-navy-800)' } as CSSProperties} aria-hidden><Icon /></span>
}
