<script setup>
import { ref } from 'vue';
import DesignPageCopyBtn from '../components/DesignPageCopyBtn.vue';
defineProps({
  tabId: { type: String, default: '' },
});

const designSampleChoice = ref('選項一');

const designTabActiveId = ref('design-tab-1');
const designTabRagItems = ref([
  { _tabId: 'design-tab-1', _label: '分頁甲' },
  { _tabId: 'design-tab-2', _label: '分頁乙', _isExamRag: true },
]);
const designTabNewItems = ref([]);

function onDesignTabAdd() {
  const id = `design-new-${Date.now()}`;
  designTabNewItems.value.push({ id, label: '新分頁' });
  designTabActiveId.value = id;
}

function onDesignTabDelete(tabId) {
  designTabNewItems.value = designTabNewItems.value.filter((t) => t.id !== tabId);
  designTabRagItems.value = designTabRagItems.value.filter((t) => t._tabId !== tabId);
  if (designTabActiveId.value === tabId) {
    const firstRag = designTabRagItems.value[0];
    const firstNew = designTabNewItems.value[0];
    designTabActiveId.value = firstRag?._tabId ?? firstNew?.id ?? null;
  }
}

function onDesignTabRename(tabId) {
  const rag = designTabRagItems.value.find((t) => t._tabId === tabId);
  if (rag) {
    const name = window.prompt('分頁名稱', rag._label);
    if (name != null && name.trim()) rag._label = name.trim();
    return;
  }
  const neu = designTabNewItems.value.find((t) => t.id === tabId);
  if (neu) {
    const name = window.prompt('分頁名稱', neu.label);
    if (name != null && name.trim()) neu.label = name.trim();
  }
}
</script>

<template>
  <!--
    DesignPage｜UI 元件參考（稿）
    - 根層：全高 flex 直向、黑底（my-bgcolor-black）；頂部固定、下方主區可捲動。
    - 內容寬：container-fluid + row 置中，欄寬上限 col-xl-10／col-xxl-8（與頂欄一致）。
    - 章節：各 <section> 使用 my-page-block-spacing；深灰內容塊多為 my-bgcolor-gray-dark rounded-4 p-3 p-lg-4 mb-4。
    - 複製：DesignPageCopyBtn 為 32px 圓形白無框（my-btn-circle + my-button-white-borderless）；淺底色票加 on-light-bg。
    - 編號：05 區塊內含「08 · 下拉選單」（視覺緊接在按鈕示範下方）；其後為 06 分頁（深灰 rounded-4 塊內含黑底分頁列，同 create-test-bank_design 元件）、07 表格。
  -->
  <div class="h-100 d-flex flex-column overflow-hidden my-bgcolor-black">
    <!-- 頁首：稿名，不隨內文捲動 -->
    <header class="flex-shrink-0 my-bgcolor-black py-3 px-3 px-md-4">
      <div class="container-fluid px-0">
        <div class="row justify-content-center">
          <div class="col-12 col-xl-10 col-xxl-8">
            <p class="my-font-xl-600 my-color-white text-break mb-0">UI 元件參考</p>
          </div>
        </div>
      </div>
    </header>

    <!-- 主內文：overflow-auto 僅此層捲動 -->
    <div class="flex-grow-1 overflow-auto">
      <div class="container-fluid px-3 px-md-4 py-4">
        <div class="row justify-content-center">
          <!-- 與 header 同寬上限，避免寬螢過長一行 -->
          <div class="col-12 col-xl-10 col-xxl-8">

          <!-- ===== 01 · 字階 =====
               common：.my-font-{xl|lg|md|sm}-{400|600}；左欄字重 400、右欄 600；<dl> 示範語意結構 -->
          <section class="my-page-block-spacing">
            <h2 class="my-font-lg-600 my-color-white text-break mb-3">01 · 字階</h2>
            <div class="my-bgcolor-gray-dark rounded-4 p-3 p-lg-4 mb-4">
                <div class="row g-4 align-items-start">
                  <div class="col-12 col-md-6">
                    <dl class="mb-0">
                      <div class="d-flex flex-column gap-1 pb-3 mb-3">
                        <dt class="my-font-xl-400 my-color-white">第一級 · 一般</dt>
                        <dd class="my-font-sm-400 d-flex align-items-center gap-2 w-100 mb-0">
                          <span class="font-monospace my-color-white text-break flex-grow-1 min-w-0">.my-font-xl-400</span>
                          <DesignPageCopyBtn class="ms-auto" text=".my-font-xl-400" />
                        </dd>
                      </div>
                      <div class="d-flex flex-column gap-1 pb-3 mb-3">
                        <dt class="my-font-lg-400 my-color-white">第二級 · 一般</dt>
                        <dd class="my-font-sm-400 d-flex align-items-center gap-2 w-100 mb-0">
                          <span class="font-monospace my-color-white text-break flex-grow-1 min-w-0">.my-font-lg-400</span>
                          <DesignPageCopyBtn class="ms-auto" text=".my-font-lg-400" />
                        </dd>
                      </div>
                      <div class="d-flex flex-column gap-1 pb-3 mb-3">
                        <dt class="my-font-md-400 my-color-white">第三級 · 一般</dt>
                        <dd class="my-font-sm-400 d-flex align-items-center gap-2 w-100 mb-0">
                          <span class="font-monospace my-color-white text-break flex-grow-1 min-w-0">.my-font-md-400</span>
                          <DesignPageCopyBtn class="ms-auto" text=".my-font-md-400" />
                        </dd>
                      </div>
                      <div class="d-flex flex-column gap-1">
                        <dt class="my-font-sm-400 my-color-white">第四級 · 一般</dt>
                        <dd class="my-font-sm-400 d-flex align-items-center gap-2 w-100 mb-0">
                          <span class="font-monospace my-color-white text-break flex-grow-1 min-w-0">.my-font-sm-400</span>
                          <DesignPageCopyBtn class="ms-auto" text=".my-font-sm-400" />
                        </dd>
                      </div>
                    </dl>
                  </div>
                  <div class="col-12 col-md-6">
                    <dl class="mb-0">
                      <div class="d-flex flex-column gap-1 pb-3 mb-3">
                        <dt class="my-font-xl-600 my-color-white">第一級 · 強調</dt>
                        <dd class="my-font-sm-400 d-flex align-items-center gap-2 w-100 mb-0">
                          <span class="font-monospace my-color-white text-break flex-grow-1 min-w-0">.my-font-xl-600</span>
                          <DesignPageCopyBtn class="ms-auto" text=".my-font-xl-600" />
                        </dd>
                      </div>
                      <div class="d-flex flex-column gap-1 pb-3 mb-3">
                        <dt class="my-font-lg-600 my-color-white">第二級 · 強調</dt>
                        <dd class="my-font-sm-400 d-flex align-items-center gap-2 w-100 mb-0">
                          <span class="font-monospace my-color-white text-break flex-grow-1 min-w-0">.my-font-lg-600</span>
                          <DesignPageCopyBtn class="ms-auto" text=".my-font-lg-600" />
                        </dd>
                      </div>
                      <div class="d-flex flex-column gap-1 pb-3 mb-3">
                        <dt class="my-font-md-600 my-color-white">第三級 · 強調</dt>
                        <dd class="my-font-sm-400 d-flex align-items-center gap-2 w-100 mb-0">
                          <span class="font-monospace my-color-white text-break flex-grow-1 min-w-0">.my-font-md-600</span>
                          <DesignPageCopyBtn class="ms-auto" text=".my-font-md-600" />
                        </dd>
                      </div>
                      <div class="d-flex flex-column gap-1">
                        <dt class="my-font-sm-600 my-color-white">第四級 · 強調</dt>
                        <dd class="my-font-sm-400 d-flex align-items-center gap-2 w-100 mb-0">
                          <span class="font-monospace my-color-white text-break flex-grow-1 min-w-0">.my-font-sm-600</span>
                          <DesignPageCopyBtn class="ms-auto" text=".my-font-sm-600" />
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>
            </div>
          </section>

          <!-- ===== 02 · 語意色 =====
               紅／黃／綠／藍：每列左 my-bgcolor-*、右 my-color-*（深灰底上字色）；
               黃底等淺色票上的複製鈕需 on-light-bg -->
          <section class="my-page-block-spacing">
            <h2 class="my-font-lg-600 my-color-white text-break mb-3">02 · 語意色</h2>
            <div class="my-bgcolor-gray-dark rounded-4 p-3 p-lg-4 mb-4">
                <div class="row g-3">
                  <div class="col-12">
                    <div class="row g-2">
                      <div class="col-12 col-md-6">
                        <div
                          class="d-flex align-items-center gap-2 flex-wrap w-100 my-font-sm-400 rounded-3 text-center my-bgcolor-red my-color-white h-100 p-3"
                        >
                          <code class="font-monospace text-break text-center flex-grow-1 min-w-0 px-1">.my-bgcolor-red</code>
                          <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text=".my-bgcolor-red" />
                        </div>
                      </div>
                      <div class="col-12 col-md-6">
                        <div
                          class="d-flex align-items-center gap-2 flex-wrap w-100 my-font-sm-400 rounded-3 text-center my-bgcolor-gray-dark my-color-red h-100 p-3"
                        >
                          <code class="font-monospace text-break text-center flex-grow-1 min-w-0 px-1">.my-color-red</code>
                          <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text=".my-color-red" />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="col-12">
                    <div class="row g-2">
                      <div class="col-12 col-md-6">
                        <div
                          class="d-flex align-items-center gap-2 flex-wrap w-100 my-font-sm-400 rounded-3 text-center my-bgcolor-yellow my-color-black h-100 p-3"
                        >
                          <code class="font-monospace text-break text-center flex-grow-1 min-w-0 my-color-black px-1">.my-bgcolor-yellow</code>
                          <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text=".my-bgcolor-yellow" on-light-bg />
                        </div>
                      </div>
                      <div class="col-12 col-md-6">
                        <div
                          class="d-flex align-items-center gap-2 flex-wrap w-100 my-font-sm-400 rounded-3 text-center my-bgcolor-gray-dark my-color-yellow h-100 p-3"
                        >
                          <code class="font-monospace text-break text-center flex-grow-1 min-w-0 px-1">.my-color-yellow</code>
                          <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text=".my-color-yellow" />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="col-12">
                    <div class="row g-2">
                      <div class="col-12 col-md-6">
                        <div
                          class="d-flex align-items-center gap-2 flex-wrap w-100 my-font-sm-400 rounded-3 text-center my-bgcolor-green my-color-white h-100 p-3"
                        >
                          <code class="font-monospace text-break text-center flex-grow-1 min-w-0 px-1">.my-bgcolor-green</code>
                          <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text=".my-bgcolor-green" />
                        </div>
                      </div>
                      <div class="col-12 col-md-6">
                        <div
                          class="d-flex align-items-center gap-2 flex-wrap w-100 my-font-sm-400 rounded-3 text-center my-bgcolor-gray-dark my-color-green h-100 p-3"
                        >
                          <code class="font-monospace text-break text-center flex-grow-1 min-w-0 px-1">.my-color-green</code>
                          <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text=".my-color-green" />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="col-12">
                    <div class="row g-2">
                      <div class="col-12 col-md-6">
                        <div
                          class="d-flex align-items-center gap-2 flex-wrap w-100 my-font-sm-400 rounded-3 text-center my-bgcolor-blue my-color-white h-100 p-3"
                        >
                          <code class="font-monospace text-break text-center flex-grow-1 min-w-0 px-1">.my-bgcolor-blue</code>
                          <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text=".my-bgcolor-blue" />
                        </div>
                      </div>
                      <div class="col-12 col-md-6">
                        <div
                          class="d-flex align-items-center gap-2 flex-wrap w-100 my-font-sm-400 rounded-3 text-center my-bgcolor-gray-dark my-color-blue h-100 p-3"
                        >
                          <code class="font-monospace text-break text-center flex-grow-1 min-w-0 px-1">.my-color-blue</code>
                          <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text=".my-color-blue" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
            </div>
          </section>

          <!-- ===== 03 · 灰階 · 背景 =====
               中性色 my-bgcolor-* / my-color-*；淺灰底（my-bgcolor-gray-light、my-bgcolor-white）上複製鈕用 on-light-bg -->
          <section class="my-page-block-spacing">
            <h2 class="my-font-lg-600 my-color-white text-break mb-3">03 · 灰階 · 背景</h2>
            <div class="my-bgcolor-gray-dark rounded-4 p-3 p-lg-4 mb-4">
                <div class="row g-3">
                  <div class="col-12">
                    <div class="row g-2">
                      <div class="col-12 col-md-6">
                        <div
                          class="d-flex align-items-center gap-2 flex-wrap w-100 my-font-sm-400 rounded-3 text-center my-bgcolor-black my-color-white h-100 p-3"
                        >
                          <code class="font-monospace text-break text-center flex-grow-1 min-w-0 px-1">.my-bgcolor-black</code>
                          <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text=".my-bgcolor-black" />
                        </div>
                      </div>
                      <div class="col-12 col-md-6">
                        <div
                          class="d-flex align-items-center gap-2 flex-wrap w-100 my-font-sm-400 rounded-3 text-center my-bgcolor-black my-color-white h-100 p-3"
                        >
                          <code class="font-monospace text-break text-center flex-grow-1 min-w-0 px-1">.my-color-white</code>
                          <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text=".my-color-white" />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="col-12">
                    <div class="row g-2">
                      <div class="col-12 col-md-6">
                        <div
                          class="d-flex align-items-center gap-2 flex-wrap w-100 my-font-sm-400 rounded-3 text-center my-bgcolor-gray-dark my-color-white h-100 p-3"
                        >
                          <code class="font-monospace text-break text-center flex-grow-1 min-w-0 px-1">.my-bgcolor-gray-dark</code>
                          <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text=".my-bgcolor-gray-dark" />
                        </div>
                      </div>
                      <div class="col-12 col-md-6">
                        <div
                          class="d-flex align-items-center gap-2 flex-wrap w-100 my-font-sm-400 rounded-3 text-center my-bgcolor-gray-dark my-color-gray-light h-100 p-3"
                        >
                          <code class="font-monospace text-break text-center flex-grow-1 min-w-0 px-1">.my-color-gray-light</code>
                          <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text=".my-color-gray-light" />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="col-12">
                    <div class="row g-2">
                      <div class="col-12 col-md-6">
                        <div
                          class="d-flex align-items-center gap-2 flex-wrap w-100 my-font-sm-400 rounded-3 text-center my-bgcolor-gray-light my-color-black h-100 p-3"
                        >
                          <code class="font-monospace text-break text-center flex-grow-1 min-w-0 my-color-black px-1">.my-bgcolor-gray-light</code>
                          <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text=".my-bgcolor-gray-light" on-light-bg />
                        </div>
                      </div>
                      <div class="col-12 col-md-6">
                        <div
                          class="d-flex align-items-center gap-2 flex-wrap w-100 my-font-sm-400 rounded-3 text-center my-bgcolor-gray-light my-color-gray-dark h-100 p-3"
                        >
                          <code class="font-monospace text-break text-center flex-grow-1 min-w-0 px-1">.my-color-gray-dark</code>
                          <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text=".my-color-gray-dark" on-light-bg />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="col-12">
                    <div class="row g-2">
                      <div class="col-12 col-md-6">
                        <div
                          class="d-flex align-items-center gap-2 flex-wrap w-100 my-font-sm-400 rounded-3 text-center my-bgcolor-white my-color-black h-100 p-3"
                        >
                          <code class="font-monospace text-break text-center flex-grow-1 min-w-0 my-color-black px-1">.my-bgcolor-white</code>
                          <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text=".my-bgcolor-white" on-light-bg />
                        </div>
                      </div>
                      <div class="col-12 col-md-6">
                        <div
                          class="d-flex align-items-center gap-2 flex-wrap w-100 my-font-sm-400 rounded-3 text-center my-bgcolor-white my-color-black h-100 p-3"
                        >
                          <code class="font-monospace text-break text-center flex-grow-1 min-w-0 my-color-black px-1">.my-color-black</code>
                          <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text=".my-color-black" on-light-bg />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
            </div>
          </section>

          <!-- ===== 04 · 區塊定義 =====
               稿頁深灰內容區外層建議 class 字串（與業務頁淺底 my-bgcolor-page-block 分開說明） -->
          <section class="my-page-block-spacing">
            <h2 class="my-font-lg-600 my-color-white text-break mb-3">04 · 區塊定義</h2>
            <div class="my-bgcolor-gray-dark rounded-4 p-3 p-lg-4 mb-4">
                <div class="my-font-sm-400 d-flex flex-column gap-3">
                  <div class="d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-2 gap-md-3 w-100">
                    <code
                      class="user-select-all my-font-sm-400 font-monospace my-color-gray-light text-break flex-grow-1 min-w-0 rounded-2 my-bgcolor-black p-2"
                      >my-bgcolor-gray-dark rounded-4 p-3 p-lg-4 mb-4</code>
                    <DesignPageCopyBtn class="align-self-end align-self-md-center ms-auto" text="my-bgcolor-gray-dark rounded-4 p-3 p-lg-4 mb-4" />
                  </div>
                </div>
            </div>
          </section>

          <!-- ===== 05 · 按鈕 + 08 · 下拉選單（同一 section） =====
               按鈕：小／中／大三組；每組 藍（my-button-blue）／白描邊／白無框；中號另附兩鍵 btn-group + my-btn-group-pill。
               圓形：分頁「+」與複製鈕同規 my-btn-circle + my-button-white-borderless。
               08 下拉：緊接於此深底區塊下；觸發鈕僅示範「中」字級（my-font-md-400 · px-3 py-2）之藍底與白無框；選單 my-dropdown-menu。 -->
          <section class="my-page-block-spacing">
            <h2 class="my-font-lg-600 my-color-white text-break mb-3">05 · 按鈕</h2>
            <div class="my-bgcolor-gray-dark rounded-4 p-3 p-lg-4 mb-4">
                <div class="d-flex flex-column gap-4">
                  <!-- 小：字級 my-font-sm-400、內距 px-3 py-1 -->
                  <div>
                    <div class="my-color-gray-light small mb-2">小（my-font-sm-400 · px-3 py-1）</div>
                    <div class="d-flex flex-column gap-3">
                      <div class="d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-2 gap-md-3 w-100">
                        <button
                          type="button"
                          class="btn rounded-pill d-flex justify-content-center align-items-center my-font-sm-400 my-button-blue flex-shrink-0 px-3 py-1"
                        >
                          藍色
                        </button>
                        <code
                          class="user-select-all my-font-sm-400 font-monospace my-color-gray-light text-break flex-grow-1 min-w-0 rounded-2 my-bgcolor-black p-2"
                          >btn rounded-pill d-flex justify-content-center align-items-center my-font-sm-400 my-button-blue px-3 py-1</code>
                        <DesignPageCopyBtn
                          class="align-self-end align-self-md-center ms-auto"
                          text="btn rounded-pill d-flex justify-content-center align-items-center my-font-sm-400 my-button-blue px-3 py-1"
                        />
                      </div>
                      <div class="d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-2 gap-md-3 w-100">
                        <button
                          type="button"
                          class="btn rounded-pill d-flex justify-content-center align-items-center my-font-sm-400 my-button-white-border flex-shrink-0 px-3 py-1"
                        >
                          白描邊
                        </button>
                        <code
                          class="user-select-all my-font-sm-400 font-monospace my-color-gray-light text-break flex-grow-1 min-w-0 rounded-2 my-bgcolor-black p-2"
                          >btn rounded-pill d-flex justify-content-center align-items-center my-font-sm-400 my-button-white-border px-3 py-1</code>
                        <DesignPageCopyBtn
                          class="align-self-end align-self-md-center ms-auto"
                          text="btn rounded-pill d-flex justify-content-center align-items-center my-font-sm-400 my-button-white-border px-3 py-1"
                        />
                      </div>
                      <div class="d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-2 gap-md-3 w-100">
                        <button
                          type="button"
                          class="btn rounded-pill d-flex justify-content-center align-items-center my-font-sm-400 my-button-white-borderless flex-shrink-0 px-3 py-1"
                        >
                          白無框
                        </button>
                        <code
                          class="user-select-all my-font-sm-400 font-monospace my-color-gray-light text-break flex-grow-1 min-w-0 rounded-2 my-bgcolor-black p-2"
                          >btn rounded-pill d-flex justify-content-center align-items-center my-font-sm-400 my-button-white-borderless px-3 py-1</code>
                        <DesignPageCopyBtn
                          class="align-self-end align-self-md-center ms-auto"
                          text="btn rounded-pill d-flex justify-content-center align-items-center my-font-sm-400 my-button-white-borderless px-3 py-1"
                        />
                      </div>
                    </div>
                  </div>
                  <!-- 中：字級 my-font-md-400、內距 px-3 py-2（全站表單／下拉觸發預設對齊此組） -->
                  <div>
                    <div class="my-color-gray-light small mb-2">中（my-font-md-400 · px-3 py-2）</div>
                    <div class="d-flex flex-column gap-3">
                      <div class="d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-2 gap-md-3 w-100">
                        <button
                          type="button"
                          class="btn rounded-pill d-flex justify-content-center align-items-center my-font-md-400 my-button-blue flex-shrink-0 px-3 py-2"
                        >
                          藍色
                        </button>
                        <code
                          class="user-select-all my-font-sm-400 font-monospace my-color-gray-light text-break flex-grow-1 min-w-0 rounded-2 my-bgcolor-black p-2"
                          >btn rounded-pill d-flex justify-content-center align-items-center my-font-md-400 my-button-blue px-3 py-2</code>
                        <DesignPageCopyBtn
                          class="align-self-end align-self-md-center ms-auto"
                          text="btn rounded-pill d-flex justify-content-center align-items-center my-font-md-400 my-button-blue px-3 py-2"
                        />
                      </div>
                      <div class="d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-2 gap-md-3 w-100">
                        <button
                          type="button"
                          class="btn rounded-pill d-flex justify-content-center align-items-center my-font-md-400 my-button-white-border flex-shrink-0 px-3 py-2"
                        >
                          白描邊
                        </button>
                        <code
                          class="user-select-all my-font-sm-400 font-monospace my-color-gray-light text-break flex-grow-1 min-w-0 rounded-2 my-bgcolor-black p-2"
                          >btn rounded-pill d-flex justify-content-center align-items-center my-font-md-400 my-button-white-border px-3 py-2</code>
                        <DesignPageCopyBtn
                          class="align-self-end align-self-md-center ms-auto"
                          text="btn rounded-pill d-flex justify-content-center align-items-center my-font-md-400 my-button-white-border px-3 py-2"
                        />
                      </div>
                      <div class="d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-2 gap-md-3 w-100">
                        <button
                          type="button"
                          class="btn rounded-pill d-flex justify-content-center align-items-center my-font-md-400 my-button-white-borderless flex-shrink-0 px-3 py-2"
                        >
                          白無框
                        </button>
                        <code
                          class="user-select-all my-font-sm-400 font-monospace my-color-gray-light text-break flex-grow-1 min-w-0 rounded-2 my-bgcolor-black p-2"
                          >btn rounded-pill d-flex justify-content-center align-items-center my-font-md-400 my-button-white-borderless px-3 py-2</code>
                        <DesignPageCopyBtn
                          class="align-self-end align-self-md-center ms-auto"
                          text="btn rounded-pill d-flex justify-content-center align-items-center my-font-md-400 my-button-white-borderless px-3 py-2"
                        />
                      </div>
                      <div class="my-color-gray-light small mb-2">兩鍵群組（btn-group · my-btn-group-pill · 中）</div>
                      <div class="d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-2 gap-md-3 w-100">
                        <div
                          class="btn-group my-btn-group-pill flex-shrink-0"
                          role="group"
                          aria-label="示範：兩鍵群組（中）"
                        >
                          <button
                            type="button"
                            class="btn d-flex justify-content-center align-items-center my-font-md-400 my-button-blue px-3 py-2"
                          >
                            選項甲
                          </button>
                          <button
                            type="button"
                            class="btn d-flex justify-content-center align-items-center my-font-md-400 my-button-white-border px-3 py-2"
                          >
                            選項乙
                          </button>
                        </div>
                        <code
                          class="user-select-all my-font-sm-400 font-monospace my-color-gray-light text-break flex-grow-1 min-w-0 rounded-2 my-bgcolor-black p-2"
                          >btn-group my-btn-group-pill · btn … my-font-md-400 my-button-blue px-3 py-2 · btn … my-button-white-border px-3 py-2</code>
                        <DesignPageCopyBtn
                          class="align-self-end align-self-md-center ms-auto"
                          text="btn-group my-btn-group-pill btn my-font-md-400 my-button-blue px-3 py-2 btn my-font-md-400 my-button-white-border px-3 py-2"
                        />
                      </div>
                    </div>
                  </div>
                  <!-- 大：字級同中、內距 px-4 py-3 -->
                  <div>
                    <div class="my-color-gray-light small mb-2">大（my-font-md-400 · px-4 py-3）</div>
                    <div class="d-flex flex-column gap-3">
                      <div class="d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-2 gap-md-3 w-100">
                        <button
                          type="button"
                          class="btn rounded-pill d-flex justify-content-center align-items-center my-font-md-400 my-button-blue flex-shrink-0 px-4 py-3"
                        >
                          藍色
                        </button>
                        <code
                          class="user-select-all my-font-sm-400 font-monospace my-color-gray-light text-break flex-grow-1 min-w-0 rounded-2 my-bgcolor-black p-2"
                          >btn rounded-pill d-flex justify-content-center align-items-center my-font-md-400 my-button-blue px-4 py-3</code>
                        <DesignPageCopyBtn
                          class="align-self-end align-self-md-center ms-auto"
                          text="btn rounded-pill d-flex justify-content-center align-items-center my-font-md-400 my-button-blue px-4 py-3"
                        />
                      </div>
                      <div class="d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-2 gap-md-3 w-100">
                        <button
                          type="button"
                          class="btn rounded-pill d-flex justify-content-center align-items-center my-font-md-400 my-button-white-border flex-shrink-0 px-4 py-3"
                        >
                          白描邊
                        </button>
                        <code
                          class="user-select-all my-font-sm-400 font-monospace my-color-gray-light text-break flex-grow-1 min-w-0 rounded-2 my-bgcolor-black p-2"
                          >btn rounded-pill d-flex justify-content-center align-items-center my-font-md-400 my-button-white-border px-4 py-3</code>
                        <DesignPageCopyBtn
                          class="align-self-end align-self-md-center ms-auto"
                          text="btn rounded-pill d-flex justify-content-center align-items-center my-font-md-400 my-button-white-border px-4 py-3"
                        />
                      </div>
                      <div class="d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-2 gap-md-3 w-100">
                        <button
                          type="button"
                          class="btn rounded-pill d-flex justify-content-center align-items-center my-font-md-400 my-button-white-borderless flex-shrink-0 px-4 py-3"
                        >
                          白無框
                        </button>
                        <code
                          class="user-select-all my-font-sm-400 font-monospace my-color-gray-light text-break flex-grow-1 min-w-0 rounded-2 my-bgcolor-black p-2"
                          >btn rounded-pill d-flex justify-content-center align-items-center my-font-md-400 my-button-white-borderless px-4 py-3</code>
                        <DesignPageCopyBtn
                          class="align-self-end align-self-md-center ms-auto"
                          text="btn rounded-pill d-flex justify-content-center align-items-center my-font-md-400 my-button-white-borderless px-4 py-3"
                        />
                      </div>
                    </div>
                  </div>
                  <!-- 圓形圖示鈕：32×32，與建立測驗題庫分頁「+」／ExamPage 新增分頁同規 -->
                  <div>
                    <div class="my-color-gray-light small mb-2">圓形白無框（md · my-btn-circle · 例：fa-plus）</div>
                    <div class="d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-2 gap-md-3 w-100">
                      <button
                        type="button"
                        class="btn rounded-circle d-flex justify-content-center align-items-center my-font-md-400 my-button-white-borderless my-btn-circle flex-shrink-0"
                        aria-label="圓形白無框（範例圖示 fa-plus）"
                      >
                        <i class="fa-solid fa-plus" aria-hidden="true"></i>
                      </button>
                      <code
                        class="user-select-all my-font-sm-400 font-monospace my-color-gray-light text-break flex-grow-1 min-w-0 rounded-2 my-bgcolor-black p-2"
                        >btn rounded-circle d-flex justify-content-center align-items-center my-font-md-400 my-button-white-borderless my-btn-circle</code>
                      <DesignPageCopyBtn
                        class="align-self-end align-self-md-center ms-auto"
                        text="btn rounded-circle d-flex justify-content-center align-items-center my-font-md-400 my-button-white-borderless my-btn-circle"
                      />
                    </div>
                  </div>
                </div>
            </div>

            <!-- 08 · 下拉選單（仍屬 05 同一 section；獨立深底塊） -->
            <h2 class="my-font-lg-600 my-color-white text-break mb-3 mt-4">08 · 下拉選單</h2>
            <div class="my-bgcolor-gray-dark rounded-4 p-3 p-lg-4 mb-4">
              <div>
                <div class="my-color-gray-light small mb-2">中（my-font-md-400 · px-3 py-2）</div>
                <div class="d-flex flex-column gap-3">
                  <!-- 藍底觸發：designSampleChoice 綁定示範選項文字 -->
                  <div class="d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-2 gap-md-3 w-100">
                    <div class="dropdown flex-shrink-0">
                      <button
                        id="design-dd-md-blue-btn"
                        class="btn rounded-pill d-flex justify-content-between align-items-center dropdown-toggle my-dropdown-caret my-font-md-400 my-button-blue flex-shrink-0 px-3 py-2"
                        type="button"
                        data-bs-toggle="dropdown"
                        aria-expanded="false"
                      >
                        <span class="text-truncate text-start pe-2">{{ designSampleChoice }}</span>
                        <i class="fa-solid fa-chevron-down my-dropdown-toggle-caret" aria-hidden="true"></i>
                      </button>
                      <ul class="dropdown-menu my-dropdown-menu" aria-labelledby="design-dd-md-blue-btn">
                        <li>
                          <a class="dropdown-item" href="#" @click.prevent="designSampleChoice = '選項一'">選項一</a>
                        </li>
                        <li>
                          <a class="dropdown-item" href="#" @click.prevent="designSampleChoice = '選項二'">選項二</a>
                        </li>
                        <li>
                          <a class="dropdown-item" href="#" @click.prevent="designSampleChoice = '選項三'">選項三</a>
                        </li>
                      </ul>
                    </div>
                    <code
                      class="user-select-all my-font-sm-400 font-monospace my-color-gray-light text-break flex-grow-1 min-w-0 rounded-2 my-bgcolor-black p-2"
                      >btn rounded-pill d-flex justify-content-between align-items-center dropdown-toggle my-dropdown-caret my-font-md-400 my-button-blue flex-shrink-0 px-3 py-2</code>
                    <DesignPageCopyBtn
                      class="align-self-end align-self-md-center ms-auto"
                      text="btn rounded-pill d-flex justify-content-between align-items-center dropdown-toggle my-dropdown-caret my-font-md-400 my-button-blue flex-shrink-0 px-3 py-2"
                    />
                  </div>
                  <!-- 白無框觸發：同字級／內距，my-button-white-borderless -->
                  <div class="d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-2 gap-md-3 w-100">
                    <div class="dropdown flex-shrink-0">
                      <button
                        id="design-dd-md-bl-btn"
                        class="btn rounded-pill d-flex justify-content-between align-items-center dropdown-toggle my-dropdown-caret my-font-md-400 my-button-white-borderless flex-shrink-0 px-3 py-2"
                        type="button"
                        data-bs-toggle="dropdown"
                        aria-expanded="false"
                      >
                        <span class="text-truncate text-start pe-2">選項</span>
                        <i class="fa-solid fa-chevron-down my-dropdown-toggle-caret" aria-hidden="true"></i>
                      </button>
                      <ul class="dropdown-menu my-dropdown-menu" aria-labelledby="design-dd-md-bl-btn">
                        <li><a class="dropdown-item" href="#" @click.prevent>選項一</a></li>
                        <li><a class="dropdown-item" href="#" @click.prevent>選項二</a></li>
                      </ul>
                    </div>
                    <code
                      class="user-select-all my-font-sm-400 font-monospace my-color-gray-light text-break flex-grow-1 min-w-0 rounded-2 my-bgcolor-black p-2"
                      >btn rounded-pill d-flex justify-content-between align-items-center dropdown-toggle my-dropdown-caret my-font-md-400 my-button-white-borderless flex-shrink-0 px-3 py-2</code>
                    <DesignPageCopyBtn
                      class="align-self-end align-self-md-center ms-auto"
                      text="btn rounded-pill d-flex justify-content-between align-items-center dropdown-toggle my-dropdown-caret my-font-md-400 my-button-white-borderless flex-shrink-0 px-3 py-2"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- ===== 06 · 分頁 =====
               與 create-test-bank_design 相同結構，收在深灰 rounded-4 區塊內：上為黑底分頁列，下為 class 對照 -->
          <section class="my-page-block-spacing">
            <h2 class="my-font-lg-600 my-color-white text-break mb-3">06 · 分頁</h2>
            <div class="my-bgcolor-gray-dark rounded-4 overflow-hidden mb-4">
              <div class="flex-shrink-0 my-rag-tabs-bar my-rag-tabs-bar--design my-bgcolor-black border-bottom">
                <div class="d-flex justify-content-center w-100 px-4 align-items-end pb-0">
                  <template v-if="designTabRagItems.length === 0 && designTabNewItems.length === 0">
                    <div class="w-100 d-flex justify-content-center py-0">
                      <button
                        type="button"
                        class="btn rounded-circle d-flex justify-content-center align-items-center my-font-md-400 my-button-white-borderless my-btn-circle"
                        title="新增分頁"
                        aria-label="新增分頁"
                        @click="onDesignTabAdd"
                      >
                        <i class="fa-solid fa-plus" aria-hidden="true"></i>
                      </button>
                    </div>
                  </template>
                  <template v-else>
                    <ul class="nav nav-tabs border-bottom-0">
                      <li
                        v-for="item in designTabRagItems"
                        :key="'design-rag-' + item._tabId"
                        class="nav-item"
                      >
                        <div
                          role="tab"
                          class="nav-link d-flex align-items-center gap-1"
                          :class="{ active: designTabActiveId === item._tabId }"
                          :aria-current="designTabActiveId === item._tabId ? 'page' : undefined"
                        >
                          <span
                            class="flex-grow-1 text-start"
                            style="cursor: pointer"
                            @click="designTabActiveId = item._tabId"
                          >
                            {{ item._label }}
                          </span>
                          <button
                            v-if="designTabActiveId === item._tabId"
                            type="button"
                            class="btn btn-link text-decoration-none my-tab-nav-action-btn p-0 my-color-gray-light"
                            title="重新命名分頁"
                            @click.stop="onDesignTabRename(item._tabId)"
                          >
                            <i class="fa-solid fa-pen" aria-hidden="true"></i>
                          </button>
                          <span
                            v-if="item._isExamRag"
                            class="d-inline-flex justify-content-center align-items-center flex-shrink-0"
                            style="min-width: 1.25rem; line-height: 1"
                            title="試卷用題庫"
                            role="img"
                          >
                            <span
                              class="rounded-circle d-inline-block my-bgcolor-blue"
                              style="width: 0.5rem; height: 0.5rem"
                            />
                          </span>
                          <button
                            v-else-if="designTabActiveId === item._tabId"
                            type="button"
                            class="btn btn-link text-decoration-none my-tab-nav-action-btn p-0 my-color-gray-light"
                            title="刪除分頁"
                            @click.stop="onDesignTabDelete(item._tabId)"
                          >
                            <i class="fa-solid fa-xmark" aria-hidden="true"></i>
                          </button>
                        </div>
                      </li>
                      <li
                        v-for="item in designTabNewItems"
                        :key="'design-new-' + item.id"
                        class="nav-item"
                      >
                        <button
                          type="button"
                          class="nav-link"
                          :class="{ active: designTabActiveId === item.id }"
                          :aria-current="designTabActiveId === item.id ? 'page' : undefined"
                          @click="designTabActiveId = item.id"
                        >
                          {{ item.label }}
                        </button>
                      </li>
                      <li class="nav-item d-flex align-items-center ms-2">
                        <button
                          type="button"
                          title="新增分頁"
                          aria-label="新增分頁"
                          class="btn rounded-circle d-flex justify-content-center align-items-center my-font-md-400 my-button-white-borderless my-btn-circle"
                          @click="onDesignTabAdd"
                        >
                          <i class="fa-solid fa-plus" aria-hidden="true"></i>
                        </button>
                      </li>
                    </ul>
                  </template>
                </div>
              </div>
              <div class="border-top border-secondary border-opacity-25 p-3 p-lg-4">
                <p class="my-color-gray-light small mb-3 mb-lg-4">
                  與 /create-test-bank_design 相同元件與 class；此頁收在 <span class="font-monospace">my-bgcolor-gray-dark rounded-4</span> 區塊內示範。
                </p>
                <div class="my-font-sm-400 d-flex flex-column gap-3">
                  <div class="d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-2 gap-md-3 w-100">
                    <span class="my-color-gray-light flex-shrink-0 small">外殼（深色頂列）</span>
                    <code
                      class="user-select-all my-font-sm-400 font-monospace my-color-gray-light text-break flex-grow-1 min-w-0 rounded-2 my-bgcolor-black p-2"
                      >my-rag-tabs-bar my-rag-tabs-bar--design my-bgcolor-black border-bottom</code>
                    <DesignPageCopyBtn
                      class="align-self-end align-self-md-center ms-auto"
                      text="my-rag-tabs-bar my-rag-tabs-bar--design my-bgcolor-black border-bottom"
                    />
                  </div>
                  <div class="d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-2 gap-md-3 w-100">
                    <span class="my-color-gray-light flex-shrink-0 small">內層置中列</span>
                    <code
                      class="user-select-all my-font-sm-400 font-monospace my-color-gray-light text-break flex-grow-1 min-w-0 rounded-2 my-bgcolor-black p-2"
                      >d-flex justify-content-center w-100 px-4 align-items-end pb-0</code>
                    <DesignPageCopyBtn
                      class="align-self-end align-self-md-center ms-auto"
                      text="d-flex justify-content-center w-100 px-4 align-items-end pb-0"
                    />
                  </div>
                  <div class="d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-2 gap-md-3 w-100">
                    <span class="my-color-gray-light flex-shrink-0 small">結構</span>
                    <code
                      class="user-select-all my-font-sm-400 font-monospace my-color-gray-light text-break flex-grow-1 min-w-0 rounded-2 my-bgcolor-black p-2"
                      >ul.nav.nav-tabs.border-bottom-0 · li.nav-item · .nav-link.active</code>
                    <DesignPageCopyBtn
                      class="align-self-end align-self-md-center ms-auto"
                      text="nav nav-tabs border-bottom-0"
                    />
                  </div>
                  <div class="d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-2 gap-md-3 w-100">
                    <span class="my-color-gray-light flex-shrink-0 small">筆／刪除（僅當前分頁）</span>
                    <code
                      class="user-select-all my-font-sm-400 font-monospace my-color-gray-light text-break flex-grow-1 min-w-0 rounded-2 my-bgcolor-black p-2"
                      >btn btn-link my-tab-nav-action-btn · fa-pen · fa-xmark</code>
                    <DesignPageCopyBtn class="align-self-end align-self-md-center ms-auto" text="my-tab-nav-action-btn" />
                  </div>
                  <div class="d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-2 gap-md-3 w-100">
                    <span class="my-color-gray-light flex-shrink-0 small">試卷用題庫（藍點）</span>
                    <code
                      class="user-select-all my-font-sm-400 font-monospace my-color-gray-light text-break flex-grow-1 min-w-0 rounded-2 my-bgcolor-black p-2"
                      >rounded-circle d-inline-block my-bgcolor-blue（0.5rem）</code>
                    <DesignPageCopyBtn
                      class="align-self-end align-self-md-center ms-auto"
                      text="my-bgcolor-blue"
                    />
                  </div>
                  <div class="d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-2 gap-md-3 w-100">
                    <span class="my-color-gray-light flex-shrink-0 small">新增分頁（32×32 rounded-circle · my-btn-circle · fa-plus／建立中 fa-spinner）</span>
                    <code
                      class="user-select-all my-font-sm-400 font-monospace my-color-gray-light text-break flex-grow-1 min-w-0 rounded-2 my-bgcolor-black p-2"
                      >btn rounded-circle d-flex justify-content-center align-items-center my-font-md-400 my-button-white-borderless my-btn-circle</code>
                    <DesignPageCopyBtn
                      class="align-self-end align-self-md-center ms-auto"
                      text="btn rounded-circle d-flex justify-content-center align-items-center my-font-md-400 my-button-white-borderless my-btn-circle"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- ===== 07 · 表格 =====
               外層捲動框 + Bootstrap table；表頭／儲存格內距 px-3 py-2；輔助欄 my-color-gray-light。
               進階表頭樣式見 common .my-table（本示範為輕量版）。 -->
          <section class="my-page-block-spacing">
            <h2 class="my-font-lg-600 my-color-white text-break mb-3">07 · 表格</h2>
            <div class="my-bgcolor-gray-dark rounded-4 p-3 p-lg-4 mb-4">
                <div class="rounded-4 overflow-auto border">
                  <table class="table table-striped table-hover mb-0">
                    <thead>
                      <tr>
                        <th class="px-3 py-2" scope="col">項目</th>
                        <th class="px-3 py-2" scope="col">說明</th>
                        <th class="text-end px-3 py-2" scope="col">數量</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td class="px-3 py-2">範例列 A</td>
                        <td class="my-color-gray-light px-3 py-2">輔助欄位</td>
                        <td class="text-end px-3 py-2">12</td>
                      </tr>
                      <tr>
                        <td class="px-3 py-2">範例列 B</td>
                        <td class="my-color-gray-light px-3 py-2">輔助欄位</td>
                        <td class="text-end px-3 py-2">3</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div class="my-font-sm-400 d-flex flex-column gap-3 mt-3">
                  <div class="d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-2 gap-md-3 w-100">
                    <span class="my-color-gray-light flex-shrink-0 small">外層捲動框</span>
                    <code
                      class="user-select-all my-font-sm-400 font-monospace my-color-gray-light text-break flex-grow-1 min-w-0 rounded-2 my-bgcolor-black p-2"
                      >rounded-4 overflow-auto border</code>
                    <DesignPageCopyBtn
                      class="align-self-end align-self-md-center ms-auto"
                      text="rounded-4 overflow-auto border"
                    />
                  </div>
                  <div class="d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-2 gap-md-3 w-100">
                    <span class="my-color-gray-light flex-shrink-0 small">表格</span>
                    <code
                      class="user-select-all my-font-sm-400 font-monospace my-color-gray-light text-break flex-grow-1 min-w-0 rounded-2 my-bgcolor-black p-2"
                      >table table-striped table-hover mb-0</code>
                    <DesignPageCopyBtn
                      class="align-self-end align-self-md-center ms-auto"
                      text="table table-striped table-hover mb-0"
                    />
                  </div>
                  <div class="d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-2 gap-md-3 w-100">
                    <span class="my-color-gray-light flex-shrink-0 small">表頭／儲存格</span>
                    <code
                      class="user-select-all my-font-sm-400 font-monospace my-color-gray-light text-break flex-grow-1 min-w-0 rounded-2 my-bgcolor-black p-2"
                      >px-3 py-2</code>
                    <DesignPageCopyBtn class="align-self-end align-self-md-center ms-auto" text="px-3 py-2" />
                  </div>
                  <div class="d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-2 gap-md-3 w-100">
                    <span class="my-color-gray-light flex-shrink-0 small">輔助字色</span>
                    <code
                      class="user-select-all my-font-sm-400 font-monospace my-color-gray-light text-break flex-grow-1 min-w-0 rounded-2 my-bgcolor-black p-2"
                      >my-color-gray-light</code>
                    <DesignPageCopyBtn class="align-self-end align-self-md-center ms-auto" text="my-color-gray-light" />
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
