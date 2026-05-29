<script setup>
import { computed, shallowRef, watch } from 'vue';
import LogoCenterMark from './LogoCenterMark.vue';
import { createRandomLogoGradientCss } from '../utils/logoDiamondGradient.js';

const props = defineProps({
  idPrefix: { type: String, required: true },
  /** generate＝偏藍綠（產生題目）；grade＝偏紅橘（開始批改） */
  tone: {
    type: String,
    required: true,
    validator: (v) => ['generate', 'grade'].includes(v),
  },
  /** default＝原稿頁；work3＝exam_3／create-exam-bank_3（開始出題藍色、開始批改紅色） */
  gradientBias: {
    type: String,
    default: 'default',
    validator: (v) => ['default', 'work3'].includes(v),
  },
  disabled: { type: Boolean, default: false },
  ariaBusy: { type: Boolean, default: false },
  ariaLabel: { type: String, default: '' },
  title: { type: String, default: '' },
  extraClass: { type: String, default: '' },
});

defineEmits(['click']);

/** 每顆按鈕各一組隨機線性漸層（色域依 tone；僅 linear-gradient） */
const buttonGradientCss = shallowRef(
  createRandomLogoGradientCss({
    tone: props.tone,
    bias: props.gradientBias,
    linearOnly: true,
  }),
);

watch(
  () => [props.tone, props.gradientBias],
  ([tone, bias]) => {
    buttonGradientCss.value = createRandomLogoGradientCss({
      tone,
      bias,
      linearOnly: true,
    });
  },
);

const buttonStyle = computed(() => ({
  background: buttonGradientCss.value,
}));
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
