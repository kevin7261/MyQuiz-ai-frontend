/**
 * 建立測驗題庫（稿）— RAG 列表（僅示範資料，不呼叫 GET /rag/tabs）
 */
import { ref } from 'vue';
import { buildDesignRagList } from '../ragApiDesign.js';

export function useRagListDesign() {
  const ragList = ref(buildDesignRagList());
  const ragListLoading = ref(false);
  const ragListError = ref('');

  async function fetchRagList() {
    ragListLoading.value = false;
    ragListError.value = '';
    ragList.value = buildDesignRagList();
  }

  return { ragList, ragListLoading, ragListError, fetchRagList };
}
