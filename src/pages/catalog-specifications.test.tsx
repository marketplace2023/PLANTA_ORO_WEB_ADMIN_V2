import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mockApi } from '@/test/fetch-mock'
import { renderWithProviders } from '@/test/render'
import { SpecificationsTab } from './catalog-specifications'

const power = { id: 'p1', familyId: 'f1', label: 'Potencia', unit: 'kW', valueType: 'NUMBER', required: true, sortOrder: 1, key: 'Potencia (kW)' }
const setup = (routes: Parameters<typeof mockApi>[0] = {}) => mockApi({
  'GET /catalog/families': { body: [{ id: 'f1', code: 'MOT', tagCode: 'MOT', name: 'Motores' }, { id: 'f2', code: 'BOM', tagCode: 'BOM', name: 'Bombas' }] },
  'GET /catalog/specifications': ({ query }) => ({ body: query.get('familyId') === 'f1' ? [power] : [] }),
  'POST /catalog/specifications': { status: 201, body: power },
  'PATCH /catalog/specifications/p1': { body: power },
  ...routes,
})
afterEach(() => vi.unstubAllGlobals())
describe('Maestro de especificaciones', () => {
  it('lista solo la familia elegida y crea parámetros sin alcances por etapa o red', async () => {
    const api = setup()
    renderWithProviders(<SpecificationsTab />)
    expect(screen.getByRole('button', { name: 'Nueva especificación' })).toBeDisabled()
    await screen.findByRole('option', { name: 'MOT · Motores' })
    await userEvent.selectOptions(screen.getByLabelText('Familia'), 'f1')
    expect(await screen.findByRole('cell', { name: 'Potencia' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: 'Número' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Nueva especificación' }))
    const dialog = screen.getByRole('dialog')
    await userEvent.type(within(dialog).getByLabelText(/^Nombre/), 'Tensión')
    await userEvent.type(within(dialog).getByLabelText('Unidad'), 'V')
    await userEvent.selectOptions(within(dialog).getByLabelText(/^Tipo de dato/), 'NUMBER')
    await userEvent.click(within(dialog).getByLabelText('Obligatoria'))
    expect(within(dialog).queryByText('Redes transversales')).not.toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }))
    await waitFor(() => expect(api.count('POST /catalog/specifications')).toBe(1))
    const call = api.calls.find(c => c.method === 'POST')!
    expect(JSON.parse(String(call.init.body))).toEqual({ familyId: 'f1', label: 'Tensión', unit: 'V', valueType: 'NUMBER', required: true, sortOrder: 0 })
    await userEvent.selectOptions(screen.getByLabelText('Familia'), 'f2')
    expect(await screen.findByText('No hay especificaciones con estos filtros.')).toBeInTheDocument()
    expect(screen.queryByRole('cell', { name: 'Potencia' })).not.toBeInTheDocument()
  })
  it('edita obligatoriedad y orden conservando la familia', async () => {
    const api = setup()
    renderWithProviders(<SpecificationsTab />)
    await screen.findByRole('option', { name: 'MOT · Motores' })
    await userEvent.selectOptions(screen.getByLabelText('Familia'), 'f1')
    await userEvent.click(await screen.findByRole('button', { name: 'Editar Potencia' }))
    const dialog = screen.getByRole('dialog')
    await userEvent.click(within(dialog).getByLabelText('Obligatoria'))
    await userEvent.clear(within(dialog).getByLabelText('Orden'))
    await userEvent.type(within(dialog).getByLabelText('Orden'), '3')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }))
    await waitFor(() => expect(api.count('PATCH /catalog/specifications/p1')).toBe(1))
    expect(JSON.parse(String(api.calls.find(c => c.method === 'PATCH')!.init.body))).toEqual({ label: 'Potencia', unit: 'kW', valueType: 'NUMBER', required: false, sortOrder: 3 })
  })
})
