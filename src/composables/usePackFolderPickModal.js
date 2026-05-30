import { ref } from 'vue';

/**
 * 「設定單元」資料夾挑選 Modal 的本地狀態與操作。
 *
 * 自 CreateExamQuizBankDetailPage 抽出：開啟時以目前群組的資料夾清單為草稿，
 * 勾選／取消後按確認寫回。所有外部相依以參數注入（不在此存取元件其他狀態）：
 * @param {object} deps
 * @param {import('vue').Ref<boolean>} deps.packGroupsEditBlocked - 編輯鎖定時所有操作 no-op
 * @param {import('vue').Ref<string[][]>} deps.displayGroups - 各單元群組的資料夾清單（ragListDisplayGroups）
 * @param {(gi: number, folders: string[]) => void} deps.setFolderGroup - 確認時寫回指定群組
 */
export function usePackFolderPickModal({ packGroupsEditBlocked, displayGroups, setFolderGroup }) {
  const packFolderPickModalOpen = ref(false);
  const packFolderPickGroupIdx = ref(null);
  const packFolderPickDraft = ref([]);

  function openPackFolderPickModal(gi) {
    if (packGroupsEditBlocked.value) return;
    const i = Number(gi);
    if (!Number.isFinite(i) || i < 0) return;
    packFolderPickGroupIdx.value = i;
    packFolderPickDraft.value = [...(displayGroups.value[i] ?? [])];
    packFolderPickModalOpen.value = true;
  }

  function closePackFolderPickModal() {
    packFolderPickModalOpen.value = false;
    packFolderPickGroupIdx.value = null;
    packFolderPickDraft.value = [];
  }

  function isPackFolderPickDraftSelected(folderName) {
    return packFolderPickDraft.value.includes(folderName);
  }

  function togglePackFolderPickDraft(folderName) {
    if (packGroupsEditBlocked.value) return;
    const name = String(folderName ?? '').trim();
    if (!name) return;
    const draft = [...packFolderPickDraft.value];
    const idx = draft.indexOf(name);
    if (idx >= 0) draft.splice(idx, 1);
    else draft.push(name);
    packFolderPickDraft.value = draft;
  }

  function confirmPackFolderPick() {
    if (packGroupsEditBlocked.value) return;
    const gi = packFolderPickGroupIdx.value;
    if (gi == null || !Number.isFinite(gi) || gi < 0) return;
    setFolderGroup(gi, packFolderPickDraft.value);
    closePackFolderPickModal();
  }

  return {
    packFolderPickModalOpen,
    packFolderPickGroupIdx,
    packFolderPickDraft,
    openPackFolderPickModal,
    closePackFolderPickModal,
    isPackFolderPickDraftSelected,
    togglePackFolderPickDraft,
    confirmPackFolderPick,
  };
}
