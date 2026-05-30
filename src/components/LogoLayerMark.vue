<script setup>
import { computed } from 'vue';
import LogoGridSvg from './LogoGridSvg.vue';
import { useSystemHeaderLogoGradients } from '../composables/useSystemHeaderLogoGradients.js';

let logoLayerMarkSeq = 0;

const props = defineProps({
  /** primary＝Q（開始出題漸層）；secondary＝A（開始批改漸層） */
  layer: {
    type: String,
    required: true,
    validator: (v) => ['primary', 'secondary'].includes(v),
  },
  /** logo 寬度（pt）；高度依 viewBox 比例 */
  sizePt: { type: Number, default: 24 },
  idPrefix: { type: String, default: '' },
});

logoLayerMarkSeq += 1;
const autoIdPrefix = `logo-layer-mark-${logoLayerMarkSeq}`;

const { generateButtonDiamondGradient, gradeButtonDiamondGradient } =
  useSystemHeaderLogoGradients();

const resolvedIdPrefix = computed(() => {
  if (String(props.idPrefix ?? '').trim()) return String(props.idPrefix).trim();
  return autoIdPrefix;
});

const wrapStyle = computed(() => ({
  width: `${props.sizePt}pt`,
}));

const layerGradient = computed(() =>
  props.layer === 'primary'
    ? generateButtonDiamondGradient.value
    : gradeButtonDiamondGradient.value,
);

const useLayerGradient = computed(() => !!layerGradient.value?.stops?.length);

const logoColors = computed(() => {
  if (!useLayerGradient.value) {
    return {
      background: 'transparent',
      primary: 'var(--my-color-gray-2)',
      secondary: 'var(--my-color-gray-2)',
    };
  }
  if (props.layer === 'primary') {
    return {
      background: 'transparent',
      primaryGradient: layerGradient.value,
    };
  }
  return {
    background: 'transparent',
    secondaryGradient: layerGradient.value,
  };
});
</script>

<template>
  <span
    class="logo-layer-mark d-inline-flex flex-shrink-0 align-items-start"
    :style="wrapStyle"
    aria-hidden="true"
  >
    <LogoGridSvg
      :show-grid="false"
      :show-background="false"
      merge-cell5
      :layer="layer"
      :unified-primary-gradient="useLayerGradient"
      :colors="logoColors"
      :id-prefix="resolvedIdPrefix"
    />
  </span>
</template>

<style scoped src="./LogoLayerMark.css"></style>
