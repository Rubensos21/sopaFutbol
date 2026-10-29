<script setup lang="ts">
withDefaults(defineProps<{ name?: 'ball' | 'crown' | 'list' | 'clock' }>(), { name: 'ball' })
</script>
<template>
  <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <template v-if="name === 'ball'"><circle cx="12" cy="12" r="9.5" /><path d="m12 7 4.8 3.5-1.8 5.6H9l-1.8-5.6L12 7Zm0 0V2.5m4.8 8 4.4-1.4M15 16.1l2.8 4M9 16.1l-2.8 4m1-9.6L2.8 9.1" /></template>
    <path v-else-if="name === 'crown'" d="m3 6 5 5 4-7 4 7 5-5-2 13H5L3 6Zm2 10h14" />
    <template v-else-if="name === 'list'"><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4V2h6v2M9 9h6m-6 4h6m-6 4h4" /></template>
    <template v-else><circle cx="12" cy="13" r="8" /><path d="M9 2h6m-3 3V2m0 6v5l3 2" /></template>
  </svg>
</template>
