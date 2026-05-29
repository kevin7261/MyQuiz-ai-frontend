<script setup>
import { computed, shallowRef, watch } from 'vue';
import LogoCenterMark from './LogoCenterMark.vue';
import { useSystemHeaderLogoGradients } from '../composables/useSystemHeaderLogoGradients.js';
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

const { generateButtonGradientCss, gradeButtonGradientCss } = useSystemHeaderLogoGradients();

function resolveButtonGradientCss() {
  if (props.gradientBias === 'work3') {
    return props.tone === 'generate'
      ? generateButtonGradientCss.value
      : gradeButtonGradientCss.value;
  }
  return createRandomLogoGradientCss({
    tone: props.tone,
    bias: props.gradientBias,
    linearOnly: true,
  });
}

/** work3：與系統 header 左上左右半漸層同色盤；其餘為各按鈕獨立隨機漸層 */
const buttonGradientCss = shallowRef(resolveButtonGradientCss());

watch(
  () => [
    props.tone,
    props.gradientBias,
    generateButtonGradientCss.value,
    gradeButtonGradientCss.value,
  ],
  () => {
    buttonGradientCss.value = resolveButtonGradientCss();
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
