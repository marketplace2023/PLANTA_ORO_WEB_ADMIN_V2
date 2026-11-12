import { fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/render'
import { mockApi } from '@/test/fetch-mock'
import { AccessRequestsPage } from './access-requests-page'

afterEach(() => vi.unstubAllGlobals())
const plants = [{ id: 'p1', slug: 'revemin-ii', code: 'REV-II', name: 'REVEMIN II' }]
const roles = [{ code: 'CONSUMER', name: 'Consulta' }, { code: 'BUDGET', name: 'Costos' }]

describe('Plant access administration', () => {
  it('explains the empty requests list and offers direct assignment without granting access on open', async () => {
    const mock = mockApi({ 'GET /admin/plant-access-requests': { body: [] }, 'GET /plants': { body: plants } })
    renderWithProviders(<AccessRequestsPage />)
    expect(await screen.findByText('No hay solicitudes pendientes.')).toBeInTheDocument()
    expect(screen.getByText(/Los usuarios registrados no aparecen automáticamente/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver plantas y miembros' })).toHaveAttribute('href', '/plants')
    fireEvent.click(screen.getByRole('button', { name: 'Asignar acceso' }))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirmar asignación' })).toBeDisabled()
    expect(mock.calls.every(call => call.method === 'GET')).toBe(true)
    expect(mock.calls.some(call => call.path.includes('//members'))).toBe(false)
  })

  it('assigns the chosen plant and role only after confirmation', async () => {
    const mock = mockApi({
      'GET /admin/plant-access-requests': { body: [] }, 'GET /plants': { body: plants },
      'GET /plants/revemin-ii/members/roles': { body: roles },
      'POST /plants/revemin-ii/members': { status: 201, body: { id: 'assignment' } },
    })
    renderWithProviders(<AccessRequestsPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Asignar acceso' }))
    await screen.findByRole('option', { name: 'REVEMIN II · REV-II' })
    fireEvent.change(screen.getByLabelText('Planta de destino'), { target: { value: 'revemin-ii' } })
    await screen.findByRole('option', { name: 'Presupuesto / costos' })
    fireEvent.change(screen.getByLabelText('Rol en la planta'), { target: { value: 'BUDGET' } })
    fireEvent.change(screen.getByLabelText('Correo del usuario registrado'), { target: { value: 'costos@example.test' } })
    expect(mock.count('POST /plants/revemin-ii/members')).toBe(0)
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar asignación' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    const request = mock.calls.find(call => call.method === 'POST')!
    expect(request.path).toBe('/plants/revemin-ii/members')
    expect(JSON.parse(request.init.body as string)).toEqual({ email: 'costos@example.test', roleCode: 'BUDGET' })
  })

  it('blocks assignment when roles cannot be loaded', async () => {
    const mock = mockApi({
      'GET /admin/plant-access-requests': { body: [] }, 'GET /plants': { body: plants },
      'GET /plants/revemin-ii/members/roles': { status: 500, body: { message: 'Unavailable' } },
    })
    renderWithProviders(<AccessRequestsPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Asignar acceso' }))
    await screen.findByRole('option', { name: 'REVEMIN II · REV-II' })
    fireEvent.change(screen.getByLabelText('Planta de destino'), { target: { value: 'revemin-ii' } })
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudieron cargar los roles')
    expect(screen.getByRole('button', { name: 'Confirmar asignación' })).toBeDisabled()
    expect(mock.calls.every(call => call.method === 'GET')).toBe(true)
  })
})
