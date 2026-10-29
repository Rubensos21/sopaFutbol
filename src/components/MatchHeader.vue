<script setup lang="ts">
import { computed } from 'vue'
import type { MatchState, PlayerState } from '../game/types'
import { MATCH_DURATION_SECONDS } from '../game/constants'
const props = defineProps<{ state: MatchState; player: PlayerState; nowMs: number }>()
const globalSeconds = computed(() => Math.max(0, Math.ceil((props.state.matchDeadlineMs! - props.nowMs) / 1000)))
const phaseSeconds = computed(() => Math.max(0, Math.ceil((props.state.phaseDeadlineMs! - props.nowMs) / 1000)))
const globalTime = computed(() => `${Math.floor(globalSeconds.value / 60).toString().padStart(2, '0')}:${(globalSeconds.value % 60).toString().padStart(2, '0')}`)
const progress = computed(() => Math.max(0, Math.min(1, (props.state.matchDeadlineMs! - props.nowMs) / (MATCH_DURATION_SECONDS * 1000))))
</script>
<template>
  <header class="match-header">
    <div class="turn-player"><span class="player-dot" :class="player.color" /><div><span class="eyebrow">TURNO DE</span><h1 :class="`text-${player.color}`" :title="player.name">{{ player.name }}</h1></div></div>
    <div class="global-clock"><span class="eyebrow">FIN DE PARTIDO EN</span><strong aria-label="Tiempo restante del partido" role="timer">{{ globalTime }}</strong></div>
    <div class="phase-clock"><span class="letter-errors" aria-label="Errores de letra"><b aria-hidden="true">×</b> {{ player.letterErrors }}/30</span><div><span class="eyebrow">{{ state.phase === 'searching' ? 'BUSCAR' : 'ASOCIAR' }}</span><strong role="timer" aria-label="Segundos de la fase" :class="{ urgent: phaseSeconds <= 5 }">{{ phaseSeconds }}</strong></div></div>
  </header>
  <div class="time-progress" role="progressbar" aria-label="Tiempo restante del partido" :aria-valuenow="globalSeconds" :aria-valuemin="0" :aria-valuemax="MATCH_DURATION_SECONDS"><span :style="{ transform: `scaleX(${progress})` }" /></div>
</template>
