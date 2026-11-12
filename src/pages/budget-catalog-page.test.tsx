import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mockApi } from '@/test/fetch-mock'
import { renderWithProviders } from '@/test/render'
import { BudgetCatalogPage } from './budget-catalog-page'

afterEach(() => vi.unstubAllGlobals())

const batch = {
  id: 'batch-1', status: 'STAGED', fingerprint: 'source-fingerprint',
  source: 'Maestros originales LULO.MDB', createdAt: '2026-11-11T12:00:00Z',
  report: { counts: { materials: 1 }, quarantined: 1, compositionLines: 1, issues: { ORPHAN_RESOURCE: 1 } },
}
const entry = {
  id: 'entry-1', batchId: 'batch-1', kind: 'RESOURCE', resourceType: 'MATERIAL', code: 'MAT0001',
  name: 'Ángulo metálico', unit: 'KG', status: 'RECOVERED', issues: [], sourceId: 'mdb:material:MAT0001', sourceContext: '',
  revision: 0, reviewState: 'DRAFT',
}
const review = () => ({
  original: { ...entry, data: { historicalPrice: '12.50', currency: null } }, revision: 0, state: 'DRAFT',
  draft: { name: entry.name, unit: 'KG', familySourceId: 'family', price: null, yieldValue: null, yieldBasis: null, hoursPerDay: null, methodNote: '', composition: [] },
  blockers: ['Falta verificar precio, moneda, denominación, fecha, vigencia y base de costo'], dependencies: [],
})
const routes = () => ({
  'GET /admin/budget-catalog/batches': { body: [batch] },
  'GET /admin/budget-catalog/batches/batch-1/entries': { body: { items: [entry], total: 1 } },
  'GET /admin/budget-catalog/batches/batch-1/review-summary': { body: [{ state: 'DRAFT', count: 1 }] },
  'GET /admin/budget-catalog/entries/entry-1/review': { body: review() },
})

describe('Revisión de maestros LULO', () => {
  it('identifica los precios históricos y conserva la búsqueda y el detalle privado de origen', async () => {
    const mock = mockApi({
      ...routes(),
    })
    renderWithProviders(<BudgetCatalogPage />)
    expect(await screen.findByText('Ángulo metálico')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('sin moneda ni base de costo confirmadas')
    await userEvent.type(screen.getByRole('textbox', { name: 'Buscar maestro' }), 'MAT0001')
    await userEvent.click(screen.getByRole('button', { name: 'Buscar' }))
    await waitFor(() => expect(mock.calls.some(c => c.query.get('search') === 'MAT0001')).toBe(true))
    await userEvent.click(screen.getByRole('button', { name: 'MAT0001' }))
    expect(await screen.findByText(/no constituyen precios vigentes aprobados/)).toBeInTheDocument()
    expect(screen.getByText(/"currency": null/)).toBeInTheDocument()
    expect(mock.calls.every(c => c.method === 'GET')).toBe(true)
  })

  it('muestra el rechazo de acceso sin presentar un catálogo vacío como si fuera válido', async () => {
    mockApi({ 'GET /admin/budget-catalog/batches': { status: 403, body: { message: 'Acceso restringido' } } })
    renderWithProviders(<BudgetCatalogPage />)
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudieron cargar los lotes')
    expect(screen.queryByText('Aún no hay maestros recuperados')).not.toBeInTheDocument()
  })

  it('exige la verificación explícita del precio y envía una corrección con revisión y motivo', async () => {
    const mock = mockApi({ ...routes(), 'PATCH /admin/budget-catalog/entries/entry-1/review': { body: { revision: 1, state: 'DRAFT' } } })
    renderWithProviders(<BudgetCatalogPage />)
    await userEvent.click(await screen.findByRole('button', { name: 'MAT0001' }))
    await userEvent.type(await screen.findByRole('textbox', { name: 'Motivo de revisión' }), 'Cotización comprobada de noviembre')
    expect(screen.getByRole('button', { name: 'Aprobar maestro' })).toBeDisabled()
    expect(screen.queryByRole('textbox', { name: 'Precio validado' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('checkbox', { name: 'Registrar precio verificado' }))
    await userEvent.type(screen.getByRole('textbox', { name: 'Precio validado' }), '18.25000001')
    await userEvent.type(screen.getByRole('textbox', { name: 'Moneda' }), 'USD')
    await userEvent.type(screen.getByRole('textbox', { name: 'Denominación monetaria' }), 'Dólar estadounidense')
    fireEvent.change(screen.getByLabelText('Fecha base'), { target: { value: '2026-11-01' } })
    fireEvent.change(screen.getByLabelText('Vigente hasta'), { target: { value: '2026-12-01' } })
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Base de costo' }), 'UNIT')
    await userEvent.type(screen.getByRole('textbox', { name: 'Fuente de verificación' }), 'Cotización del proveedor verificada')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar corrección' }))
    await waitFor(() => expect(mock.calls.some(c => c.method === 'PATCH')).toBe(true))
    const saved = JSON.parse(String(mock.calls.find(c => c.method === 'PATCH')!.init.body))
    expect(saved).toMatchObject({ expectedRevision: 0, reason: 'Cotización comprobada de noviembre', draft: { price: { amount: '18.25000001', currency: 'USD', baseDate: '2026-11-01', costBasis: 'UNIT' } } })
    expect(mock.calls.some(c => c.path.endsWith('/approve'))).toBe(false)
  })

  it('conserva una edición rechazada por concurrencia y permite abrir el historial del responsable', async () => {
    mockApi({ ...routes(),
      'PATCH /admin/budget-catalog/entries/entry-1/review': { status: 409, body: { message: 'Otro administrador modificó el registro. Recargue antes de guardar' } },
      'GET /admin/budget-catalog/entries/entry-1/history': { body: [{ id: 'event-1', action: 'EDIT', occurredAt: '2026-11-11T12:00:00Z', oldData: {}, newData: { actorName: 'Ana Administradora', reason: 'Descripción contrastada con el original', value: {} } }] },
    })
    renderWithProviders(<BudgetCatalogPage />)
    await userEvent.click(await screen.findByRole('button', { name: 'MAT0001' }))
    await userEvent.type(await screen.findByRole('textbox', { name: 'Descripción del maestro' }), ' corregido')
    await userEvent.type(screen.getByRole('textbox', { name: 'Motivo de revisión' }), 'Corrección de descripción')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar corrección' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Otro administrador')
    expect(screen.getByRole('textbox', { name: 'Descripción del maestro' })).toHaveValue('Ángulo metálico corregido')
    await userEvent.click(screen.getByRole('button', { name: 'Historial' }))
    expect(await screen.findByText(/Ana Administradora/)).toBeInTheDocument()
    expect(screen.getByText('Descripción contrastada con el original')).toBeInTheDocument()
  })

  it('prepara una selección y requiere una acción separada para publicar la copia de referencia', async () => {
    const version = { id: 'release-1', version: 1, name: 'Piloto verificado', state: 'DRAFT', entryCount: 1, contentHash: 'a'.repeat(64), usage: 'REFERENCE_ONLY', createdAt: '2026-11-11T12:00:00Z', publishedAt: null }
    const mock = mockApi({ ...routes(),
      'GET /admin/budget-catalog/batches/batch-1/releases': { body: [] },
      'GET /admin/budget-catalog/publications': { body: [] },
      'POST /admin/budget-catalog/batches/batch-1/releases': { body: version },
      'GET /admin/budget-catalog/releases/release-1': { body: { ...version, items: [] } },
      'POST /admin/budget-catalog/releases/release-1/publish': { body: { ...version, state: 'PUBLISHED' } },
    })
    renderWithProviders(<BudgetCatalogPage />)
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Incluir MAT0001 en la versión' }))
    await userEvent.click(screen.getByRole('button', { name: 'Versiones del catálogo (1)' }))
    await userEvent.type(screen.getByRole('textbox', { name: 'Nombre de la versión' }), 'Piloto verificado')
    await userEvent.type(screen.getByRole('textbox', { name: 'Motivo de la versión' }), 'Selección verificada para referencia')
    await userEvent.click(screen.getByRole('button', { name: 'Preparar versión' }))
    const publish = await screen.findByRole('button', { name: 'Publicar versión de referencia' })
    expect(publish).toBeDisabled(); expect(mock.calls.some(c => c.path.endsWith('/publish'))).toBe(false)
    const prepared = mock.calls.find(c => c.method === 'POST')!
    expect(JSON.parse(String(prepared.init.body)).entryIds).toEqual(['entry-1'])
    await userEvent.type(screen.getByRole('textbox', { name: 'Motivo de publicación' }), 'Aprobación final de la copia de referencia')
    await userEvent.click(publish)
    await waitFor(() => expect(mock.calls.some(c => c.path.endsWith('/publish'))).toBe(true))
    const payload = JSON.parse(String(mock.calls.find(c => c.path.endsWith('/publish'))!.init.body))
    expect(payload.expectedHash).toBe(version.contentHash)
  })
})
