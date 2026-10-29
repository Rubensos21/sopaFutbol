<script setup lang="ts">
import { useMatch } from './composables/useMatch'
import SetupView from './views/SetupView.vue'
import GameView from './views/GameView.vue'
import ResultsView from './views/ResultsView.vue'
const match = useMatch()
const { state, nowMs, startError } = match
</script>

<template>
  <SetupView v-if="state.status === 'setup'" :start-error="startError" @start="match.start" />
  <GameView v-else-if="state.status === 'playing'" :state="state" :now-ms="nowMs" @cell="match.selectCell" @clue="match.selectClue" />
  <ResultsView v-else :state="state" @reset="match.reset" />
</template>
