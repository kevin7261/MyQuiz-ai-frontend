import { ref, computed } from 'vue';

/**
 * 「設定單元」內容（逐字稿）編輯 Modal 的本地狀態與操作。
 *
 * 自 CreateExamQuizBankDetailPage 抽出。外部相依以參數注入，讀取時機與原本一致：
 * @param {object} deps
 * @param {import('vue').Ref<boolean>} deps.packGroupsEditBlocked - 編輯鎖定
 * @param {(gi: number) => boolean} deps.transcriptLoadedAt - 該單元逐字稿是否已載入
 * @param {(gi: number) => boolean} deps.transcriptBusy - 該單元逐字稿是否處理中
 * @param {(gi: number) => string} deps.transcriptTextAt - 取得該單元逐字稿文字
 * @param {(gi: number, text: string) => void} deps.setMarkdownAt - 寫回該單元 markdown
 */
export function useTranscriptEditModal({
  packGroupsEditBlocked,
  transcriptLoadedAt,
  transcriptBusy,
  transcriptTextAt,
  setMarkdownAt,
}) {
  const transcriptEditModalOpen = ref(false);
  const transcriptEditModalGi = ref(0);
  const transcriptEditModalDraft = ref('');

  const transcriptEditModalDisabled = computed(
    () =>
      packGroupsEditBlocked.value
      || !transcriptLoadedAt(transcriptEditModalGi.value)
      || transcriptBusy(transcriptEditModalGi.value),
  );

  function openTranscriptEditModal(gi) {
    if (
      packGroupsEditBlocked.value
      || !transcriptLoadedAt(gi)
      || transcriptBusy(gi)
    ) return;
    transcriptEditModalGi.value = gi;
    transcriptEditModalDraft.value = transcriptTextAt(gi);
    transcriptEditModalOpen.value = true;
  }

  function closeTranscriptEditModal() {
    transcriptEditModalOpen.value = false;
    transcriptEditModalDraft.value = '';
  }

  function applyTranscriptEditModal() {
    setMarkdownAt(transcriptEditModalGi.value, transcriptEditModalDraft.value);
    closeTranscriptEditModal();
  }

  return {
    transcriptEditModalOpen,
    transcriptEditModalGi,
    transcriptEditModalDraft,
    transcriptEditModalDisabled,
    openTranscriptEditModal,
    closeTranscriptEditModal,
    applyTranscriptEditModal,
  };
}
