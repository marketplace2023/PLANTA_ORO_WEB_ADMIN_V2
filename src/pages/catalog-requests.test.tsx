import { afterEach, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
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
    'PATCH /catalog/requests/r1': () => { row = { ...row, modelId: 'm1' }; return { body: row } },
    'POST /catalog/requests/r1/approve': () => { row = { ...row, status: 'APPROVED' }; return { body: row } },
  })
  renderWithProviders(<CatalogRequestsTab />)
  await userEvent.click(await screen.findByRole('button', { name: /Motor solicitado/ }))
  expect(screen.getByRole('button', { name: 'Aprobar y registrar activo' })).toBeDisabled()
  expect(screen.getByLabelText('Nombre del modelo')).toHaveValue('Motor solicitado')
  expect(screen.getByText('Nota de la solicitud')).toBeInTheDocument()
  expect(screen.getByText('Necesitamos esta variante. Incluye protección adicional.')).toBeInTheDocument()
  await userEvent.selectOptions(screen.getByLabelText('Tipo de activo'), 'MOTOR')
  await userEvent.click(screen.getByRole('button', { name: 'Guardar ficha de catálogo' }))
  await waitFor(() => expect(screen.getByRole('button', { name: 'Aprobar y registrar activo' })).toBeEnabled())
  await userEvent.click(screen.getByRole('button', { name: 'Aprobar y registrar activo' }))
  await waitFor(() => expect(api.count('POST /catalog/requests/r1/approve')).toBe(1))
  expect(api.count('PATCH /catalog/requests/r1')).toBe(1)
})
