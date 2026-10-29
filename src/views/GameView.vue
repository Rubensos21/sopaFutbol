<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import type { MatchState } from '../game/types'
import MatchHeader from '../components/MatchHeader.vue'
import Scoreboard from '../components/Scoreboard.vue'
import WordSearchGrid from '../components/WordSearchGrid.vue'
import CluesPanel from '../components/CluesPanel.vue'
import TurnFeedback from '../components/TurnFeedback.vue'
const props = defineProps<{ state: MatchState; nowMs: number }>()
const emit = defineEmits<{ cell: [row: number, col: number, revision: number]; clue: [id: string, revision: number] }>()
const player = computed(() => props.state.players[props.state.activePlayerIndex]!)
const revealed = computed(() => player.value.footballers.find(entry => entry.id === props.state.currentRevealedFootballerId))
const game = ref<HTMLElement>()
watch(() => props.state.revision, async () => {
  await nextTick()
  if (props.state.phase === 'matching') {
    const firstClue = game.value?.querySelector<HTMLButtonElement>('.clue-card:not(:disabled)')
    firstClue?.focus({ preventScroll: true })
    if (window.matchMedia('(max-width: 767px)').matches) firstClue?.scrollIntoView({ block: 'center', behavior: 'instant' })
  } else {
    game.value?.querySelector<HTMLButtonElement>('.letter-cell[tabindex="0"]')?.focus({ preventScroll: true })
  }
}, { immediate: true })
</script>
<template>
  <main ref="game" class="game-layout">
    <MatchHeader :state="state" :player="player" :now-ms="nowMs" />
    <Scoreboard :players="state.players" :active-player-index="state.activePlayerIndex" />
    <div class="turn-context"><strong>{{ state.phase === 'searching' ? 'BUSCÁ UN APELLIDO' : 'ELEGÍ SU PISTA' }}<span v-if="revealed"> · {{ revealed.puzzleWord }}</span></strong><span>{{ state.phase === 'searching' ? 'Una letra alcanza para revelar el apellido.' : 'Tenés 30 segundos. El reloj del partido sigue corriendo.' }}</span></div>
    <WordSearchGrid :key="player.id" :player="player" :revealed-id="state.currentRevealedFootballerId" :disabled="state.phase !== 'searching'" :revision="state.revision" @select="(row, col, revision) => emit('cell', row, col, revision)" />
    <TurnFeedback :feedback="state.feedback" :feedback-kind="state.feedbackKind" :last-wrong-cell="state.lastWrongCell" />
    <CluesPanel :player="player" :enabled="state.phase === 'matching'" :revision="state.revision" @select="(id, revision) => emit('clue', id, revision)" />
  </main>
</template>
