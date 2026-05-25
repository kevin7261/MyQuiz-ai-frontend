<script setup>
/**
 * CreateExamQuizBankPage2 - 建立測驗題庫（九宮格入口版）
 *
 * 首屏以九宮格顯示各題庫；點方塊進入題庫內容（複用 CreateExamQuizBankPage，隱藏分頁列）。
 * 不修改 CreateExamQuizBankPage.vue。
 */
import { ref, computed, watch, onActivated } from 'vue';
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
import LoadingOverlay from '../components/LoadingOverlay.vue';
import TabRenameModal from '../components/TabRenameModal.vue';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal.vue';

defineProps({
  tabId: { type: String, required: true },
});

const CREATE_BANK_TAB_UI_STORAGE_PREFIX = 'myquiz:createBankTabUI:v1:';
const UPLOAD_ALLOWED_EXTENSIONS = ['.zip'];
const UPLOAD_ACCEPT_ATTR = UPLOAD_ALLOWED_EXTENSIONS.join(',');
const UPLOAD_MAX_FILE_BYTES = 50 * 1000 * 1000;
const QUIZ_BANK_NOUN = '測驗題庫';

const authStore = useAuthStore();
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

const renameRagTabModalOpen = ref(false);
const renameRagTabDraftRagId = ref(null);
const renameRagTabInitialName = ref('');
const renameRagTabSaving = ref(false);
const renameRagTabError = ref('');

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

const showGridLoadingOverlay = computed(
  () => viewMode.value === 'grid' && ragListLoading.value && gridItems.value.length === 0,
);

const selectedBankIsExam = computed(() => {
  const rag = findRagByTabId(selectedBankTabId.value);
  return rag ? ragRowIsExamBank(rag) : false;
});

const detailHeaderActionsDisabled = computed(
  () => deleteRagLoading.value || renameRagTabSaving.value,
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

function openBankDetail(tabId, label) {
  const id = String(tabId ?? '').trim();
  if (!id) return;
  persistCreateBankTabSelection(id);
  selectedBankTabId.value = id;
  selectedBankLabel.value = label || id;
  viewMode.value = 'detail';
}

function switchBankDetail(tabId, label) {
  const id = String(tabId ?? '').trim();
  if (!id || id === String(selectedBankTabId.value ?? '')) return;
  persistCreateBankTabSelection(id);
  selectedBankTabId.value = id;
  selectedBankLabel.value = label || id;
}

function backToGrid() {
  viewMode.value = 'grid';
  selectedBankTabId.value = '';
  selectedBankLabel.value = '';
  fetchRagList();
}

function findRagByTabId(tabId) {
  const id = String(tabId ?? '').trim();
  if (!id) return null;
  return ragList.value.find((r) => String(r.rag_tab_id ?? r.id ?? r) === id) ?? null;
}

function getRagTabNameForEdit(rag) {
  if (!rag || typeof rag !== 'object') return '';
  const t = rag.tab_name;
  if (t != null && String(t).trim() !== '') return String(t).trim();
  const r = rag.rag_name;
  if (r != null && String(r).trim() !== '') return String(r).trim();
  return '';
}

function openRenameSelectedBank() {
  if (renameRagTabSaving.value) return;
  const rag = findRagByTabId(selectedBankTabId.value);
  const rid = rag?.rag_id;
  renameRagTabDraftRagId.value =
    rid != null && String(rid).trim() !== '' ? Number(rid) : null;
  renameRagTabInitialName.value =
    getRagTabNameForEdit(rag) || deriveRagName(rag) || selectedBankLabel.value;
  renameRagTabError.value = '';
  renameRagTabModalOpen.value = true;
}

async function onRenameRagTabSave(name) {
  if (!name) {
    renameRagTabError.value = '請輸入名稱';
    return;
  }
  const rid = renameRagTabDraftRagId.value;
  if (rid == null || !Number.isFinite(rid) || rid < 1) {
    renameRagTabError.value = `找不到此${QUIZ_BANK_NOUN}，請重新整理頁面後再試`;
    return;
  }
  renameRagTabSaving.value = true;
  renameRagTabError.value = '';
  try {
    await apiUpdateRagTabName(rid, name);
    const rag = findRagByTabId(selectedBankTabId.value);
    if (rag) {
      rag.tab_name = name;
    }
    selectedBankLabel.value = name;
    renameRagTabModalOpen.value = false;
  } catch (err) {
    renameRagTabError.value = err.message || '更新失敗';
  } finally {
    renameRagTabSaving.value = false;
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

onActivated(() => {
  if (viewMode.value === 'grid') {
    fetchRagList();
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
    :class="{ 'create-exam-bank-2--detail': viewMode === 'detail' }"
  >
    <!-- 九宮格題庫入口 -->
    <template v-if="viewMode === 'grid'">
      <header class="flex-shrink-0 my-bgcolor-gray-4 p-4">
        <div class="container-fluid px-0 text-center">
          <p class="my-font-xl-400 my-color-black text-break mb-0">建立測驗題庫</p>
        </div>
      </header>

      <div class="flex-grow-1 min-h-0 overflow-auto px-3 px-md-4 py-4 position-relative">
        <LoadingOverlay
          :is-visible="showGridLoadingOverlay"
          loading-text="載入中..."
        />

        <div class="bank-grid-wrap mx-auto">
          <div
            v-if="ragListError"
            class="my-alert-warning-soft my-font-sm-400 py-2 mb-3"
          >
            {{ ragListError }}
          </div>

          <div class="bank-grid" role="list">
            <button
              v-for="item in gridItems"
              :key="item.tabId"
              type="button"
              class="bank-grid-tile"
              role="listitem"
              @click="openBankDetail(item.tabId, item.label)"
            >
              <span
                v-if="item.isExam"
                class="bank-grid-tile__exam-dot rounded-circle d-inline-block my-bgcolor-green"
                title="試卷用題庫"
                aria-label="試卷用題庫"
              />
              <span class="bank-grid-tile__label my-font-md-400 my-color-black text-break">
                {{ item.label }}
              </span>
              <span
                v-if="item.subtitle"
                class="bank-grid-tile__subtitle my-font-sm-400 my-color-gray-1 text-break"
              >
                {{ item.subtitle }}
              </span>
            </button>

            <button
              type="button"
              class="bank-grid-tile bank-grid-tile--add"
              :disabled="createRagLoading"
              :aria-busy="createRagLoading"
              :aria-label="`新增${QUIZ_BANK_NOUN}`"
              @click="openNewBankUploadModal"
            >
              <span class="bank-grid-tile__icon bank-grid-tile__icon--add" aria-hidden="true">
                <i class="fa-solid fa-plus" />
              </span>
              <span class="bank-grid-tile__label my-font-md-400 my-color-gray-1">
                新增{{ QUIZ_BANK_NOUN }}
              </span>
            </button>
          </div>
        </div>
      </div>
    </template>

    <!-- 題庫內容（隱藏原頁分頁列） -->
    <template v-else>
      <LoadingOverlay
        :is-visible="deleteRagLoading"
        loading-text="刪除中..."
      />
      <header class="create-exam-bank-2-detail-bar flex-shrink-0 px-2 py-3 my-bgcolor-gray-4 border-bottom">
        <div class="create-exam-bank-2-detail-bar__start">
          <button
            type="button"
            class="btn rounded-pill d-inline-flex align-items-center gap-2 my-font-sm-400 my-color-gray-1 my-button-transparent-borderless px-3 py-1 flex-shrink-0"
            aria-label="返回主頁"
            :disabled="detailHeaderActionsDisabled"
            @click="backToGrid"
          >
            <i class="fa-solid fa-arrow-left" aria-hidden="true" />
            返回主頁
          </button>
        </div>
        <div class="create-exam-bank-2-detail-bar__center d-flex align-items-center justify-content-center gap-1 min-w-0">
          <p class="my-font-lg-400 my-color-black text-truncate mb-0 text-center">
            {{ selectedBankLabel }}
          </p>
          <button
            type="button"
            class="btn btn-link text-decoration-none my-tab-nav-action-btn my-color-gray-4 p-0 flex-shrink-0"
            title="重新命名分頁"
            aria-label="重新命名分頁"
            :disabled="detailHeaderActionsDisabled"
            @click="openRenameSelectedBank"
          >
            <i class="fa-solid fa-pen" aria-hidden="true" />
          </button>
          <div class="dropdown flex-shrink-0 create-exam-bank-2-bank-switch">
            <button
              type="button"
              class="btn rounded-circle d-flex justify-content-center align-items-center flex-shrink-0 my-font-md-400 my-color-gray-1 my-btn-outline-gray-1 my-btn-circle lh-1 dropdown-toggle my-dropdown-caret"
              data-bs-toggle="dropdown"
              aria-expanded="false"
              aria-label="切換題庫"
              :disabled="detailHeaderActionsDisabled"
            >
              <i class="fa-solid fa-chevron-down my-dropdown-toggle-caret" aria-hidden="true" />
            </button>
            <ul class="dropdown-menu dropdown-menu-end create-exam-bank-2-bank-switch-menu">
              <li v-if="gridItems.length === 0">
                <span class="dropdown-item my-font-md-400 my-color-gray-1 disabled">尚無題庫</span>
              </li>
              <li v-for="item in gridItems" :key="item.tabId">
                <button
                  type="button"
                  class="dropdown-item my-font-md-400 d-flex align-items-center gap-2"
                  :class="{ active: item.tabId === selectedBankTabId }"
                  @click="switchBankDetail(item.tabId, item.label)"
                >
                  <span
                    v-if="item.isExam"
                    class="rounded-circle d-inline-block flex-shrink-0 my-bgcolor-green"
                    style="width: 0.5rem; height: 0.5rem"
                    title="試卷用題庫"
                    aria-label="試卷用題庫"
                  />
                  <span class="text-truncate">{{ item.label }}</span>
                </button>
              </li>
            </ul>
          </div>
        </div>
        <div class="create-exam-bank-2-detail-bar__end">
          <button
            v-if="!selectedBankIsExam"
            type="button"
            class="btn rounded-pill d-inline-flex justify-content-center align-items-center my-font-md-400 my-pack-unit-delete-btn px-4 py-2"
            title="刪除此題庫"
            aria-label="刪除此題庫"
            :disabled="detailHeaderActionsDisabled"
            :aria-busy="deleteRagLoading"
            @click="openDeleteBankModal"
          >
            刪除此題庫
          </button>
        </div>
      </header>

      <CreateExamQuizBankPage
        :key="selectedBankTabId"
        :tab-id="tabId"
        class="create-exam-bank-2-embedded flex-grow-1 min-h-0"
      />
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
        <div class="modal-content border-0 my-bgcolor-gray-3 p-4 d-flex flex-column gap-3">
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
          <div class="modal-footer border-top-0 p-0 d-flex justify-content-end gap-2 w-100">
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

  <TabRenameModal
    v-model="renameRagTabModalOpen"
    :initial-name="renameRagTabInitialName"
    :saving="renameRagTabSaving"
    :error="renameRagTabError"
    title="修改名稱"
    @save="onRenameRagTabSave"
  />

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
.bank-grid-wrap {
  width: 100%;
}

.bank-grid {
  display: grid;
  grid-template-columns: repeat(1, minmax(0, 1fr));
  gap: 1rem;
}

@media (min-width: 768px) {
  .bank-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 992px) {
  .bank-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (min-width: 1200px) {
  .bank-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (min-width: 1400px) {
  .bank-grid {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }
}

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

.bank-grid-tile:focus-visible {
  outline: 2px solid var(--my-color-black, #000);
  outline-offset: 2px;
}

.bank-grid-tile--add {
  border-style: dashed;
  background: transparent;
}

.bank-grid-tile--add:hover:not(:disabled) {
  background: var(--my-color-gray-3, #f5f5f5);
}

.bank-grid-tile__exam-dot {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  width: 0.5rem;
  height: 0.5rem;
}

.bank-grid-tile__icon--add {
  font-size: 2rem;
  line-height: 1;
  color: var(--my-color-gray-1, #999);
}

.bank-grid-tile__label {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  width: 100%;
}

.bank-grid-tile__subtitle {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
  overflow: hidden;
  width: 100%;
}

.create-exam-bank-2-detail-bar {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 0.75rem;
  border-color: var(--my-color-gray-2, #e5e5e5) !important;
}

.create-exam-bank-2-detail-bar__start {
  justify-self: start;
  min-width: 0;
}

.create-exam-bank-2-detail-bar__center {
  justify-self: center;
  max-width: 100%;
}

.create-exam-bank-2-detail-bar__end {
  justify-self: end;
  min-width: 0;
}

.create-exam-bank-2-bank-switch-menu {
  min-width: 12rem;
  max-width: min(90vw, 20rem);
  max-height: min(60vh, 24rem);
  overflow-y: auto;
}

.create-exam-bank-2-detail-bar .my-pack-unit-delete-btn {
  color: var(--my-color-red);
  background-color: var(--my-color-white);
  border: none;
  text-decoration: none;
}

.create-exam-bank-2-detail-bar .my-pack-unit-delete-btn:hover,
.create-exam-bank-2-detail-bar .my-pack-unit-delete-btn:active:not(:disabled) {
  color: var(--my-color-red-hover);
  background-color: color-mix(in srgb, var(--my-color-red) 8%, var(--my-color-white));
}

.create-exam-bank-2-detail-bar .my-pack-unit-delete-btn:disabled {
  opacity: 0.55;
}

/* 嵌入原頁：隱藏「建立測驗題庫」標題列與分頁列 */
.create-exam-bank-2-embedded :deep(> header) {
  display: none;
}

.create-exam-bank-2-embedded :deep(.my-rag-tabs-bar) {
  display: none !important;
}
</style>
