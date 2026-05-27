<script setup>
/**
 * ExamPage2 - 測驗頁面（exam_2，九宮格入口版）
 *
 * 首屏以九宮格顯示各測驗；點方塊進入測驗內容（複用 ExamPage，隱藏分頁列）。
 * 不修改 ExamPage.vue。
 */
import { ref, computed, watch, onActivated, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/authStore.js';
import { useCourseHeaderStore } from '../stores/courseHeaderStore.js';
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
import ExamPage2DetailBar from '../components/ExamPage2DetailBar.vue';
import LoadingOverlay from '../components/LoadingOverlay.vue';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal.vue';
import MessageModal from '../components/MessageModal.vue';
import {
  persistExamTabSelection,
} from '../utils/examTabUiStorage.js';
import { useMessageModal } from '../composables/useMessageModal.js';

const props = defineProps({
  tabId: { type: String, required: true },
  /** 路由前綴，供 exam_2 / exam_3 共用 */
  routeBase: { type: String, default: '/exam_2' },
  /** true 時嵌入頁右側清單改顯示於左側（exam_3） */
  sidePanelOnLeft: { type: Boolean, default: false },
  /** true 時詳情路由為 /:exam_id/:exam_quiz_id（_3）；false 時為 /:exam_id（_2） */
  useExamDetailRoute: { type: Boolean, default: false },
});

const EXAM_NOUN = '測驗';

/** exam_3 grid 入口按鈕文案（exam_2 仍為「新增測驗」） */
const addExamEntryLabel = computed(() => (
  props.routeBase === '/exam_3' ? '新增試卷' : `新增${EXAM_NOUN}`
));

const authStore = useAuthStore();
const courseHeaderStore = useCourseHeaderStore();
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
messageModal.bindErrorRef(examListError, '無法載入列表', messageModalOpts);
messageModal.bindErrorRef(createExamError, '建立失敗', messageModalOpts);

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
  () => viewMode.value === 'grid' && (examListLoading.value || createExamLoading.value),
);

const gridLoadingOverlayText = computed(() => {
  if (createExamLoading.value) return '建立中...';
  if (examListLoading.value) return '載入中...';
  return '處理中...';
});

const showDetailLoadingOverlay = computed(
  () => deleteExamLoading.value || renameTitleSaving.value,
);

const detailLoadingOverlayText = computed(() => {
  if (deleteExamLoading.value) return '刪除中...';
  if (renameTitleSaving.value) return '儲存中...';
  return '處理中...';
});

const detailHeaderActionsDisabled = computed(
  () => deleteExamLoading.value || renameTitleSaving.value || createExamLoading.value,
);

function isNotFoundLike(status, message) {
  const s = Number(status);
  const m = String(message ?? '').toLowerCase();
  return s === 404 || m.includes('not found') || m.includes('找不到');
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
  const examId = routeExamIdFromParams.value;
  if (!examId) {
    viewMode.value = 'grid';
    selectedExamTabId.value = '';
    selectedExamLabel.value = '';
    return;
  }
  const item = gridItems.value.find((i) => i.tabId === examId);
  const exam = findExamByTabId(examId);
  const label = item?.label ?? ((exam ? getExamTabLabel(exam) : '') || examId);
  persistExamTabSelection(getPersonId(authStore), examId);
  selectedExamTabId.value = examId;
  selectedExamLabel.value = label;
  viewMode.value = 'detail';
}

const routeExamIdFromParams = computed(() => String(route.params.exam_id ?? '').trim());

const routeExamQuizIdFromParams = computed(() => {
  if (!props.useExamDetailRoute) return '';
  return String(route.params.exam_quiz_id ?? '').trim();
});

function examDetailPath(examTabId, examQuizId = '0') {
  const id = String(examTabId ?? '').trim();
  if (!id) return props.routeBase;
  if (props.useExamDetailRoute) {
    const qid = String(examQuizId ?? '0').trim() || '0';
    return `${props.routeBase}/${encodeURIComponent(id)}/${encodeURIComponent(qid)}`;
  }
  return `${props.routeBase}/${encodeURIComponent(id)}`;
}

function openExamDetail(tabId, label, examQuizId = '0') {
  const id = String(tabId ?? '').trim();
  if (!id) return;
  persistExamTabSelection(getPersonId(authStore), id);
  selectedExamTabId.value = id;
  selectedExamLabel.value = label || id;
  viewMode.value = 'detail';
  const target = examDetailPath(id, examQuizId);
  if (route.path !== target) {
    router.push(target);
  }
}

function switchExamDetail(tabId, label) {
  const id = String(tabId ?? '').trim();
  if (!id || id === String(selectedExamTabId.value ?? '')) return;
  persistExamTabSelection(getPersonId(authStore), id);
  selectedExamTabId.value = id;
  selectedExamLabel.value = label || id;
  const qid = props.useExamDetailRoute ? routeExamQuizIdFromParams.value || '0' : '';
  const target = examDetailPath(id, qid);
  if (route.path !== target) {
    router.push(target);
  }
}

function backToGrid() {
  viewMode.value = 'grid';
  selectedExamTabId.value = '';
  selectedExamLabel.value = '';
  fetchExamList();
  if (routeExamIdFromParams.value) {
    router.push(props.routeBase);
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

onMounted(() => {
  courseHeaderStore.clearBankSwitcher();
  courseHeaderStore.registerExamSwitcherHandlers({
    onSwitch: switchExamDetail,
    onDelete: openDeleteExamModal,
    onBackToHome: backToGrid,
  });
});

onUnmounted(() => {
  courseHeaderStore.clearExamSwitcher();
});

watch(
  () => [
    props.sidePanelOnLeft,
    viewMode.value,
    gridItems.value,
    selectedExamTabId.value,
    detailHeaderActionsDisabled.value,
    deleteExamLoading.value,
  ],
  () => {
    if (props.sidePanelOnLeft) {
      courseHeaderStore.setExamSwitcherVisible(true, {
        gridItems: gridItems.value,
        selectedExamTabId: selectedExamTabId.value,
        actionsDisabled: detailHeaderActionsDisabled.value,
        deleteExamLoading: deleteExamLoading.value,
      });
    } else {
      courseHeaderStore.setExamSwitcherVisible(false);
    }
  },
  { immediate: true },
);

onActivated(() => {
  bootstrapExamRoute();
});

onMounted(() => {
  bootstrapExamRoute();
});

async function bootstrapExamRoute() {
  const examId = routeExamIdFromParams.value;
  if (examId) {
    if (examList.value.length === 0 && !examListLoading.value) {
      await fetchExamList();
    }
    applyRouteExamId();
    return;
  }
  if (examList.value.length === 0 && !examListLoading.value) {
    fetchExamList();
  }
  applyRouteExamId();
}

watch(
  () => (props.useExamDetailRoute
    ? [route.params.exam_id, route.params.exam_quiz_id]
    : route.params.exam_id),
  async (params) => {
    const examId = props.useExamDetailRoute
      ? String(params?.[0] ?? '').trim()
      : String(params ?? '').trim();
    if (examId) {
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
  if (routeExamIdFromParams.value) {
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
    class="exam-2 d-flex flex-column h-100 overflow-hidden"
    :class="{
      'exam-2--detail': viewMode === 'detail',
      'exam-2--side-panel-left': sidePanelOnLeft,
      'my-bgcolor-white': sidePanelOnLeft,
      'my-bgcolor-gray-4': !sidePanelOnLeft,
    }"
  >
    <template v-if="viewMode === 'grid'">
      <div
        class="exam-2__grid-scroll flex-grow-1 min-h-0 overflow-auto px-3 px-md-4 py-4 position-relative d-flex flex-column"
        :class="{ 'exam-2__grid-scroll--scrollbar': sidePanelOnLeft }"
      >
        <LoadingOverlay
          :is-visible="showGridLoadingOverlay"
          :loading-text="gridLoadingOverlayText"
        />

        <!-- 清單為空：居中顯示大型新增按鈕 -->
        <div
          v-if="sortedItems.length === 0 && !examListLoading"
          class="flex-grow-1 d-flex justify-content-center align-items-center"
        >
          <button
            type="button"
            class="btn rounded-pill d-inline-flex align-items-center gap-2 my-font-lg-400 my-button-white px-4 py-3"
            :disabled="createExamLoading"
            :aria-busy="createExamLoading"
            @click="addNewExam"
          >
            <i class="fa-solid fa-plus" aria-hidden="true" />
            {{ addExamEntryLabel }}
          </button>
        </div>

        <!-- 有資料：顯示列表 -->
        <div v-else class="bank-list-wrap mx-auto">
          <!-- 新增按鈕列 -->
          <div class="bank-table-actions">
            <button
              type="button"
              class="btn rounded-pill d-inline-flex align-items-center gap-2 my-font-md-400 my-button-white px-4 py-2 flex-shrink-0"
              :disabled="createExamLoading"
              :aria-busy="createExamLoading"
              @click="addNewExam"
            >
              <i class="fa-solid fa-plus" aria-hidden="true" />
              {{ addExamEntryLabel }}
            </button>
          </div>

          <!-- 表頭：名稱排序 -->
          <div class="bank-table-header">
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
                @click="openExamDetail(item.tabId, item.label)"
              >
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

    <template v-else>
      <LoadingOverlay
        :is-visible="showDetailLoadingOverlay"
        :loading-text="detailLoadingOverlayText"
      />
      <ExamPage2DetailBar
        v-if="!sidePanelOnLeft"
        v-model:selected-exam-label="selectedExamLabel"
        :detail-header-actions-disabled="detailHeaderActionsDisabled"
        :grid-items="gridItems"
        :selected-exam-tab-id="selectedExamTabId"
        :delete-exam-loading="deleteExamLoading"
        @back="backToGrid"
        @switch-exam="switchExamDetail"
        @delete-exam="openDeleteExamModal"
        @title-focus="onExamTitleFocus"
        @title-blur="onExamTitleBlur"
      />

      <ExamPage
        :key="selectedExamTabId"
        :tab-id="tabId"
        :design-side-panel-on-left="sidePanelOnLeft"
        :route-detail-base="useExamDetailRoute ? routeBase : ''"
        :route-exam-quiz-id="routeExamQuizIdFromParams"
        :side-panel-delete-exam-disabled="detailHeaderActionsDisabled"
        :side-panel-delete-exam-loading="deleteExamLoading"
        class="exam-2-embedded flex-grow-1 min-h-0"
        @delete-exam="openDeleteExamModal"
      >
        <template v-if="sidePanelOnLeft" #side-panel-header>
          <ExamPage2DetailBar
            v-model:selected-exam-label="selectedExamLabel"
            :detail-header-actions-disabled="detailHeaderActionsDisabled"
            :grid-items="gridItems"
            :selected-exam-tab-id="selectedExamTabId"
            :delete-exam-loading="deleteExamLoading"
            in-side-panel
            @back="backToGrid"
            @switch-exam="switchExamDetail"
            @delete-exam="openDeleteExamModal"
            @title-focus="onExamTitleFocus"
            @title-blur="onExamTitleBlur"
          />
        </template>
      </ExamPage>
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
  <MessageModal
    v-model="messageModalOpen"
    :title="messageModalTitle"
    :message="messageModalMessage"
    :confirm-button-class="messageModalConfirmClass"
    @update:model-value="(v) => { if (!v) closeMessageModal(); else messageModalOpen = v; }"
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
}

.bank-table-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0 1.25rem 0.5rem;
}

.bank-table-sort-btn {
  color: var(--my-color-gray-1) !important;
  background-color: transparent !important;
  font-weight: var(--my-font-weight-regular);
  padding-left: 0 !important;
  padding-right: 0 !important;
}

.bank-table-sort-btn:hover:not(:disabled),
.bank-table-sort-btn:focus-visible:not(:disabled),
.bank-table-sort-btn:active:not(:disabled) {
  color: var(--my-color-black) !important;
  font-weight: var(--my-font-weight-semibold);
  background-color: transparent !important;
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

/* exam_3 白底主頁清單：hover 淺灰 */
.exam-2--side-panel-left .bank-list-row:hover:not(:disabled) {
  background-color: var(--my-color-gray-3);
}

.bank-list-row:focus-visible {
  outline: 2px solid var(--my-color-black, #000);
  outline-offset: -2px;
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

/* ── detail bar styles moved to ExamPage2DetailBar.vue ── */

.exam-2.exam-2--detail {
  overflow: visible;
}

.exam-2-embedded {
  overflow: hidden;
}

.exam-2--side-panel-left .exam-2__grid-scroll--scrollbar {
  scrollbar-width: thin;
  scrollbar-color: var(--my-scrollbar-thumb) var(--my-color-white);
}

.exam-2--side-panel-left .exam-2__grid-scroll--scrollbar::-webkit-scrollbar {
  width: var(--my-scrollbar-size);
  height: var(--my-scrollbar-size);
}

.exam-2--side-panel-left .exam-2__grid-scroll--scrollbar::-webkit-scrollbar-track {
  background: var(--my-color-white);
  border-radius: calc(var(--my-scrollbar-size) / 2);
}

.exam-2--side-panel-left .exam-2__grid-scroll--scrollbar::-webkit-scrollbar-thumb {
  background-color: var(--my-scrollbar-thumb);
  background-clip: padding-box;
  border: var(--my-scrollbar-thumb-inset) solid var(--my-color-white);
  border-radius: calc(var(--my-scrollbar-size) / 2 - var(--my-scrollbar-thumb-inset));
}

.exam-2--side-panel-left .exam-2__grid-scroll--scrollbar::-webkit-scrollbar-corner {
  background: var(--my-color-white);
}

.exam-2--side-panel-left .exam-2__grid-scroll--scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: var(--my-scrollbar-thumb-hover);
}

.exam-2-embedded :deep(> header) {
  display: none;
}

.exam-2-embedded :deep(.my-rag-tabs-bar) {
  display: none !important;
}

.exam-2-embedded :deep(button.btn.rounded-pill.px-3),
.exam-2-embedded :deep(button.btn.rounded-2.px-3) {
  padding-left: 1.5rem !important;
  padding-right: 1.5rem !important;
}

/* 出題規則（my-design-quiz-history-btn）和顯示／隱藏文本（my-button-transparent-borderless）維持 px-3 */
.exam-2--side-panel-left :deep(button.btn.rounded-pill.my-font-sm-400:not(.my-design-quiz-stem-history-btn):not(.my-design-quiz-history-btn):not(.my-button-transparent-borderless)),
.exam-2--side-panel-left :deep(button.btn.rounded-2.my-font-sm-400:not(.my-design-quiz-stem-history-btn):not(.my-design-quiz-history-btn):not(.my-button-transparent-borderless)) {
  padding-left: 0.5rem !important;
  padding-right: 0.5rem !important;
}

.exam-2--side-panel-left .exam-2-embedded :deep(button.btn.rounded-pill.my-font-sm-400:not(.my-design-quiz-stem-history-btn):not(.my-design-quiz-history-btn):not(.my-button-transparent-borderless)),
.exam-2--side-panel-left .exam-2-embedded :deep(button.btn.rounded-2.my-font-sm-400:not(.my-design-quiz-stem-history-btn):not(.my-design-quiz-history-btn):not(.my-button-transparent-borderless)) {
  padding-left: 0.5rem !important;
  padding-right: 0.5rem !important;
}

.exam-2--side-panel-left :deep(button.btn.my-design-quiz-stem-history-btn.rounded-pill.my-font-sm-400),
.exam-2--side-panel-left :deep(button.btn.my-design-quiz-stem-history-btn.rounded-2.my-font-sm-400),
.exam-2--side-panel-left .exam-2-embedded :deep(button.btn.my-design-quiz-stem-history-btn.rounded-pill.my-font-sm-400),
.exam-2--side-panel-left .exam-2-embedded :deep(button.btn.my-design-quiz-stem-history-btn.rounded-2.my-font-sm-400),
.exam-2--side-panel-left :deep(button.btn.my-design-quiz-history-btn.rounded-pill.my-font-sm-400),
.exam-2--side-panel-left :deep(button.btn.my-design-quiz-history-btn.rounded-2.my-font-sm-400),
.exam-2--side-panel-left .exam-2-embedded :deep(button.btn.my-design-quiz-history-btn.rounded-pill.my-font-sm-400),
.exam-2--side-panel-left .exam-2-embedded :deep(button.btn.my-design-quiz-history-btn.rounded-2.my-font-sm-400) {
  padding-left: 1rem !important;
  padding-right: 1rem !important;
}

.exam-2--side-panel-left.exam-2--detail,
.exam-2--side-panel-left.exam-2--detail .exam-2-embedded {
  background-color: var(--my-color-white) !important;
}

.exam-2--side-panel-left.exam-2--detail .exam-2-embedded :deep(.my-design--side-panel-left) {
  background-color: var(--my-color-white) !important;
}
</style>
