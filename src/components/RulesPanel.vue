<script setup lang="ts">
const rules = [
  'Cada jugador tiene su propia sopa de letras con 20 apellidos escondidos.',
  'Van jugando por turnos, uno detrás del otro: tenés 30 segundos para tocar una letra que forme parte de un jugador y revelarlo. Al encontrarlo arrancan otros 30 segundos (el reloj sigue corriendo, no se detiene) para leer las pistas y elegir la correcta.',
  'Tocá la pista que le corresponde para unirlo vos mismo. Si te equivocás de letra o de pista, o se te acaba el tiempo, el turno pasa directo al siguiente jugador. ¡Si acertás la unión, también sigue el que viene!',
  'Todos arrancan en 0 puntos. Adivinar una palabra en la sopa suma 15, y unirla con su pista suma 15 más. Una letra equivocada, o dejar pasar el turno sin clickear nada, resta 10. Errar la pista después de haber encontrado la palabra resta 5. ¡Gana quien más puntos tenga al terminar!',
  'Ojo: tocar una letra que no corresponde te acerca a la eliminación — si llegás a 30 de esos errores quedás ELIMINADO automáticamente. Errar la pista no suma a este contador (aunque sí te resta puntos).',
  'El partido tiene un límite de 20 minutos en total: si nadie completó su sopa antes, corta ahí y gana quien más puntos tenga en ese momento.',
]
</script>
<template>
  <section class="rules-panel" aria-labelledby="rules-title">
    <h2 id="rules-title">Cómo se juega:</h2>
    <ol class="rules-list"><li v-for="(rule, index) in rules" :key="rule"><span class="rule-number" aria-hidden="true">{{ index + 1 }}</span><p>{{ rule }}</p></li></ol>
  </section>
</template>
