/**
 * Pack 虛擬資料夾（POST /rag/tab/build-rag-zip 的 unit_list）Composable
 *
 * 職責：
 * - 從 currentState 與 fileMetadataToShow 衍生 secondFoldersFull、ragListDisplayGroups
 * - 拖曳事件：以模組層級變數儲存 payload，避免 dataTransfer 跨瀏覽器問題
 * - 群組操作：removeFromRagList、removeRagListGroup、addRagListGroup、clearAllRagListGroups、addAllSecondFoldersAsGroups、setAllSecondFoldersAsSingleGroup（追加含全部單元之一群組）；packChunkSizes／packChunkOverlaps 與群組序對齊
 * - 以 watch 同步 packTasks 字串與 packTasksList 陣列
 */
import { computed, watch } from 'vue';
import {
  parsePackTasksList,
  remapPackUnitTypes,
  remapPackParallelNumbers,
  remapPackParallelStrings,
  remapPackParallelBools,
  serializePackTasksList,
  UNIT_TYPE_RAG,
  DEFAULT_PACK_CHUNK_SIZE,
  DEFAULT_PACK_CHUNK_OVERLAP,
} from '../utils/rag.js';

/** 模組層級：拖曳中攜帶的資料，不依賴 dataTransfer */
let dragPayload = null;

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
    dragPayload = {
      folderName: String(folderName || '').trim(),
      fromRagList: !!fromRagList,
      groupIdx: fromRagList ? groupIdx : -1,
      tagIdx: fromRagList ? tagIdx : -1,
    };
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', dragPayload.folderName);
    e.dataTransfer.setData('text', dragPayload.folderName);
  }

  function onDragEndTag() {
    dragPayload = null;
  }

  function onDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    const el = e.currentTarget;
    if (el && !el.classList.contains('my-pack-drop-active')) {
      el.classList.add('my-pack-drop-active');
    }
  }

  function onDragEnter(e) {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    const el = e.currentTarget;
    if (el && !el.classList.contains('my-pack-drop-active')) {
      el.classList.add('my-pack-drop-active');
    }
  }

  function onDragLeave(e) {
    const el = e.currentTarget;
    const related = e.relatedTarget;
    if (el && related && el.contains(related)) return;
    if (el) el.classList.remove('my-pack-drop-active');
  }

  function onDropRagList(e, targetGroupIdx) {
    e.preventDefault();
    e.stopPropagation();
    const el = e.currentTarget;
    if (el) el.classList.remove('my-pack-drop-active');
    if (packAndGenerateDisabled.value) return;

    const payload = dragPayload;
    dragPayload = null;

    let folderName = '';
    if (payload && payload.folderName) {
      folderName = payload.folderName;
    } else if (e.dataTransfer) {
      folderName = (e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('text') || '').trim();
    }

    if (!folderName) return;

    const fromRagList = payload?.fromRagList ?? false;
    const groupIdx = payload?.groupIdx ?? -1;
    const tagIdx = payload?.tagIdx ?? -1;

    const state = currentState.value;
    const prevList = JSON.parse(JSON.stringify(state.packTasksList || []));
    const prevTypes = [...(state.packUnitTypes || [])];
    const prevChunkSizes = [...(state.packChunkSizes || [])];
    const prevChunkOverlaps = [...(state.packChunkOverlaps || [])];
    const prevUnitNames = [...(state.packUnitNames || [])];
    const prevMd = [...(state.packUnitMarkdownTexts || [])];
    const prevYu = [...(state.packUnitYoutubeUrls || [])];
    const prevMp3 = [...(state.packUnitMp3PreviewUrls || [])];
    const prevErr = [...(state.packUnitTranscriptError || [])];
    const prevLoad = [...(state.packUnitTranscriptLoading || [])];
    const prevLoaded = [...(state.packUnitTranscriptLoaded || [])];
    let list = [...(state.packTasksList || [])];

    if (fromRagList && groupIdx >= 0) {
      const g = list[groupIdx];
      if (Array.isArray(g)) {
        const next = g.filter((_, i) => i !== tagIdx);
        list[groupIdx] = next.length ? next : null;
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
    state.packUnitTypes = remapPackUnitTypes(prevList, prevTypes, list);
    state.packChunkSizes = remapPackParallelNumbers(prevList, prevChunkSizes, list, DEFAULT_PACK_CHUNK_SIZE);
    state.packChunkOverlaps = remapPackParallelNumbers(prevList, prevChunkOverlaps, list, DEFAULT_PACK_CHUNK_OVERLAP);
    state.packUnitNames = remapPackParallelStrings(prevList, prevUnitNames, list, '');
    state.packUnitMarkdownTexts = remapPackParallelStrings(prevList, prevMd, list, '');
    state.packUnitYoutubeUrls = remapPackParallelStrings(prevList, prevYu, list, '');
    state.packUnitMp3PreviewUrls = remapPackParallelStrings(prevList, prevMp3, list, '');
    state.packUnitTranscriptError = remapPackParallelStrings(prevList, prevErr, list, '');
    state.packUnitTranscriptLoading = remapPackParallelBools(prevList, prevLoad, list);
    state.packUnitTranscriptLoaded = remapPackParallelBools(prevList, prevLoaded, list);
  }

  function removeFromRagList(groupIdx, tagIdx) {
    const state = currentState.value;
    const prevList = JSON.parse(JSON.stringify(state.packTasksList || []));
    const prevTypes = [...(state.packUnitTypes || [])];
    const prevChunkSizes = [...(state.packChunkSizes || [])];
    const prevChunkOverlaps = [...(state.packChunkOverlaps || [])];
    const prevUnitNames = [...(state.packUnitNames || [])];
    const prevMd = [...(state.packUnitMarkdownTexts || [])];
    const prevYu = [...(state.packUnitYoutubeUrls || [])];
    const prevMp3 = [...(state.packUnitMp3PreviewUrls || [])];
    const prevErr = [...(state.packUnitTranscriptError || [])];
    const prevLoad = [...(state.packUnitTranscriptLoading || [])];
    const prevLoaded = [...(state.packUnitTranscriptLoaded || [])];
    const list = [...(state.packTasksList || [])];
    const g = list[groupIdx];
    if (!Array.isArray(g)) return;
    const next = g.filter((_, i) => i !== tagIdx);
    list[groupIdx] = next.length ? next : null;
    const nextList = list.filter((x) => x != null && (Array.isArray(x) ? x.length > 0 : x));
    state.packTasksList = nextList;
    state.packUnitTypes = remapPackUnitTypes(prevList, prevTypes, nextList);
    state.packChunkSizes = remapPackParallelNumbers(prevList, prevChunkSizes, nextList, DEFAULT_PACK_CHUNK_SIZE);
    state.packChunkOverlaps = remapPackParallelNumbers(prevList, prevChunkOverlaps, nextList, DEFAULT_PACK_CHUNK_OVERLAP);
    state.packUnitNames = remapPackParallelStrings(prevList, prevUnitNames, nextList, '');
    state.packUnitMarkdownTexts = remapPackParallelStrings(prevList, prevMd, nextList, '');
    state.packUnitYoutubeUrls = remapPackParallelStrings(prevList, prevYu, nextList, '');
    state.packUnitMp3PreviewUrls = remapPackParallelStrings(prevList, prevMp3, nextList, '');
    state.packUnitTranscriptError = remapPackParallelStrings(prevList, prevErr, nextList, '');
    state.packUnitTranscriptLoading = remapPackParallelBools(prevList, prevLoad, nextList);
    state.packUnitTranscriptLoaded = remapPackParallelBools(prevList, prevLoaded, nextList);
  }

  function removeRagListGroup(groupIdx) {
    const state = currentState.value;
    const list = [...(state.packTasksList || [])];
    const types = [...(state.packUnitTypes || [])];
    while (types.length < list.length) types.push(UNIT_TYPE_RAG);
    const sizes = [...(state.packChunkSizes || [])];
    const overs = [...(state.packChunkOverlaps || [])];
    const names = [...(state.packUnitNames || [])];
    const md = [...(state.packUnitMarkdownTexts || [])];
    const yu = [...(state.packUnitYoutubeUrls || [])];
    const mp3 = [...(state.packUnitMp3PreviewUrls || [])];
    const loading = [...(state.packUnitTranscriptLoading || [])];
    const loaded = [...(state.packUnitTranscriptLoaded || [])];
    const err = [...(state.packUnitTranscriptError || [])];
    while (sizes.length < list.length) sizes.push(DEFAULT_PACK_CHUNK_SIZE);
    while (overs.length < list.length) overs.push(DEFAULT_PACK_CHUNK_OVERLAP);
    while (names.length < list.length) names.push('');
    while (md.length < list.length) md.push('');
    while (yu.length < list.length) yu.push('');
    while (mp3.length < list.length) mp3.push('');
    while (loading.length < list.length) loading.push(false);
    while (loaded.length < list.length) loaded.push(false);
    while (err.length < list.length) err.push('');
    list.splice(groupIdx, 1);
    types.splice(groupIdx, 1);
    sizes.splice(groupIdx, 1);
    overs.splice(groupIdx, 1);
    names.splice(groupIdx, 1);
    md.splice(groupIdx, 1);
    yu.splice(groupIdx, 1);
    mp3.splice(groupIdx, 1);
    loading.splice(groupIdx, 1);
    loaded.splice(groupIdx, 1);
    err.splice(groupIdx, 1);
    state.packTasksList = list.filter((x) => x != null && (Array.isArray(x) ? x.length > 0 : x));
    state.packUnitTypes = types;
    state.packChunkSizes = sizes;
    state.packChunkOverlaps = overs;
    state.packUnitNames = names;
    state.packUnitMarkdownTexts = md;
    state.packUnitYoutubeUrls = yu;
    state.packUnitMp3PreviewUrls = mp3;
    state.packUnitTranscriptLoading = loading;
    state.packUnitTranscriptLoaded = loaded;
    state.packUnitTranscriptError = err;
  }

  function addRagListGroup() {
    const state = currentState.value;
    state.packTasksList = [...(state.packTasksList || []), []];
    state.packUnitTypes = [...(state.packUnitTypes || []), UNIT_TYPE_RAG];
    state.packChunkSizes = [...(state.packChunkSizes || []), DEFAULT_PACK_CHUNK_SIZE];
    state.packChunkOverlaps = [...(state.packChunkOverlaps || []), DEFAULT_PACK_CHUNK_OVERLAP];
    state.packUnitNames = [...(state.packUnitNames || []), ''];
    state.packUnitMarkdownTexts = [...(state.packUnitMarkdownTexts || []), ''];
    state.packUnitYoutubeUrls = [...(state.packUnitYoutubeUrls || []), ''];
    state.packUnitMp3PreviewUrls = [...(state.packUnitMp3PreviewUrls || []), ''];
    state.packUnitTranscriptLoading = [...(state.packUnitTranscriptLoading || []), false];
    state.packUnitTranscriptLoaded = [...(state.packUnitTranscriptLoaded || []), false];
    state.packUnitTranscriptError = [...(state.packUnitTranscriptError || []), ''];
  }

  function clearAllRagListGroups() {
    if (packAndGenerateDisabled.value) return;
    currentState.value.packTasksList = [];
    currentState.value.packUnitTypes = [];
    currentState.value.packChunkSizes = [];
    currentState.value.packChunkOverlaps = [];
    currentState.value.packUnitNames = [];
    currentState.value.packUnitMarkdownTexts = [];
    currentState.value.packUnitYoutubeUrls = [];
    currentState.value.packUnitMp3PreviewUrls = [];
    currentState.value.packUnitTranscriptLoading = [];
    currentState.value.packUnitTranscriptLoaded = [];
    currentState.value.packUnitTranscriptError = [];
  }

  function addAllSecondFoldersAsGroups() {
    const names = secondFoldersFull.value;
    if (!names.length) return;
    const state = currentState.value;
    const existing = state.packTasksList ?? [];
    const newGroups = names.map((name) => [name]);
    state.packTasksList = [...existing, ...newGroups];
    state.packUnitTypes = [...(state.packUnitTypes || []), ...names.map(() => UNIT_TYPE_RAG)];
    state.packChunkSizes = [...(state.packChunkSizes || []), ...names.map(() => DEFAULT_PACK_CHUNK_SIZE)];
    state.packChunkOverlaps = [...(state.packChunkOverlaps || []), ...names.map(() => DEFAULT_PACK_CHUNK_OVERLAP)];
    state.packUnitNames = [...(state.packUnitNames || []), ...names.map(() => '')];
    state.packUnitMarkdownTexts = [...(state.packUnitMarkdownTexts || []), ...names.map(() => '')];
    state.packUnitYoutubeUrls = [...(state.packUnitYoutubeUrls || []), ...names.map(() => '')];
    state.packUnitMp3PreviewUrls = [...(state.packUnitMp3PreviewUrls || []), ...names.map(() => '')];
    state.packUnitTranscriptLoading = [...(state.packUnitTranscriptLoading || []), ...names.map(() => false)];
    state.packUnitTranscriptLoaded = [...(state.packUnitTranscriptLoaded || []), ...names.map(() => false)];
    state.packUnitTranscriptError = [...(state.packUnitTranscriptError || []), ...names.map(() => '')];
  }

  /** 在現有出題單元之後新增一個出題單元，內含全部單元（unit_list：a+b+c），不覆寫既有出題單元 */
  function setAllSecondFoldersAsSingleGroup() {
    const names = secondFoldersFull.value;
    if (!names.length) return;
    const state = currentState.value;
    const existing = state.packTasksList ?? [];
    state.packTasksList = [...existing, [...names]];
    state.packUnitTypes = [...(state.packUnitTypes || []), UNIT_TYPE_RAG];
    state.packChunkSizes = [...(state.packChunkSizes || []), DEFAULT_PACK_CHUNK_SIZE];
    state.packChunkOverlaps = [...(state.packChunkOverlaps || []), DEFAULT_PACK_CHUNK_OVERLAP];
    state.packUnitNames = [...(state.packUnitNames || []), ''];
    state.packUnitMarkdownTexts = [...(state.packUnitMarkdownTexts || []), ''];
    state.packUnitYoutubeUrls = [...(state.packUnitYoutubeUrls || []), ''];
    state.packUnitMp3PreviewUrls = [...(state.packUnitMp3PreviewUrls || []), ''];
    state.packUnitTranscriptLoading = [...(state.packUnitTranscriptLoading || []), false];
    state.packUnitTranscriptLoaded = [...(state.packUnitTranscriptLoaded || []), false];
    state.packUnitTranscriptError = [...(state.packUnitTranscriptError || []), ''];
  }

  watch(
    () => currentState.value.packTasks,
    (val) => {
      const state = currentState.value;
      const parsed = parsePackTasksList(val);
      const current = state.packTasksList;
      if (JSON.stringify(parsed) === JSON.stringify(current)) return;

      const prevList = JSON.parse(JSON.stringify(current || []));
      const prevTypes = [...(state.packUnitTypes || [])];
      const prevSizes = [...(state.packChunkSizes || [])];
      const prevOvers = [...(state.packChunkOverlaps || [])];
      const prevMd = [...(state.packUnitMarkdownTexts || [])];
      const prevYu = [...(state.packUnitYoutubeUrls || [])];
      const prevMp3 = [...(state.packUnitMp3PreviewUrls || [])];
      const prevErr = [...(state.packUnitTranscriptError || [])];
      const prevLoad = [...(state.packUnitTranscriptLoading || [])];
      const prevLoaded = [...(state.packUnitTranscriptLoaded || [])];
      const prevNames = [...(state.packUnitNames || [])];

      state.packTasksList = parsed;
      state.packUnitTypes = remapPackUnitTypes(prevList, prevTypes, parsed);
      state.packChunkSizes = remapPackParallelNumbers(
        prevList,
        prevSizes,
        parsed,
        DEFAULT_PACK_CHUNK_SIZE
      );
      state.packChunkOverlaps = remapPackParallelNumbers(
        prevList,
        prevOvers,
        parsed,
        DEFAULT_PACK_CHUNK_OVERLAP
      );
      state.packUnitMarkdownTexts = remapPackParallelStrings(prevList, prevMd, parsed, '');
      state.packUnitYoutubeUrls = remapPackParallelStrings(prevList, prevYu, parsed, '');
      state.packUnitMp3PreviewUrls = remapPackParallelStrings(prevList, prevMp3, parsed, '');
      state.packUnitTranscriptError = remapPackParallelStrings(prevList, prevErr, parsed, '');
      state.packUnitTranscriptLoading = remapPackParallelBools(prevList, prevLoad, parsed);
      state.packUnitTranscriptLoaded = remapPackParallelBools(prevList, prevLoaded, parsed);
      state.packUnitNames = remapPackParallelStrings(prevList, prevNames, parsed, '');
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
    onDragEndTag,
    onDragOver,
    onDragEnter,
    onDragLeave,
    onDropRagList,
    removeFromRagList,
    removeRagListGroup,
    addRagListGroup,
    clearAllRagListGroups,
    addAllSecondFoldersAsGroups,
    setAllSecondFoldersAsSingleGroup,
  };
}
