<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getResult } from '../game/matchEngine'
import type { MatchEndReason, MatchState } from '../game/types'
import FootballIcon from '../components/FootballIcon.vue'
const props = defineProps<{ state: MatchState }>()
defineEmits<{ reset: [] }>()
const heading = ref<HTMLHeadingElement>()
const result = computed(() => getResult(props.state))
const reasons: Record<MatchEndReason, string> = {
  'all-found': 'Un jugador encontró sus 20 apellidos y terminó la última fase de pista.',
  'time-limit': 'Se cumplió el límite de 20 minutos del partido.',
  'last-survivor': 'Queda un único jugador sin eliminar.',
  'all-eliminated': 'Todos los jugadores fueron eliminados por 30 errores de letra. No hay ganador.',
}
const title = computed(() => result.value.winners.length === 0 ? 'PARTIDO SIN GANADOR' : result.value.winners.length > 1 ? '¡EMPATE!' : '¡TENEMOS CAMPEÓN!')
onMounted(() => heading.value?.focus())
</script>
<template>
  <main class="results-layout">
    <div class="brand-pill"><FootballIcon /><span>SOPA DE LETRAS FUTBOLERA</span></div>
    <div class="result-trophy"><FootballIcon name="crown" /></div><p class="eyebrow">EL ÁRBITRO PITÓ EL FINAL</p>
    <h1 ref="heading" tabindex="-1">{{ title }}</h1>
    <p v-if="result.winners.length" class="winner-names">{{ result.winners.map(player => player.name).join(' · ') }}</p>
    <p class="end-reason" role="status">{{ state.endReason ? reasons[state.endReason] : '' }}</p>
    <section class="result-ranking" aria-labelledby="ranking-heading">
      <h2 id="ranking-heading">CLASIFICACIÓN FINAL</h2>
      <article v-for="player in result.ranking" :key="player.id" class="ranking-card">
        <div class="ranking-top"><span class="ranking-position">{{ player.eliminated ? '—' : result.ranking.findIndex(other => !other.eliminated && other.score === player.score) + 1 }}</span><span class="player-dot" :class="player.color" /><h3>{{ player.name }}<small v-if="player.eliminated">ELIMINADO</small><small v-else-if="result.winners.some(winner => winner.id === player.id)">{{ result.winners.length > 1 ? 'EMPATE EN EL PRIMER PUESTO' : 'GANADOR' }}</small></h3><strong>{{ player.score }} <span>PTS</span></strong></div>
        <dl class="result-stats"><div><dt>Apellidos</dt><dd>{{ player.foundFootballerIds.length }}/20</dd></div><div><dt>Pistas acertadas</dt><dd>{{ player.correctlyMatchedIds.length }}</dd></div><div><dt>Pistas fallidas</dt><dd>{{ player.failedMatchedIds.length }}</dd></div><div><dt>Errores de letra</dt><dd>{{ player.letterErrors }}/30</dd></div></dl>
        <details><summary>Ver los apellidos y sus pistas</summary><ul class="result-words"><li v-for="entry in player.footballers" :key="entry.id"><strong>{{ entry.fullName }}</strong><span>{{ player.correctlyMatchedIds.includes(entry.id) ? '✓ Palabra y pista acertadas' : player.failedMatchedIds.includes(entry.id) ? '× Encontrado · pista fallida' : player.foundFootballerIds.includes(entry.id) ? 'Encontrado · pista sin terminar' : 'Sin encontrar' }}</span><p>{{ entry.clue }}</p></li></ul></details>
      </article>
    </section>
    <button type="button" class="primary-button play-again" @click="$emit('reset')">JUGAR DE NUEVO <span aria-hidden="true">↻</span></button>
  </main>
</template>
