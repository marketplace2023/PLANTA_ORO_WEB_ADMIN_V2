import { WorkspacePreview } from '@/components/workspace-preview'
import { BrandLogo } from '@/components/brand-logo'
import { LogIn } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/features/auth/auth-context'
import { ApiError } from '@/lib/api'

export function LoginPage() {
  const { status, login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (status === 'authenticated') return <Navigate to="/" replace />

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await login(email.trim(), password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 401
          ? 'Correo o contraseña incorrectos.'
          : err instanceof ApiError && err.status === 429
            ? 'Demasiados intentos. Espera un minuto e intenta de nuevo.'
            : 'No se pudo iniciar sesión. Verifica que la API esté en línea.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-shell grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <aside className="login-visual relative hidden flex-col justify-between overflow-hidden p-10 text-white lg:flex">
        <div className="login-brand"><BrandLogo /></div>
        <div>
          <p className="mb-3 text-sm font-semibold tracking-widest text-fur-gold-400 uppercase">Panel de Administración</p>
          <h1 className="max-w-md text-4xl leading-tight font-bold">Plantas, catálogos y accesos de todo el ecosistema.</h1>
          <p className="mt-4 max-w-md text-white/70">Crea y configura plantas, asigna responsables, mantén los catálogos maestros y supervisa la actividad.</p>
        </div>
        <WorkspacePreview mode="admin" />
      </aside>
      <main className="login-main grid place-items-center p-6">
        <div className="login-content">
          <div className="login-mobile-brand lg:hidden"><BrandLogo /></div>
          <form onSubmit={submit} className="w-full max-w-sm space-y-5" aria-label="Iniciar sesión">
            <div>
              <h2 className="text-2xl font-bold text-fur-navy-900">Iniciar sesión</h2>
              <p className="text-sm text-muted-foreground">Solo para administradores del ecosistema.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Correo</Label>
              <Input id="email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Contraseña</Label>
              <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            {error && (
              <p role="alert" className="rounded-lg border border-fur-red-500/40 bg-fur-red-500/10 px-3 py-2 text-sm text-fur-red-500">
                {error}
              </p>
            )}
            <Button type="submit" size="lg" className="w-full" disabled={busy}>
              <LogIn /> {busy ? 'Entrando…' : 'Entrar'}
            </Button>
          </form>
        </div>
      </main>
    </div>
  )
}
