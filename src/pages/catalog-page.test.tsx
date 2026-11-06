import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mockApi } from '@/test/fetch-mock'
import { renderWithProviders } from '@/test/render'
import { CatalogPage } from './catalog-page'

const type = { id: 't1', code: 'PUMP', name: 'Bomba', description: null, familyCode: 'PUMPS', familyName: 'Bombas', stageCodes: ['D05'] }
const model = { id: 'm1', modelName: 'Bomba de pulpa', catalogTag: null, specifications: {}, status: 'ACTIVE', imageUrl: null, stageCodes: ['D05'], stageInherited: true, networkCodes: ['FUR-PROC'], type, family: { id: 'f1', name: 'Bombas' }, technicalData: { componentes: ['Motor'], fabricantesReferencia: [{ nombre: 'WEG', alcance: null, sitioWeb: null }] }, referenceManufacturers: [{ nombre: 'WEG', alcance: null, sitioWeb: null }] }
const setup = (routes: Parameters<typeof mockApi>[0] = {}) => mockApi({
  'GET /catalog/specifications': { body: [] },
  'GET /catalog/assets': { body: { items: [model], total: 1, page: 1, pageSize: 20 } },
  'GET /catalog/types': { body: [type] },
  'GET /catalog/families': { body: [{ id: 'f1', code: 'PUMPS', tagCode: 'BOM', name: 'Bombas', icon: null, description: 'Descripción conservada' }] },
  'GET /catalog/manufacturers': { body: [] },
  'GET /stages/catalog': { body: [{ code: 'D05', name: 'Molienda primaria' }] },
  'GET /networks/catalog': { body: [{ code: 'FUR-PROC', name: 'Procesos' }, { code: 'FUR-PTE', name: 'Potencia Eléctrica' }] },
  'PATCH /catalog/models/m1': { body: model },
  ...routes,
})

afterEach(() => vi.unstubAllGlobals())

describe('Vista previa de la ficha del modelo', () => {
  it('consulta la ficha completa sin modificar el catálogo y permite volver a la lista', async () => {
    const api = setup({
      'GET /catalog/assets': { body: { items: [{ ...model, catalogTag: 'BOM-001', specifications: { potencia: 0, reversible: false, caudal: { min: 10, max: 20 } }, referenceManufacturers: [{ nombre: 'WEG', alcance: 'Motor de referencia', sitioWeb: 'https://www.weg.net' }] }], total: 1, page: 1, pageSize: 20 } },
      'GET /catalog/specifications': { body: [{ key: 'potencia', label: 'Potencia nominal', unit: 'kW' }] },
      'GET /catalog/models/m1/variables': { body: [{ id: 'v1', label: 'Velocidad', valueType: 'NUMBER', value: 1500, unit: 'rpm' }] },
    })
    renderWithProviders(<CatalogPage />)
    await userEvent.click(await screen.findByRole('button', { name: 'Ver ficha de Bomba de pulpa' }))
    const dialog = await screen.findByRole('dialog', { name: 'Ficha del modelo' })
    expect(within(dialog).getByText('BOM-001')).toBeInTheDocument()
    expect(within(dialog).getByText(/· Molienda primaria/)).toBeInTheDocument()
    expect(within(dialog).getByText('Procesos')).toBeInTheDocument()
    expect(await within(dialog).findByText('Potencia nominal (kW)')).toBeInTheDocument()
    expect(within(dialog).getByText('0')).toBeInTheDocument()
    expect(within(dialog).getByText('No')).toBeInTheDocument()
    expect(within(dialog).getByText('10 – 20')).toBeInTheDocument()
    expect(within(dialog).getByText('Motor')).toBeInTheDocument()
    expect(within(dialog).getByText('Motor de referencia')).toBeInTheDocument()
    expect(within(dialog).getByRole('link', { name: 'weg.net' })).toHaveAttribute('href', 'https://www.weg.net/')
    expect(await within(dialog).findByText('1500 rpm')).toBeInTheDocument()
    expect(within(dialog).queryByRole('textbox')).not.toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cerrar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Ver ficha de Bomba de pulpa' })).toBeInTheDocument()
    expect(api.calls.every(call => call.method === 'GET')).toBe(true)
  })

  it('muestra los datos vacíos de un modelo inactivo y cierra con Escape', async () => {
    setup({
      'GET /catalog/assets': { body: { items: [{ ...model, status: 'INACTIVE', technicalData: undefined, referenceManufacturers: [], stageCodes: [], networkCodes: [] }], total: 1, page: 1, pageSize: 20 } },
      'GET /catalog/models/m1/variables': { body: [] },
    })
    renderWithProviders(<CatalogPage />)
    await userEvent.click(await screen.findByRole('button', { name: 'Ver ficha de Bomba de pulpa' }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('Inactivo')).toBeInTheDocument()
    expect(within(dialog).getByText('Sin foto del modelo')).toBeInTheDocument()
    expect(within(dialog).getByText('Sin especificaciones técnicas registradas.')).toBeInTheDocument()
    expect(await within(dialog).findByText('Sin datos del fabricante registrados.')).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('conserva la ficha visible y permite reintentar si falla la carga del fabricante', async () => {
    let attempts = 0
    setup({ 'GET /catalog/models/m1/variables': () => ++attempts === 1 ? { status: 500, body: { message: 'Error temporal' } } : { body: [] } })
    renderWithProviders(<CatalogPage />)
    await userEvent.click(await screen.findByRole('button', { name: 'Ver ficha de Bomba de pulpa' }))
    const dialog = screen.getByRole('dialog')
    const alert = await within(dialog).findByRole('alert')
    expect(alert).toHaveTextContent('No se pudieron cargar los datos del fabricante.')
    await userEvent.click(within(alert).getByRole('button', { name: 'Reintentar' }))
    expect(await within(dialog).findByText('Sin datos del fabricante registrados.')).toBeInTheDocument()
  })
})

describe('Códigos TAG de familias', () => {
  it('muestra ambos códigos y exige el código TAG al crear una familia', async () => {
    const api = setup({ 'POST /catalog/families': { status: 201, body: {} } })
    renderWithProviders(<CatalogPage />)
    await userEvent.click(screen.getByRole('button', { name: 'Familias' }))
    expect(await screen.findByRole('cell', { name: 'BOM' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: 'PUMPS' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Nueva familia' }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.type(within(dialog).getByRole('textbox', { name: /^Código de integración/ }), 'GRUAS')
    await userEvent.type(within(dialog).getByRole('textbox', { name: /^Nombre/ }), 'Grúas')
    expect(within(dialog).getByRole('button', { name: 'Guardar' })).toBeDisabled()
    await userEvent.type(within(dialog).getByRole('textbox', { name: /^Código TAG/ }), 'gru')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }))
    await waitFor(() => expect(api.count('POST /catalog/families')).toBe(1))
    expect(JSON.parse(String(api.calls.find(call => call.method === 'POST')!.init.body))).toEqual({ code: 'GRUAS', tagCode: 'GRU', name: 'Grúas' })
  })

  it('precarga el código al editar y exige uno conservando integración y descripción', async () => {
    const api = setup({ 'PATCH /catalog/families/f1': { body: {} } })
    renderWithProviders(<CatalogPage />)
    await userEvent.click(screen.getByRole('button', { name: 'Familias' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Editar Bombas' }))
    const dialog = await screen.findByRole('dialog')
    const tag = within(dialog).getByRole('textbox', { name: /^Código TAG/ })
    expect(tag).toHaveValue('BOM')
    expect(within(dialog).getByRole('textbox', { name: /^Código de integración/ })).toBeDisabled()
    await userEvent.clear(tag)
    expect(within(dialog).getByRole('button', { name: 'Guardar' })).toBeDisabled()
    await userEvent.type(tag, 'bmb')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }))
    await waitFor(() => expect(api.count('PATCH /catalog/families/f1')).toBe(1))
    expect(JSON.parse(String(api.calls.find(call => call.method === 'PATCH')!.init.body))).toEqual({ tagCode: 'BMB', name: 'Bombas', icon: null, description: 'Descripción conservada' })
  })

  it('mantiene abierto el formulario si el código TAG ya pertenece a otra familia', async () => {
    setup({ 'PATCH /catalog/families/f1': { status: 409, body: { message: 'Ya existe una familia con el código TAG MOT' } } })
    renderWithProviders(<CatalogPage />)
    await userEvent.click(screen.getByRole('button', { name: 'Familias' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Editar Bombas' }))
    const dialog = await screen.findByRole('dialog')
    const tag = within(dialog).getByRole('textbox', { name: /^Código TAG/ })
    await userEvent.clear(tag)
    await userEvent.type(tag, 'MOT')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Guardar' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Ya existe una familia con el código TAG MOT')
    expect(tag).toHaveValue('MOT')
  })
})

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

  it('edita varias referencias y conserva el resto de la ficha sin fabricante único', async () => {
    const mock = setup()
    renderWithProviders(<CatalogPage />)
    await userEvent.click(await screen.findByRole('button', { name: 'Editar Bomba de pulpa' }))
    expect(screen.queryByRole('combobox', { name: 'Fabricante' })).not.toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Fabricante 1' })).toHaveValue('WEG')
    await userEvent.click(screen.getByRole('button', { name: 'Añadir fabricante de referencia' }))
    await userEvent.type(screen.getByRole('textbox', { name: 'Fabricante 2' }), 'Siemens')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    const body = JSON.parse(String(mock.calls.find(call => call.method === 'PATCH')?.init.body))
    expect(body).not.toHaveProperty('manufacturerId')
    expect(body.technicalData).toEqual({ componentes: ['Motor'], fabricantesReferencia: [{ nombre: 'WEG', alcance: null, sitioWeb: null }, { nombre: 'Siemens', alcance: null, sitioWeb: null }] })
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
