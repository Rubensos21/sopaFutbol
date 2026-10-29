<script setup lang="ts">
import { onUnmounted, ref, watch } from 'vue'
import type { MatchState } from '../game/types'
const props = defineProps<Pick<MatchState, 'feedback' | 'feedbackKind' | 'lastWrongCell'>>()
const flash = ref(false)
let timeout: ReturnType<typeof setTimeout> | undefined
watch(() => props.lastWrongCell, cell => {
  if (timeout !== undefined) clearTimeout(timeout)
  flash.value = !!cell
  if (cell) timeout = setTimeout(() => { flash.value = false }, 700)
})
onUnmounted(() => { if (timeout !== undefined) clearTimeout(timeout) })
</script>
<template>
  <div class="turn-feedback" :class="feedbackKind" :role="feedbackKind === 'elimination' ? 'alert' : 'status'" :aria-live="feedbackKind === 'elimination' ? 'assertive' : 'polite'" aria-atomic="true">
    <span v-if="flash && lastWrongCell" class="wrong-letter" aria-hidden="true">{{ lastWrongCell.letter }}</span>
    <p>{{ feedback }}</p>
  </div>
</template>
