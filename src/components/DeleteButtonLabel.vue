<script setup>
defineProps({
  label: { type: String, required: true },
});
</script>

<template>
  <i class="fa-solid fa-xmark flex-shrink-0" aria-hidden="true" />
  <span>{{ label }}</span>
</template>
