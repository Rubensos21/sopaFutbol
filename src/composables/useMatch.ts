import { onUnmounted, ref, shallowRef, watch } from 'vue'
import { resetMatch, selectCell, selectClue, startMatch, tick } from '../game/matchEngine'

export function useMatch() {
  const state = shallowRef(resetMatch())
  const nowMs = ref(Date.now())
  const startError = ref('')
  let interval: ReturnType<typeof setInterval> | undefined
  let lastInteractionMs = -Infinity
  function synchronize() {
    nowMs.value = Date.now()
    state.value = tick(state.value, nowMs.value)
  }
  function stopClock() {
    if (interval !== undefined) clearInterval(interval)
    interval = undefined
    document.removeEventListener('visibilitychange', synchronize)
  }
  watch(() => state.value.status, status => {
    stopClock()
    if (status === 'playing') {
      interval = setInterval(synchronize, 150)
      document.addEventListener('visibilitychange', synchronize)
    }
  }, { flush: 'sync' })
  onUnmounted(stopClock)
  function start(names: string[]) {
    startError.value = ''
    try {
      const seed = crypto.getRandomValues(new Uint32Array(1))[0]!
      const started = startMatch(names, seed, Date.now())
      // Begin timing when generation is complete and the board is playable.
      const readyAt = Date.now()
      const generationMs = readyAt - started.matchStartedAtMs!
      started.matchStartedAtMs = readyAt
      started.matchDeadlineMs! += generationMs
      started.phaseDeadlineMs! += generationMs
      nowMs.value = readyAt
      lastInteractionMs = -Infinity
      state.value = started
    } catch (error) {
      startError.value = error instanceof Error ? error.message : 'No pudimos preparar el partido. Intentá otra vez.'
    }
  }
  function interact(action: (now: number) => void) {
    const now = Date.now()
    nowMs.value = now
    const synchronized = tick(state.value, now)
    if (synchronized !== state.value) {
      state.value = synchronized
      lastInteractionMs = now
      return
    }
    if (now - lastInteractionMs < 250) return
    const previous = state.value
    action(now)
    if (state.value !== previous) lastInteractionMs = now
  }
  return {
    state, nowMs, startError, start,
    selectCell: (row: number, col: number, revision: number) => interact(now => {
      state.value = selectCell(state.value, row, col, now, revision)
    }),
    selectClue: (id: string, revision: number) => interact(now => {
      state.value = selectClue(state.value, id, now, revision)
    }),
    reset: () => {
      stopClock()
      state.value = resetMatch()
      startError.value = ''
      lastInteractionMs = -Infinity
    },
  }
}
