import { afterEach, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { mockApi } from '@/test/fetch-mock'
import { renderWithProviders } from '@/test/render'
import { CatalogRequestsTab } from './catalog-requests'

const pending = { id: 'r1', modelId: null as string | null, status: 'PENDING', plantName: 'Planta de prueba', decisionNote: null, reviewedModel: null, draft: { name: 'Motor solicitado', familyId: 'f1', stageCode: 'D01', networkCodes: ['FUR-PROC'], specifications: {}, components: ['Componente de planta'] } }
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })
it('permite completar la ficha antes de aprobar y registra la decisión', async () => {
  let row = { ...pending, draft: { ...pending.draft, requestNote: 'Necesitamos esta variante.\nIncluye protección adicional.' } }
  const api = mockApi({
    'GET /catalog/requests': () => ({ body: [row] }),
    'GET /catalog/families': { body: [{ id: 'f1', code: 'MOT', name: 'Motores' }] },
    'GET /catalog/types': { body: [{ id: 't1', code: 'MOTOR', name: 'Motor eléctrico', familyCode: 'MOT' }] },
    'GET /catalog/specifications': { body: [] },
    'GET /stages/catalog': { body: [{ code: 'D01', name: 'Recepción' }] },
    'GET /networks/catalog': { body: [{ code: 'FUR-PROC', name: 'Procesos' }] },
    'PATCH /catalog/requests/r1': () => { row = { ...row, modelId: 'm1' }; return { body: row } },
    'POST /catalog/requests/r1/approve': () => { row = { ...row, status: 'APPROVED' }; return { body: row } },
  })
  renderWithProviders(<CatalogRequestsTab />)
  await userEvent.click(await screen.findByRole('button', { name: 'Ver ficha de Motor solicitado' }))
  expect(screen.queryByRole('button', { name: 'Aprobar y registrar activo' })).not.toBeInTheDocument()
  expect(screen.getByText('Nota de la solicitud')).toBeInTheDocument()
  expect(screen.getByText('Necesitamos esta variante. Incluye protección adicional.')).toBeInTheDocument()
  const sheet = within(screen.getByRole('region', { name: 'Ficha de la solicitud' }))
  expect(await sheet.findByText('D01 · Recepción')).toBeInTheDocument()
  expect(await sheet.findByText('FUR-PROC · Procesos')).toBeInTheDocument()
  expect(sheet.getByText('Planta de prueba')).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Cerrar ficha' }))
  await userEvent.click(screen.getByRole('button', { name: 'Procesar Motor solicitado' }))
  expect(screen.getByRole('button', { name: 'Aprobar y registrar activo' })).toBeDisabled()
  expect(screen.getByLabelText('Nombre del modelo')).toHaveValue('Motor solicitado')
  await userEvent.clear(screen.getByLabelText('Nombre del modelo'))
  await userEvent.type(screen.getByLabelText('Nombre del modelo'), 'Modelo para catálogo')
  expect(within(screen.getByRole('dialog', { name: 'Procesar solicitud' })).getByText('Motor solicitado')).toBeInTheDocument()
  await userEvent.selectOptions(screen.getByLabelText('Tipo de activo'), 'MOTOR')
  expect(screen.getByText(/Al aprobar, el tipo se asociará automáticamente a la etapa solicitada/)).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Guardar ficha de catálogo' }))
  await waitFor(() => expect(screen.getByRole('button', { name: 'Aprobar y registrar activo' })).toBeEnabled())
  await userEvent.click(screen.getByRole('button', { name: 'Aprobar y registrar activo' }))
  await waitFor(() => expect(api.count('POST /catalog/requests/r1/approve')).toBe(1))
  expect(api.count('PATCH /catalog/requests/r1')).toBe(1)
  expect(await screen.findByText('No hay solicitudes pendientes.')).toBeInTheDocument()
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

it.each(['APPROVED', 'REJECTED'])('muestra la ficha original completa de una solicitud %s aunque el modelo revisado sea distinto', async status => {
  const row = {
    ...pending, status, createdAt: '2026-11-11T10:00:00Z', decidedAt: '2026-11-11T12:00:00Z',
    decisionNote: 'Comentario de administración',
    draft: { ...pending.draft, serialNumber: 'SN-123', status: 'STANDBY', criticality: 'HIGH', isPublic: false, specifications: { 'Potencia (kW)': 0, Protección: false, Rango: { min: 0, max: 10 }, Opciones: ['A', 'B'] }, requestNote: 'Motivo original de la planta' },
    reviewedModel: { modelName: 'Nombre revisado', assetTypeId: 't1', specifications: { 'Potencia (kW)': 999 }, technicalData: { componentes: ['Componente revisado'] }, imageUrl: null },
  }
  const api = mockApi({
    'GET /catalog/requests': { body: [row] },
    'GET /catalog/families': { body: [{ id: 'f1', code: 'N4_18', tagCode: 'MOT', name: 'Motores eléctricos' }] },
    'GET /catalog/types': { body: [] },
    'GET /stages/catalog': { body: [{ code: 'D01', name: 'Recepción' }] },
    'GET /networks/catalog': { body: [{ code: 'FUR-PROC', name: 'Procesos' }] },
  })
  renderWithProviders(<CatalogRequestsTab />)
  await userEvent.click(await screen.findByRole('button', { name: status === 'APPROVED' ? /Aprobadas/ : /Rechazadas/ }))
  await userEvent.click(screen.getByRole('button', { name: 'Ver ficha de Motor solicitado' }))
  const sheet = within(screen.getByRole('region', { name: 'Ficha de la solicitud' }))
  expect(await sheet.findByText('MOT · Motores eléctricos')).toBeInTheDocument()
  for (const text of ['Planta de prueba', 'D01 · Recepción', 'FUR-PROC · Procesos', 'SN-123', 'En reserva', 'Alta', 'Privado', 'Motivo original de la planta', 'Potencia (kW)', '0', 'No', '0 – 10', 'A B', 'Componente de planta', 'Comentario de administración']) {
    expect(await sheet.findByText(text)).toBeInTheDocument()
  }
  expect(sheet.getByText('Fecha de envío')).toBeInTheDocument()
  expect(sheet.getByText('Fecha de decisión')).toBeInTheDocument()
  expect(sheet.queryByText('999')).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Guardar ficha de catálogo' })).not.toBeInTheDocument()
  expect(api.calls.every(c => c.method === 'GET')).toBe(true)
})

it('mantiene la ficha legible sin maestros y con datos opcionales ausentes', async () => {
  mockApi({
    'GET /catalog/requests': { body: [{ ...pending, status: 'REJECTED', draft: { ...pending.draft, specifications: {}, components: [] } }] },
    'GET /catalog/families': { status: 500 }, 'GET /catalog/types': { body: [] },
    'GET /stages/catalog': { status: 500 }, 'GET /networks/catalog': { status: 500 },
  })
  renderWithProviders(<CatalogRequestsTab />)
  await userEvent.click(await screen.findByRole('button', { name: /Rechazadas/ }))
  await userEvent.click(screen.getByRole('button', { name: 'Ver ficha de Motor solicitado' }))
  const sheet = within(screen.getByRole('region', { name: 'Ficha de la solicitud' }))
  for (const text of ['D01', 'FUR-PROC', 'f1', 'Sin especificaciones registradas.', 'Sin componentes registrados.', 'La planta no incluyó una nota.']) {
    expect(sheet.getByText(text)).toBeInTheDocument()
  }
})

it('muestra pendientes por defecto, filtra por estado y búsqueda y conserva la consulta sin mutaciones', async () => {
  const rows = [pending, { ...pending, id: 'r2', status: 'APPROVED', draft: { ...pending.draft, name: 'Equipo aprobado' } }, { ...pending, id: 'r3', status: 'REJECTED', plantName: 'Caratal', draft: { ...pending.draft, name: 'Equipo rechazado' } }]
  const api = mockApi({
    'GET /catalog/requests': { body: rows },
    'GET /catalog/families': { body: [{ id: 'f1', code: 'MOT', name: 'Motores eléctricos' }] },
  })
  renderWithProviders(<CatalogRequestsTab />)
  expect(await screen.findByRole('button', { name: /^Pendientes/ })).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByRole('table')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Procesar Motor solicitado' })).toBeInTheDocument()
  expect(screen.queryByText('Equipo aprobado')).not.toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: /^Rechazadas/ }))
  expect(screen.getByText('Equipo rechazado')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /Procesar / })).not.toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: /^Todas/ }))
  expect(screen.getAllByRole('button', { name: /Ver ficha de/ })).toHaveLength(3)
  await userEvent.type(screen.getByRole('textbox', { name: 'Buscar solicitudes' }), 'caratal')
  expect(screen.getAllByRole('button', { name: /Ver ficha de/ })).toHaveLength(1)
  await userEvent.clear(screen.getByRole('textbox', { name: 'Buscar solicitudes' }))
  await userEvent.type(screen.getByRole('textbox', { name: 'Buscar solicitudes' }), 'electricos')
  expect(screen.getAllByRole('button', { name: /Ver ficha de/ })).toHaveLength(3)
  await userEvent.type(screen.getByRole('textbox', { name: 'Buscar solicitudes' }), ' ausente')
  expect(screen.getByText('No hay solicitudes que coincidan con tu búsqueda.')).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Ver todas las solicitudes' }))
  expect(screen.getAllByRole('button', { name: /Ver ficha de/ })).toHaveLength(3)
  expect(api.calls.every(c => c.method === 'GET')).toBe(true)
})

it('rechaza desde Procesar sin guardar modelo, exige motivo y conserva el comentario ante un fallo', async () => {
  let row = { ...pending }
  let fail = true
  const api = mockApi({
    'GET /catalog/requests': () => ({ body: [row] }),
    'GET /catalog/families': { body: [{ id: 'f1', code: 'MOT', name: 'Motores' }] },
    'GET /catalog/types': { body: [] }, 'GET /catalog/specifications': { body: [] },
    'POST /catalog/requests/r1/reject': () => { if (fail) return { status: 500 }; row = { ...row, status: 'REJECTED' }; return { body: row } },
  })
  renderWithProviders(<CatalogRequestsTab />)
  await userEvent.click(await screen.findByRole('button', { name: 'Procesar Motor solicitado' }))
  await userEvent.click(screen.getByRole('button', { name: 'Rechazar solicitud' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Indica el motivo del rechazo')
  expect(api.count('POST /catalog/requests/r1/reject')).toBe(0)
  await userEvent.type(screen.getByLabelText('Comentario de la decisión (obligatorio al rechazar)'), 'Falta detalle técnico')
  await userEvent.click(screen.getByRole('button', { name: 'Rechazar solicitud' }))
  await waitFor(() => expect(api.count('POST /catalog/requests/r1/reject')).toBe(1))
  expect(screen.getByLabelText('Comentario de la decisión (obligatorio al rechazar)')).toHaveValue('Falta detalle técnico')
  await waitFor(() => expect(screen.getByRole('button', { name: 'Rechazar solicitud' })).toBeEnabled())
  fail = false
  await userEvent.click(screen.getByRole('button', { name: 'Rechazar solicitud' }))
  expect(await screen.findByText('No hay solicitudes pendientes.')).toBeInTheDocument()
  expect(api.count('PATCH /catalog/requests/r1')).toBe(0)
  const submission = api.calls.filter(c => c.method === 'POST').at(-1)!
  expect(JSON.parse(submission.init.body as string)).toEqual({ note: 'Falta detalle técnico' })
})

it('pagina la tabla y reinicia la página al cambiar los filtros', async () => {
  mockApi({ 'GET /catalog/requests': { body: Array.from({ length: 21 }, (_, i) => ({ ...pending, id: `r${i}`, draft: { ...pending.draft, name: `Equipo ${i}` } })) }, 'GET /catalog/families': { body: [] } })
  renderWithProviders(<CatalogRequestsTab />)
  expect(await screen.findAllByRole('button', { name: /Ver ficha de/ })).toHaveLength(20)
  await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
  expect(screen.getByRole('button', { name: 'Ver ficha de Equipo 20' })).toBeInTheDocument()
  await userEvent.type(screen.getByRole('textbox', { name: 'Buscar solicitudes' }), 'Equipo 0')
  expect(screen.getByRole('button', { name: 'Ver ficha de Equipo 0' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Siguiente' })).not.toBeInTheDocument()
})
