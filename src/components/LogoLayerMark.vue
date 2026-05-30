<script setup>
import { computed } from 'vue';
import LogoGridSvg from './LogoGridSvg.vue';

let logoLayerMarkSeq = 0;

const props = defineProps({
  /** primary＝Q（gray-3）；secondary＝A（gray-2） */
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

const resolvedIdPrefix = computed(() => {
  if (String(props.idPrefix ?? '').trim()) return String(props.idPrefix).trim();
  return autoIdPrefix;
});

const wrapStyle = computed(() => ({
  width: `${props.sizePt}pt`,
}));

/** Q＝gray-3；A＝gray-2 */
const logoColors = computed(() => ({
  background: 'transparent',
  primary: 'var(--my-color-gray-3)',
  secondary: 'var(--my-color-gray-2)',
}));
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
      :colors="logoColors"
      :id-prefix="resolvedIdPrefix"
    />
  </span>
</template>

<style scoped>
.logo-layer-mark {
  line-height: 0;
  display: inline-flex;
  flex-shrink: 0;
}

.logo-layer-mark :deep(svg) {
  width: 100% !important;
  height: auto !important;
  display: block;
}
</style>
