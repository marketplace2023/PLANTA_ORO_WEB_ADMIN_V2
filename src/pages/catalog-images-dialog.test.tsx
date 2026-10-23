import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockApi } from '@/test/fetch-mock'
import { renderWithProviders } from '@/test/render'
import { CatalogImagesDialog } from './catalog-images-dialog'

const image = (name: string, type = 'image/png') => new File(['image'], name, { type })
const row = (index: number, state = 'READY') => ({ index, filename: `CAND-12-0${index + 2}.png`, tag: `CAND-12-0${index + 2}`, state,
  modelId: `m${index}`, modelName: `Modelo ${index}`, message: state === 'READY' ? 'Listo para adjuntar.' : 'Ya tiene imagen.', imageUrl: null, imageVersion: 'NONE' })
beforeEach(() => {
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:preview')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
})
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })

describe('Carga de imágenes por TAG', () => {
  it('analiza antes de subir, omite fotos existentes y envía el archivo con el modelo revisado', async () => {
    const mock = mockApi({
      'POST /catalog/image-imports/preview': { body: { rows: [row(0), row(1, 'EXISTING')] } },
      'POST /catalog/image-imports': { body: { id: 'm0' } },
    })
    renderWithProviders(<CatalogImagesDialog onClose={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Adjuntar imágenes' })).toBeDisabled()
    await userEvent.upload(screen.getByLabelText('Seleccionar imágenes por TAG'), [image('CAND-12-02.png'), image('CAND-12-03.png')])
    await userEvent.click(screen.getByRole('button', { name: 'Analizar coincidencias' }))
    await screen.findByText('Modelo 0')
    expect(mock.count('POST /catalog/image-imports')).toBe(0)
    await userEvent.click(screen.getByRole('button', { name: 'Adjuntar imágenes (1)' }))
    await screen.findByText('Imagen adjuntada')
    expect(mock.count('POST /catalog/image-imports')).toBe(1)
    const body = mock.calls.find(call => call.path === '/catalog/image-imports')!.init.body as FormData
    expect(body.get('file')).toBeInstanceOf(File)
    expect(body.get('modelId')).toBe('m0')
    expect(body.get('imageVersion')).toBe('NONE')
    expect(body.get('replaceExisting')).toBe('false')
  })

  it('admite arrastrar imágenes y reemplaza existentes solo al activar la opción', async () => {
    const mock = mockApi({ 'POST /catalog/image-imports/preview': { body: { rows: [row(0, 'EXISTING')] } }, 'POST /catalog/image-imports': { body: {} } })
    renderWithProviders(<CatalogImagesDialog onClose={vi.fn()} />)
    fireEvent.drop(screen.getByText('Arrastra aquí las imágenes de tus activos').parentElement!, { dataTransfer: { files: [image('CAND-12-02.png')] } })
    await userEvent.click(screen.getByRole('button', { name: 'Analizar coincidencias' }))
    await screen.findByText('Modelo 0')
    expect(screen.getByRole('button', { name: 'Adjuntar imágenes' })).toBeDisabled()
    await userEvent.click(screen.getByRole('checkbox', { name: /Reemplazar imágenes existentes/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Adjuntar imágenes (1)' }))
    await screen.findByText('Imagen adjuntada')
    const body = mock.calls.find(call => call.path === '/catalog/image-imports')!.init.body as FormData
    expect(body.get('replaceExisting')).toBe('true')
  })

  it('continúa si un archivo falla y reintenta solo los pendientes', async () => {
    let attempts = 0
    const mock = mockApi({
      'POST /catalog/image-imports/preview': { body: { rows: [row(0), row(1)] } },
      'POST /catalog/image-imports': () => ++attempts === 1 ? { status: 500, body: { message: 'Fallo temporal' } } : { body: {} },
    })
    renderWithProviders(<CatalogImagesDialog onClose={vi.fn()} />)
    await userEvent.upload(screen.getByLabelText('Seleccionar imágenes por TAG'), [image('CAND-12-02.png'), image('CAND-12-03.png')])
    await userEvent.click(screen.getByRole('button', { name: 'Analizar coincidencias' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Adjuntar imágenes (2)' }))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('1 adjuntadas'))
    expect(screen.getByText('Fallo temporal')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Adjuntar imágenes (1)' }))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('2 adjuntadas'))
    expect(mock.count('POST /catalog/image-imports')).toBe(3)
  })

  it('invalida el análisis al cambiar archivos y no permite subir duplicados o desconocidos', async () => {
    const mock = mockApi({ 'POST /catalog/image-imports/preview': { body: { rows: [row(0, 'DUPLICATE'), row(1, 'NOT_FOUND')] } } })
    renderWithProviders(<CatalogImagesDialog onClose={vi.fn()} />)
    await userEvent.upload(screen.getByLabelText('Seleccionar imágenes por TAG'), [image('CAND-12-02.png'), image('CAND-12-03.png')])
    await userEvent.click(screen.getByRole('button', { name: 'Analizar coincidencias' }))
    await screen.findByText('Modelo 0')
    expect(screen.getByRole('button', { name: 'Adjuntar imágenes' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Quitar CAND-12-03.png' }))
    expect(screen.queryByText('Modelo 0')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Adjuntar imágenes' })).toBeDisabled()
    expect(mock.count('POST /catalog/image-imports')).toBe(0)
    expect(URL.revokeObjectURL).toHaveBeenCalled()
  })

  it('un cambio de imagen en el servidor exige analizar de nuevo antes de reintentar', async () => {
    const mock = mockApi({
      'POST /catalog/image-imports/preview': { body: { rows: [row(0)] } },
      'POST /catalog/image-imports': { status: 409, body: { message: 'La imagen cambió. Vuelve a analizar.' } },
    })
    renderWithProviders(<CatalogImagesDialog onClose={vi.fn()} />)
    await userEvent.upload(screen.getByLabelText('Seleccionar imágenes por TAG'), image('CAND-12-02.png'))
    await userEvent.click(screen.getByRole('button', { name: 'Analizar coincidencias' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Adjuntar imágenes (1)' }))
    await screen.findByText('La imagen cambió. Vuelve a analizar.')
    expect(screen.getByRole('button', { name: 'Adjuntar imágenes' })).toBeDisabled()
    expect(mock.count('POST /catalog/image-imports')).toBe(1)
  })

  it('detiene el lote después del archivo actual y permite continuar con los restantes', async () => {
    let finishFirst!: () => void
    const first = new Promise<void>(resolve => { finishFirst = resolve })
    let calls = 0
    const mock = mockApi({
      'POST /catalog/image-imports/preview': { body: { rows: [row(0), row(1)] } },
      'POST /catalog/image-imports': async () => { if (++calls === 1) await first; return { body: {} } },
    })
    renderWithProviders(<CatalogImagesDialog onClose={vi.fn()} />)
    await userEvent.upload(screen.getByLabelText('Seleccionar imágenes por TAG'), [image('CAND-12-02.png'), image('CAND-12-03.png')])
    await userEvent.click(screen.getByRole('button', { name: 'Analizar coincidencias' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Adjuntar imágenes (2)' }))
    await userEvent.click(screen.getByRole('button', { name: 'Detener carga' }))
    finishFirst()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Adjuntar imágenes (1)' })).toBeEnabled())
    expect(mock.count('POST /catalog/image-imports')).toBe(1)
    await userEvent.click(screen.getByRole('button', { name: 'Adjuntar imágenes (1)' }))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('2 adjuntadas'))
  })
})
