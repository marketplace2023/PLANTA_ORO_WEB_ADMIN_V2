import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mockApi } from '@/test/fetch-mock'
import { renderWithProviders } from '@/test/render'
import { CatalogPage } from './catalog-page'

const type = { id: 't1', code: 'PUMP', name: 'Bomba', description: null, familyCode: 'PUMPS', familyName: 'Bombas', stageCodes: ['D05'] }
const model = { id: 'm1', modelName: 'Bomba de pulpa', catalogTag: null, specifications: {}, status: 'ACTIVE', imageUrl: null, stageCodes: ['D05'], stageInherited: true, networkCodes: ['FUR-PROC'], type, family: { id: 'f1', name: 'Bombas' }, manufacturer: null }
const setup = () => mockApi({
  'GET /catalog/assets': { body: { items: [model], total: 1, page: 1, pageSize: 20 } },
  'GET /catalog/types': { body: [type] },
  'GET /catalog/families': { body: [{ id: 'f1', code: 'PUMPS', name: 'Bombas', icon: null }] },
  'GET /catalog/manufacturers': { body: [] },
  'GET /stages/catalog': { body: [{ code: 'D05', name: 'Molienda primaria' }] },
  'GET /networks/catalog': { body: [{ code: 'FUR-PROC', name: 'Procesos' }, { code: 'FUR-PTE', name: 'Potencia Eléctrica' }] },
  'PATCH /catalog/models/m1': { body: model },
})

afterEach(() => vi.unstubAllGlobals())

describe('Redes propias del modelo', () => {
  it('abre la carga de imágenes por TAG desde el catálogo', async () => {
    setup()
    renderWithProviders(<CatalogPage />)
    await userEvent.click(screen.getByRole('button', { name: 'Cargar imágenes' }))
    expect(screen.getByRole('heading', { name: 'Cargar imágenes por TAG' })).toBeInTheDocument()
  })
  it('abre la eliminación por Excel desde el catálogo', async () => {
    setup()
    renderWithProviders(<CatalogPage />)
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar por Excel' }))
    expect(screen.getByRole('heading', { name: 'Eliminar modelos por Excel' })).toBeInTheDocument()
  })
  it('edita y vacía las redes del modelo y empieza los modelos nuevos sin asignación', async () => {
    const mock = setup()
    renderWithProviders(<CatalogPage />)
    await userEvent.click(await screen.findByRole('button', { name: 'Editar Bomba de pulpa' }))
    const processes = await screen.findByRole('checkbox', { name: 'Procesos' })
    expect(processes).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Potencia Eléctrica' })).not.toBeChecked()
    await userEvent.click(processes)
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(JSON.parse(String(mock.calls.find(call => call.method === 'PATCH')?.init.body))).toMatchObject({ networkCodes: [] })
    await userEvent.click(screen.getByRole('button', { name: 'Nuevo modelo' }))
    expect(screen.getByRole('checkbox', { name: 'Procesos' })).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Potencia Eléctrica' })).not.toBeChecked()
  })

  it('el formulario de tipos conserva etapas y no permite asignar redes', async () => {
    setup()
    renderWithProviders(<CatalogPage />)
    await userEvent.click(screen.getByRole('button', { name: 'Tipos' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Editar Bomba' }))
    expect(screen.getByRole('checkbox', { name: 'D05 · Molienda primaria' })).toBeChecked()
    expect(screen.queryByText('Redes transversales')).not.toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: 'Procesos' })).not.toBeInTheDocument()
  })
})
