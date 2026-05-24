<script setup>
import { computed } from 'vue';

const DEFAULT_COLORS = {
  background: '#ffffff',
  primary: '#000000',
  secondary: '#888888',
};

const props = defineProps({
  showGrid: { type: Boolean, default: true },
  idPrefix: { type: String, required: true },
  colors: { type: Object, default: () => ({}) },
  svgWidth: { type: Number, default: 240 },
  svgHeight: { type: Number, default: 180 },
  /** full：完整 logo；primary：僅黑色圖層；secondary：僅灰色圖層 */
  layer: {
    type: String,
    default: 'full',
    validator: (v) => ['full', 'primary', 'secondary'].includes(v),
  },
});

const c = computed(() => ({ ...DEFAULT_COLORS, ...props.colors }));

const showPrimary = computed(() => props.layer === 'full' || props.layer === 'primary');
const showSecondary = computed(() => props.layer === 'full' || props.layer === 'secondary');

const svgStyle = computed(() => ({
  width: `${props.svgWidth}px`,
  height: `${props.svgHeight}px`,
  display: 'block',
  flexShrink: 0,
}));
</script>

<template>
  <svg viewBox="0 0 240 180" xmlns="http://www.w3.org/2000/svg" :style="svgStyle">
    <rect x="0" y="0" width="240" height="160" :fill="c.background"/>
    <!-- 格 1／2／3／4／6：弧線 -->
    <path v-if="showPrimary" d="M 20 80 A 60 60 0 0 1 80 20" fill="none" :stroke="c.primary" stroke-width="40"/>
    <path v-if="showPrimary" d="M 80 20 A 60 60 0 0 1 140 80" fill="none" :stroke="c.primary" stroke-width="40"/>
    <path v-if="showSecondary" d="M 100 80 A 60 60 0 0 1 160 20" fill="none" :stroke="c.secondary" stroke-width="40"/>
    <path v-if="showSecondary" d="M 160 20 A 60 60 0 0 1 220 80" fill="none" :stroke="c.secondary" stroke-width="40"/>
    <path v-if="showPrimary" d="M 20 80 A 60 60 0 0 0 80 140" fill="none" :stroke="c.primary" stroke-width="40"/>
    <path v-if="showSecondary" d="M 220 80 A 60 60 0 0 1 160 140" fill="none" :stroke="c.secondary" stroke-width="40"/>
    <defs>
      <clipPath :id="`${idPrefix}-clip-51`"><rect x="80"  y="80"  width="40" height="40"/></clipPath>
      <clipPath :id="`${idPrefix}-clip-52`"><rect x="120" y="80"  width="40" height="40"/></clipPath>
      <clipPath :id="`${idPrefix}-clip-53`"><rect x="80"  y="120" width="40" height="40"/></clipPath>
      <clipPath :id="`${idPrefix}-clip-54`"><rect x="120" y="120" width="40" height="40"/></clipPath>
    </defs>
    <!-- 51–54 -->
    <g v-if="showSecondary" :clip-path="`url(#${idPrefix}-clip-51)`">
      <path d="M 80 120 A 40 40 0 0 0 120 80 L 80 80 Z" :fill="c.secondary"/>
    </g>
    <g v-if="showPrimary" :clip-path="`url(#${idPrefix}-clip-52)`">
      <path d="M 160 120 A 40 40 0 0 1 120 80 L 160 80 Z" :fill="c.primary"/>
    </g>
    <g v-if="showSecondary" :clip-path="`url(#${idPrefix}-clip-53)`">
      <path d="M 80 120 A 40 40 0 0 1 120 160 L 80 160 Z" :fill="c.secondary"/>
    </g>
    <g v-if="showPrimary" :clip-path="`url(#${idPrefix}-clip-54)`">
      <path d="M 160 120 A 40 40 0 0 0 120 160 L 160 160 Z" :fill="c.primary"/>
    </g>
    <rect v-if="showSecondary" x="200" y="80"  width="40" height="80" :fill="c.secondary"/>
    <!-- 延伸列 71／72／81 -->
    <rect v-if="showSecondary" x="80"  y="160" width="40" height="20" :fill="c.secondary"/>
    <rect v-if="showPrimary" x="120" y="160" width="40" height="20" :fill="c.primary"/>
    <rect v-if="showSecondary" x="200" y="160" width="40" height="20" :fill="c.secondary"/>
    <template v-if="showGrid">
      <rect x="0" y="0" width="240" height="160" fill="none" stroke="#b0b0b0" stroke-width="1"/>
      <rect x="80"  y="160" width="40" height="20" fill="none" stroke="#b0b0b0" stroke-width="1"/>
      <rect x="120" y="160" width="40" height="20" fill="none" stroke="#b0b0b0" stroke-width="1"/>
      <rect x="200" y="160" width="40" height="20" fill="none" stroke="#b0b0b0" stroke-width="1"/>
      <line x1="80"  y1="0" x2="80"  y2="160" stroke="#b0b0b0" stroke-width="1"/>
      <line x1="160" y1="0" x2="160" y2="160" stroke="#b0b0b0" stroke-width="1"/>
      <line x1="0" y1="80" x2="240" y2="80" stroke="#b0b0b0" stroke-width="1"/>
      <line x1="120" y1="80"  x2="120" y2="160" stroke="#b0b0b0" stroke-width="1"/>
      <line x1="80"  y1="120" x2="160" y2="120" stroke="#b0b0b0" stroke-width="1"/>
      <line x1="200" y1="80" x2="200" y2="160" stroke="#b0b0b0" stroke-width="1"/>
      <line x1="120" y1="160" x2="120" y2="180" stroke="#b0b0b0" stroke-width="1"/>
    </template>
    <g v-if="showGrid" pointer-events="none">
      <text x="40"  y="40"  text-anchor="middle" dominant-baseline="central" font-size="20" fill="#0000ff">1</text>
      <text x="120" y="40"  text-anchor="middle" dominant-baseline="central" font-size="20" fill="#0000ff">2</text>
      <text x="200" y="40"  text-anchor="middle" dominant-baseline="central" font-size="20" fill="#0000ff">3</text>
      <text x="40"  y="120" text-anchor="middle" dominant-baseline="central" font-size="20" fill="#0000ff">4</text>
      <text x="100" y="100" text-anchor="middle" dominant-baseline="central" font-size="13" fill="#0000ff">51</text>
      <text x="140" y="100" text-anchor="middle" dominant-baseline="central" font-size="13" fill="#0000ff">52</text>
      <text x="100" y="140" text-anchor="middle" dominant-baseline="central" font-size="13" fill="#0000ff">53</text>
      <text x="140" y="140" text-anchor="middle" dominant-baseline="central" font-size="13" fill="#0000ff">54</text>
      <text x="180" y="120" text-anchor="middle" dominant-baseline="central" font-size="13" fill="#0000ff">61</text>
      <text x="220" y="120" text-anchor="middle" dominant-baseline="central" font-size="13" fill="#0000ff">62</text>
      <text x="100" y="170" text-anchor="middle" dominant-baseline="central" font-size="10" fill="#0000ff">71</text>
      <text x="140" y="170" text-anchor="middle" dominant-baseline="central" font-size="10" fill="#0000ff">72</text>
      <text x="220" y="170" text-anchor="middle" dominant-baseline="central" font-size="10" fill="#0000ff">81</text>
    </g>
  </svg>
</template>
