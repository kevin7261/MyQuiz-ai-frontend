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
  /** 指定漸層 CSS（與同列規則 tab icon 共用時由父層傳入） */
  gradientCss: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  ariaBusy: { type: Boolean, default: false },
  ariaLabel: { type: String, default: '' },
  title: { type: String, default: '' },
  extraClass: { type: String, default: '' },
});

defineEmits(['click']);

const { generateButtonGradientCss, gradeButtonGradientCss } = useSystemHeaderLogoGradients();

/** default 時各按鈕實例固定一組漸層（watch 不重抽） */
const stableLocalGradientCss = shallowRef('');

function resolveButtonGradientCss() {
  const preset = String(props.gradientCss ?? '').trim();
  if (preset) return preset;
  if (props.gradientBias === 'work3') {
    return props.tone === 'generate'
      ? generateButtonGradientCss.value
      : gradeButtonGradientCss.value;
  }
  if (!stableLocalGradientCss.value) {
    stableLocalGradientCss.value = createRandomLogoGradientCss({
      tone: props.tone,
      bias: props.gradientBias,
      linearOnly: true,
    });
  }
  return stableLocalGradientCss.value;
}

/** work3／gradientCss：與全站 header 同色盤；default：各實例固定一組 */
const buttonGradientCss = shallowRef(resolveButtonGradientCss());

watch(
  () => [
    props.tone,
    props.gradientBias,
    props.gradientCss,
    generateButtonGradientCss.value,
    gradeButtonGradientCss.value,
  ],
  (_next, prev) => {
    if (prev && (prev[0] !== props.tone || prev[1] !== props.gradientBias)) {
      stableLocalGradientCss.value = '';
    }
    if (props.gradientBias === 'work3' || String(props.gradientCss ?? '').trim()) {
      buttonGradientCss.value = resolveButtonGradientCss();
      return;
    }
    if (!stableLocalGradientCss.value) {
      stableLocalGradientCss.value = createRandomLogoGradientCss({
        tone: props.tone,
        bias: props.gradientBias,
        linearOnly: true,
      });
    }
    buttonGradientCss.value = stableLocalGradientCss.value;
  },
);

const wrapStyle = computed(() => ({
  background: buttonGradientCss.value,
}));
</script>

<template>
  <span
    class="my-logo-gradient-pill-btn-wrap d-inline-flex flex-shrink-0 rounded-pill"
    :class="{ 'my-logo-gradient-pill-btn-wrap--disabled': disabled }"
    :style="wrapStyle"
  >
    <button
      type="button"
      class="btn rounded-pill d-inline-flex justify-content-center align-items-center gap-2 flex-shrink-0 my-font-md-400 px-4 py-2 my-button-logo-gradient"
      :class="extraClass"
      :disabled="disabled"
      :aria-busy="ariaBusy"
      :aria-label="ariaLabel"
      :title="title"
      @click="$emit('click', $event)"
    >
      <LogoCenterMark :id-prefix="idPrefix" variant="gradient-diamond-only" :diamond-gradient-css="buttonGradientCss" />
      <span><slot /></span>
    </button>
  </span>
</template>

<style scoped>
.my-logo-gradient-pill-btn-wrap {
  padding: 1pt;
}
.my-logo-gradient-pill-btn-wrap--disabled {
  opacity: 0.55;
}
.my-logo-gradient-pill-btn-wrap > :deep(.btn.my-button-logo-gradient:disabled) {
  opacity: 1;
}
.my-logo-gradient-pill-btn-wrap:has(> .btn:active:not(:disabled)) {
  filter: brightness(0.92);
}
</style>
