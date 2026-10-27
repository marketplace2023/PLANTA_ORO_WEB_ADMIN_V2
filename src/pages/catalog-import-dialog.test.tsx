import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mockApi } from '@/test/fetch-mock'
import { renderWithProviders } from '@/test/render'
import { CatalogImportDialog } from './catalog-import-dialog'

const NETWORKS = [{ code: 'FUR-PROC', name: 'Procesos' }, { code: 'FUR-IOT', name: 'IoT / Instrumentación' }, { code: 'FUR-PTE', name: 'Potencia Eléctrica' }]
const COUNTS = { create: 1, update: 0 }
const preview = (networks: typeof NETWORKS) => ({
  fingerprint: 'a'.repeat(64), issues: [], networks,
  summary: { models: COUNTS, families: COUNTS, types: COUNTS, manufacturers: { ...COUNTS, merged: 0 }, specifications: 1 },
  rows: [{ tag: 'TEST-01', name: 'Bomba', family: 'Bombas', type: 'Bomba de pulpa', manufacturer: 'Pendiente', stages: ['D05'], components: ['Motor y carcasa'], referenceManufacturers: null, specifications: { Material: 'Acero' }, action: 'create' }],
})
const file = () => new File(['test workbook'], 'maestro.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })

afterEach(() => vi.unstubAllGlobals())

describe('Redes de la importación Excel', () => {
  it('ofrece descargar la plantilla antes de seleccionar redes o subir un archivo', async () => {
    mockApi({ 'GET /networks/catalog': { body: NETWORKS } })
    renderWithProviders(<CatalogImportDialog onClose={vi.fn()} onImported={vi.fn()} />)
    const template = screen.getByRole('link', { name: 'Descargar plantilla Excel' })
    expect(template).toHaveAttribute('href', `${import.meta.env.BASE_URL}templates/plantilla-importacion-catalogo.xlsx`)
    expect(template).toHaveAttribute('download', 'plantilla-importacion-catalogo.xlsx')
    expect(screen.getByText(/filas de activos vacías/)).toBeInTheDocument()
    await screen.findByRole('checkbox', { name: 'Procesos' })
    expect(screen.getByRole('button', { name: 'Analizar Excel' })).toBeDisabled()
  })

  it('exige selección, la envía a la vista previa y la confirmación y muestra el resultado', async () => {
    const chosen = NETWORKS.slice(1)
    const mock = mockApi({
      'GET /networks/catalog': { body: NETWORKS },
      'POST /catalog/imports/preview': { body: preview(chosen) },
      'POST /catalog/imports': { body: { ...preview(chosen), imported: 1 } },
    })
    const onImported = vi.fn()
    renderWithProviders(<CatalogImportDialog onClose={vi.fn()} onImported={onImported} />)
    await screen.findByRole('checkbox', { name: 'Procesos' })
    await userEvent.upload(screen.getByLabelText(/Archivo Excel/), file())
    expect(screen.getByRole('button', { name: 'Analizar Excel' })).toBeDisabled()
    await userEvent.click(screen.getByRole('checkbox', { name: 'IoT / Instrumentación' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'Potencia Eléctrica' }))
    await userEvent.click(screen.getByRole('button', { name: 'Analizar Excel' }))
    await screen.findByText(/Redes de destino:.*IoT/)
    const analyzed = mock.calls.find(call => call.path === '/catalog/imports/preview')?.init.body as FormData
    expect(JSON.parse(String(analyzed.get('networkCodes')))).toEqual(['FUR-IOT', 'FUR-PTE'])
    expect(analyzed.get('file')).toBeInstanceOf(File)
    await userEvent.click(screen.getByRole('button', { name: 'Importar al catálogo' }))
    await screen.findByText('Importación completada')
    expect(screen.getByText(/Redes asignadas a los modelos:/)).toHaveTextContent('IoT / Instrumentación · Potencia Eléctrica')
    const applied = mock.calls.find(call => call.path === '/catalog/imports')?.init.body as FormData
    expect(JSON.parse(String(applied.get('networkCodes')))).toEqual(['FUR-IOT', 'FUR-PTE'])
    expect(applied.get('fingerprint')).toBe('a'.repeat(64))
    expect(applied.get('allowMissingSpecifications')).toBe('false')
    expect(onImported).toHaveBeenCalledOnce()
  })

  it('cambiar las redes invalida la vista previa y obliga a analizar nuevamente', async () => {
    const mock = mockApi({
      'GET /networks/catalog': { body: NETWORKS },
      'POST /catalog/imports/preview': { body: preview([NETWORKS[0]]) },
    })
    renderWithProviders(<CatalogImportDialog onClose={vi.fn()} onImported={vi.fn()} />)
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Procesos' }))
    await userEvent.upload(screen.getByLabelText(/Archivo Excel/), file())
    await userEvent.click(screen.getByRole('button', { name: 'Analizar Excel' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Importar al catálogo' })).toBeEnabled())
    await userEvent.click(screen.getByRole('checkbox', { name: 'Potencia Eléctrica' }))
    expect(screen.queryByText(/Redes de destino:/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Importar al catálogo' })).toBeDisabled()
    expect(mock.calls.filter(call => call.path === '/catalog/imports')).toHaveLength(0)
    await userEvent.click(screen.getByRole('checkbox', { name: 'Procesos' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'Potencia Eléctrica' }))
    expect(screen.getByRole('button', { name: 'Analizar Excel' })).toBeDisabled()
  })

  it('muestra todos los componentes y fabricantes de referencia revisados antes de importar', async () => {
    const p = preview([NETWORKS[0]])
    const extended = { ...p, rows: [{ ...p.rows[0], components: ['Motor y carcasa', 'Impulsor'], referenceManufacturers: [
      { nombre: 'Metso', alcance: 'Bombas de pulpa', sitioWeb: 'https://www.metso.com/' },
      { nombre: 'WEG', alcance: null, sitioWeb: null },
    ] }] }
    mockApi({ 'GET /networks/catalog': { body: NETWORKS }, 'POST /catalog/imports/preview': { body: extended } })
    renderWithProviders(<CatalogImportDialog onClose={vi.fn()} onImported={vi.fn()} />)
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Procesos' }))
    await userEvent.upload(screen.getByLabelText(/Archivo Excel/), file())
    await userEvent.click(screen.getByRole('button', { name: 'Analizar Excel' }))
    await userEvent.click(await screen.findByText('Ver componentes, especificaciones y fabricantes'))
    for (const text of ['Motor y carcasa', 'Impulsor', 'Metso', 'WEG', 'Bombas de pulpa', 'https://www.metso.com/']) expect(screen.getByText(text)).toBeVisible()
    expect(screen.getByRole('button', { name: 'Importar al catálogo' })).toBeEnabled()
  })

  it.each([{ references: null, text: /El archivo no incluye la hoja de fabricantes de referencia/ }, { references: [], text: /Sin fabricantes de referencia informados/ }])('explica la ausencia de referencias ($references)', async ({ references, text }) => {
    const p = preview([NETWORKS[0]])
    const extended = { ...p, rows: [{ ...p.rows[0], components: [], referenceManufacturers: references }] }
    mockApi({ 'GET /networks/catalog': { body: NETWORKS }, 'POST /catalog/imports/preview': { body: extended } })
    renderWithProviders(<CatalogImportDialog onClose={vi.fn()} onImported={vi.fn()} />)
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Procesos' }))
    await userEvent.upload(screen.getByLabelText(/Archivo Excel/), file())
    await userEvent.click(screen.getByRole('button', { name: 'Analizar Excel' }))
    await userEvent.click(await screen.findByText('Ver componentes, especificaciones y fabricantes'))
    expect(screen.getByText('Sin componentes informados')).toBeVisible()
    expect(screen.getByText(text)).toBeVisible()
  })

  it('permite reintentar la carga de redes y bloquea el análisis si falla', async () => {
    mockApi({ 'GET /networks/catalog': { status: 500, body: { message: 'Error' } } })
    renderWithProviders(<CatalogImportDialog onClose={vi.fn()} onImported={vi.fn()} />)
    await screen.findByText('No se pudieron cargar las redes transversales.')
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Analizar Excel' })).toBeDisabled()
  })

  it('ofrece importar sin especificaciones después del análisis y exige marcar la opción', async () => {
    const p = {
      ...preview([NETWORKS[0]]),
      issues: [{ sheet: 'Listado maestro', row: 150, message: 'TEST-01 no tiene especificaciones', code: 'MISSING_SPECIFICATIONS' }],
    }
    const mock = mockApi({
      'GET /networks/catalog': { body: NETWORKS },
      'POST /catalog/imports/preview': { body: p },
      'POST /catalog/imports': { body: { ...p, imported: 1 } },
    })
    renderWithProviders(<CatalogImportDialog onClose={vi.fn()} onImported={vi.fn()} />)
    expect(screen.queryByRole('checkbox', { name: /Importar también/ })).not.toBeInTheDocument()
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Procesos' }))
    await userEvent.upload(screen.getByLabelText(/Archivo Excel/), file())
    await userEvent.click(screen.getByRole('button', { name: 'Analizar Excel' }))
    const consent = await screen.findByRole('checkbox', { name: 'Importar también los modelos sin especificaciones técnicas' })
    expect(consent).not.toBeChecked()
    expect(screen.getByText('Listado maestro, fila 150: TEST-01 no tiene especificaciones')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Importar al catálogo' })).toBeDisabled()
    await userEvent.click(consent)
    expect(screen.getByRole('button', { name: 'Importar al catálogo' })).toBeEnabled()
    await userEvent.click(screen.getByRole('button', { name: 'Importar al catálogo' }))
    await screen.findByText('Importación completada')
    expect(screen.getByText('1 modelos importados con especificaciones técnicas vacías.')).toBeInTheDocument()
    const applied = mock.calls.find(call => call.path === '/catalog/imports')?.init.body as FormData
    expect(applied.get('allowMissingSpecifications')).toBe('true')
  })

  it('la opción no permite ignorar otros errores y se reinicia al volver a analizar', async () => {
    const p = {
      ...preview([NETWORKS[0]]),
      issues: [
        { sheet: 'Listado maestro', row: 150, message: 'TEST-01 no tiene especificaciones', code: 'MISSING_SPECIFICATIONS' },
        { sheet: 'Listado maestro', row: 151, message: 'El TAG TEST-01 ya existe en el catálogo. Redes actuales: Potencia Eléctrica (FUR-PTE), Laboratorios (FUR-LAB). No se permite importarlo ni sobrescribirlo.', code: 'TAG_ALREADY_EXISTS' },
      ],
    }
    mockApi({ 'GET /networks/catalog': { body: NETWORKS }, 'POST /catalog/imports/preview': { body: p } })
    renderWithProviders(<CatalogImportDialog onClose={vi.fn()} onImported={vi.fn()} />)
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Procesos' }))
    await userEvent.upload(screen.getByLabelText(/Archivo Excel/), file())
    await userEvent.click(screen.getByRole('button', { name: 'Analizar Excel' }))
    await userEvent.click(await screen.findByRole('checkbox', { name: /Importar también/ }))
    expect(screen.getByRole('button', { name: 'Importar al catálogo' })).toBeDisabled()
    expect(screen.getByRole('alert')).toHaveTextContent('El TAG TEST-01 ya existe')
    expect(screen.getByRole('alert')).toHaveTextContent('Potencia Eléctrica (FUR-PTE), Laboratorios (FUR-LAB)')
    await userEvent.click(screen.getByRole('button', { name: 'Analizar Excel' }))
    expect(await screen.findByRole('checkbox', { name: /Importar también/ })).not.toBeChecked()
  })
})
