import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { clueAvailable, finishMatch, getResult, resetMatch, selectCell, selectClue, startMatch, tick } from '../game/matchEngine'
import type { MatchState, PlayerState, Position } from '../game/types'

const initial = () => startMatch(['Ana', 'Beto', 'Caro'], 42, 1000)
function active(state: MatchState): PlayerState { return state.players[state.activePlayerIndex]! }
function reveal(state: MatchState, now = 2000): MatchState {
  const cell = active(state).board.placements.find(p => !active(state).foundFootballerIds.includes(p.footballerId))!.cells[0]!
  return selectCell(state, cell.row, cell.col, now, state.revision)
}
function wrongCell(player: PlayerState): Position {
  for (let row = 0; row < player.board.rows; row++) {
    for (let col = 0; col < player.board.cols; col++) {
      if (!player.board.placements.some(p => p.cells.some(cell => cell.row === row && cell.col === col))) return { row, col }
    }
  }
  throw new Error('Fixture sin celda vacía')
}
function miss(state: MatchState, now = 2000): MatchState {
  const { row, col } = wrongCell(active(state))
  return selectCell(state, row, col, now, state.revision)
}

describe('Motor de partido', () => {
  it('inicia tres jugadores a cero, con 60 palabras distintas y tableros propios', () => {
    const state = initial()
    assert.equal(state.status, 'playing')
    assert.equal(state.players.length, 3)
    assert.equal(new Set(state.players.flatMap(p => p.footballers.map(f => f.id))).size, 60)
    for (const p of state.players) {
      assert.equal(p.score, 0); assert.equal(p.letterErrors, 0)
      assert.deepEqual(p.foundFootballerIds, [])
      assert.equal(p.board.placements.length, 20); assert.equal(p.footballers.length, 20)
    }
    assert.notDeepEqual(state.players[0]!.board, state.players[1]!.board)
    assert.equal(state.matchDeadlineMs, 1201000); assert.equal(state.phaseDeadlineMs, 31000)
    assert.deepEqual(state, initial())
  })
  it('descubrir suma 15 y abre otros treinta segundos sin pausar el reloj global', () => {
    const before = initial(); const state = reveal(before, 12000)
    assert.equal(active(state).score, 15)
    assert.equal(active(state).foundFootballerIds.length, 1)
    assert.equal(state.phase, 'matching'); assert.equal(state.phaseDeadlineMs, 42000)
    assert.equal(state.matchDeadlineMs, before.matchDeadlineMs)
    assert.equal(active(before).score, 0)
  })
  it('pista correcta suma 15 extra y pasa al siguiente jugador', () => {
    const found = reveal(initial())
    const state = selectClue(found, found.currentRevealedFootballerId!, 3000, found.revision)
    assert.equal(state.players[0]!.score, 30)
    assert.equal(state.players[0]!.correctlyMatchedIds.length, 1)
    assert.equal(state.activePlayerIndex, 1); assert.equal(state.phase, 'searching')
    assert.equal(state.phaseDeadlineMs, 33000); assert.equal(state.currentRevealedFootballerId, null)
  })
  it('pista incorrecta conserva descubrimiento, resta 5 y no consume la pista ajena', () => {
    const found = reveal(initial())
    const wrong = active(found).footballers.find(f => f.id !== found.currentRevealedFootballerId)!
    const state = selectClue(found, wrong.id, 3000, found.revision)
    const p = state.players[0]!
    assert.equal(p.score, 10); assert.equal(p.letterErrors, 0)
    assert.deepEqual(p.failedMatchedIds, [found.currentRevealedFootballerId])
    assert.equal(clueAvailable(p, wrong.id), true)
    assert.equal(clueAvailable(p, found.currentRevealedFootballerId!), false)
    assert.equal(state.activePlayerIndex, 1)
  })
  it('letra incorrecta resta 10, incrementa errores y permite puntuación negativa', () => {
    const state = miss(initial())
    assert.equal(state.players[0]!.score, -10)
    assert.equal(state.players[0]!.letterErrors, 1)
    assert.equal(state.activePlayerIndex, 1)
  })
  it('vencer fase A penaliza una vez y no incrementa errores', () => {
    const state = tick(initial(), 31000)
    assert.equal(state.players[0]!.score, -10); assert.equal(state.players[0]!.letterErrors, 0)
    assert.equal(state.activePlayerIndex, 1); assert.strictEqual(tick(state, 31000), state)
  })
  it('vencer fase B resta 5, registra el apellido fallido y no suma error de letra', () => {
    const found = reveal(initial())
    const state = tick(found, 32000)
    assert.equal(state.players[0]!.score, 10)
    assert.deepEqual(state.players[0]!.failedMatchedIds, [found.currentRevealedFootballerId])
    assert.equal(state.players[0]!.letterErrors, 0); assert.equal(state.activePlayerIndex, 1)
    assert.strictEqual(tick(state, 32000), state)
  })
  it('ignora celdas/pistas fuera de fase, IDs inválidos y eventos de una revisión vieja', () => {
    const before = initial(); const state = reveal(before)
    assert.strictEqual(selectClue(before, active(before).footballers[0]!.id, 2000, before.revision), before)
    assert.strictEqual(selectCell(state, 0, 0, 2100, state.revision), state)
    assert.strictEqual(selectClue(state, 'invalid', 2100, state.revision), state)
    assert.strictEqual(selectCell(before, -1, 0, 2000, before.revision), before)
    const next = selectClue(state, state.currentRevealedFootballerId!, 3000, state.revision)
    assert.strictEqual(selectClue(next, state.currentRevealedFootballerId!, 3100, state.revision), next)
    assert.strictEqual(selectCell(next, 0, 0, 3100, before.revision), next)
  })
  it('clic al vencer la fase procesa expiración y no se aplica al siguiente jugador', () => {
    const before = initial()
    const cell = active(before).board.placements[0]!.cells[0]!
    const state = selectCell(before, cell.row, cell.col, 31000, before.revision)
    assert.equal(state.players[0]!.score, -10); assert.equal(state.players[1]!.score, 0)
    assert.equal(state.activePlayerIndex, 1); assert.equal(state.phase, 'searching')
    const found = reveal(initial())
    const expired = selectClue(found, found.currentRevealedFootballerId!, 32000, found.revision)
    assert.equal(expired.players[0]!.score, 10); assert.equal(expired.activePlayerIndex, 1)
  })
  it('en cruces descubre solo el primer oculto y el segundo sigue encontrable', () => {
    let state = initial()
    const p = active(state)
    let crossing: Position | undefined
    for (const placement of p.board.placements) {
      crossing = placement.cells.find(cell => p.board.placements.filter(other => other.cells.some(c => c.row === cell.row && c.col === cell.col)).length > 1)
      if (crossing) break
    }
    assert.ok(crossing)
    const ids = p.board.placements.filter(other => other.cells.some(c => c.row === crossing.row && c.col === crossing.col)).map(other => other.footballerId)
    state = selectCell(state, crossing.row, crossing.col, 2000, state.revision)
    assert.deepEqual(active(state).foundFootballerIds, [ids[0]])
    state = selectClue(state, ids[0]!, 3000, state.revision)
    state = miss(state, 4000); state = miss(state, 5000)
    state = selectCell(state, crossing.row, crossing.col, 6000, state.revision)
    assert.equal(state.currentRevealedFootballerId, ids[1])
    assert.equal(active(state).foundFootballerIds.length, 2)
  })
  it('una celda que solo tiene palabras encontradas es un error sin repetir premio', () => {
    let state = initial(); const original = active(state)
    const placement = original.board.placements.find(p => p.cells.some(cell => original.board.placements.filter(q => q.cells.some(c => c.row === cell.row && c.col === cell.col)).length === 1))!
    const cell = placement.cells.find(cell => original.board.placements.filter(q => q.cells.some(c => c.row === cell.row && c.col === cell.col)).length === 1)!
    state = selectCell(state, cell.row, cell.col, 2000, state.revision)
    state = selectClue(state, state.currentRevealedFootballerId!, 3000, state.revision)
    state = miss(state, 4000); state = miss(state, 5000)
    state = selectCell(state, cell.row, cell.col, 6000, state.revision)
    assert.equal(state.players[0]!.score, 20)
    assert.equal(state.players[0]!.foundFootballerIds.length, 1)
    assert.equal(state.players[0]!.letterErrors, 1)
  })
  it('elimina exactamente al error 30, salta eliminados y termina con el último superviviente', () => {
    let state = initial()
    for (let i = 0; i < 88; i++) state = miss(state, 2000 + i * 1000)
    assert.equal(state.players[0]!.letterErrors, 30); assert.equal(state.players[0]!.eliminated, true)
    assert.equal(state.activePlayerIndex, 1); assert.equal(state.status, 'playing')
    state = miss(state, 90000)
    assert.equal(state.status, 'finished'); assert.equal(state.endReason, 'last-survivor')
    assert.deepEqual(getResult(state).winners.map(p => p.name), ['Caro'])
    assert.equal(state.players[2]!.letterErrors, 29)
  })
  it('mantiene el orden circular al saltar un jugador eliminado', () => {
    let state = initial(); state.players[1]!.eliminated = true
    state = miss(state); assert.equal(state.activePlayerIndex, 2)
    state = miss(state, 3000); assert.equal(state.activePlayerIndex, 0)
  })
  for (const finalAttempt of ['correct', 'wrong', 'timeout'] as const) {
    it(`la palabra 20 termina solo después de la fase B (${finalAttempt})`, () => {
      let state = initial()
      const p = active(state)
      p.foundFootballerIds = p.board.placements.slice(0, 19).map(placement => placement.footballerId)
      p.correctlyMatchedIds = [...p.foundFootballerIds]; p.score = 570
      state = reveal(state)
      assert.equal(state.status, 'playing'); assert.equal(active(state).foundFootballerIds.length, 20)
      if (finalAttempt === 'timeout') state = tick(state, state.phaseDeadlineMs!)
      else state = selectClue(state, finalAttempt === 'correct' ? state.currentRevealedFootballerId! : active(state).footballers.find(f => f.id !== state.currentRevealedFootballerId)!.id, 3000, state.revision)
      // A previously resolved clue is unavailable. For the wrong-choice fixture,
      // make one other clue still eligible while its discovery remains complete.
      if (finalAttempt === 'wrong' && state.status === 'playing') {
        active(state).correctlyMatchedIds = active(state).correctlyMatchedIds.slice(1)
        state = selectClue(state, active(state).foundFootballerIds[0]!, 3000, state.revision)
      }
      assert.equal(state.status, 'finished'); assert.equal(state.endReason, 'all-found')
      assert.equal(state.players[0]!.score, finalAttempt === 'correct' ? 600 : 580)
    })
  }
  it('el reloj global vence antes que la fase, sin penalización adicional', () => {
    for (const before of [initial(), reveal(initial())]) {
      const state = tick(before, before.matchDeadlineMs!)
      assert.equal(state.status, 'finished'); assert.equal(state.endReason, 'time-limit')
      assert.equal(state.players[0]!.score, before.players[0]!.score)
      assert.equal(state.players[0]!.failedMatchedIds.length, 0)
      assert.strictEqual(selectCell(state, 0, 0, 2000000, state.revision), state)
      assert.strictEqual(selectClue(state, 'anything', 2000000, state.revision), state)
      assert.strictEqual(tick(state, 2000000), state)
    }
  })
  it('clic justo en el límite global termina sin puntuar', () => {
    const before = initial(); const cell = active(before).board.placements[0]!.cells[0]!
    const state = selectCell(before, cell.row, cell.col, before.matchDeadlineMs!, before.revision)
    assert.equal(state.endReason, 'time-limit'); assert.equal(state.players[0]!.score, 0)
  })
  it('empatados elegibles ganan aunque un eliminado tenga más puntos', () => {
    const state = initial(); state.players[0]!.score = -10; state.players[1]!.score = -10
    state.players[2]!.score = 100; state.players[2]!.eliminated = true
    const result = getResult(finishMatch(state, 'time-limit', 1201000))
    assert.deepEqual(result.winners.map(p => p.name), ['Ana', 'Beto'])
    assert.equal(result.ranking[2]!.name, 'Caro')
  })
  it('todos eliminados dejan la partida sin ganador', () => {
    const state = initial(); state.players.forEach(p => { p.eliminated = true; p.letterErrors = 30 })
    const finished = finishMatch(state, 'all-eliminated', 2000)
    assert.equal(finished.endReason, 'all-eliminated'); assert.deepEqual(getResult(finished).winners, [])
  })
  it('reset limpia el partido y permite iniciar uno nuevo', () => {
    const setup = resetMatch()
    assert.equal(setup.status, 'setup'); assert.deepEqual(setup.players, [])
    assert.equal(setup.phaseDeadlineMs, null); assert.equal(setup.matchDeadlineMs, null)
    assert.strictEqual(tick(setup, 10000), setup)
    assert.equal(initial().status, 'playing')
  })
})
