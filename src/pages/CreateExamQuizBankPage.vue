<script setup>
/**
 * CreateExamQuizBankPage - 建立測驗題庫（/create-exam-bank，TopView 全寬版）
 *
 * 首屏以九宮格顯示各題庫；點方塊進入題庫內容（嵌入 CreateExamQuizBankDetailPage）。
 */
import { ref, computed, watch, onActivated, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/authStore.js';
import { useCourseHeaderStore } from '../stores/courseHeaderStore.js';
import { useRagList } from '../composables/useRagList.js';
import {
  getPersonId,
  apiCreateUploadZip,
  apiUpdateRagTabName,
  apiDeleteRag,
  is504OrNetworkError,
} from '../services/ragApi.js';
import { deriveRagName, generateTabId, ZIP_UPLOAD_DROP_PROMPT } from '../utils/rag.js';
import ZipUploadUnitTypeHints from '../components/ZipUploadUnitTypeHints.vue';
import DeleteButtonLabel from '../components/DeleteButtonLabel.vue';
import CreateExamQuizBankDetailPage from './CreateExamQuizBankDetailPage.vue';
import CreateExamQuizBankPage2DetailBar from '../components/CreateExamQuizBankPage2DetailBar.vue';
import LoadingOverlay from '../components/LoadingOverlay.vue';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal.vue';
import MessageModal from '../components/MessageModal.vue';
import { persistCreateBankRagTabSelection } from '../utils/createBankTabUiStorage.js';
import { useMessageModal } from '../composables/useMessageModal.js';

const props = defineProps({
  tabId: { type: String, required: true },
  /** 路由前綴（/create-exam-bank） */
  routeBase: { type: String, default: '/create-exam-bank' },
  /** true 時嵌入頁右側清單改顯示於左側 */
  sidePanelOnLeft: { type: Boolean, default: false },
  /** 詳情路由為 /:exam_id/:exam_quiz_id */
  useExamDetailRoute: { type: Boolean, default: true },
  design3: { type: Boolean, default: false },
});

const UPLOAD_ALLOWED_EXTENSIONS = ['.zip'];
const UPLOAD_ACCEPT_ATTR = UPLOAD_ALLOWED_EXTENSIONS.join(',');
const UPLOAD_MAX_FILE_BYTES = 50 * 1000 * 1000;
const QUIZ_BANK_NOUN = '測驗題庫';

const authStore = useAuthStore();
const courseHeaderStore = useCourseHeaderStore();
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

const messageModal = useMessageModal();
const {
  open: messageModalOpen,
  title: messageModalTitle,
  message: messageModalMessage,
  confirmButtonClass: messageModalConfirmClass,
  close: closeMessageModal,
} = messageModal;
const messageModalOpts = {
  confirmButtonClass: () => (props.sidePanelOnLeft ? 'my-button-white' : 'my-button-black'),
};
messageModal.bindErrorRef(ragListError, '無法載入列表', messageModalOpts);

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

function persistCreateBankTabSelection(ragTabId) {
  const personId = getPersonId(authStore);
  if (!personId || !ragTabId) return;
  persistCreateBankRagTabSelection(personId, ragTabId);
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

const routeBankIdFromParams = computed(() => {
  if (props.useExamDetailRoute) {
    return String(route.params.exam_id ?? '').trim();
  }
  return String(route.params.rag_id ?? '').trim();
});

const routeExamQuizIdFromParams = computed(() => {
  if (!props.useExamDetailRoute) return '';
  return String(route.params.exam_quiz_id ?? '').trim();
});

function bankDetailPath(bankTabId, examQuizId = '0') {
  const id = String(bankTabId ?? '').trim();
  if (!id) return props.routeBase;
  if (props.useExamDetailRoute) {
    const qid = String(examQuizId ?? '0').trim() || '0';
    return `${props.routeBase}/${encodeURIComponent(id)}/${encodeURIComponent(qid)}`;
  }
  return `${props.routeBase}/${encodeURIComponent(id)}`;
}

function applyRouteBankId() {
  const bankId = routeBankIdFromParams.value;
  if (!bankId) {
    viewMode.value = 'grid';
    selectedBankTabId.value = '';
    selectedBankLabel.value = '';
    return;
  }
  const item = gridItems.value.find((i) => i.tabId === bankId);
  const rag = findRagByTabId(bankId);
  const label = item?.label ?? ((rag ? deriveRagName(rag) : '') || bankId);
  persistCreateBankTabSelection(bankId);
  selectedBankTabId.value = bankId;
  selectedBankLabel.value = label;
  viewMode.value = 'detail';
}

function openBankDetail(tabId, label, examQuizId = '0') {
  const id = String(tabId ?? '').trim();
  if (!id) return;
  persistCreateBankTabSelection(id);
  selectedBankTabId.value = id;
  selectedBankLabel.value = label || id;
  viewMode.value = 'detail';
  const target = bankDetailPath(id, examQuizId);
  if (route.path !== target) {
    router.push(target);
  }
}

function switchBankDetail(tabId, label) {
  const id = String(tabId ?? '').trim();
  if (!id || id === String(selectedBankTabId.value ?? '')) return;
  persistCreateBankTabSelection(id);
  selectedBankTabId.value = id;
  selectedBankLabel.value = label || id;
  const qid = props.useExamDetailRoute ? routeExamQuizIdFromParams.value || '0' : '';
  const target = bankDetailPath(id, qid);
  if (route.path !== target) {
    router.push(target);
  }
}

function backToGrid() {
  viewMode.value = 'grid';
  selectedBankTabId.value = '';
  selectedBankLabel.value = '';
  fetchRagList();
  if (routeBankIdFromParams.value) {
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

function onNewBankUploadDropZoneClick() {
  if (createRagLoading.value || newBankUploadFileName.value) return;
  openNewBankUploadFileDialog();
}

function clearNewBankUploadFile(e) {
  e?.stopPropagation?.();
  e?.preventDefault?.();
  if (createRagLoading.value) return;
  setNewBankUploadFileFromFile(null);
  if (newBankUploadFileInputRef.value) {
    newBankUploadFileInputRef.value.value = '';
  }
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

onMounted(() => {
  courseHeaderStore.clearExamSwitcher();
  courseHeaderStore.registerBankSwitcherHandlers({
    onSwitch: switchBankDetail,
    onDelete: openDeleteBankModal,
    onBackToHome: backToGrid,
  });
});

onUnmounted(() => {
  courseHeaderStore.clearBankSwitcher();
});

watch(
  () => [
    props.sidePanelOnLeft,
    viewMode.value,
    gridItems.value,
    selectedBankTabId.value,
    detailHeaderActionsDisabled.value,
    deleteRagLoading.value,
  ],
  () => {
    if (props.sidePanelOnLeft && viewMode.value === 'detail') {
      courseHeaderStore.setBankSwitcherVisible(true, {
        gridItems: gridItems.value,
        selectedBankTabId: selectedBankTabId.value,
        actionsDisabled: detailHeaderActionsDisabled.value,
        deleteRagLoading: deleteRagLoading.value,
      });
    } else {
      courseHeaderStore.setBankSwitcherVisible(false);
    }
  },
  { immediate: true },
);

onActivated(() => {
  bootstrapBankRoute();
});

onMounted(() => {
  bootstrapBankRoute();
});

async function bootstrapBankRoute() {
  const bankId = routeBankIdFromParams.value;
  if (bankId) {
    if (ragList.value.length === 0 && !ragListLoading.value) {
      await fetchRagList();
    }
    applyRouteBankId();
    return;
  }
  if (ragList.value.length === 0 && !ragListLoading.value) {
    fetchRagList();
  }
  applyRouteBankId();
}

watch(
  () => (props.useExamDetailRoute
    ? [route.params.exam_id, route.params.exam_quiz_id]
    : route.params.rag_id),
  async (params) => {
    const bankId = props.useExamDetailRoute
      ? String(params?.[0] ?? '').trim()
      : String(params ?? '').trim();
    if (bankId) {
      if (ragList.value.length === 0 && !ragListLoading.value) {
        await fetchRagList();
      }
      applyRouteBankId();
      return;
    }
    applyRouteBankId();
  },
);

watch(ragList, () => {
  if (routeBankIdFromParams.value) {
    applyRouteBankId();
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
    class="create-exam-bank-2 d-flex flex-column h-100 overflow-hidden"
    :class="{
      'create-exam-bank-2--detail': viewMode === 'detail',
      'create-exam-bank-2--side-panel-left': sidePanelOnLeft,
      'my-bgcolor-white': sidePanelOnLeft,
      'my-bgcolor-gray-4': !sidePanelOnLeft,
    }"
  >
    <!-- 九宮格題庫入口 -->
    <template v-if="viewMode === 'grid'">
      <div
        class="create-exam-bank-2__grid-scroll flex-grow-1 min-h-0 overflow-auto px-3 px-md-4 py-4 position-relative d-flex flex-column"
        :class="{ 'create-exam-bank-2__grid-scroll--scrollbar': sidePanelOnLeft }"
      >
        <LoadingOverlay
          :is-visible="showGridLoadingOverlay"
          loading-text="載入中..."
        />

        <!-- 清單為空：居中顯示大型新增按鈕 -->
        <div
          v-if="sortedItems.length === 0 && !ragListLoading"
          class="flex-grow-1 d-flex justify-content-center align-items-center"
        >
          <button
            type="button"
            class="btn rounded-pill d-inline-flex align-items-center gap-2 my-font-lg-400 my-btn-lg px-5 py-3"
            :disabled="createRagLoading"
            :aria-busy="createRagLoading"
            @click="openNewBankUploadModal"
          >
            <i class="fa-solid fa-plus" aria-hidden="true" />
            新增{{ QUIZ_BANK_NOUN }}
          </button>
        </div>

        <!-- 有資料：顯示列表 -->
        <div v-else class="bank-list-wrap mx-auto">
          <!-- 新增按鈕：表格上方獨立列，靠表格右上 -->
          <div class="bank-table-actions">
            <button
              type="button"
              class="btn rounded-pill d-inline-flex align-items-center gap-2 my-font-md-400 my-button-white px-4 py-2 flex-shrink-0"
              :disabled="createRagLoading"
              :aria-busy="createRagLoading"
              @click="openNewBankUploadModal"
            >
              <i class="fa-solid fa-plus" aria-hidden="true" />
              新增{{ QUIZ_BANK_NOUN }}
            </button>
          </div>

          <!-- 表頭：名稱排序 -->
          <div class="bank-table-header">
            <span class="bank-table-header__dot-spacer" aria-hidden="true" />
            <button
              type="button"
              class="bank-table-sort-btn btn d-inline-flex align-items-center gap-2 my-font-sm-400 my-color-gray-1 my-button-transparent-borderless px-0 py-1 flex-shrink-0"
              :class="{ 'rounded-pill': !sidePanelOnLeft }"
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

      <CreateExamQuizBankDetailPage
        :key="selectedBankTabId"
        :tab-id="tabId"
        :design-side-panel-on-left="sidePanelOnLeft"
        :route-detail-base="useExamDetailRoute ? routeBase : ''"
        :route-exam-quiz-id="routeExamQuizIdFromParams"
        :side-panel-delete-bank-disabled="detailHeaderActionsDisabled"
        :side-panel-delete-rag-loading="deleteRagLoading"
        class="create-exam-bank-2-embedded flex-grow-1 min-h-0"
        @delete-bank="openDeleteBankModal"
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
      </CreateExamQuizBankDetailPage>
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
        <div class="modal-content border-0 my-bgcolor-white d-flex flex-column gap-3 p-4">
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
              class="my-zip-drop-zone text-center position-relative rounded-4 p-3"
              :class="{
                'my-zip-drop-zone-over': newBankUploadZipDragOver,
                'my-zip-drop-zone-has-file': !!newBankUploadFileName,
              }"
              @dragover="onNewBankUploadZipDragOver"
              @dragenter="onNewBankUploadZipDragOver"
              @dragleave="onNewBankUploadZipDragLeave"
              @drop="onNewBankUploadZipDrop"
              @click="onNewBankUploadDropZoneClick"
            >
              <template v-if="newBankUploadFileName">
                <div class="my-zip-drop-zone-selected">
                  <span class="my-zip-drop-zone-selected__name">{{ newBankUploadFileName }}</span>
                  <button
                    type="button"
                    class="btn rounded-pill d-inline-flex justify-content-center align-items-center gap-2 my-zip-drop-zone-selected__clear my-button-transparent-borderless px-3 py-1"
                    :disabled="createRagLoading"
                    @click.stop="clearNewBankUploadFile"
                  >
                    <DeleteButtonLabel label="刪除檔案" />
                  </button>
                </div>
              </template>
              <template v-else>
                <span class="my-zip-upload-drop-prompt my-color-gray-4">{{ ZIP_UPLOAD_DROP_PROMPT }}</span>
                <ZipUploadUnitTypeHints />
              </template>
            </div>
            <div
              v-if="newBankUploadError"
              class="my-color-red my-font-sm-400 mt-2 mb-0 text-break"
            >
              {{ newBankUploadError }}
            </div>
          </div>
          <div class="modal-footer border-top-0 d-flex justify-content-end gap-2 w-100 p-0">
            <button
              type="button"
              class="btn rounded-pill d-inline-flex justify-content-center align-items-center my-font-md-400 my-color-gray-4 my-button-transparent-borderless px-4 py-2"
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
  <MessageModal
    v-model="messageModalOpen"
    :title="messageModalTitle"
    :message="messageModalMessage"
    :confirm-button-class="messageModalConfirmClass"
    @update:model-value="(v) => { if (!v) closeMessageModal(); else messageModalOpen = v; }"
  />
</template>

<style scoped>
/* create-exam-bank_3 白底主頁清單：hover 淺灰（覆寫 common.css gray-3） */
.create-exam-bank-2--side-panel-left .bank-list-row:hover:not(:disabled) {
  background-color: var(--my-color-gray-4);
}


.create-exam-bank-2.create-exam-bank-2--detail {
  overflow: visible;
}

.create-exam-bank-2-embedded {
  overflow: hidden;
}

/* 嵌入原頁：隱藏「建立測驗題庫」標題列與分頁列 */
.create-exam-bank-2-embedded :deep(> header) {
  display: none;
}

.create-exam-bank-2-embedded :deep(.my-rag-tabs-bar) {
  display: none !important;
}

/* 嵌入原頁：子元件 pill 若仍為 px-3，與九宮格版一致改為 px-4（類型／加入資料夾 picker 除外） */
.create-exam-bank-2-embedded :deep(button.btn.rounded-pill.px-3:not(.my-pack-unit-type-btn):not(.my-pack-unit-add-folder-btn)),
.create-exam-bank-2-embedded :deep(button.btn.rounded-2.px-3:not(.my-pack-unit-type-btn):not(.my-pack-unit-add-folder-btn)) {
  padding-left: 1.5rem !important;
  padding-right: 1.5rem !important;
}

/* create-exam-bank_3：小 pill 按鈕 px-2（覆寫上方 px-4）；類型／加入資料夾 picker 除外 */
.create-exam-bank-2--side-panel-left :deep(button.btn.rounded-pill.my-font-sm-400:not(.my-design-quiz-stem-history-btn):not(.my-pack-unit-type-btn):not(.my-pack-unit-add-folder-btn)),
.create-exam-bank-2--side-panel-left :deep(button.btn.rounded-2.my-font-sm-400:not(.my-design-quiz-stem-history-btn):not(.my-pack-unit-type-btn):not(.my-pack-unit-add-folder-btn)) {
  padding-left: 0.5rem !important;
  padding-right: 0.5rem !important;
}

.create-exam-bank-2--side-panel-left .create-exam-bank-2-embedded :deep(button.btn.rounded-pill.my-font-sm-400:not(.my-design-quiz-stem-history-btn):not(.my-pack-unit-type-btn):not(.my-pack-unit-add-folder-btn)),
.create-exam-bank-2--side-panel-left .create-exam-bank-2-embedded :deep(button.btn.rounded-2.my-font-sm-400:not(.my-design-quiz-stem-history-btn):not(.my-pack-unit-type-btn):not(.my-pack-unit-add-folder-btn)) {
  padding-left: 0.5rem !important;
  padding-right: 0.5rem !important;
}

/* create-exam-bank_3：詳細資訊等 stem history、設定單元類型／加入資料夾 pill 維持 px-3 */
.create-exam-bank-2--side-panel-left :deep(button.btn.my-design-quiz-stem-history-btn.rounded-pill.my-font-sm-400),
.create-exam-bank-2--side-panel-left :deep(button.btn.my-design-quiz-stem-history-btn.rounded-2.my-font-sm-400),
.create-exam-bank-2--side-panel-left :deep(button.btn.my-pack-unit-type-btn.rounded-pill.my-font-sm-400),
.create-exam-bank-2--side-panel-left :deep(button.btn.my-pack-unit-add-folder-btn.rounded-pill.my-font-sm-400),
.create-exam-bank-2--side-panel-left .create-exam-bank-2-embedded :deep(button.btn.my-design-quiz-stem-history-btn.rounded-pill.my-font-sm-400),
.create-exam-bank-2--side-panel-left .create-exam-bank-2-embedded :deep(button.btn.my-design-quiz-stem-history-btn.rounded-2.my-font-sm-400),
.create-exam-bank-2--side-panel-left .create-exam-bank-2-embedded :deep(button.btn.my-pack-unit-type-btn.rounded-pill.my-font-sm-400),
.create-exam-bank-2--side-panel-left .create-exam-bank-2-embedded :deep(button.btn.my-pack-unit-add-folder-btn.rounded-pill.my-font-sm-400) {
  padding-left: 1rem !important;
  padding-right: 1rem !important;
}

.create-exam-bank-2--side-panel-left.create-exam-bank-2--detail,
.create-exam-bank-2--side-panel-left.create-exam-bank-2--detail .create-exam-bank-2-embedded {
  background-color: var(--my-color-white) !important;
}

.create-exam-bank-2--side-panel-left.create-exam-bank-2--detail .create-exam-bank-2-embedded :deep(.my-design--side-panel-left) {
  background-color: var(--my-color-white) !important;
}

/* 嵌入頁「類型」picker：強制 px-3 ＋ icon 同色（蓋過上方小 pill px-2） */
.create-exam-bank-2--side-panel-left .create-exam-bank-2-embedded :deep(.my-pack-unit-type-segment .btn.my-pack-unit-type-btn.rounded-pill) {
  padding-left: 1rem !important;
  padding-right: 1rem !important;
}
.create-exam-bank-2--side-panel-left .create-exam-bank-2-embedded :deep(.my-pack-unit-type-segment .btn.my-pack-unit-type-btn .my-pack-unit-type-icon),
.create-exam-bank-2--side-panel-left .create-exam-bank-2-embedded :deep(.my-pack-unit-type-segment .btn.my-pack-unit-type-btn .my-pack-unit-type-icon::before) {
  color: inherit !important;
}
</style>
