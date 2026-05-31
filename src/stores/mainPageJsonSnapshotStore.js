/**
 * 主畫面 JSON 快照（供左欄「JSON資料」按鈕；與詳細資訊 Modal 的 JSON 分頁同源）
 *
 * 由 ExamDetailPage、CreateExamQuizBankDetailPage 等以 watchEffect 註冊／卸載時清除。
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useMainPageJsonSnapshotStore = defineStore('mainPageJsonSnapshot', () => {
  /** @type {import('vue').Ref<unknown>} */
  const data = ref(null);
  const title = ref('JSON資料');

  const hasSnapshot = computed(() => data.value != null && typeof data.value === 'object');

  /**
   * @param {unknown} snapshot
   * @param {string} [modalTitle]
   */
  function setSnapshot(snapshot, modalTitle) {
    if (snapshot != null && typeof snapshot === 'object') {
      data.value = snapshot;
      title.value = modalTitle?.trim() ? modalTitle.trim() : 'JSON資料';
      return;
    }
    data.value = null;
    title.value = 'JSON資料';
  }

  function clearSnapshot() {
    data.value = null;
    title.value = 'JSON資料';
  }

  return {
    data,
    title,
    hasSnapshot,
    setSnapshot,
    clearSnapshot,
  };
});
