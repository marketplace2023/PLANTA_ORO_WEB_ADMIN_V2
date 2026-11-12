import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { Factory } from 'lucide-react'
import { CommandDeck, RadialMetric } from './studio'

describe('Componentes del tablero', () => {
  it('calcula el indicador con los datos recibidos y comunica su proporción', () => {
    render(<RadialMetric value={3} total={4} label="Plantas activas" />)
    expect(screen.getByRole('img', { name: 'Plantas activas: 75 %, 3 de 4' })).toBeInTheDocument()
  })
  it('distingue entre carga y ausencia de datos', () => {
    const { rerender } = render(<RadialMetric value={0} total={0} label="Plantas activas" loading />)
    expect(screen.getByRole('img', { name: 'Plantas activas: Cargando' })).toBeInTheDocument()
    rerender(<RadialMetric value={0} total={0} label="Plantas activas" />)
    expect(screen.getByRole('img', { name: 'Plantas activas: Sin datos' })).toBeInTheDocument()
    expect(screen.queryByText('0%')).not.toBeInTheDocument()
  })
  it('los accesos de gestión conservan el destino y el contexto de planta', () => {
    render(<MemoryRouter><CommandDeck eyebrow="Planta" title="Operación" description="Resumen" metric={null} actions={[{ to: '/plants/revemin-ii/assets', title: 'Explorar activos', description: 'Equipos', icon: Factory }]} /></MemoryRouter>)
    expect(screen.getByRole('link', { name: /Explorar activos/ })).toHaveAttribute('href', '/plants/revemin-ii/assets')
  })
})
