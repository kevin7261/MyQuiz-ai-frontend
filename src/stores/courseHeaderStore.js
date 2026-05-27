import { ref } from 'vue';
import { defineStore } from 'pinia';

/** 課程 header 下拉：create-exam-bank_3「所有題庫」、exam_3「所有試卷」由對應 Page2（_3 詳情）註冊 */
export const useCourseHeaderStore = defineStore('courseHeader', () => {
  const showBankSwitcher = ref(false);
  const gridItems = ref([]);
  const selectedBankTabId = ref('');
  const actionsDisabled = ref(false);
  const deleteRagLoading = ref(false);

  /** @type {((tabId: string, label: string) => void) | null} */
  let onSwitchBank = null;
  /** @type {(() => void) | null} */
  let onDeleteBank = null;

  function registerBankSwitcherHandlers({ onSwitch, onDelete }) {
    onSwitchBank = onSwitch ?? null;
    onDeleteBank = onDelete ?? null;
  }

  function setBankSwitcherVisible(visible, state = {}) {
    showBankSwitcher.value = visible;
    if (!visible) return;
    if (state.gridItems !== undefined) gridItems.value = state.gridItems;
    if (state.selectedBankTabId !== undefined) selectedBankTabId.value = state.selectedBankTabId;
    if (state.actionsDisabled !== undefined) actionsDisabled.value = state.actionsDisabled;
    if (state.deleteRagLoading !== undefined) deleteRagLoading.value = state.deleteRagLoading;
  }

  function updateBankSwitcherState(state = {}) {
    if (state.gridItems !== undefined) gridItems.value = state.gridItems;
    if (state.selectedBankTabId !== undefined) selectedBankTabId.value = state.selectedBankTabId;
    if (state.actionsDisabled !== undefined) actionsDisabled.value = state.actionsDisabled;
    if (state.deleteRagLoading !== undefined) deleteRagLoading.value = state.deleteRagLoading;
  }

  function switchBank(tabId, label) {
    onSwitchBank?.(tabId, label);
  }

  function deleteBank() {
    onDeleteBank?.();
  }

  function clearBankSwitcher() {
    showBankSwitcher.value = false;
    gridItems.value = [];
    selectedBankTabId.value = '';
    actionsDisabled.value = false;
    deleteRagLoading.value = false;
    onSwitchBank = null;
    onDeleteBank = null;
  }

  const showExamSwitcher = ref(false);
  const examGridItems = ref([]);
  const selectedExamTabId = ref('');
  const examActionsDisabled = ref(false);
  const deleteExamLoading = ref(false);

  /** @type {((tabId: string, label: string) => void) | null} */
  let onSwitchExam = null;
  /** @type {(() => void) | null} */
  let onDeleteExam = null;

  function registerExamSwitcherHandlers({ onSwitch, onDelete }) {
    onSwitchExam = onSwitch ?? null;
    onDeleteExam = onDelete ?? null;
  }

  function setExamSwitcherVisible(visible, state = {}) {
    showExamSwitcher.value = visible;
    if (!visible) return;
    if (state.gridItems !== undefined) examGridItems.value = state.gridItems;
    if (state.selectedExamTabId !== undefined) selectedExamTabId.value = state.selectedExamTabId;
    if (state.actionsDisabled !== undefined) examActionsDisabled.value = state.actionsDisabled;
    if (state.deleteExamLoading !== undefined) deleteExamLoading.value = state.deleteExamLoading;
  }

  function switchExam(tabId, label) {
    onSwitchExam?.(tabId, label);
  }

  function deleteExam() {
    onDeleteExam?.();
  }

  function clearExamSwitcher() {
    showExamSwitcher.value = false;
    examGridItems.value = [];
    selectedExamTabId.value = '';
    examActionsDisabled.value = false;
    deleteExamLoading.value = false;
    onSwitchExam = null;
    onDeleteExam = null;
  }

  return {
    showBankSwitcher,
    gridItems,
    selectedBankTabId,
    actionsDisabled,
    deleteRagLoading,
    registerBankSwitcherHandlers,
    setBankSwitcherVisible,
    updateBankSwitcherState,
    switchBank,
    deleteBank,
    clearBankSwitcher,
    showExamSwitcher,
    examGridItems,
    selectedExamTabId,
    examActionsDisabled,
    deleteExamLoading,
    registerExamSwitcherHandlers,
    setExamSwitcherVisible,
    switchExam,
    deleteExam,
    clearExamSwitcher,
  };
});
