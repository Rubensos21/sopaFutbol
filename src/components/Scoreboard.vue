<script setup lang="ts">
import type { PlayerState } from '../game/types'
import FootballIcon from './FootballIcon.vue'
defineProps<{ players: PlayerState[]; activePlayerIndex: number }>()
</script>
<template>
  <section class="scoreboard" aria-label="Marcador de los tres jugadores">
    <article v-for="(player, index) in players" :key="player.id" class="score-card" :class="{ active: index === activePlayerIndex, eliminated: player.eliminated }" :aria-label="`${player.name}: ${player.score} puntos, ${player.foundFootballerIds.length} apellidos encontrados${player.eliminated ? ', eliminado' : ''}`">
      <span class="player-dot" :class="player.color" /><span class="score-name" :title="player.name">{{ player.name }}<small v-if="player.eliminated">ELIMINADO</small></span>
      <span class="score-points"><FootballIcon name="crown" /><strong>{{ player.score }}</strong><span>PTS</span></span><span class="score-found" :title="`${player.foundFootballerIds.length} apellidos encontrados`">{{ player.foundFootballerIds.length }}/20</span>
    </article>
  </section>
</template>
