import { BOARD_COLS, BOARD_ROWS } from './constants'
import { seededRandom, shuffle } from './random'
import type { Rng } from './random'
import type { Direction, Footballer, Position, WordPlacement, WordSearchBoard } from './types'

export const DIRECTIONS: Record<Direction, readonly [number, number]> = {
  E: [0, 1], W: [0, -1], N: [-1, 0], S: [1, 0],
  NE: [-1, 1], NW: [-1, -1], SE: [1, 1], SW: [1, -1],
}
interface BoardOptions { rows?: number; cols?: number; rng?: Rng; seed?: number; maxAttempts?: number }
type BoardWord = Pick<Footballer, 'id' | 'puzzleWord'>

function positions(start: Position, direction: Direction, length: number): Position[] {
  const [dr, dc] = DIRECTIONS[direction]
  return Array.from({ length }, (_, i) => ({ row: start.row + dr * i, col: start.col + dc * i }))
}

function fits(letters: string[][], cells: Position[], word: string, rows: number, cols: number): boolean {
  return cells.every(({ row, col }, i) => row >= 0 && row < rows && col >= 0 && col < cols &&
    (letters[row]![col] === '' || letters[row]![col] === word[i]))
}

function place(letters: string[][], entry: BoardWord, start: Position, direction: Direction): WordPlacement {
  const cells = positions(start, direction, entry.puzzleWord.length)
  cells.forEach(({ row, col }, i) => { letters[row]![col] = entry.puzzleWord[i]! })
  return { footballerId: entry.id, word: entry.puzzleWord, start, direction, cells }
}

// Reliable emergency packing: two words of at most 13 letters per 27-cell row.
// Used only after bounded randomized attempts; never returns an incomplete board.
function fallback(words: BoardWord[], rows: number, cols: number, rng: Rng): WordSearchBoard {
  const letters = Array.from({ length: rows }, () => Array<string>(cols).fill(''))
  const placements: WordPlacement[] = []
  const rowOrder = shuffle(Array.from({ length: rows }, (_, i) => i), rng)
  let cursor = 0
  for (const row of rowOrder) {
    let col = 0
    while (cursor < words.length && col + words[cursor]!.puzzleWord.length <= cols) {
      const entry = words[cursor++]!
      const reverse = rng() < 0.5
      placements.push(place(letters, entry, { row, col: reverse ? col + entry.puzzleWord.length - 1 : col }, reverse ? 'W' : 'E'))
      col += entry.puzzleWord.length + 1
    }
  }
  if (placements.length !== words.length) throw new Error('No se pudieron colocar todas las palabras. Probá iniciar otra vez.')
  return { rows, cols, letters, placements }
}

export function generateWordSearch(words: readonly BoardWord[], options: BoardOptions = {}): WordSearchBoard {
  const { rows = BOARD_ROWS, cols = BOARD_COLS, maxAttempts = 40 } = options
  const rng = options.rng ?? seededRandom(options.seed ?? 0)
  if (!Number.isInteger(rows) || !Number.isInteger(cols) || rows < 1 || cols < 1 || words.length === 0 ||
    new Set(words.map(word => word.id)).size !== words.length ||
    new Set(words.map(word => word.puzzleWord)).size !== words.length ||
    words.some(word => !/^[A-Z]+$/.test(word.puzzleWord) || word.puzzleWord.length > Math.max(rows, cols))) {
    throw new Error('Las dimensiones o las palabras del tablero no son válidas.')
  }
  const ordered = shuffle(words, rng).sort((a, b) => b.puzzleWord.length - a.puzzleWord.length)
  const starts = Array.from({ length: rows * cols }, (_, i) => ({ row: Math.floor(i / cols), col: i % cols }))
  let board: WordSearchBoard | null = null
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const letters = Array.from({ length: rows }, () => Array<string>(cols).fill(''))
    const placements: WordPlacement[] = []
    for (const entry of ordered) {
      let placement: WordPlacement | undefined
      for (const direction of shuffle(Object.keys(DIRECTIONS) as Direction[], rng)) {
        for (const start of shuffle(starts, rng)) {
          const cells = positions(start, direction, entry.puzzleWord.length)
          if (fits(letters, cells, entry.puzzleWord, rows, cols)) {
            placement = place(letters, entry, start, direction)
            break
          }
        }
        if (placement) break
      }
      if (!placement) break
      placements.push(placement)
    }
    if (placements.length !== ordered.length) continue
    const families = new Set(placements.map(p => {
      const [dr, dc] = DIRECTIONS[p.direction]
      return dr === 0 ? 'horizontal' : dc === 0 ? 'vertical' : 'diagonal'
    }))
    if (families.size < 3 && ordered.length >= 3 && attempt < maxAttempts - 1) continue
    board = { rows, cols, letters, placements }
    break
  }
  board ??= fallback(ordered, rows, cols, rng)
  const alphabet = 'AAAAAABCDEEEEEEFGHIIIIIIJKLMNNOOOOOPQRSTUUUVWXYZ'
  for (const row of board.letters) {
    for (let col = 0; col < cols; col++) if (!row[col]) row[col] = alphabet[Math.floor(rng() * alphabet.length)]!
  }
  validateBoard(board, words)
  return board
}

export function validateBoard(board: WordSearchBoard, words: readonly BoardWord[]): void {
  const { rows, cols, letters, placements } = board
  if (letters.length !== rows || letters.some(row => row.length !== cols || row.some(letter => !/^[A-Z]$/.test(letter))) ||
    placements.length !== words.length || new Set(placements.map(p => p.footballerId)).size !== words.length) {
    throw new Error('La sopa de letras está incompleta.')
  }
  for (const p of placements) {
    const source = words.find(word => word.id === p.footballerId)
    const expected = positions(p.start, p.direction, p.word.length)
    if (!source || source.puzzleWord !== p.word || p.cells.length !== p.word.length ||
      p.cells.some(({ row, col }, i) => row < 0 || row >= rows || col < 0 || col >= cols ||
        row !== expected[i]!.row || col !== expected[i]!.col || letters[row]![col] !== p.word[i])) {
      throw new Error('Una palabra no coincide con sus posiciones en el tablero.')
    }
  }
}
