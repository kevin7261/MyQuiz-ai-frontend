/**
 * Pack 虛擬資料夾（rag_list）與 second_folders 拖曳、群組操作。
 */
import { computed, watch } from 'vue';
import { parsePackTasksList, serializePackTasksList } from '../utils/rag.js';

export function usePackTasks(currentState, fileMetadataToShow, packAndGenerateDisabled) {
  const secondFoldersFull = computed(() => {
    const folders = fileMetadataToShow.value?.second_folders ?? currentState.value.zipSecondFolders ?? [];
    return Array.isArray(folders) ? folders : [];
  });

  const ragListDisplayGroups = computed(() => {
    const list = currentState.value.packTasksList ?? [];
    if (list.length > 0) return list;
    if (secondFoldersFull.value.length > 0) return [[]];
    return [];
  });

  function onDragStartTag(e, folderName, fromRagList, groupIdx, tagIdx) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/json', JSON.stringify({
      folderName,
      fromRagList: !!fromRagList,
      groupIdx: fromRagList ? groupIdx : -1,
      tagIdx: fromRagList ? tagIdx : -1,
    }));
    e.dataTransfer.setData('text/plain', folderName);
  }

  function onDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    e.currentTarget?.classList?.add('bg-info-subtle', 'border-info');
  }

  function onDragLeave(e) {
    e.currentTarget?.classList?.remove('bg-info-subtle', 'border-info');
  }

  function onDropRagList(e, targetGroupIdx) {
    e.preventDefault();
    e.currentTarget?.classList?.remove('bg-info-subtle', 'border-info');
    if (packAndGenerateDisabled.value) return;
    let data;
    try {
      data = JSON.parse(e.dataTransfer.getData('application/json') || '{}');
    } catch (_) {
      data = { folderName: e.dataTransfer.getData('text/plain') || '', fromRagList: false };
    }
    const folderName = (data.folderName || '').trim();
    if (!folderName) return;
    const state = currentState.value;
    let list = [...(state.packTasksList || [])];
    if (data.fromRagList && data.groupIdx >= 0) {
      const g = list[data.groupIdx];
      if (Array.isArray(g)) {
        const next = g.filter((_, i) => i !== data.tagIdx);
        list[data.groupIdx] = next.length ? next : null;
      }
    }
    if (targetGroupIdx >= list.length) {
      for (let i = list.length; i <= targetGroupIdx; i++) list.push([]);
    }
    const target = list[targetGroupIdx];
    const arr = Array.isArray(target) ? [...target] : [];
    if (!arr.includes(folderName)) arr.push(folderName);
    list[targetGroupIdx] = arr;
    list = list.filter((g) => g != null && (Array.isArray(g) ? g.length > 0 : g));
    state.packTasksList = list;
  }

  function removeFromRagList(groupIdx, tagIdx) {
    const state = currentState.value;
    const list = [...(state.packTasksList || [])];
    const g = list[groupIdx];
    if (!Array.isArray(g)) return;
    const next = g.filter((_, i) => i !== tagIdx);
    list[groupIdx] = next.length ? next : null;
    state.packTasksList = list.filter((x) => x != null && (Array.isArray(x) ? x.length > 0 : x));
  }

  function removeRagListGroup(groupIdx) {
    const state = currentState.value;
    const list = [...(state.packTasksList || [])];
    list.splice(groupIdx, 1);
    state.packTasksList = list.filter((x) => x != null && (Array.isArray(x) ? x.length > 0 : x));
  }

  function addRagListGroup() {
    const state = currentState.value;
    state.packTasksList = [...(state.packTasksList || []), []];
  }

  function addAllSecondFoldersAsGroups() {
    const names = secondFoldersFull.value;
    if (!names.length) return;
    const state = currentState.value;
    const existing = state.packTasksList ?? [];
    const newGroups = names.map((name) => [name]);
    state.packTasksList = [...existing, ...newGroups];
  }

  watch(
    () => currentState.value.packTasks,
    (val) => {
      const parsed = parsePackTasksList(val);
      const current = currentState.value.packTasksList;
      if (JSON.stringify(parsed) !== JSON.stringify(current)) {
        currentState.value.packTasksList = parsed;
      }
    }
  );
  watch(
    () => currentState.value.packTasksList,
    (list) => {
      const serialized = serializePackTasksList(list);
      const current = currentState.value.packTasks;
      if (serialized !== current) {
        currentState.value.packTasks = serialized;
      }
    },
    { deep: true }
  );

  return {
    secondFoldersFull,
    ragListDisplayGroups,
    onDragStartTag,
    onDragOver,
    onDragLeave,
    onDropRagList,
    removeFromRagList,
    removeRagListGroup,
    addRagListGroup,
    addAllSecondFoldersAsGroups,
  };
}
