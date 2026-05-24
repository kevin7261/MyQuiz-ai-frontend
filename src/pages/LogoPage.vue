<script setup>
/**
 * LogoPage — Logo 展示頁
 * 各種 Logo 的 SVG 稿件，直接在頁面上陳列。
 */
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

            <!-- ===== 待加入 Logo ===== -->
            <section class="my-page-block-spacing">
              <div class="rounded-4 my-bgcolor-gray-3 p-4 mb-5 text-center">
                <p class="my-font-md-400 my-color-black mb-0">尚未加入任何 Logo，請叫我畫！</p>
              </div>
            </section>

          </div>
        </div>
      </div>
    </div>

  </div>
</template>
