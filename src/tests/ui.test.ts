import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import SetupView from '../views/SetupView.vue'
import MatchHeader from '../components/MatchHeader.vue'
import Scoreboard from '../components/Scoreboard.vue'
import WordSearchGrid from '../components/WordSearchGrid.vue'
import CluesPanel from '../components/CluesPanel.vue'
import ResultsView from '../views/ResultsView.vue'
import { finishMatch, selectCell, startMatch } from '../game/matchEngine'

describe('Componentes Vue', () => {
  it('preparación contiene tres labels vinculados, seis reglas completas y botón deshabilitado', async () => {
    const html = await renderToString(createSSRApp({ render: () => h(SetupView, { startError: '' }) }))
    assert.equal((html.match(/<input /g) ?? []).length, 3)
    assert.equal((html.match(/<label /g) ?? []).length, 3)
    assert.equal((html.match(/class="rule-number"/g) ?? []).length, 6)
    assert.match(html, /ARRANCAR EL PARTIDO/)
    assert.match(html, /<button[^>]*disabled/)
    assert.match(html, /20 minutos en total/)
    assert.match(html, /for="player-name-2"/)
  })
  it('cabecera y marcador muestran nombres, cero errores y tiempos iniciales reales', async () => {
    const state = startMatch(['Ana', 'Beto', 'Caro'], 42, 1000)
    const player = state.players[0]!
    const header = await renderToString(createSSRApp({ render: () => h(MatchHeader, { state, player, nowMs: 1000 }) }))
    const scoreboard = await renderToString(createSSRApp({ render: () => h(Scoreboard, { players: state.players, activePlayerIndex: 0 }) }))
    assert.match(header, /Ana/); assert.match(header, /20:00/); assert.match(header, />30</); assert.match(header, /0\/30/)
    for (const name of ['Ana', 'Beto', 'Caro']) assert.match(scoreboard, new RegExp(name))
    assert.equal((scoreboard.match(/class="score-card/g) ?? []).length, 3)
  })
  it('solo presenta 351 celdas y 20 pistas propias sin respuestas ocultas', async () => {
    const state = startMatch(['Ana', 'Beto', 'Caro'], 42, 1000)
    const player = state.players[0]!
    const grid = await renderToString(createSSRApp({ render: () => h(WordSearchGrid, { player, revealedId: null, disabled: false, revision: state.revision }) }))
    const clues = await renderToString(createSSRApp({ render: () => h(CluesPanel, { player, enabled: false, revision: state.revision }) }))
    assert.equal((grid.match(/class="letter-cell/g) ?? []).length, 351)
    assert.equal((clues.match(/class="clue-card/g) ?? []).length, 20)
    assert.equal((clues.match(/ disabled/g) ?? []).length, 20)
    assert.match(grid, /Fila 1, columna 1, letra/)
    assert.equal((grid.match(/tabindex="0"/g) ?? []).length, 2)
    for (const f of player.footballers) assert.equal(clues.includes(f.puzzleWord), false)
    for (const f of state.players[1]!.footballers) assert.equal(clues.includes(f.clue), false)
  })
  it('en fase B bloquea celdas y habilita pistas sin señalar la correcta', async () => {
    const before = startMatch(['Ana', 'Beto', 'Caro'], 42, 1000)
    const cell = before.players[0]!.board.placements[0]!.cells[0]!
    const state = selectCell(before, cell.row, cell.col, 2000, before.revision)
    const player = state.players[0]!
    const grid = await renderToString(createSSRApp({ render: () => h(WordSearchGrid, { player, revealedId: state.currentRevealedFootballerId, disabled: true, revision: state.revision }) }))
    const clues = await renderToString(createSSRApp({ render: () => h(CluesPanel, { player, enabled: true, revision: state.revision }) }))
    assert.equal((grid.match(/ disabled/g) ?? []).length, 351)
    assert.equal((clues.match(/ disabled/g) ?? []).length, 0)
    assert.match(grid, /encontrado:/); assert.match(grid, /found revealed/)
    assert.equal(clues.includes('RESUELTA'), false)
  })
  it('resultados muestran empate, causa, estadísticas, apellidos y botón de reinicio', async () => {
    const state = finishMatch(startMatch(['Ana', 'Beto', 'Caro'], 42, 1000), 'time-limit', 1201000)
    const html = await renderToString(createSSRApp({ render: () => h(ResultsView, { state }) }))
    assert.match(html, /¡EMPATE!/); assert.match(html, /Ana · Beto · Caro/)
    assert.match(html, /límite de 20 minutos/); assert.match(html, /Errores de letra/)
    assert.match(html, /JUGAR DE NUEVO/)
    assert.equal((html.match(/class="ranking-card"/g) ?? []).length, 3)
    assert.equal((html.match(/Sin encontrar/g) ?? []).length, 60)
  })
  it('escapa nombres del usuario y comunica errores recuperables sin HTML inyectado', async () => {
    const state = startMatch(['<img src=x>', 'Beto', 'Caro'], 42, 1000)
    const html = await renderToString(createSSRApp({ render: () => h(Scoreboard, { players: state.players, activePlayerIndex: 0 }) }))
    assert.ok(!html.includes('<img src=x>')); assert.match(html, /&lt;img src=x&gt;/)
    const setup = await renderToString(createSSRApp({ render: () => h(SetupView, { startError: 'Error recuperable' }) }))
    assert.match(setup, /role="alert">Error recuperable/)
  })
})
