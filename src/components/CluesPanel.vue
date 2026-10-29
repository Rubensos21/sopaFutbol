<script setup lang="ts">
import type { PlayerState } from '../game/types'
import { clueAvailable } from '../game/matchEngine'
import FootballIcon from './FootballIcon.vue'
defineProps<{ player: PlayerState; enabled: boolean; revision: number }>()
const emit = defineEmits<{ select: [id: string, revision: number] }>()
</script>
<template>
  <section class="clues-panel" aria-labelledby="clues-heading">
    <div class="clues-heading"><h2 id="clues-heading"><FootballIcon name="list" /> PISTAS</h2><span>{{ enabled ? 'Elegí una sola pista · +15 si acertás' : 'Encontrá un apellido para habilitar las pistas' }}</span></div>
    <div class="clues-grid">
      <button v-for="(footballer, index) in player.footballers" :key="footballer.id" type="button" class="clue-card"
        :class="{ resolved: player.correctlyMatchedIds.includes(footballer.id), unavailable: player.failedMatchedIds.includes(footballer.id) }"
        :disabled="!enabled || !clueAvailable(player, footballer.id)" @click="$event.detail <= 1 && emit('select', footballer.id, revision)">
        <span class="clue-number">{{ index + 1 }}</span><span class="clue-text">{{ footballer.clue }}
          <small v-if="player.correctlyMatchedIds.includes(footballer.id)">✓ RESUELTA · {{ footballer.puzzleWord }}</small><small v-else-if="player.failedMatchedIds.includes(footballer.id)">× NO DISPONIBLE</small>
        </span>
      </button>
    </div>
  </section>
</template>
