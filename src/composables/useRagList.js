/**
 * RAG 列表：GET /rag/rags 與載入狀態。
 */
import { ref } from 'vue';
import { API_BASE } from '../constants/api.js';
import { normalizeRagListResponse } from '../utils/rag.js';

export function useRagList() {
  const ragList = ref([]);
  const ragListLoading = ref(false);
  const ragListError = ref('');

  async function fetchRagList() {
    ragListLoading.value = true;
    ragListError.value = '';
    try {
      const res = await fetch(`${API_BASE}/rag/rags`, { method: 'GET' });
      if (!res.ok) throw new Error(res.statusText);
      const data = await res.json();
      ragList.value = normalizeRagListResponse(data);
    } catch (err) {
      ragListError.value = err.message || '無法載入 RAG 列表';
      ragList.value = [];
    } finally {
      ragListLoading.value = false;
    }
  }

  return { ragList, ragListLoading, ragListError, fetchRagList };
}
