<script setup>
import LogoCenterMark from './LogoCenterMark.vue';
import {
  createRandomLogoDiamondGradient,
  logoDiamondGradientToCssLinear,
} from '../utils/logoDiamondGradient.js';

defineProps({
  idPrefix: { type: String, required: true },
  disabled: { type: Boolean, default: false },
  ariaBusy: { type: Boolean, default: false },
  ariaLabel: { type: String, default: '' },
  title: { type: String, default: '' },
  extraClass: { type: String, default: '' },
});

defineEmits(['click']);

/** 每顆按鈕各一組隨機漸層（與 TopView logo 菱形同色票機制） */
const buttonStyle = {
  background: logoDiamondGradientToCssLinear(createRandomLogoDiamondGradient()),
};
</script>

<template>
  <button
    type="button"
    class="btn rounded-pill d-inline-flex justify-content-center align-items-center gap-2 flex-shrink-0 my-font-md-400 px-4 py-2 my-button-logo-gradient"
    :class="extraClass"
    :style="buttonStyle"
    :disabled="disabled"
    :aria-busy="ariaBusy"
    :aria-label="ariaLabel"
    :title="title"
    @click="$emit('click', $event)"
  >
    <LogoCenterMark :id-prefix="idPrefix" variant="on-dark-button" />
    <span><slot /></span>
  </button>
</template>
