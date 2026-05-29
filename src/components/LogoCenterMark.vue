<script setup>
import { computed } from 'vue';
import LogoGridSvg from './LogoGridSvg.vue';

let logoCenterMarkSeq = 0;

const props = defineProps({
  /** 圖示寬度（pt）；51–54 為正方形；含 71–72 時高為 sizePt × 5/4 */
  sizePt: { type: Number, default: 16 },
  /** true：含 71–72 延伸列（80×100 格網，高 = 64pt + 16pt 當 sizePt = 64） */
  includeExtensionRow: { type: Boolean, default: false },
  /** true：寬高 100% 撐滿外層容器 */
  sizeToContainer: { type: Boolean, default: false },
  /** 黑底按鈕：灰／白透明、菱形白；white-diamond-only：僅白菱形；default 為淺底黑灰 logo */
  variant: {
    type: String,
    default: 'on-dark-button',
    validator: (v) => ['on-dark-button', 'white-diamond-only', 'default', 'match-text'].includes(v),
  },
  idPrefix: { type: String, default: '' },
  /** 白菱形漸層（黑／灰區透明）；與按鈕描邊同色盤時傳入 */
  diamondGradient: { type: Object, default: null },
});

logoCenterMarkSeq += 1;
const autoIdPrefix = `logo-center-mark-${logoCenterMarkSeq}`;

const resolvedIdPrefix = computed(() => {
  if (String(props.idPrefix ?? '').trim()) return String(props.idPrefix).trim();
  return autoIdPrefix;
});

const diamondOnly = computed(() => props.variant === 'white-diamond-only');

const markColors = computed(() => {
  if (props.variant === 'match-text') {
    return {
      primary: 'var(--my-color-black)',
      secondary: 'var(--my-color-black)',
      /** 避免透明底走 cutout 分支（菱形會誤用 primary 填色） */
      background: 'var(--my-color-white)',
      diamondFill: 'var(--my-color-black)',
    };
  }
  if (props.diamondGradient) {
    return {
      primary: 'transparent',
      secondary: 'transparent',
      background: 'transparent',
      backgroundGradient: props.diamondGradient,
    };
  }
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

const wrapStyle = computed(() => {
  if (props.sizeToContainer) {
    return { width: '100%', height: '100%' };
  }
  if (props.includeExtensionRow) {
    return {
      width: `${props.sizePt}pt`,
      height: `${props.sizePt * 5 / 4}pt`,
    };
  }
  return {
    height: `${props.sizePt}pt`,
    width: `${props.sizePt}pt`,
  };
});
</script>

<template>
  <span
    class="logo-center-mark d-inline-flex flex-shrink-0 align-items-center"
    :class="{ 'logo-center-mark--match-text': variant === 'match-text' }"
    :style="wrapStyle"
    aria-hidden="true"
  >
    <LogoGridSvg
      :center-cells-only="includeExtensionRow"
      :center-quad-only="!includeExtensionRow"
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

.logo-center-mark--match-text {
  color: inherit;
}
</style>
