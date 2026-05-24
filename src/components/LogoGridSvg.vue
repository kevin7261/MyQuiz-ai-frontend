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
  /**
   * true：04 分層格網模式
   * - 51–54 合併為格 5；61–62 合併為格 6
   * - 黑：格 5 畫 1/4 弧（與 1、2、4 成圓）；灰：格 5 畫 1/4 弧（與 2、3、6 成圓）
   */
  mergeCell5: { type: Boolean, default: false },
});

const c = computed(() => ({ ...DEFAULT_COLORS, ...props.colors }));

const showPrimary = computed(() => props.layer === 'full' || props.layer === 'primary');
const showSecondary = computed(() => props.layer === 'full' || props.layer === 'secondary');
const showCells5154 = computed(() => !props.mergeCell5);

/** 04 分層：僅有圖形的格線與重新編號 */
const PRIMARY_SPLIT_GRID = [
  { x: 0, y: 0, w: 80, h: 80, label: '1', fontSize: 20 },
  { x: 80, y: 0, w: 80, h: 80, label: '2', fontSize: 20 },
  { x: 0, y: 80, w: 80, h: 80, label: '3', fontSize: 20 },
  { x: 80, y: 80, w: 80, h: 80, label: '4', fontSize: 20 },
  { x: 120, y: 160, w: 40, h: 20, label: '5', fontSize: 10 },
];

const SECONDARY_SPLIT_GRID = [
  { x: 80, y: 0, w: 80, h: 80, label: '1', fontSize: 20 },
  { x: 160, y: 0, w: 80, h: 80, label: '2', fontSize: 20 },
  { x: 80, y: 80, w: 80, h: 80, label: '3', fontSize: 20 },
  { x: 160, y: 80, w: 80, h: 80, label: '4', fontSize: 20 },
  { x: 80, y: 160, w: 40, h: 20, label: '5', fontSize: 10 },
  { x: 200, y: 160, w: 40, h: 20, label: '6', fontSize: 10 },
];

const splitLayerGridCells = computed(() => {
  if (!props.mergeCell5 || props.layer === 'full') return [];
  const cells = props.layer === 'primary' ? PRIMARY_SPLIT_GRID : SECONDARY_SPLIT_GRID;
  return cells.map((cell) => ({
    ...cell,
    cx: cell.x + cell.w / 2,
    cy: cell.y + cell.h / 2,
  }));
});

const useSplitLayerGrid = computed(
  () => props.mergeCell5 && props.layer !== 'full' && splitLayerGridCells.value.length > 0,
);

const svgStyle = computed(() => ({
  width: `${props.svgWidth}px`,
  height: `${props.svgHeight}px`,
  display: 'block',
  flexShrink: 0,
}));
</script>

<template>
  <svg viewBox="0 0 240 180" xmlns="http://www.w3.org/2000/svg" :style="svgStyle">
    <defs>
      <clipPath v-if="mergeCell5" :id="`${idPrefix}-clip-outside-5`">
        <path
          fill-rule="evenodd"
          d="M 0 0 H 240 V 160 H 0 Z M 80 80 H 160 V 160 H 80 Z"
        />
      </clipPath>
      <clipPath v-if="mergeCell5" :id="`${idPrefix}-clip-cell-5`">
        <rect x="80" y="80" width="80" height="80"/>
      </clipPath>
      <clipPath :id="`${idPrefix}-clip-51`"><rect x="80"  y="80"  width="40" height="40"/></clipPath>
      <clipPath :id="`${idPrefix}-clip-52`"><rect x="120" y="80"  width="40" height="40"/></clipPath>
      <clipPath :id="`${idPrefix}-clip-53`"><rect x="80"  y="120" width="40" height="40"/></clipPath>
      <clipPath :id="`${idPrefix}-clip-54`"><rect x="120" y="120" width="40" height="40"/></clipPath>
    </defs>
    <rect x="0" y="0" width="240" height="160" :fill="c.background"/>
    <!-- 04 分層格網：格 5／6 合併，格 5 各畫 1/4 弧成圓 -->
    <template v-if="mergeCell5">
      <g :clip-path="`url(#${idPrefix}-clip-outside-5)`">
        <!-- 黑：1、2、4 -->
        <path v-if="showPrimary" d="M 20 80 A 60 60 0 0 1 80 20" fill="none" :stroke="c.primary" stroke-width="40"/>
        <path v-if="showPrimary" d="M 80 20 A 60 60 0 0 1 140 80" fill="none" :stroke="c.primary" stroke-width="40"/>
        <path v-if="showPrimary" d="M 20 80 A 60 60 0 0 0 80 140" fill="none" :stroke="c.primary" stroke-width="40"/>
        <!-- 灰：2、3、6 -->
        <path v-if="showSecondary" d="M 100 80 A 60 60 0 0 1 160 20" fill="none" :stroke="c.secondary" stroke-width="40"/>
        <path v-if="showSecondary" d="M 160 20 A 60 60 0 0 1 220 80" fill="none" :stroke="c.secondary" stroke-width="40"/>
        <path v-if="showSecondary" d="M 220 80 A 60 60 0 0 1 160 140" fill="none" :stroke="c.secondary" stroke-width="40"/>
        <rect v-if="showSecondary" x="200" y="80" width="40" height="80" :fill="c.secondary"/>
      </g>
      <g :clip-path="`url(#${idPrefix}-clip-cell-5)`">
        <!-- 黑：格 5 與 1、2、4 成圓（圓心 80,80） -->
        <path
          v-if="showPrimary"
          d="M 140 80 A 60 60 0 0 1 80 140"
          fill="none"
          :stroke="c.primary"
          stroke-width="40"
        />
        <!-- 黑：格 5 右側直線（同灰格 6 右側） -->
        <rect v-if="showPrimary" x="120" y="80" width="40" height="80" :fill="c.primary"/>
        <!-- 灰：格 5 為格 6 弧線左右鏡像（對稱軸 x=160），與 2、3、6 成圓 -->
        <path
          v-if="showSecondary"
          d="M 100 80 A 60 60 0 0 0 160 140"
          fill="none"
          :stroke="c.secondary"
          stroke-width="40"
        />
        <!-- 灰：格 5 左側直線（格 6 右側直線左右翻轉） -->
        <rect v-if="showSecondary" x="80" y="80" width="40" height="80" :fill="c.secondary"/>
      </g>
      <!-- 延伸列底（不受格 5 裁切影響） -->
      <rect x="0" y="160" width="240" height="20" :fill="c.background"/>
      <rect v-if="showSecondary" x="80" y="160" width="40" height="20" :fill="c.secondary"/>
      <rect v-if="showPrimary" x="120" y="160" width="40" height="20" :fill="c.primary"/>
      <rect v-if="showSecondary" x="200" y="160" width="40" height="20" :fill="c.secondary"/>
    </template>
    <g v-else>
      <!-- 格 1／2／3／4／6：弧線 -->
      <path v-if="showPrimary" d="M 20 80 A 60 60 0 0 1 80 20" fill="none" :stroke="c.primary" stroke-width="40"/>
      <path v-if="showPrimary" d="M 80 20 A 60 60 0 0 1 140 80" fill="none" :stroke="c.primary" stroke-width="40"/>
      <path v-if="showSecondary" d="M 100 80 A 60 60 0 0 1 160 20" fill="none" :stroke="c.secondary" stroke-width="40"/>
      <path v-if="showSecondary" d="M 160 20 A 60 60 0 0 1 220 80" fill="none" :stroke="c.secondary" stroke-width="40"/>
      <path v-if="showPrimary" d="M 20 80 A 60 60 0 0 0 80 140" fill="none" :stroke="c.primary" stroke-width="40"/>
      <path v-if="showSecondary" d="M 220 80 A 60 60 0 0 1 160 140" fill="none" :stroke="c.secondary" stroke-width="40"/>
      <!-- 51–54 -->
      <g v-if="showCells5154 && showSecondary" :clip-path="`url(#${idPrefix}-clip-51)`">
        <path d="M 80 120 A 40 40 0 0 0 120 80 L 80 80 Z" :fill="c.secondary"/>
      </g>
      <g v-if="showCells5154 && showPrimary" :clip-path="`url(#${idPrefix}-clip-52)`">
        <path d="M 160 120 A 40 40 0 0 1 120 80 L 160 80 Z" :fill="c.primary"/>
      </g>
      <g v-if="showCells5154 && showSecondary" :clip-path="`url(#${idPrefix}-clip-53)`">
        <path d="M 80 120 A 40 40 0 0 1 120 160 L 80 160 Z" :fill="c.secondary"/>
      </g>
      <g v-if="showCells5154 && showPrimary" :clip-path="`url(#${idPrefix}-clip-54)`">
        <path d="M 160 120 A 40 40 0 0 0 120 160 L 160 160 Z" :fill="c.primary"/>
      </g>
      <rect v-if="showSecondary" x="200" y="80"  width="40" height="80" :fill="c.secondary"/>
      <!-- 延伸列 71／72／81 -->
      <rect v-if="showSecondary" x="80"  y="160" width="40" height="20" :fill="c.secondary"/>
      <rect v-if="showPrimary" x="120" y="160" width="40" height="20" :fill="c.primary"/>
      <rect v-if="showSecondary" x="200" y="160" width="40" height="20" :fill="c.secondary"/>
    </g>
    <!-- 04 分層：僅畫有圖形的格 -->
    <template v-if="showGrid && useSplitLayerGrid">
      <rect
        v-for="cell in splitLayerGridCells"
        :key="`grid-${cell.label}`"
        :x="cell.x"
        :y="cell.y"
        :width="cell.w"
        :height="cell.h"
        fill="none"
        stroke="#b0b0b0"
        stroke-width="1"
      />
    </template>
    <template v-else-if="showGrid">
      <rect x="0" y="0" width="240" height="160" fill="none" stroke="#b0b0b0" stroke-width="1"/>
      <rect x="80"  y="160" width="40" height="20" fill="none" stroke="#b0b0b0" stroke-width="1"/>
      <rect x="120" y="160" width="40" height="20" fill="none" stroke="#b0b0b0" stroke-width="1"/>
      <rect x="200" y="160" width="40" height="20" fill="none" stroke="#b0b0b0" stroke-width="1"/>
      <line x1="80"  y1="0" x2="80"  y2="160" stroke="#b0b0b0" stroke-width="1"/>
      <line x1="160" y1="0" x2="160" y2="160" stroke="#b0b0b0" stroke-width="1"/>
      <line x1="0" y1="80" x2="240" y2="80" stroke="#b0b0b0" stroke-width="1"/>
      <line v-if="!mergeCell5" x1="120" y1="80"  x2="120" y2="160" stroke="#b0b0b0" stroke-width="1"/>
      <line v-if="!mergeCell5" x1="80"  y1="120" x2="160" y2="120" stroke="#b0b0b0" stroke-width="1"/>
      <line v-if="!mergeCell5" x1="200" y1="80" x2="200" y2="160" stroke="#b0b0b0" stroke-width="1"/>
      <line x1="120" y1="160" x2="120" y2="180" stroke="#b0b0b0" stroke-width="1"/>
    </template>
    <g v-if="showGrid" pointer-events="none">
      <template v-if="useSplitLayerGrid">
        <text
          v-for="cell in splitLayerGridCells"
          :key="`label-${cell.label}`"
          :x="cell.cx"
          :y="cell.cy"
          text-anchor="middle"
          dominant-baseline="central"
          :font-size="cell.fontSize"
          fill="#0000ff"
        >{{ cell.label }}</text>
      </template>
      <template v-else>
        <text x="40"  y="40"  text-anchor="middle" dominant-baseline="central" font-size="20" fill="#0000ff">1</text>
        <text x="120" y="40"  text-anchor="middle" dominant-baseline="central" font-size="20" fill="#0000ff">2</text>
        <text x="200" y="40"  text-anchor="middle" dominant-baseline="central" font-size="20" fill="#0000ff">3</text>
        <text x="40"  y="120" text-anchor="middle" dominant-baseline="central" font-size="20" fill="#0000ff">4</text>
        <template v-if="mergeCell5">
          <text x="120" y="120" text-anchor="middle" dominant-baseline="central" font-size="20" fill="#0000ff">5</text>
        </template>
        <template v-else>
          <text x="100" y="100" text-anchor="middle" dominant-baseline="central" font-size="13" fill="#0000ff">51</text>
          <text x="140" y="100" text-anchor="middle" dominant-baseline="central" font-size="13" fill="#0000ff">52</text>
          <text x="100" y="140" text-anchor="middle" dominant-baseline="central" font-size="13" fill="#0000ff">53</text>
          <text x="140" y="140" text-anchor="middle" dominant-baseline="central" font-size="13" fill="#0000ff">54</text>
        </template>
        <template v-if="mergeCell5">
          <text x="200" y="120" text-anchor="middle" dominant-baseline="central" font-size="20" fill="#0000ff">6</text>
        </template>
        <template v-else>
          <text x="180" y="120" text-anchor="middle" dominant-baseline="central" font-size="13" fill="#0000ff">61</text>
          <text x="220" y="120" text-anchor="middle" dominant-baseline="central" font-size="13" fill="#0000ff">62</text>
        </template>
        <text x="100" y="170" text-anchor="middle" dominant-baseline="central" font-size="10" fill="#0000ff">71</text>
        <text x="140" y="170" text-anchor="middle" dominant-baseline="central" font-size="10" fill="#0000ff">72</text>
        <text x="220" y="170" text-anchor="middle" dominant-baseline="central" font-size="10" fill="#0000ff">81</text>
      </template>
    </g>
  </svg>
</template>
