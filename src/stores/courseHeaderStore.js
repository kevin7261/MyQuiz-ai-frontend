import { ref } from 'vue';
import { defineStore } from 'pinia';

/** 課程 header「所有題庫」下拉：由 CreateExamQuizBankPage2（_3 詳情）註冊狀態與操作 */
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
  };
});
