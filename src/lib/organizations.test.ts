import { describe, expect, it } from 'vitest'
import { countryName, parseList, parseRating, ratingText } from './organizations'

describe('parseRating', () => {
  it('vacío significa sin calificaciones (null), nunca un cero inventado', () => {
    expect(parseRating('')).toEqual({ ok: true, value: null })
    expect(parseRating('   ')).toEqual({ ok: true, value: null })
  })

  it('acepta de 0 a 5 con hasta 2 decimales', () => {
    expect(parseRating('0')).toEqual({ ok: true, value: 0 })
    expect(parseRating('4.7')).toEqual({ ok: true, value: 4.7 })
    expect(parseRating('4.75')).toEqual({ ok: true, value: 4.75 })
    expect(parseRating('5')).toEqual({ ok: true, value: 5 })
  })

  it('rechaza fuera de rango, más de 2 decimales y texto', () => {
    expect(parseRating('5.1')).toMatchObject({ ok: false, error: 'La calificación va de 0 a 5.' })
    expect(parseRating('-1')).toMatchObject({ ok: false })
    expect(parseRating('4.755')).toMatchObject({ ok: false, error: 'Máximo 2 decimales.' })
    expect(parseRating('abc')).toMatchObject({ ok: false, error: 'Indica un número.' })
  })
})

describe('helpers de organización', () => {
  it('ratingText nunca inventa una calificación', () => {
    expect(ratingText(null)).toBe('Sin calificaciones')
    expect(ratingText(4.7)).toBe('4.7 / 5')
  })
  it('countryName y parseList', () => {
    expect(countryName('PE')).toBe('Perú')
    expect(countryName(null)).toBe('—')
    expect(parseList('ISO 9001, OSHA, ISO 9001, ')).toEqual(['ISO 9001', 'OSHA'])
  })
})
