<script setup>
import { computed } from 'vue';

const GRID = 2;
const CELL = 40;
const VIEW = GRID * CELL;

const props = defineProps({
  idPrefix: { type: String, required: true },
  /** primary：Q 黑色；secondary：A 灰色 */
  layer: {
    type: String,
    required: true,
    validator: (v) => ['primary', 'secondary'].includes(v),
  },
  showGrid: { type: Boolean, default: true },
  colors: { type: Object, default: () => ({}) },
  svgWidth: { type: Number, default: 80 },
});

const fillColor = computed(() => {
  const defaults = { primary: '#000000', secondary: '#888888', background: '#ffffff' };
  const c = { ...defaults, ...props.colors };
  return props.layer === 'primary' ? c.primary : c.secondary;
});

const background = computed(() => props.colors?.background ?? '#ffffff');

/**
 * 2×2 各格一個 1/4 圓（同 logo 格 51–54），合起來中央一個白菱形
 * 格序：1 左上、2 右上、3 左下、4 右下
 */
const cells = [
  { key: '1', x: 0, y: 0, d: `M 0 ${CELL} A ${CELL} ${CELL} 0 0 0 ${CELL} 0 L 0 0 Z` },
  { key: '2', x: CELL, y: 0, d: `M ${VIEW} ${CELL} A ${CELL} ${CELL} 0 0 1 ${CELL} 0 L ${VIEW} 0 Z` },
  { key: '3', x: 0, y: CELL, d: `M 0 ${CELL} A ${CELL} ${CELL} 0 0 1 ${CELL} ${VIEW} L 0 ${VIEW} Z` },
  {
    key: '4',
    x: CELL,
    y: CELL,
    d: `M ${VIEW} ${CELL} A ${CELL} ${CELL} 0 0 0 ${CELL} ${VIEW} L ${VIEW} ${VIEW} Z`,
  },
];

const svgStyle = computed(() => ({
  width: `${props.svgWidth}px`,
  height: `${props.svgWidth}px`,
  display: 'block',
  flexShrink: 0,
}));
</script>

<template>
  <svg :viewBox="`0 0 ${VIEW} ${VIEW}`" xmlns="http://www.w3.org/2000/svg" :style="svgStyle">
    <rect x="0" y="0" :width="VIEW" :height="VIEW" :fill="background"/>
    <path
      v-for="cell in cells"
      :key="`${idPrefix}-${cell.key}`"
      :d="cell.d"
      :fill="fillColor"
    />
    <template v-if="showGrid">
      <line x1="0" :y1="CELL" :x2="VIEW" :y2="CELL" stroke="#b0b0b0" stroke-width="1"/>
      <line :x1="CELL" y1="0" :x2="CELL" :y2="VIEW" stroke="#b0b0b0" stroke-width="1"/>
      <rect x="0" y="0" :width="VIEW" :height="VIEW" fill="none" stroke="#b0b0b0" stroke-width="1"/>
    </template>
    <g v-if="showGrid" pointer-events="none">
      <text
        v-for="cell in cells"
        :key="`label-${cell.key}`"
        :x="cell.x + CELL / 2"
        :y="cell.y + CELL / 2"
        text-anchor="middle"
        dominant-baseline="central"
        font-size="13"
        fill="#0000ff"
      >{{ cell.key }}</text>
    </g>
  </svg>
</template>
