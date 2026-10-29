import { footballers } from '../data/footballers'
import { MATCH_DURATION_SECONDS, MAX_LETTER_ERRORS, PHASE_DURATION_SECONDS, PLAYERS_COUNT, POINTS, WORDS_PER_PLAYER } from './constants'
import { seededRandom, shuffle } from './random'
import type { Footballer, MatchEndReason, MatchState, PlayerColor, PlayerState } from './types'
import { validateCatalog, validateNames } from './validation'
import { generateWordSearch } from './wordSearch'

export function resetMatch(): MatchState {
  return {
    status: 'setup', players: [], activePlayerIndex: 0, phase: 'searching',
    currentRevealedFootballerId: null, matchStartedAtMs: null, matchDeadlineMs: null,
    phaseDeadlineMs: null, finishedAtMs: null, endReason: null, seed: null, revision: 0,
    feedback: '', feedbackKind: 'info', lastWrongCell: null,
  }
}

export function startMatch(names: readonly string[], seed: number, nowMs: number, catalog: readonly Footballer[] = footballers): MatchState {
  if (names.length !== PLAYERS_COUNT || validateNames(names).some(Boolean)) throw new Error('Revisá los nombres de los tres jugadores.')
  validateCatalog(catalog)
  const rng = seededRandom(seed)
  const selected = shuffle(catalog, rng).slice(0, PLAYERS_COUNT * WORDS_PER_PLAYER)
  const colors: PlayerColor[] = ['blue', 'red', 'purple']
  const players = names.map((name, index): PlayerState => {
    const ownFootballers = shuffle(selected.slice(index * WORDS_PER_PLAYER, (index + 1) * WORDS_PER_PLAYER), rng)
    return {
      id: `player-${index + 1}`, name: name.trim(), color: colors[index]!, score: 0,
      letterErrors: 0, eliminated: false, foundFootballerIds: [], correctlyMatchedIds: [], failedMatchedIds: [],
      footballers: ownFootballers, board: generateWordSearch(ownFootballers, { rng }),
    }
  })
  return {
    ...resetMatch(), status: 'playing', players, seed, revision: 1,
    matchStartedAtMs: nowMs, matchDeadlineMs: nowMs + MATCH_DURATION_SECONDS * 1000,
    phaseDeadlineMs: nowMs + PHASE_DURATION_SECONDS * 1000,
    feedback: `¡Arranca el partido! ${players[0]!.name}, tocá una letra para encontrar un apellido.`,
  }
}

function clone(state: MatchState): MatchState {
  return {
    ...state, players: state.players.map(player => ({
      ...player, foundFootballerIds: [...player.foundFootballerIds],
      correctlyMatchedIds: [...player.correctlyMatchedIds], failedMatchedIds: [...player.failedMatchedIds],
    })),
  }
}

export function finishMatch(state: MatchState, reason: MatchEndReason, nowMs: number): MatchState {
  if (state.status !== 'playing') return state
  return { ...state, status: 'finished', endReason: reason, finishedAtMs: nowMs, phaseDeadlineMs: null, revision: state.revision + 1 }
}

function advanceTurn(state: MatchState, nowMs: number): MatchState {
  const survivors = state.players.filter(player => !player.eliminated)
  if (survivors.length === 0) return finishMatch(state, 'all-eliminated', nowMs)
  if (survivors.length === 1) return finishMatch(state, 'last-survivor', nowMs)
  const current = state.players[state.activePlayerIndex]!
  if (state.phase === 'matching' && current.foundFootballerIds.length === WORDS_PER_PLAYER) {
    return finishMatch(state, 'all-found', nowMs)
  }
  let next = state.activePlayerIndex
  do { next = (next + 1) % PLAYERS_COUNT } while (state.players[next]!.eliminated)
  return {
    ...state, activePlayerIndex: next, phase: 'searching', currentRevealedFootballerId: null,
    phaseDeadlineMs: nowMs + PHASE_DURATION_SECONDS * 1000, revision: state.revision + 1,
  }
}

export function tick(state: MatchState, nowMs: number): MatchState {
  if (state.status !== 'playing') return state
  // The global deadline wins, even if a suspended tab missed a phase deadline.
  if (nowMs >= state.matchDeadlineMs!) return finishMatch(state, 'time-limit', nowMs)
  if (nowMs < state.phaseDeadlineMs!) return state
  const next = clone(state)
  const player = next.players[next.activePlayerIndex]!
  if (next.phase === 'searching') {
    player.score += POINTS.letterError
    next.feedback = `${player.name}: tiempo agotado. −10 puntos. Turno siguiente.`
  } else {
    player.score += POINTS.clueError
    player.failedMatchedIds.push(next.currentRevealedFootballerId!)
    next.feedback = `${player.name}: tiempo agotado para la pista. −5 puntos. Turno siguiente.`
  }
  next.feedbackKind = 'error'
  return advanceTurn(next, nowMs)
}

export function clueAvailable(player: PlayerState, clueId: string): boolean {
  return player.footballers.some(entry => entry.id === clueId) &&
    !player.correctlyMatchedIds.includes(clueId) && !player.failedMatchedIds.includes(clueId)
}

// A revision identifies the player's phase that produced an event. An expired
// action or an old/double event cannot be applied to the next participant.
export function selectCell(state: MatchState, row: number, col: number, nowMs: number, revision: number): MatchState {
  const synced = tick(state, nowMs)
  if (synced !== state) return synced
  if (state.status !== 'playing' || state.phase !== 'searching' || revision !== state.revision) return state
  const active = state.players[state.activePlayerIndex]!
  if (active.eliminated || !Number.isInteger(row) || !Number.isInteger(col) ||
    row < 0 || row >= active.board.rows || col < 0 || col >= active.board.cols) return state
  // Stable collision order: first still-hidden entry in placements (longest first).
  const placement = active.board.placements.find(p => !active.foundFootballerIds.includes(p.footballerId) &&
    p.cells.some(cell => cell.row === row && cell.col === col))
  const next = clone(state)
  const player = next.players[next.activePlayerIndex]!
  if (placement) {
    player.foundFootballerIds.push(placement.footballerId)
    player.score += POINTS.discovery
    next.phase = 'matching'
    next.currentRevealedFootballerId = placement.footballerId
    next.phaseDeadlineMs = nowMs + PHASE_DURATION_SECONDS * 1000
    next.revision++
    next.feedback = `¡Encontraste a ${placement.word}! +15 puntos. Elegí su pista.`
    next.feedbackKind = 'success'
    return next
  }
  player.score += POINTS.letterError
  player.letterErrors++
  player.eliminated = player.letterErrors === MAX_LETTER_ERRORS
  next.lastWrongCell = { row, col, playerId: player.id, atMs: nowMs, letter: player.board.letters[row]![col]! }
  next.feedback = `${player.name}: letra incorrecta. −10 puntos. Turno siguiente.`
  next.feedbackKind = 'error'
  if (player.eliminated) {
    next.feedback += ` ${player.name} eliminado por 30 letras incorrectas.`
    next.feedbackKind = 'elimination'
  }
  return advanceTurn(next, nowMs)
}

export function selectClue(state: MatchState, clueId: string, nowMs: number, revision: number): MatchState {
  const synced = tick(state, nowMs)
  if (synced !== state) return synced
  if (state.status !== 'playing' || state.phase !== 'matching' || revision !== state.revision) return state
  const active = state.players[state.activePlayerIndex]!
  if (active.eliminated || !clueAvailable(active, clueId)) return state
  const next = clone(state)
  const player = next.players[next.activePlayerIndex]!
  const revealed = next.currentRevealedFootballerId!
  if (clueId === revealed) {
    player.score += POINTS.matching
    player.correctlyMatchedIds.push(revealed)
    next.feedback = `${player.name}: ¡pista correcta! +15 puntos. Turno siguiente.`
    next.feedbackKind = 'success'
  } else {
    player.score += POINTS.clueError
    // Consume the current surname, never another surname's selected clue.
    player.failedMatchedIds.push(revealed)
    next.feedback = `${player.name}: pista incorrecta. −5 puntos. Turno siguiente.`
    next.feedbackKind = 'error'
  }
  return advanceTurn(next, nowMs)
}

export function getResult(state: MatchState): { winners: PlayerState[]; ranking: PlayerState[] } {
  const eligible = state.players.filter(player => !player.eliminated)
  const highest = Math.max(...eligible.map(player => player.score))
  return {
    winners: eligible.filter(player => player.score === highest),
    ranking: [...state.players].sort((a, b) => Number(a.eliminated) - Number(b.eliminated) || b.score - a.score),
  }
}
