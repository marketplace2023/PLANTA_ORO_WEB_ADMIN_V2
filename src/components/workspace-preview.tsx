import { BookOpen, Factory, ShieldCheck, Wrench, Package, Users } from 'lucide-react'
import { BorderBeam } from '@/components/ui/studio'

export function WorkspacePreview({ mode }: { mode: 'admin' | 'plant' }) {
  const tiles = mode === 'admin'
    ? [{ label: 'Plantas', detail: 'Un ecosistema conectado', icon: Factory }, { label: 'Conocimiento', detail: 'Catálogos que crecen contigo', icon: BookOpen }, { label: 'Accesos', detail: 'Cada persona, su espacio', icon: ShieldCheck }]
    : [{ label: 'Activos', detail: 'Tu operación en perspectiva', icon: Package }, { label: 'Mantenimiento', detail: 'El trabajo, conectado', icon: Wrench }, { label: 'Tu equipo', detail: 'Personas y prioridades', icon: Users }]
  return <div className="workspace-preview" aria-hidden><BorderBeam /><div className="workspace-preview-heading"><span /><span /><span /><small>FUR / Workspace</small></div><div className="workspace-preview-tiles">{tiles.map(({ label, detail, icon: Icon }) => <div key={label}><Icon /><span><strong>{label}</strong><small>{detail}</small></span></div>)}</div><div className="workspace-preview-track"><i /><i /><i /><i /><i /><i /><i /></div></div>
}
