<script setup>
import { ref } from 'vue';
import DesignPageCopyBtn from '../components/DesignPageCopyBtn.vue';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal.vue';
import LoadingOverlay from '../components/LoadingOverlay.vue';
import LogoGradientPillButton from '../components/LogoGradientPillButton.vue';
import ExamPage2DetailBar from '../components/ExamPage2DetailBar.vue';
import CreateExamQuizBankPage2DetailBar from '../components/CreateExamQuizBankPage2DetailBar.vue';
import ExamPageExamSwitchDropdown from '../components/ExamPageExamSwitchDropdown.vue';
import CreateExamQuizBankBankSwitchDropdown from '../components/CreateExamQuizBankBankSwitchDropdown.vue';

defineProps({
  tabId: { type: String, default: '' },
});

const demoExamLabel = ref('範例試卷 A');
const demoBankLabel = ref('範例題庫 B');
const demoExamGridItems = [
  { tabId: 'exam-a', label: '範例試卷 A', subtitle: '5 題' },
  { tabId: 'exam-b', label: '其他試卷', subtitle: '3 題' },
];
const demoBankGridItems = [
  { tabId: 'bank-a', label: '範例題庫 B', subtitle: '3 個單元', isExam: false },
  { tabId: 'bank-b', label: '試卷用題庫', subtitle: '', isExam: true },
];

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
    <header class="flex-shrink-0 my-bgcolor-white p-4">
      <div class="container-fluid px-0 text-center">
        <p class="my-font-xl-400 my-color-black text-break mb-0">UI 元件參考 3</p>
      </div>
    </header>

    <!-- Tab 列（置中；底線隨 tab 寬度，不 w-100 滿版） -->
    <div class="flex-shrink-0 w-100 my-rag-tabs-bar my-bgcolor-white">
      <div class="d-flex justify-content-center w-100 align-items-center">
        <ul class="nav nav-tabs">
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
                      <p class="my-font-sm-400 my-color-gray-1 mb-1">左側清單欄底、detail bar 底；drop zone 底（gray-3）</p>
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
                      <p class="my-font-sm-400 my-color-gray-1 mb-1">左側清單欄（side panel）；detail bar 背景</p>
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
                      <p class="my-font-sm-400 my-color-gray-1 mb-1">試卷用題庫：列表綠點、下拉選單列小圓點</p>
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
                  <div role="heading" aria-level="2" class="my-font-lg-600 my-color-black text-break mb-2">課程 header（TopView）</div>
                  <p class="my-font-sm-400 my-color-gray-1 mb-4">
                    <code class="my-color-black">SideRailView</code>（64px）＋
                    <code class="my-color-black">TopView</code>（64px 高、白底）；
                    中央「<strong>課程名稱</strong> | 頁面名稱」（課程名 my-font-lg-600）；
                    右側 <code class="my-color-black">ExamPageExamSwitchDropdown</code>（exam_3 列表／詳情皆顯示）或
                    <code class="my-color-black">CreateExamQuizBankBankSwitchDropdown</code>（create-exam-bank_3 詳情）
                  </p>
                  <header class="design-page-3-topview-preview my-course-header flex-shrink-0 my-bgcolor-white border rounded-3">
                    <div class="my-course-header-inner px-3 min-w-0 w-100">
                      <div class="my-course-header-inner__center min-w-0">
                        <p class="my-course-header-course-title my-font-lg-400 my-color-black text-truncate text-start w-100 mb-0">
                          <span class="my-font-lg-600">範例課程</span>
                          <span class="my-course-header-course-title__sep mx-2" aria-hidden="true">|</span>
                          <span>測驗</span>
                        </p>
                      </div>
                      <div class="my-course-header-inner__end d-flex align-items-center justify-content-end gap-2 min-w-0 flex-shrink-0">
                        <ExamPageExamSwitchDropdown
                          :grid-items="demoExamGridItems"
                          selected-exam-tab-id="exam-a"
                        />
                      </div>
                    </div>
                  </header>
                </div>
              </section>

              <section class="my-page-block-spacing">
                <div class="rounded-4 my-bgcolor-gray-3 p-4 mb-5">
                  <div role="heading" aria-level="2" class="my-font-lg-600 my-color-black text-break mb-2">左側清單 detail bar（exam_3）</div>
                  <p class="my-font-sm-400 my-color-gray-1 mb-4">
                    元件 <code class="my-color-black">ExamPage2DetailBar</code> ·
                    <code class="my-color-black">in-side-panel</code>；
                    返回鈕 <code class="my-color-black">← 返回主頁</code>（
                    <code class="my-color-black">fa-arrow-left</code> + 預設
                    <code class="my-color-black">back-label</code>）；
                    底 <code class="my-color-black">my-bgcolor-gray-4</code>；標題左對齊
                  </p>
                  <div class="design-page-3-side-panel-preview my-bgcolor-gray-4 rounded-3 overflow-hidden border" style="max-width: 20rem;">
                    <ExamPage2DetailBar
                      v-model:selected-exam-label="demoExamLabel"
                      :grid-items="demoExamGridItems"
                      selected-exam-tab-id="exam-a"
                      in-side-panel
                    />
                  </div>
                </div>
              </section>

              <section class="my-page-block-spacing mb-0">
                <div class="rounded-4 my-bgcolor-gray-3 p-4">
                  <div role="heading" aria-level="2" class="my-font-lg-600 my-color-black text-break mb-2">左側清單 detail bar（create-exam-bank_3）</div>
                  <p class="my-font-sm-400 my-color-gray-1 mb-4">
                    元件 <code class="my-color-black">CreateExamQuizBankPage2DetailBar</code> ·
                    <code class="my-color-black">in-side-panel</code>；
                    返回鈕 <code class="my-color-black">← 返回主頁</code>
                  </p>
                  <div class="design-page-3-side-panel-preview my-bgcolor-gray-4 rounded-3 overflow-hidden border" style="max-width: 20rem;">
                    <CreateExamQuizBankPage2DetailBar
                      v-model:selected-bank-label="demoBankLabel"
                      :grid-items="demoBankGridItems"
                      selected-bank-tab-id="bank-a"
                      in-side-panel
                    />
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
                    <code class="my-color-black">ExamPage2</code>／
                    <code class="my-color-black">CreateExamQuizBankPage2</code> grid 主頁（白底）；
                    class 前綴 <code class="my-color-black">bank-*</code>（ExamPage2.vue／CreateExamQuizBankPage2.vue scoped）；
                    表頭排序用 <code class="my-color-black">bank-table-sort-btn</code>（px-0，無 rounded-pill）；
                    hover → gray-2
                  </p>

                  <p class="my-font-sm-400 my-color-black mb-2">exam_3（無綠點欄）</p>
                  <div class="my-bgcolor-white rounded-3 p-3 mb-4 border">
                    <div class="dp3-bank-list-wrap mx-auto">
                      <div class="dp3-bank-table-actions">
                        <button type="button" class="btn rounded-pill d-inline-flex align-items-center gap-2 my-font-md-400 my-button-white px-4 py-2">
                          <i class="fa-solid fa-plus" aria-hidden="true" />
                          新增試卷
                        </button>
                      </div>
                      <div class="dp3-bank-table-header">
                        <button type="button" class="dp3-bank-table-sort-btn btn d-inline-flex align-items-center gap-2 my-font-sm-400 my-color-gray-1 my-button-transparent-borderless px-0 py-1 flex-shrink-0">
                          名稱
                          <i class="fa-solid fa-chevron-up" aria-hidden="true" />
                        </button>
                      </div>
                      <ul class="dp3-bank-list">
                        <li>
                          <button type="button" class="dp3-bank-list-row">
                            <span class="dp3-bank-list-row__label my-font-md-400 my-color-black">範例試卷 A</span>
                            <span class="dp3-bank-list-row__subtitle my-font-sm-400 my-color-gray-1">5 題</span>
                            <i class="fa-solid fa-chevron-right dp3-bank-list-row__chevron" aria-hidden="true" />
                          </button>
                        </li>
                        <li>
                          <button type="button" class="dp3-bank-list-row">
                            <span class="dp3-bank-list-row__label my-font-md-400 my-color-black">未命名試卷</span>
                            <i class="fa-solid fa-chevron-right dp3-bank-list-row__chevron" aria-hidden="true" />
                          </button>
                        </li>
                      </ul>
                    </div>
                  </div>

                  <p class="my-font-sm-400 my-color-black mb-2">create-exam-bank_3（含綠點欄）</p>
                  <div class="my-bgcolor-white rounded-3 p-3 mb-3 border">
                    <div class="dp3-bank-list-wrap mx-auto">
                      <div class="dp3-bank-table-actions">
                        <button type="button" class="btn rounded-pill d-inline-flex align-items-center gap-2 my-font-md-400 my-button-white px-4 py-2">
                          <i class="fa-solid fa-plus" aria-hidden="true" />
                          新增測驗題庫
                        </button>
                      </div>
                      <div class="dp3-bank-table-header">
                        <span class="dp3-bank-table-header__dot-spacer" aria-hidden="true" />
                        <button type="button" class="dp3-bank-table-sort-btn btn d-inline-flex align-items-center gap-2 my-font-sm-400 my-color-gray-1 my-button-transparent-borderless px-0 py-1 flex-shrink-0">
                          名稱
                          <i class="fa-solid fa-chevron-up" aria-hidden="true" />
                        </button>
                      </div>
                      <ul class="dp3-bank-list">
                        <li>
                          <button type="button" class="dp3-bank-list-row">
                            <span class="dp3-bank-list-row__dot-col" aria-label="試卷用題庫">
                              <span class="rounded-circle d-inline-block my-bgcolor-green dp3-bank-list-row__exam-dot" />
                            </span>
                            <span class="dp3-bank-list-row__label my-font-md-400 my-color-black">試卷用題庫</span>
                            <span class="dp3-bank-list-row__subtitle my-font-sm-400 my-color-gray-1">3 個單元</span>
                            <i class="fa-solid fa-chevron-right dp3-bank-list-row__chevron" aria-hidden="true" />
                          </button>
                        </li>
                        <li>
                          <button type="button" class="dp3-bank-list-row">
                            <span class="dp3-bank-list-row__dot-col" />
                            <span class="dp3-bank-list-row__label my-font-md-400 my-color-black">範例題庫 B</span>
                            <i class="fa-solid fa-chevron-right dp3-bank-list-row__chevron" aria-hidden="true" />
                          </button>
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div class="d-flex flex-column gap-2">
                    <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100">
                      <code class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white">bank-list-wrap · bank-table-actions · bank-table-header · bank-table-sort-btn · bank-list · bank-list-row</code>
                      <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text="bank-list-wrap" :on-light-bg="false" />
                    </div>
                    <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100">
                      <code class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white">bank-table-header__dot-spacer · bank-list-row__dot-col · bank-list-row__exam-dot（create-exam-bank_3 only）</code>
                      <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text="bank-table-header__dot-spacer" :on-light-bg="false" />
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
                            <button type="button" class="dp3-bank-table-sort-btn btn d-inline-flex align-items-center gap-2 my-font-sm-400 my-color-gray-1 my-button-transparent-borderless px-0 py-1 align-self-start">
                              名稱
                              <i class="fa-solid fa-chevron-up" aria-hidden="true" />
                            </button>
                            <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100">
                              <code class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white">bank-table-sort-btn btn d-inline-flex align-items-center gap-2 my-font-sm-400 my-color-gray-1 my-button-transparent-borderless px-0 py-1</code>
                              <DesignPageCopyBtn class="flex-shrink-0" text="bank-table-sort-btn btn d-inline-flex align-items-center gap-2 my-font-sm-400 my-color-gray-1 my-button-transparent-borderless px-0 py-1" :on-light-bg="false" />
                            </div>
                          </div>
                        </div>
                        <div>
                          <p class="my-font-sm-400 my-color-black mb-2">← 返回主頁（exam_3／create-exam-bank_3 左欄）</p>
                          <div class="design-page-3-btn-spec d-flex flex-column gap-2 w-100">
                            <button type="button" class="btn d-inline-flex align-items-center gap-2 my-font-sm-400 my-color-gray-1 my-button-transparent-borderless px-3 pt-3 pb-2 flex-shrink-0 align-self-start">
                              <i class="fa-solid fa-arrow-left flex-shrink-0" aria-hidden="true" />
                              <span>返回主頁</span>
                            </button>
                            <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100">
                              <code class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white">*-detail-bar__back-btn--in-side-panel btn d-inline-flex align-items-center gap-2 my-font-sm-400 my-color-gray-1 my-button-transparent-borderless px-3 pt-3 pb-2</code>
                              <DesignPageCopyBtn class="flex-shrink-0" text="exam-2-detail-bar__back-btn--in-side-panel btn d-inline-flex align-items-center gap-2 my-font-sm-400 my-color-gray-1 my-button-transparent-borderless px-3 pt-3 pb-2" :on-light-bg="false" />
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
                            <button type="button" class="btn rounded-pill d-flex justify-content-center align-items-center my-font-md-400 my-btn-outline-red-hollow px-4 py-2 align-self-start">
                              刪除
                            </button>
                            <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100">
                              <code class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white">btn rounded-pill d-flex justify-content-center align-items-center my-font-md-400 my-btn-outline-red-hollow px-4 py-2</code>
                              <DesignPageCopyBtn class="flex-shrink-0" text="btn rounded-pill d-flex justify-content-center align-items-center my-font-md-400 my-btn-outline-red-hollow px-4 py-2" :on-light-bg="false" />
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
                          <p class="my-font-sm-400 my-color-black mb-2">頂列選單（TopView course-header-nav）</p>
                          <div class="design-page-3-btn-spec d-flex flex-column gap-2 w-100">
                            <ExamPageExamSwitchDropdown
                              :grid-items="demoExamGridItems"
                              selected-exam-tab-id="exam-a"
                            />
                            <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100">
                              <code class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white">ExamPageExamSwitchDropdown · my-course-header-nav-btn</code>
                              <DesignPageCopyBtn class="flex-shrink-0" text="ExamPageExamSwitchDropdown" :on-light-bg="false" />
                            </div>
                          </div>
                        </div>
                        <div>
                          <p class="my-font-sm-400 my-color-black mb-2">列表列</p>
                          <div class="design-page-3-btn-spec d-flex flex-column gap-2 w-100" style="max-width: 28rem;">
                            <button type="button" class="dp3-bank-list-row w-100">
                              <span class="dp3-bank-list-row__label my-font-md-400 my-color-black">範例試卷</span>
                              <span class="dp3-bank-list-row__subtitle my-font-sm-400 my-color-gray-1">5 題</span>
                              <i class="fa-solid fa-chevron-right dp3-bank-list-row__chevron" aria-hidden="true" />
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
                  <p class="my-font-sm-400 my-color-gray-1 mb-4">
                    exam_3 TopView 右側（列表／詳情）：
                    <code class="my-color-black">ExamPageExamSwitchDropdown</code>（所有試卷）；
                    create-exam-bank_3 詳情：
                    <code class="my-color-black">CreateExamQuizBankBankSwitchDropdown</code>（所有題庫，variant=course-header-nav）；
                    dropdown-menu-end；active／disabled；my-color-red = 刪除
                  </p>
                  <div class="d-flex flex-wrap gap-4 align-items-start mb-3">
                    <div>
                      <p class="my-font-sm-400 my-color-gray-1 mb-2">ExamPageExamSwitchDropdown</p>
                      <ExamPageExamSwitchDropdown
                        :grid-items="demoExamGridItems"
                        selected-exam-tab-id="exam-a"
                      />
                    </div>
                    <div>
                      <p class="my-font-sm-400 my-color-gray-1 mb-2">CreateExamQuizBankBankSwitchDropdown</p>
                      <CreateExamQuizBankBankSwitchDropdown
                        :grid-items="demoBankGridItems"
                        selected-bank-tab-id="bank-b"
                      />
                    </div>
                  </div>
                  <div class="d-flex flex-column gap-2">
                    <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100">
                      <code class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white">exam-page-exam-switch-menu · create-exam-bank-bank-switch-menu</code>
                      <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text="exam-page-exam-switch-menu" :on-light-bg="false" />
                    </div>
                    <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100">
                      <code class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white">my-course-header-nav-btn（TopView 觸發鈕）</code>
                      <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text="my-course-header-nav-btn" :on-light-bg="false" />
                    </div>
                    <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100">
                      <code class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white">dropdown-item active · dropdown-item disabled · dropdown-item my-color-red</code>
                      <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text="dropdown-item my-color-red" :on-light-bg="false" />
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
                    create-exam-bank_3 新增題庫；Teleport to body；
                    <code class="my-color-black">modal-dialog-centered modal-lg modal-dialog-scrollable</code>；
                    drop zone 三種狀態（空 / 拖曳中 / 已選檔案）；淺灰底 gray-3
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
                    <div class="modal-content border-0 my-bgcolor-white d-flex flex-column gap-3 p-4">
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
                      <code class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white">modal-content border-0 my-bgcolor-white d-flex flex-column gap-3 p-4</code>
                      <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text="modal-content border-0 my-bgcolor-white d-flex flex-column gap-3 p-4" :on-light-bg="false" />
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
                    class="btn rounded-pill d-inline-flex justify-content-center align-items-center gap-2 my-font-md-400 my-btn-outline-red-hollow px-4 py-2"
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
                  <p class="my-font-sm-400 my-color-gray-1 mb-3">
                    exam_3／create-exam-bank_3：<code class="my-color-black">sidePanelOnLeft</code>；
                    版面為 <code class="my-color-black">SideRailView</code> ＋ <code class="my-color-black">TopView</code> ＋ 左欄清單（gray-4）＋ 右欄主內容（白底）；
                    detail bar 經 <code class="my-color-black">#side-panel-header</code> slot 嵌入左欄
                  </p>
                  <div class="d-flex flex-column gap-2">
                    <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100">
                      <code class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white">.exam-2--side-panel-left · .create-exam-bank-2--side-panel-left</code>
                      <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text="exam-2--side-panel-left" :on-light-bg="false" />
                    </div>
                    <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100">
                      <code class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white">.exam-2-embedded :deep(> header) { display: none; }</code>
                      <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text=".exam-2-embedded :deep(> header) { display: none; }" :on-light-bg="false" />
                    </div>
                    <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100">
                      <code class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white">.exam-2-embedded :deep(.my-rag-tabs-bar) { display: none !important; }</code>
                      <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text=".exam-2-embedded :deep(.my-rag-tabs-bar) { display: none !important; }" :on-light-bg="false" />
                    </div>
                    <div class="my-design-swatch-row my-bgcolor-black min-w-0 w-100">
                      <code class="user-select-all my-font-sm-400 font-monospace text-break flex-grow-1 min-w-0 px-1 my-color-white">ExamPage2DetailBar in-side-panel · CreateExamQuizBankPage2DetailBar in-side-panel</code>
                      <DesignPageCopyBtn class="flex-shrink-0 ms-auto" text="ExamPage2DetailBar in-side-panel" :on-light-bg="false" />
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
      aria-labelledby="design3-upload-modal-title"
      @click.self="closeUploadModal"
    >
      <div class="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable" @click.stop>
        <div class="modal-content border-0 my-bgcolor-white d-flex flex-column gap-3 p-4">
          <div class="modal-header border-bottom-0 p-0">
            <h5 id="design3-upload-modal-title" class="modal-title my-color-black mb-0">上傳檔案</h5>
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
/* ── TopView 預覽（對齊 TopView.vue） ───────────────────────── */
.design-page-3-topview-preview.my-course-header {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: stretch;
  box-sizing: border-box;
  height: 64px;
  min-height: 64px;
  max-height: 64px;
  overflow: visible;
}

.design-page-3-topview-preview .my-course-header-inner {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.75rem;
  height: 100%;
  min-height: 0;
  overflow: visible;
  width: 100%;
}

.design-page-3-topview-preview .my-course-header-inner__center {
  justify-self: stretch;
  width: 100%;
  min-width: 0;
}

.design-page-3-topview-preview .my-course-header-inner__end {
  justify-self: end;
  min-width: 0;
  overflow: visible;
}

.design-page-3-topview-preview .my-course-header-course-title {
  line-height: 1.35;
}

.design-page-3-topview-preview .my-course-header-course-title__sep {
  color: var(--my-color-gray-1);
  font-weight: var(--my-font-weight-regular);
}

.design-page-3-topview-preview :deep(.my-course-header-nav-btn) {
  color: var(--my-color-gray-1);
  background-color: var(--my-color-white);
  border: 1px solid var(--my-color-gray-2);
  box-shadow: none;
  text-decoration: none;
}

.design-page-3-topview-preview :deep(.my-course-header-nav-btn:hover),
.design-page-3-topview-preview :deep(.my-course-header-nav-btn:focus-visible) {
  color: var(--my-color-gray-1);
  background-color: color-mix(in srgb, var(--my-color-black) 7%, var(--my-color-white));
  border-color: color-mix(in srgb, var(--my-color-black) 18%, var(--my-color-gray-2));
  outline: none;
}

/* ── list 入口預覽（dp3- 前綴，對齊 ExamPage2／CreateExamQuizBankPage2 scoped bank-*） ── */
.dp3-bank-list-wrap {
  width: 100%;
  max-width: 40rem;
}

.dp3-bank-table-actions {
  display: flex;
  justify-content: flex-end;
  padding-bottom: 0.75rem;
}

.dp3-bank-table-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0 1.25rem 0.5rem;
}

.dp3-bank-table-sort-btn {
  color: var(--my-color-gray-1) !important;
  background-color: transparent !important;
  font-weight: var(--my-font-weight-regular);
}

.dp3-bank-table-sort-btn:hover:not(:disabled),
.dp3-bank-table-sort-btn:focus-visible:not(:disabled),
.dp3-bank-table-sort-btn:active:not(:disabled) {
  color: var(--my-color-black) !important;
  font-weight: var(--my-font-weight-semibold);
  background-color: transparent !important;
}

.dp3-bank-table-header__dot-spacer {
  display: inline-block;
  width: calc(0.5rem + 0.75rem);
  flex-shrink: 0;
}

.dp3-bank-list {
  list-style: none;
  padding: 0;
  margin: 0;
  border-bottom: 1px solid var(--my-color-gray-2, #e5e5e5);
}

.dp3-bank-list > li {
  display: block;
  border-top: 1px solid var(--my-color-gray-2, #e5e5e5);
}

.dp3-bank-list-row {
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

.dp3-bank-list-row:hover:not(:disabled) {
  background-color: var(--my-color-gray-2, #e5e5e5);
}

.dp3-bank-list-row:focus-visible {
  outline: 2px solid var(--my-color-black, #000);
  outline-offset: -2px;
}

.dp3-bank-list-row__dot-col {
  flex-shrink: 0;
  width: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dp3-bank-list-row__exam-dot {
  width: 0.5rem;
  height: 0.5rem;
}

.dp3-bank-list-row__label {
  flex: 1 1 0;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dp3-bank-list-row__subtitle {
  flex-shrink: 0;
  white-space: nowrap;
}

.dp3-bank-list-row__chevron {
  flex-shrink: 0;
  font-size: 0.625rem;
  opacity: 0.4;
}

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
</style>
