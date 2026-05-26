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
  /**
   * true：僅繪製格 51–54、71–72（中央 2×2＋下方延伸列），不含外圈弧線與格 6
   * viewBox 裁切為 80×100 區域
   */
  centerCellsOnly: { type: Boolean, default: false },
  /**
   * true：僅繪製格 51–54（中央 2×2），不含 71–72 延伸列
   * viewBox 裁切為 80×80 區域
   */
  centerQuadOnly: { type: Boolean, default: false },
  /** false 時不繪製全幅底色（頂欄等透明底場景） */
  showBackground: { type: Boolean, default: true },
  /** true：height 100%、width auto，由外層容器決定尺寸並維持 viewBox 比例 */
  sizeToContainer: { type: Boolean, default: false },
});

const c = computed(() => ({ ...DEFAULT_COLORS, ...props.colors }));

const primaryGradientId = computed(() => `${props.idPrefix}-grad-primary`);
const secondaryGradientId = computed(() => `${props.idPrefix}-grad-secondary`);
const backgroundGradientId = computed(() => `${props.idPrefix}-grad-background`);

const primaryPaint = computed(() =>
  (c.value.primaryGradient ? `url(#${primaryGradientId.value})` : c.value.primary),
);
const secondaryPaint = computed(() =>
  (c.value.secondaryGradient ? `url(#${secondaryGradientId.value})` : c.value.secondary),
);
const backgroundPaint = computed(() =>
  (c.value.backgroundGradient ? `url(#${backgroundGradientId.value})` : c.value.background),
);

const showPrimary   = computed(() => props.layer === 'full' || props.layer === 'primary');
const showSecondary = computed(() => props.layer === 'full' || props.layer === 'secondary');

/**
 * 格 5 中央白菱形（疊加於色塊之上）
 * 四邊為向內凹的 1/4 圓弧（與原 51–54 內緣弧相同，sweep=0）
 */
const CENTER_DIAMOND_PATH =
  'M 120 80 A 40 40 0 0 0 160 120 A 40 40 0 0 0 120 160 A 40 40 0 0 0 80 120 A 40 40 0 0 0 120 80 Z';

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

const useSplitLayerGrid = computed(() => splitLayerGridCells.value.length > 0);

const useCenterQuadOnly = computed(
  () => props.centerQuadOnly && !props.mergeCell5,
);

const useCenterCellsOnly = computed(
  () => props.centerCellsOnly && !props.mergeCell5 && !props.centerQuadOnly,
);

/** 51–54 區塊高度（含 71–72 延伸列時為 100） */
const centerBlockHeight = computed(() => (useCenterQuadOnly.value ? 80 : 100));

/** 中央菱形以 evenodd 挖洞（background 透明時），露出按鈕底色與四段 1/4 圓弧 */
const useDiamondCutout = computed(() => {
  const bg = String(c.value.background ?? '').trim().toLowerCase();
  return bg === 'transparent' || bg === 'none';
});

const useCenterDiamondCutout = computed(
  () => useDiamondCutout.value && (useCenterQuadOnly.value || useCenterCellsOnly.value),
);

const centerDiamondMaskId = computed(() => `${props.idPrefix}-center-diamond-mask`);

const viewBox = computed(() => {
  if (useCenterQuadOnly.value) return '80 80 80 80';
  if (useCenterCellsOnly.value) return '80 80 80 100';
  if (useSplitLayerGrid.value) {
    return props.layer === 'primary' ? '0 0 160 180' : '80 0 160 180';
  }
  return '0 0 240 180';
});

const svgStyle = computed(() => {
  if (props.sizeToContainer) {
    return {
      height: '100%',
      width: 'auto',
      display: 'block',
      flexShrink: 0,
    };
  }
  let height = props.svgHeight;
  if (useCenterQuadOnly.value) {
    height = props.svgWidth;
  } else if (useCenterCellsOnly.value) {
    height = Math.round(props.svgWidth * (100 / 80));
  } else if (useSplitLayerGrid.value) {
    height = Math.round(props.svgWidth * (180 / 160));
  }
  return {
    width: `${props.svgWidth}px`,
    height: `${height}px`,
    display: 'block',
    flexShrink: 0,
  };
});
</script>

<template>
  <svg :viewBox="viewBox" xmlns="http://www.w3.org/2000/svg" :style="svgStyle">
    <defs>
      <linearGradient
        v-if="c.primaryGradient"
        :id="primaryGradientId"
        :x1="c.primaryGradient.x1 ?? '0%'"
        :y1="c.primaryGradient.y1 ?? '0%'"
        :x2="c.primaryGradient.x2 ?? '100%'"
        :y2="c.primaryGradient.y2 ?? '100%'"
      >
        <stop
          v-for="(stop, i) in c.primaryGradient.stops"
          :key="`p-${i}`"
          :offset="stop.offset"
          :stop-color="stop.color"
        />
      </linearGradient>
      <linearGradient
        v-if="c.secondaryGradient"
        :id="secondaryGradientId"
        :x1="c.secondaryGradient.x1 ?? '0%'"
        :y1="c.secondaryGradient.y1 ?? '0%'"
        :x2="c.secondaryGradient.x2 ?? '100%'"
        :y2="c.secondaryGradient.y2 ?? '100%'"
      >
        <stop
          v-for="(stop, i) in c.secondaryGradient.stops"
          :key="`s-${i}`"
          :offset="stop.offset"
          :stop-color="stop.color"
        />
      </linearGradient>
      <linearGradient
        v-if="c.backgroundGradient"
        :id="backgroundGradientId"
        :x1="c.backgroundGradient.x1 ?? '0%'"
        :y1="c.backgroundGradient.y1 ?? '0%'"
        :x2="c.backgroundGradient.x2 ?? '0%'"
        :y2="c.backgroundGradient.y2 ?? '100%'"
      >
        <stop
          v-for="(stop, i) in c.backgroundGradient.stops"
          :key="`b-${i}`"
          :offset="stop.offset"
          :stop-color="stop.color"
        />
      </linearGradient>
      <template v-if="mergeCell5">
        <clipPath :id="`${idPrefix}-clip-outside-5`">
          <path fill-rule="evenodd" d="M 0 0 H 240 V 160 H 0 Z M 80 80 H 160 V 160 H 80 Z"/>
        </clipPath>
        <clipPath :id="`${idPrefix}-clip-cell-5`">
          <rect x="80" y="80" width="80" height="80"/>
        </clipPath>
      </template>
      <mask
        v-if="useCenterDiamondCutout"
        :id="centerDiamondMaskId"
        maskUnits="userSpaceOnUse"
      >
        <rect
          x="80"
          y="80"
          width="80"
          :height="centerBlockHeight"
          fill="white"
        />
        <path :d="CENTER_DIAMOND_PATH" fill="black" />
      </mask>
      <clipPath
        v-if="useCenterDiamondCutout"
        :id="`${idPrefix}-clip-right-half`"
      >
        <rect x="120" y="80" width="40" :height="centerBlockHeight"/>
      </clipPath>
    </defs>
    <rect
      v-if="showBackground && useCenterQuadOnly"
      x="80" y="80" width="80" height="80"
      :fill="backgroundPaint"
    />
    <rect
      v-else-if="showBackground && useCenterCellsOnly"
      x="80" y="80" width="80" height="100"
      :fill="backgroundPaint"
    />
    <rect
      v-else-if="showBackground"
      x="0" y="0" width="240" height="160"
      :fill="backgroundPaint"
    />
    <!-- mergeCell5 模式：格 5 各層畫 1/4 弧成圓 -->
    <template v-if="mergeCell5">
      <g :clip-path="`url(#${idPrefix}-clip-outside-5)`">
        <!-- 黑：弧 1、2、4 -->
        <g v-if="showPrimary">
          <path d="M 20 80 A 60 60 0 0 1 80 20"   fill="none" :stroke="primaryPaint" stroke-width="40"/>
          <path d="M 80 20 A 60 60 0 0 1 140 80"   fill="none" :stroke="primaryPaint" stroke-width="40"/>
          <path d="M 20 80 A 60 60 0 0 0 80 140"   fill="none" :stroke="primaryPaint" stroke-width="40"/>
        </g>
        <!-- 灰：弧 2、3、6 -->
        <g v-if="showSecondary">
          <path d="M 100 80 A 60 60 0 0 1 160 20"  fill="none" :stroke="secondaryPaint" stroke-width="40"/>
          <path d="M 160 20 A 60 60 0 0 1 220 80"  fill="none" :stroke="secondaryPaint" stroke-width="40"/>
          <path d="M 220 80 A 60 60 0 0 1 160 140" fill="none" :stroke="secondaryPaint" stroke-width="40"/>
        </g>
      </g>
      <g :clip-path="`url(#${idPrefix}-clip-cell-5)`">
        <!-- 黑：格 5 弧（與 1、2、4 成圓，圓心 80,80）＋右側直線 -->
        <g v-if="showPrimary">
          <path d="M 140 80 A 60 60 0 0 1 80 140" fill="none" :stroke="primaryPaint" stroke-width="40"/>
          <rect x="120" y="80" width="40" height="80" :fill="primaryPaint"/>
        </g>
        <!-- 灰：格 5 弧（與 2、3、6 成圓，對稱軸 x=160）＋左側直線 -->
        <g v-if="showSecondary">
          <path d="M 100 80 A 60 60 0 0 0 160 140" fill="none" :stroke="secondaryPaint" stroke-width="40"/>
          <rect x="80" y="80" width="40" height="80" :fill="secondaryPaint"/>
        </g>
      </g>
      <!-- 延伸列 71／72；62＋81 灰方塊 -->
      <rect v-if="showSecondary" x="80" y="160" width="40" height="20" :fill="secondaryPaint"/>
      <rect v-if="showPrimary" x="120" y="160" width="40" height="20" :fill="primaryPaint"/>
      <rect v-if="showSecondary" x="200" y="80" width="40" height="100" :fill="secondaryPaint"/>
    </template>
    <g v-else>
      <template v-if="!useCenterCellsOnly && !useCenterQuadOnly">
        <!-- 格 1／2／3／4／6：弧線 -->
        <path v-if="showPrimary" d="M 20 80 A 60 60 0 0 1 80 20" fill="none" :stroke="primaryPaint" stroke-width="40"/>
        <path v-if="showPrimary" d="M 80 20 A 60 60 0 0 1 140 80" fill="none" :stroke="primaryPaint" stroke-width="40"/>
        <path v-if="showSecondary" d="M 100 80 A 60 60 0 0 1 160 20" fill="none" :stroke="secondaryPaint" stroke-width="40"/>
        <path v-if="showSecondary" d="M 160 20 A 60 60 0 0 1 220 80" fill="none" :stroke="secondaryPaint" stroke-width="40"/>
        <path v-if="showPrimary" d="M 20 80 A 60 60 0 0 0 80 140" fill="none" :stroke="primaryPaint" stroke-width="40"/>
        <path v-if="showSecondary" d="M 220 80 A 60 60 0 0 1 160 140" fill="none" :stroke="secondaryPaint" stroke-width="40"/>
      </template>
      <!-- 透明底：左 mask 挖洞（51＋53）；右填白色菱形（52＋54） -->
      <template v-if="useCenterDiamondCutout">
        <rect
          v-if="showSecondary"
          x="80"
          y="80"
          width="40"
          :height="centerBlockHeight"
          :fill="secondaryPaint"
          :mask="`url(#${centerDiamondMaskId})`"
        />
        <path
          v-if="showPrimary"
          :d="CENTER_DIAMOND_PATH"
          :fill="primaryPaint"
          :clip-path="`url(#${idPrefix}-clip-right-half)`"
        />
      </template>
      <template v-else>
        <rect
          v-if="showSecondary"
          x="80"
          y="80"
          width="40"
          :height="centerBlockHeight"
          :fill="secondaryPaint"
        />
        <rect
          v-if="showPrimary"
          x="120"
          y="80"
          width="40"
          :height="centerBlockHeight"
          :fill="primaryPaint"
        />
        <path
          v-if="showPrimary || showSecondary"
          :d="CENTER_DIAMOND_PATH"
          :fill="backgroundPaint"
        />
      </template>
      <!-- 62＋81 灰方塊 -->
      <rect
        v-if="showSecondary && !useCenterCellsOnly && !useCenterQuadOnly"
        x="200"
        y="80"
        width="40"
        height="100"
        :fill="secondaryPaint"
      />
    </g>
    <!-- 格線 -->
    <template v-if="showGrid && useSplitLayerGrid">
      <rect
        v-for="cell in splitLayerGridCells"
        :key="`grid-${cell.label}`"
        :x="cell.x" :y="cell.y" :width="cell.w" :height="cell.h"
        fill="none" stroke="#b0b0b0" stroke-width="1"
      />
    </template>
    <template v-else-if="showGrid && useCenterQuadOnly">
      <rect x="80" y="80" width="80" height="80" fill="none" stroke="#b0b0b0" stroke-width="1"/>
      <line x1="120" y1="80" x2="120" y2="160" stroke="#b0b0b0" stroke-width="1"/>
      <line x1="80" y1="120" x2="160" y2="120" stroke="#b0b0b0" stroke-width="1"/>
    </template>
    <template v-else-if="showGrid && useCenterCellsOnly">
      <rect x="80" y="80" width="80" height="80" fill="none" stroke="#b0b0b0" stroke-width="1"/>
      <rect x="80" y="160" width="40" height="20" fill="none" stroke="#b0b0b0" stroke-width="1"/>
      <rect x="120" y="160" width="40" height="20" fill="none" stroke="#b0b0b0" stroke-width="1"/>
      <line x1="120" y1="80" x2="120" y2="160" stroke="#b0b0b0" stroke-width="1"/>
      <line x1="80" y1="120" x2="160" y2="120" stroke="#b0b0b0" stroke-width="1"/>
      <line x1="120" y1="160" x2="120" y2="180" stroke="#b0b0b0" stroke-width="1"/>
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
    <!-- 格號標籤：共用屬性提升至 <g> -->
    <g v-if="showGrid" pointer-events="none" text-anchor="middle" dominant-baseline="central" fill="#0000ff">
      <template v-if="useSplitLayerGrid">
        <text
          v-for="cell in splitLayerGridCells"
          :key="`label-${cell.label}`"
          :x="cell.cx" :y="cell.cy"
          :font-size="cell.fontSize"
        >{{ cell.label }}</text>
      </template>
      <template v-else-if="useCenterQuadOnly">
        <text x="100" y="100" font-size="13">51</text>
        <text x="140" y="100" font-size="13">52</text>
        <text x="100" y="140" font-size="13">53</text>
        <text x="140" y="140" font-size="13">54</text>
      </template>
      <template v-else-if="useCenterCellsOnly">
        <text x="100" y="100" font-size="13">51</text>
        <text x="140" y="100" font-size="13">52</text>
        <text x="100" y="140" font-size="13">53</text>
        <text x="140" y="140" font-size="13">54</text>
        <text x="100" y="170" font-size="10">71</text>
        <text x="140" y="170" font-size="10">72</text>
      </template>
      <template v-else>
        <text x="40"  y="40"  font-size="20">1</text>
        <text x="120" y="40"  font-size="20">2</text>
        <text x="200" y="40"  font-size="20">3</text>
        <text x="40"  y="120" font-size="20">4</text>
        <!-- 格 5、6：mergeCell5 時各為整格，否則各分四個子格 -->
        <template v-if="mergeCell5">
          <text x="120" y="120" font-size="20">5</text>
          <text x="200" y="120" font-size="20">6</text>
        </template>
        <template v-else>
          <text x="100" y="100" font-size="13">51</text>
          <text x="140" y="100" font-size="13">52</text>
          <text x="100" y="140" font-size="13">53</text>
          <text x="140" y="140" font-size="13">54</text>
          <text x="180" y="120" font-size="13">61</text>
          <text x="220" y="120" font-size="13">62</text>
        </template>
        <text x="100" y="170" font-size="10">71</text>
        <text x="140" y="170" font-size="10">72</text>
        <text x="220" y="170" font-size="10">81</text>
      </template>
    </g>
  </svg>
</template>
