<script setup>
import { ref } from 'vue';
import DesignPageCopyBtn from '../components/DesignPageCopyBtn.vue';
defineProps({
  tabId: { type: String, default: '' },
});

const designSampleChoiceWhite = ref('選項一');
</script>

<template>
  <!--
    DesignPage2｜UI 元件參考（稿 2）
    - 根層：全高 flex 直向、網頁 canvas 灰淺（my-bgcolor-gray-4）；頂部固定、頁首標題無底分隔線、下方主區可捲動。
    - 頁首標題「UI 元件參考」置中、無 col；主內文 container-fluid px-3 px-md-4 py-4 + row 置中，欄寬與測驗頁一致 col-lg-10 col-xl-8 col-xxl-6。
    - 章節：各 <section> 使用 my-page-block-spacing；區塊 rounded-4 my-bgcolor-gray-3、無 border；子標題 .my-font-lg-600（common 預設字色 --my-color-black）。
    - 複製：DesignPageCopyBtn 預設淺底深字；class 示範列多為黑框（.my-design-swatch-row my-bgcolor-black）複製鈕 :on-light-bg="false"；08 區塊本體 my-bgcolor-gray-3（與 canvas 區隔）；其內 class 示範列仍 .my-design-swatch-row--light、:on-light-bg="true"、<code> my-color-black。黑框內 <code>／示範 <span> 皆併 my-font-sm-400（黑底併 my-color-white）；等寬字體由 common「黑底示範列」規則統一套用 --my-font-family-courier，避免 Bootstrap code 字級覆蓋。02／03 色票每組一顆色圓；底／字 class 兩黑框橫向同一排（.my-design-swatch-rows）。
    - 編號：05 區塊按鈕僅示範 create-exam-bank_design 實際使用形式；內含「09 · 徽章」與「08 · 下拉選單」；其後為 06 輸入、07 分頁、08 表格。
  -->
  <div class="d-flex flex-column h-100 overflow-hidden my-bgcolor-gray-4 position-relative">
    <!-- 頁首：稿名，不隨內文捲動（與測驗頁同層級） -->
    <header class="flex-shrink-0 my-bgcolor-gray-4 p-4">
      <div class="container-fluid px-0 text-center">
        <p class="my-font-xl-400 my-color-black text-break mb-0">UI 元件參考 2</p>
      </div>
    </header>

    <!-- 主內文：overflow-auto 僅此層捲動 -->
    <div class="flex-grow-1 overflow-auto my-bgcolor-gray-4 d-flex flex-column min-h-0">
      <div class="container-fluid px-3 px-md-4 py-4">
        <div class="row justify-content-center">
          <div class="col-12 col-lg-10 col-xl-8 col-xxl-6">

          <!-- ===== 01 · 字階 =====
               common：.my-font-{xl|lg|md|sm}-{400|600}；左欄字重 400、右欄 600；<dl> 示範語意結構 -->
          <section class="my-page-block-spacing">
            <div class="rounded-4 my-bgcolor-gray-3 p-4 mb-5">
            <div role="heading" aria-level="2" class="my-font-lg-600 my-color-black text-break mb-4">01 · 字階</div>
                <div class="row g-4 align-items-start">
                  <div class="col-12 col-md-6">
                    <dl class="mb-0">
                      <div class="d-flex flex-column gap-1 pb-3 mb-3">
                        <dt class="my-font-xl-400 my-color-black">第一級 · 一般</dt>
                        <dd class="my-font-sm-400 mb-0 w-100">
                          <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100">
                            <span class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white">.my-font-xl-400</span>
                            <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text=".my-font-xl-400" :on-light-bg="false" />
                          </div>
                        </dd>
                      </div>
                      <div class="d-flex flex-column gap-1 pb-3 mb-3">
                        <dt class="my-font-lg-400 my-color-black">第二級 · 一般</dt>
                        <dd class="my-font-sm-400 mb-0 w-100">
                          <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100">
                            <span class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white">.my-font-lg-400</span>
                            <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text=".my-font-lg-400" :on-light-bg="false" />
                          </div>
                        </dd>
                      </div>
                      <div class="d-flex flex-column gap-1 pb-3 mb-3">
                        <dt class="my-font-md-400 my-color-black">第三級 · 一般</dt>
                        <dd class="my-font-sm-400 mb-0 w-100">
                          <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100">
                            <span class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white">.my-font-md-400</span>
                            <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text=".my-font-md-400" :on-light-bg="false" />
                          </div>
                        </dd>
                      </div>
                      <div class="d-flex flex-column gap-1">
                        <dt class="my-font-sm-400 my-color-black">第四級 · 一般</dt>
                        <dd class="my-font-sm-400 mb-0 w-100">
                          <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100">
                            <span class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white">.my-font-sm-400</span>
                            <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text=".my-font-sm-400" :on-light-bg="false" />
                          </div>
                        </dd>
                      </div>
                    </dl>
                  </div>
                  <div class="col-12 col-md-6">
                    <dl class="mb-0">
                      <div class="d-flex flex-column gap-1 pb-3 mb-3">
                        <dt class="my-font-xl-600 my-color-black">第一級 · 強調</dt>
                        <dd class="my-font-sm-400 mb-0 w-100">
                          <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100">
                            <span class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white">.my-font-xl-600</span>
                            <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text=".my-font-xl-600" :on-light-bg="false" />
                          </div>
                        </dd>
                      </div>
                      <div class="d-flex flex-column gap-1 pb-3 mb-3">
                        <dt class="my-font-lg-600 my-color-black">第二級 · 強調</dt>
                        <dd class="my-font-sm-400 mb-0 w-100">
                          <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100">
                            <span class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white">.my-font-lg-600</span>
                            <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text=".my-font-lg-600" :on-light-bg="false" />
                          </div>
                        </dd>
                      </div>
                      <div class="d-flex flex-column gap-1 pb-3 mb-3">
                        <dt class="my-font-md-600 my-color-black">第三級 · 強調</dt>
                        <dd class="my-font-sm-400 mb-0 w-100">
                          <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100">
                            <span class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white">.my-font-md-600</span>
                            <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text=".my-font-md-600" :on-light-bg="false" />
                          </div>
                        </dd>
                      </div>
                      <div class="d-flex flex-column gap-1">
                        <dt class="my-font-sm-600 my-color-black">第四級 · 強調</dt>
                        <dd class="my-font-sm-400 mb-0 w-100">
                          <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100">
                            <span class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white">.my-font-sm-600</span>
                            <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text=".my-font-sm-600" :on-light-bg="false" />
                          </div>
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>
            </div>
          </section>

          <!-- ===== 02 · 語意色 =====
               每語意一顆色圓；底／字 class 各一黑框，.my-design-swatch-rows 橫向同一排，各附複製鈕。 -->
          <section class="my-page-block-spacing">
            <div class="rounded-4 my-bgcolor-gray-3 p-4 mb-5">
            <div role="heading" aria-level="2" class="my-font-lg-600 my-color-black text-break mb-4">02 · 語意色</div>
                <div class="row g-3">
                  <div class="col-12">
                    <div class="my-design-swatch-cell">
                      <span class="my-design-swatch-dot my-bgcolor-red" aria-hidden="true"></span>
                      <div class="my-design-swatch-rows">
                        <div class="my-design-swatch-row my-bgcolor-black min-w-0">
                          <code class="my-font-sm-400 my-color-white font-monospace text-break flex-grow-1 min-w-0 px-1">.my-bgcolor-red</code>
                          <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text=".my-bgcolor-red" :on-light-bg="false" />
                        </div>
                        <div class="my-design-swatch-row my-bgcolor-black min-w-0">
                          <code class="my-font-sm-400 my-color-white font-monospace text-break flex-grow-1 min-w-0 px-1">.my-color-red</code>
                          <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text=".my-color-red" :on-light-bg="false" />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="col-12">
                    <div class="my-design-swatch-cell">
                      <span class="my-design-swatch-dot my-bgcolor-green" aria-hidden="true"></span>
                      <div class="my-design-swatch-rows">
                        <div class="my-design-swatch-row my-bgcolor-black min-w-0">
                          <code class="my-font-sm-400 my-color-white font-monospace text-break flex-grow-1 min-w-0 px-1">.my-bgcolor-green</code>
                          <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text=".my-bgcolor-green" :on-light-bg="false" />
                        </div>
                        <div class="my-design-swatch-row my-bgcolor-black min-w-0">
                          <code class="my-font-sm-400 my-color-white font-monospace text-break flex-grow-1 min-w-0 px-1">.my-color-green</code>
                          <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text=".my-color-green" :on-light-bg="false" />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="col-12">
                    <div class="my-design-swatch-cell">
                      <span class="my-design-swatch-dot my-bgcolor-blue" aria-hidden="true"></span>
                      <div class="my-design-swatch-rows">
                        <div class="my-design-swatch-row my-bgcolor-black min-w-0">
                          <code class="my-font-sm-400 my-color-white font-monospace text-break flex-grow-1 min-w-0 px-1">.my-bgcolor-blue</code>
                          <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text=".my-bgcolor-blue" :on-light-bg="false" />
                        </div>
                        <div class="my-design-swatch-row my-bgcolor-black min-w-0">
                          <code class="my-font-sm-400 my-color-white font-monospace text-break flex-grow-1 min-w-0 px-1">.my-color-blue</code>
                          <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text=".my-color-blue" :on-light-bg="false" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
            </div>
          </section>

          <!-- ===== 03 · 灰階 · 背景 =====
               每列一顆色圓（背景階）；底／字 class 兩黑框橫向同一排（.my-design-swatch-rows）。 -->
          <section class="my-page-block-spacing">
            <div class="rounded-4 my-bgcolor-gray-3 p-4 mb-5">
            <div role="heading" aria-level="2" class="my-font-lg-600 my-color-black text-break mb-4">03 · 灰階 · 背景</div>
                <div class="row g-3">
                  <div class="col-12">
                    <div class="my-design-swatch-cell">
                      <span class="my-design-swatch-dot my-bgcolor-black" aria-hidden="true"></span>
                      <div class="my-design-swatch-rows">
                        <div class="my-design-swatch-row my-bgcolor-black min-w-0">
                          <code class="my-font-sm-400 my-color-white font-monospace text-break flex-grow-1 min-w-0 px-1">.my-bgcolor-black</code>
                          <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text=".my-bgcolor-black" :on-light-bg="false" />
                        </div>
                        <div class="my-design-swatch-row my-bgcolor-black min-w-0">
                          <code class="my-font-sm-400 my-color-white font-monospace text-break flex-grow-1 min-w-0 px-1">.my-color-white</code>
                          <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text=".my-color-white" :on-light-bg="false" />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="col-12">
                    <div class="my-design-swatch-cell">
                      <span class="my-design-swatch-dot my-bgcolor-gray-2" aria-hidden="true"></span>
                      <div class="my-design-swatch-rows">
                        <div class="my-design-swatch-row my-bgcolor-black min-w-0">
                          <code class="my-font-sm-400 my-color-white font-monospace text-break flex-grow-1 min-w-0 px-1">.my-bgcolor-gray-2</code>
                          <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text=".my-bgcolor-gray-2" :on-light-bg="false" />
                        </div>
                        <div class="my-design-swatch-row my-bgcolor-black min-w-0">
                          <code class="my-font-sm-400 my-color-white font-monospace text-break flex-grow-1 min-w-0 px-1">.my-color-black</code>
                          <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text=".my-color-black" :on-light-bg="false" />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="col-12">
                    <div class="my-design-swatch-cell">
                      <span class="my-design-swatch-dot my-bgcolor-gray-3" aria-hidden="true"></span>
                      <div class="my-design-swatch-rows">
                        <div class="my-design-swatch-row my-bgcolor-black min-w-0">
                          <code class="my-font-sm-400 my-color-white font-monospace text-break flex-grow-1 min-w-0 px-1">.my-bgcolor-gray-3</code>
                          <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text=".my-bgcolor-gray-3" :on-light-bg="false" />
                        </div>
                        <div class="my-design-swatch-row my-bgcolor-black min-w-0">
                          <code class="my-font-sm-400 my-color-white font-monospace text-break flex-grow-1 min-w-0 px-1">.my-color-black</code>
                          <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text=".my-color-black" :on-light-bg="false" />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="col-12">
                    <div class="my-design-swatch-cell">
                      <span class="my-design-swatch-dot my-bgcolor-gray-4" aria-hidden="true"></span>
                      <div class="my-design-swatch-rows">
                        <div class="my-design-swatch-row my-bgcolor-black min-w-0">
                          <code class="my-font-sm-400 my-color-white font-monospace text-break flex-grow-1 min-w-0 px-1">.my-bgcolor-gray-4</code>
                          <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text=".my-bgcolor-gray-4" :on-light-bg="false" />
                        </div>
                        <div class="my-design-swatch-row my-bgcolor-black min-w-0">
                          <code class="my-font-sm-400 my-color-white font-monospace text-break flex-grow-1 min-w-0 px-1">.my-color-black</code>
                          <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text=".my-color-black" :on-light-bg="false" />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="col-12">
                    <div class="my-design-swatch-cell">
                      <span class="my-design-swatch-dot my-bgcolor-white" aria-hidden="true"></span>
                      <div class="my-design-swatch-rows">
                        <div class="my-design-swatch-row my-bgcolor-black min-w-0">
                          <code class="my-font-sm-400 my-color-white font-monospace text-break flex-grow-1 min-w-0 px-1">.my-bgcolor-white</code>
                          <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text=".my-bgcolor-white" :on-light-bg="false" />
                        </div>
                        <div class="my-design-swatch-row my-bgcolor-black min-w-0">
                          <code class="my-font-sm-400 my-color-white font-monospace text-break flex-grow-1 min-w-0 px-1">.my-color-black</code>
                          <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text=".my-color-black" :on-light-bg="false" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
            </div>
          </section>

          <!-- ===== 04 · 區塊定義 =====
               Design 頁章節外層：rounded-4 my-bgcolor-gray-3 p-4 mb-5、無 border；全站 canvas 為 gray-4（body）；業務內容區 my-bgcolor-page-block（底同 --my-color-gray-3）。 -->
          <section class="my-page-block-spacing">
            <div class="rounded-4 my-bgcolor-gray-3 p-4 mb-5">
            <div role="heading" aria-level="2" class="my-font-lg-600 my-color-black text-break mb-4">04 · 區塊定義</div>
                <div class="my-font-sm-400 d-flex flex-column gap-3">
                  <div class="d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-2 gap-md-3 w-100">
                    <div class="my-design-swatch-row my-bgcolor-black min-w-0 flex-grow-1">
                      <code
                        class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white"
                        >rounded-4 my-bgcolor-gray-3 p-4 mb-5</code>
                      <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text="rounded-4 my-bgcolor-gray-3 p-4 mb-5"
                      :on-light-bg="false"/>
                    </div>
                  </div>
                </div>
            </div>
          </section>

          <!-- ===== 05 · 按鈕 + 09 · 徽章 + 08 · 下拉選單（同一 section） =====
               按鈕：僅示範 create-exam-bank_design 實際使用之形式。小 px-3 py-1：gray-3、transparent-borderless。中 px-4 py-2：black、white、transparent-borderless＋gray-1。大 px-4 py-3：gray-3＋gap-2。圓形 my-btn-circle＋transparent-borderless。切換：單元類型（白軌＋gray-3／transparent-borderless 小）；出題模式／設為測驗用（my-quiz-generate-mode-switch 軌 20px、gap-2 標籤）。單行輸入見「06 · 輸入」。
               圓形：分頁「+」與複製鈕同規 my-btn-circle + my-button-transparent-borderless。
               09 徽章：在 08 下拉之上；僅示範 create-exam-bank_design 實際使用（my-bgcolor-surface、border）；資料夾標籤含 d-inline-flex gap-1；單元類型含 flex-shrink-0。
               08 下拉：區塊底 my-bgcolor-gray-3；外層 .my-design-08-dropdown；示範一白底觸發邊 gray-2；示範二透明底無邊框；選單 .dropdown-menu Bootstrap 預設；觸發 rounded-2 同輸入（非膠囊）。 -->
          <section class="my-page-block-spacing">
            <div class="rounded-4 my-bgcolor-gray-3 p-4 mb-5">
            <div role="heading" aria-level="2" class="my-font-lg-600 my-color-black text-break mb-4">05 · 按鈕</div>
                <div class="d-flex flex-column gap-4">
                  <!-- 小：字級 my-font-sm-400、內距 px-3 py-1（詳細資訊、單元類型未選）；設為測驗用見 my-quiz-generate-mode-switch -->
                  <div>
                    <div class="my-color-gray-4 my-font-sm-400 mb-2">小（my-font-sm-400 · px-3 py-1）</div>
                    <div class="d-flex flex-column gap-3">
                      <div class="d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-2 gap-md-3 w-100">
                        <button
                          type="button"
                          class="btn rounded-pill d-inline-flex justify-content-center align-items-center flex-shrink-0 my-font-sm-400 my-button-gray-3 px-3 py-1"
                        >
                          詳細資訊
                        </button>
                        <div class="my-design-swatch-row my-bgcolor-black min-w-0 flex-grow-1">
                          <code
                            class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white"
                            >btn rounded-pill d-inline-flex justify-content-center align-items-center flex-shrink-0 my-font-sm-400 my-button-gray-3 px-3 py-1</code>
                          <DesignPageCopyBtn
                          class="flex-shrink-0 ms-auto"
                          text="btn rounded-pill d-inline-flex justify-content-center align-items-center flex-shrink-0 my-font-sm-400 my-button-gray-3 px-3 py-1"
                      :on-light-bg="false"/>
                        </div>
                      </div>
                      <div class="d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-2 gap-md-3 w-100">
                        <button
                          type="button"
                          role="switch"
                          class="my-quiz-generate-mode-switch d-inline-flex align-items-center gap-2 flex-shrink-0"
                          aria-checked="false"
                        >
                          <span class="my-quiz-generate-mode-switch__track" aria-hidden="true">
                            <span class="my-quiz-generate-mode-switch__knob" aria-hidden="true" />
                          </span>
                          <span class="my-quiz-generate-mode-switch__label my-font-sm-400 flex-shrink-0">設為測驗用</span>
                        </button>
                        <div class="my-design-swatch-row my-bgcolor-black min-w-0 flex-grow-1">
                          <code
                            class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white"
                            >my-quiz-generate-mode-switch d-inline-flex align-items-center gap-2 · 設為測驗用（關）</code>
                          <DesignPageCopyBtn
                          class="flex-shrink-0 ms-auto"
                          text="my-quiz-generate-mode-switch d-inline-flex align-items-center gap-2"
                      :on-light-bg="false"/>
                        </div>
                      </div>
                      <div class="d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-2 gap-md-3 w-100">
                        <button
                          type="button"
                          role="switch"
                          class="my-quiz-generate-mode-switch d-inline-flex align-items-center gap-2 flex-shrink-0 my-quiz-generate-mode-switch--on"
                          aria-checked="true"
                        >
                          <span class="my-quiz-generate-mode-switch__track" aria-hidden="true">
                            <span class="my-quiz-generate-mode-switch__knob" aria-hidden="true" />
                          </span>
                          <span class="my-quiz-generate-mode-switch__label my-font-sm-400 flex-shrink-0">設為測驗用</span>
                        </button>
                        <div class="my-design-swatch-row my-bgcolor-black min-w-0 flex-grow-1">
                          <code
                            class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white"
                            >my-quiz-generate-mode-switch d-inline-flex align-items-center gap-2 my-quiz-generate-mode-switch--on · 設為測驗用（開）</code>
                          <DesignPageCopyBtn
                          class="flex-shrink-0 ms-auto"
                          text="my-quiz-generate-mode-switch d-inline-flex align-items-center gap-2 my-quiz-generate-mode-switch--on"
                      :on-light-bg="false"/>
                        </div>
                      </div>
                      <div class="d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-2 gap-md-3 w-100">
                        <button
                          type="button"
                          class="btn rounded-pill d-flex justify-content-center align-items-center my-font-sm-400 my-button-transparent-borderless px-3 py-1"
                        >
                          黑無框
                        </button>
                        <div class="my-design-swatch-row my-bgcolor-black min-w-0 flex-grow-1">
                          <code
                            class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white"
                            >btn rounded-pill d-flex justify-content-center align-items-center my-font-sm-400 my-button-transparent-borderless px-3 py-1</code>
                          <DesignPageCopyBtn
                          class="flex-shrink-0 ms-auto"
                          text="btn rounded-pill d-flex justify-content-center align-items-center my-font-sm-400 my-button-transparent-borderless px-3 py-1"
                      :on-light-bg="false"/>
                        </div>
                      </div>
                    </div>
                  </div>
                  <!-- 中：字級 my-font-md-400、內距 px-4 py-2（create-exam-bank_design 主操作列） -->
                  <div>
                    <div class="my-color-gray-4 my-font-sm-400 mb-2">中（my-font-md-400 · px-4 py-2）</div>
                    <div class="d-flex flex-column gap-3">
                      <div class="d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-2 gap-md-3 w-100">
                        <button
                          type="button"
                          class="btn rounded-pill d-flex justify-content-center align-items-center my-font-md-400 my-button-black px-4 py-2"
                        >
                          關閉
                        </button>
                        <div class="my-design-swatch-row my-bgcolor-black min-w-0 flex-grow-1">
                          <code
                            class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white"
                            >btn rounded-pill d-flex justify-content-center align-items-center my-font-md-400 my-button-black px-4 py-2</code>
                          <DesignPageCopyBtn
                          class="flex-shrink-0 ms-auto"
                          text="btn rounded-pill d-flex justify-content-center align-items-center my-font-md-400 my-button-black px-4 py-2"
                      :on-light-bg="false"/>
                        </div>
                      </div>
                      <div class="d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-2 gap-md-3 w-100">
                        <button
                          type="button"
                          class="btn rounded-pill d-flex justify-content-center align-items-center gap-2 my-font-md-400 my-button-white flex-shrink-0 px-4 py-2"
                        >
                          確定上傳
                        </button>
                        <div class="my-design-swatch-row my-bgcolor-black min-w-0 flex-grow-1">
                          <code
                            class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white"
                            >btn rounded-pill d-flex justify-content-center align-items-center gap-2 my-font-md-400 my-button-white flex-shrink-0 px-4 py-2</code>
                          <DesignPageCopyBtn
                          class="flex-shrink-0 ms-auto"
                          text="btn rounded-pill d-flex justify-content-center align-items-center gap-2 my-font-md-400 my-button-white flex-shrink-0 px-4 py-2"
                      :on-light-bg="false"/>
                        </div>
                      </div>
                      <div class="d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-2 gap-md-3 w-100">
                        <button
                          type="button"
                          class="btn rounded-pill d-inline-flex justify-content-center align-items-center my-font-md-400 my-color-gray-1 my-button-transparent-borderless px-4 py-2"
                        >
                          取消
                        </button>
                        <div class="my-design-swatch-row my-bgcolor-black min-w-0 flex-grow-1">
                          <code
                            class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white"
                            >btn rounded-pill d-inline-flex justify-content-center align-items-center my-font-md-400 my-color-gray-1 my-button-transparent-borderless px-4 py-2</code>
                          <DesignPageCopyBtn
                          class="flex-shrink-0 ms-auto"
                          text="btn rounded-pill d-inline-flex justify-content-center align-items-center my-font-md-400 my-color-gray-1 my-button-transparent-borderless px-4 py-2"
                      :on-light-bg="false"/>
                        </div>
                      </div>
                    </div>
                  </div>
                  <!-- 大：字級 my-font-md-400、內距 px-4 py-3（新增題型／新增題目） -->
                  <div>
                    <div class="my-color-gray-4 my-font-sm-400 mb-2">大（my-font-md-400 · px-4 py-3 · my-button-gray-3）</div>
                    <div class="d-flex flex-column gap-3">
                      <div class="d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-2 gap-md-3 w-100">
                        <button
                          type="button"
                          class="btn rounded-pill d-flex justify-content-center align-items-center gap-2 my-font-md-400 my-button-gray-3 px-4 py-3"
                        >
                          <i class="fa-solid fa-plus" aria-hidden="true"></i>
                          新增題型
                        </button>
                        <div class="my-design-swatch-row my-bgcolor-black min-w-0 flex-grow-1">
                          <code
                            class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white"
                            >btn rounded-pill d-flex justify-content-center align-items-center gap-2 my-font-md-400 my-button-gray-3 px-4 py-3</code>
                          <DesignPageCopyBtn
                          class="flex-shrink-0 ms-auto"
                          text="btn rounded-pill d-flex justify-content-center align-items-center gap-2 my-font-md-400 my-button-gray-3 px-4 py-3"
                      :on-light-bg="false"/>
                        </div>
                      </div>
                    </div>
                  </div>
                  <!-- 圓形圖示鈕：32×32，與 create-exam-bank_design 分頁「+」同規 -->
                  <div>
                    <div class="my-color-gray-4 my-font-sm-400 mb-2">圓形黑無框（md · my-btn-circle · 例：fa-plus）</div>
                    <div class="d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-2 gap-md-3 w-100">
                      <button
                        type="button"
                        class="btn rounded-circle d-flex justify-content-center align-items-center my-font-md-400 my-button-transparent-borderless my-btn-circle flex-shrink-0"
                        aria-label="圓形黑無框（範例圖示 fa-plus）"
                      >
                        <i class="fa-solid fa-plus" aria-hidden="true"></i>
                      </button>
                      <div class="my-design-swatch-row my-bgcolor-black min-w-0 flex-grow-1">
                        <code
                          class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white"
                          >btn rounded-circle d-flex justify-content-center align-items-center my-font-md-400 my-button-transparent-borderless my-btn-circle</code>
                        <DesignPageCopyBtn
                        class="flex-shrink-0 ms-auto"
                        text="btn rounded-circle d-flex justify-content-center align-items-center my-font-md-400 my-button-transparent-borderless my-btn-circle"
                      :on-light-bg="false"/>
                      </div>
                    </div>
                  </div>
                  <!-- 單元類型切換（白軌＋小 pill；選中 gray-3、未選 transparent-borderless） -->
                  <div>
                    <div class="my-color-gray-4 my-font-sm-400 mb-2">
                      單元類型切換（d-inline-flex rounded-pill my-bgcolor-white p-1 · 小 · 選中 my-button-gray-3 · 未選 my-button-transparent-borderless）
                    </div>
                    <div class="d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-2 gap-md-3 w-100">
                      <div
                        class="d-inline-flex flex-wrap gap-1 rounded-pill my-bgcolor-white flex-shrink-0 align-self-start p-1"
                        role="group"
                        aria-label="示範：單元類型切換"
                      >
                        <button
                          type="button"
                          class="btn rounded-pill d-flex justify-content-center align-items-center my-font-sm-400 my-button-gray-3 px-3 py-1"
                        >
                          rag
                        </button>
                        <button
                          type="button"
                          class="btn rounded-pill d-flex justify-content-center align-items-center my-font-sm-400 my-button-transparent-borderless px-3 py-1"
                        >
                          文字
                        </button>
                        <button
                          type="button"
                          class="btn rounded-pill d-flex justify-content-center align-items-center my-font-sm-400 my-button-transparent-borderless px-3 py-1"
                        >
                          mp3
                        </button>
                        <button
                          type="button"
                          class="btn rounded-pill d-flex justify-content-center align-items-center my-font-sm-400 my-button-transparent-borderless px-3 py-1"
                        >
                          youtube
                        </button>
                      </div>
                      <div class="my-design-swatch-row my-bgcolor-black min-w-0 flex-grow-1">
                        <code
                          class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white"
                          >d-inline-flex rounded-pill my-bgcolor-white p-1 · btn … my-font-sm-400 my-button-gray-3 px-3 py-1 · btn … my-button-transparent-borderless px-3 py-1</code>
                        <DesignPageCopyBtn
                        class="flex-shrink-0 ms-auto"
                        text="d-inline-flex rounded-pill my-bgcolor-white p-1 btn my-font-sm-400 my-button-gray-3 px-3 py-1 btn my-button-transparent-borderless px-3 py-1"
                      :on-light-bg="false"/>
                      </div>
                    </div>
                  </div>
                  <!-- 出題模式切換（my-quiz-generate-mode-switch；關＝一般出題、開＝追問出題綠軌） -->
                  <div>
                    <div class="my-color-gray-4 my-font-sm-400 mb-2">
                      出題模式切換（my-quiz-generate-mode-switch · 軌 20px · gap-2 · 開＝綠軌）
                    </div>
                    <div class="d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-2 gap-md-3 w-100">
                      <button
                        type="button"
                        role="switch"
                        class="my-quiz-generate-mode-switch d-inline-flex align-items-center gap-2 flex-shrink-0 my-quiz-generate-mode-switch--on"
                        aria-checked="true"
                      >
                        <span class="my-quiz-generate-mode-switch__track" aria-hidden="true">
                          <span class="my-quiz-generate-mode-switch__knob" aria-hidden="true" />
                        </span>
                        <span class="my-quiz-generate-mode-switch__label my-font-sm-400 flex-shrink-0">追問出題</span>
                      </button>
                      <div class="my-design-swatch-row my-bgcolor-black min-w-0 flex-grow-1">
                        <code
                          class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white"
                          >my-quiz-generate-mode-switch d-inline-flex align-items-center gap-2 · my-quiz-generate-mode-switch--on</code>
                        <DesignPageCopyBtn
                        class="flex-shrink-0 ms-auto"
                        text="my-quiz-generate-mode-switch d-inline-flex align-items-center gap-2 my-quiz-generate-mode-switch--on"
                      :on-light-bg="false"/>
                      </div>
                    </div>
                  </div>
                </div>
            </div>

            <!-- 09 · 徽章（仍屬 05 同一 section；在 08 下拉之上） -->
            <div class="rounded-4 my-bgcolor-gray-3 p-4 mb-5 mt-4">
              <div role="heading" aria-level="2" class="my-font-lg-600 my-color-black text-break mb-4">09 · 徽章</div>
              <div class="d-flex flex-column gap-4">
                <!-- 資料夾組合標籤（create-exam-bank_design 拖曳 tag） -->
                <div class="d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-2 gap-md-3 w-100">
                  <span
                    class="badge my-bgcolor-surface my-color-black border user-select-none my-font-sm-400 d-inline-flex align-items-center gap-1 rounded px-2 py-1 flex-shrink-0 align-self-start"
                  >
                    資料夾
                  </span>
                  <div class="my-design-swatch-row my-bgcolor-black min-w-0 flex-grow-1">
                    <code
                      class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white"
                    >
                      badge my-bgcolor-surface my-color-black border user-select-none my-font-sm-400 d-inline-flex align-items-center gap-1 rounded px-2 py-1
                    </code>
                    <DesignPageCopyBtn
                      class="flex-shrink-0 ms-auto"
                      text="badge my-bgcolor-surface my-color-black border user-select-none my-font-sm-400 d-inline-flex align-items-center gap-1 rounded px-2 py-1"
                      :on-light-bg="false"
                    />
                  </div>
                </div>
                <!-- 單元類型標籤（標題旁 typeLabel） -->
                <div class="d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-2 gap-md-3 w-100">
                  <span
                    class="badge my-bgcolor-surface my-color-black border user-select-none my-font-sm-400 rounded px-2 py-1 flex-shrink-0 align-self-start"
                  >
                    文字
                  </span>
                  <div class="my-design-swatch-row my-bgcolor-black min-w-0 flex-grow-1">
                    <code
                      class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white"
                    >
                      badge my-bgcolor-surface my-color-black border user-select-none my-font-sm-400 rounded px-2 py-1 flex-shrink-0
                    </code>
                    <DesignPageCopyBtn
                      class="flex-shrink-0 ms-auto"
                      text="badge my-bgcolor-surface my-color-black border user-select-none my-font-sm-400 rounded px-2 py-1 flex-shrink-0"
                      :on-light-bg="false"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- 08 · 下拉選單（仍屬 05 同一 section） -->
            <div class="rounded-4 my-bgcolor-gray-3 p-4 mb-5 mt-4">
            <div role="heading" aria-level="2" class="my-font-lg-600 my-color-black text-break mb-4">08 · 下拉選單</div>
              <div class="my-design-08-dropdown">
                <div class="my-color-gray-1 my-font-sm-400 mb-2">中（my-font-md-400 · px-3 py-2）；外層 .my-design-08-dropdown；觸發 rounded-2 同輸入；示範一邊 gray-2；示範二透明底無邊框；選單 Bootstrap 預設</div>
                <div class="d-flex flex-column gap-3">
                  <!-- 示範一（預設文案選項一）：白底 rounded-2＋邊線同 my-input-md -->
                  <div class="d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-2 gap-md-3 w-100">
                    <div class="dropdown flex-shrink-0">
                      <button
                        id="design-dd-md-white-btn"
                        class="btn rounded-2 d-flex justify-content-between align-items-center dropdown-toggle my-dropdown-caret my-font-md-400 my-button-white flex-shrink-0 px-3 py-2 text-start"
                        type="button"
                        data-bs-toggle="dropdown"
                        aria-expanded="false"
                      >
                        <span class="text-truncate text-start pe-2">{{ designSampleChoiceWhite }}</span>
                        <i class="fa-solid fa-chevron-down my-dropdown-toggle-caret" aria-hidden="true"></i>
                      </button>
                      <ul
                        class="dropdown-menu"
                        aria-labelledby="design-dd-md-white-btn"
                      >
                        <li>
                          <a class="dropdown-item" href="#" @click.prevent="designSampleChoiceWhite = '選項一'">選項一</a>
                        </li>
                        <li>
                          <a class="dropdown-item" href="#" @click.prevent="designSampleChoiceWhite = '選項二'">選項二</a>
                        </li>
                        <li>
                          <a class="dropdown-item" href="#" @click.prevent="designSampleChoiceWhite = '選項三'">選項三</a>
                        </li>
                      </ul>
                    </div>
                    <div class="my-design-swatch-row my-bgcolor-black min-w-0 flex-grow-1">
                      <code
                        class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white"
                        >my-design-08-dropdown · btn rounded-2 d-flex justify-content-between align-items-center dropdown-toggle my-dropdown-caret my-font-md-400 my-button-white flex-shrink-0 px-3 py-2 text-start</code>
                      <DesignPageCopyBtn
                      class="flex-shrink-0 ms-auto"
                      text="btn rounded-2 d-flex justify-content-between align-items-center dropdown-toggle my-dropdown-caret my-font-md-400 my-button-white flex-shrink-0 px-3 py-2 text-start"
                      :on-light-bg="false"/>
                    </div>
                  </div>
                  <!-- 示範二：my-button-transparent-borderless → 透明底、無邊框 -->
                  <div class="d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-2 gap-md-3 w-100">
                    <div class="dropdown flex-shrink-0">
                      <button
                        id="design-dd-md-bl-btn"
                        class="btn rounded-2 d-flex justify-content-between align-items-center dropdown-toggle my-dropdown-caret my-font-md-400 my-button-transparent-borderless flex-shrink-0 px-3 py-2 text-start"
                        type="button"
                        data-bs-toggle="dropdown"
                        aria-expanded="false"
                      >
                        <span class="text-truncate text-start pe-2">選項</span>
                        <i class="fa-solid fa-chevron-down my-dropdown-toggle-caret" aria-hidden="true"></i>
                      </button>
                      <ul class="dropdown-menu" aria-labelledby="design-dd-md-bl-btn">
                        <li><a class="dropdown-item" href="#" @click.prevent>選項一</a></li>
                        <li><a class="dropdown-item" href="#" @click.prevent>選項二</a></li>
                      </ul>
                    </div>
                    <div class="my-design-swatch-row my-bgcolor-black min-w-0 flex-grow-1">
                      <code
                        class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white"
                        >my-design-08-dropdown · btn rounded-2 d-flex justify-content-between align-items-center dropdown-toggle my-dropdown-caret my-font-md-400 my-button-transparent-borderless flex-shrink-0 px-3 py-2 text-start</code>
                      <DesignPageCopyBtn
                      class="flex-shrink-0 ms-auto"
                      text="btn rounded-2 d-flex justify-content-between align-items-center dropdown-toggle my-dropdown-caret my-font-md-400 my-button-transparent-borderless flex-shrink-0 px-3 py-2 text-start"
                      :on-light-bg="false"/>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- ===== 06 · 輸入 =====
               單行／輸入區塊：啟用與停用各一；停用＝ readonly（勿用 disabled）；全站 .form-control.my-input-md.rounded-2。版面：row 兩欄（示範｜黑框 class＋複製，併 .my-design-swatch-row）。 -->
          <section class="my-page-block-spacing">
            <div class="rounded-4 my-bgcolor-gray-3 p-4 mb-5">
              <div role="heading" aria-level="2" class="my-font-lg-600 my-color-black text-break mb-4">06 · 輸入</div>
              <div class="d-flex flex-column gap-4">
                <!-- 單行：示範與複製鈕垂直置中 -->
                <div class="row g-3 g-lg-4 align-items-center">
                  <div class="col-12 col-md-5 col-lg-4">
                    <div class="d-flex flex-column gap-0">
                      <label
                        class="my-color-gray-1 my-font-sm-400 mb-0"
                        for="design-input-md-on"
                      >
                        輸入（啟用）
                      </label>
                      <input
                        id="design-input-md-on"
                        type="text"
                        class="form-control my-input-md rounded-2 w-100"
                        placeholder="單行輸入"
                        autocomplete="off"
                      >
                    </div>
                  </div>
                  <div class="col-12 col-md d-flex align-items-center">
                    <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100">
                      <code
                        class="user-select-all my-font-sm-400 d-block w-100 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white"
                      >
                        form-control my-input-md rounded-2
                      </code>
                      <DesignPageCopyBtn
                        class="flex-shrink-0 ms-auto"
                        text="form-control my-input-md rounded-2"
                        :on-light-bg="false"
                      />
                    </div>
                  </div>
                </div>
                <div class="row g-3 g-lg-4 align-items-center">
                  <div class="col-12 col-md-5 col-lg-4">
                    <div class="d-flex flex-column gap-0">
                      <label
                        class="my-color-gray-1 my-font-sm-400 mb-0"
                        for="design-input-md-off"
                      >
                        輸入（停用）
                      </label>
                      <input
                        id="design-input-md-off"
                        type="text"
                        class="form-control my-input-md rounded-2 w-100"
                        value="示範文字"
                        readonly
                        autocomplete="off"
                      >
                    </div>
                  </div>
                  <div class="col-12 col-md d-flex align-items-center">
                    <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100">
                      <code
                        class="user-select-all my-font-sm-400 d-block w-100 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white"
                      >
                        form-control my-input-md rounded-2 · readonly
                      </code>
                      <DesignPageCopyBtn
                        class="flex-shrink-0 ms-auto"
                        text="form-control my-input-md rounded-2 readonly"
                        :on-light-bg="false"
                      />
                    </div>
                  </div>
                </div>
                <!-- 多行：頂端對齊，複製鈕與 class 區與 textarea 同高起點 -->
                <div class="row g-3 g-lg-4 align-items-start">
                  <div class="col-12 col-lg-5 col-xl-4">
                    <div class="d-flex flex-column gap-0">
                      <label
                        class="my-color-gray-1 my-font-sm-400 mb-0"
                        for="design-textarea-md-on"
                      >
                        輸入區塊（啟用）
                      </label>
                      <textarea
                        id="design-textarea-md-on"
                        class="form-control my-input-md rounded-2 w-100"
                        rows="4"
                        placeholder="多行輸入"
                      ></textarea>
                    </div>
                  </div>
                  <div class="col-12 col-lg d-flex align-items-start">
                    <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100 align-items-start">
                      <code
                        class="user-select-all my-font-sm-400 d-block w-100 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white"
                      >
                        textarea · form-control my-input-md rounded-2
                      </code>
                      <DesignPageCopyBtn
                        class="flex-shrink-0 ms-auto align-self-start"
                        text="textarea form-control my-input-md rounded-2"
                        :on-light-bg="false"
                      />
                    </div>
                  </div>
                </div>
                <div class="row g-3 g-lg-4 align-items-start">
                  <div class="col-12 col-lg-5 col-xl-4">
                    <div class="d-flex flex-column gap-0">
                      <label
                        class="my-color-gray-1 my-font-sm-400 mb-0"
                        for="design-textarea-md-off"
                      >
                        輸入區塊（停用）
                      </label>
                      <textarea
                        id="design-textarea-md-off"
                        class="form-control my-input-md rounded-2 w-100"
                        rows="4"
                        readonly
                      >示範多行文字（停用，可選取複製）</textarea>
                    </div>
                  </div>
                  <div class="col-12 col-lg d-flex align-items-start">
                    <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100 align-items-start">
                      <code
                        class="user-select-all my-font-sm-400 d-block w-100 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white"
                      >
                        textarea · form-control my-input-md rounded-2 · readonly
                      </code>
                      <DesignPageCopyBtn
                        class="flex-shrink-0 ms-auto align-self-start"
                        text="textarea form-control my-input-md rounded-2 readonly"
                        :on-light-bg="false"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- ===== 07 · 分頁 =====
               外殼 my-bgcolor-gray-3；分頁列 my-rag-tabs-bar my-bgcolor-gray-4（與全站 canvas）；其下說明區與章節灰底一致。ul.nav-tabs.w-100、justify-content:center（common）、選中 --my-color-black 底線 2pt；黑底稿另見 my-rag-tabs-bar--design。 -->
          <section class="my-page-block-spacing">
            <div class="rounded-4 my-bgcolor-gray-3 overflow-hidden mb-4">
              <div class="px-3 px-lg-4 py-3">
                <div role="heading" aria-level="2" class="my-font-lg-600 my-color-black text-break mb-0">07 · 分頁</div>
              </div>
              <div class="flex-shrink-0 w-100 my-rag-tabs-bar my-bgcolor-gray-4">
                <div class="d-flex justify-content-center w-100 align-items-center">
                  <ul class="nav nav-tabs w-100">
                    <li class="nav-item">
                      <div role="tab" class="nav-link d-flex align-items-center gap-1 active" aria-current="page">
                        <span class="flex-grow-1 text-start pe-2">分頁1</span>
                        <button
                          type="button"
                          disabled
                          class="btn btn-link text-decoration-none my-tab-nav-action-btn my-color-gray-4 pe-2"
                          title="重新命名分頁（示範，無功能）"
                        >
                          <i class="fa-solid fa-pen" aria-hidden="true"></i>
                        </button>
                        <button
                          type="button"
                          disabled
                          class="btn btn-link text-decoration-none my-tab-nav-action-btn my-color-gray-4"
                          title="刪除此出題單元（示範，無功能）"
                        >
                          <i class="fa-solid fa-xmark" aria-hidden="true"></i>
                        </button>
                      </div>
                    </li>
                    <li class="nav-item">
                      <div role="tab" class="nav-link d-flex align-items-center gap-1">
                        <span class="flex-grow-1 text-start pe-2">分頁2</span>
                        <!-- 未選分頁不顯示筆／刪除時不佔寬（與建立測驗題庫頁一致） -->
                        <span
                          class="d-inline-flex justify-content-center align-items-center flex-shrink-0 my-tab-nav-action-btn"
                          title="試卷用題庫"
                          role="img"
                        >
                          <span
                            class="rounded-circle d-inline-block my-bgcolor-blue"
                            style="width: 0.5rem; height: 0.5rem"
                          />
                        </span>
                      </div>
                    </li>
                    <li class="nav-item d-flex align-items-center ms-2">
                      <button
                        type="button"
                        class="btn rounded-circle d-flex justify-content-center align-items-center my-font-md-400 my-button-transparent-borderless my-btn-circle mb-2"
                        title="新增分頁（示範，無功能）"
                        aria-label="新增分頁（示範，無功能）"
                        @click.prevent
                      >
                        <i class="fa-solid fa-plus" aria-hidden="true"></i>
                      </button>
                    </li>
                  </ul>
                </div>
              </div>
              <div class="px-3 px-lg-4 py-3">
                <div class="my-font-sm-400 d-flex flex-column gap-3">
                  <div class="d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-2 gap-md-3 w-100">
                    <span class="my-color-gray-4 flex-shrink-0 my-font-sm-400">分頁列底（gray-4）</span>
                    <div class="my-design-swatch-row my-bgcolor-black min-w-0 flex-grow-1">
                      <code
                        class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white"
                        >flex-shrink-0 w-100 my-rag-tabs-bar my-bgcolor-gray-4</code>
                      <DesignPageCopyBtn
                      class="flex-shrink-0 ms-auto"
                      text="flex-shrink-0 w-100 my-rag-tabs-bar my-bgcolor-gray-4"
                      :on-light-bg="false"/>
                    </div>
                  </div>
                  <div class="d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-2 gap-md-3 w-100">
                    <span class="my-color-gray-4 flex-shrink-0 my-font-sm-400">內層置中列</span>
                    <div class="my-design-swatch-row my-bgcolor-black min-w-0 flex-grow-1">
                      <code
                        class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white"
                        >d-flex justify-content-center w-100 px-4 align-items-center</code>
                      <DesignPageCopyBtn
                      class="flex-shrink-0 ms-auto"
                      text="d-flex justify-content-center w-100 px-4 align-items-center"
                      :on-light-bg="false"/>
                    </div>
                  </div>
                  <div class="d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-2 gap-md-3 w-100">
                    <span class="my-color-gray-4 flex-shrink-0 my-font-sm-400">結構</span>
                    <div class="my-design-swatch-row my-bgcolor-black min-w-0 flex-grow-1">
                      <code
                        class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white"
                        >ul.nav.nav-tabs.w-100 · li.nav-item · .nav-link（px-3 py-2）.active</code>
                      <DesignPageCopyBtn
                      class="flex-shrink-0 ms-auto"
                      text="nav nav-tabs w-100"
                      :on-light-bg="false"/>
                    </div>
                  </div>
                  <div class="d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-2 gap-md-3 w-100">
                    <span class="my-color-gray-4 flex-shrink-0 my-font-sm-400">筆／刪除（僅當前分頁）</span>
                    <div class="my-design-swatch-row my-bgcolor-black min-w-0 flex-grow-1">
                      <code
                        class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white"
                        >btn btn-link my-tab-nav-action-btn（common：ps-1）· fa-pen · fa-xmark</code>
                      <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text="my-tab-nav-action-btn"
                      :on-light-bg="false"/>
                    </div>
                  </div>
                  <div class="d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-2 gap-md-3 w-100">
                    <span class="my-color-gray-4 flex-shrink-0 my-font-sm-400">試卷用題庫（藍點）</span>
                    <div class="my-design-swatch-row my-bgcolor-black min-w-0 flex-grow-1">
                      <code
                        class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white"
                        >rounded-circle d-inline-block my-bgcolor-blue（0.5rem）</code>
                      <DesignPageCopyBtn
                      class="flex-shrink-0 ms-auto"
                      text="my-bgcolor-blue"
                      :on-light-bg="false"/>
                    </div>
                  </div>
                  <div class="d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-2 gap-md-3 w-100">
                    <span class="my-color-gray-4 flex-shrink-0 my-font-sm-400">新增分頁（32×32 rounded-circle · my-btn-circle · fa-plus；建立中為全螢幕 LoadingOverlay）</span>
                    <div class="my-design-swatch-row my-bgcolor-black min-w-0 flex-grow-1">
                      <code
                        class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white"
                        >btn rounded-circle d-flex justify-content-center align-items-center my-font-md-400 my-button-transparent-borderless my-btn-circle mb-2</code>
                      <DesignPageCopyBtn
                      class="flex-shrink-0 ms-auto"
                      text="btn rounded-circle d-flex justify-content-center align-items-center my-font-md-400 my-button-transparent-borderless my-btn-circle mb-2"
                      :on-light-bg="false"/>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- ===== 08 · 表格 =====
               外層捲動框 + Bootstrap table；表頭／儲存格內距 px-3 py-2；輔助欄 my-color-gray-4。
               進階表頭樣式見 common .my-table（本示範為輕量版）。 -->
          <section class="my-page-block-spacing">
            <div class="rounded-4 my-bgcolor-gray-3 p-4 mb-5">
            <div role="heading" aria-level="2" class="my-font-lg-600 my-color-black text-break mb-4">08 · 表格</div>
                <div class="rounded-4 overflow-auto border">
                  <table class="table table-striped table-hover my-font-md-400 mb-0">
                    <thead>
                      <tr>
                        <th class="my-font-md-600 px-3 py-2" scope="col">項目</th>
                        <th class="my-font-md-600 px-3 py-2" scope="col">說明</th>
                        <th class="my-font-md-600 text-end px-3 py-2" scope="col">數量</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td class="my-font-md-400 px-3 py-2">範例列 A</td>
                        <td class="my-font-md-400 my-color-gray-4 px-3 py-2">輔助欄位</td>
                        <td class="my-font-md-400 text-end px-3 py-2">12</td>
                      </tr>
                      <tr>
                        <td class="my-font-md-400 px-3 py-2">範例列 B</td>
                        <td class="my-font-md-400 my-color-gray-4 px-3 py-2">輔助欄位</td>
                        <td class="my-font-md-400 text-end px-3 py-2">3</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div class="my-font-sm-400 d-flex flex-column gap-3 mt-3">
                  <div class="d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-2 gap-md-3 w-100">
                    <span class="my-color-gray-4 flex-shrink-0 my-font-sm-400">外層捲動框</span>
                    <div class="my-design-swatch-row my-bgcolor-black min-w-0 flex-grow-1">
                      <code
                        class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white"
                        >rounded-4 overflow-auto border</code>
                      <DesignPageCopyBtn
                      class="flex-shrink-0 ms-auto"
                      text="rounded-4 overflow-auto border"
                      :on-light-bg="false"/>
                    </div>
                  </div>
                  <div class="d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-2 gap-md-3 w-100">
                    <span class="my-color-gray-4 flex-shrink-0 my-font-sm-400">表格</span>
                    <div class="my-design-swatch-row my-bgcolor-black min-w-0 flex-grow-1">
                      <code
                        class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white"
                        >table table-striped table-hover mb-0</code>
                      <DesignPageCopyBtn
                      class="flex-shrink-0 ms-auto"
                      text="table table-striped table-hover mb-0"
                      :on-light-bg="false"/>
                    </div>
                  </div>
                  <div class="d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-2 gap-md-3 w-100">
                    <span class="my-color-gray-4 flex-shrink-0 my-font-sm-400">表頭／儲存格</span>
                    <div class="my-design-swatch-row my-bgcolor-black min-w-0 flex-grow-1">
                      <code
                        class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white"
                        >px-3 py-2</code>
                      <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text="px-3 py-2"
                      :on-light-bg="false"/>
                    </div>
                  </div>
                  <div class="d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-2 gap-md-3 w-100">
                    <span class="my-color-gray-4 flex-shrink-0 my-font-sm-400">輔助字色</span>
                    <div class="my-design-swatch-row my-bgcolor-black min-w-0 flex-grow-1">
                      <code
                        class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white"
                        >my-color-gray-4</code>
                      <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text="my-color-gray-4"
                      :on-light-bg="false"/>
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
