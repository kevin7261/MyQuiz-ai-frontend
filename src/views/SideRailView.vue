<script>
  /**
   * SideRailView - 系統 header（create-exam-bank_3 等全寬版面左側直立欄）
   *
   * 與課程 header（TopView）對稱：固定 64px 寬、高度 100%。
   * 頂部 64×64：僅白色菱形 logo（其餘透明）；其下 25% 高度隨機漸層淡出。
   */
  import { ref } from 'vue';
  import LogoCenterMark from '../components/LogoCenterMark.vue';
  import {
    createRandomLogoDiamondGradient,
    logoDiamondGradientToCssLinear,
  } from '../utils/logoDiamondGradient.js';

  /** 64×64 方塊內圖示撐滿（48pt ≈ 64px） */
  const SYSTEM_HEADER_LOGO_MARK_SIZE_PT = 48;

  export default {
    name: 'SideRailView',
    components: { LogoCenterMark },
    setup() {
      const systemHeaderGradientStyle = ref({
        background: logoDiamondGradientToCssLinear(createRandomLogoDiamondGradient()),
      });

      return {
        SYSTEM_HEADER_LOGO_MARK_SIZE_PT,
        systemHeaderGradientStyle,
      };
    },
  };
</script>

<template>
  <aside class="my-system-header flex-shrink-0 my-bgcolor-white border-end" aria-label="系統 header">
    <div
      class="my-system-header__gradient"
      :style="systemHeaderGradientStyle"
      aria-hidden="true"
    />
    <div class="my-system-header__logo">
      <LogoCenterMark
        id-prefix="system-header-logo"
        variant="white-diamond-only"
        :size-pt="SYSTEM_HEADER_LOGO_MARK_SIZE_PT"
      />
    </div>
  </aside>
</template>

<style scoped>
.my-system-header {
  position: relative;
  z-index: 40;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  width: 64px;
  min-width: 64px;
  max-width: 64px;
  height: 100%;
  min-height: 0;
  align-self: stretch;
  flex-shrink: 0;
  overflow: hidden;
}

.my-system-header__gradient {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 0;
  width: 100%;
  height: 25%;
  pointer-events: none;
  -webkit-mask-image: linear-gradient(to bottom, #000 0%, transparent 100%);
  mask-image: linear-gradient(to bottom, #000 0%, transparent 100%);
}

.my-system-header__logo {
  position: relative;
  z-index: 1;
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 64px;
  height: 64px;
  min-width: 64px;
  min-height: 64px;
  line-height: 0;
  background: transparent;
}
</style>
