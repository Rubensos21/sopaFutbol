import { describe, it } from 'node:test'
import type { TestContext } from 'node:test'
import assert from 'node:assert/strict'
import { createRenderer, defineComponent } from 'vue'
import { useMatch } from '../composables/useMatch'

interface HostNode { parent: HostNode | null; children: HostNode[] }
const node = (): HostNode => ({ parent: null, children: [] })
const renderer = createRenderer<HostNode, HostNode>({
  patchProp: () => {}, createElement: node, createText: node, createComment: node,
  setText: () => {}, setElementText: () => {},
  parentNode: n => n.parent, nextSibling: () => null,
  insert: (child, parent) => { parent.children.push(child); child.parent = parent },
  remove: child => { if (child.parent) child.parent.children = child.parent.children.filter(n => n !== child) },
})

class VisibilityDocument extends EventTarget {
  listening = false
  override addEventListener(type: string, listener: EventListenerOrEventListenerObject | null) {
    if (type === 'visibilitychange') this.listening = true
    super.addEventListener(type, listener)
  }
  override removeEventListener(type: string, listener: EventListenerOrEventListenerObject | null) {
    if (type === 'visibilitychange') this.listening = false
    super.removeEventListener(type, listener)
  }
}

function mountClock(context: TestContext) {
  context.mock.timers.enable({ apis: ['Date', 'setInterval'], now: 1000 })
  const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document')
  const document = new VisibilityDocument()
  Object.defineProperty(globalThis, 'document', { value: document, configurable: true })
  let match!: ReturnType<typeof useMatch>
  const app = renderer.createApp(defineComponent({ setup() { match = useMatch(); return () => null } }))
  app.mount(node())
  context.after(() => {
    app.unmount()
    if (originalDocument) Object.defineProperty(globalThis, 'document', originalDocument)
    else Reflect.deleteProperty(globalThis, 'document')
  })
  return { match, document, app }
}

describe('Reloj y ciclo de vida Vue', () => {
  it('usa fechas absolutas y cambia de turno al vencer treinta segundos reales', context => {
    const { match, document } = mountClock(context)
    match.start(['Ana', 'Beto', 'Caro'])
    assert.equal(match.state.value.phaseDeadlineMs, 31000)
    assert.equal(match.state.value.matchDeadlineMs, 1201000)
    assert.equal(document.listening, true)
    context.mock.timers.tick(30000)
    assert.equal(match.state.value.players[0]!.score, -10)
    assert.equal(match.state.value.activePlayerIndex, 1)
    assert.equal(match.state.value.players[0]!.letterErrors, 0)
  })
  it('reanudar visibilidad termina por tiempo global sin penalización de fase', context => {
    const { match, document } = mountClock(context)
    match.start(['Ana', 'Beto', 'Caro'])
    const state = match.state.value
    const cell = state.players[0]!.board.placements[0]!.cells[0]!
    match.selectCell(cell.row, cell.col, state.revision)
    context.mock.timers.setTime(1201000)
    document.dispatchEvent(new Event('visibilitychange'))
    assert.equal(match.state.value.status, 'finished')
    assert.equal(match.state.value.endReason, 'time-limit')
    assert.equal(match.state.value.players[0]!.score, 15)
    assert.equal(match.state.value.players[0]!.failedMatchedIds.length, 0)
    assert.equal(document.listening, false)
  })
  it('reset cancela reloj, limpia datos y permite volver a jugar', context => {
    const { match, document } = mountClock(context)
    match.start(['Ana', 'Beto', 'Caro']); match.reset()
    assert.equal(document.listening, false)
    assert.equal(match.state.value.status, 'setup')
    assert.equal(match.state.value.players.length, 0)
    const previousNow = match.nowMs.value
    context.mock.timers.tick(1200000)
    assert.equal(match.nowMs.value, previousNow)
    match.start(['Dani', 'Eva', 'Fran'])
    assert.equal(match.state.value.status, 'playing')
    assert.equal(match.state.value.players[0]!.score, 0)
    assert.equal(document.listening, true)
  })
  it('desmontar elimina intervalo y escucha de visibilidad', context => {
    const { match, document, app } = mountClock(context)
    match.start(['Ana', 'Beto', 'Caro']); app.unmount()
    assert.equal(document.listening, false)
    const state = match.state.value
    context.mock.timers.tick(60000)
    document.dispatchEvent(new Event('visibilitychange'))
    assert.strictEqual(match.state.value, state)
  })
  it('bloquea dos toques rápidos que atraviesan el cambio de turno', context => {
    const { match } = mountClock(context)
    match.start(['Ana', 'Beto', 'Caro'])
    const player = match.state.value.players[0]!
    const index = Array.from({ length: 351 }, (_, i) => i).find(i => !player.board.placements.some(p => p.cells.some(c => c.row === Math.floor(i / 27) && c.col === i % 27)))!
    match.selectCell(Math.floor(index / 27), index % 27, match.state.value.revision)
    const next = match.state.value
    match.selectCell(0, 0, next.revision)
    assert.strictEqual(match.state.value, next)
    assert.equal(next.players[1]!.score, 0)
    context.mock.timers.tick(251)
    const cell = next.players[1]!.board.placements[0]!.cells[0]!
    match.selectCell(cell.row, cell.col, next.revision)
    assert.equal(match.state.value.players[1]!.score, 15)
  })
  it('errores de inicio son recuperables y no arrancan un reloj incompleto', context => {
    const { match, document } = mountClock(context)
    match.start(['Ana', '', 'Caro'])
    assert.equal(match.state.value.status, 'setup')
    assert.ok(match.startError.value)
    assert.equal(document.listening, false)
    match.start(['Ana', 'Beto', 'Caro'])
    assert.equal(match.startError.value, '')
    assert.equal(match.state.value.status, 'playing')
  })
  it('permite asociar la pista tras el descubrimiento y pasa el turno', context => {
    const { match } = mountClock(context)
    match.start(['Ana', 'Beto', 'Caro'])
    const state = match.state.value
    const cell = state.players[0]!.board.placements[0]!.cells[0]!
    match.selectCell(cell.row, cell.col, state.revision)
    context.mock.timers.tick(300)
    match.selectClue(match.state.value.currentRevealedFootballerId!, match.state.value.revision)
    assert.equal(match.state.value.players[0]!.score, 30)
    assert.equal(match.state.value.activePlayerIndex, 1)
    assert.equal(match.state.value.phase, 'searching')
  })
  it('una interacción sincroniza el límite global antes de bloquear un segundo toque', context => {
    const { match } = mountClock(context)
    match.start(['Ana', 'Beto', 'Caro'])
    context.mock.timers.setTime(1200950)
    // Set the phase deadline beyond this instant to isolate the global boundary.
    match.state.value.phaseDeadlineMs = 1210000
    const cell = match.state.value.players[0]!.board.placements[0]!.cells[0]!
    match.selectCell(cell.row, cell.col, match.state.value.revision)
    context.mock.timers.setTime(1201000)
    match.selectClue(match.state.value.currentRevealedFootballerId!, match.state.value.revision)
    assert.equal(match.state.value.status, 'finished')
    assert.equal(match.state.value.players[0]!.score, 15)
  })
})
