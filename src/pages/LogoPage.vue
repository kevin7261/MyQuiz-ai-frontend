<script setup>
import LogoGridSvg from '../components/LogoGridSvg.vue';

/** 02 區塊：色彩變化 */
const colorVariants = [
  { id: 'original', label: '原色', colors: { background: '#ffffff', primary: '#000000', secondary: '#888888' } },
  { id: 'invert', label: '反色', colors: { background: '#1a1a1a', primary: '#ffffff', secondary: '#888888' } },
  { id: 'blue', label: '藍色', colors: { background: '#ffffff', primary: '#1e3a8a', secondary: '#60a5fa' } },
  { id: 'green', label: '綠色', colors: { background: '#ffffff', primary: '#14532d', secondary: '#4ade80' } },
  { id: 'warm', label: '暖色', colors: { background: '#ffffff', primary: '#7c2d12', secondary: '#fb923c' } },
  { id: 'purple', label: '紫色', colors: { background: '#ffffff', primary: '#4c1d95', secondary: '#a78bfa' } },
  { id: 'teal', label: '青綠', colors: { background: '#ffffff', primary: '#115e59', secondary: '#2dd4bf' } },
];

/** 03 區塊：尺寸變化（寬度 px，高度依 4:3 比例） */
const sizeVariants = [
  { id: '240', label: '240px', width: 240 },
  { id: '160', label: '160px', width: 160 },
  { id: '120', label: '120px', width: 120 },
  { id: '80', label: '80px', width: 80 },
  { id: '48', label: '48px', width: 48 },
  { id: '32', label: '32px', width: 32 },
];

const sizeHeight = (width) => Math.round(width * (180 / 240));

/** 04 區塊：分層（僅黑／僅灰） */
const layerVariants = [
  { id: 'primary', label: '僅黑色', layer: 'primary' },
  { id: 'secondary', label: '僅灰色', layer: 'secondary' },
];

/** Q & A 區塊：兩圖各有多種尺寸 */
const qaSizeVariants = [
  { id: '160', label: '160px', width: 160 },
  { id: '80', label: '80px', width: 80 },
  { id: '48', label: '48px', width: 48 },
  { id: '32', label: '32px', width: 32 },
];
</script>

<template>
  <div class="d-flex flex-column h-100 overflow-hidden my-bgcolor-gray-4 position-relative">

    <!-- 頁首 -->
    <header class="flex-shrink-0 my-bgcolor-gray-4 p-4">
      <div class="container-fluid px-0 text-center">
        <p class="my-font-xl-400 my-color-black text-break mb-0">Logo 稿</p>
      </div>
    </header>

    <!-- 主內文 -->
    <div class="flex-grow-1 overflow-auto my-bgcolor-gray-4 d-flex flex-column min-h-0">
      <div class="container-fluid px-3 px-md-4 py-4">
        <div class="row justify-content-center">
          <div class="col-12 col-lg-10 col-xl-8 col-xxl-6">

            <!-- ===== 01 · 3×2 方格格網 ===== -->
            <!--
              格網規格：3 欄 × 2 列，每格正方形 80×80 px
              53／54／62 下方延伸列高 20 px（主格 1/4）
              無間距、無圓角，格線以 line 繪製
              SVG 尺寸：240 × 180 px
            -->
            <section class="my-page-block-spacing">
              <div class="rounded-4 my-bgcolor-gray-3 p-4 mb-5">
                <div role="heading" aria-level="2" class="my-font-lg-600 my-color-black text-break mb-4">
                  01 · 3×2 方格格網
                </div>
                <div class="d-flex flex-wrap gap-4 align-items-start">

                  <div class="d-flex flex-column align-items-center gap-2">
                    <p class="my-font-sm-400 my-color-black mb-0">格線版</p>
                    <div class="rounded-3 p-3 d-inline-flex" style="background:#ffffff">
                      <LogoGridSvg show-grid id-prefix="grid" />
                    </div>
                  </div>

                  <div class="d-flex flex-column align-items-center gap-2">
                    <p class="my-font-sm-400 my-color-black mb-0">無格線版</p>
                    <div class="rounded-3 p-3 d-inline-flex" style="background:#ffffff">
                      <LogoGridSvg :show-grid="false" id-prefix="bare" />
                    </div>
                  </div>

                </div>
              </div>
            </section>

            <!-- ===== 02 · 各種變化 ===== -->
            <section class="my-page-block-spacing">
              <div class="rounded-4 my-bgcolor-gray-3 p-4 mb-5">
                <div role="heading" aria-level="2" class="my-font-lg-600 my-color-black text-break mb-4">
                  02 · 各種變化
                </div>
                <div class="d-flex flex-wrap gap-4 align-items-start">
                  <div
                    v-for="variant in colorVariants"
                    :key="variant.id"
                    class="d-flex flex-column align-items-center gap-2"
                  >
                    <p class="my-font-sm-400 my-color-black mb-0">{{ variant.label }}</p>
                    <div
                      class="rounded-3 p-3 d-inline-flex"
                      :style="{ background: variant.colors.background }"
                    >
                      <LogoGridSvg
                        :show-grid="false"
                        :id-prefix="`var-${variant.id}`"
                        :colors="variant.colors"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <!-- ===== 03 · 各種大小 ===== -->
            <section class="my-page-block-spacing">
              <div class="rounded-4 my-bgcolor-gray-3 p-4 mb-5">
                <div role="heading" aria-level="2" class="my-font-lg-600 my-color-black text-break mb-4">
                  03 · 各種大小
                </div>
                <div class="d-flex flex-wrap gap-4 align-items-end">
                  <div
                    v-for="size in sizeVariants"
                    :key="size.id"
                    class="d-flex flex-column align-items-center gap-2"
                  >
                    <p class="my-font-sm-400 my-color-black mb-0">{{ size.label }}</p>
                    <div class="rounded-3 p-2 d-inline-flex" style="background:#ffffff">
                      <LogoGridSvg
                        :show-grid="false"
                        :id-prefix="`size-${size.id}`"
                        :svg-width="size.width"
                        :svg-height="sizeHeight(size.width)"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <!-- ===== 04 · 分層（黑／灰） ===== -->
            <section class="my-page-block-spacing">
              <div class="rounded-4 my-bgcolor-gray-3 p-4 mb-5">
                <div role="heading" aria-level="2" class="my-font-lg-600 my-color-black text-break mb-4">
                  04 · 分層（黑／灰）
                </div>
                <div
                  v-for="layerVariant in layerVariants"
                  :key="layerVariant.id"
                  class="mb-4"
                >
                  <p class="my-font-sm-600 my-color-black mb-3">{{ layerVariant.label }}</p>
                  <div class="d-flex flex-wrap gap-4 align-items-end">
                    <div
                      v-for="size in sizeVariants"
                      :key="`${layerVariant.id}-${size.id}`"
                      class="d-flex flex-column align-items-center gap-2"
                    >
                      <p class="my-font-sm-400 my-color-black mb-0">{{ size.label }}</p>
                      <div class="rounded-3 p-2 d-inline-flex" style="background:#ffffff">
                        <LogoGridSvg
                          :show-grid="false"
                          :id-prefix="`layer-${layerVariant.id}-${size.id}`"
                          :layer="layerVariant.layer"
                          :svg-width="size.width"
                          :svg-height="sizeHeight(size.width)"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <!-- ===== Q & A ===== -->
            <section class="my-page-block-spacing">
              <div class="rounded-4 my-bgcolor-gray-3 p-4 mb-5">
                <div role="heading" aria-level="2" class="my-font-lg-600 my-color-black text-break mb-4">
                  Q &amp; A
                </div>
                <div class="d-flex flex-wrap gap-5 align-items-start">
                  <div
                    v-for="layerVariant in layerVariants"
                    :key="`qa-${layerVariant.id}`"
                    class="d-flex flex-column gap-3"
                  >
                    <p class="my-font-sm-600 my-color-black mb-0">{{ layerVariant.label }}</p>
                    <div class="d-flex flex-wrap gap-4 align-items-end">
                      <div
                        v-for="size in qaSizeVariants"
                        :key="`qa-${layerVariant.id}-${size.id}`"
                        class="d-flex flex-column align-items-center gap-2"
                      >
                        <p class="my-font-sm-400 my-color-black mb-0">{{ size.label }}</p>
                        <div class="rounded-3 p-2 d-inline-flex" style="background:#ffffff">
                          <LogoGridSvg
                            :show-grid="false"
                            :id-prefix="`qa-${layerVariant.id}-${size.id}`"
                            :layer="layerVariant.layer"
                            :svg-width="size.width"
                            :svg-height="sizeHeight(size.width)"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

          </div>
        </div>
      </div>
    </div>

  </div>
</template>
