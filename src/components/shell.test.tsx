import { fireEvent, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/render'
import { Shell } from './shell'

vi.mock('@/features/auth/auth-context', () => ({ useAuth: () => ({ user: null, logout: vi.fn() }) }))
vi.mock('@/features/catalog/use-catalog', () => ({ useHealth: () => ({ data: { database: 'up' } }) }))

beforeEach(() => localStorage.clear())
describe('Navegación del administrador', () => {
  it('pliega la barra, conserva las rutas y guarda la preferencia', () => {
    const { container } = renderWithProviders(<Shell />)
    fireEvent.click(screen.getByRole('button', { name: 'Contraer navegación' }))
    expect(container.querySelector('.studio-shell')).toHaveAttribute('data-collapsed', 'true')
    expect(localStorage.getItem('fur-sidebar-collapsed')).toBe('true')
    expect(screen.getByRole('link', { name: 'Plantas' })).toHaveAttribute('href', '/plants')
    fireEvent.click(screen.getByRole('button', { name: 'Expandir navegación' }))
    expect(container.querySelector('.studio-shell')).toHaveAttribute('data-collapsed', 'false')
  })
  it('recupera la preferencia al abrir el panel', () => {
    localStorage.setItem('fur-sidebar-collapsed', 'true')
    renderWithProviders(<Shell />)
    expect(screen.getByRole('button', { name: 'Expandir navegación' })).toHaveAttribute('aria-expanded', 'false')
  })
})
