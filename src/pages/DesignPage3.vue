<script setup>
import { ref } from 'vue';
import DesignPageCopyBtn from '../components/DesignPageCopyBtn.vue';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal.vue';
import LoadingOverlay from '../components/LoadingOverlay.vue';
import LogoGradientPillButton from '../components/LogoGradientPillButton.vue';

defineProps({
  tabId: { type: String, default: '' },
});

// ── Tab 狀態 ──────────────────────────────────────────────────
const activeTab = ref('color');
const TABS = [
  { id: 'color',      label: "顏色" },
  { id: 'type',       label: "字階" },
  { id: 'header-bar', label: "頁首 & 頂列" },
  { id: 'list',       label: "列表" },
  { id: 'alert',      label: "提示" },
  { id: 'button',     label: "按鈕" },
  { id: 'badge',      label: "Badge" },
  { id: 'dropdown',   label: "下拉" },
  { id: 'modal',      label: "Modal & Overlay" },
  { id: 'embed',      label: "嵌入" },
];

// ── 上傳 Modal ───────────────────────────────────────────
const uploadModalOpen   = ref(false);
const uploadDragOver    = ref(false);
const uploadFileName    = ref('');
const uploadError       = ref('');
function openUploadModal()  { uploadFileName.value = ''; uploadError.value = ''; uploadModalOpen.value = true; }
function closeUploadModal() { uploadModalOpen.value = false; }
function onUploadDragOver(e)  { e.preventDefault(); uploadDragOver.value = true; }
function onUploadDragLeave(e) { e.preventDefault(); uploadDragOver.value = false; }
function onUploadDrop(e) {
  e.preventDefault(); uploadDragOver.value = false;
  const f = e.dataTransfer?.files?.[0];
  if (f) { uploadFileName.value = f.name; uploadError.value = ''; }
}
function onUploadFileChange(e) {
  const f = e.target.files?.[0];
  if (f) { uploadFileName.value = f.name; uploadError.value = ''; }
}
function onUploadConfirm() {
  if (!uploadFileName.value) { uploadError.value = '請先選擇要上傳的檔案'; return; }
  closeUploadModal();
}

// ── 刪除確認 Modal ───────────────────────────────────────
const deleteModalOpen     = ref(false);
const deleteModalDeleting = ref(false);
const deleteModalError    = ref('');
function openDeleteModal() { deleteModalError.value = ''; deleteModalOpen.value = true; }
async function onDeleteConfirm() {
  deleteModalDeleting.value = true;
  await new Promise(r => setTimeout(r, 1200));
  deleteModalDeleting.value = false;
  deleteModalOpen.value = false;
}

// ── LoadingOverlay ───────────────────────────────────────
const loadingVisible = ref(false);
let loadingTimer = null;
function toggleLoading() {
  if (loadingVisible.value) { loadingVisible.value = false; clearTimeout(loadingTimer); return; }
  loadingVisible.value = true;
  loadingTimer = setTimeout(() => { loadingVisible.value = false; }, 3000);
}
</script>

<template>
  <!--
    DesignPage3｜exam_3、create-exam-bank_3 專用 UI 元件參考（TopView 全寬、白底主內容、左側清單欄）
    13 個 Tab：每個區塊獨立一頁
  -->
  <div class="design-page-3 d-flex flex-column h-100 overflow-hidden my-bgcolor-white">

    <!-- 頁首 -->
    <header class="flex-shrink-0 my-bgcolor-white p-4 border-bottom">
      <div class="container-fluid px-0 text-center">
        <p class="my-font-xl-400 my-color-black text-break mb-0">UI 元件參考 3</p>
      </div>
    </header>

    <!-- Tab 列 -->
    <div class="flex-shrink-0 w-100 my-rag-tabs-bar my-bgcolor-white border-bottom">
      <div class="d-flex justify-content-center w-100 align-items-center">
        <ul class="nav nav-tabs w-100">
          <li v-for="tab in TABS" :key="tab.id" class="nav-item">
            <button
              type="button"
              role="tab"
              class="nav-link px-4"
              :class="{ active: activeTab === tab.id }"
              :aria-selected="activeTab === tab.id"
              @click="activeTab = tab.id"
            >
              {{ tab.label }}
            </button>
          </li>
        </ul>
      </div>
    </div>

    <!-- 主內文 -->
    <div class="flex-grow-1 overflow-auto my-bgcolor-white min-h-0">
      <div class="container-fluid px-3 px-md-4 py-4">
        <div class="row justify-content-center">
          <div class="col-12 col-lg-11 col-xl-10">

            <!-- ══════════════════════════════════════════════════
                 字階
            ══════════════════════════════════════════════════ -->
            <template v-if="activeTab === 'type'">
              <section class="my-page-block-spacing mb-0">
                <div class="rounded-4 my-bgcolor-gray-3 p-4">
                  <div role="heading" aria-level="2" class="my-font-lg-600 my-color-black text-break mb-4">字階</div>
                  <div class="d-flex flex-column gap-5">

                    <!-- xl · 1.125rem ─────────────────────────── -->
                    <div>
                      <div class="my-font-sm-400 my-color-gray-1 pb-2 mb-3" style="border-bottom: 1px solid var(--my-color-gray-2, #e5e5e5);">xl · 1.125rem</div>
                      <div class="d-flex flex-column gap-3">
                        <div>
                          <p class="my-font-xl-400 my-color-black mb-2">頁首標題（測驗 / 建立測驗題庫）</p>
                          <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100">
                            <code class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white">my-font-xl-400 my-color-black</code>
                            <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text="my-font-xl-400 my-color-black" :on-light-bg="false" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- lg · 1rem ─────────────────────────────── -->
                    <div>
                      <div class="my-font-sm-400 my-color-gray-1 pb-2 mb-3" style="border-bottom: 1px solid var(--my-color-gray-2, #e5e5e5);">lg · 1rem</div>
                      <div class="d-flex flex-column gap-3">
                        <div>
                          <p class="my-font-lg-400 my-color-black mb-2">detail-bar 標題輸入框（可編輯試卷名稱）</p>
                          <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100">
                            <code class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white">my-font-lg-400 my-color-black</code>
                            <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text="my-font-lg-400 my-color-black" :on-light-bg="false" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- md · 0.875rem ─────────────────────────── -->
                    <div>
                      <div class="my-font-sm-400 my-color-gray-1 pb-2 mb-3" style="border-bottom: 1px solid var(--my-color-gray-2, #e5e5e5);">md · 0.875rem</div>
                      <div class="d-flex flex-column gap-3">
                        <div>
                          <p class="my-font-md-400 my-color-black mb-2">方塊標題、Modal 按鈕</p>
                          <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100">
                            <code class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white">my-font-md-400 my-color-black</code>
                            <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text="my-font-md-400 my-color-black" :on-light-bg="false" />
                          </div>
                        </div>
                        <div>
                          <p class="my-font-md-400 my-color-gray-1 mb-2">取消按鈕、圓形選單鈕</p>
                          <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100">
                            <code class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white">my-font-md-400 my-color-gray-1</code>
                            <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text="my-font-md-400 my-color-gray-1" :on-light-bg="false" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- sm · 0.75rem ─────────────────────────── -->
                    <div>
                      <div class="my-font-sm-400 my-color-gray-1 pb-2 mb-3" style="border-bottom: 1px solid var(--my-color-gray-2, #e5e5e5);">sm · 0.75rem</div>
                      <div class="d-flex flex-column gap-3">
                        <div>
                          <p class="my-font-sm-400 my-color-black mb-2">Modal 說明、已選檔名、提示訊息</p>
                          <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100">
                            <code class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white">my-font-sm-400 my-color-black</code>
                            <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text="my-font-sm-400 my-color-black" :on-light-bg="false" />
                          </div>
                        </div>
                        <div>
                          <p class="my-font-sm-400 my-color-gray-1 mb-2">方塊副標題、返回按鈕、說明文字</p>
                          <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100">
                            <code class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white">my-font-sm-400 my-color-gray-1</code>
                            <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text="my-font-sm-400 my-color-gray-1" :on-light-bg="false" />
                          </div>
                        </div>
                        <div>
                          <p class="my-font-sm-400 my-color-gray-4 mb-2">drop zone 提示文字、說明 ul</p>
                          <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100">
                            <code class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white">my-font-sm-400 my-color-gray-4</code>
                            <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text="my-font-sm-400 my-color-gray-4" :on-light-bg="false" />
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              </section>
            </template>

            <!-- ══════════════════════════════════════════════════
                 顏色
            ══════════════════════════════════════════════════ -->
            <template v-else-if="activeTab === 'color'">

              <!-- 灰階 -->
              <section class="my-page-block-spacing">
                <div class="rounded-4 my-bgcolor-gray-3 p-4 mb-5">
                  <div role="heading" aria-level="2" class="my-font-lg-600 my-color-black text-break mb-4">灰階</div>
                  <div class="row g-3">

                    <!-- 1 · black — 最深 -->
                    <div class="col-12">
                      <p class="my-font-sm-400 my-color-gray-1 mb-1">主要文字、標題、方塊標題、Modal 標題、已選檔名</p>
                      <div class="my-design-swatch-cell">
                        <span class="my-design-swatch-dot my-bgcolor-black" aria-hidden="true"></span>
                        <div class="my-design-swatch-rows">
                          <div class="my-design-swatch-row my-bgcolor-black min-w-0">
                            <code class="my-font-sm-400 my-color-white font-monospace text-break flex-grow-1 min-w-0 px-1">my-bgcolor-black</code>
                            <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text="my-bgcolor-black" :on-light-bg="false" />
                          </div>
                          <div class="my-design-swatch-row my-bgcolor-black min-w-0">
                            <code class="my-font-sm-400 my-color-white font-monospace text-break flex-grow-1 min-w-0 px-1">my-color-black</code>
                            <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text="my-color-black" :on-light-bg="false" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- 2 · gray-1 -->
                    <div class="col-12">
                      <p class="my-font-sm-400 my-color-gray-1 mb-1">次要文字、返回按鈕、圓形選單鈕、取消按鈕、方塊副標題</p>
                      <div class="my-design-swatch-cell">
                        <span class="my-design-swatch-dot my-bgcolor-gray-2" aria-hidden="true"></span>
                        <div class="my-design-swatch-rows">
                          <div class="my-design-swatch-row my-bgcolor-black min-w-0">
                            <code class="my-font-sm-400 my-color-white font-monospace text-break flex-grow-1 min-w-0 px-1">my-bgcolor-gray-1</code>
                            <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text="my-bgcolor-gray-1" :on-light-bg="false" />
                          </div>
                          <div class="my-design-swatch-row my-bgcolor-black min-w-0">
                            <code class="my-font-sm-400 my-color-white font-monospace text-break flex-grow-1 min-w-0 px-1">my-color-gray-1</code>
                            <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text="my-color-gray-1" :on-light-bg="false" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- 3 · gray-3 bg -->
                    <div class="col-12">
                      <p class="my-font-sm-400 my-color-gray-1 mb-1">bank-grid-tile 背景、modal-content 背景、detail-bar title hover</p>
                      <div class="my-design-swatch-cell">
                        <span class="my-design-swatch-dot my-bgcolor-gray-3" aria-hidden="true"></span>
                        <div class="my-design-swatch-rows">
                          <div class="my-design-swatch-row my-bgcolor-black min-w-0">
                            <code class="my-font-sm-400 my-color-white font-monospace text-break flex-grow-1 min-w-0 px-1">my-bgcolor-gray-3</code>
                            <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text="my-bgcolor-gray-3" :on-light-bg="false" />
                          </div>
                          <div class="my-design-swatch-row my-bgcolor-black min-w-0">
                            <code class="my-font-sm-400 my-color-white font-monospace text-break flex-grow-1 min-w-0 px-1">my-color-black</code>
                            <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text="my-color-black" :on-light-bg="false" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- 4 · gray-4 bg -->
                    <div class="col-12">
                      <p class="my-font-sm-400 my-color-gray-1 mb-1">頁面 canvas、grid header 背景</p>
                      <div class="my-design-swatch-cell">
                        <span class="my-design-swatch-dot my-bgcolor-gray-4" aria-hidden="true" style="border: 1px solid var(--my-color-gray-2, #e5e5e5);"></span>
                        <div class="my-design-swatch-rows">
                          <div class="my-design-swatch-row my-bgcolor-black min-w-0">
                            <code class="my-font-sm-400 my-color-white font-monospace text-break flex-grow-1 min-w-0 px-1">my-bgcolor-gray-4</code>
                            <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text="my-bgcolor-gray-4" :on-light-bg="false" />
                          </div>
                          <div class="my-design-swatch-row my-bgcolor-black min-w-0">
                            <code class="my-font-sm-400 my-color-white font-monospace text-break flex-grow-1 min-w-0 px-1">my-color-black</code>
                            <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text="my-color-black" :on-light-bg="false" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- 5 · gray-4 text -->
                    <div class="col-12">
                      <p class="my-font-sm-400 my-color-gray-1 mb-1">drop zone 提示文字、說明 ul（最淡輔助色）</p>
                      <div class="my-design-swatch-cell">
                        <span class="my-design-swatch-dot my-bgcolor-gray-4" aria-hidden="true" style="border: 1px solid var(--my-color-gray-2, #e5e5e5);"></span>
                        <div class="my-design-swatch-rows">
                          <div class="my-design-swatch-row my-bgcolor-black min-w-0">
                            <code class="my-font-sm-400 my-color-white font-monospace text-break flex-grow-1 min-w-0 px-1">my-color-gray-4</code>
                            <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text="my-color-gray-4" :on-light-bg="false" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- 6 · surface / white — 最淺 -->
                    <div class="col-12">
                      <p class="my-font-sm-400 my-color-gray-1 mb-1">Badge 背景（白底）</p>
                      <div class="my-design-swatch-cell">
                        <span class="my-design-swatch-dot my-bgcolor-surface" aria-hidden="true" style="border: 1px solid var(--my-color-gray-2, #e5e5e5);"></span>
                        <div class="my-design-swatch-rows">
                          <div class="my-design-swatch-row my-bgcolor-black min-w-0">
                            <code class="my-font-sm-400 my-color-white font-monospace text-break flex-grow-1 min-w-0 px-1">my-bgcolor-surface</code>
                            <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text="my-bgcolor-surface" :on-light-bg="false" />
                          </div>
                          <div class="my-design-swatch-row my-bgcolor-black min-w-0">
                            <code class="my-font-sm-400 my-color-white font-monospace text-break flex-grow-1 min-w-0 px-1">my-color-black</code>
                            <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text="my-color-black" :on-light-bg="false" />
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              </section>

              <!-- 彩色 -->
              <section class="my-page-block-spacing mb-0">
                <div class="rounded-4 my-bgcolor-gray-3 p-4">
                  <div role="heading" aria-level="2" class="my-font-lg-600 my-color-black text-break mb-4">彩色</div>
                  <div class="row g-3">

                    <div class="col-12">
                      <p class="my-font-sm-400 my-color-gray-1 mb-1">試卷用題庫：方塊右上角綠點、下拉選單列小圓點</p>
                      <div class="my-design-swatch-cell">
                        <span class="my-design-swatch-dot my-bgcolor-green" aria-hidden="true"></span>
                        <div class="my-design-swatch-rows">
                          <div class="my-design-swatch-row my-bgcolor-black min-w-0">
                            <code class="my-font-sm-400 my-color-white font-monospace text-break flex-grow-1 min-w-0 px-1">my-bgcolor-green</code>
                            <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text="my-bgcolor-green" :on-light-bg="false" />
                          </div>
                          <div class="my-design-swatch-row my-bgcolor-black min-w-0">
                            <code class="my-font-sm-400 my-color-white font-monospace text-break flex-grow-1 min-w-0 px-1">my-color-green</code>
                            <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text="my-color-green" :on-light-bg="false" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div class="col-12">
                      <p class="my-font-sm-400 my-color-gray-1 mb-1">下拉選單刪除項（兩頁共用）</p>
                      <div class="my-design-swatch-cell">
                        <span class="my-design-swatch-dot my-bgcolor-red" aria-hidden="true"></span>
                        <div class="my-design-swatch-rows">
                          <div class="my-design-swatch-row my-bgcolor-black min-w-0">
                            <code class="my-font-sm-400 my-color-white font-monospace text-break flex-grow-1 min-w-0 px-1">my-bgcolor-red</code>
                            <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text="my-bgcolor-red" :on-light-bg="false" />
                          </div>
                          <div class="my-design-swatch-row my-bgcolor-black min-w-0">
                            <code class="my-font-sm-400 my-color-white font-monospace text-break flex-grow-1 min-w-0 px-1">my-color-red</code>
                            <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text="my-color-red" :on-light-bg="false" />
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              </section>
            </template>

            <!-- ══════════════════════════════════════════════════
                 頁首標題 ＋ 內頁頂列
            ══════════════════════════════════════════════════ -->
            <template v-else-if="activeTab === 'header-bar'">
              <section class="my-page-block-spacing">
                <div class="rounded-4 my-bgcolor-gray-3 p-4 mb-5">
                  <div role="heading" aria-level="2" class="my-font-lg-600 my-color-black text-break mb-2">頁首標題</div>
                  <p class="my-font-sm-400 my-color-gray-1 mb-4">grid 模式頂部；「測驗」／「建立測驗題庫」</p>
                  <header class="my-bgcolor-gray-4 p-4 rounded-3">
                    <div class="container-fluid px-0 text-center">
                      <p class="my-font-xl-400 my-color-black text-break mb-0">測驗</p>
                    </div>
                  </header>
                  <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100 mt-3">
                    <code class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white">header.flex-shrink-0.my-bgcolor-gray-4.p-4</code>
                    <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text="header flex-shrink-0 my-bgcolor-gray-4 p-4" :on-light-bg="false" />
                  </div>
                  <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100 mt-2">
                    <code class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white">my-font-xl-400 my-color-black text-break</code>
                    <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text="my-font-xl-400 my-color-black text-break" :on-light-bg="false" />
                  </div>
                </div>
              </section>

              <section class="my-page-block-spacing mb-0">
                <div class="rounded-4 my-bgcolor-gray-3 p-4">
                  <div role="heading" aria-level="2" class="my-font-lg-600 my-color-black text-break mb-2">內頁頂列</div>
                  <p class="my-font-sm-400 my-color-gray-1 mb-4">
                    3欄 grid（1fr / minmax(0,50%) / 1fr）；
                    <code class="my-color-black">.exam-2-detail-bar</code> ／
                    <code class="my-color-black">.create-exam-bank-2-detail-bar</code>；
                    z-index:30 overflow:visible；title hover/focus → my-bgcolor-gray-3；disabled → opacity 1 transparent
                  </p>
                  <header class="design-page-3-detail-bar flex-shrink-0 px-2 py-3 my-bgcolor-gray-4 border-bottom rounded-top">
                    <div class="design-page-3-detail-bar__start">
                      <button type="button" class="btn rounded-pill d-inline-flex align-items-center gap-2 my-font-sm-400 my-color-gray-1 my-button-transparent-borderless flex-shrink-0 px-4 py-1">
                        <i class="fa-solid fa-arrow-left" aria-hidden="true" />
                        返回主頁
                      </button>
                    </div>
                    <div class="design-page-3-detail-bar__center min-w-0">
                      <input
                        type="text"
                        class="design-page-3-detail-bar__title my-font-lg-400 my-color-black text-truncate text-center w-100 px-3 py-2 rounded-2 mb-0"
                        value="可編輯標題"
                        aria-label="標題"
                      >
                    </div>
                    <div class="design-page-3-detail-bar__end">
                      <button type="button" class="btn rounded-circle d-flex justify-content-center align-items-center flex-shrink-0 my-font-md-400 my-color-gray-1 my-button-transparent-borderless design-page-3-detail-bar__menu-btn lh-1" aria-label="選單">
                        <i class="fa-solid fa-bars" aria-hidden="true" />
                      </button>
                    </div>
                  </header>
                  <div class="d-flex flex-column gap-2 mt-3">
                    <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100">
                      <code class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white">*-detail-bar { display: grid; grid-template-columns: 1fr minmax(0, 50%) 1fr; align-items: center; gap: 0.75rem; }</code>
                      <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text="display: grid; grid-template-columns: 1fr minmax(0, 50%) 1fr; align-items: center; gap: 0.75rem;" :on-light-bg="false" />
                    </div>
                    <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100">
                      <code class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white">*-detail-bar__title { border: none; outline: none; box-shadow: none; background: transparent; }</code>
                      <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text="border: none; outline: none; box-shadow: none; background: transparent;" :on-light-bg="false" />
                    </div>
                    <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100">
                      <code class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white">*-detail-bar__menu-btn { width: 2.375rem; height: 2.375rem; padding: 0; }</code>
                      <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text="width: 2.375rem; height: 2.375rem; padding: 0;" :on-light-bg="false" />
                    </div>
                  </div>
                </div>
              </section>
            </template>

            <!-- ══════════════════════════════════════════════════
                 列表
            ══════════════════════════════════════════════════ -->
            <template v-else-if="activeTab === 'list'">
              <section class="my-page-block-spacing mb-0">
                <div class="rounded-4 my-bgcolor-gray-3 p-4">
                  <div role="heading" aria-level="2" class="my-font-lg-600 my-color-black text-break mb-2">列表</div>
                  <p class="my-font-sm-400 my-color-gray-1 mb-4">
                    exam_3 / create-exam-bank_3 主頁入口；新增按鈕靠右（bank-table-actions）；
                    表頭名稱＋排序（bank-table-header）；項目間 border-top 分隔，hover → gray-2 底色；
                    create-exam-bank_2 含 dot-col 欄位（綠點）與表頭 dot-spacer 對齊
                  </p>

                  <!-- 靜態預覽 -->
                  <div class="my-bgcolor-gray-4 rounded-3 p-3 mb-3">
                    <div class="dp2-bank-list-wrap mx-auto">

                      <!-- 新增按鈕列（靠右） -->
                      <div class="dp2-bank-table-actions">
                        <button type="button" class="btn rounded-pill d-inline-flex align-items-center gap-2 my-font-md-400 my-button-white px-4 py-2">
                          <i class="fa-solid fa-plus" aria-hidden="true" />
                          新增試卷
                        </button>
                      </div>

                      <!-- 表頭：dot spacer ＋ 名稱排序 -->
                      <div class="dp2-bank-table-header">
                        <span class="dp2-bank-table-header__dot-spacer" aria-hidden="true" />
                        <button type="button" class="btn rounded-pill d-inline-flex align-items-center gap-1 my-font-sm-400 my-color-gray-1 my-button-transparent-borderless px-4 py-1">
                          名稱
                          <i class="fa-solid fa-chevron-up" aria-hidden="true" />
                        </button>
                      </div>

                      <!-- 列表 -->
                      <ul class="dp2-bank-list">
                        <li>
                          <button type="button" class="dp2-bank-list-row">
                            <span class="dp2-bank-list-row__dot-col" />
                            <span class="dp2-bank-list-row__label my-font-md-400 my-color-black">範例試卷 A</span>
                            <span class="dp2-bank-list-row__subtitle my-font-sm-400 my-color-gray-1">5 題</span>
                            <i class="fa-solid fa-chevron-right dp2-bank-list-row__chevron" aria-hidden="true" />
                          </button>
                        </li>
                        <li>
                          <button type="button" class="dp2-bank-list-row">
                            <span class="dp2-bank-list-row__dot-col" aria-label="試卷用題庫">
                              <span class="rounded-circle d-inline-block my-bgcolor-green dp2-bank-list-row__exam-dot" />
                            </span>
                            <span class="dp2-bank-list-row__label my-font-md-400 my-color-black">試卷用題庫</span>
                            <span class="dp2-bank-list-row__subtitle my-font-sm-400 my-color-gray-1">3 個單元</span>
                            <i class="fa-solid fa-chevron-right dp2-bank-list-row__chevron" aria-hidden="true" />
                          </button>
                        </li>
                        <li>
                          <button type="button" class="dp2-bank-list-row">
                            <span class="dp2-bank-list-row__dot-col" />
                            <span class="dp2-bank-list-row__label my-font-md-400 my-color-black">未命名試卷</span>
                            <i class="fa-solid fa-chevron-right dp2-bank-list-row__chevron" aria-hidden="true" />
                          </button>
                        </li>
                      </ul>
                    </div>
                  </div>

                  <!-- class 說明 -->
                  <div class="d-flex flex-column gap-2">
                    <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100">
                      <code class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white">bank-list-wrap { width:100%; max-width:40rem; }</code>
                      <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text="bank-list-wrap" :on-light-bg="false" />
                    </div>
                    <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100">
                      <code class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white">bank-table-actions { display:flex; justify-content:flex-end; padding-bottom:0.75rem; margin-inline:-1rem; } @media (min-width:768px) { margin-inline:-1.5rem; }</code>
                      <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text="bank-table-actions { display: flex; justify-content: flex-end; padding-bottom: 0.75rem; margin-inline: -1rem; } @media (min-width: 768px) { .bank-table-actions { margin-inline: -1.5rem; } }" :on-light-bg="false" />
                    </div>
                    <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100">
                      <code class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white">bank-table-header { display:flex; align-items:center; padding:0 1.25rem 0.5rem; }</code>
                      <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text="bank-table-header { display: flex; align-items: center; padding: 0 1.25rem 0.5rem; }" :on-light-bg="false" />
                    </div>
                    <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100">
                      <code class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white">bank-table-header__dot-spacer { display:inline-block; width:calc(0.5rem + 0.75rem); flex-shrink:0; } ← create-exam-bank_2 only</code>
                      <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text="bank-table-header__dot-spacer { display: inline-block; width: calc(0.5rem + 0.75rem); flex-shrink: 0; }" :on-light-bg="false" />
                    </div>
                    <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100">
                      <code class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white">bank-list { list-style:none; padding:0; margin:0; border-bottom:1px solid gray-2; }</code>
                      <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text="bank-list { list-style: none; padding: 0; margin: 0; border-bottom: 1px solid var(--my-color-gray-2, #e5e5e5); }" :on-light-bg="false" />
                    </div>
                    <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100">
                      <code class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white">bank-list > li { border-top:1px solid gray-2; }</code>
                      <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text="bank-list > li { border-top: 1px solid var(--my-color-gray-2, #e5e5e5); }" :on-light-bg="false" />
                    </div>
                    <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100">
                      <code class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white">bank-list-row { display:flex; align-items:center; gap:0.75rem; width:100%; padding:0.875rem 1.25rem; background:transparent; border:none; text-align:left; cursor:pointer; }</code>
                      <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text="bank-list-row { display: flex; align-items: center; gap: 0.75rem; width: 100%; padding: 0.875rem 1.25rem; background: transparent; border: none; text-align: left; cursor: pointer; }" :on-light-bg="false" />
                    </div>
                    <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100">
                      <code class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white">bank-list-row:hover { background-color: var(--my-color-gray-2); }</code>
                      <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text="bank-list-row:hover { background-color: var(--my-color-gray-2); }" :on-light-bg="false" />
                    </div>
                    <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100">
                      <code class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white">bank-list-row__dot-col { flex-shrink:0; width:0.5rem; display:flex; align-items:center; justify-content:center; } ← create-exam-bank_2 only</code>
                      <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text="bank-list-row__dot-col { flex-shrink: 0; width: 0.5rem; display: flex; align-items: center; justify-content: center; }" :on-light-bg="false" />
                    </div>
                    <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100">
                      <code class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white">bank-list-row__exam-dot rounded-circle d-inline-block my-bgcolor-green { width:0.5rem; height:0.5rem; }</code>
                      <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text="bank-list-row__exam-dot rounded-circle d-inline-block my-bgcolor-green" :on-light-bg="false" />
                    </div>
                    <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100">
                      <code class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white">bank-list-row__label my-font-md-400 my-color-black { flex:1 1 0; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }</code>
                      <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text="bank-list-row__label my-font-md-400 my-color-black" :on-light-bg="false" />
                    </div>
                    <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100">
                      <code class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white">bank-list-row__subtitle my-font-sm-400 my-color-gray-1 { flex-shrink:0; white-space:nowrap; }</code>
                      <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text="bank-list-row__subtitle my-font-sm-400 my-color-gray-1" :on-light-bg="false" />
                    </div>
                    <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100">
                      <code class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white">fa-solid fa-chevron-right bank-list-row__chevron { flex-shrink:0; font-size:0.625rem; opacity:0.4; }</code>
                      <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text="fa-solid fa-chevron-right bank-list-row__chevron" :on-light-bg="false" />
                    </div>
                  </div>
                </div>
              </section>
            </template>

            <!-- ══════════════════════════════════════════════════
                 提示訊息
            ══════════════════════════════════════════════════ -->
            <template v-else-if="activeTab === 'alert'">
              <section class="my-page-block-spacing mb-0">
                <div class="rounded-4 my-bgcolor-gray-3 p-4">
                  <div role="heading" aria-level="2" class="my-font-lg-600 my-color-black text-break mb-4">提示訊息</div>
                  <div class="d-flex flex-column gap-3 mb-3">
                    <div class="my-alert-warning-soft my-font-sm-400 py-2">ragListError / examListError（列表載入警告）</div>
                    <div class="my-alert-danger-soft my-font-sm-400 py-2">createExamError / newBankUploadError（建立或上傳失敗）</div>
                  </div>
                  <div class="d-flex flex-column gap-2">
                    <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100">
                      <code class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white">my-alert-warning-soft my-font-sm-400 py-2</code>
                      <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text="my-alert-warning-soft my-font-sm-400 py-2" :on-light-bg="false" />
                    </div>
                    <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100">
                      <code class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white">my-alert-danger-soft my-font-sm-400 py-2</code>
                      <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text="my-alert-danger-soft my-font-sm-400 py-2" :on-light-bg="false" />
                    </div>
                  </div>
                </div>
              </section>
            </template>

            <!-- ══════════════════════════════════════════════════
                 按鈕
            ══════════════════════════════════════════════════ -->
            <template v-else-if="activeTab === 'button'">
              <section class="my-page-block-spacing mb-0">
                <div class="rounded-4 my-bgcolor-gray-3 p-4">
                  <div role="heading" aria-level="2" class="my-font-lg-600 my-color-black text-break mb-4">按鈕</div>
                  <div class="d-flex flex-column gap-4">

                    <!-- 小：my-font-sm-400 -->
                    <div>
                      <div class="my-color-gray-4 my-font-sm-400 mb-2">小（my-font-sm-400）</div>
                      <div class="d-flex flex-column gap-3">
                        <div>
                          <p class="my-font-sm-400 my-color-black mb-2">表頭排序</p>
                          <div class="design-page-3-btn-spec d-flex flex-column gap-2 w-100">
                            <button type="button" class="btn rounded-pill d-inline-flex align-items-center gap-1 my-font-sm-400 my-color-gray-1 my-button-transparent-borderless px-4 py-1 align-self-start">
                              名稱
                              <i class="fa-solid fa-chevron-up" aria-hidden="true" />
                            </button>
                            <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100">
                              <code class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white">btn rounded-pill d-inline-flex align-items-center gap-1 my-font-sm-400 my-color-gray-1 my-button-transparent-borderless px-4 py-1</code>
                              <DesignPageCopyBtn class="flex-shrink-0" text="btn rounded-pill d-inline-flex align-items-center gap-1 my-font-sm-400 my-color-gray-1 my-button-transparent-borderless px-4 py-1" :on-light-bg="false" />
                            </div>
                          </div>
                        </div>
                        <div>
                          <p class="my-font-sm-400 my-color-black mb-2">返回主頁</p>
                          <div class="design-page-3-btn-spec d-flex flex-column gap-2 w-100">
                            <button type="button" class="btn rounded-pill d-inline-flex align-items-center gap-2 my-font-sm-400 my-color-gray-1 my-button-transparent-borderless px-4 py-1 flex-shrink-0 align-self-start">
                              <i class="fa-solid fa-arrow-left" aria-hidden="true" />
                              返回主頁
                            </button>
                            <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100">
                              <code class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white">btn rounded-pill d-inline-flex align-items-center gap-2 my-font-sm-400 my-color-gray-1 my-button-transparent-borderless px-4 py-1 flex-shrink-0</code>
                              <DesignPageCopyBtn class="flex-shrink-0" text="btn rounded-pill d-inline-flex align-items-center gap-2 my-font-sm-400 my-color-gray-1 my-button-transparent-borderless px-4 py-1 flex-shrink-0" :on-light-bg="false" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- 中：my-font-md-400 -->
                    <div>
                      <div class="my-color-gray-4 my-font-sm-400 mb-2">中（my-font-md-400）</div>
                      <div class="d-flex flex-column gap-3">
                        <div>
                          <p class="my-font-sm-400 my-color-black mb-2">列表新增</p>
                          <div class="design-page-3-btn-spec d-flex flex-column gap-2 w-100">
                            <button type="button" class="btn rounded-pill d-inline-flex align-items-center gap-2 my-font-md-400 my-button-white px-4 py-2 align-self-start">
                              <i class="fa-solid fa-plus" aria-hidden="true" />
                              新增試卷
                            </button>
                            <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100">
                              <code class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white">btn rounded-pill d-inline-flex align-items-center gap-2 my-font-md-400 my-button-white px-4 py-2</code>
                              <DesignPageCopyBtn class="flex-shrink-0" text="btn rounded-pill d-inline-flex align-items-center gap-2 my-font-md-400 my-button-white px-4 py-2" :on-light-bg="false" />
                            </div>
                          </div>
                        </div>
                        <div>
                          <p class="my-font-sm-400 my-color-black mb-2">開始出題／開始批改（Logo 隨機漸層 pill，work3 藍色／紅色）</p>
                          <div class="design-page-3-btn-spec d-flex flex-wrap align-items-center gap-3 w-100">
                            <LogoGradientPillButton
                              id-prefix="design-page-3-generate"
                              tone="generate"
                              gradient-bias="work3"
                              extra-class="align-self-start"
                            >
                              開始出題
                            </LogoGradientPillButton>
                            <LogoGradientPillButton
                              id-prefix="design-page-3-grade"
                              tone="grade"
                              gradient-bias="work3"
                              extra-class="align-self-start"
                            >
                              開始批改
                            </LogoGradientPillButton>
                          </div>
                          <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100 mt-2">
                            <code class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white">LogoGradientPillButton tone="generate"|"grade" gradient-bias="work3"</code>
                            <DesignPageCopyBtn class="flex-shrink-0" text='LogoGradientPillButton tone="generate" gradient-bias="work3"' :on-light-bg="false" />
                          </div>
                        </div>
                        <div>
                          <p class="my-font-sm-400 my-color-black mb-2">上傳取消</p>
                          <div class="design-page-3-btn-spec d-flex flex-column gap-2 w-100">
                            <button type="button" class="btn rounded-pill d-inline-flex justify-content-center align-items-center my-font-md-400 my-color-gray-1 my-button-transparent-borderless flex-shrink-0 px-4 py-2 align-self-start">
                              取消
                            </button>
                            <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100">
                              <code class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white">btn rounded-pill d-inline-flex justify-content-center align-items-center my-font-md-400 my-color-gray-1 my-button-transparent-borderless flex-shrink-0 px-4 py-2</code>
                              <DesignPageCopyBtn class="flex-shrink-0" text="btn rounded-pill d-inline-flex justify-content-center align-items-center my-font-md-400 my-color-gray-1 my-button-transparent-borderless flex-shrink-0 px-4 py-2" :on-light-bg="false" />
                            </div>
                          </div>
                        </div>
                        <div>
                          <p class="my-font-sm-400 my-color-black mb-2">刪除確認取消</p>
                          <div class="design-page-3-btn-spec d-flex flex-column gap-2 w-100">
                            <button type="button" class="btn rounded-pill d-flex justify-content-center align-items-center my-font-md-400 my-button-transparent-borderless px-4 py-2 align-self-start">
                              取消
                            </button>
                            <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100">
                              <code class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white">btn rounded-pill d-flex justify-content-center align-items-center my-font-md-400 my-button-transparent-borderless px-4 py-2</code>
                              <DesignPageCopyBtn class="flex-shrink-0" text="btn rounded-pill d-flex justify-content-center align-items-center my-font-md-400 my-button-transparent-borderless px-4 py-2" :on-light-bg="false" />
                            </div>
                          </div>
                        </div>
                        <div>
                          <p class="my-font-sm-400 my-color-black mb-2">確定上傳</p>
                          <div class="design-page-3-btn-spec d-flex flex-column gap-2 w-100">
                            <button type="button" class="btn rounded-pill d-flex justify-content-center align-items-center gap-2 my-font-md-400 my-button-white flex-shrink-0 px-4 py-2 align-self-start">
                              確定上傳
                            </button>
                            <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100">
                              <code class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white">btn rounded-pill d-flex justify-content-center align-items-center gap-2 my-font-md-400 my-button-white flex-shrink-0 px-4 py-2</code>
                              <DesignPageCopyBtn class="flex-shrink-0" text="btn rounded-pill d-flex justify-content-center align-items-center gap-2 my-font-md-400 my-button-white flex-shrink-0 px-4 py-2" :on-light-bg="false" />
                            </div>
                          </div>
                        </div>
                        <div>
                          <p class="my-font-sm-400 my-color-black mb-2">刪除確認</p>
                          <div class="design-page-3-btn-spec d-flex flex-column gap-2 w-100">
                            <button type="button" class="btn rounded-pill d-flex justify-content-center align-items-center my-font-md-400 my-button-red px-4 py-2 align-self-start">
                              刪除
                            </button>
                            <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100">
                              <code class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white">btn rounded-pill d-flex justify-content-center align-items-center my-font-md-400 my-button-red px-4 py-2</code>
                              <DesignPageCopyBtn class="flex-shrink-0" text="btn rounded-pill d-flex justify-content-center align-items-center my-font-md-400 my-button-red px-4 py-2" :on-light-bg="false" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- 大：my-font-lg-400 -->
                    <div>
                      <div class="my-color-gray-4 my-font-sm-400 mb-2">大（my-font-lg-400）</div>
                      <div class="d-flex flex-column gap-3">
                        <div>
                          <p class="my-font-sm-400 my-color-black mb-2">空清單新增</p>
                          <div class="design-page-3-btn-spec d-flex flex-column gap-2 w-100">
                            <button type="button" class="btn rounded-pill d-inline-flex align-items-center gap-2 my-font-lg-400 my-button-white px-4 py-3 align-self-start">
                              <i class="fa-solid fa-plus" aria-hidden="true" />
                              新增試卷
                            </button>
                            <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100">
                              <code class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white">btn rounded-pill d-inline-flex align-items-center gap-2 my-font-lg-400 my-button-white px-4 py-3</code>
                              <DesignPageCopyBtn class="flex-shrink-0" text="btn rounded-pill d-inline-flex align-items-center gap-2 my-font-lg-400 my-button-white px-4 py-3" :on-light-bg="false" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- 圓形／列表列／關閉 -->
                    <div>
                      <div class="my-color-gray-4 my-font-sm-400 mb-2">圓形／列表列／關閉</div>
                      <div class="d-flex flex-column gap-3">
                        <div>
                          <p class="my-font-sm-400 my-color-black mb-2">頂列選單</p>
                          <div class="design-page-3-btn-spec d-flex flex-column gap-2 w-100">
                            <button type="button" class="btn rounded-circle d-flex justify-content-center align-items-center flex-shrink-0 my-font-md-400 my-color-gray-1 my-button-transparent-borderless design-page-3-detail-bar__menu-btn lh-1 dropdown-toggle my-dropdown-caret align-self-start" aria-label="選單">
                              <i class="fa-solid fa-bars" aria-hidden="true" />
                            </button>
                            <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100">
                              <code class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white">btn rounded-circle … *-detail-bar__menu-btn lh-1 dropdown-toggle my-dropdown-caret</code>
                              <DesignPageCopyBtn class="flex-shrink-0" text="btn rounded-circle d-flex justify-content-center align-items-center flex-shrink-0 my-font-md-400 my-color-gray-1 my-button-transparent-borderless exam-2-detail-bar__menu-btn lh-1 dropdown-toggle my-dropdown-caret" :on-light-bg="false" />
                            </div>
                          </div>
                        </div>
                        <div>
                          <p class="my-font-sm-400 my-color-black mb-2">列表列</p>
                          <div class="design-page-3-btn-spec d-flex flex-column gap-2 w-100" style="max-width: 28rem;">
                            <button type="button" class="dp2-bank-list-row w-100">
                              <span class="dp2-bank-list-row__label my-font-md-400 my-color-black">範例試卷</span>
                              <span class="dp2-bank-list-row__subtitle my-font-sm-400 my-color-gray-1">5 題</span>
                              <i class="fa-solid fa-chevron-right dp2-bank-list-row__chevron" aria-hidden="true" />
                            </button>
                            <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100">
                              <code class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white">bank-list-row</code>
                              <DesignPageCopyBtn class="flex-shrink-0" text="bank-list-row" :on-light-bg="false" />
                            </div>
                          </div>
                        </div>
                        <div>
                          <p class="my-font-sm-400 my-color-black mb-2">Modal 關閉</p>
                          <div class="design-page-3-btn-spec d-flex flex-column gap-2 w-100">
                            <button type="button" class="btn-close flex-shrink-0 align-self-start" aria-label="關閉"></button>
                            <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100">
                              <code class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white">btn-close</code>
                              <DesignPageCopyBtn class="flex-shrink-0" text="btn-close" :on-light-bg="false" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              </section>
            </template>

            <!-- ══════════════════════════════════════════════════
                 Badge
            ══════════════════════════════════════════════════ -->
            <template v-else-if="activeTab === 'badge'">
              <section class="my-page-block-spacing mb-0">
                <div class="rounded-4 my-bgcolor-gray-3 p-4">
                  <div role="heading" aria-level="2" class="my-font-lg-600 my-color-black text-break mb-2">Badge</div>
                  <p class="my-font-sm-400 my-color-gray-1 mb-4">「追問」標籤；UnitSelectDropdown 下拉選單內</p>
                  <div class="d-flex flex-column gap-3 mb-3">

                    <div>
                      <p class="my-font-sm-400 my-color-gray-1 mb-2">觸發按鈕列內（右側加 ms-2 flex-shrink-0）</p>
                      <div class="d-flex align-items-center gap-2">
                        <span class="my-font-sm-400 my-color-gray-1">單元名稱</span>
                        <span class="badge my-bgcolor-surface my-color-black border user-select-none my-font-sm-400 rounded ms-2 flex-shrink-0 px-2 py-1">追問</span>
                      </div>
                    </div>

                    <div>
                      <p class="my-font-sm-400 my-color-gray-1 mb-2">下拉選項列內</p>
                      <div class="d-flex align-items-center gap-2">
                        <span class="my-font-sm-400 my-color-gray-1">選項 A</span>
                        <span class="badge my-bgcolor-surface my-color-black border user-select-none my-font-sm-400 rounded px-2 py-1">追問</span>
                      </div>
                    </div>

                  </div>
                  <div class="d-flex flex-column gap-2">
                    <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100">
                      <code class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white">badge my-bgcolor-surface my-color-black border user-select-none my-font-sm-400 rounded px-2 py-1</code>
                      <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text="badge my-bgcolor-surface my-color-black border user-select-none my-font-sm-400 rounded px-2 py-1" :on-light-bg="false" />
                    </div>
                    <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100">
                      <code class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white">badge my-bgcolor-surface my-color-black border user-select-none my-font-sm-400 rounded ms-2 flex-shrink-0 px-2 py-1</code>
                      <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text="badge my-bgcolor-surface my-color-black border user-select-none my-font-sm-400 rounded ms-2 flex-shrink-0 px-2 py-1" :on-light-bg="false" />
                    </div>
                  </div>
                </div>
              </section>
            </template>

            <!-- ══════════════════════════════════════════════════
                 切換下拉選單
            ══════════════════════════════════════════════════ -->
            <template v-else-if="activeTab === 'dropdown'">
              <section class="my-page-block-spacing mb-0">
                <div class="rounded-4 my-bgcolor-gray-3 p-4">
                  <div role="heading" aria-level="2" class="my-font-lg-600 my-color-black text-break mb-2">切換下拉選單</div>
                  <p class="my-font-sm-400 my-color-gray-1 mb-4">dropdown-menu-end；min-width 10rem max-height min(60vh,24rem) overflow-y:auto；active = 目前；disabled = 無項目；my-color-red = 刪除</p>
                  <div class="d-flex flex-wrap gap-4 align-items-start mb-3">

                    <div>
                      <p class="my-font-sm-400 my-color-gray-1 mb-2">純文字列表（exam_3）</p>
                      <ul class="dropdown-menu dropdown-menu-end design-page-3-switch-menu show position-static d-block shadow mt-0">
                        <li><span class="dropdown-item disabled">尚無測驗（disabled）</span></li>
                        <li><button type="button" class="dropdown-item active">目前試卷（active）</button></li>
                        <li><button type="button" class="dropdown-item">其他試卷 A</button></li>
                        <li><hr class="dropdown-divider"></li>
                        <li><button type="button" class="dropdown-item my-color-red">刪除此試卷</button></li>
                      </ul>
                    </div>

                    <div>
                      <p class="my-font-sm-400 my-color-gray-1 mb-2">含試卷用綠點（create-exam-bank_2）</p>
                      <ul class="dropdown-menu dropdown-menu-end design-page-3-switch-menu show position-static d-block shadow mt-0">
                        <li>
                          <button type="button" class="dropdown-item active">
                            <span class="d-flex align-items-center gap-2"><span class="text-truncate">目前題庫（active）</span></span>
                          </button>
                        </li>
                        <li>
                          <button type="button" class="dropdown-item">
                            <span class="d-flex align-items-center gap-2">
                              <span class="rounded-circle d-inline-block flex-shrink-0 my-bgcolor-green" style="width: 0.5rem; height: 0.5rem;" aria-hidden="true" />
                              <span class="text-truncate">試卷用題庫</span>
                            </span>
                          </button>
                        </li>
                        <li><button type="button" class="dropdown-item"><span class="d-flex align-items-center gap-2"><span class="text-truncate">一般題庫</span></span></button></li>
                        <li><hr class="dropdown-divider"></li>
                        <li><button type="button" class="dropdown-item my-color-red">刪除此題庫</button></li>
                      </ul>
                    </div>

                  </div>
                  <div class="d-flex flex-column gap-2">
                    <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100">
                      <code class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white">dropdown-menu dropdown-menu-end</code>
                      <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text="dropdown-menu dropdown-menu-end" :on-light-bg="false" />
                    </div>
                    <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100">
                      <code class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white">dropdown-item active</code>
                      <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text="dropdown-item active" :on-light-bg="false" />
                    </div>
                    <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100">
                      <code class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white">dropdown-item disabled</code>
                      <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text="dropdown-item disabled" :on-light-bg="false" />
                    </div>
                    <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100">
                      <code class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white">dropdown-item my-color-red</code>
                      <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text="dropdown-item my-color-red" :on-light-bg="false" />
                    </div>
                    <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100">
                      <code class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white">rounded-circle d-inline-block flex-shrink-0 my-bgcolor-green</code>
                      <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text="rounded-circle d-inline-block flex-shrink-0 my-bgcolor-green" :on-light-bg="false" />
                    </div>
                    <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100">
                      <code class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white">*-switch-menu { min-width: 10rem; max-height: min(60vh, 24rem); overflow-x: hidden; overflow-y: auto; }</code>
                      <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text="min-width: 10rem; max-height: min(60vh, 24rem); overflow-x: hidden; overflow-y: auto;" :on-light-bg="false" />
                    </div>
                  </div>
                </div>
              </section>
            </template>

            <!-- ══════════════════════════════════════════════════
                 上傳 Modal ＋ 刪除確認 Modal ＋ LoadingOverlay
            ══════════════════════════════════════════════════ -->
            <template v-else-if="activeTab === 'modal'">
              <section class="my-page-block-spacing">
                <div class="rounded-4 my-bgcolor-gray-3 p-4 mb-5">
                  <div role="heading" aria-level="2" class="my-font-lg-600 my-color-black text-break mb-2">上傳 Modal</div>
                  <p class="my-font-sm-400 my-color-gray-1 mb-3">
                    create-exam-bank_2 新增題庫；Teleport to body；
                    <code class="my-color-black">modal-dialog-centered modal-lg modal-dialog-scrollable</code>；
                    drop zone 三種狀態（空 / 拖曳中 / 已選檔案）
                  </p>
                  <button
                    type="button"
                    class="btn rounded-pill d-inline-flex justify-content-center align-items-center gap-2 my-font-md-400 my-button-white flex-shrink-0 mb-4 px-4 py-2"
                    @click="openUploadModal"
                  >
                    <i class="fa-solid fa-upload" aria-hidden="true" />
                    開啟上傳 Modal
                  </button>

                  <!-- 靜態三狀態預覽 -->
                  <div class="rounded-4 p-3" style="border: 1px solid var(--my-color-gray-2, #e5e5e5);">
                    <div class="modal-content border-0 my-bgcolor-gray-3 d-flex flex-column gap-3 p-4">
                      <div class="modal-header border-bottom-0 p-0">
                        <h5 class="modal-title my-color-black mb-0">上傳檔案（靜態預覽）</h5>
                        <button type="button" class="btn-close" aria-label="關閉"></button>
                      </div>
                      <div class="modal-body min-w-0 d-flex flex-column gap-4 p-0">
                        <div>
                          <p class="my-font-sm-400 my-color-gray-1 mb-2">狀態 A · 空</p>
                          <div class="my-zip-drop-zone text-center position-relative">
                            <span class="my-font-sm-400 my-color-gray-4">拖曳.zip檔到這裡，或點擊選擇檔案</span>
                            <div class="my-font-sm-400 my-color-gray-4 mt-2">單檔不可超過 50 MB</div>
                            <div class="my-font-sm-400 my-color-gray-4 mt-2 text-start lh-sm w-100 mx-auto" style="max-width: 28rem;">
                              <div class="mb-1">請在「設定單元」為 ZIP 內各資料夾分別選單元類型；各資料夾裡，後端會讀取的副檔名依類型如下：</div>
                              <ul class="my-font-sm-400 my-color-gray-4 mb-0 ps-3">
                                <li class="mb-0">RAG：.pdf、.doc、.docx、.ppt、.pptx</li>
                                <li class="mb-0">文字：該資料夾內只能有一個 .md、.txt、.doc 或 .docx</li>
                                <li class="mb-0">mp3：該資料夾內只能有一個.mp3檔</li>
                                <li class="mb-0">youtube：.md、.txt、.doc 或 .docx（檔內須為 YouTube 網址）</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                        <div>
                          <p class="my-font-sm-400 my-color-gray-1 mb-2">狀態 B · 拖曳中（my-zip-drop-zone-over）</p>
                          <div class="my-zip-drop-zone my-zip-drop-zone-over text-center position-relative">
                            <span class="my-font-sm-400 my-color-gray-4">拖曳.zip檔到這裡，或點擊選擇檔案</span>
                          </div>
                        </div>
                        <div>
                          <p class="my-font-sm-400 my-color-gray-1 mb-2">狀態 C · 已選檔案</p>
                          <div class="my-zip-drop-zone text-center position-relative">
                            <span class="my-font-sm-400 my-color-black">example_bank.zip</span>
                            <div class="my-font-sm-400 my-color-gray-4 mt-1">點擊可重新選擇檔案</div>
                          </div>
                        </div>
                        <div>
                          <p class="my-font-sm-400 my-color-gray-1 mb-2">錯誤（newBankUploadError）</p>
                          <div class="my-alert-danger-soft my-font-sm-400 mb-0 py-2">請選擇 .zip 檔案</div>
                        </div>
                      </div>
                      <div class="modal-footer border-top-0 d-flex justify-content-end gap-2 w-100 p-0">
                        <button type="button" class="btn rounded-pill d-inline-flex justify-content-center align-items-center my-font-md-400 my-color-gray-1 my-button-transparent-borderless flex-shrink-0 px-4 py-2">取消</button>
                        <button type="button" class="btn rounded-pill d-flex justify-content-center align-items-center gap-2 my-font-md-400 my-button-white flex-shrink-0 px-4 py-2">確定上傳</button>
                      </div>
                    </div>
                  </div>

                  <div class="d-flex flex-column gap-2 mt-3">
                    <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100">
                      <code class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white">modal fade show d-block my-modal-backdrop</code>
                      <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text="modal fade show d-block my-modal-backdrop" :on-light-bg="false" />
                    </div>
                    <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100">
                      <code class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white">modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable</code>
                      <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable" :on-light-bg="false" />
                    </div>
                    <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100">
                      <code class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white">modal-content border-0 my-bgcolor-gray-3 d-flex flex-column gap-3 p-4</code>
                      <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text="modal-content border-0 my-bgcolor-gray-3 d-flex flex-column gap-3 p-4" :on-light-bg="false" />
                    </div>
                    <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100">
                      <code class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white">modal-header border-bottom-0 p-0</code>
                      <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text="modal-header border-bottom-0 p-0" :on-light-bg="false" />
                    </div>
                    <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100">
                      <code class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white">modal-title my-color-black</code>
                      <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text="modal-title my-color-black" :on-light-bg="false" />
                    </div>
                    <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100">
                      <code class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white">modal-body min-w-0 d-flex flex-column gap-4 p-0</code>
                      <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text="modal-body min-w-0 d-flex flex-column gap-4 p-0" :on-light-bg="false" />
                    </div>
                    <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100">
                      <code class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white">my-zip-drop-zone text-center position-relative</code>
                      <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text="my-zip-drop-zone text-center position-relative" :on-light-bg="false" />
                    </div>
                    <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100">
                      <code class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white">my-zip-drop-zone my-zip-drop-zone-over</code>
                      <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text="my-zip-drop-zone my-zip-drop-zone-over" :on-light-bg="false" />
                    </div>
                    <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100">
                      <code class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white">modal-footer border-top-0 d-flex justify-content-end gap-2 w-100 p-0</code>
                      <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text="modal-footer border-top-0 d-flex justify-content-end gap-2 w-100 p-0" :on-light-bg="false" />
                    </div>
                  </div>
                </div>
              </section>

              <section class="my-page-block-spacing">
                <div class="rounded-4 my-bgcolor-gray-3 p-4 mb-5">
                  <div role="heading" aria-level="2" class="my-font-lg-600 my-color-black text-break mb-2">刪除確認 Modal</div>
                  <p class="my-font-sm-400 my-color-black mb-2">
                    兩頁共用元件 <code class="my-color-black">ConfirmDeleteModal</code>
                  </p>
                  <p class="my-font-sm-400 my-color-gray-1 mb-4">
                    props：<code>v-model</code> · <code>title</code> · <code>:message</code> · <code>:deleting</code> · <code>:error</code> → <code>@confirm</code>
                  </p>
                  <button
                    type="button"
                    class="btn rounded-pill d-inline-flex justify-content-center align-items-center gap-2 my-font-md-400 my-color-red my-button-transparent-borderless px-4 py-2"
                    style="border: 1px solid var(--my-color-red, #e53935);"
                    @click="openDeleteModal"
                  >
                    <i class="fa-solid fa-trash" aria-hidden="true" />
                    開啟刪除確認 Modal
                  </button>
                </div>
              </section>

              <section class="my-page-block-spacing mb-0">
                <div class="rounded-4 my-bgcolor-gray-3 p-4">
                  <div role="heading" aria-level="2" class="my-font-lg-600 my-color-black text-break mb-2">LoadingOverlay</div>
                  <p class="my-font-sm-400 my-color-black mb-2">兩頁共用 <code class="my-color-black">LoadingOverlay</code>；兩種情境</p>
                  <ul class="my-font-sm-400 my-color-gray-1 d-flex flex-column gap-1 mb-4 ps-3">
                    <li>grid 模式初次載入：<code>:is-visible="showGridLoadingOverlay"</code>（loading-text="載入中..."）</li>
                    <li>detail 模式刪除中：<code>:is-visible="deleteExamLoading / deleteRagLoading"</code>（loading-text="刪除中..."）</li>
                  </ul>
                  <button
                    type="button"
                    class="btn rounded-pill d-inline-flex justify-content-center align-items-center gap-2 my-font-md-400 my-button-white flex-shrink-0 px-4 py-2"
                    @click="toggleLoading"
                  >
                    <i class="fa-solid fa-spinner" aria-hidden="true" />
                    {{ loadingVisible ? '關閉 Loading' : '顯示 Loading（3 秒）' }}
                  </button>
                </div>
              </section>
            </template>

            <!-- ══════════════════════════════════════════════════
                 嵌入模式
            ══════════════════════════════════════════════════ -->
            <template v-else-if="activeTab === 'embed'">
              <section class="my-page-block-spacing mb-0">
                <div class="rounded-4 my-bgcolor-gray-3 p-4">
                  <div role="heading" aria-level="2" class="my-font-lg-600 my-color-black text-break mb-2">嵌入模式</div>
                  <p class="my-font-sm-400 my-color-gray-1 mb-3">detail 模式嵌入原頁（:deep 隱藏 header 與分頁列 .my-rag-tabs-bar）</p>
                  <div class="d-flex flex-column gap-2">
                    <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100">
                      <code class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white">.exam-2-embedded :deep(> header) { display: none; }</code>
                      <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text=".exam-2-embedded :deep(> header) { display: none; }" :on-light-bg="false" />
                    </div>
                    <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100">
                      <code class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white">.exam-2-embedded :deep(.my-rag-tabs-bar) { display: none !important; }</code>
                      <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text=".exam-2-embedded :deep(.my-rag-tabs-bar) { display: none !important; }" :on-light-bg="false" />
                    </div>
                    <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100">
                      <code class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white">.create-exam-bank-2-embedded :deep(> header) { display: none; }</code>
                      <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text=".create-exam-bank-2-embedded :deep(> header) { display: none; }" :on-light-bg="false" />
                    </div>
                    <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100">
                      <code class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white">.create-exam-bank-2-embedded :deep(.my-rag-tabs-bar) { display: none !important; }</code>
                      <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text=".create-exam-bank-2-embedded :deep(.my-rag-tabs-bar) { display: none !important; }" :on-light-bg="false" />
                    </div>
                  </div>
                </div>
              </section>
            </template>

          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- ── 上傳 Modal（實際運作） ── -->
  <Teleport to="body">
    <div
      v-if="uploadModalOpen"
      class="modal fade show d-block my-modal-backdrop"
      tabindex="-1"
      role="dialog"
      aria-modal="true"
      aria-labelledby="design2-upload-modal-title"
      @click.self="closeUploadModal"
    >
      <div class="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable" @click.stop>
        <div class="modal-content border-0 my-bgcolor-gray-3 d-flex flex-column gap-3 p-4">
          <div class="modal-header border-bottom-0 p-0">
            <h5 id="design2-upload-modal-title" class="modal-title my-color-black mb-0">上傳檔案</h5>
            <button type="button" class="btn-close" aria-label="關閉" @click="closeUploadModal" />
          </div>
          <div class="modal-body min-w-0 d-flex flex-column gap-3 p-0">
            <input type="file" accept=".zip" class="d-none" @change="onUploadFileChange">
            <div
              class="my-zip-drop-zone text-center position-relative"
              :class="{ 'my-zip-drop-zone-over': uploadDragOver }"
              @dragover="onUploadDragOver"
              @dragenter="onUploadDragOver"
              @dragleave="onUploadDragLeave"
              @drop="onUploadDrop"
              @click="$event.currentTarget.previousElementSibling?.click()"
            >
              <template v-if="uploadFileName">
                <span class="my-font-sm-400 my-color-black">{{ uploadFileName }}</span>
                <div class="my-font-sm-400 my-color-gray-4 mt-1">點擊可重新選擇檔案</div>
              </template>
              <template v-else>
                <span class="my-font-sm-400 my-color-gray-4">拖曳.zip檔到這裡，或點擊選擇檔案</span>
                <div class="my-font-sm-400 my-color-gray-4 mt-2">單檔不可超過 50 MB</div>
                <div class="my-font-sm-400 my-color-gray-4 mt-2 text-start lh-sm w-100 mx-auto" style="max-width: 28rem;">
                  <div class="mb-1">請在「設定單元」為 ZIP 內各資料夾分別選單元類型；各資料夾裡，後端會讀取的副檔名依類型如下：</div>
                  <ul class="my-font-sm-400 my-color-gray-4 mb-0 ps-3">
                    <li class="mb-0">RAG：.pdf、.doc、.docx、.ppt、.pptx</li>
                    <li class="mb-0">文字：該資料夾內只能有一個 .md、.txt、.doc 或 .docx</li>
                    <li class="mb-0">mp3：該資料夾內只能有一個.mp3檔</li>
                    <li class="mb-0">youtube：.md、.txt、.doc 或 .docx（檔內須為 YouTube 網址）</li>
                  </ul>
                </div>
              </template>
            </div>
            <div v-if="uploadError" class="my-alert-danger-soft my-font-sm-400 mb-0 py-2">{{ uploadError }}</div>
          </div>
          <div class="modal-footer border-top-0 d-flex justify-content-end gap-2 w-100 p-0">
            <button type="button" class="btn rounded-pill d-inline-flex justify-content-center align-items-center my-font-md-400 my-color-gray-1 my-button-transparent-borderless flex-shrink-0 px-4 py-2" @click="closeUploadModal">取消</button>
            <button type="button" class="btn rounded-pill d-flex justify-content-center align-items-center gap-2 my-font-md-400 my-button-white flex-shrink-0 px-4 py-2" @click="onUploadConfirm">確定上傳</button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- ── 刪除確認 Modal ── -->
  <ConfirmDeleteModal
    v-model="deleteModalOpen"
    title="刪除此試卷"
    message="確定要刪除「範例試卷 A」嗎？（Design 示範用）"
    :deleting="deleteModalDeleting"
    :error="deleteModalError"
    @confirm="onDeleteConfirm"
  />

  <!-- ── LoadingOverlay ── -->
  <LoadingOverlay :is-visible="loadingVisible" loading-text="載入中..." />
</template>

<style scoped>
/* ── list 入口預覽（dp2- 前綴，僅 DesignPage2 scoped 用） ──────── */
.dp2-bank-list-wrap {
  width: 100%;
  max-width: 40rem;
}

.dp2-bank-table-actions {
  display: flex;
  justify-content: flex-end;
  padding-bottom: 0.75rem;
  margin-inline: -1rem;
}

@media (min-width: 768px) {
  .dp2-bank-table-actions {
    margin-inline: -1.5rem;
  }
}

.dp2-bank-table-header {
  display: flex;
  align-items: center;
  padding: 0 1.25rem 0.5rem;
}

.dp2-bank-table-header__dot-spacer {
  display: inline-block;
  width: calc(0.5rem + 0.75rem);
  flex-shrink: 0;
}

.dp2-bank-list {
  list-style: none;
  padding: 0;
  margin: 0;
  border-bottom: 1px solid var(--my-color-gray-2, #e5e5e5);
}

.dp2-bank-list > li {
  display: block;
  border-top: 1px solid var(--my-color-gray-2, #e5e5e5);
}

.dp2-bank-list-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.875rem 1.25rem;
  background: transparent;
  border: none;
  text-align: left;
  cursor: pointer;
  min-width: 0;
  transition: background-color 0.12s ease;
}

.dp2-bank-list-row:hover:not(:disabled) {
  background-color: var(--my-color-gray-2, #e5e5e5);
}

.dp2-bank-list-row:focus-visible {
  outline: 2px solid var(--my-color-black, #000);
  outline-offset: -2px;
}

.dp2-bank-list-row__dot-col {
  flex-shrink: 0;
  width: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dp2-bank-list-row__exam-dot {
  width: 0.5rem;
  height: 0.5rem;
}

.dp2-bank-list-row__label {
  flex: 1 1 0;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dp2-bank-list-row__subtitle {
  flex-shrink: 0;
  white-space: nowrap;
}

.dp2-bank-list-row__chevron {
  flex-shrink: 0;
  font-size: 0.625rem;
  opacity: 0.4;
}

/* bank-grid */
.bank-grid-wrap { width: 100%; }

.bank-grid {
  display: grid;
  grid-template-columns: repeat(1, minmax(0, 1fr));
  gap: 1rem;
}
@media (min-width: 768px) { .bank-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (min-width: 992px) { .bank-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }

.bank-grid-tile {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 9.5rem;
  padding: 1.25rem 1rem;
  border: 1px solid var(--my-color-gray-2, #e5e5e5);
  border-radius: 1rem;
  background: var(--my-color-gray-3, #f5f5f5);
  cursor: pointer;
  text-align: center;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
}
.bank-grid-tile:hover:not(:disabled) {
  border-color: var(--my-color-gray-1, #999);
  box-shadow: 0 0.25rem 1rem rgb(0 0 0 / 0.08);
  transform: translateY(-2px);
}
.bank-grid-tile:focus-visible { outline: 2px solid var(--my-color-black, #000); outline-offset: 2px; }
.bank-grid-tile--add { border-style: dashed; background: transparent; }
.bank-grid-tile--add:hover:not(:disabled) { background: var(--my-color-gray-3, #f5f5f5); }
.bank-grid-tile__exam-dot { position: absolute; top: 0.75rem; right: 0.75rem; width: 0.5rem; height: 0.5rem; }
.bank-grid-tile__icon--add { font-size: 2rem; line-height: 1; color: var(--my-color-gray-1, #999); }
.bank-grid-tile__label { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; width: 100%; }
.bank-grid-tile__subtitle { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 1; overflow: hidden; width: 100%; }

/* detail-bar */
.design-page-3-detail-bar {
  display: grid;
  grid-template-columns: 1fr minmax(0, 50%) 1fr;
  align-items: center;
  gap: 0.75rem;
  border-color: var(--my-color-gray-2, #e5e5e5) !important;
  overflow: visible;
  position: relative;
  z-index: 30;
}
.design-page-3-detail-bar__start { justify-self: start; min-width: 0; }
.design-page-3-detail-bar__center { justify-self: stretch; width: 100%; min-width: 0; }
.design-page-3-detail-bar__title {
  display: block;
  border: none; outline: none; box-shadow: none; background: transparent;
  margin: 0; font-family: inherit; line-height: inherit;
  appearance: none; -webkit-appearance: none;
  transition: background-color 0.15s ease;
}
.design-page-3-detail-bar__title:hover,
.design-page-3-detail-bar__title:focus { background-color: var(--my-color-gray-3, #f5f5f5); outline: none; box-shadow: none; border: none; }
.design-page-3-detail-bar__end { justify-self: end; min-width: 0; }
.design-page-3-detail-bar__menu-btn,
.design-page-3-menu-btn { width: 2.375rem; height: 2.375rem; min-width: 2.375rem; min-height: 2.375rem; padding: 0; }

/* 按鈕 tab：黑框 class 列，複製鈕固定右上 */
.design-page-3-btn-spec .my-design-swatch-row {
  position: relative;
  align-items: flex-start;
  padding-right: calc(1rem + 32px + 0.25rem);
}
.design-page-3-btn-spec .my-design-swatch-row > code {
  min-width: 0;
  width: 100%;
}
.design-page-3-btn-spec .my-design-swatch-row :deep(.my-design-page-copy-btn) {
  position: absolute;
  top: 0.5rem;
  right: 1rem;
  margin: 0;
}

/* 下拉選單 */
.design-page-3-switch-menu { min-width: 10rem; max-height: min(60vh, 24rem); overflow-x: hidden; overflow-y: auto; }
.design-page-3-switch-menu > li { display: block; width: 100%; }
.design-page-3-switch-menu .dropdown-item { width: 100%; white-space: nowrap; }
</style>
