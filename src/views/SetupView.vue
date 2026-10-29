<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import FootballIcon from '../components/FootballIcon.vue'
import RulesPanel from '../components/RulesPanel.vue'
import { validateNames } from '../game/validation'
defineProps<{ startError: string }>()
const emit = defineEmits<{ start: [names: string[]] }>()
const names = ref(['Davo "El Profesor"', '', ''])
const touched = ref([false, false, false])
const errors = computed(() => validateNames(names.value))
const valid = computed(() => errors.value.every(error => !error))
const colors = ['blue', 'red', 'purple']
const heading = ref<HTMLHeadingElement>()
onMounted(() => heading.value?.focus({ preventScroll: true }))
async function submit() {
  touched.value = [true, true, true]
  if (!valid.value) {
    await nextTick()
    document.getElementById(`player-name-${errors.value.findIndex(Boolean)}`)?.focus()
    return
  }
  emit('start', names.value.map(name => name.trim()))
}
</script>
<template>
  <main class="setup-layout">
    <section class="registration" aria-labelledby="setup-heading"><div class="registration-content">
      <div class="brand-pill"><FootballIcon /><span>SOPA DE LETRAS FUTBOLERA</span></div>
      <h1 id="setup-heading" ref="heading" tabindex="-1">NOMBRES DE LOS<br />JUGADORES</h1>
      <p class="setup-description">Completá los nombres de los 3 participantes para arrancar el partido.</p>
      <form novalidate @submit.prevent="submit">
        <div v-for="(_, index) in names" :key="index" class="name-field">
          <label :for="`player-name-${index}`"><span class="player-dot" :class="colors[index]" />JUGADOR {{ index + 1 }}</label>
          <input :id="`player-name-${index}`" v-model="names[index]" type="text" autocomplete="off" :name="`jugador-${index + 1}`"
            :placeholder="`Nombre del jugador ${index + 1}...`" :aria-invalid="touched[index] && !!errors[index]"
            :aria-describedby="touched[index] && errors[index] ? `name-error-${index}` : undefined" @blur="touched[index] = true" />
          <p v-if="touched[index] && errors[index]" :id="`name-error-${index}`" class="field-error">{{ errors[index] }}</p>
        </div>
        <p v-if="startError" class="field-error" role="alert">{{ startError }}</p>
        <button class="primary-button" type="submit" :disabled="!valid">ARRANCAR EL PARTIDO <span aria-hidden="true">▶</span></button>
      </form>
    </div></section>
    <RulesPanel />
  </main>
</template>
