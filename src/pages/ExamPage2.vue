<script setup>
/**
 * ExamPage2 - 測驗頁面（exam_2，九宮格入口版）
 *
 * 首屏以九宮格顯示各測驗；點方塊進入測驗內容（複用 ExamPage，隱藏分頁列）。
 * 不修改 ExamPage.vue。
 */
import { ref, computed, watch, onActivated } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/authStore.js';
import {
  API_BASE,
  API_EXAM_TESTS,
  API_CREATE_EXAM,
  API_EXAM_DELETE,
  isFrontendLocalHost,
} from '../constants/api.js';
import { getPersonId } from '../services/ragApi.js';
import { apiUpdateExamTabName } from '../services/examApi.js';
import { deriveRagNameFromTabId, generateTabId, normalizeExamListResponse } from '../utils/rag.js';
import { loggedFetch } from '../utils/loggedFetch.js';
import ExamPage from './ExamPage.vue';
import LoadingOverlay from '../components/LoadingOverlay.vue';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal.vue';

defineProps({
  tabId: { type: String, required: true },
});

const EXAM_TAB_UI_STORAGE_PREFIX = 'myquiz:examTabUI:v1:';
const EXAM_NOUN = '測驗';

const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();
const viewMode = ref('grid');
const selectedExamTabId = ref('');
const selectedExamLabel = ref('');

const examList = ref([]);
const examListLoading = ref(false);
const examListError = ref('');

const createExamLoading = ref(false);
const createExamError = ref('');

const renameTitleSaving = ref(false);
const examTitleBeforeEdit = ref('');

const deleteExamLoading = ref(false);
const deleteExamError = ref('');
const deleteExamModalOpen = ref(false);
const deleteExamModalMessage = ref('');

const gridItems = computed(() =>
  examList.value.map((exam) => {
    const tabId = getExamTabId(exam);
    return {
      tabId,
      label: getExamTabLabel(exam),
      subtitle: examSubtitle(exam),
    };
  }),
);

const showGridLoadingOverlay = computed(
  () => viewMode.value === 'grid' && examListLoading.value && gridItems.value.length === 0,
);

const detailHeaderActionsDisabled = computed(
  () => deleteExamLoading.value || renameTitleSaving.value || createExamLoading.value,
);

function isNotFoundLike(status, message) {
  const s = Number(status);
  const m = String(message ?? '').toLowerCase();
  return s === 404 || m.includes('not found') || m.includes('找不到');
}

function examTabUiStorageKey(personId) {
  return `${EXAM_TAB_UI_STORAGE_PREFIX}${String(personId ?? '').trim() || 'anon'}`;
}

function persistExamTabSelection(examTabId) {
  const personId = getPersonId(authStore);
  if (!personId || !examTabId) return;
  try {
    sessionStorage.setItem(
      examTabUiStorageKey(personId),
      JSON.stringify({ v: 1, exam_tab_id: String(examTabId), exam_slot_index: 0 }),
    );
  } catch {
    /* ignore */
  }
}

function getExamTabId(exam) {
  if (exam == null || typeof exam !== 'object') return '';
  return String(exam.exam_tab_id ?? exam.test_tab_id ?? exam.id ?? '');
}

function getExamTabLabel(exam) {
  if (exam == null) return EXAM_NOUN;
  if (typeof exam === 'string') return exam;
  const tabId = exam.exam_tab_id ?? exam.test_tab_id ?? exam.id ?? '';
  const raw = exam.tab_name ?? exam.exam_name ?? exam.test_name;
  const name = raw != null && String(raw).trim() !== '' ? String(raw).trim() : '';
  const fromTabId = deriveRagNameFromTabId(String(tabId));
  const created = exam.created_at ?? '';
  return name || fromTabId || String(tabId) || created || EXAM_NOUN;
}

function examSubtitle(exam) {
  if (!exam || typeof exam !== 'object') return '';
  const quizzes = exam.quizzes ?? exam.Quizzes ?? [];
  if (Array.isArray(quizzes) && quizzes.length > 0) return `${quizzes.length} 題`;
  const units = exam.units ?? exam.Units ?? [];
  if (Array.isArray(units) && units.length > 0) return `${units.length} 個單元`;
  return '';
}

function normalizeExamRow(row) {
  const label = row.tab_name ?? row.exam_name ?? row.test_name;
  return {
    ...row,
    exam_id: row.exam_id ?? row.test_id,
    exam_tab_id: row.exam_tab_id ?? row.test_tab_id,
    exam_name: label,
    test_id: row.exam_id ?? row.test_id,
    test_tab_id: row.exam_tab_id ?? row.test_tab_id,
    test_name: label,
  };
}

async function fetchExamList(opts = {}) {
  const silent = opts.silent === true;
  if (!silent) {
    examListLoading.value = true;
  }
  examListError.value = '';
  try {
    const personId = getPersonId(authStore);
    if (!personId) {
      examList.value = [];
      examListError.value = '請先登入以載入測驗列表';
      return;
    }
    if (authStore.currentCourse?.course_id == null) {
      examList.value = [];
      return;
    }
    const params = new URLSearchParams();
    params.set('person_id', personId);
    params.set('local', String(isFrontendLocalHost()));
    const url = `${API_BASE}${API_EXAM_TESTS}?${params}`;
    const res = await loggedFetch(url, {
      method: 'GET',
      headers: { 'X-Person-Id': personId },
    });
    if (!res.ok) {
      const text = await res.text();
      let msg = res.statusText;
      try {
        const err = JSON.parse(text);
        msg = err.detail ?? err.error ?? msg;
      } catch {
        if (text) msg = text;
      }
      if (isNotFoundLike(res.status, msg)) {
        examList.value = [];
        examListError.value = '';
        return;
      }
      throw new Error(msg);
    }
    const data = await res.json();
    examList.value = normalizeExamListResponse(data).map(normalizeExamRow);
  } catch (err) {
    examListError.value = err.message || '無法載入測驗列表';
    examList.value = [];
  } finally {
    if (!silent) {
      examListLoading.value = false;
    }
  }
}

function findExamByTabId(tabId) {
  const id = String(tabId ?? '').trim();
  if (!id) return null;
  return examList.value.find((e) => getExamTabId(e) === id) ?? null;
}

function applyRouteExamId() {
  const examId = String(route.params.exam_id ?? '').trim();
  if (!examId) {
    viewMode.value = 'grid';
    selectedExamTabId.value = '';
    selectedExamLabel.value = '';
    return;
  }
  const item = gridItems.value.find((i) => i.tabId === examId);
  const exam = findExamByTabId(examId);
  const label = item?.label ?? ((exam ? getExamTabLabel(exam) : '') || examId);
  persistExamTabSelection(examId);
  selectedExamTabId.value = examId;
  selectedExamLabel.value = label;
  viewMode.value = 'detail';
}

function openExamDetail(tabId, label) {
  const id = String(tabId ?? '').trim();
  if (!id) return;
  persistExamTabSelection(id);
  selectedExamTabId.value = id;
  selectedExamLabel.value = label || id;
  viewMode.value = 'detail';
  if (String(route.params.exam_id ?? '') !== id) {
    router.push(`/exam_2/${encodeURIComponent(id)}`);
  }
}

function switchExamDetail(tabId, label) {
  const id = String(tabId ?? '').trim();
  if (!id || id === String(selectedExamTabId.value ?? '')) return;
  persistExamTabSelection(id);
  selectedExamTabId.value = id;
  selectedExamLabel.value = label || id;
  if (String(route.params.exam_id ?? '') !== id) {
    router.push(`/exam_2/${encodeURIComponent(id)}`);
  }
}

function backToGrid() {
  viewMode.value = 'grid';
  selectedExamTabId.value = '';
  selectedExamLabel.value = '';
  fetchExamList();
  if (route.params.exam_id) {
    router.push('/exam_2');
  }
}

function onExamTitleFocus() {
  examTitleBeforeEdit.value = selectedExamLabel.value;
}

async function onExamTitleBlur() {
  if (renameTitleSaving.value) return;
  const name = String(selectedExamLabel.value ?? '').trim();
  if (!name) {
    selectedExamLabel.value = examTitleBeforeEdit.value;
    return;
  }
  selectedExamLabel.value = name;
  if (name === String(examTitleBeforeEdit.value ?? '').trim()) return;
  const exam = findExamByTabId(selectedExamTabId.value);
  const eid = exam?.exam_id ?? exam?.test_id;
  if (eid == null || !Number.isFinite(Number(eid)) || Number(eid) < 1) {
    selectedExamLabel.value = examTitleBeforeEdit.value;
    alert('找不到此試卷，請重新整理頁面後再試');
    return;
  }
  renameTitleSaving.value = true;
  try {
    await apiUpdateExamTabName(Number(eid), name);
    if (exam) {
      exam.tab_name = name;
      exam.exam_name = name;
      exam.test_name = name;
    }
    examTitleBeforeEdit.value = name;
    await fetchExamList({ silent: true });
  } catch (err) {
    selectedExamLabel.value = examTitleBeforeEdit.value;
    alert(err.message || '更新失敗');
  } finally {
    renameTitleSaving.value = false;
  }
}

async function addNewExam() {
  if (createExamLoading.value) return;
  const personId = getPersonId(authStore);
  if (!personId) {
    createExamError.value = '請先登入以建立測驗';
    return;
  }
  createExamError.value = '';
  createExamLoading.value = true;
  const examTabId = generateTabId(personId);
  const tabName = '未命名試卷';
  const local = isFrontendLocalHost();
  const params = new URLSearchParams({ person_id: personId });
  try {
    const res = await loggedFetch(`${API_BASE}${API_CREATE_EXAM}?${params.toString()}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        exam_tab_id: examTabId,
        person_id: personId,
        tab_name: tabName,
        local,
      }),
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      const msg = errBody.detail ? JSON.stringify(errBody.detail) : res.statusText;
      throw new Error(msg);
    }
    const data = await res.json();
    const tabIdVal =
      data?.exam_tab_id != null
        ? String(data.exam_tab_id)
        : data?.test_tab_id != null
          ? String(data.test_tab_id)
          : examTabId;
    const resolvedName = data.tab_name ?? data.exam_name ?? data.test_name ?? tabName;
    await fetchExamList({ silent: true });
    openExamDetail(tabIdVal, resolvedName);
  } catch (err) {
    createExamError.value = err.message || '建立測驗失敗';
  } finally {
    createExamLoading.value = false;
  }
}

function openDeleteExamModal() {
  if (deleteExamLoading.value) return;
  const tabId = String(selectedExamTabId.value ?? '').trim();
  if (!tabId) return;
  const exam = findExamByTabId(tabId);
  const label = exam ? getExamTabLabel(exam) : selectedExamLabel.value || tabId;
  deleteExamError.value = '';
  deleteExamModalMessage.value = `確定要刪除「${label}」嗎？`;
  deleteExamModalOpen.value = true;
}

async function confirmDeleteExam() {
  if (deleteExamLoading.value) return;
  const tabId = String(selectedExamTabId.value ?? '').trim();
  if (!tabId) return;
  deleteExamError.value = '';
  deleteExamLoading.value = true;
  try {
    const res = await loggedFetch(`${API_BASE}${API_EXAM_DELETE}/${encodeURIComponent(tabId)}`, {
      method: 'PUT',
    });
    if (!res.ok) {
      const text = await res.text();
      let msg = res.statusText;
      try {
        const err = JSON.parse(text);
        msg = err.detail ?? err.error ?? msg;
      } catch {
        if (text) msg = text;
      }
      throw new Error(msg);
    }
    deleteExamModalOpen.value = false;
    await fetchExamList({ silent: true });
    const remaining = gridItems.value;
    if (remaining.length === 0) {
      backToGrid();
      return;
    }
    const next = remaining[0];
    switchExamDetail(next.tabId, next.label);
  } catch (err) {
    deleteExamError.value = err.message || '刪除試卷失敗';
  } finally {
    deleteExamLoading.value = false;
  }
}

onActivated(async () => {
  const examId = String(route.params.exam_id ?? '').trim();
  if (examId) {
    await fetchExamList();
    applyRouteExamId();
    return;
  }
  if (viewMode.value === 'grid') {
    fetchExamList();
  }
});

watch(
  () => route.params.exam_id,
  async (examId) => {
    if (String(examId ?? '').trim()) {
      if (examList.value.length === 0 && !examListLoading.value) {
        await fetchExamList();
      }
      applyRouteExamId();
      return;
    }
    applyRouteExamId();
  },
);

watch(examList, () => {
  if (route.params.exam_id) {
    applyRouteExamId();
  }
});

watch(viewMode, (mode) => {
  if (mode === 'detail') {
    fetchExamList({ silent: true });
  }
});

watch(
  () => authStore.currentCourse?.course_id,
  () => {
    if (viewMode.value === 'grid') {
      fetchExamList();
    }
  },
);
</script>

<template>
  <div
    class="exam-2 d-flex flex-column h-100 overflow-hidden my-bgcolor-gray-4"
    :class="{ 'exam-2--detail': viewMode === 'detail' }"
  >
    <template v-if="viewMode === 'grid'">
      <header class="flex-shrink-0 my-bgcolor-gray-4 p-4">
        <div class="container-fluid px-0 text-center">
          <p class="my-font-xl-400 my-color-black text-break mb-0">測驗</p>
        </div>
      </header>

      <div class="flex-grow-1 min-h-0 overflow-auto px-3 px-md-4 py-4 position-relative">
        <LoadingOverlay
          :is-visible="showGridLoadingOverlay"
          loading-text="載入中..."
        />

        <div class="bank-grid-wrap mx-auto">
          <div
            v-if="examListError"
            class="my-alert-warning-soft my-font-sm-400 py-2 mb-3"
          >
            {{ examListError }}
          </div>
          <div
            v-if="createExamError"
            class="my-alert-danger-soft my-font-sm-400 py-2 mb-3"
          >
            {{ createExamError }}
          </div>

          <div class="bank-grid" role="list">
            <button
              v-for="item in gridItems"
              :key="item.tabId"
              type="button"
              class="bank-grid-tile"
              role="listitem"
              @click="openExamDetail(item.tabId, item.label)"
            >
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
              :disabled="createExamLoading"
              :aria-busy="createExamLoading"
              :aria-label="`新增${EXAM_NOUN}`"
              @click="addNewExam"
            >
              <span class="bank-grid-tile__icon bank-grid-tile__icon--add" aria-hidden="true">
                <i class="fa-solid fa-plus" />
              </span>
              <span class="bank-grid-tile__label my-font-md-400 my-color-gray-1">
                新增{{ EXAM_NOUN }}
              </span>
            </button>
          </div>
        </div>
      </div>
    </template>

    <template v-else>
      <LoadingOverlay
        :is-visible="deleteExamLoading"
        loading-text="刪除中..."
      />
      <header class="exam-2-detail-bar flex-shrink-0 px-2 py-3 my-bgcolor-gray-4 border-bottom">
        <div class="exam-2-detail-bar__start">
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
        <div class="exam-2-detail-bar__center min-w-0">
          <input
            v-model="selectedExamLabel"
            type="text"
            class="exam-2-detail-bar__title my-font-lg-400 my-color-black text-truncate mb-0 text-center w-100 px-3 py-2 rounded-2"
            maxlength="200"
            autocomplete="off"
            spellcheck="false"
            aria-label="試卷名稱"
            :disabled="detailHeaderActionsDisabled"
            @focus="onExamTitleFocus"
            @blur="onExamTitleBlur"
            @keydown.enter.prevent="$event.target.blur()"
          />
        </div>
        <div class="exam-2-detail-bar__end">
          <div class="dropdown flex-shrink-0 exam-2-exam-switch">
            <button
              type="button"
              class="btn rounded-circle d-flex justify-content-center align-items-center flex-shrink-0 my-font-md-400 my-color-gray-1 my-button-transparent-borderless exam-2-detail-bar__menu-btn lh-1 dropdown-toggle my-dropdown-caret"
              data-bs-toggle="dropdown"
              aria-expanded="false"
              aria-label="試卷選單"
              :disabled="detailHeaderActionsDisabled"
            >
              <i class="fa-solid fa-bars" aria-hidden="true" />
            </button>
            <ul class="dropdown-menu dropdown-menu-end exam-2-exam-switch-menu">
              <li v-if="gridItems.length === 0">
                <span class="dropdown-item disabled">尚無測驗</span>
              </li>
              <li v-for="item in gridItems" :key="item.tabId">
                <button
                  type="button"
                  class="dropdown-item"
                  :class="{ active: item.tabId === selectedExamTabId }"
                  @click="switchExamDetail(item.tabId, item.label)"
                >
                  {{ item.label }}
                </button>
              </li>
              <li>
                <hr class="dropdown-divider" />
              </li>
              <li>
                <button
                  type="button"
                  class="dropdown-item my-color-red"
                  :disabled="detailHeaderActionsDisabled"
                  :aria-busy="deleteExamLoading"
                  @click="openDeleteExamModal"
                >
                  刪除此試卷
                </button>
              </li>
            </ul>
          </div>
        </div>
      </header>

      <ExamPage
        :key="selectedExamTabId"
        :tab-id="tabId"
        class="exam-2-embedded flex-grow-1 min-h-0"
      />
    </template>
  </div>

  <ConfirmDeleteModal
    v-model="deleteExamModalOpen"
    title="刪除此試卷"
    :message="deleteExamModalMessage"
    :deleting="deleteExamLoading"
    :error="deleteExamError"
    @confirm="confirmDeleteExam"
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

.exam-2-detail-bar {
  display: grid;
  grid-template-columns: 1fr minmax(0, 50%) 1fr;
  align-items: center;
  gap: 0.75rem;
  border-color: var(--my-color-gray-2, #e5e5e5) !important;
  overflow: visible;
  position: relative;
  z-index: 30;
}

.exam-2.exam-2--detail {
  overflow: visible;
}

.exam-2-embedded {
  overflow: hidden;
}

.exam-2-detail-bar__start {
  justify-self: start;
  min-width: 0;
}

.exam-2-detail-bar__center {
  justify-self: stretch;
  width: 100%;
  min-width: 0;
}

.exam-2-detail-bar__title {
  display: block;
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

.exam-2-detail-bar__title:hover:not(:disabled),
.exam-2-detail-bar__title:focus:not(:disabled) {
  background-color: var(--my-color-gray-3, #f5f5f5);
}

.exam-2-detail-bar__title:focus {
  outline: none;
  box-shadow: none;
  border: none;
}

.exam-2-detail-bar__title:disabled {
  opacity: 1;
  color: var(--my-color-black, #000);
  background: transparent;
}

.exam-2-detail-bar__end {
  justify-self: end;
  min-width: 0;
}

.exam-2-detail-bar__menu-btn {
  width: 2.375rem;
  height: 2.375rem;
  min-width: 2.375rem;
  min-height: 2.375rem;
  padding: 0;
}

.exam-2-exam-switch-menu {
  min-width: 10rem;
  max-height: min(60vh, 24rem);
  overflow-x: hidden;
  overflow-y: auto;
}

.exam-2-exam-switch-menu > li {
  display: block;
  width: 100%;
}

.exam-2-exam-switch-menu .dropdown-item {
  width: 100%;
  white-space: nowrap;
}

.exam-2-embedded :deep(> header) {
  display: none;
}

.exam-2-embedded :deep(.my-rag-tabs-bar) {
  display: none !important;
}
</style>
