<script setup>
/**
 * CreateExamQuizBankPage2 - 建立測驗題庫（九宮格入口版）
 *
 * 首屏以九宮格顯示各題庫；點方塊進入題庫內容（複用 CreateExamQuizBankPage，隱藏分頁列）。
 * 不修改 CreateExamQuizBankPage.vue。
 */
import { ref, computed, watch, onActivated } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/authStore.js';
import { useRagList } from '../composables/useRagList.js';
import {
  getPersonId,
  apiCreateUploadZip,
  apiUpdateRagTabName,
  apiDeleteRag,
  is504OrNetworkError,
} from '../services/ragApi.js';
import { deriveRagName, generateTabId } from '../utils/rag.js';
import CreateExamQuizBankPage from './CreateExamQuizBankPage.vue';
import CreateExamQuizBankPage2DetailBar from '../components/CreateExamQuizBankPage2DetailBar.vue';
import LoadingOverlay from '../components/LoadingOverlay.vue';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal.vue';

const props = defineProps({
  tabId: { type: String, required: true },
  /** 路由前綴，供 create-exam-bank_2 / create-exam-bank_3 共用 */
  routeBase: { type: String, default: '/create-exam-bank_2' },
  /** true 時嵌入頁右側清單改顯示於左側（create-exam-bank_3） */
  sidePanelOnLeft: { type: Boolean, default: false },
});

const CREATE_BANK_TAB_UI_STORAGE_PREFIX = 'myquiz:createBankTabUI:v1:';
const UPLOAD_ALLOWED_EXTENSIONS = ['.zip'];
const UPLOAD_ACCEPT_ATTR = UPLOAD_ALLOWED_EXTENSIONS.join(',');
const UPLOAD_MAX_FILE_BYTES = 50 * 1000 * 1000;
const QUIZ_BANK_NOUN = '測驗題庫';

const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();
const viewMode = ref('grid');
const selectedBankTabId = ref('');
const selectedBankLabel = ref('');

const { ragList, ragListLoading, ragListError, fetchRagList } = useRagList();

const createRagLoading = ref(false);
const newBankUploadModalOpen = ref(false);
const newBankUploadFile = ref(/** @type {File | null} */ (null));
const newBankUploadFileName = ref('');
const newBankUploadError = ref('');
const newBankUploadZipDragOver = ref(false);
const newBankUploadFileInputRef = ref(null);

const renameTitleSaving = ref(false);
const bankTitleBeforeEdit = ref('');

const deleteRagLoading = ref(false);
const deleteBankModalOpen = ref(false);
const deleteBankModalMessage = ref('');
const deleteBankError = ref('');

const newBankUploadConfirmDisabled = computed(
  () => createRagLoading.value || !newBankUploadFile.value,
);

const gridItems = computed(() =>
  ragList.value.map((rag) => {
    const tabId = String(rag.rag_tab_id ?? rag.id ?? rag);
    return {
      tabId,
      label: deriveRagName(rag) || tabId || QUIZ_BANK_NOUN,
      isExam: ragRowIsExamBank(rag),
      subtitle: ragSubtitle(rag),
    };
  }),
);

const sortOrder = ref('asc');

const sortedItems = computed(() => {
  const items = [...gridItems.value];
  return items.sort((a, b) =>
    sortOrder.value === 'asc'
      ? a.label.localeCompare(b.label, 'zh-TW')
      : b.label.localeCompare(a.label, 'zh-TW'),
  );
});

function toggleSort() {
  sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
}

const showGridLoadingOverlay = computed(
  () => viewMode.value === 'grid' && ragListLoading.value && gridItems.value.length === 0,
);

const detailHeaderActionsDisabled = computed(
  () => deleteRagLoading.value || renameTitleSaving.value,
);

function createBankTabUiStorageKey(personId) {
  const p = String(personId ?? '').trim();
  return `${CREATE_BANK_TAB_UI_STORAGE_PREFIX}${p || 'anon'}`;
}

function persistCreateBankTabSelection(ragTabId) {
  const personId = getPersonId(authStore);
  if (!personId || !ragTabId) return;
  try {
    sessionStorage.setItem(
      createBankTabUiStorageKey(personId),
      JSON.stringify({
        rag_tab_id: String(ragTabId),
        unit_tab_id: '',
        quiz_type_index: 0,
      }),
    );
  } catch {
    /* ignore quota / private mode */
  }
}

function ragSubtitle(rag) {
  if (!rag || typeof rag !== 'object') return '';
  const units = Array.isArray(rag.units) ? rag.units : [];
  if (units.length > 0) return `${units.length} 個單元`;
  const fn =
    rag.file_metadata?.filename
    ?? rag.filename
    ?? rag.rag_filename
    ?? '';
  return String(fn).trim();
}

function quizRowIsForExam(quiz) {
  if (!quiz || typeof quiz !== 'object') return false;
  return (
    quiz.for_exam === true
    || quiz.for_exam === 1
    || quiz.rag_quiz_for_exam === true
    || quiz.rag_quiz_for_exam === 1
  );
}

function ragRowIsExamBank(rag) {
  if (!rag || typeof rag !== 'object') return false;
  if (rag.for_exam === true || rag.for_exam === 1) return true;
  const units = Array.isArray(rag.units) ? rag.units : [];
  for (const unit of units) {
    const quizzes = unit.quizzes ?? unit.quiz_list ?? unit.Quizzes ?? [];
    if (Array.isArray(quizzes) && quizzes.some(quizRowIsForExam)) return true;
  }
  const topQuizzes = rag.quizzes ?? rag.quiz_list ?? [];
  if (Array.isArray(topQuizzes) && topQuizzes.some(quizRowIsForExam)) return true;
  return false;
}

function applyRouteRagId() {
  const ragId = String(route.params.rag_id ?? '').trim();
  if (!ragId) {
    viewMode.value = 'grid';
    selectedBankTabId.value = '';
    selectedBankLabel.value = '';
    return;
  }
  const item = gridItems.value.find((i) => i.tabId === ragId);
  const rag = findRagByTabId(ragId);
  const label = item?.label ?? ((rag ? deriveRagName(rag) : '') || ragId);
  persistCreateBankTabSelection(ragId);
  selectedBankTabId.value = ragId;
  selectedBankLabel.value = label;
  viewMode.value = 'detail';
}

function openBankDetail(tabId, label) {
  const id = String(tabId ?? '').trim();
  if (!id) return;
  persistCreateBankTabSelection(id);
  selectedBankTabId.value = id;
  selectedBankLabel.value = label || id;
  viewMode.value = 'detail';
  if (String(route.params.rag_id ?? '') !== id) {
    router.push(`${props.routeBase}/${encodeURIComponent(id)}`);
  }
}

function switchBankDetail(tabId, label) {
  const id = String(tabId ?? '').trim();
  if (!id || id === String(selectedBankTabId.value ?? '')) return;
  persistCreateBankTabSelection(id);
  selectedBankTabId.value = id;
  selectedBankLabel.value = label || id;
  if (String(route.params.rag_id ?? '') !== id) {
    router.push(`${props.routeBase}/${encodeURIComponent(id)}`);
  }
}

function backToGrid() {
  viewMode.value = 'grid';
  selectedBankTabId.value = '';
  selectedBankLabel.value = '';
  fetchRagList();
  if (route.params.rag_id) {
    router.push(props.routeBase);
  }
}

function findRagByTabId(tabId) {
  const id = String(tabId ?? '').trim();
  if (!id) return null;
  return ragList.value.find((r) => String(r.rag_tab_id ?? r.id ?? r) === id) ?? null;
}

function onBankTitleFocus() {
  bankTitleBeforeEdit.value = selectedBankLabel.value;
}

async function onBankTitleBlur() {
  if (renameTitleSaving.value) return;
  const name = String(selectedBankLabel.value ?? '').trim();
  if (!name) {
    selectedBankLabel.value = bankTitleBeforeEdit.value;
    return;
  }
  selectedBankLabel.value = name;
  if (name === String(bankTitleBeforeEdit.value ?? '').trim()) return;
  const rag = findRagByTabId(selectedBankTabId.value);
  const rid = rag?.rag_id;
  if (rid == null || !Number.isFinite(Number(rid)) || Number(rid) < 1) {
    selectedBankLabel.value = bankTitleBeforeEdit.value;
    alert(`找不到此${QUIZ_BANK_NOUN}，請重新整理頁面後再試`);
    return;
  }
  renameTitleSaving.value = true;
  try {
    await apiUpdateRagTabName(Number(rid), name);
    if (rag) {
      rag.tab_name = name;
    }
    bankTitleBeforeEdit.value = name;
  } catch (err) {
    selectedBankLabel.value = bankTitleBeforeEdit.value;
    alert(err.message || '更新失敗');
  } finally {
    renameTitleSaving.value = false;
  }
}

function openDeleteBankModal() {
  if (deleteRagLoading.value) return;
  const rag = findRagByTabId(selectedBankTabId.value);
  if (!rag) return;
  const fileId = rag.rag_tab_id ?? rag.id ?? rag;
  if (fileId == null || String(fileId).trim() === '') return;
  const personId = getPersonId(authStore);
  if (!personId) {
    alert('請先登入');
    return;
  }
  if (ragRowIsExamBank(rag)) {
    alert('此題庫含有已設為測驗用之題型，無法刪除。請先於題型區將「設為測驗用」全部取消後再試。');
    return;
  }
  const label = deriveRagName(rag) || selectedBankLabel.value || String(fileId);
  deleteBankError.value = '';
  deleteBankModalMessage.value = `確定要刪除「${label}」嗎？`;
  deleteBankModalOpen.value = true;
}

async function confirmDeleteBank() {
  if (deleteRagLoading.value) return;
  const rag = findRagByTabId(selectedBankTabId.value);
  if (!rag) return;
  const fileId = rag.rag_tab_id ?? rag.id ?? rag;
  if (fileId == null || String(fileId).trim() === '') return;
  deleteBankError.value = '';
  deleteRagLoading.value = true;
  try {
    await apiDeleteRag(fileId);
    deleteBankModalOpen.value = false;
    await fetchRagList();
    const remaining = gridItems.value;
    if (remaining.length === 0) {
      backToGrid();
      return;
    }
    const next = remaining[0];
    switchBankDetail(next.tabId, next.label);
  } catch (err) {
    deleteBankError.value = err.message || String(err) || '刪除失敗';
  } finally {
    deleteRagLoading.value = false;
  }
}

function uploadFileExceedsMaxSize(file) {
  if (!file || typeof file.size !== 'number' || !Number.isFinite(file.size)) return false;
  return file.size > UPLOAD_MAX_FILE_BYTES;
}

function fileHasAllowedUploadExtension(file) {
  if (!file?.name) return false;
  const lower = file.name.toLowerCase();
  return UPLOAD_ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function resetNewBankUploadDraft() {
  newBankUploadFile.value = null;
  newBankUploadFileName.value = '';
  newBankUploadError.value = '';
  newBankUploadZipDragOver.value = false;
  if (newBankUploadFileInputRef.value) {
    newBankUploadFileInputRef.value.value = '';
  }
}

function openNewBankUploadModal() {
  if (createRagLoading.value) return;
  resetNewBankUploadDraft();
  newBankUploadModalOpen.value = true;
}

function closeNewBankUploadModal() {
  if (createRagLoading.value) return;
  newBankUploadModalOpen.value = false;
  resetNewBankUploadDraft();
}

function setNewBankUploadFileFromFile(file) {
  if (!file) {
    newBankUploadFile.value = null;
    newBankUploadFileName.value = '';
    newBankUploadError.value = '';
    return;
  }
  if (!fileHasAllowedUploadExtension(file)) {
    newBankUploadFile.value = null;
    newBankUploadFileName.value = '';
    newBankUploadError.value = '請選擇 .zip 檔案';
    return;
  }
  if (uploadFileExceedsMaxSize(file)) {
    newBankUploadFile.value = null;
    newBankUploadFileName.value = '';
    newBankUploadError.value = '檔案大小不可超過 50 MB，請選擇較小的檔案';
    return;
  }
  newBankUploadFile.value = file;
  newBankUploadFileName.value = file.name;
  newBankUploadError.value = '';
}

function onNewBankUploadZipChange(e) {
  if (createRagLoading.value) return;
  setNewBankUploadFileFromFile(e.target.files?.[0] ?? null);
}

function onNewBankUploadZipDragOver(e) {
  e.preventDefault();
  e.stopPropagation();
  if (e.dataTransfer.types.includes('Files')) newBankUploadZipDragOver.value = true;
}

function onNewBankUploadZipDragLeave(e) {
  e.preventDefault();
  e.stopPropagation();
  newBankUploadZipDragOver.value = false;
}

function onNewBankUploadZipDrop(e) {
  e.preventDefault();
  e.stopPropagation();
  newBankUploadZipDragOver.value = false;
  if (createRagLoading.value) return;
  setNewBankUploadFileFromFile(e.dataTransfer.files?.[0] ?? null);
  if (newBankUploadFileInputRef.value) newBankUploadFileInputRef.value.value = '';
}

function openNewBankUploadFileDialog() {
  if (createRagLoading.value) return;
  newBankUploadFileInputRef.value?.click();
}

async function confirmNewBankUpload() {
  if (createRagLoading.value) return;
  if (!newBankUploadFile.value) {
    newBankUploadError.value = '請先選擇要上傳的檔案';
    return;
  }
  if (uploadFileExceedsMaxSize(newBankUploadFile.value)) {
    newBankUploadError.value = '檔案大小不可超過 50 MB，請選擇較小的檔案';
    return;
  }
  const personId = getPersonId(authStore);
  if (!personId) {
    newBankUploadError.value = '請先登入';
    return;
  }
  newBankUploadError.value = '';
  createRagLoading.value = true;
  const ragTabId = generateTabId(personId);
  const tabName = `未命名${QUIZ_BANK_NOUN}`;
  try {
    const data = await apiCreateUploadZip(
      newBankUploadFile.value,
      ragTabId,
      personId,
      tabName,
    );
    const create = data?.create ?? data;
    const newTabId =
      create?.rag_tab_id != null
        ? String(create.rag_tab_id)
        : data?.rag_tab_id != null
          ? String(data.rag_tab_id)
          : '';
    if (!newTabId) throw new Error(`建立${QUIZ_BANK_NOUN}失敗`);
    newBankUploadModalOpen.value = false;
    resetNewBankUploadDraft();
    await fetchRagList();
    openBankDetail(newTabId, tabName);
  } catch (err) {
    newBankUploadError.value = is504OrNetworkError(err)
      ? '服務正在啟動（約需一分鐘），請稍後再試'
      : err.message || '上傳失敗';
  } finally {
    createRagLoading.value = false;
  }
}

onActivated(async () => {
  const ragId = String(route.params.rag_id ?? '').trim();
  if (ragId) {
    await fetchRagList();
    applyRouteRagId();
    return;
  }
  if (viewMode.value === 'grid') {
    fetchRagList();
  }
});

watch(
  () => route.params.rag_id,
  async (ragId) => {
    if (String(ragId ?? '').trim()) {
      if (ragList.value.length === 0 && !ragListLoading.value) {
        await fetchRagList();
      }
      applyRouteRagId();
      return;
    }
    applyRouteRagId();
  },
);

watch(ragList, () => {
  if (route.params.rag_id) {
    applyRouteRagId();
  }
});

watch(viewMode, (mode) => {
  if (mode === 'detail') {
    fetchRagList({ silent: true });
  }
});
</script>

<template>
  <div
    class="create-exam-bank-2 d-flex flex-column h-100 overflow-hidden my-bgcolor-gray-4"
    :class="{
      'create-exam-bank-2--detail': viewMode === 'detail',
      'create-exam-bank-2--side-panel-left': sidePanelOnLeft,
    }"
  >
    <!-- 九宮格題庫入口 -->
    <template v-if="viewMode === 'grid'">
      <header class="flex-shrink-0 my-bgcolor-gray-4 p-4">
        <div class="container-fluid px-0 text-center">
          <p class="my-font-xl-400 my-color-black text-break mb-0">建立測驗題庫</p>
        </div>
      </header>

      <div
        class="create-exam-bank-2__grid-scroll flex-grow-1 min-h-0 overflow-auto px-3 px-md-4 py-4 position-relative d-flex flex-column"
        :class="{ 'create-exam-bank-2__grid-scroll--scrollbar': sidePanelOnLeft }"
      >
        <LoadingOverlay
          :is-visible="showGridLoadingOverlay"
          loading-text="載入中..."
        />

        <div
          v-if="ragListError"
          class="my-alert-warning-soft my-font-sm-400 py-2 mb-3"
        >
          {{ ragListError }}
        </div>

        <!-- 清單為空：居中顯示大型新增按鈕 -->
        <div
          v-if="sortedItems.length === 0 && !ragListLoading"
          class="flex-grow-1 d-flex justify-content-center align-items-center"
        >
          <button
            type="button"
            class="btn rounded-pill d-inline-flex align-items-center gap-2 my-font-lg-400 my-button-white px-4 py-3"
            :disabled="createRagLoading"
            :aria-busy="createRagLoading"
            @click="openNewBankUploadModal"
          >
            <i class="fa-solid fa-plus" aria-hidden="true" />
            新增{{ QUIZ_BANK_NOUN }}
          </button>
        </div>

        <!-- 有資料：顯示列表 -->
        <div v-else class="bank-list-wrap" :class="{ 'mx-auto': !sidePanelOnLeft }">
          <!-- 新增按鈕列 -->
          <div class="bank-table-actions">
            <button
              type="button"
              class="btn rounded-pill d-inline-flex align-items-center gap-2 my-font-md-400 my-button-white px-4 py-2"
              :disabled="createRagLoading"
              :aria-busy="createRagLoading"
              @click="openNewBankUploadModal"
            >
              <i class="fa-solid fa-plus" aria-hidden="true" />
              新增{{ QUIZ_BANK_NOUN }}
            </button>
          </div>

          <!-- 表頭：名稱排序（含 dot 欄位間距對齊） -->
          <div class="bank-table-header">
            <span class="bank-table-header__dot-spacer" aria-hidden="true" />
            <button
              type="button"
              class="btn rounded-pill d-inline-flex align-items-center gap-1 my-font-sm-400 my-color-gray-1 my-button-transparent-borderless py-1"
              :class="sidePanelOnLeft ? 'px-2' : 'px-4'"
              :aria-label="sortOrder === 'asc' ? '升冪排序，點擊改為降冪' : '降冪排序，點擊改為升冪'"
              @click="toggleSort"
            >
              名稱
              <i :class="['fa-solid', sortOrder === 'asc' ? 'fa-chevron-up' : 'fa-chevron-down']" aria-hidden="true" />
            </button>
          </div>

          <ul class="bank-list">
            <li v-for="item in sortedItems" :key="item.tabId">
              <button
                type="button"
                class="bank-list-row"
                @click="openBankDetail(item.tabId, item.label)"
              >
                <span class="bank-list-row__dot-col" :aria-label="item.isExam ? '試卷用題庫' : undefined">
                  <span
                    v-if="item.isExam"
                    class="rounded-circle d-inline-block my-bgcolor-green bank-list-row__exam-dot"
                  />
                </span>
                <span class="bank-list-row__label my-font-md-400 my-color-black">{{ item.label }}</span>
                <span
                  v-if="item.subtitle"
                  class="bank-list-row__subtitle my-font-sm-400 my-color-gray-1"
                >{{ item.subtitle }}</span>
                <i class="fa-solid fa-chevron-right bank-list-row__chevron" aria-hidden="true" />
              </button>
            </li>
          </ul>
        </div>
      </div>
    </template>

    <!-- 題庫內容（隱藏原頁分頁列） -->
    <template v-else>
      <LoadingOverlay
        :is-visible="deleteRagLoading"
        loading-text="刪除中..."
      />
      <CreateExamQuizBankPage2DetailBar
        v-if="!sidePanelOnLeft"
        v-model:selected-bank-label="selectedBankLabel"
        :detail-header-actions-disabled="detailHeaderActionsDisabled"
        :grid-items="gridItems"
        :selected-bank-tab-id="selectedBankTabId"
        :delete-rag-loading="deleteRagLoading"
        @back="backToGrid"
        @switch-bank="switchBankDetail"
        @delete-bank="openDeleteBankModal"
        @title-focus="onBankTitleFocus"
        @title-blur="onBankTitleBlur"
      />

      <CreateExamQuizBankPage
        :key="selectedBankTabId"
        :tab-id="tabId"
        :design-side-panel-on-left="sidePanelOnLeft"
        class="create-exam-bank-2-embedded flex-grow-1 min-h-0"
      >
        <template v-if="sidePanelOnLeft" #side-panel-header>
          <CreateExamQuizBankPage2DetailBar
            v-model:selected-bank-label="selectedBankLabel"
            :detail-header-actions-disabled="detailHeaderActionsDisabled"
            :grid-items="gridItems"
            :selected-bank-tab-id="selectedBankTabId"
            :delete-rag-loading="deleteRagLoading"
            in-side-panel
            @back="backToGrid"
            @switch-bank="switchBankDetail"
            @delete-bank="openDeleteBankModal"
            @title-focus="onBankTitleFocus"
            @title-blur="onBankTitleBlur"
          />
        </template>
      </CreateExamQuizBankPage>
    </template>

  </div>

  <Teleport to="body">
    <div
      v-if="newBankUploadModalOpen"
      class="modal fade show d-block my-modal-backdrop"
      tabindex="-1"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bank2-new-upload-modal-title"
      @click.self="closeNewBankUploadModal"
    >
      <div
        class="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable"
        @click.stop
      >
        <div class="modal-content border-0 my-bgcolor-gray-3 d-flex flex-column gap-3 p-4">
          <div class="modal-header border-bottom-0 p-0">
            <h5
              id="bank2-new-upload-modal-title"
              class="modal-title my-color-black"
            >
              上傳檔案
            </h5>
            <button
              type="button"
              class="btn-close"
              aria-label="關閉"
              :disabled="createRagLoading"
              @click="closeNewBankUploadModal"
            />
          </div>
          <div class="modal-body p-0 min-w-0">
            <input
              ref="newBankUploadFileInputRef"
              type="file"
              :accept="UPLOAD_ACCEPT_ATTR"
              class="d-none"
              @change="onNewBankUploadZipChange"
            >
            <div
              class="my-zip-drop-zone text-center position-relative"
              :class="{ 'my-zip-drop-zone-over': newBankUploadZipDragOver }"
              @dragover="onNewBankUploadZipDragOver"
              @dragenter="onNewBankUploadZipDragOver"
              @dragleave="onNewBankUploadZipDragLeave"
              @drop="onNewBankUploadZipDrop"
              @click="openNewBankUploadFileDialog"
            >
              <template v-if="newBankUploadFileName">
                <span class="my-font-sm-400 my-color-black">{{ newBankUploadFileName }}</span>
                <div class="my-font-sm-400 my-color-gray-4 mt-1">點擊可重新選擇檔案</div>
              </template>
              <span v-else class="my-font-sm-400 my-color-gray-4">拖曳.zip檔到這裡，或點擊選擇檔案</span>
              <div class="my-font-sm-400 my-color-gray-4 mt-2">
                單檔不可超過 50 MB
              </div>
              <div
                class="my-font-sm-400 my-color-gray-4 mt-2 text-start lh-sm w-100 mx-auto"
                style="max-width: 28rem;"
              >
                <div class="mb-1">
                  請在「設定單元」為 ZIP 內各資料夾分別選單元類型；各資料夾裡，後端會讀取的副檔名依類型如下：
                </div>
                <ul class="my-font-sm-400 my-color-gray-4 mb-0 ps-3">
                  <li class="mb-0">RAG：.pdf、.doc、.docx、.ppt、.pptx</li>
                  <li class="mb-0">文字：該資料夾內只能有一個 .md、.txt、.doc 或 .docx</li>
                  <li class="mb-0">mp3：該資料夾內只能有一個.mp3檔</li>
                  <li class="mb-0">youtube：.md、.txt、.doc 或 .docx（檔內須為 YouTube 網址）</li>
                </ul>
              </div>
            </div>
            <div
              v-if="newBankUploadError"
              class="my-alert-danger-soft my-font-sm-400 py-2 mt-2 mb-0"
            >
              {{ newBankUploadError }}
            </div>
          </div>
          <div class="modal-footer border-top-0 d-flex justify-content-end gap-2 w-100 p-0">
            <button
              type="button"
              class="btn rounded-pill d-inline-flex justify-content-center align-items-center my-font-md-400 my-color-gray-1 my-button-transparent-borderless px-4 py-2"
              :disabled="createRagLoading"
              @click="closeNewBankUploadModal"
            >
              取消
            </button>
            <button
              type="button"
              class="btn rounded-pill d-flex justify-content-center align-items-center gap-2 my-font-md-400 my-button-white flex-shrink-0 px-4 py-2"
              :disabled="newBankUploadConfirmDisabled"
              :aria-busy="createRagLoading"
              @click.stop="confirmNewBankUpload"
            >
              確定上傳
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>

  <ConfirmDeleteModal
    v-model="deleteBankModalOpen"
    title="刪除此題庫"
    :message="deleteBankModalMessage"
    :deleting="deleteRagLoading"
    :error="deleteBankError"
    @confirm="confirmDeleteBank"
  />
</template>

<style scoped>
/* ── list 入口 ──────────────────────────────────────── */
.bank-list-wrap {
  width: 100%;
  max-width: 40rem;
}

.bank-table-actions {
  display: flex;
  justify-content: flex-end;
  padding-bottom: 0.75rem;
  margin-inline: -1rem;
}

.create-exam-bank-2--side-panel-left .bank-table-actions {
  justify-content: flex-start;
}

@media (min-width: 768px) {
  .bank-table-actions {
    margin-inline: -1.5rem;
  }
}

.bank-table-header {
  display: flex;
  align-items: center;
  padding: 0 1.25rem 0.5rem;
}

/* 與列內 dot-col (0.5rem) + gap (0.75rem) 等寬，讓「名稱」文字對齊列標籤 */
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
}

.bank-list > li {
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


/* ── detail bar styles moved to CreateExamQuizBankPage2DetailBar.vue ── */

.create-exam-bank-2.create-exam-bank-2--detail {
  overflow: visible;
}

.create-exam-bank-2-embedded {
  overflow: hidden;
}

.create-exam-bank-2--side-panel-left .create-exam-bank-2__grid-scroll--scrollbar {
  scrollbar-width: thin;
  scrollbar-color: var(--my-scrollbar-thumb) var(--my-scrollbar-track);
}

.create-exam-bank-2--side-panel-left .create-exam-bank-2__grid-scroll--scrollbar::-webkit-scrollbar {
  width: var(--my-scrollbar-size);
  height: var(--my-scrollbar-size);
}

.create-exam-bank-2--side-panel-left .create-exam-bank-2__grid-scroll--scrollbar::-webkit-scrollbar-track {
  background: var(--my-scrollbar-track);
  border-radius: calc(var(--my-scrollbar-size) / 2);
}

.create-exam-bank-2--side-panel-left .create-exam-bank-2__grid-scroll--scrollbar::-webkit-scrollbar-thumb {
  background-color: var(--my-scrollbar-thumb);
  background-clip: padding-box;
  border: var(--my-scrollbar-thumb-inset) solid var(--my-scrollbar-track);
  border-radius: calc(var(--my-scrollbar-size) / 2 - var(--my-scrollbar-thumb-inset));
}

.create-exam-bank-2--side-panel-left .create-exam-bank-2__grid-scroll--scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: var(--my-scrollbar-thumb-hover);
}

/* 嵌入原頁：隱藏「建立測驗題庫」標題列與分頁列 */
.create-exam-bank-2-embedded :deep(> header) {
  display: none;
}

.create-exam-bank-2-embedded :deep(.my-rag-tabs-bar) {
  display: none !important;
}

/* 嵌入原頁：子元件 pill 若仍為 px-3，與九宮格版一致改為 px-4 */
.create-exam-bank-2-embedded :deep(button.btn.rounded-pill.px-3),
.create-exam-bank-2-embedded :deep(button.btn.rounded-2.px-3) {
  padding-left: 1.5rem !important;
  padding-right: 1.5rem !important;
}

/* create-exam-bank_3：小 pill 按鈕 px-2（覆寫上方 px-4） */
.create-exam-bank-2--side-panel-left :deep(button.btn.rounded-pill.my-font-sm-400),
.create-exam-bank-2--side-panel-left :deep(button.btn.rounded-2.my-font-sm-400) {
  padding-left: 0.5rem !important;
  padding-right: 0.5rem !important;
}

.create-exam-bank-2--side-panel-left .create-exam-bank-2-embedded :deep(button.btn.rounded-pill.my-font-sm-400),
.create-exam-bank-2--side-panel-left .create-exam-bank-2-embedded :deep(button.btn.rounded-2.my-font-sm-400) {
  padding-left: 0.5rem !important;
  padding-right: 0.5rem !important;
}
</style>
