import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { footballers } from '../data/footballers'
import { seededRandom } from '../game/random'
import { DIRECTIONS, generateWordSearch, validateBoard } from '../game/wordSearch'

const words = footballers.slice(0, 20)
describe('Generador de sopa de letras', () => {
  it('genera 351 letras A–Z y exactamente 20 apellidos reconstruibles', () => {
    const board = generateWordSearch(words, { seed: 42 })
    assert.equal(board.rows, 13)
    assert.equal(board.cols, 27)
    assert.equal(board.letters.flat().length, 351)
    assert.ok(board.letters.flat().every(letter => /^[A-Z]$/.test(letter)))
    assert.equal(board.placements.length, 20)
    validateBoard(board, words)
    for (const p of board.placements) assert.equal(p.cells.map(cell => board.letters[cell.row]![cell.col]).join(''), p.word)
  })
  it('es reproducible con semilla y con rng inyectado', () => {
    assert.deepEqual(generateWordSearch(words, { seed: 17 }), generateWordSearch(words, { seed: 17 }))
    assert.deepEqual(generateWordSearch(words, { rng: seededRandom(17) }), generateWordSearch(words, { seed: 17 }))
    assert.notDeepEqual(generateWordSearch(words, { seed: 17 }), generateWordSearch(words, { seed: 18 }))
  })
  it('coloca todas las palabras en 100 semillas, con horizontales, verticales y diagonales', () => {
    const used = new Set<string>()
    let crosses = 0
    for (let seed = 0; seed < 100; seed++) {
      const selected = footballers.slice((seed % 3) * 20, ((seed % 3) + 1) * 20)
      const board = generateWordSearch(selected, { seed })
      validateBoard(board, selected)
      const families = new Set<string>()
      const occupied = new Map<string, string>()
      for (const p of board.placements) {
        used.add(p.direction)
        const [dr, dc] = DIRECTIONS[p.direction]
        families.add(dr === 0 ? 'horizontal' : dc === 0 ? 'vertical' : 'diagonal')
        for (const [i, cell] of p.cells.entries()) {
          const key = `${cell.row},${cell.col}`
          if (occupied.has(key)) { assert.equal(occupied.get(key), p.word[i]); crosses++ }
          occupied.set(key, p.word[i]!)
        }
      }
      assert.equal(families.size, 3)
    }
    assert.equal(used.size, 8)
    assert.ok(crosses > 0)
  })
  it('el fallback acotado sigue entregando las veinte palabras', () => {
    const board = generateWordSearch(words, { seed: 7, maxAttempts: 0 })
    assert.equal(board.placements.length, 20)
    validateBoard(board, words)
  })
  it('rechaza dimensiones, palabras e IDs inválidos y detecta corrupción', () => {
    assert.throws(() => generateWordSearch(words, { rows: 1, cols: 1 }))
    assert.throws(() => generateWordSearch([words[0]!, words[0]!]))
    assert.throws(() => generateWordSearch([{ id: 'bad', puzzleWord: 'MÉSSI' }]))
    const board = generateWordSearch(words)
    const cell = board.placements[0]!.cells[0]!
    board.letters[cell.row]![cell.col] = '#'
    assert.throws(() => validateBoard(board, words))
    const invalidPlacement = generateWordSearch(words)
    invalidPlacement.placements[0]!.cells[0]!.row = -1
    assert.throws(() => validateBoard(invalidPlacement, words))
  })
})
