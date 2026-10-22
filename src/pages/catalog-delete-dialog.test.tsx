import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mockApi } from '@/test/fetch-mock'
import { renderWithProviders } from '@/test/render'
import { CatalogDeleteDialog } from './catalog-delete-dialog'

const row = { tag: 'TEST-01', row: 2, modelId: 'm1', modelName: 'Bomba de pulpa', family: 'Bombas', type: 'Bomba', state: 'DELETE', assets: 0, inventoryItems: 0, listings: 0 }
const preview = {
  fingerprint: 'b'.repeat(64), issues: [],
  summary: { listed: 2, found: 1, missing: 1, blocked: 0, deletable: 1, unlinkedListings: 0 },
  rows: [row, { ...row, tag: 'TEST-02', row: 3, modelId: null, modelName: null, state: 'NOT_FOUND' }],
}
const file = (name = 'maestro.xlsx') => new File(['test workbook'], name, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })

afterEach(() => vi.unstubAllGlobals())

describe('Eliminación por Excel', () => {
  it('muestra la vista previa y exige escribir ELIMINAR antes de enviar la eliminación', async () => {
    const mock = mockApi({
      'POST /catalog/deletions/preview': { body: preview },
      'POST /catalog/deletions': { body: { ...preview, deleted: 1 } },
    })
    const onDeleted = vi.fn()
    renderWithProviders(<CatalogDeleteDialog onClose={vi.fn()} onDeleted={onDeleted} />)
    expect(screen.getByRole('button', { name: 'Analizar eliminación' })).toBeDisabled()
    await userEvent.upload(screen.getByLabelText(/Archivo Excel para eliminar/), file())
    await userEvent.click(screen.getByRole('button', { name: 'Analizar eliminación' }))
    await screen.findByText('Bomba de pulpa')
    expect(screen.getByText('No encontrado')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Eliminar modelos' })).toBeDisabled()
    expect(mock.calls.filter(call => call.path === '/catalog/deletions')).toHaveLength(0)
    await userEvent.type(screen.getByLabelText('Escribe ELIMINAR para confirmar'), 'ELIMINAR')
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar modelos' }))
    await screen.findByText('Eliminación completada')
    const applied = mock.calls.find(call => call.path === '/catalog/deletions')?.init.body as FormData
    expect(applied.get('confirm')).toBe('ELIMINAR')
    expect(applied.get('fingerprint')).toBe(preview.fingerprint)
    expect(applied.get('file')).toBeInstanceOf(File)
    expect(onDeleted).toHaveBeenCalledOnce()
  })

  it('cambiar el archivo invalida la vista previa y la confirmación', async () => {
    mockApi({ 'POST /catalog/deletions/preview': { body: preview } })
    renderWithProviders(<CatalogDeleteDialog onClose={vi.fn()} onDeleted={vi.fn()} />)
    await userEvent.upload(screen.getByLabelText(/Archivo Excel para eliminar/), file())
    await userEvent.click(screen.getByRole('button', { name: 'Analizar eliminación' }))
    await userEvent.type(await screen.findByLabelText('Escribe ELIMINAR para confirmar'), 'ELIMINAR')
    await userEvent.upload(screen.getByLabelText(/Archivo Excel para eliminar/), file('otro.xlsx'))
    expect(screen.queryByLabelText('Escribe ELIMINAR para confirmar')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Eliminar modelos' })).toBeDisabled()
  })

  it('un modelo bloqueado impide eliminar también los modelos libres del listado', async () => {
    const blocked = { ...preview, summary: { ...preview.summary, found: 2, missing: 0, blocked: 1 }, rows: [row, { ...row, tag: 'TEST-02', modelId: 'm2', state: 'BLOCKED', assets: 2, inventoryItems: 1 }] }
    mockApi({ 'POST /catalog/deletions/preview': { body: blocked } })
    renderWithProviders(<CatalogDeleteDialog onClose={vi.fn()} onDeleted={vi.fn()} />)
    await userEvent.upload(screen.getByLabelText(/Archivo Excel para eliminar/), file())
    await userEvent.click(screen.getByRole('button', { name: 'Analizar eliminación' }))
    await screen.findByText('Bloqueado')
    expect(screen.getByRole('alert')).toHaveTextContent('No se eliminará ningún modelo')
    expect(screen.queryByLabelText('Escribe ELIMINAR para confirmar')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Eliminar modelos' })).toBeDisabled()
  })

  it('un rechazo por cambios obliga a analizar y confirmar de nuevo', async () => {
    const mock = mockApi({
      'POST /catalog/deletions/preview': { body: preview },
      'POST /catalog/deletions': { status: 409, body: { message: 'El catálogo cambió. Vuelve a analizar el Excel.' } },
    })
    renderWithProviders(<CatalogDeleteDialog onClose={vi.fn()} onDeleted={vi.fn()} />)
    await userEvent.upload(screen.getByLabelText(/Archivo Excel para eliminar/), file())
    await userEvent.click(screen.getByRole('button', { name: 'Analizar eliminación' }))
    await userEvent.type(await screen.findByLabelText('Escribe ELIMINAR para confirmar'), 'ELIMINAR')
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar modelos' }))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Vuelve a analizar el Excel'))
    expect(screen.queryByLabelText('Escribe ELIMINAR para confirmar')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Eliminar modelos' })).toBeDisabled()
    expect(mock.calls.filter(call => call.path === '/catalog/deletions')).toHaveLength(1)
  })
})
