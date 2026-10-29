import type { Footballer } from './types'
import { PLAYERS_COUNT, WORDS_PER_PLAYER } from './constants'

export function normalizeWord(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z]/g, '')
}

export function validateNames(names: readonly string[]): string[] {
  return names.map(name => {
    const trimmed = name.trim()
    if (!trimmed) return 'Completá el nombre del jugador.'
    if (trimmed.length < 2) return 'El nombre debe tener al menos 2 caracteres.'
    if (trimmed.length > 30) return 'El nombre no puede superar los 30 caracteres.'
    if (names.filter(other => other.trim().toLocaleLowerCase('es') === trimmed.toLocaleLowerCase('es')).length > 1) {
      return 'Cada jugador debe tener un nombre distinto.'
    }
    return ''
  })
}

export function validateCatalog(catalog: readonly Footballer[]): void {
  if (catalog.length < PLAYERS_COUNT * WORDS_PER_PLAYER) throw new Error('El catálogo debe incluir al menos 60 futbolistas.')
  const ids = new Set<string>()
  const words = new Set<string>()
  for (const entry of catalog) {
    if (!entry.id || ids.has(entry.id) || words.has(entry.puzzleWord) || !entry.fullName.trim() ||
      !/^[A-Z]{4,13}$/.test(entry.puzzleWord) || normalizeWord(entry.surname) !== entry.puzzleWord ||
      !entry.clue.trim() || normalizeWord(entry.clue).includes(entry.puzzleWord)) {
      throw new Error('Hay una entrada inválida o repetida en el catálogo futbolero.')
    }
    ids.add(entry.id)
    words.add(entry.puzzleWord)
  }
}
