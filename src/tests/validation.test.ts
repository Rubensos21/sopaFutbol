import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { footballers } from '../data/footballers'
import { normalizeWord, validateCatalog, validateNames } from '../game/validation'
import { startMatch } from '../game/matchEngine'

describe('Nombres y catálogo', () => {
  it('acepta tres nombres únicos y recorta espacios al iniciar', () => {
    assert.deepEqual(validateNames([' Ana ', 'Beto', 'Caro']), ['', '', ''])
    assert.equal(startMatch([' Ana ', 'Beto', 'Caro'], 1, 0).players[0]!.name, 'Ana')
  })
  it('rechaza vacíos, nombres cortos, largos y duplicados sin distinguir mayúsculas', () => {
    for (const names of [[' ', 'Beto', 'Caro'], ['A', 'Beto', 'Caro'], ['A'.repeat(31), 'Beto', 'Caro'], [' Ana ', 'ana', 'Caro']]) {
      assert.ok(validateNames(names).some(Boolean))
      assert.throws(() => startMatch(names, 1, 0))
    }
    assert.throws(() => startMatch(['Ana', 'Beto'], 1, 0))
    assert.throws(() => startMatch(['Ana', 'Beto', 'Caro', 'Dani'], 1, 0))
  })
  it('normaliza tildes, apóstrofos, espacios y signos', () => {
    assert.equal(normalizeWord('Di María'), 'DIMARIA')
    assert.equal(normalizeWord("Eto’o"), 'ETOO')
    assert.equal(normalizeWord('Modrić'), 'MODRIC')
  })
  it('contiene 60 IDs y palabras únicas, pistas sin respuestas y datos válidos', () => {
    assert.equal(footballers.length, 60)
    validateCatalog(footballers)
  })
  it('rechaza un catálogo incompleto, repetido o con pista inválida', () => {
    assert.throws(() => validateCatalog(footballers.slice(0, 59)))
    assert.throws(() => validateCatalog([...footballers.slice(0, 59), footballers[0]!]))
    assert.throws(() => validateCatalog(footballers.map((f, i) => i === 0 ? { ...f, clue: f.surname } : f)))
    assert.throws(() => startMatch(['Ana', 'Beto', 'Caro'], 1, 0, []))
  })
})
