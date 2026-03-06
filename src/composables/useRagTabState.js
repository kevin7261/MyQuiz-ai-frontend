/**
 * RAG 每個 tab 的狀態（tabStateMap、getTabState、currentState）。
 */
import { computed, reactive } from 'vue';
import { generateTabId, isNewTabId as checkIsNewTabId, DEFAULT_SYSTEM_INSTRUCTION } from '../utils/rag.js';

export function useRagTabState(activeTabId, newTabIds, ragList, authStore, options = {}) {
  const defaultSystemInstruction = options.defaultSystemInstruction ?? DEFAULT_SYSTEM_INSTRUCTION;
  const tabStateMap = reactive({});

  function getTabState(id) {
    if (!id) return getTabState(newTabIds.value[0] || ragList.value[0]?.rag_tab_id || 'new');
    if (!tabStateMap[id]) {
      const isNew = checkIsNewTabId(id);
      tabStateMap[id] = reactive({
        tabId: isNew ? generateTabId(authStore.user?.person_id) : id,
        uploadedZipFile: null,
        zipFileName: '',
        zipSecondFolders: [],
        zipResponseJson: null,
        zipLoading: false,
        zipError: '',
        zipTabId: isNew ? '' : id,
        packTasks: '',
        packTasksList: [],
        ragMetadata: '',
        withRag: true,
        packResponseJson: null,
        packLoading: false,
        packError: '',
        generateQuizTabId: '',
        generateQuizLoading: false,
        generateQuizError: '',
        generateQuizResponseJson: null,
        cardList: [],
        slotFormState: {},
        showQuizGeneratorBlock: false,
        quizSlotsCount: 0,
        forExamLoading: false,
        forExamError: '',
        systemInstruction: defaultSystemInstruction,
      });
    }
    return tabStateMap[id];
  }

  const currentState = computed(() => {
    const id = activeTabId.value;
    if (id) return getTabState(id);
    const firstNew = newTabIds.value[0];
    const firstRag = ragList.value[0];
    return getTabState(firstNew || (firstRag && (firstRag.rag_tab_id ?? firstRag.id ?? firstRag)) || 'new');
  });

  return { tabStateMap, getTabState, currentState, isNewTabId: checkIsNewTabId };
}
