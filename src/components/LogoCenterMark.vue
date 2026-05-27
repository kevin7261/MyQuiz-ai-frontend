<script setup>
import { computed } from 'vue';
import LogoGridSvg from './LogoGridSvg.vue';

let logoCenterMarkSeq = 0;

const props = defineProps({
  /** 圖示高度（pt）；51–54 為正方形 */
  sizePt: { type: Number, default: 16 },
  /** 黑底按鈕：灰／白透明、菱形白；white-diamond-only：僅白菱形；default 為淺底黑灰 logo */
  variant: {
    type: String,
    default: 'on-dark-button',
    validator: (v) => ['on-dark-button', 'white-diamond-only', 'default'].includes(v),
  },
  idPrefix: { type: String, default: '' },
});

logoCenterMarkSeq += 1;
const autoIdPrefix = `logo-center-mark-${logoCenterMarkSeq}`;

const resolvedIdPrefix = computed(() => {
  if (String(props.idPrefix ?? '').trim()) return String(props.idPrefix).trim();
  return autoIdPrefix;
});

const diamondOnly = computed(() => props.variant === 'white-diamond-only');

const markColors = computed(() => {
  if (props.variant === 'on-dark-button' || props.variant === 'white-diamond-only') {
    return {
      /** 原 logo 白（52＋54）→ 透明 */
      primary: 'transparent',
      /** 原 logo 灰（51＋53）→ 透明 */
      secondary: 'transparent',
      /** 原 logo 漸層菱形 → 白 */
      background: 'var(--my-color-white)',
    };
  }
  return {
    primary: 'var(--my-color-black)',
    secondary: 'var(--my-color-gray-1)',
    background: 'var(--my-color-white)',
  };
});

const wrapStyle = computed(() => ({
  height: `${props.sizePt}pt`,
  width: `${props.sizePt}pt`,
}));
</script>

<template>
  <span
    class="logo-center-mark d-inline-flex flex-shrink-0 align-items-center"
    :style="wrapStyle"
    aria-hidden="true"
  >
    <LogoGridSvg
      center-quad-only
      :diamond-only="diamondOnly"
      :show-grid="false"
      :show-background="false"
      size-to-container
      :id-prefix="resolvedIdPrefix"
      :colors="markColors"
    />
  </span>
</template>

<style scoped>
.logo-center-mark {
  line-height: 0;
}
</style>
