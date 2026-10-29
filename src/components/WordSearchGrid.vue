<script setup lang="ts">
import { computed, ref } from 'vue'
import type { PlayerState } from '../game/types'
const props = defineProps<{ player: PlayerState; revealedId: string | null; disabled: boolean; revision: number }>()
const emit = defineEmits<{ select: [row: number, col: number, revision: number] }>()
const grid = ref<HTMLDivElement>()
const focusIndex = ref(0)
const highlights = computed(() => {
  const result = new Map<number, { current: boolean; words: string[] }>()
  for (const placement of props.player.board.placements) {
    if (!props.player.foundFootballerIds.includes(placement.footballerId)) continue
    for (const { row, col } of placement.cells) {
      const key = row * props.player.board.cols + col
      const previous = result.get(key)
      result.set(key, { current: !!previous?.current || placement.footballerId === props.revealedId, words: [...(previous?.words ?? []), placement.word] })
    }
  }
  return result
})
const cells = computed(() => props.player.board.letters.flatMap((row, r) => row.map((letter, c) => ({ row: r, col: c, letter, index: r * props.player.board.cols + c }))))
function label(index: number, row: number, col: number, letter: string): string {
  const found = highlights.value.get(index)
  return `Fila ${row + 1}, columna ${col + 1}, letra ${letter}${found ? `, encontrado: ${found.words.join(', ')}` : ''}`
}
function navigate(event: KeyboardEvent, index: number) {
  const columns = props.player.board.cols
  const moves: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: columns, ArrowUp: -columns, Home: -(index % columns), End: columns - 1 - (index % columns) }
  const movement = moves[event.key]
  if (movement === undefined) return
  event.preventDefault()
  focusIndex.value = Math.max(0, Math.min(cells.value.length - 1, index + movement))
  grid.value?.querySelectorAll('button')[focusIndex.value]?.focus()
}
</script>
<template>
  <section class="board-section" aria-label="Sopa de letras del jugador activo">
    <p class="scroll-hint">↔ Deslizá el tablero para ver todas las letras. Con teclado, usá las flechas.</p>
    <div class="board-viewport" tabindex="0" :aria-label="`Tablero de ${player.name}; desplazamiento horizontal disponible`">
      <div ref="grid" class="word-grid" :style="{ gridTemplateColumns: `repeat(${player.board.cols}, 1fr)` }">
        <button v-for="cell in cells" :key="cell.index" type="button" class="letter-cell"
          :class="{ found: highlights.has(cell.index), revealed: highlights.get(cell.index)?.current }"
          :disabled="disabled" :tabindex="cell.index === focusIndex ? 0 : -1" :aria-label="label(cell.index, cell.row, cell.col, cell.letter)"
          @focus="focusIndex = cell.index" @keydown="navigate($event, cell.index)"
          @click="$event.detail <= 1 && emit('select', cell.row, cell.col, revision)">{{ cell.letter }}</button>
      </div>
    </div>
  </section>
</template>
