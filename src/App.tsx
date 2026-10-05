import { LogOut, ShieldAlert } from 'lucide-react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { Loading, Panel } from '@/components/kit'
import { Shell } from '@/components/shell'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/auth-context'
import { ActivityPage } from '@/pages/activity-page'
import { CatalogPage } from '@/pages/catalog-page'
import { DashboardPage } from '@/pages/dashboard-page'
import { LoginPage } from '@/pages/login-page'
import { MastersPage } from '@/pages/masters-page'
import { PlantDetailPage } from '@/pages/plant-detail-page'
import { PlantsPage } from '@/pages/plants-page'

/** Todo el panel es del administrador del ecosistema: sin sesión al login; con otra cuenta, acceso denegado explicado. */
function AdminArea() {
  const { status, user, logout } = useAuth()
  const navigate = useNavigate()
  if (status === 'loading') return <div className="p-8"><Loading rows={4} /></div>
  if (status === 'anonymous' || !user) return <Navigate to="/login" replace />
  if (!user.isGlobalAdmin) {
    return (
      <div className="grid min-h-screen place-items-center bg-background p-6">
        <Panel className="max-w-md">
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <ShieldAlert className="size-8 text-fur-orange-500" aria-hidden />
            <h1 className="text-xl font-bold text-fur-navy-900">Acceso restringido</h1>
            <p className="text-sm text-muted-foreground">
              Esta cuenta ({user.email}) no es administradora del ecosistema. Para operar una planta usa el panel de planta.
            </p>
            <Button
              variant="secondary"
              onClick={async () => {
                await logout()
                navigate('/login')
              }}
            >
              <LogOut /> Cerrar sesión
            </Button>
          </div>
        </Panel>
      </div>
    )
  }
  return <Shell />
}

export default function App() {
  return (
    <Routes>
      <Route path="login" element={<LoginPage />} />
      <Route element={<AdminArea />}>
        <Route index element={<DashboardPage />} />
        <Route path="plants" element={<PlantsPage />} />
        <Route path="plants/:slug" element={<PlantDetailPage />} />
        <Route path="catalog" element={<CatalogPage />} />
        <Route path="masters" element={<MastersPage />} />
        <Route path="activity" element={<ActivityPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
