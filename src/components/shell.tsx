import { Activity, BookOpen, Cog, Factory, LayoutDashboard, LogOut, Menu, RefreshCw, ShieldCheck, X, type LucideIcon } from 'lucide-react'
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
    ],
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
    <div className="flex items-center gap-2.5 px-4 pt-4 pb-3">
      <span className="grid size-9 place-items-center rounded-lg bg-fur-gold-500 text-sm font-extrabold text-fur-navy-950">FUR</span>
      <div className="leading-tight">
        <p className="text-sm font-bold text-white">Panel de Administración</p>
        <p className="text-[11px] text-white/60">Ecosistema FUR</p>
      </div>
    </div>
  )
}

/** Equivale al selector de planta del panel de planta: aquí el contexto siempre es el ecosistema completo. */
function ContextCard() {
  const { data } = useHealth()
  const up = data?.database === 'up'
  return (
    <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-fur-navy-900 px-3 py-2.5">
      <span className="grid size-9 shrink-0 place-items-center rounded-md bg-fur-gold-500 text-fur-navy-950">
        <ShieldCheck className="size-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-semibold tracking-widest text-fur-gold-400 uppercase">Contexto</span>
        <span className="block truncate text-sm font-semibold text-white">Ecosistema global</span>
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
          <p className="mb-1.5 px-3 text-[10px] font-semibold tracking-widest text-white/50 uppercase">{s.title}</p>
          <ul className="space-y-0.5">
            {s.items.map(({ to, label, icon: Icon, end }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-lg border-l-[3px] px-3 py-2 text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/60',
                      isActive ? 'border-fur-gold-500 bg-fur-navy-800 text-white' : 'border-transparent text-white/75 hover:bg-fur-navy-900 hover:text-white',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon className={cn('size-[18px]', isActive && 'text-fur-gold-400')} aria-hidden />
                      {label}
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
    <div className="flex items-center gap-3 border-t border-white/10 p-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-fur-navy-800 text-sm font-bold text-fur-gold-400" aria-hidden>
        {user.firstName[0]}
        {user.lastName[0]}
      </span>
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-sm font-semibold text-white">
          {user.firstName} {user.lastName}
        </p>
        <p className="truncate text-xs text-white/60">Admin. del ecosistema</p>
      </div>
      <button
        type="button"
        aria-label="Cerrar sesión"
        title="Cerrar sesión"
        onClick={async () => {
          await logout()
          navigate('/login')
        }}
        className="grid size-9 place-items-center rounded-lg text-white/70 outline-none hover:bg-fur-navy-800 hover:text-white focus-visible:ring-3 focus-visible:ring-ring/60"
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
      <div className="px-3 pb-1">
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
  const queryClient = useQueryClient()
  const fetching = useIsFetching() > 0

  return (
    <div className="min-h-screen bg-background lg:pl-64">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col bg-fur-navy-950 lg:flex">
        <SidebarBody />
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menú">
          <button type="button" className="absolute inset-0 bg-black/50" aria-label="Cerrar menú" onClick={() => setOpen(false)} />
          <aside className="relative flex h-full w-72 max-w-[85vw] flex-col bg-fur-navy-950">
            <button type="button" onClick={() => setOpen(false)} className="absolute top-3 right-3 grid size-9 place-items-center rounded-lg text-white/70 hover:bg-fur-navy-800" aria-label="Cerrar menú">
              <X className="size-5" />
            </button>
            <SidebarBody onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-card/95 px-4 backdrop-blur lg:px-8">
          <Button variant="ghost" size="icon-sm" className="lg:hidden" aria-label="Abrir menú" onClick={() => setOpen(true)}>
            <Menu />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-fur-navy-900">Administración del ecosistema</p>
            <p className="truncate text-xs text-muted-foreground">Plantas, catálogos maestros y seguridad</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void queryClient.invalidateQueries()} aria-label="Actualizar datos">
            <RefreshCw className={cn(fetching && 'animate-spin')} /> <span className="hidden sm:inline">Actualizar</span>
          </Button>
        </header>
        <main className="flex-1 px-4 py-6 lg:px-8">
          <div className="mx-auto max-w-[1400px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
