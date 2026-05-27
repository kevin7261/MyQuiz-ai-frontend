<script setup>
import { ref, watch } from 'vue';
import DesignPageSpecItem from '../components/DesignPageSpecItem.vue';
import DesignPageSpecColorGroup from '../components/DesignPageSpecColorGroup.vue';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal.vue';
import MessageModal from '../components/MessageModal.vue';
import LoadingOverlay from '../components/LoadingOverlay.vue';
import LogoGradientPillButton from '../components/LogoGradientPillButton.vue';
import ExamPage2DetailBar from '../components/ExamPage2DetailBar.vue';
import CreateExamQuizBankPage2DetailBar from '../components/CreateExamQuizBankPage2DetailBar.vue';
import ExamPageExamSwitchDropdown from '../components/ExamPageExamSwitchDropdown.vue';
import CreateExamQuizBankBankSwitchDropdown from '../components/CreateExamQuizBankBankSwitchDropdown.vue';
import PackUnitTypeIcon from '../components/PackUnitTypeIcon.vue';
import {
  UNIT_TYPE_RAG,
  UNIT_TYPE_TEXT,
  UNIT_TYPE_MP3,
  UNIT_TYPE_YOUTUBE,
  packUnitTypeIconClasses,
} from '../utils/rag.js';

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

// ── Tab 狀態（sessionStorage 還原） ─────────────────────────────
const DESIGN3_ACTIVE_TAB_STORAGE_KEY = 'myquiz:designPage3:activeTab:v1';
const TABS = [
  { id: 'color',      label: '顏色' },
  { id: 'type',       label: '字體' },
  { id: 'button',     label: '按鈕' },
  { id: 'badge',      label: 'badge' },
  { id: 'icon',       label: 'icon' },
  { id: 'alert',      label: '提示' },
  { id: 'dropdown',   label: '下拉' },
  { id: 'list',       label: '列表' },
  { id: 'modal',      label: 'modal overlay' },
  { id: 'header-bar', label: '頁首頂列' },
  { id: 'embed',      label: '嵌入' },
];
const DESIGN3_TAB_IDS = new Set(TABS.map((tab) => tab.id));

function readDesign3ActiveTab() {
  try {
    const id = sessionStorage.getItem(DESIGN3_ACTIVE_TAB_STORAGE_KEY);
    if (id && DESIGN3_TAB_IDS.has(id)) return id;
  } catch {
    /* private mode / quota */
  }
  return 'color';
}

const activeTab = ref(readDesign3ActiveTab());

watch(activeTab, (id) => {
  if (!DESIGN3_TAB_IDS.has(id)) return;
  try {
    sessionStorage.setItem(DESIGN3_ACTIVE_TAB_STORAGE_KEY, id);
  } catch {
    /* private mode / quota */
  }
});

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

// ── 訊息 Modal（MessageModal 示範） ───────────────────────────
const messageDemoOpen = ref(false);
const messageDemoTitle = ref('提示');
const messageDemoMessage = ref('');
function openMessageDemo(title, message) {
  messageDemoTitle.value = title;
  messageDemoMessage.value = message;
  messageDemoOpen.value = true;
}
function openListErrorDemo() {
  openMessageDemo('無法載入列表', '請先登入以載入測驗列表');
}
function openTranscriptErrorDemo() {
  openMessageDemo(
    '無法讀取來源內容',
    '逐字稿讀取失敗：於資料夾「2_SNA.Data」下找不到支援的音訊檔（副檔名: .aac, .flac, .m4a, .mp3, .mp4, .mpeg, .mpga, .ogg, .opus, .wav, .webm, .wma）',
  );
}

// ── LoadingOverlay ───────────────────────────────────────
const loadingVisible = ref(false);
let loadingTimer = null;
function toggleLoading() {
  if (loadingVisible.value) { loadingVisible.value = false; clearTimeout(loadingTimer); return; }
  loadingVisible.value = true;
  loadingTimer = setTimeout(() => { loadingVisible.value = false; }, 3000);
}

/** 對齊 variables.css；my-color-gray-4 淺底輔助字同 gray-1 → #888888 */
const DESIGN3_CLASS_HEX = {
  'my-bgcolor-black': '#333333',
  'my-color-black': '#333333',
  'my-bgcolor-gray-1': '#888888',
  'my-color-gray-1': '#888888',
  'my-bgcolor-gray-2': '#e2e2e2',
  'my-color-gray-2': '#e2e2e2',
  'my-bgcolor-gray-3': '#f2f2f2',
  'my-color-gray-3': '#f2f2f2',
  'my-bgcolor-gray-4': '#f2f2f2',
  'my-color-gray-4': '#888888',
  'my-bgcolor-white': '#fdfdfd',
  'my-bgcolor-surface': '#fdfdfd',
  'my-bgcolor-green': '#25b17c',
  'my-color-green': '#25b17c',
  'my-bgcolor-red': '#e84136',
  'my-color-red': '#e84136',
};

function design3ClassHex(className) {
  return DESIGN3_CLASS_HEX[className] ?? '';
}

const DESIGN3_COLORS_GRAY = [
  {
    name: 'color-black',
    usage: '主要文字、標題、方塊標題、Modal 標題、已選檔名',
    rows: [{ className: 'my-bgcolor-black' }, { className: 'my-color-black' }],
  },
  {
    name: 'color-gray-1',
    usage: '次要文字、返回按鈕、圓形選單鈕、取消按鈕、方塊副標題',
    rows: [{ className: 'my-bgcolor-gray-1' }, { className: 'my-color-gray-1' }],
  },
  {
    name: 'color-gray-2',
    usage: '邊線、表頭分隔、列表列框線',
    rows: [{ className: 'my-bgcolor-gray-2' }, { className: 'my-color-gray-2' }],
  },
  {
    name: 'color-gray-3',
    usage: 'Design 參考區塊底、ZIP drop zone 底',
    rows: [{ className: 'my-bgcolor-gray-3' }, { className: 'my-color-black' }],
  },
  {
    name: 'color-gray-4',
    usage: '左側題目／流程清單（my-design-right-nav）· drop zone 提示文字、說明 ul 等最淡輔助字色',
    rows: [{ className: 'my-bgcolor-gray-4' }, { className: 'my-color-gray-4' }],
  },
  {
    name: 'color-white',
    usage: '白底（#fdfdfd）：左側 detail bar in-side-panel · Badge（my-bgcolor-surface 同義）',
    rows: [{ className: 'my-bgcolor-white' }, { className: 'my-color-black' }],
  },
];

const DESIGN3_COLORS_ACCENT = [
  {
    name: 'color-green',
    usage: '試卷用題庫：列表綠點、下拉選單列小圓點',
    rows: [{ className: 'my-bgcolor-green' }, { className: 'my-color-green' }],
  },
  {
    name: 'color-red',
    usage: '下拉選單刪除項（exam_3／create-exam-bank_3 共用）',
    rows: [{ className: 'my-bgcolor-red' }, { className: 'my-color-red' }],
  },
];

const DESIGN3_TYPE_GROUPS = [
  {
    scale: 'xl · 1.125rem',
    fontClass: 'my-font-xl-400',
    items: [
      {
        name: 'type-xl-black',
        usage: '建置後單元主標；create-exam-bank_3 設定單元名稱 inline 編輯（my-design-pack-unit-name-title）',
        colorClass: 'my-color-black',
        previewText: '第一單元名稱',
        previewKind: 'pack-unit-name',
        cssExtra: 'my-design-pack-unit-name-title my-design-pack-unit-main-title text-truncate px-0 py-1 rounded-2',
      },
    ],
  },
  {
    scale: 'lg · 1rem',
    scaleLabel: 'lg · 1rem · my-font-lg-400 / my-font-lg-600',
    fontClass: 'my-font-lg-400',
    items: [
      {
        name: 'type-lg-black-course-name',
        fontClass: 'my-font-lg-600',
        usage: 'TopView 課程 header 課程名稱（粗體；與頁面名稱以 | 分隔）',
        colorClass: 'my-color-black',
        previewKind: 'course-header',
      },
      {
        name: 'type-lg-black',
        usage: 'TopView 頁面名稱；detail bar 標題；題型名稱；設定單元題型；QuizCard「第 N 題」；空清單大按鈕',
        colorClass: 'my-color-black',
        previewText: '測驗',
      },
      {
        name: 'type-lg-gray-1',
        usage: 'pack 空狀態說明、居中提示段落',
        colorClass: 'my-color-gray-1',
        previewText: '請在右側新增設定單元，或點下方按鈕',
      },
    ],
  },
  {
    scale: 'md · 0.875rem',
    fontClass: 'my-font-md-400',
    items: [
      {
        name: 'type-md-black',
        usage: 'Design 區塊標題、Modal 按鈕、題幹 Markdown 正文、grid 列表列名稱',
        colorClass: 'my-color-black',
        previewText: '方塊標題、題目正文、範例試卷 A',
      },
      {
        name: 'type-md-gray-1',
        usage: '取消按鈕、圓形選單鈕；exam_3 空題目提示；create-exam-bank_3 主內容空題型居中提示',
        colorClass: 'my-color-gray-1',
        previewText: '目前沒有題型，請在左側選單的單元按 + 新增題型',
      },
    ],
  },
  {
    scale: 'sm · 0.75rem',
    fontClass: 'my-font-sm-400',
    items: [
      {
        name: 'type-sm-black',
        usage: 'Modal 說明、已選檔名',
        colorClass: 'my-color-black',
        previewText: 'Modal 說明、已選檔名',
      },
      {
        name: 'type-sm-gray-1',
        usage: '欄位標題、左欄步驟標、breadcrumb、列表副標、返回按鈕',
        colorClass: 'my-color-gray-1',
        previewText: '資料夾組合 / 單元一 › 開場白問答 / 題型子列',
      },
      {
        name: 'type-sm-gray-4',
        usage: 'ZIP drop zone 提示、說明 ul、placeholder「尚未選擇資料夾」',
        colorClass: 'my-color-gray-4',
        previewText: 'drop zone 提示文字、說明 ul',
      },
      {
        name: 'type-sm-red',
        usage: '欄位驗證、操作失敗 inline 錯誤',
        colorClass: 'my-color-red',
        previewText: '請選擇 .zip 檔案',
      },
      {
        name: 'type-sm-stem-tab',
        usage: 'QuizCard 題目／答案 tab（未選 my-color-gray-1、選中 my-color-black + 2pt 底線；底線併 my-design-quiz-stem-tab--active）',
        colorClass: 'my-color-gray-1',
        cssExtra: 'my-design-quiz-stem-tab',
        previewKind: 'stem-tabs',
      },
      {
        name: 'type-sm-on-dark-prompt',
        usage: '出題規則黑底區標題（create-exam-bank_3）',
        colorClass: 'my-color-gray-2',
        previewKind: 'prompt-block-title',
        previewText: '出題規則',
      },
    ],
  },
];

function design3ItemFontClass(group, item) {
  return item.fontClass ?? group.fontClass;
}

function design3TypeCss(group, item) {
  const fc = design3ItemFontClass(group, item);
  const base = item.colorClass ? `${fc} ${item.colorClass}` : fc;
  return item.cssExtra ? `${base} · ${item.cssExtra}` : base;
}

const DESIGN3_LIST_SPECS = [
  {
    name: 'list-bank-core',
    usage: 'ExamPage2／CreateExamQuizBankPage2 grid 主頁列表（白底；hover → gray-3）',
    css: 'bank-list-wrap · bank-table-actions · bank-table-header · bank-table-sort-btn · bank-list · bank-list-row',
    copyText: 'bank-list-wrap',
  },
  {
    name: 'list-bank-exam-dot',
    usage: 'create-exam-bank_3 綠點欄與表頭對齊',
    css: 'bank-table-header__dot-spacer · bank-list-row__dot-col · bank-list-row__exam-dot rounded-circle d-inline-block my-bgcolor-green',
    copyText: 'bank-table-header__dot-spacer',
  },
];

const DESIGN3_DROPDOWN_SPECS = [
  {
    name: 'dropdown-menu-class',
    usage: '試卷／題庫切換選單本體（scoped）',
    css: 'exam-page-exam-switch-menu · create-exam-bank-bank-switch-menu',
    copyText: 'exam-page-exam-switch-menu',
  },
  {
    name: 'dropdown-header-trigger',
    usage: 'TopView 右側「所有試卷／所有題庫」觸發鈕',
    css: 'btn rounded-pill d-inline-flex align-items-center dropdown-toggle my-dropdown-caret flex-shrink-0 text-nowrap my-font-md-400 my-color-gray-1 my-course-header-nav-btn gap-2 px-4 py-2',
  },
  {
    name: 'dropdown-item-states',
    usage: '選單列 active／disabled／刪除（my-color-red）',
    css: 'dropdown-item active · dropdown-item disabled · dropdown-item my-color-red',
    copyText: 'dropdown-item my-color-red',
  },
];

const DESIGN3_MODAL_SPECS = [
  { name: 'modal-backdrop', usage: '上傳 Modal 外層（Teleport to body）', css: 'modal fade show d-block my-modal-backdrop' },
  { name: 'modal-dialog', usage: '上傳 Modal 對話框', css: 'modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable' },
  { name: 'modal-content', usage: 'Modal 內容白底區', css: 'modal-content border-0 my-bgcolor-white d-flex flex-column gap-3 p-4' },
  { name: 'modal-header', usage: 'Modal 標題列', css: 'modal-header border-bottom-0 p-0' },
  { name: 'modal-title', usage: 'Modal 標題字', css: 'modal-title my-color-black' },
  { name: 'modal-body', usage: 'Modal 內文區', css: 'modal-body p-0 min-w-0' },
  { name: 'modal-drop-zone', usage: 'ZIP 拖放區（空／已選）', css: 'my-zip-drop-zone text-center position-relative' },
  { name: 'modal-drop-zone-over', usage: 'ZIP 拖放區拖曳中', css: 'my-zip-drop-zone my-zip-drop-zone-over' },
  { name: 'modal-footer', usage: 'Modal 底部按鈕列', css: 'modal-footer border-top-0 d-flex justify-content-end gap-2 w-100 p-0' },
  { name: 'modal-message-component', usage: 'MessageModal：頁面級錯誤／警告（列表、建立、pack、出題、來源內容逐字稿等）；work3 :confirm-button-class=my-button-white', css: 'MessageModal · modal fade show d-block my-modal-backdrop · modal-dialog modal-dialog-centered · modal-title my-color-black · my-color-red my-font-sm-400 mb-0 text-break', copyText: 'MessageModal' },
  { name: 'modal-error-text', usage: 'MessageModal 內文；上傳 Modal 內 newBankUploadError；ConfirmDeleteModal :error（取代 my-alert-warning-soft／my-alert-danger-soft 與「來源內容」下方 inline 紅字）', css: 'my-color-red my-font-sm-400 mb-0 text-break' },
];

const DESIGN3_EMBED_SPECS = [
  { name: 'embed-side-panel-root', usage: 'ExamPage2／CreateExamQuizBankPage2 根層（sidePanelOnLeft）', css: 'exam-2--side-panel-left · create-exam-bank-2--side-panel-left', copyText: 'exam-2--side-panel-left' },
  { name: 'embed-hide-header', usage: '嵌入時隱藏 ExamPage 內頁 header', css: '.exam-2-embedded :deep(> header) { display: none; }' },
  { name: 'embed-hide-tabs', usage: '嵌入時隱藏分頁列', css: '.exam-2-embedded :deep(.my-rag-tabs-bar) { display: none !important; }' },
  { name: 'embed-detail-bar-mod', usage: '左欄 detail bar 修飾 class', css: 'exam-2-detail-bar--in-side-panel · create-exam-bank-2-detail-bar--in-side-panel', copyText: 'exam-2-detail-bar--in-side-panel' },
];

const DESIGN3_PACK_UNIT_TYPE_ICONS = [
  {
    name: 'icon-unit-rag',
    unitType: UNIT_TYPE_RAG,
    usage: 'unit_type=1（RAG）；左側清單單元列、建置後主標題旁、設定單元「類型」pill',
  },
  {
    name: 'icon-unit-text',
    unitType: UNIT_TYPE_TEXT,
    usage: 'unit_type=2（文字）',
  },
  {
    name: 'icon-unit-mp3',
    unitType: UNIT_TYPE_MP3,
    usage: 'unit_type=3（MP3）',
  },
  {
    name: 'icon-unit-youtube',
    unitType: UNIT_TYPE_YOUTUBE,
    usage: 'unit_type=4（YouTube）',
  },
];

function design3PackUnitTypeIconCss(unitType) {
  return `${packUnitTypeIconClasses(unitType)} · my-pack-unit-type-icon · my-color-gray-1`;
}
</script>

<template>
  <!--
    DesignPage3｜exam_3、create-exam-bank_3 專用 UI 元件參考（TopView 全寬、白底主內容、左側清單欄）
    版面對齊 ExamPage2／CreateExamQuizBankPage2（sidePanelOnLeft）；頁名由 TopView 顯示
  -->
  <div class="design-page-3 d-flex flex-column h-100 overflow-hidden my-bgcolor-white">
    <!-- Tab 列（置中；底線隨 tab 寬度） -->
    <div class="flex-shrink-0 w-100 my-rag-tabs-bar my-bgcolor-white pt-3">
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

    <div
      class="design-page-3__scroll flex-grow-1 min-h-0 overflow-auto position-relative d-flex flex-column design-page-3__scroll--scrollbar px-3 px-md-4 py-4"
    >
      <div class="design-page-3__content flex-grow-1 w-100">
        <div class="design-page-3__sections mx-auto w-100">

            <!-- ══════════════════════════════════════════════════
                 字體
            ══════════════════════════════════════════════════ -->
            <template v-if="activeTab === 'type'">
              <section
                v-for="(group, groupIndex) in DESIGN3_TYPE_GROUPS"
                :key="group.scale"
                class="my-page-block-spacing"
                :class="{ 'mb-0': groupIndex === DESIGN3_TYPE_GROUPS.length - 1 }"
              >
                <div class="rounded-4 my-design-page-section p-4">
                  <div
                    role="heading"
                    aria-level="2"
                    class="my-font-lg-400 my-color-black text-break mb-4"
                  >{{ group.scaleLabel ?? group.scale }}</div>
                  <div class="d-flex flex-column gap-4">
                    <DesignPageSpecItem
                      v-for="item in group.items"
                      :key="item.name"
                      :name="item.name"
                      :usage="item.usage"
                      :css="design3TypeCss(group, item)"
                    >
                      <p
                        v-if="item.previewKind === 'course-header'"
                        class="mb-0"
                      >
                        <span :class="[design3ItemFontClass(group, item), item.colorClass]">範例課程</span>
                        <span class="my-course-header-course-title__sep my-color-gray-1 my-font-lg-400 mx-2" aria-hidden="true">|</span>
                        <span :class="[group.fontClass, item.colorClass]">測驗</span>
                      </p>
                      <div
                        v-else-if="item.previewKind === 'stem-tabs'"
                        class="design-page-3-stem-tabs-preview d-inline-flex align-items-stretch gap-4 border-bottom mb-0"
                        style="border-color: var(--my-color-gray-2) !important;"
                      >
                        <button type="button" class="btn px-0 py-2 my-design-quiz-stem-tab my-design-quiz-stem-tab--active my-font-sm-400 my-color-black">題目</button>
                        <button type="button" class="btn px-0 py-2 my-design-quiz-stem-tab my-font-sm-400 my-color-gray-1">答案</button>
                      </div>
                      <div
                        v-else-if="item.previewKind === 'prompt-block-title'"
                        class="design-page-3-prompt-block-preview rounded-2 overflow-hidden"
                      >
                        <div class="px-3 py-2">
                          <span class="my-font-sm-400 my-color-gray-2 mb-0">{{ item.previewText }}</span>
                        </div>
                      </div>
                      <input
                        v-else-if="item.previewKind === 'pack-unit-name'"
                        type="text"
                        class="my-design-pack-unit-name-title my-design-pack-unit-main-title my-font-xl-400 my-color-black text-truncate mb-0 text-start w-100 px-0 py-1 rounded-2"
                        value="第一單元名稱"
                        readonly
                        aria-label="單元名稱（示意）"
                      />
                      <p
                        v-else
                        :class="[design3ItemFontClass(group, item), item.colorClass, 'mb-0']"
                      >{{ item.previewText }}</p>
                    </DesignPageSpecItem>
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
                <div class="rounded-4 my-design-page-section p-4 mb-5">
                  <div role="heading" aria-level="2" class="my-font-lg-400 my-color-black text-break mb-4">灰階</div>
                  <div class="row g-3">
                    <div
                      v-for="item in DESIGN3_COLORS_GRAY"
                      :key="item.name"
                      class="col-12"
                    >
                      <DesignPageSpecColorGroup
                        :name="item.name"
                        :usage="item.usage"
                        :rows="item.rows"
                        :hex-for-class="design3ClassHex"
                      />
                    </div>
                  </div>
                </div>
              </section>

              <!-- 彩色 -->
              <section class="my-page-block-spacing mb-0">
                <div class="rounded-4 my-design-page-section p-4">
                  <div role="heading" aria-level="2" class="my-font-lg-400 my-color-black text-break mb-4">彩色</div>
                  <div class="row g-3">
                    <div
                      v-for="item in DESIGN3_COLORS_ACCENT"
                      :key="item.name"
                      class="col-12"
                    >
                      <DesignPageSpecColorGroup
                        :name="item.name"
                        :usage="item.usage"
                        :rows="item.rows"
                        :hex-for-class="design3ClassHex"
                      />
                    </div>
                  </div>
                </div>
              </section>
            </template>

            <!-- ══════════════════════════════════════════════════
                 頁首頂列
            ══════════════════════════════════════════════════ -->
            <template v-else-if="activeTab === 'header-bar'">
              <section class="my-page-block-spacing">
                <div class="rounded-4 my-design-page-section p-4 mb-5">
                  <div role="heading" aria-level="2" class="my-font-lg-400 my-color-black text-break mb-4">課程 header（TopView）</div>
                  <DesignPageSpecItem
                    name="header-topview"
                    usage="SideRailView（64px）＋ TopView（64px 高、白底）；中央「課程名稱 | 頁面名稱」；右側試卷／題庫切換下拉"
                    css="my-course-header my-bgcolor-white · my-font-lg-600 my-color-black（課程名）· my-font-lg-400 my-color-black（頁面名）· ExamPageExamSwitchDropdown／CreateExamQuizBankBankSwitchDropdown（my-course-header-nav-btn px-4 py-2）"
                    copy-text="my-course-header my-bgcolor-white"
                  >
                  <header class="design-page-3-topview-preview my-course-header flex-shrink-0 my-bgcolor-white border rounded-3">
                    <div class="my-course-header-inner px-3 min-w-0 w-100">
                      <div class="my-course-header-inner__center min-w-0">
                        <p class="my-course-header-course-title my-color-black text-truncate text-start w-100 mb-0">
                          <span class="my-font-lg-600">範例課程</span>
                          <span class="my-course-header-course-title__sep my-color-gray-1 my-font-lg-400 mx-2" aria-hidden="true">|</span>
                          <span class="my-font-lg-400">測驗</span>
                        </p>
                      </div>
                      <div class="my-course-header-inner__end d-flex align-items-center justify-content-end gap-2 min-w-0 flex-shrink-0">
                        <ExamPageExamSwitchDropdown
                          :grid-items="demoExamGridItems"
                          selected-exam-tab-id="exam-a"
                        />
                        <CreateExamQuizBankBankSwitchDropdown
                          :grid-items="demoBankGridItems"
                          selected-bank-tab-id="bank-b"
                        />
                      </div>
                    </div>
                  </header>
                  </DesignPageSpecItem>
                </div>
              </section>

              <section class="my-page-block-spacing">
                <div class="rounded-4 my-design-page-section p-4 mb-5">
                  <div role="heading" aria-level="2" class="my-font-lg-400 my-color-black text-break mb-4">左側清單 detail bar（exam_3）</div>
                  <DesignPageSpecItem
                    name="header-exam-detail-bar"
                    usage="ExamPage2DetailBar in-side-panel；#side-panel-header slot；返回「← 返回主頁」；標題左對齊灰底"
                    css="exam-2-detail-bar--in-side-panel · exam-2-detail-bar__back-btn--in-side-panel btn d-inline-flex align-items-center gap-2 my-font-sm-400 my-color-gray-1 my-button-transparent-borderless px-3 pt-3 pb-2 · exam-2-detail-bar__title my-font-lg-400 my-color-black"
                    copy-text="exam-2-detail-bar--in-side-panel"
                  >
                  <div class="design-page-3-side-panel-preview my-bgcolor-gray-4 rounded-3 overflow-hidden border" style="max-width: 20rem;">
                    <ExamPage2DetailBar
                      v-model:selected-exam-label="demoExamLabel"
                      :grid-items="demoExamGridItems"
                      selected-exam-tab-id="exam-a"
                      in-side-panel
                    />
                    <div class="my-bgcolor-gray-4 px-3 py-4 my-font-sm-400 my-color-gray-1 border-top">題目清單（my-design-right-nav）</div>
                  </div>
                  </DesignPageSpecItem>
                </div>
              </section>

              <section class="my-page-block-spacing mb-0">
                <div class="rounded-4 my-design-page-section p-4">
                  <div role="heading" aria-level="2" class="my-font-lg-400 my-color-black text-break mb-4">左側清單 detail bar（create-exam-bank_3）</div>
                  <DesignPageSpecItem
                    name="header-bank-detail-bar"
                    usage="CreateExamQuizBankPage2DetailBar in-side-panel；結構同 exam_3 detail bar"
                    css="create-exam-bank-2-detail-bar--in-side-panel · create-exam-bank-2-detail-bar__back-btn--in-side-panel btn d-inline-flex align-items-center gap-2 my-font-sm-400 my-color-gray-1 my-button-transparent-borderless px-3 pt-3 pb-2 · create-exam-bank-2-detail-bar__title my-font-lg-400 my-color-black"
                    copy-text="create-exam-bank-2-detail-bar--in-side-panel"
                  >
                  <div class="design-page-3-side-panel-preview my-bgcolor-gray-4 rounded-3 overflow-hidden border" style="max-width: 20rem;">
                    <CreateExamQuizBankPage2DetailBar
                      v-model:selected-bank-label="demoBankLabel"
                      :grid-items="demoBankGridItems"
                      selected-bank-tab-id="bank-a"
                      in-side-panel
                    />
                    <div class="my-bgcolor-gray-4 px-3 py-4 my-font-sm-400 my-color-gray-1 border-top">流程清單（my-design-right-nav）</div>
                  </div>
                  </DesignPageSpecItem>
                </div>
              </section>
            </template>

            <!-- ══════════════════════════════════════════════════
                 列表
            ══════════════════════════════════════════════════ -->
            <template v-else-if="activeTab === 'list'">
              <section class="my-page-block-spacing mb-0">
                <div class="rounded-4 my-design-page-section p-4">
                  <div role="heading" aria-level="2" class="my-font-lg-400 my-color-black text-break mb-4">列表</div>

                  <p class="my-font-sm-400 my-color-black mb-2">exam_3（無綠點欄）</p>
                  <div class="design-page-3__list-preview design-page-3__list-preview--work3 mb-4">
                    <div class="bank-list-wrap mx-auto">
                      <div class="bank-table-actions">
                        <button type="button" class="btn rounded-pill d-inline-flex align-items-center gap-2 my-font-md-400 my-button-white px-4 py-2">
                          <i class="fa-solid fa-plus" aria-hidden="true" />
                          新增試卷
                        </button>
                      </div>
                      <div class="bank-table-header">
                        <button type="button" class="bank-table-sort-btn btn d-inline-flex align-items-center gap-2 my-font-sm-400 my-color-gray-1 my-button-transparent-borderless px-0 py-1 flex-shrink-0">
                          名稱
                          <i class="fa-solid fa-chevron-up" aria-hidden="true" />
                        </button>
                      </div>
                      <ul class="bank-list">
                        <li>
                          <button type="button" class="bank-list-row">
                            <span class="bank-list-row__label my-font-md-400 my-color-black">範例試卷 A</span>
                            <span class="bank-list-row__subtitle my-font-sm-400 my-color-gray-1">5 題</span>
                            <i class="fa-solid fa-chevron-right bank-list-row__chevron" aria-hidden="true" />
                          </button>
                        </li>
                        <li>
                          <button type="button" class="bank-list-row">
                            <span class="bank-list-row__label my-font-md-400 my-color-black">未命名試卷</span>
                            <i class="fa-solid fa-chevron-right bank-list-row__chevron" aria-hidden="true" />
                          </button>
                        </li>
                      </ul>
                    </div>
                  </div>

                  <p class="my-font-sm-400 my-color-black mb-2">create-exam-bank_3（含綠點欄）</p>
                  <div class="design-page-3__list-preview design-page-3__list-preview--work3 mb-3">
                    <div class="bank-list-wrap mx-auto">
                      <div class="bank-table-actions">
                        <button type="button" class="btn rounded-pill d-inline-flex align-items-center gap-2 my-font-md-400 my-button-white px-4 py-2">
                          <i class="fa-solid fa-plus" aria-hidden="true" />
                          新增測驗題庫
                        </button>
                      </div>
                      <div class="bank-table-header">
                        <span class="bank-table-header__dot-spacer" aria-hidden="true" />
                        <button type="button" class="bank-table-sort-btn btn d-inline-flex align-items-center gap-2 my-font-sm-400 my-color-gray-1 my-button-transparent-borderless px-0 py-1 flex-shrink-0">
                          名稱
                          <i class="fa-solid fa-chevron-up" aria-hidden="true" />
                        </button>
                      </div>
                      <ul class="bank-list">
                        <li>
                          <button type="button" class="bank-list-row">
                            <span class="bank-list-row__dot-col" aria-label="試卷用題庫">
                              <span class="rounded-circle d-inline-block my-bgcolor-green bank-list-row__exam-dot" />
                            </span>
                            <span class="bank-list-row__label my-font-md-400 my-color-black">試卷用題庫</span>
                            <span class="bank-list-row__subtitle my-font-sm-400 my-color-gray-1">3 個單元</span>
                            <i class="fa-solid fa-chevron-right bank-list-row__chevron" aria-hidden="true" />
                          </button>
                        </li>
                        <li>
                          <button type="button" class="bank-list-row">
                            <span class="bank-list-row__dot-col" />
                            <span class="bank-list-row__label my-font-md-400 my-color-black">範例題庫 B</span>
                            <i class="fa-solid fa-chevron-right bank-list-row__chevron" aria-hidden="true" />
                          </button>
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div class="d-flex flex-column gap-4 mt-3">
                    <DesignPageSpecItem
                      v-for="spec in DESIGN3_LIST_SPECS"
                      :key="spec.name"
                      :name="spec.name"
                      :usage="spec.usage"
                      :css="spec.css"
                      :copy-text="spec.copyText"
                    />
                  </div>
                </div>
              </section>
            </template>

            <!-- ══════════════════════════════════════════════════
                 提示訊息
            ══════════════════════════════════════════════════ -->
            <template v-else-if="activeTab === 'alert'">
              <section class="my-page-block-spacing mb-0">
                <div class="rounded-4 my-design-page-section p-4">
                  <div role="heading" aria-level="2" class="my-font-lg-400 my-color-black text-break mb-4">提示</div>
                  <div class="d-flex flex-column gap-4">
                    <DesignPageSpecItem
                      name="hint-empty-quiz-types"
                      usage="create-exam-bank_3 建置後主內容無題型：flex 居中 my-font-md-400 my-color-gray-1"
                      css="flex-grow-1 d-flex align-items-center justify-content-center · my-font-md-400 my-color-gray-1 mb-0 text-center text-break"
                    >
                      <div class="d-flex align-items-center justify-content-center px-3 py-4 my-bgcolor-gray-4 rounded-3" style="min-height: 6rem; max-width: 20rem;">
                        <p class="my-font-md-400 my-color-gray-1 mb-0 text-center text-break">
                          目前沒有題型，請在左側選單的單元按 + 新增題型
                        </p>
                      </div>
                    </DesignPageSpecItem>
                  </div>
                </div>
              </section>
            </template>

            <!-- ══════════════════════════════════════════════════
                 按鈕
            ══════════════════════════════════════════════════ -->
            <template v-else-if="activeTab === 'button'">
              <section class="my-page-block-spacing mb-0">
                <div class="rounded-4 my-design-page-section p-4">
                  <div role="heading" aria-level="2" class="my-font-lg-400 my-color-black text-break mb-4">按鈕</div>
                  <div class="d-flex flex-column gap-4">
                    <div class="my-color-gray-4 my-font-sm-400">小（my-font-sm-400）</div>
                    <DesignPageSpecItem
                      name="btn-sort"
                      usage="grid 列表表頭排序（bank-table-sort-btn；px-0 無 rounded-pill）"
                      css="bank-table-sort-btn btn d-inline-flex align-items-center gap-2 my-font-sm-400 my-color-gray-1 my-button-transparent-borderless px-0 py-1"
                    >
                      <button type="button" class="bank-table-sort-btn btn d-inline-flex align-items-center gap-2 my-font-sm-400 my-color-gray-1 my-button-transparent-borderless px-0 py-1">
                        名稱
                        <i class="fa-solid fa-chevron-up" aria-hidden="true" />
                      </button>
                    </DesignPageSpecItem>
                    <DesignPageSpecItem
                      name="btn-back-side-panel"
                      usage="左欄 detail bar 返回主頁（exam_2／create-exam-bank_2）"
                      css="exam-2-detail-bar__back-btn--in-side-panel btn d-inline-flex align-items-center gap-2 my-font-sm-400 my-color-gray-1 my-button-transparent-borderless px-3 pt-3 pb-2"
                      copy-text="exam-2-detail-bar__back-btn--in-side-panel btn d-inline-flex align-items-center gap-2 my-font-sm-400 my-color-gray-1 my-button-transparent-borderless px-3 pt-3 pb-2"
                    >
                      <button type="button" class="btn d-inline-flex align-items-center gap-2 my-font-sm-400 my-color-gray-1 my-button-transparent-borderless px-3 pt-3 pb-2">
                        <i class="fa-solid fa-arrow-left flex-shrink-0" aria-hidden="true" />
                        <span>返回主頁</span>
                      </button>
                    </DesignPageSpecItem>

                    <div class="my-color-gray-4 my-font-sm-400 pt-2">中（my-font-md-400）</div>
                    <DesignPageSpecItem
                      name="btn-add-list"
                      usage="grid 列表右上方新增試卷／題庫"
                      css="btn rounded-pill d-inline-flex align-items-center gap-2 my-font-md-400 my-button-white px-4 py-2"
                    >
                      <button type="button" class="btn rounded-pill d-inline-flex align-items-center gap-2 my-font-md-400 my-button-white px-4 py-2">
                        <i class="fa-solid fa-plus" aria-hidden="true" />
                        新增試卷
                      </button>
                    </DesignPageSpecItem>
                    <DesignPageSpecItem
                      name="btn-logo-gradient"
                      usage="開始出題／開始批改（LogoGradientPillButton gradient-bias=work3）"
                      css="btn rounded-pill d-inline-flex justify-content-center align-items-center gap-2 flex-shrink-0 my-font-md-400 px-4 py-2 my-button-logo-gradient"
                    >
                      <div class="d-flex flex-wrap align-items-center gap-3">
                        <LogoGradientPillButton id-prefix="design-page-3-generate" tone="generate" gradient-bias="work3" />
                        <LogoGradientPillButton id-prefix="design-page-3-grade" tone="grade" gradient-bias="work3" />
                      </div>
                    </DesignPageSpecItem>
                    <DesignPageSpecItem
                      name="btn-modal-cancel-gray"
                      usage="上傳 Modal 取消"
                      css="btn rounded-pill d-inline-flex justify-content-center align-items-center my-font-md-400 my-color-gray-1 my-button-transparent-borderless flex-shrink-0 px-4 py-2"
                    >
                      <button type="button" class="btn rounded-pill d-inline-flex justify-content-center align-items-center my-font-md-400 my-color-gray-1 my-button-transparent-borderless flex-shrink-0 px-4 py-2">取消</button>
                    </DesignPageSpecItem>
                    <DesignPageSpecItem
                      name="btn-delete-modal-cancel"
                      usage="刪除確認 Modal 取消"
                      css="btn rounded-pill d-flex justify-content-center align-items-center my-font-md-400 my-button-transparent-borderless px-4 py-2"
                    >
                      <button type="button" class="btn rounded-pill d-flex justify-content-center align-items-center my-font-md-400 my-button-transparent-borderless px-4 py-2">取消</button>
                    </DesignPageSpecItem>
                    <DesignPageSpecItem
                      name="btn-upload-confirm"
                      usage="上傳 Modal 確定上傳"
                      css="btn rounded-pill d-flex justify-content-center align-items-center gap-2 my-font-md-400 my-button-white flex-shrink-0 px-4 py-2"
                    >
                      <button type="button" class="btn rounded-pill d-flex justify-content-center align-items-center gap-2 my-font-md-400 my-button-white flex-shrink-0 px-4 py-2">確定上傳</button>
                    </DesignPageSpecItem>
                    <DesignPageSpecItem
                      name="btn-quiz-mode-segment"
                      usage="create-exam-bank_3 出題模式：一般／追問（my-quiz-generate-mode-segment--outline；選中 my-button-gray-3、未選 my-button-transparent-borderless my-color-black）"
                      css="my-quiz-generate-mode-segment my-quiz-generate-mode-segment--outline gap-2 p-1 · btn rounded-pill my-font-md-400 px-4 py-2 · my-button-gray-3（選中）· my-button-transparent-borderless my-color-black（未選）"
                    >
                      <div
                        class="d-inline-flex flex-wrap gap-2 p-1 my-quiz-generate-mode-segment my-quiz-generate-mode-segment--outline"
                        role="group"
                        aria-label="出題模式"
                      >
                        <button
                          type="button"
                          class="btn rounded-pill d-flex justify-content-center align-items-center my-font-md-400 my-button-gray-3 px-4 py-2"
                          aria-pressed="true"
                        >
                          一般
                        </button>
                        <button
                          type="button"
                          class="btn rounded-pill d-flex justify-content-center align-items-center my-font-md-400 my-button-transparent-borderless my-color-black px-4 py-2"
                          aria-pressed="false"
                        >
                          追問
                        </button>
                      </div>
                    </DesignPageSpecItem>
                    <DesignPageSpecItem
                      name="btn-add-pack-unit-row"
                      usage="create-exam-bank_3 左側「+ 新增單元」列（my-design-side-nav-add-unit-row）：左 pill my-button-white；右圓形單元功能選單 my-button-transparent-borderless、與 pill 同高"
                      css="my-design-side-nav-add-unit-row d-flex align-items-stretch gap-2 · btn rounded-pill my-font-md-400 my-button-white px-4 py-2 flex-grow-1 · btn rounded-circle my-design-side-nav-unit-menu-btn my-button-transparent-borderless my-font-md-400 px-0 py-0"
                      copy-text="my-design-side-nav-add-unit-row"
                    >
                      <div class="my-design-side-nav-add-unit-row d-flex align-items-stretch gap-2 my-bgcolor-gray-4 p-3 rounded-3" style="max-width: 20rem;">
                        <button
                          type="button"
                          class="btn rounded-pill d-flex justify-content-center align-items-center gap-2 my-font-md-400 my-button-white px-4 py-2 flex-grow-1 min-w-0"
                        >
                          <i class="fa-solid fa-plus" aria-hidden="true" />
                          新增單元
                        </button>
                        <button
                          type="button"
                          class="btn rounded-circle d-flex justify-content-center align-items-center my-font-md-400 lh-1 my-button-transparent-borderless my-design-side-nav-unit-menu-btn px-0 py-0"
                          aria-label="單元功能選單（示意）"
                        >
                          <i class="fa-solid fa-chevron-down" aria-hidden="true" />
                        </button>
                      </div>
                    </DesignPageSpecItem>
                    <DesignPageSpecItem
                      name="btn-start-pack-build"
                      usage="create-exam-bank_3 左側底欄「開始建立單元」（建置前；my-button-white 黑底 pill，位於「刪除此題庫」上方）"
                      css="btn rounded-pill d-flex justify-content-center align-items-center my-font-md-400 my-button-white px-4 py-2 w-100"
                    >
                      <button
                        type="button"
                        class="btn rounded-pill d-flex justify-content-center align-items-center my-font-md-400 my-button-white px-4 py-2 w-100"
                        style="max-width: 20rem;"
                      >
                        開始建立單元
                      </button>
                    </DesignPageSpecItem>
                    <DesignPageSpecItem
                      name="btn-delete-confirm"
                      usage="刪除確認 Modal 刪除"
                      css="btn rounded-pill d-flex justify-content-center align-items-center my-font-md-400 my-btn-outline-red-hollow px-4 py-2"
                    >
                      <button type="button" class="btn rounded-pill d-flex justify-content-center align-items-center my-font-md-400 my-btn-outline-red-hollow px-4 py-2">刪除</button>
                    </DesignPageSpecItem>

                    <div class="my-color-gray-4 my-font-sm-400 pt-2">大（my-font-lg-400）</div>
                    <DesignPageSpecItem
                      name="btn-add-empty-list"
                      usage="空清單居中新增試卷"
                      css="btn rounded-pill d-inline-flex align-items-center gap-2 my-font-lg-400 my-button-white px-4 py-3"
                    >
                      <button type="button" class="btn rounded-pill d-inline-flex align-items-center gap-2 my-font-lg-400 my-button-white px-4 py-3">
                        <i class="fa-solid fa-plus" aria-hidden="true" />
                        新增試卷
                      </button>
                    </DesignPageSpecItem>

                    <div class="my-color-gray-4 my-font-sm-400 pt-2">其他</div>
                    <DesignPageSpecItem
                      name="btn-header-switch"
                      usage="TopView 試卷／題庫切換觸發鈕（同 dropdown-header-trigger）"
                      css="btn rounded-pill d-inline-flex align-items-center dropdown-toggle my-dropdown-caret flex-shrink-0 text-nowrap my-font-md-400 my-course-header-nav-btn gap-2 px-4 py-2"
                    >
                      <ExamPageExamSwitchDropdown :grid-items="demoExamGridItems" selected-exam-tab-id="exam-a" />
                    </DesignPageSpecItem>
                    <DesignPageSpecItem
                      name="btn-list-row"
                      usage="grid 列表可點擊列（bank-list-row）"
                      css="bank-list-row"
                    >
                      <button type="button" class="bank-list-row w-100" style="max-width: 28rem;">
                        <span class="bank-list-row__label my-font-md-400 my-color-black">範例試卷</span>
                        <span class="bank-list-row__subtitle my-font-sm-400 my-color-gray-1">5 題</span>
                        <i class="fa-solid fa-chevron-right bank-list-row__chevron" aria-hidden="true" />
                      </button>
                    </DesignPageSpecItem>
                    <DesignPageSpecItem
                      name="btn-modal-close"
                      usage="Modal 關閉鈕（Bootstrap btn-close）"
                      css="btn-close"
                    >
                      <button type="button" class="btn-close" aria-label="關閉" />
                    </DesignPageSpecItem>
                  </div>
                </div>
              </section>
            </template>

            <!-- ══════════════════════════════════════════════════
                 Badge
            ══════════════════════════════════════════════════ -->
            <template v-else-if="activeTab === 'badge'">
              <section class="my-page-block-spacing mb-0">
                <div class="rounded-4 my-design-page-section p-4">
                  <div role="heading" aria-level="2" class="my-font-lg-400 my-color-black text-break mb-4">badge</div>
                  <div class="d-flex flex-column gap-4">
                    <DesignPageSpecItem
                      name="badge-followup"
                      usage="「追問」標籤（UnitSelectDropdown 觸發／選項、左側題型列等）"
                      css="badge my-bgcolor-surface my-color-black border user-select-none my-font-sm-400 rounded flex-shrink-0 px-2 py-1"
                      copy-text="badge my-bgcolor-surface my-color-black border user-select-none my-font-sm-400 rounded flex-shrink-0 px-2 py-1"
                    >
                      <span class="badge my-bgcolor-surface my-color-black border user-select-none my-font-sm-400 rounded flex-shrink-0 px-2 py-1">追問</span>
                    </DesignPageSpecItem>
                    <DesignPageSpecItem
                      name="badge-unit-quiz-type-count"
                      usage="create-exam-bank_3 左側單元列題型數（my-design-right-unit-count-badge；數字為該單元題型列數）"
                      css="badge user-select-none flex-shrink-0 my-design-right-unit-count-badge"
                      copy-text="my-design-right-unit-count-badge"
                    >
                      <span class="badge user-select-none flex-shrink-0 my-design-right-unit-count-badge">3</span>
                    </DesignPageSpecItem>
                  </div>
                </div>
              </section>
            </template>

            <!-- ══════════════════════════════════════════════════
                 icon
            ══════════════════════════════════════════════════ -->
            <template v-else-if="activeTab === 'icon'">
              <section class="my-page-block-spacing mb-0">
                <div class="rounded-4 my-design-page-section p-4">
                  <div role="heading" aria-level="2" class="my-font-lg-400 my-color-black text-break mb-4">icon</div>
                  <div class="d-flex flex-column gap-4">
                    <DesignPageSpecItem
                      v-for="item in DESIGN3_PACK_UNIT_TYPE_ICONS"
                      :key="item.name"
                      :name="item.name"
                      :usage="item.usage"
                      :css="design3PackUnitTypeIconCss(item.unitType)"
                      :copy-text="design3PackUnitTypeIconCss(item.unitType)"
                    >
                      <PackUnitTypeIcon
                        :unit-type="item.unitType"
                        color-class="my-color-gray-1"
                      />
                    </DesignPageSpecItem>
                    <DesignPageSpecItem
                      name="icon-unit-nav-row"
                      usage="create-exam-bank_3 左側清單：單元名稱 + PackUnitTypeIcon（ms-2 flex-shrink-0）"
                      css="my-design-right-unit-row-label · PackUnitTypeIcon · my-color-gray-1"
                      copy-text="PackUnitTypeIcon"
                    >
                      <span class="my-font-md-400 my-color-black d-inline-flex align-items-center flex-wrap gap-0">
                        範例單元
                        <PackUnitTypeIcon
                          :unit-type="UNIT_TYPE_RAG"
                          color-class="my-color-gray-1"
                          class="ms-2 flex-shrink-0"
                        />
                      </span>
                    </DesignPageSpecItem>
                    <DesignPageSpecItem
                      name="icon-unit-type-picker"
                      usage="設定單元「類型」：rounded-pill my-bgcolor-gray-4 p-1 內四顆 icon＋文字 pill（選中 my-button-white + my-color-black）"
                      css="my-pack-unit-type-segment d-inline-flex flex-wrap gap-1 rounded-pill my-bgcolor-gray-4 p-1 · btn rounded-pill my-font-sm-400 my-pack-unit-type-btn px-3 py-1 gap-2 · PackUnitTypeIcon decorative（icon 繼承按鈕字色）"
                    >
                      <div
                        class="my-pack-unit-type-segment d-inline-flex flex-wrap gap-1 rounded-pill my-bgcolor-gray-4 p-1"
                        role="group"
                        aria-label="設定單元類型"
                      >
                        <button
                          type="button"
                          class="btn rounded-pill d-inline-flex justify-content-center align-items-center gap-2 my-font-sm-400 my-button-white my-pack-unit-type-btn px-3 py-1"
                          title="RAG"
                          aria-label="RAG"
                        >
                          <PackUnitTypeIcon :unit-type="UNIT_TYPE_RAG" decorative />
                          RAG
                        </button>
                        <button
                          type="button"
                          class="btn rounded-pill d-inline-flex justify-content-center align-items-center gap-2 my-font-sm-400 my-button-transparent-borderless my-pack-unit-type-btn px-3 py-1"
                          title="文字"
                          aria-label="文字"
                        >
                          <PackUnitTypeIcon :unit-type="UNIT_TYPE_TEXT" decorative />
                          文字
                        </button>
                        <button
                          type="button"
                          class="btn rounded-pill d-inline-flex justify-content-center align-items-center gap-2 my-font-sm-400 my-button-transparent-borderless my-pack-unit-type-btn px-3 py-1"
                          title="MP3"
                          aria-label="MP3"
                        >
                          <PackUnitTypeIcon :unit-type="UNIT_TYPE_MP3" decorative />
                          MP3
                        </button>
                        <button
                          type="button"
                          class="btn rounded-pill d-inline-flex justify-content-center align-items-center gap-2 my-font-sm-400 my-button-transparent-borderless my-pack-unit-type-btn px-3 py-1"
                          title="YouTube"
                          aria-label="YouTube"
                        >
                          <PackUnitTypeIcon :unit-type="UNIT_TYPE_YOUTUBE" decorative />
                          YouTube
                        </button>
                      </div>
                    </DesignPageSpecItem>
                  </div>
                </div>
              </section>
            </template>

            <!-- ══════════════════════════════════════════════════
                 切換下拉選單
            ══════════════════════════════════════════════════ -->
            <template v-else-if="activeTab === 'dropdown'">
              <section class="my-page-block-spacing mb-0">
                <div class="rounded-4 my-design-page-section p-4">
                  <div role="heading" aria-level="2" class="my-font-lg-400 my-color-black text-break mb-4">切換下拉選單</div>
                  <div class="d-flex flex-wrap gap-4 align-items-start mb-4">
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
                  <div class="d-flex flex-column gap-4">
                    <DesignPageSpecItem
                      v-for="spec in DESIGN3_DROPDOWN_SPECS"
                      :key="spec.name"
                      :name="spec.name"
                      :usage="spec.usage"
                      :css="spec.css"
                      :copy-text="spec.copyText"
                    />
                  </div>
                </div>
              </section>
            </template>

            <!-- ══════════════════════════════════════════════════
                 上傳 Modal ＋ 刪除確認 Modal ＋ LoadingOverlay
            ══════════════════════════════════════════════════ -->
            <template v-else-if="activeTab === 'modal'">
              <section class="my-page-block-spacing">
                <div class="rounded-4 my-design-page-section p-4 mb-5">
                  <div role="heading" aria-level="2" class="my-font-lg-400 my-color-black text-break mb-4">訊息 Modal</div>
                  <p class="my-font-sm-400 my-color-gray-1 mb-4">
                    警告／錯誤一律以 <code class="my-color-black">MessageModal</code> 呈現（含列表載入、建立、pack、出題、設定單元「來源內容」逐字稿讀取失敗等）；不再使用頁面 inline
                    <code class="my-color-black">my-alert-warning-soft</code>／<code class="my-color-black">my-alert-danger-soft</code> 或「來源內容」下方紅字。
                    上傳 Modal 內驗證錯誤仍為 Modal 內 <code class="my-color-black">my-color-red my-font-sm-400 text-break</code>。
                  </p>
                  <DesignPageSpecItem
                    name="modal-message-component"
                    usage="MessageModal 元件；ExamPage／CreateExamQuizBankPage 經 useMessageModal 自動開啟"
                    css="MessageModal · modal-dialog modal-dialog-centered · modal-title my-color-black · my-color-red my-font-sm-400 mb-0 text-break · btn my-button-white"
                    copy-text="MessageModal"
                  />
                  <div class="d-flex flex-wrap gap-2 mb-4">
                    <button
                      type="button"
                      class="btn rounded-pill d-inline-flex justify-content-center align-items-center gap-2 my-font-md-400 my-button-white px-4 py-2"
                      @click="openListErrorDemo"
                    >
                      開啟列表錯誤示範
                    </button>
                    <button
                      type="button"
                      class="btn rounded-pill d-inline-flex justify-content-center align-items-center gap-2 my-font-md-400 my-button-white px-4 py-2"
                      @click="openTranscriptErrorDemo"
                    >
                      開啟來源內容錯誤示範
                    </button>
                  </div>
                  <DesignPageSpecItem
                    name="modal-message-list-error"
                    usage="列表載入失敗（ragListError／examListError）、建立失敗（createExamError）、刪除失敗等"
                    css="MessageModal · title 無法載入列表 · my-color-red my-font-sm-400 mb-0 text-break · btn my-button-white"
                    copy-text="MessageModal"
                  >
                    <div class="rounded-4 p-3" style="border: 1px solid var(--my-color-gray-2, #e5e5e5);">
                      <div class="modal-content border-0 my-bgcolor-white d-flex flex-column gap-3 p-4">
                        <div class="modal-header border-bottom-0 p-0">
                          <h5 class="modal-title my-color-black mb-0">無法載入列表</h5>
                          <button type="button" class="btn-close" aria-label="關閉" />
                        </div>
                        <div class="modal-body p-0 min-w-0">
                          <div class="my-color-red my-font-sm-400 mb-0 text-break">請先登入以載入測驗列表</div>
                        </div>
                        <div class="modal-footer border-top-0 d-flex justify-content-end gap-2 w-100 p-0">
                          <button type="button" class="btn rounded-pill d-inline-flex justify-content-center align-items-center my-font-md-400 my-button-white px-4 py-2">確定</button>
                        </div>
                      </div>
                    </div>
                  </DesignPageSpecItem>
                  <DesignPageSpecItem
                    name="modal-message-transcript-error"
                    usage="設定單元「來源內容」逐字稿／MP3／YouTube 自動載入失敗（setPackUnitTranscriptErrorAt；不在預覽下方顯示紅字）"
                    css="MessageModal · title 無法讀取來源內容 · my-color-red my-font-sm-400 mb-0 text-break · btn my-button-white"
                    copy-text="MessageModal"
                  >
                    <div class="rounded-4 p-3" style="border: 1px solid var(--my-color-gray-2, #e5e5e5);">
                      <div class="modal-content border-0 my-bgcolor-white d-flex flex-column gap-3 p-4">
                        <div class="modal-header border-bottom-0 p-0">
                          <h5 class="modal-title my-color-black mb-0">無法讀取來源內容</h5>
                          <button type="button" class="btn-close" aria-label="關閉" />
                        </div>
                        <div class="modal-body p-0 min-w-0">
                          <div class="my-color-red my-font-sm-400 mb-0 text-break">
                            逐字稿讀取失敗：於資料夾「2_SNA.Data」下找不到支援的音訊檔（副檔名: .aac, .flac, .m4a, .mp3, .mp4, .mpeg, .mpga, .ogg, .opus, .wav, .webm, .wma）
                          </div>
                        </div>
                        <div class="modal-footer border-top-0 d-flex justify-content-end gap-2 w-100 p-0">
                          <button type="button" class="btn rounded-pill d-inline-flex justify-content-center align-items-center my-font-md-400 my-button-white px-4 py-2">確定</button>
                        </div>
                      </div>
                    </div>
                  </DesignPageSpecItem>
                  <div class="d-flex flex-column gap-4 mt-4">
                    <DesignPageSpecItem
                      v-for="spec in DESIGN3_MODAL_SPECS.filter((s) => s.name !== 'modal-message-component' && s.name !== 'modal-error-text')"
                      :key="spec.name"
                      :name="spec.name"
                      :usage="spec.usage"
                      :css="spec.css"
                      :copy-text="spec.copyText"
                    />
                    <DesignPageSpecItem
                      name="modal-error-text"
                      usage="MessageModal 內文；上傳 Modal 內 newBankUploadError；ConfirmDeleteModal :error"
                      css="my-color-red my-font-sm-400 mb-0 text-break"
                      copy-text="my-color-red my-font-sm-400 mb-0 text-break"
                    />
                  </div>
                </div>
              </section>

              <section class="my-page-block-spacing">
                <div class="rounded-4 my-design-page-section p-4 mb-5">
                  <div role="heading" aria-level="2" class="my-font-lg-400 my-color-black text-break mb-2">上傳 Modal</div>
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
                      <div class="modal-body p-0 min-w-0 d-flex flex-column gap-4">
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
                          <div class="my-color-red my-font-sm-400 mb-0 text-break">請選擇 .zip 檔案</div>
                        </div>
                      </div>
                      <div class="modal-footer border-top-0 d-flex justify-content-end gap-2 w-100 p-0">
                        <button type="button" class="btn rounded-pill d-inline-flex justify-content-center align-items-center my-font-md-400 my-color-gray-1 my-button-transparent-borderless flex-shrink-0 px-4 py-2">取消</button>
                        <button type="button" class="btn rounded-pill d-flex justify-content-center align-items-center gap-2 my-font-md-400 my-button-white flex-shrink-0 px-4 py-2">確定上傳</button>
                      </div>
                    </div>
                  </div>

                  <div class="d-flex flex-column gap-4 mt-4">
                    <DesignPageSpecItem
                      v-for="spec in DESIGN3_MODAL_SPECS.filter((s) => !['modal-message-component', 'modal-error-text'].includes(s.name))"
                      :key="spec.name"
                      :name="spec.name"
                      :usage="spec.usage"
                      :css="spec.css"
                      :copy-text="spec.copyText"
                    />
                  </div>
                </div>
              </section>

              <section class="my-page-block-spacing">
                <div class="rounded-4 my-design-page-section p-4 mb-5">
                  <div role="heading" aria-level="2" class="my-font-lg-400 my-color-black text-break mb-4">刪除確認 Modal</div>
                  <DesignPageSpecItem
                    name="modal-delete-component"
                    usage="兩頁共用 ConfirmDeleteModal；props：v-model · title · :message · :deleting · :error → @confirm"
                    css="ConfirmDeleteModal（元件）· 按鈕 class 見 btn-delete-confirm／btn-delete-modal-cancel"
                    copy-text="ConfirmDeleteModal"
                  />
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
                <div class="rounded-4 my-design-page-section p-4">
                  <div role="heading" aria-level="2" class="my-font-lg-400 my-color-black text-break mb-4">LoadingOverlay</div>
                  <DesignPageSpecItem
                    name="loading-overlay"
                    usage="兩頁共用 LoadingOverlay；grid 初次載入 loading-text=載入中…；detail 刪除中 loading-text=刪除中…"
                    css="LoadingOverlay :is-visible · loading-text（props）"
                    copy-text="LoadingOverlay"
                  />
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
                <div class="rounded-4 my-design-page-section p-4">
                  <div role="heading" aria-level="2" class="my-font-lg-400 my-color-black text-break mb-4">嵌入模式</div>
                  <div class="d-flex flex-column gap-4">
                    <DesignPageSpecItem
                      v-for="spec in DESIGN3_EMBED_SPECS"
                      :key="spec.name"
                      :name="spec.name"
                      :usage="spec.usage"
                      :css="spec.css"
                      :copy-text="spec.copyText"
                    />
                  </div>
                </div>
              </section>
            </template>

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
          <div class="modal-body p-0 min-w-0">
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
            <div v-if="uploadError" class="my-color-red my-font-sm-400 mt-2 mb-0 text-break">{{ uploadError }}</div>
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

  <!-- ── 訊息 Modal（MessageModal 示範） ── -->
  <MessageModal
    v-model="messageDemoOpen"
    :title="messageDemoTitle"
    :message="messageDemoMessage"
    confirm-button-class="my-button-white"
  />

  <!-- ── LoadingOverlay ── -->
  <LoadingOverlay :is-visible="loadingVisible" loading-text="載入中..." />
</template>

<style scoped>
/* ── 捲動區（對齊 exam-2__grid-scroll--scrollbar） ───────────── */
.design-page-3__scroll--scrollbar {
  scrollbar-width: thin;
  scrollbar-color: var(--my-scrollbar-thumb) var(--my-color-white);
}

.design-page-3__scroll--scrollbar::-webkit-scrollbar {
  width: var(--my-scrollbar-size);
  height: var(--my-scrollbar-size);
}

.design-page-3__scroll--scrollbar::-webkit-scrollbar-track {
  background: var(--my-color-white);
  border-radius: calc(var(--my-scrollbar-size) / 2);
}

.design-page-3__scroll--scrollbar::-webkit-scrollbar-thumb {
  background-color: var(--my-scrollbar-thumb);
  background-clip: padding-box;
  border: var(--my-scrollbar-thumb-inset) solid var(--my-color-white);
  border-radius: calc(var(--my-scrollbar-size) / 2 - var(--my-scrollbar-thumb-inset));
}

.design-page-3__scroll--scrollbar::-webkit-scrollbar-corner {
  background: var(--my-color-white);
}

.design-page-3__scroll--scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: var(--my-scrollbar-thumb-hover);
}

.design-page-3__sections {
  max-width: 52rem;
}

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

.design-page-3-topview-preview :deep(.my-course-header-nav-btn) {
  background-color: var(--my-color-white);
  border: 1px solid var(--my-color-gray-2);
  box-shadow: none;
  text-decoration: none;
  padding-left: 1.5rem !important;
  padding-right: 1.5rem !important;
}

.design-page-3-topview-preview :deep(.my-course-header-nav-btn:hover),
.design-page-3-topview-preview :deep(.my-course-header-nav-btn:focus-visible) {
  background-color: color-mix(in srgb, var(--my-color-black) 7%, var(--my-color-white));
  border-color: color-mix(in srgb, var(--my-color-black) 18%, var(--my-color-gray-2));
  outline: none;
}

/* ── list 入口預覽（對齊 ExamPage2／CreateExamQuizBankPage2 scoped bank-*） ── */
.bank-list-wrap {
  width: 100%;
  max-width: 40rem;
}

.bank-table-actions {
  display: flex;
  justify-content: flex-end;
  padding-bottom: 0.75rem;
}

.bank-table-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0 1.25rem 0.5rem;
}

.bank-table-sort-btn {
  background-color: transparent !important;
  padding-left: 0 !important;
  padding-right: 0 !important;
}

.bank-table-sort-btn:hover:not(:disabled),
.bank-table-sort-btn:focus-visible:not(:disabled),
.bank-table-sort-btn:active:not(:disabled) {
  background-color: transparent !important;
}

.bank-table-header__dot-spacer {
  display: inline-block;
  width: calc(0.5rem + 0.75rem);
  flex-shrink: 0;
}

.bank-list {
  list-style: none;
  padding: 0;
  margin: 0;
  border-bottom: 1px solid var(--my-color-gray-2, #e5e5e5);
}

.bank-list > li {
  display: block;
  border-top: 1px solid var(--my-color-gray-2, #e5e5e5);
}

.bank-list-row {
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

.bank-list-row:hover:not(:disabled) {
  background-color: var(--my-color-gray-2, #e5e5e5);
}

.design-page-3__list-preview--work3 .bank-list-row:hover:not(:disabled) {
  background-color: var(--my-color-gray-3);
}

.bank-list-row:focus-visible {
  outline: 2px solid var(--my-color-black, #000);
  outline-offset: -2px;
}

.bank-list-row__dot-col {
  flex-shrink: 0;
  width: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.bank-list-row__exam-dot {
  width: 0.5rem;
  height: 0.5rem;
}

.bank-list-row__label {
  flex: 1 1 0;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bank-list-row__subtitle {
  flex-shrink: 0;
  white-space: nowrap;
}

.bank-list-row__chevron {
  flex-shrink: 0;
  font-size: 0.625rem;
  opacity: 0.4;
}

/* ── 字階預覽：exam_3／create-exam-bank_3 語意標題（對齊 ExamPage／CreateExamQuizBankPage scoped） ── */
.my-design-pack-unit-main-title {
  line-height: 1.35;
  white-space: nowrap;
}

.design-page-3-stem-tabs-preview .my-design-quiz-stem-tab {
  position: relative;
  z-index: 0;
  margin-bottom: -1px;
  border: none;
  border-bottom: 2pt solid transparent;
  border-radius: 0;
  background: transparent;
  line-height: 1.25;
  box-shadow: none;
}

.design-page-3-stem-tabs-preview .my-design-quiz-stem-tab--active {
  z-index: 1;
  padding-bottom: calc(0.5rem + 1px);
  border-bottom-color: var(--my-color-black);
}

.design-page-3-prompt-block-preview {
  background-color: var(--my-color-black);
  max-width: 16rem;
}

/* 稿頁預覽：左欄「+ 新增單元」列（對齊 CreateExamQuizBankPage scoped） */
.design-page-3-side-panel-preview .my-design-side-nav-add-unit-row > .my-design-side-nav-unit-menu-btn.btn,
.my-design-side-nav-add-unit-row > .my-design-side-nav-unit-menu-btn.btn {
  align-self: stretch;
  width: auto;
  height: auto;
  min-width: 0;
  min-height: 0;
  aspect-ratio: 1;
  flex-shrink: 0;
  color: var(--my-color-gray-1);
}
.my-design-side-nav-add-unit-row > .my-design-side-nav-unit-menu-btn.btn:hover:not(:disabled),
.my-design-side-nav-add-unit-row > .my-design-side-nav-unit-menu-btn.btn:focus-visible:not(:disabled) {
  color: var(--my-color-black);
}

/* 稿頁預覽：設定單元名稱 inline 編輯、左欄單元列 badge */
.my-design-pack-unit-name-title {
  display: block;
  max-width: 16rem;
  border: none;
  outline: none;
  box-shadow: none;
  background: transparent;
  margin: 0;
  font-family: inherit;
  line-height: inherit;
  appearance: none;
  -webkit-appearance: none;
  transition: background-color 0.15s ease;
}
.my-design-pack-unit-name-title:hover:not(:disabled),
.my-design-pack-unit-name-title:focus:not(:disabled) {
  background-color: var(--my-color-gray-3, #f5f5f5);
}
.my-design-right-unit-count-badge {
  align-self: center;
  margin-right: 0.25rem;
  padding: 0.125rem 0.375rem;
  font-size: 0.625rem;
  font-weight: var(--my-font-weight-regular);
  line-height: 1.25;
  color: var(--my-color-gray-1);
  background-color: var(--my-color-white);
  border: none;
  border-radius: 0.25rem;
}
.my-design-right-unit-row-label {
  display: block;
  min-width: 0;
  padding: var(--bs-nav-link-padding-y, 0.5rem) 0;
}
</style>
