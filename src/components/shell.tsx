import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { BrandLogo } from '@/components/brand-logo'
import { PanelFooter } from '@/components/panel-footer'
import { Activity, BookOpen, Building2, Cog, Factory, LayoutDashboard, LogOut, Menu, RefreshCw, ShieldCheck, UserCheck, X, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useIsFetching, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/auth-context'
import { useHealth } from '@/features/catalog/use-catalog'
import { cn } from '@/lib/utils'

type Item = { to: string; label: string; icon: LucideIcon; end?: boolean }

const SECTIONS: Array<{ title: string; items: Item[] }> = [
  {
    title: 'Ecosistema',
    items: [
      { to: '/', label: 'Resumen', icon: LayoutDashboard, end: true },
      { to: '/plants', label: 'Plantas', icon: Factory },
      { to: '/access-requests', label: 'Solicitudes de acceso', icon: UserCheck },
    ],
  },
  {
    title: 'Organizaciones',
    items: [{ to: '/commerce-cases', label: 'Incidencias del marketplace', icon: Building2 },
      { to: '/professional-cases', label: 'Incidencias de servicios', icon: Building2 },
      { to: '/organizations', label: 'Proveedores y contratistas', icon: Building2 }],
  },
  {
    title: 'Catálogos maestros',
    items: [
      { to: '/catalog', label: 'Catálogo de activos', icon: BookOpen },
      { to: '/masters', label: 'Etapas y redes', icon: Cog },
    ],
  },
  {
    title: 'Seguridad',
    items: [{ to: '/activity', label: 'Actividad y auditoría', icon: Activity }],
  },
]

function Brand() {
  return (
    <div className="sidebar-brand">
      <BrandLogo />
      <p>Panel de Administración</p>
    </div>
  )
}

/** Equivale al selector de planta del panel de planta: aquí el contexto siempre es el ecosistema completo. */
function ContextCard() {
  const { data } = useHealth()
  const up = data?.database === 'up'
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-fur-gray-50 px-3 py-2.5">
      <span className="grid size-9 shrink-0 place-items-center rounded-md bg-fur-gold-500 text-fur-navy-950">
        <ShieldCheck className="size-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-semibold tracking-widest text-fur-navy-700 uppercase">Contexto</span>
        <span className="block truncate text-sm font-semibold text-fur-navy-900">Ecosistema global</span>
      </span>
      <span className="flex shrink-0 items-center" title={up ? 'API y base de datos en línea' : 'Sin conexión con la API o la base de datos'}>
        <span className={cn('size-2.5 rounded-full', up ? 'bg-fur-green-500' : 'bg-fur-red-500')} aria-hidden />
        <span className="sr-only">{up ? 'En línea' : 'Sin conexión'}</span>
      </span>
    </div>
  )
}

function Nav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav aria-label="Secciones de administración" className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
      {SECTIONS.map((s) => (
        <div key={s.title}>
          <p className="sidebar-section-title mb-1.5 px-3 text-[10px] font-semibold tracking-widest text-fur-gray-500 uppercase">{s.title}</p>
          <ul className="space-y-0.5">
            {s.items.map(({ to, label, icon: Icon, end }) => (
              <li key={to}>
                <NavLink
                  title={label}
                  aria-label={label}
                  to={to}
                  end={end}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-lg border-l-[3px] px-3 py-2 text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/60',
                      isActive ? 'border-fur-gold-600 bg-fur-gold-500/20 text-fur-navy-950' : 'border-transparent text-fur-gray-600 hover:bg-fur-gray-100 hover:text-fur-navy-900',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon className={cn('size-[18px]', isActive && 'text-fur-navy-900')} aria-hidden />
                      <span className="sidebar-label">{label}</span>
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  )
}

function UserCard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  if (!user) return null
  return (
    <div className="flex items-center gap-3 sidebar-user border-t border-border p-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-fur-navy-800 text-sm font-bold text-fur-gold-400" aria-hidden>
        {user.firstName[0]}
        {user.lastName[0]}
      </span>
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-sm font-semibold text-fur-navy-900">
          {user.firstName} {user.lastName}
        </p>
        <p className="truncate text-xs text-fur-gray-600">Admin. del ecosistema</p>
      </div>
      <button
        type="button"
        aria-label="Cerrar sesión"
        title="Cerrar sesión"
        onClick={async () => {
          await logout()
          navigate('/login')
        }}
        className="grid size-9 place-items-center rounded-lg text-fur-gray-600 outline-none hover:bg-fur-gray-100 hover:text-fur-navy-900 focus-visible:ring-3 focus-visible:ring-ring/60"
      >
        <LogOut className="size-4" />
      </button>
    </div>
  )
}

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      <Brand />
      <div className="sidebar-context px-3 pb-1">
        <ContextCard />
      </div>
      <Nav onNavigate={onNavigate} />
      <UserCard />
    </>
  )
}

/** Marco del panel: barra lateral navy fija en escritorio, cajón en móvil (mismo layout que el panel de planta). */
export function Shell() {
  const [open, setOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('fur-sidebar-collapsed') === 'true' } catch { return false }
  })
  const toggleSidebar = () => {
    setCollapsed((previous) => {
      try { localStorage.setItem('fur-sidebar-collapsed', String(!previous)) } catch { /* La preferencia es opcional. */ }
      return !previous
    })
  }
  const queryClient = useQueryClient()
  const fetching = useIsFetching() > 0

  return (
    <div className="panel-shell studio-shell min-h-screen bg-background lg:pl-64" data-collapsed={collapsed}>
      <a className="skip-link" href="#main-content">Saltar al contenido</a>
      <aside id="desktop-navigation" className="panel-sidebar desktop-sidebar fixed inset-y-0 left-0 hidden w-64 flex-col lg:flex">
        <SidebarBody />
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menú">
          <button type="button" className="absolute inset-0 bg-black/50" aria-label="Cerrar menú" onClick={() => setOpen(false)} />
          <aside className="panel-sidebar relative flex h-full w-72 max-w-[85vw] flex-col">
            <button type="button" onClick={() => setOpen(false)} className="sidebar-close absolute top-2 right-2 grid size-8 place-items-center rounded-lg text-fur-navy-900 hover:bg-white/60" aria-label="Cerrar menú">
              <X className="size-5" />
            </button>
            <SidebarBody onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-h-screen flex-col">
        <header className="panel-topbar sticky top-0 z-30 flex items-center gap-3 px-4 lg:px-8">
          <Button variant="ghost" size="icon-sm" className="lg:hidden" aria-label="Abrir menú" onClick={() => setOpen(true)}>
            <Menu />
          </Button>
          <Button variant="ghost" size="icon-sm" className="sidebar-toggle hidden lg:flex" onClick={toggleSidebar} aria-label={collapsed ? 'Expandir navegación' : 'Contraer navegación'} aria-expanded={!collapsed} aria-controls="desktop-navigation">{collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}</Button>
          <img src="/brand/fur-mark.svg" alt="" className="topbar-brand-mark lg:hidden" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-fur-navy-900">Administración del ecosistema</p>
            <p className="truncate text-xs text-muted-foreground">Plantas, catálogos maestros y seguridad</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void queryClient.invalidateQueries()} aria-label="Actualizar datos">
            <RefreshCw className={cn(fetching && 'animate-spin')} /> <span className="hidden sm:inline">Actualizar</span>
          </Button>
        </header>
        <main id="main-content" className="panel-main flex-1 px-4 py-6 lg:px-8">
          <div className="mx-auto max-w-[1400px]">
            <Outlet />
          </div>
        </main>
        <PanelFooter />
      </div>
    </div>
  )
}
