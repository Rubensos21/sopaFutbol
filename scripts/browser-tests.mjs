import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile, mkdtemp, rm } from 'node:fs/promises'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join, resolve, extname } from 'node:path'
import { startMatch, selectCell, selectClue } from '../src/game/matchEngine.ts'

// Chromium DevTools over pipes: no npm browser automation dependency is needed.
const browserPath = process.env.BROWSER_PATH ?? [
  '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome',
  '/opt/google/chrome/chrome', '/usr/bin/brave',
].find(existsSync)
if (!browserPath) throw new Error('Instalá Chromium/Chrome o indicá su ejecutable con BROWSER_PATH.')
if (!existsSync('dist/index.html')) throw new Error('Ejecutá pnpm build antes de las pruebas de navegador.')

const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' }
const root = resolve('dist')
const server = createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
  const file = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`)
  if (!file.startsWith(`${root}/`)) { response.writeHead(403).end(); return }
  try { response.setHeader('Content-Type', mime[extname(file)] ?? 'application/octet-stream'); response.end(await readFile(file)) }
  catch { response.writeHead(404).end() }
})
await new Promise((resolveListen, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolveListen) })
const address = server.address()
const url = `http://127.0.0.1:${address.port}/`
const profile = await mkdtemp(join(tmpdir(), 'sopa-browser-'))
const browser = spawn(browserPath, [
  '--headless', '--no-sandbox', '--disable-dev-shm-usage', '--no-first-run',
  '--disable-background-networking', '--disable-component-update', '--disable-extensions',
  '--disable-sync', '--disable-breakpad', '--hide-scrollbars',
  '--remote-debugging-pipe', `--user-data-dir=${profile}`, 'about:blank',
], { stdio: ['ignore', 'ignore', 'pipe', 'pipe', 'pipe'] })

let nextId = 0
let buffer = ''
let browserLog = ''
const pending = new Map()
const consoleErrors = []
browser.stderr.on('data', chunk => { browserLog = (browserLog + chunk).slice(-4000) })
browser.stdio[4].on('data', chunk => {
  buffer += chunk.toString()
  let separator
  while ((separator = buffer.indexOf('\0')) !== -1) {
    const message = JSON.parse(buffer.slice(0, separator)); buffer = buffer.slice(separator + 1)
    const request = pending.get(message.id)
    if (request) {
      clearTimeout(request.timeout); pending.delete(message.id)
      if (message.error) request.reject(new Error(message.error.message))
      else request.resolve(message.result)
    } else if (message.method === 'Runtime.exceptionThrown') {
      consoleErrors.push(message.params.exceptionDetails.text)
    } else if (message.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(message.params.type)) {
      consoleErrors.push(message.params.args.map(arg => arg.value ?? arg.description).join(' '))
    } else if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') {
      consoleErrors.push(message.params.entry.text)
    }
  }
})
browser.on('exit', () => {
  for (const request of pending.values()) { clearTimeout(request.timeout); request.reject(new Error(`Chromium se cerró: ${browserLog}`)) }
  pending.clear()
})
function send(method, params = {}, sessionId) {
  return new Promise((resolveRequest, reject) => {
    const id = ++nextId
    const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`Sin respuesta de Chromium: ${method}. ${browserLog}`)) }, 10000)
    pending.set(id, { resolve: resolveRequest, reject, timeout })
    browser.stdio[3].write(`${JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) })}\0`)
  })
}
let session
async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, session)
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text)
  return result.result.value
}
async function settle() { await evaluate('new Promise(resolve => setTimeout(resolve, 25))') }
async function clock(now) { await evaluate(`window.__testNow = ${now}`) }
async function click(selector, index = 0) {
  await evaluate(`document.querySelectorAll(${JSON.stringify(selector)})[${index}].click()`)
  await settle()
}
async function fill(index, name) {
  await evaluate(`{ const input = document.getElementById('player-name-${index}'); input.value = ${JSON.stringify(name)}; input.dispatchEvent(new Event('input', {bubbles:true})); input.dispatchEvent(new Event('blur')); }`)
  await settle()
}
async function checkLayout(width) {
  assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), true, 'La página no debe desbordar horizontalmente')
  assert.equal(await evaluate('document.querySelectorAll(".clue-card").length'), 20)
  assert.equal(await evaluate('document.querySelectorAll(".letter-cell").length'), 351)
  if (width < 768) {
    assert.ok(await evaluate('document.querySelector(".letter-cell").getBoundingClientRect().width') >= 32)
    assert.equal(await evaluate('document.querySelector(".board-viewport").scrollWidth > document.querySelector(".board-viewport").clientWidth'), true)
  }
}
await mkdir('docs/verification', { recursive: true })
async function screenshot(name) {
  const result = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }, session)
  await writeFile(`docs/verification/${name}.png`, Buffer.from(result.data, 'base64'))
}

try {
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
  session = (await send('Target.attachToTarget', { targetId, flatten: true })).sessionId
  await send('Page.enable', {}, session); await send('Runtime.enable', {}, session); await send('Log.enable', {}, session)
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `
    window.__testNow = 1000;
    Date.now = () => window.__testNow;
    Object.defineProperty(crypto, 'getRandomValues', {value: array => { array.fill(42); return array; }});
  ` }, session)
  for (const [width, height] of [[1376, 768], [1440, 900], [1024, 768], [390, 844]]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false }, session)
    await send('Page.navigate', { url }, session)
    for (let i = 0; i < 100; i++) {
      if (await evaluate('!!document.querySelector(".setup-layout")')) break
      await settle()
    }
    await evaluate('document.fonts.ready'); await settle()
    assert.equal(await evaluate('document.querySelectorAll(".rules-list li").length'), 6)
    assert.equal(await evaluate('document.querySelector(".primary-button").disabled'), true)
    assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), true)
    await screenshot(`setup-${width}x${height}`)
    await fill(0, ' Ana '); await fill(1, 'ana'); await fill(2, 'Caro')
    assert.equal(await evaluate('document.querySelector(".primary-button").disabled'), true)
    assert.ok(await evaluate('document.querySelectorAll(".field-error").length') >= 2)
    await fill(1, 'Beto'); await click('.primary-button')
    assert.equal(await evaluate('document.querySelector(".global-clock strong").textContent'), '20:00')
    assert.equal(await evaluate('document.querySelector(".phase-clock strong").textContent'), '30')
    assert.ok((await evaluate('document.querySelector(".letter-errors").textContent')).includes('0/30'))
    assert.equal(await evaluate('document.querySelectorAll(".clue-card:disabled").length'), 20)
    await checkLayout(width); await screenshot(`game-${width}x${height}`)
    const fixture = startMatch(['Ana', 'Beto', 'Caro'], 42, 1000)
    const first = fixture.players[0].board.placements[0]
    const cell = first.cells[0]
    await clock(2000); await click('.letter-cell', cell.row * 27 + cell.col)
    assert.equal(await evaluate('document.querySelectorAll(".letter-cell:disabled").length'), 351)
    assert.equal(await evaluate('document.querySelectorAll(".clue-card:disabled").length'), 0)
    assert.ok((await evaluate('document.querySelector(".turn-feedback").textContent')).includes('+15'))
    await screenshot(`matching-${width}x${height}`)
    await clock(3000); await click('.clue-card', fixture.players[0].footballers.findIndex(f => f.id === first.footballerId))
    assert.equal(await evaluate('document.querySelector(".turn-player h1").textContent'), 'Beto')
    assert.equal(await evaluate('document.querySelector(".score-points strong").textContent'), '30')
    await clock(33000); await evaluate('document.dispatchEvent(new Event("visibilitychange"))'); await settle()
    assert.equal(await evaluate('document.querySelector(".turn-player h1").textContent'), 'Caro')
    await clock(1201000); await evaluate('document.dispatchEvent(new Event("visibilitychange"))'); await settle()
    assert.ok((await evaluate('document.querySelector(".results-layout").textContent')).includes('límite de 20 minutos'))
    assert.equal(await evaluate('document.activeElement.tagName'), 'H1')
    await screenshot(`results-${width}x${height}`)
    await click('.play-again'); assert.equal(await evaluate('!!document.querySelector(".setup-layout")'), true)
    console.log(`✓ Flujo completo y layout ${width} × ${height}`)
  }

  // Real UI playthrough: find twenty names for Ana, one letter and one clue each.
  await clock(1000); await fill(0, 'Ana'); await fill(1, 'Beto'); await fill(2, 'Caro'); await click('.primary-button')
  let fixture = startMatch(['Ana', 'Beto', 'Caro'], 42, 1000)
  let now = 1000
  while (fixture.status === 'playing') {
    const player = fixture.players[fixture.activePlayerIndex]
    now += 1000; await clock(now)
    if (fixture.activePlayerIndex === 0) {
      const placement = player.board.placements.find(p => !player.foundFootballerIds.includes(p.footballerId))
      const cell = placement.cells[0]
      await click('.letter-cell', cell.row * 27 + cell.col)
      fixture = selectCell(fixture, cell.row, cell.col, now, fixture.revision)
      now += 1000; await clock(now)
      await click('.clue-card', player.footballers.findIndex(f => f.id === fixture.currentRevealedFootballerId))
      fixture = selectClue(fixture, fixture.currentRevealedFootballerId, now, fixture.revision)
    } else {
      const index = Array.from({ length: 351 }, (_, i) => i).find(i => !player.board.placements.some(p => p.cells.some(c => c.row === Math.floor(i / 27) && c.col === i % 27)))
      await click('.letter-cell', index)
      fixture = selectCell(fixture, Math.floor(index / 27), index % 27, now, fixture.revision)
    }
  }
  assert.equal(await evaluate('document.querySelector(".winner-names").textContent'), 'Ana')
  assert.ok((await evaluate('document.querySelector(".ranking-top>strong").textContent')).includes('600'))
  assert.ok((await evaluate('document.querySelector(".end-reason").textContent')).includes('20 apellidos'))
  assert.deepEqual(consoleErrors, [], 'Sin errores de consola ni advertencias Vue')
  console.log('✓ Veinte descubrimientos, pistas, resultado final y consola limpia')
} finally {
  browser.kill('SIGTERM'); server.close()
  await new Promise(resolveExit => browser.exitCode !== null || browser.signalCode !== null ? resolveExit() : browser.once('exit', resolveExit))
  await rm(profile, { recursive: true, force: true })
}
