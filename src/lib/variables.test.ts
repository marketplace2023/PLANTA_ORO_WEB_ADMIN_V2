import { describe, expect, it } from 'vitest'
import { fromFieldState, sameValue, toFieldState } from './variables'

describe('variables del catálogo: formulario ↔ valor', () => {
  it('un campo vacío es «sin dato» (null), de cualquier tipo', () => {
    for (const type of ['NUMBER', 'RANGE', 'TEXT', 'LIST', 'BOOLEAN'] as const) {
      expect(fromFieldState(type, { a: '', b: '' })).toEqual({ ok: true, value: null })
      expect(fromFieldState(type, { a: '  ', b: ' ' })).toEqual({ ok: true, value: null })
    }
  })

  it('número, aceptando coma decimal', () => {
    expect(fromFieldState('NUMBER', { a: '120', b: '' })).toEqual({ ok: true, value: 120 })
    expect(fromFieldState('NUMBER', { a: '1,5', b: '' })).toEqual({ ok: true, value: 1.5 })
    expect(fromFieldState('NUMBER', { a: 'abc', b: '' })).toMatchObject({ ok: false })
  })

  it('rango con mínimo, máximo o ambos; el mínimo no puede superar al máximo', () => {
    expect(fromFieldState('RANGE', { a: '600', b: '800' })).toEqual({ ok: true, value: { min: 600, max: 800 } })
    expect(fromFieldState('RANGE', { a: '', b: '700' })).toEqual({ ok: true, value: { max: 700 } })
    expect(fromFieldState('RANGE', { a: '50', b: '' })).toEqual({ ok: true, value: { min: 50 } })
    expect(fromFieldState('RANGE', { a: '900', b: '800' })).toMatchObject({ ok: false })
    expect(fromFieldState('RANGE', { a: 'x', b: '800' })).toMatchObject({ ok: false })
  })

  it('lista: separa por comas, quita vacíos y repetidos', () => {
    expect(fromFieldState('LIST', { a: 'vibración,  detección de atascos, vibración, ', b: '' })).toEqual({ ok: true, value: ['vibración', 'detección de atascos'] })
  })

  it('sí/no y texto', () => {
    expect(fromFieldState('BOOLEAN', { a: 'true', b: '' })).toEqual({ ok: true, value: true })
    expect(fromFieldState('BOOLEAN', { a: 'false', b: '' })).toEqual({ ok: true, value: false })
    expect(fromFieldState('TEXT', { a: ' Parrilla ', b: '' })).toEqual({ ok: true, value: 'Parrilla' })
  })

  it('el valor guardado vuelve al formulario tal cual', () => {
    expect(toFieldState('RANGE', { min: 600, max: 800 })).toEqual({ a: '600', b: '800' })
    expect(toFieldState('RANGE', { max: 700 })).toEqual({ a: '', b: '700' })
    expect(toFieldState('LIST', ['a', 'b'])).toEqual({ a: 'a, b', b: '' })
    expect(toFieldState('BOOLEAN', false)).toEqual({ a: 'false', b: '' })
    expect(toFieldState('NUMBER', null)).toEqual({ a: '', b: '' })
  })

  it('compara valores sin importar el orden de las claves', () => {
    expect(sameValue({ min: 1, max: 2 }, { min: 1, max: 2 })).toBe(true)
    expect(sameValue(null, undefined)).toBe(true)
    expect(sameValue(120, 150)).toBe(false)
  })
})
