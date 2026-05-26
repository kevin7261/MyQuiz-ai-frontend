<script setup>
/**
 * CreateExamQuizBankPage - 建立測驗題庫頁面
 *
 * 一個分頁（tab）對應後端一筆 RAG（rag_id + rag_tab_id）。流程：建立 RAG → 上傳 ZIP → 設定 unit_list（虛擬資料夾群組）→ Build RAG ZIP → 產生題目 → 作答與評分（試卷用題庫由後端／系統設定與／或單題 POST for-exam 管理，見註解）。
 *
 * API 對應：
 * - 列表：GET /rag/tabs?local=（與 tab/create 的 local 一致）；useRagList 首次 watch(immediate) 載入，之後每次從側欄再進入本頁（KeepAlive onActivated）再抓一次
 * - 建立並上傳（按 + 開 Modal）：POST /rag/tab/create-upload-zip（multipart: file、rag_tab_id、person_id、tab_name、local；query person_id、course_id）；成功後顯示設定單元
 * - 建 RAG：POST /rag/tab/build-rag-zip（NDJSON 串流；course_id、unit_list、unit_types、transcriptions〔與逗號分段同序〕、rag_chunk_sizes／rag_chunk_overlaps〔與群組同序之逗號字串；非 unit_type 1 時為 0〕、可選 unit_names〔與群組同序之逗號字串，名稱內逗號會轉空白〕；已不再傳 system_prompt_instruction）
 * - 設定單元：unit_type 2／3／4 時自動 GET `/rag/unit/text`、`/rag/unit/mp3-file`、`/rag/unit/youtube-url`；回應 `transcription`（Markdown）寫入逐字稿編輯區（mp3／YouTube 另設播放器預覽）；期間全螢幕 LoadingOverlay「檔案讀取中…」
 * - 分頁更名：PUT /rag/tab/tab-name（body: rag_id、tab_name）
 * - 試卷用：GET /rag/tabs 每筆 Rag.for_exam，或其 units／quizzes 任一有 Rag_Quiz.for_exam，或本機題卡 rag_quiz_for_exam，皆於分頁列顯示綠點並禁止刪除該題庫分頁（不再呼叫 system-settings rag-for-exam-*）
 * - 出題（舊／整庫）：POST /rag/tab/quiz/create（rag_id 必填；rag_tab_id、unit_name 選填可 ""）；評分：POST /rag/tab/unit/quiz/llm-grade（body 以 rag_id、rag_quiz_id、quiz_answer 為核心；quiz_content 可省略）與已儲存批改規則之 POST /rag/tab/unit/quiz/llm-grade-db；GET /rag/tab/unit/quiz/grade-result/{job_id}，ready 時 result: quiz_score、quiz_comments、rag_quiz_id、rag_answer_id
 * - 單元子分頁：GET /rag/tab/units；題型列「+」新增題庫 POST /rag/tab/unit/quiz/create（body: rag_tab_id、rag_unit_id；不呼叫 LLM）後推入一列（帶 rag_quiz_id）；後端若未帶 quiz_name 常將該欄預設為所屬 unit_name，故建立成功後前端會 PUT /rag/tab/unit/quiz/quiz-name 寫入「未命名題型」與草稿一致，再上傳／重整才不會被 hydrate 覆寫成單元名。再填題名／出題規則後按「儲存並產生題目」POST /rag/tab/unit/quiz/llm-generate（body 含 quiz_user_prompt_text）；「產生題目」POST /rag/tab/unit/quiz/llm-generate-db（body 僅 rag_quiz_id、quiz_name；後端使用 Rag_Quiz 已儲存之 quiz_user_prompt_text）；若列上尚無 rag_quiz_id（舊本機草稿），「儲存並產生題目」仍會先 create 再 llm；單題設為／取消測驗用 POST /rag/tab/unit/quiz/for-exam（body 僅 rag_quiz_id、for_exam）；題型 sub-tab 更名：PUT /rag/tab/unit/quiz/quiz-name（body: rag_quiz_id、quiz_name）；軟刪題型：PUT /rag/tab/quiz/delete/{rag_quiz_id}；「單元內容」：單元僅見上方子分頁；user_type 1／2／234；設定單元選 unit_type=2/3/4 時共用 Markdown 逐字稿編輯器，選定類型且資料夾就緒後自動載入逐字稿，完成載入前編輯區停用且不能開始建立單元；3 僅 `<audio>` 與「逐字稿」Modal（不列 mp3 檔名、不標聽取音訊）；4 內嵌 iframe 與逐字稿 Modal（不標 YouTube 字樣）；3 且已有 rag_unit_id 時 GET `/rag/tab/unit/mp3-file`；RAG（1）僅來源檔案
 * 上述 API 不需 llm_api_key。
 */
import { ref, computed, watch, onActivated, reactive, nextTick, useSlots } from 'vue';
import { useAuthStore } from '../stores/authStore.js';
import {
  API_RESPONSE_QUIZ_CONTENT,
  API_RESPONSE_QUIZ_LEGACY,
} from '../constants/api.js';
import {
  getPersonId,
  apiCreateUploadZip,
  apiDeleteRag,
  apiUpdateRagTabName,
  apiBuildRagZip,
  apiRagUnitText,
  apiRagUnitMp3FileByFolder,
  apiRagUnitYoutubeUrlByFolder,
  ragUnitTranscriptionFromResponse,
  apiGetRagTabUnits,
  apiCreateRagUnitQuiz,
  apiRagUnitQuizLlmGenerate,
  apiRagUnitQuizLlmGenerateDb,
  apiRagUnitQuizLlmGenerateFollowup,
  apiRagUnitQuizLlmGenerateFollowupDb,
  parseFollowupHistoryListFromSource,
  followupHistoryEntryFromQuizCard,
  normalizeFollowupHistoryItem,
  apiMarkRagQuizForExam,
  apiSetRagQuizFollowup,
  apiGenerateQuiz,
  apiUpdateRagQuizName,
  apiDeleteRagQuiz,
  is504OrNetworkError,
} from '../services/ragApi.js';
import { formatGradingResult } from '../utils/grading.js';
import { formatFileSize } from '../utils/formatFileSize.js';
import { renderMarkdownToSafeHtml } from '../utils/renderMarkdown.js';
import { youtubeEmbedUrlFromInput } from '../utils/youtubeEmbed.js';
import { submitGrade } from '../composables/useQuizGrading.js';
import {
  generateTabId,
  deriveRagNameFromTabId,
  deriveRagName,
  getRagUnitListString,
  parsePackTasksList,
  parsePackUnitTypesFromRag,
  parseRagMetadataObject,
  unitSelectValue,
  reconcileQuizUnitSelectSlot,
  findQuizUnitBySlotSelection,
  examOrRagQuizRowKey,
  examOrRagAnswerRowKey,
  serializePackUnitTypesForApi,
  transcriptionsForBuildRagZip,
  chunkSizesOverlapsStringsForBuildRagZip,
  serializePackUnitNamesForApi,
  normalizePackUnitType,
  packGroupRequiresRagType,
  enforcePackUnitTypesForFolderGroups,
  UNIT_TYPE_RAG,
  UNIT_TYPE_TEXT,
  UNIT_TYPE_MP3,
  UNIT_TYPE_YOUTUBE,
  DEFAULT_PACK_CHUNK_SIZE,
  DEFAULT_PACK_CHUNK_OVERLAP,
} from '../utils/rag.js';
import { useRagList } from '../composables/useRagList.js';
import { useRagTabState } from '../composables/useRagTabState.js';
import { usePackTasks } from '../composables/usePackTasks.js';
import QuizCard from '../components/QuizCard.vue';
import QuizHistoryModal from '../components/QuizHistoryModal.vue';
import RagTabUnitMp3Player from '../components/RagTabUnitMp3Player.vue';
import UnitSelectDropdown from '../components/UnitSelectDropdown.vue';
import TabRenameModal from '../components/TabRenameModal.vue';
import LoadingOverlay from '../components/LoadingOverlay.vue';
import EnglishExamMarkdownEditor from '../components/EnglishExamMarkdownEditor.vue';

const props = defineProps({
  tabId: { type: String, required: true },
  /** true 時右側單元／題型清單改顯示於左欄（create-exam-bank_3） */
  designSidePanelOnLeft: { type: Boolean, default: false },
});

const slots = useSlots();

const pageTitle = computed(() => '建立測驗題庫');
/** 用於載入中、新增、錯誤訊息等可讀名詞 */
const quizBankNoun = computed(() => '測驗題庫');

// ─── 純輔助函式（不依賴 Vue 狀態） ────────────────────────────────────────────

let cardIdSeq = 0;
function nextCardId() {
  return `card-${++cardIdSeq}`;
}

/** POST /rag/tab/upload-zip：此頁僅接受 .zip */
const UPLOAD_ALLOWED_EXTENSIONS = ['.zip'];
const UPLOAD_ACCEPT_ATTR = UPLOAD_ALLOWED_EXTENSIONS.join(',');
/** 教材上傳單檔大小上限（位元組）：與檔案總管／Finder 顯示的「MB」一致（50×10⁶），非 50×1024² */
const UPLOAD_MAX_FILE_BYTES = 50 * 1000 * 1000;
function uploadFileExceedsMaxSize(file) {
  if (!file || typeof file.size !== 'number' || !Number.isFinite(file.size)) return false;
  return file.size > UPLOAD_MAX_FILE_BYTES;
}
function fileHasAllowedUploadExtension(file) {
  if (!file?.name) return false;
  const lower = file.name.toLowerCase();
  return UPLOAD_ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

const authStore = useAuthStore();

// ─── RAG 列表與分頁狀態 ────────────────────────────────────────────────────────

const { ragList, ragListLoading, ragListError, fetchRagList } = useRagList();
const createRagLoading = ref(false);
const createRagError = ref('');
/** 按 + 開啟：建立並上傳 ZIP Modal */
const newBankUploadModalOpen = ref(false);
const newBankUploadFile = ref(/** @type {File | null} */ (null));
const newBankUploadFileName = ref('');
const newBankUploadError = ref('');
const newBankUploadZipDragOver = ref(false);
const newBankUploadFileInputRef = ref(null);
const renameRagTabModalOpen = ref(false);
/** 重新命名 API 用 Rag 主鍵（PUT /rag/tab/tab-name） */
const renameRagTabDraftRagId = ref(null);
const renameRagTabInitialName = ref('');
const renameRagTabSaving = ref(false);
const renameRagTabError = ref('');
/** 題型 sub-tab 更名（PUT /rag/tab/unit/quiz/quiz-name） */
const renameUnitQuizModalOpen = ref(false);
const renameUnitQuizDraftRagQuizId = ref(null);
const renameUnitQuizInitialName = ref('');
const renameUnitQuizSaving = ref(false);
const renameUnitQuizError = ref('');
/** POST build-rag-zip 成功後：Bootstrap Modal「單元建立完成」 */
const packBuildSuccessModalOpen = ref(false);
/** 建置完成後：唯讀單元屬性 Modal */
const packUnitDetailModalOpen = ref(false);
/** 設定單元 sub-tab 更名（本機 packUnitNames） */
const renamePackUnitModalOpen = ref(false);
const renamePackUnitDraftIndex = ref(null);
const renamePackUnitInitialName = ref('');
const renamePackUnitError = ref('');
/** 刪除設定單元確認 Modal */
const deletePackUnitModalOpen = ref(false);
const deletePackUnitDraftIndex = ref(null);
/** 刪除全部設定單元確認 Modal */
const deleteAllPackUnitsModalOpen = ref(false);
/** 刪除題型確認 Modal */
const deleteUnitQuizModalOpen = ref(false);
const deleteUnitQuizDraftIndex = ref(null);
/** 題型 sub-tab 軟刪（PUT /rag/tab/quiz/delete/{rag_quiz_id}） */
const deleteUnitQuizLoading = ref(false);
/** 正在送出批改的題卡 id（全螢幕 LoadingOverlay「批改中...」；結果區待回傳） */
const gradingSubmittingCardId = ref(null);
const deleteRagLoading = ref(false);
const activeTabId = ref(null);
const newTabIds = ref([]);
/** POST /rag/tab/unit/quiz/for-exam 成功後，列表尚未含嵌套欄位時仍標記該 rag_tab_id（綠點／鎖刪與目前選中哪個分頁無關） */
const ragTabExamHintByTabId = ref({});

const { getTabState, currentState, isNewTabId, tabStateMap } = useRagTabState(activeTabId, newTabIds, ragList, authStore);

/** 重新整理後還原主 tab／單元子分頁／題型子分頁（sessionStorage，依使用者分鍵） */
const CREATE_BANK_TAB_UI_STORAGE_PREFIX = 'myquiz:createBankTabUI:v1:';

function createBankTabUiStorageKey(personId) {
  const p = String(personId ?? '').trim();
  return `${CREATE_BANK_TAB_UI_STORAGE_PREFIX}${p || 'anon'}`;
}

function readCreateBankTabUiPersisted(personId) {
  try {
    const raw = sessionStorage.getItem(createBankTabUiStorageKey(personId));
    if (!raw) return null;
    const o = JSON.parse(raw);
    if (!o || typeof o !== 'object') return null;
    return {
      rag_tab_id: o.rag_tab_id != null ? String(o.rag_tab_id) : '',
      unit_tab_id: o.unit_tab_id != null ? String(o.unit_tab_id) : '',
      quiz_type_index: Number(o.quiz_type_index) || 0,
      rag_unit_id:
        o.rag_unit_id != null && String(o.rag_unit_id).trim() !== ''
          ? Number(o.rag_unit_id)
          : 0,
    };
  } catch {
    return null;
  }
}

function writeCreateBankTabUiPersisted(personId, payload) {
  try {
    sessionStorage.setItem(
      createBankTabUiStorageKey(personId),
      JSON.stringify({
        v: 1,
        rag_tab_id: payload.rag_tab_id,
        unit_tab_id: payload.unit_tab_id,
        quiz_type_index: payload.quiz_type_index,
        rag_unit_id: payload.rag_unit_id,
      })
    );
  } catch {
    /* private mode / quota */
  }
}

/** 題型「先前出題」：localStorage 備援（GET 未帶 quiz_history_list 時重整仍可還原；與後端欄位合併） */
const CREATE_BANK_QUIZ_HISTORY_STORAGE_PREFIX = 'myquiz:createBankQuizHistory:v1:';

function createBankQuizHistoryStorageKey(personId) {
  const p = String(personId ?? '').trim();
  return `${CREATE_BANK_QUIZ_HISTORY_STORAGE_PREFIX}${p || 'anon'}`;
}

function readRagQuizHistoryMap(personId) {
  try {
    const raw = localStorage.getItem(createBankQuizHistoryStorageKey(personId));
    if (!raw) return {};
    const o = JSON.parse(raw);
    const map = o?.byRagQuizId ?? o?.by_rag_quiz_id;
    if (map && typeof map === 'object' && !Array.isArray(map)) return map;
    return {};
  } catch {
    return {};
  }
}

function writeRagQuizHistoryMap(personId, byRagQuizId) {
  try {
    localStorage.setItem(
      createBankQuizHistoryStorageKey(personId),
      JSON.stringify({ v: 1, byRagQuizId })
    );
  } catch {
    /* private mode / quota */
  }
}

function mergeQuizHistoryLists(...sources) {
  const seen = new Set();
  const out = [];
  for (const src of sources) {
    for (const s of parseQuizHistoryListFromSource(src)) {
      if (seen.has(s)) continue;
      seen.add(s);
      out.push(s);
    }
  }
  return out;
}

function storedQuizHistoryForRagQuiz(personId, ragQuizId) {
  const rqid = ragQuizId != null ? Math.trunc(Number(ragQuizId)) : NaN;
  if (!String(personId ?? '').trim() || !Number.isFinite(rqid) || rqid < 1) return [];
  const map = readRagQuizHistoryMap(personId);
  return parseQuizHistoryListFromSource(map[String(rqid)]);
}

function resolveQuizHistoryForRagQuiz(personId, ...sources) {
  const rqid = sources.reduce(
    (id, src) => (id != null ? id : positiveRagQuizIdFromQuizRow(src)),
    null
  );
  const parts = sources.map((s) => parseQuizHistoryListFromSource(s));
  if (rqid != null) parts.push(storedQuizHistoryForRagQuiz(personId, rqid));
  return mergeQuizHistoryLists(...parts);
}

function persistQuizHistoryForRagQuiz(personId, ragQuizId, list) {
  const pid = String(personId ?? '').trim();
  const rqid = ragQuizId != null ? Math.trunc(Number(ragQuizId)) : NaN;
  if (!pid || !Number.isFinite(rqid) || rqid < 1) return;
  const normalized = parseQuizHistoryListFromSource(list);
  const map = readRagQuizHistoryMap(pid);
  map[String(rqid)] = normalized;
  writeRagQuizHistoryMap(pid, map);
}

/** 合併題卡／產題 API 之歷史並寫入 localStorage */
function applyQuizHistoryToCard(card, generateQuizResponseJson = null) {
  if (!card || typeof card !== 'object') return;
  const personId = getPersonId(authStore);
  card.quiz_history_list = resolveQuizHistoryForRagQuiz(
    personId,
    card,
    generateQuizResponseJson
  );
  const rqid = positiveRagQuizIdFromQuizRow(card);
  if (card.quiz_history_list.length > 0) {
    persistQuizHistoryForRagQuiz(personId, rqid, card.quiz_history_list);
  }
}

function ragTabIdExistsInBankLists(ragTabId, list, newIds) {
  const id = String(ragTabId ?? '').trim();
  if (!id) return false;
  if (Array.isArray(newIds) && newIds.some((x) => String(x) === id)) return true;
  if (!Array.isArray(list)) return false;
  return list.some((r) => String(r?.rag_tab_id ?? r?.id ?? r) === id);
}

function persistCreateBankTabUiSelection() {
  const personId = getPersonId(authStore);
  if (!personId) return;
  const ragTab = String(activeTabId.value ?? '').trim();
  if (!ragTab) return;
  const state = currentState.value;
  const tabs = state.unitTabOrder ?? [];
  const activeUid = String(state.activeUnitTabId ?? '').trim();
  const activeRow = tabs.find((t) => t.id === activeUid);
  const ru =
    activeRow?.ragUnitDbId != null && Number(activeRow.ragUnitDbId) > 0
      ? Number(activeRow.ragUnitDbId)
      : 0;
  writeCreateBankTabUiPersisted(personId, {
    rag_tab_id: ragTab,
    unit_tab_id: activeUid,
    quiz_type_index: Number(state.activeUnitQuizTypeIndex ?? 0) || 0,
    rag_unit_id: Number.isFinite(ru) ? ru : 0,
  });
}

/** 與 session 儲存之 unit_tab_id 對齊：含舊版 `tab::name::index` 與 rag_unit_id 後備（API 單元順序與列表不同時仍要能還原） */
function resolvePersistedUnitTabId(tabs, persisted) {
  const list = Array.isArray(tabs) ? tabs : [];
  const wantUnit = String(persisted?.unit_tab_id ?? '').trim();
  if (wantUnit && list.some((t) => t.id === wantUnit)) return wantUnit;
  const ru = Number(persisted?.rag_unit_id);
  if (Number.isFinite(ru) && ru > 0) {
    const hit = list.find((t) => Number(t.ragUnitDbId) === ru);
    if (hit) return String(hit.id);
  }
  if (wantUnit) {
    const parts = wantUnit.split('::');
    if (parts.length >= 3) {
      const legacyIdx = Number(parts[parts.length - 1]);
      if (Number.isFinite(legacyIdx) && legacyIdx >= 0 && legacyIdx < list.length) {
        return String(list[legacyIdx].id);
      }
    }
  }
  return '';
}

/**
 * 若目前選中的頂層 tab 為 tabId，則依 session 還原單元與題型子分頁（需在 unitTabOrder／題卡 hydrate 之後呼叫）
 */
function applyPersistedUnitSubTabsIfActive(tabId) {
  const id = String(tabId ?? '').trim();
  if (!id || String(activeTabId.value ?? '').trim() !== id) return;
  const personId = getPersonId(authStore);
  if (!personId) return;
  const persisted = readCreateBankTabUiPersisted(personId);
  if (!persisted || String(persisted.rag_tab_id) !== id) return;
  const state = getTabState(id);
  const tabs = state.unitTabOrder ?? [];
  const resolvedUnit = resolvePersistedUnitTabId(tabs, persisted);
  if (resolvedUnit) {
    state.activeUnitTabId = resolvedUnit;
  }
  const qiPersist = Number(persisted.quiz_type_index);
  nextTick(() => {
    if (String(activeTabId.value ?? '').trim() !== id) return;
    const s = getTabState(id);
    const tabsNow = s.unitTabOrder ?? [];
    const activeId = String(s.activeUnitTabId ?? '');
    const slotIdx = tabsNow.findIndex((t) => t.id === activeId);
    const i = slotIdx >= 0 ? slotIdx : 0;
    const stacks = s.unitSlotQuizCards;
    const row = Array.isArray(stacks) && stacks[i] ? stacks[i] : [];
    const cards = Array.isArray(row) ? row : [];
    let qi = Number.isFinite(qiPersist) ? qiPersist : 0;
    if (!Number.isFinite(qi) || qi < 0 || qi >= cards.length) qi = 0;
    s.activeUnitQuizTypeIndex = qi;
    syncPackUnitIndexFromActiveUnitTab();
  });
}

const zipFileInputAccept = UPLOAD_ACCEPT_ATTR;

const showCreateBankMainForm = computed(() => ragList.value.length > 0);
const showDesignRightNav = computed(() => !!activeTabId.value);

function checkRagHasMetadata(rag) {
  if (!rag || typeof rag !== 'object') return false;
  return rag.rag_metadata != null && (typeof rag.rag_metadata === 'string' ? String(rag.rag_metadata).trim() !== '' : true);
}

function extractUnitsFromRag(rag) {
  if (!rag || typeof rag !== 'object') return [];
  const raw =
    rag.units ??
    rag.rag_units ??
    rag.ragUnits ??
    rag.unit_rows ??
    rag.unitRows;
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string' && raw.trim() !== '') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function checkRagHasList(rag) {
  if (!rag || typeof rag !== 'object') return false;
  if (extractUnitsFromRag(rag).length > 0) return true;
  return getRagUnitListString(rag) !== '';
}

/** 至少一列出題單元，且每列至少一個課程標籤（與「開始建立單元」按鈕啟用條件一致） */
function isPackTasksListReady(list) {
  if (!Array.isArray(list) || list.length < 1) return false;
  return list.every((g) => Array.isArray(g) && g.length >= 1);
}

const hasRagMetadata = computed(() => checkRagHasMetadata(currentRagItem.value));
const hasRagListOrMetadata = computed(() => checkRagHasMetadata(currentRagItem.value) || checkRagHasList(currentRagItem.value));
/** 建置完成判斷：後端已有 rag_metadata/unit_list，或前端本輪 build 已拿到回傳 */
const hasBuiltRagSummary = computed(
  () => hasRagListOrMetadata.value || currentState.value.packResponseJson != null
);
/** 右側欄：已上傳且至少有一個設定單元（建置後則有後端資料） */
const showDesignRightView = computed(() => {
  if (!activeTabId.value || !hasUploadedFileMetadata.value) return false;
  if (hasBuiltRagSummary.value) return true;
  return packUnitCarouselCountEffective.value > 0;
});
/** 左欄是否顯示：_3 有 side-panel-header slot 時即使尚未上傳也保留左欄（含 detail bar） */
const showSidePanelColumn = computed(() => {
  if (props.designSidePanelOnLeft && slots['side-panel-header']) return true;
  return showDesignRightView.value;
});

/** 後端已有 rag_metadata 時，設定單元（unit_list）拆成條列：每個 li 為一群，群內資料夾以 + 連接 */
const ragListReadonlyGroups = computed(() => {
  const list = currentState.value.packTasksList;
  if (Array.isArray(list) && list.length > 0) {
    const groups = list.filter((g) => Array.isArray(g) && g.length > 0).map((g) => g.filter(Boolean));
    if (groups.length > 0) return groups;
  }
  const rag = currentRagItem.value;
  const units = extractUnitsFromRag(rag);
  if (units.length > 0) {
    const mapped = units
      .map((u) => String(u?.unit_name ?? u?.rag_name ?? u?.name ?? '').trim())
      .filter(Boolean)
      .map((name) => [name.replace(/\+/g, '_')]);
    if (mapped.length > 0) return mapped;
  }
  const unitStr = getRagUnitListString(rag);
  if (unitStr) return parsePackTasksList(unitStr);
  return [];
});

/** 尚無法編輯設定單元（未上傳 ZIP 等）；與拖放、區塊鎖定一致，不包含「群組是否已填滿」 */
const packGroupsEditBlocked = computed(() => {
  if (hasRagMetadata.value) return true;
  if (hasRagListOrMetadata.value) return false;
  const id = activeTabId.value;
  if (!id) return true;
  if (isNewTabId(id)) return String(currentState.value.zipTabId ?? '').trim() === '';
  return false;
});

/** 尚未完成建立 RAG 壓縮時，產生題目區塊 disable（需有 packResponseJson）；若有 rag_metadata 則 enable */
const ragGenerateDisabled = computed(() => {
  if (hasRagMetadata.value) return false;
  return packGroupsEditBlocked.value || currentState.value.packResponseJson == null;
});

/** Pack 回傳的 outputs 陣列（依當前 tab 的 packResponseJson） */
const packOutputs = computed(() => {
  const data = currentState.value.packResponseJson;
  if (!data || typeof data !== 'object') return [];
  return Array.isArray(data.outputs) ? data.outputs : [];
});

/** 產生題目：選擇單元 = rag_name 下拉（供 API；Pack 無資料時從 /rags 推導） */
const generateQuizUnits = computed(() => {
  const data = currentState.value.packResponseJson;
  const out = packOutputs.value;
  const singleTabId = data && typeof data === 'object' && data.rag_tab_id != null ? data.rag_tab_id : null;
  const withId = out.filter((o) => o && o.rag_tab_id != null);
  if (withId.length) {
    return withId.map((o) => {
      const rag_name = deriveRagName(o);
      const unit_name = String(o.unit_name ?? o.rag_name ?? rag_name ?? '').trim().replace(/\+/g, '_') || rag_name;
      return {
        rag_tab_id: String(o.rag_tab_id),
        filename: o.filename || o.rag_filename || 'RAG',
        rag_name,
        unit_name,
      };
    });
  }
  if (singleTabId && out.length) {
    return out.map((o) => {
      const rag_name = deriveRagName(o);
      const unit_name = String(o.unit_name ?? o.rag_name ?? rag_name ?? '').trim().replace(/\+/g, '_') || rag_name;
      return {
        rag_tab_id: String(singleTabId),
        filename: o.filename || o.rag_filename || 'RAG',
        rag_name,
        unit_name,
      };
    });
  }
  // fallback：Pack 尚未執行，從 /rags 的 unit_list（或 rag_list）推導
  return generateQuizUnitsFromRag.value;
});

// ─── 當前 tab / RAG 資料存取 ──────────────────────────────────────────────────

/** 確保為數字，空字串/null/undefined/NaN 時回傳預設值 */
function ensureNumber(val, defaultVal) {
  const n = Number(val);
  return (n === n && isFinite(n)) ? n : defaultVal;
}

/** 當前 tab 對應的 RAG 項目（來自 GET /rag/tabs），僅在非「新增」tab 時有值 */
const currentRagItem = computed(() => {
  const id = activeTabId.value;
  if (!id || isNewTabId(id)) return null;
  return ragList.value.find(
    (rag) => (rag.rag_tab_id ?? rag.id ?? String(rag)) === id
  ) ?? null;
});

/** 與評分／題卡比對用：目前分頁 RAG 的 rag_id（與 confirmAnswer 取法一致） */
const currentRagIdForQuizCards = computed(() => {
  const state = currentState.value;
  const rag = currentRagItem.value;
  const v = rag?.rag_id ?? rag?.id ?? state?.zipResponseJson?.rag_id ?? state?.zipResponseJson?.id;
  return v != null && String(v).trim() !== '' ? v : null;
});

/** GET /rag/tabs 列之 Rag.for_exam===true 時為試卷用（不做 system-settings 對照） */
function ragIsForExamFromListRow(rag) {
  return !!rag?.for_exam;
}

/** GET /rag/tabs 之 quiz 列是否標為測驗用（與 buildCardFromRagQuiz 一致） */
function ragQuizApiRowIsForExam(quiz) {
  if (!quiz || typeof quiz !== 'object') return false;
  return (
    quiz.for_exam === true
    || quiz.for_exam === 1
    || quiz.rag_quiz_for_exam === true
    || quiz.rag_quiz_for_exam === 1
  );
}

/** GET /rag/tabs、GET /rag/tab/units 之 Rag_Quiz.follow_up===true 時為追問出題 */
function ragQuizApiRowIsFollowUp(quiz) {
  if (!quiz || typeof quiz !== 'object') return false;
  return (
    quiz.follow_up === true
    || quiz.follow_up === 1
    || quiz.followUp === true
    || quiz.followUp === 1
  );
}

/** 單元列：quizzes／quiz_list／Quizzes */
function quizRowsFromUnitApiRow(u) {
  if (!u || typeof u !== 'object') return [];
  if (Array.isArray(u.quizzes)) return u.quizzes;
  if (Array.isArray(u.quiz_list)) return u.quiz_list;
  if (Array.isArray(u.Quizzes)) return u.Quizzes;
  return [];
}

/** GET /rag/tabs 單筆：units[] 或頂層 quizzes[] 是否含任一測驗用題型 */
function ragListRowHasNestedForExamQuiz(rag) {
  if (!rag || typeof rag !== 'object') return false;
  const rawUnits = extractUnitsFromRag(rag);
  if (rawUnits.length > 0) {
    for (const u of rawUnits) {
      for (const q of quizRowsFromUnitApiRow(u)) {
        if (ragQuizApiRowIsForExam(q)) return true;
      }
    }
    return false;
  }
  const top = rag.quizzes;
  return Array.isArray(top) && top.some((q) => ragQuizApiRowIsForExam(q));
}

/** 本機 tabState：掃描 stacks／cardList 是否有 Rag_Quiz.for_exam */
function stateHasExamQuizCardsInTabState(st) {
  if (!st || typeof st !== 'object') return false;
  const stacks = st.unitSlotQuizCards;
  if (Array.isArray(stacks)) {
    for (const stack of stacks) {
      if (!Array.isArray(stack)) continue;
      for (const c of stack) {
        if (c?.rag_quiz_for_exam === true || c?.rag_quiz_for_exam === 1) return true;
      }
    }
  }
  const flat = st.cardList;
  if (Array.isArray(flat)) {
    for (const c of flat) {
      if (c?.rag_quiz_for_exam === true || c?.rag_quiz_for_exam === 1) return true;
    }
  }
  return false;
}

/**
 * 本機該分頁：任一題卡為測驗用。
 * 除 tabStateMap[rag_tab_id] 外，亦比對 zipTabId／tabId／map key（避免鍵不一致時換分頁後綠點消失）。
 */
function tabStateHasAnyRagQuizForExam(tabStateMapRef, tabId) {
  const tid = tabId != null ? String(tabId).trim() : '';
  if (!tid || !tabStateMapRef || typeof tabStateMapRef !== 'object') return false;
  const seen = new Set();
  function trySt(st) {
    if (!st || typeof st !== 'object' || seen.has(st)) return false;
    seen.add(st);
    return stateHasExamQuizCardsInTabState(st);
  }
  if (trySt(tabStateMapRef[tid])) return true;
  for (const k of Object.keys(tabStateMapRef)) {
    const st = tabStateMapRef[k];
    const z = String(st?.zipTabId ?? '').trim();
    const td = String(st?.tabId ?? '').trim();
    const ks = String(k).trim();
    if (z === tid || td === tid || ks === tid) {
      if (trySt(st)) return true;
    }
  }
  return false;
}

/** 分頁列綠點與禁止刪除：整庫 for_exam、列表嵌套題型、本機 tabState、for-exam 成功提示 */
function ragTabIsExamProtected(rag, tabStateMapRef) {
  if (!rag || typeof rag !== 'object') return false;
  if (ragIsForExamFromListRow(rag)) return true;
  if (ragListRowHasNestedForExamQuiz(rag)) return true;
  const tabId = rag.rag_tab_id ?? rag.id ?? rag;
  const tid = tabId != null ? String(tabId).trim() : '';
  if (tid && ragTabExamHintByTabId.value[tid]) return true;
  return tabStateHasAnyRagQuizForExam(tabStateMapRef, tabId);
}

watch(
  ragList,
  (list) => {
    if (!Array.isArray(list)) return;
    const next = { ...ragTabExamHintByTabId.value };
    let dirty = false;
    for (const key of Object.keys(next)) {
      const rag = list.find((r) => String(r?.rag_tab_id ?? r?.id ?? '').trim() === key);
      if (!rag) {
        delete next[key];
        dirty = true;
        continue;
      }
      if (ragIsForExamFromListRow(rag) || ragListRowHasNestedForExamQuiz(rag)) {
        delete next[key];
        dirty = true;
      }
    }
    if (dirty) ragTabExamHintByTabId.value = next;
  },
  { deep: true }
);

/** 當前 tab 的 rag_id、rag_tab_id（僅 console 記錄；未上傳則為「未上傳」） */
const currentRagIdAndTabId = computed(() => {
  const state = currentState.value;
  const rag = currentRagItem.value;
  if (state.zipResponseJson != null) {
    const rid = state.zipResponseJson.rag_id ?? state.zipResponseJson.id;
    const tid = state.zipTabId || state.zipResponseJson.rag_tab_id;
    return { rag_id: rid != null ? String(rid) : '未上傳', rag_tab_id: tid ? String(tid) : '未上傳' };
  }
  if (rag != null && typeof rag === 'object') {
    const rid = rag.rag_id ?? rag.id;
    const tid = rag.rag_tab_id ?? rag.id ?? activeTabId.value;
    return { rag_id: rid != null ? String(rid) : '未上傳', rag_tab_id: tid ? String(tid) : '未上傳' };
  }
  return { rag_id: '未上傳', rag_tab_id: '未上傳' };
});

watch(
  currentRagIdAndTabId,
  (v) => {
    // 畫面不顯示 rag_id／rag_tab_id，改由此處輸出供除錯
    // eslint-disable-next-line no-console -- 依需求於開發者工具查看
    console.log('[CreateExamQuizBankPage] rag_id:', v.rag_id, 'rag_tab_id:', v.rag_tab_id);
  },
  { immediate: true }
);

const hasAnySlotGenerating = computed(() => {
  const state = currentState.value;
  const n = Number(state.quizSlotsCount) || 0;
  for (let i = 1; i <= n; i++) {
    const slot = state.slotFormState[i];
    if (slot?.loading || slot?.unitQuizCreateLoading) return true;
  }
  return false;
});

/** 題型列「+」與「產生題目」共用 unitQuizCreateLoading，由此區分全螢幕 overlay 主文案 */
const activeUnitQuizLoadingOverlayKind = computed(() => {
  const state = currentState.value;
  const n = Number(state.quizSlotsCount) || 0;
  for (let i = 1; i <= n; i++) {
    const slot = state.slotFormState[i];
    if (!slot?.unitQuizCreateLoading) continue;
    if (slot.unitQuizLoadingOverlayKind === 'add-row') return 'add-row';
  }
  for (let i = 1; i <= n; i++) {
    const slot = state.slotFormState[i];
    if (!slot?.unitQuizCreateLoading) continue;
    if (slot.unitQuizLoadingOverlayKind === 'llm-generate-followup-db') return 'llm-generate-followup-db';
  }
  for (let i = 1; i <= n; i++) {
    const slot = state.slotFormState[i];
    if (!slot?.unitQuizCreateLoading) continue;
    if (slot.unitQuizLoadingOverlayKind === 'llm-generate-followup') return 'llm-generate-followup';
  }
  for (let i = 1; i <= n; i++) {
    const slot = state.slotFormState[i];
    if (!slot?.unitQuizCreateLoading) continue;
    if (slot.unitQuizLoadingOverlayKind === 'llm-generate-db') return 'llm-generate-db';
  }
  for (let i = 1; i <= n; i++) {
    const slot = state.slotFormState[i];
    if (!slot?.unitQuizCreateLoading) continue;
    if (slot.unitQuizLoadingOverlayKind === 'llm-generate') return 'llm-generate';
  }
  return null;
});

const isGradingSubmitting = computed(() => gradingSubmittingCardId.value != null);

/** 設定單元：逐字稿載入中（文字 GET /rag/unit/text）或檔案讀取（mp3-file／youtube-url 含 transcription）期間，禁「開始建立單元」等 */
const hasPackUnitTranscriptLoading = computed(() => {
  const st = currentState.value;
  const t = Array.isArray(st?.packUnitTranscriptLoading) && st.packUnitTranscriptLoading.some(Boolean);
  const sf = Array.isArray(st?.packUnitSourceFileLoading) && st.packUnitSourceFileLoading.some(Boolean);
  return t || sf;
});

/** 設定單元：GET `/rag/unit/text`（文字逐字稿）或 mp3／YouTube 來源預覽 fetch 期間（packUnitSourceFileLoading） */
const hasPackUnitSourceFileLoading = computed(
  () =>
    Array.isArray(currentState.value?.packUnitSourceFileLoading)
    && currentState.value.packUnitSourceFileLoading.some(Boolean),
);

/** 全螢幕 LoadingOverlay：列表／建立分頁／刪除／更名／ZIP 上傳／建題庫／產生題目／批改／設定單元（來源檔讀取或逐字稿載入含「分析逐字稿」） */
const loadingOverlayVisible = computed(
  () =>
    ragListLoading.value ||
    createRagLoading.value ||
    deleteRagLoading.value ||
    renameRagTabSaving.value ||
    renameUnitQuizSaving.value ||
    deleteUnitQuizLoading.value ||
    !!currentState.value?.zipLoading ||
    !!currentState.value?.packLoading ||
    hasAnySlotGenerating.value ||
    isGradingSubmitting.value ||
    hasPackUnitTranscriptLoading.value
);

const loadingOverlayText = computed(() => {
  if (isGradingSubmitting.value) return '批改中...';
  if (activeUnitQuizLoadingOverlayKind.value === 'add-row') return '產生題型中';
  if (activeUnitQuizLoadingOverlayKind.value === 'llm-generate-followup-db') return '追問出題中...';
  if (activeUnitQuizLoadingOverlayKind.value === 'llm-generate-followup') return '儲存並追問出題中...';
  if (activeUnitQuizLoadingOverlayKind.value === 'llm-generate-db') return '產生題目中...';
  if (activeUnitQuizLoadingOverlayKind.value === 'llm-generate') return '儲存並產生題目中...';
  if (hasAnySlotGenerating.value) return '儲存並產生題目中...';
  const st = currentState.value;
  if (st?.zipLoading) return '上傳中...';
  if (st?.packLoading) return '建立單元中...';
  if (hasPackUnitSourceFileLoading.value) return '檔案讀取中…';
  if (
    Array.isArray(st?.packUnitTranscriptLoading)
    && st.packUnitTranscriptLoading.some(Boolean)
  )
    return '分析逐字稿中…';
  if (deleteRagLoading.value) return '刪除中...';
  if (deleteUnitQuizLoading.value) return '刪除題型中...';
  if (renameRagTabSaving.value) return '儲存中...';
  if (renameUnitQuizSaving.value) return '儲存題型中...';
  if (createRagLoading.value) return '建立中...';
  if (ragListLoading.value) return `載入${quizBankNoun.value}中`;
  return '處理中...';
});

/** 建題庫串流進度（僅 LoadingOverlay subText：筆數、目前序號、儲存 repack／RAG；不含工作檔名） */
const packBuildOverlayLines = computed(() => {
  const st = currentState.value;
  if (!st?.packLoading) return [];
  const total = Number(st.packBuildTotal) || 0;
  if (total <= 0) return [];
  const done = Number(st.packBuildDone) || 0;
  const cur = Number(st.packBuildCurrent) || 0;
  const repackKey = String(st.packBuildRepackFilename ?? '').trim();
  const ragKey = String(st.packBuildRagFilename ?? '').trim();
  const lines = [`共 ${total} 個 RAG ZIP，已完成 ${done} 個`];
  if (cur > 0) lines.push(`目前建置：第 ${cur} / ${total} 個`);
  if (repackKey) lines.push(`儲存 repack：${repackKey}`);
  if (ragKey) lines.push(`儲存 RAG：${ragKey}`);
  return lines;
});

/** 建題庫串流進度（LoadingOverlay subText） */
const loadingOverlaySubText = computed(() => {
  const st = currentState.value;
  if (st?.packLoading) {
    if (packBuildOverlayLines.value.length) return packBuildOverlayLines.value.join('\n');
    return '正在連線並準備建置…';
  }
  return '';
});

/** 用於顯示 file_metadata：上傳回傳的 zipResponseJson、GET /rag/tabs 的 file_metadata；若列表已建題庫但未內嵌 file_metadata，則由 rag 與 unit_list 合成，避免「設定單元」整塊被隱藏 */
const fileMetadataToShow = computed(() => {
  const state = currentState.value;
  if (state.zipResponseJson != null) return state.zipResponseJson;
  const rag = currentRagItem.value;
  if (rag == null || typeof rag !== 'object') return null;
  if (rag.file_metadata != null && typeof rag.file_metadata === 'object') return rag.file_metadata;
  const hasMeta = checkRagHasMetadata(rag);
  const unitStr = getRagUnitListString(rag);
  if (!hasMeta && !unitStr) return null;
  const groups = parsePackTasksList(unitStr);
  const fromUnits = [...new Set(groups.flat())];
  const secondFolders =
    fromUnits.length > 0
      ? fromUnits
      : (Array.isArray(rag.second_folders) ? rag.second_folders : []);
  return {
    filename: rag.filename ?? rag.zip_filename ?? rag.original_filename ?? '',
    file_size: rag.file_size,
    second_folders: secondFolders,
  };
});

/** 是否已上傳過 ZIP（file_metadata 僅在上傳後才會有） */
const hasUploadedFileMetadata = computed(() => fileMetadataToShow.value != null);

const newBankUploadConfirmDisabled = computed(
  () => createRagLoading.value || !newBankUploadFile.value,
);

/** 已有 file_metadata 時，畫面僅顯示之 ZIP 檔名 */
const uploadedZipDisplayName = computed(() => {
  if (!hasUploadedFileMetadata.value) return '';
  const meta = fileMetadataToShow.value;
  if (meta && typeof meta === 'object') {
    const name = meta.filename ?? meta.rag_filename ?? meta.original_filename;
    if (name != null && String(name).trim() !== '') return String(name).trim();
  }
  const z = currentState.value.zipFileName;
  if (z != null && String(z).trim() !== '') return String(z).trim();
  return '（已上傳）';
});

/** 上傳教材檔大小（後端為 MB）：優先 file_metadata.file_size，否則 Rag 表頂層 file_size */
const uploadZipFileSizeDisplay = computed(() => {
  const meta = fileMetadataToShow.value;
  const rag = currentRagItem.value;
  let raw;
  if (meta && typeof meta === 'object' && meta.file_size != null) raw = meta.file_size;
  else if (rag && typeof rag === 'object' && rag.file_size != null) raw = rag.file_size;
  return formatFileSize(raw, 'MB');
});

/** 唯讀顯示：檔名 + 全形括號內檔案大小（設定單元／純展示列） */
const uploadZipReadonlyInputValue = computed(() => {
  const name = String(uploadedZipDisplayName.value ?? '').trim();
  const size = String(uploadZipFileSizeDisplay.value ?? '').trim();
  if (!name && !size) return '—';
  if (size && name) return `${name}（${size}）`;
  if (size) return `（${size}）`;
  return name;
});

/** 右側欄：上傳檔名（已上傳 metadata 或本機選取；不含檔案大小） */
const designRightUploadFileLabel = computed(() => {
  const fromDisplay = String(uploadedZipDisplayName.value ?? '').trim();
  if (fromDisplay && fromDisplay !== '（已上傳）') return fromDisplay;
  const readonly = String(uploadZipReadonlyInputValue.value ?? '').trim();
  if (readonly && readonly !== '—') {
    const paren = readonly.indexOf('（');
    return paren > 0 ? readonly.slice(0, paren).trim() : readonly;
  }
  if (fromDisplay) return fromDisplay;
  return String(currentState.value.zipFileName ?? '').trim();
});

/** 建置前尚無設定單元時，主區提示文案 */
const packUnitEmptyStartHint = computed(() => {
  const name = String(designRightUploadFileLabel.value || uploadedZipDisplayName.value || '').trim();
  if (name && name !== '（已上傳）') return `${name} 已上傳，開始建立單元`;
  return '教材已上傳，開始建立單元';
});

/** 建置前尚無設定單元：主區空白引導（置中版面） */
const isPackEmptyStartView = computed(
  () => hasUploadedFileMetadata.value
    && !hasBuiltRagSummary.value
    && packUnitCarouselCountEffective.value === 0,
);

const {
  secondFoldersFull,
  ragListDisplayGroups,
  setPackUnitFolderGroup,
  removeFromRagList,
  removeRagListGroup,
  addRagListGroup,
  clearAllRagListGroups,
  addAllSecondFoldersAsGroups,
  setAllSecondFoldersAsSingleGroup,
} = usePackTasks(currentState, fileMetadataToShow, packGroupsEditBlocked);

const packFolderPickModalOpen = ref(false);
const packFolderPickGroupIdx = ref(null);
const packFolderPickDraft = ref([]);

function openPackFolderPickModal(gi) {
  if (packGroupsEditBlocked.value) return;
  const i = Number(gi);
  if (!Number.isFinite(i) || i < 0) return;
  packFolderPickGroupIdx.value = i;
  packFolderPickDraft.value = [...(ragListDisplayGroups.value[i] ?? [])];
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
  setPackUnitFolderGroup(gi, packFolderPickDraft.value);
  closePackFolderPickModal();
}

function firstFolderNameInGroup(group) {
  if (!Array.isArray(group) || group.length === 0) return '';
  return String(group[0] ?? '').trim();
}

function resolvePackUnitNavLabel(group, index, names) {
  const raw = names?.[index];
  if (raw != null && String(raw).length > 0) {
    return String(raw);
  }
  const folder = firstFolderNameInGroup(group);
  if (folder) return folder;
  if (Array.isArray(group) && group.length > 1) {
    return group.map((t) => String(t ?? '').trim()).filter(Boolean).join('+');
  }
  return `單元 ${Number(index) + 1}`;
}

/** 設定單元 Carousel：一次只顯示一個出題單元，以向前／向後切換 */
const activePackUnitIndex = ref(0);

const packUnitCarouselCount = computed(() => ragListDisplayGroups.value.length);

/** 可編輯／唯讀設定單元共用 Carousel 筆數 */
const packUnitCarouselCountEffective = computed(() =>
  hasBuiltRagSummary.value
    ? quizBankSettingReadonlyUnitRows.value.length
    : packUnitCarouselCount.value,
);

const activePackUnitGi = computed(() => {
  const n = packUnitCarouselCountEffective.value;
  if (n <= 0) return 0;
  return Math.min(Math.max(0, activePackUnitIndex.value), n - 1);
});

const activePackUnitGroup = computed(
  () => ragListDisplayGroups.value[activePackUnitGi.value] ?? [],
);

const packUnitTabsNavEl = ref(null);

function scrollActivePackUnitTabIntoView() {
  nextTick(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const scroller = packUnitTabsNavEl.value;
        if (!scroller) return;
        const gi = activePackUnitGi.value;
        const tabBtn = scroller.querySelector(`[data-pack-unit-tab-index="${gi}"]`);
        const item =
          tabBtn?.closest('li')
          ?? scroller.querySelector('.nav-link.active')?.closest('li');
        if (!item) return;

        const pad = 8;
        const scrollerRect = scroller.getBoundingClientRect();
        const itemRect = item.getBoundingClientRect();

        if (itemRect.left < scrollerRect.left + pad) {
          scroller.scrollTo({
            left: scroller.scrollLeft + itemRect.left - scrollerRect.left - pad,
            behavior: 'smooth',
          });
        } else if (itemRect.right > scrollerRect.right - pad) {
          scroller.scrollTo({
            left: scroller.scrollLeft + itemRect.right - scrollerRect.right + pad,
            behavior: 'smooth',
          });
        }
      });
    });
  });
}

watch(activePackUnitGi, scrollActivePackUnitTabIntoView, { flush: 'post' });
watch(packUnitCarouselCountEffective, scrollActivePackUnitTabIntoView, { flush: 'post' });

function selectPackUnit(index) {
  const n = packUnitCarouselCountEffective.value;
  if (n <= 0) return;
  const i = Number(index);
  if (!Number.isFinite(i) || i < 0 || i >= n) return;
  activePackUnitIndex.value = i;
  scrollActivePackUnitTabIntoView();
}

/** 左側單元列表：顯示名稱（自訂單元名稱 → 第一個資料夾 → 多資料夾以 + 連接 → 單元 N） */
const packUnitListItems = computed(() => {
  const groups = ragListDisplayGroups.value;
  const rawNames = currentState.value.packUnitNames;
  const names = Array.isArray(rawNames) ? rawNames.map((n) => String(n ?? '')) : [];
  return groups.map((group, index) => ({
    index,
    label: resolvePackUnitNavLabel(group, index, names),
  }));
});

watch(packUnitCarouselCountEffective, (n) => {
  if (n <= 0) {
    activePackUnitIndex.value = 0;
    return;
  }
  if (activePackUnitIndex.value >= n) {
    activePackUnitIndex.value = n - 1;
  }
});

function onAddPackUnitClick() {
  addRagListGroup();
  const n = packUnitCarouselCountEffective.value;
  if (n > 0) activePackUnitIndex.value = n - 1;
  scrollActivePackUnitTabIntoView();
}

/** 左側單元列表（唯讀建置完成後） */
const readonlyPackUnitListItems = computed(() =>
  quizBankSettingReadonlyUnitRows.value.map((row, index) => {
    const name = String(row.unitNameDisplay ?? '').trim();
    return {
      index,
      label: name && name !== '—' ? name : row.title,
    };
  }),
);

/** 唯讀設定單元 Carousel 目前列（切換由 right view 子分頁驅動） */
const activeReadonlyPackUnitRow = computed(
  () => quizBankSettingReadonlyUnitRows.value[activePackUnitGi.value] ?? null,
);

/** 左側單元列表：編輯中／唯讀共用 */
const packUnitListItemsForNav = computed(() =>
  hasBuiltRagSummary.value ? readonlyPackUnitListItems.value : packUnitListItems.value,
);

/** 建置前 left「設定單元」區塊標題：目前單元名稱 */
const activePackUnitDisplayLabel = computed(() => {
  const gi = activePackUnitGi.value;
  const group = ragListDisplayGroups.value[gi];
  return resolvePackUnitNavLabel(group, gi, currentState.value.packUnitNames);
});

/** 建置完成後 left「設定單元」區塊標題：目前單元名稱（非「設定單元 (n/total)」） */
const builtPackUnitSectionHeadingTitle = computed(() => {
  const row = activeReadonlyPackUnitRow.value;
  if (!row) return '—';
  const name = String(row.unitNameDisplay ?? '').trim();
  if (name && name !== '—') return name;
  const navItem = packUnitListItemsForNav.value[activePackUnitGi.value];
  if (navItem?.label) return navItem.label;
  const title = String(row.title ?? '').trim();
  return title || '—';
});

/** 設定單元題型區：unit_type 2／3／4 之內容與逐字稿（對齊 exam_design examSlotUnitTranscriptSection） */
const bankUnitTranscriptSection = computed(() => {
  const row = activeReadonlyPackUnitRow.value;
  if (!row) return null;
  const gi = activePackUnitGi.value;
  const state = currentState.value;
  const rag = currentRagItem.value;
  const rawTab = state.unitTabOrder?.[gi];
  const tab = rawTab ? tabWithResolvedTranscription(rawTab, gi, state, rag) : null;
  const ut = Number(row.unitType ?? tab?.unitType ?? UNIT_TYPE_RAG);
  if (ut !== UNIT_TYPE_TEXT && ut !== UNIT_TYPE_MP3 && ut !== UNIT_TYPE_YOUTUBE) return null;
  const transcription = resolveUnitSlotTranscription(gi, tab ?? {}, state, rag);
  const sourceDisplay =
    quizBankReadonlySourceDisplay(tab ?? {}) || String(row.sourceDisplay ?? '').trim() || '—';
  const youtubeHref =
    ut === UNIT_TYPE_YOUTUBE ? String(tab?.youtubeUrl ?? sourceDisplay ?? '').trim() : '';
  return { unitType: ut, transcription, sourceDisplay, youtubeHref, tab };
});

/** 文字／YouTube／MP3 單元：顯示單元內容區（對齊 exam_design examSlotShowUnitTranscriptUi） */
const bankShowUnitTranscriptUi = computed(() => bankUnitTranscriptSection.value != null);

const bankUnitTranscriptMdHtml = computed(() => {
  const sec = bankUnitTranscriptSection.value;
  if (!sec) return '';
  return renderMarkdownToSafeHtml(sec.transcription != null ? String(sec.transcription) : '');
});

const bankUnitYoutubeEmbedUrl = computed(() => {
  const sec = bankUnitTranscriptSection.value;
  if (!sec || sec.unitType !== UNIT_TYPE_YOUTUBE) return '';
  const raw = (sec.youtubeHref || sec.sourceDisplay || '').trim();
  return youtubeEmbedUrlFromInput(raw);
});

/** unit_type=3：RagTabUnitMp3Player 之 rag_tab_id、rag_unit_id */
const bankUnitMp3PlayerProps = computed(() => {
  const sec = bankUnitTranscriptSection.value;
  if (!sec || sec.unitType !== UNIT_TYPE_MP3) return null;
  const tab = sec.tab;
  if (!tab) return null;
  const ragTabId = String(tab.ragTabId ?? '').trim();
  const ru = tab.ragUnitDbId != null ? Number(tab.ragUnitDbId) : 0;
  if (!ragTabId || !Number.isFinite(ru) || ru < 1) return null;
  return { ragTabId, ragUnitId: ru };
});

/** 單元內容區：預設展開；切換單元時還原 */
const bankUnitContentCollapsed = ref(false);

function toggleBankUnitContentCollapsed() {
  bankUnitContentCollapsed.value = !bankUnitContentCollapsed.value;
}

watch(activeTabId, () => {
  activePackUnitIndex.value = 0;
});

watch(hasBuiltRagSummary, (built) => {
  activePackUnitIndex.value = 0;
  if (built) syncActiveUnitTabFromPackUnitCarousel();
});

watch(activePackUnitGi, () => {
  packUnitDetailModalOpen.value = false;
  bankUnitContentCollapsed.value = false;
});

function openPackUnitDetailModal() {
  if (!activeReadonlyPackUnitRow.value) return;
  packUnitDetailModalOpen.value = true;
}

function closePackUnitDetailModal() {
  packUnitDetailModalOpen.value = false;
}

/** 建置完成後：上方設定單元 tab 驅動「設定單元題型」之 activeUnitTabId */
function syncActiveUnitTabFromPackUnitCarousel() {
  if (!hasBuiltRagSummary.value) return;
  const state = currentState.value;
  const tabs = state.unitTabOrder ?? [];
  if (!tabs.length) {
    state.activeUnitTabId = null;
    return;
  }
  const i = Math.min(Math.max(0, activePackUnitGi.value), tabs.length - 1);
  const id = tabs[i]?.id;
  if (id != null && state.activeUnitTabId !== id) {
    state.activeUnitTabId = id;
  }
}

/** 還原 session 選取後，對齊上方設定單元 tab 索引 */
function syncPackUnitIndexFromActiveUnitTab() {
  if (!hasBuiltRagSummary.value) return;
  const tabs = currentState.value.unitTabOrder ?? [];
  if (!tabs.length) return;
  const activeId = String(currentState.value.activeUnitTabId ?? '');
  const idx = tabs.findIndex((t) => t.id === activeId);
  if (idx >= 0) activePackUnitIndex.value = idx;
}

watch(activePackUnitGi, syncActiveUnitTabFromPackUnitCarousel, { flush: 'post' });

watch(
  () => (hasBuiltRagSummary.value ? currentState.value.unitTabOrder : null),
  () => {
    syncActiveUnitTabFromPackUnitCarousel();
  },
  { deep: true, flush: 'post' },
);

// ─── Pack 任務：單元類型與 Chunk 設定 ─────────────────────────────────────────

function packUnitTypeAt(gi) {
  const group = currentState.value.packTasksList?.[gi];
  if (packGroupRequiresRagType(group)) return UNIT_TYPE_RAG;
  const raw = currentState.value.packUnitTypes?.[gi];
  return normalizePackUnitType(raw);
}

/** 多資料夾組合時僅 rag 可選，其餘類型按鈕 disable（仍顯示） */
function packUnitTypeOptionDisabled(gi, unitTypeValue) {
  const group = currentState.value.packTasksList?.[gi];
  if (packGroupRequiresRagType(group) && Number(unitTypeValue) !== UNIT_TYPE_RAG) return true;
  return false;
}

function isTranscriptPackUnitType(ut) {
  return ut === UNIT_TYPE_TEXT || ut === UNIT_TYPE_MP3 || ut === UNIT_TYPE_YOUTUBE;
}

/** 設定單元類型：數值與後端 unit_types／unit_type_list 對齊；順序 rag、文字、mp3、youtube；預設 rag */
const PACK_UNIT_TYPE_OPTIONS = [
  { value: UNIT_TYPE_RAG, label: 'RAG' },
  { value: UNIT_TYPE_TEXT, label: '文字' },
  { value: UNIT_TYPE_MP3, label: 'MP3' },
  { value: UNIT_TYPE_YOUTUBE, label: 'YouTube' },
];

function onPackUnitTypePick(gi, rawVal) {
  const v = Number(rawVal);
  if (!(v === UNIT_TYPE_RAG || v === UNIT_TYPE_TEXT || v === UNIT_TYPE_MP3 || v === UNIT_TYPE_YOUTUBE)) return;
  const state = currentState.value;
  if (packGroupRequiresRagType(state.packTasksList?.[gi]) && v !== UNIT_TYPE_RAG) return;
  const n = state.packTasksList?.length ?? 0;
  const next = parsePackUnitTypesFromRag(state.packUnitTypes, n);
  next[gi] = v;
  state.packUnitTypes = next;
  clearPackUnitPreviewAt(gi);
  if (isTranscriptPackUnitType(v)) {
    void loadPackUnitPreviewForType(gi, state.packTasksList?.[gi]);
  }
}

function onPackChunkSizeInput(gi, ev) {
  const state = currentState.value;
  ensurePackUnitSidecarArrays();
  const raw = ev?.target?.value;
  const arr = [...(state.packChunkSizes || [])];
  arr[gi] = raw === '' || raw == null
    ? DEFAULT_PACK_CHUNK_SIZE
    : Math.max(1, Math.floor(ensureNumber(raw, DEFAULT_PACK_CHUNK_SIZE)));
  state.packChunkSizes = arr;
}

function onPackChunkOverlapInput(gi, ev) {
  const state = currentState.value;
  ensurePackUnitSidecarArrays();
  const raw = ev?.target?.value;
  const arr = [...(state.packChunkOverlaps || [])];
  arr[gi] = raw === '' || raw == null
    ? DEFAULT_PACK_CHUNK_OVERLAP
    : Math.max(0, Math.floor(ensureNumber(raw, DEFAULT_PACK_CHUNK_OVERLAP)));
  state.packChunkOverlaps = arr;
}

function packUnitNavGroupCount() {
  return ragListDisplayGroups.value.length;
}

/** 對齊 packTasksList／packUnitNames 與畫面單元 list 筆數 */
function ensurePackUnitSlotsAligned() {
  const state = currentState.value;
  const n = packUnitNavGroupCount();
  if (n <= 0) return;
  if (!Array.isArray(state.packTasksList)) state.packTasksList = [];
  while (state.packTasksList.length < n) {
    state.packTasksList.push([]);
  }
  ensurePackUnitSidecarArrays();
}

function setPackUnitNameAt(gi, val) {
  ensurePackUnitSlotsAligned();
  const state = currentState.value;
  const n = packUnitNavGroupCount();
  if (gi < 0 || gi >= n) return;
  const arr = Array.isArray(state.packUnitNames)
    ? state.packUnitNames.map((name) => String(name ?? ''))
    : Array.from({ length: n }, () => '');
  while (arr.length < n) arr.push('');
  if (arr.length > n) arr.length = n;
  arr[gi] = String(val ?? '');
  state.packUnitNames = arr;
}

function openRenamePackUnitTab(gi) {
  if (packGroupsEditBlocked.value) return;
  const i = Number(gi);
  if (!Number.isFinite(i) || i < 0) return;
  renamePackUnitDraftIndex.value = i;
  renamePackUnitInitialName.value = resolvePackUnitNavLabel(
    ragListDisplayGroups.value[i],
    i,
    currentState.value.packUnitNames,
  );
  renamePackUnitError.value = '';
  renamePackUnitModalOpen.value = true;
}

function onRenamePackUnitSave(name) {
  if (!name || !String(name).trim()) {
    renamePackUnitError.value = '請輸入名稱';
    return;
  }
  const gi = renamePackUnitDraftIndex.value;
  if (gi == null || !Number.isFinite(gi) || gi < 0) {
    renamePackUnitError.value = '找不到此單元，請重新整理頁面後再試';
    return;
  }
  setPackUnitNameAt(gi, String(name).trim());
  renamePackUnitModalOpen.value = false;
}

function deletePackUnitAt(gi) {
  if (packGroupsEditBlocked.value) return;
  const i = Number(gi);
  if (!Number.isFinite(i) || i < 0) return;
  removeRagListGroup(i);
  const n = packUnitCarouselCountEffective.value;
  if (n <= 0) {
    activePackUnitIndex.value = 0;
  } else if (activePackUnitIndex.value >= n) {
    activePackUnitIndex.value = n - 1;
  }
  scrollActivePackUnitTabIntoView();
}

function packUnitLabelAt(gi) {
  const i = Number(gi);
  if (!Number.isFinite(i) || i < 0) return '';
  const group = ragListDisplayGroups.value[i];
  return resolvePackUnitNavLabel(group, i, currentState.value.packUnitNames);
}

function openDeletePackUnitModal(gi) {
  if (packGroupsEditBlocked.value) return;
  const i = Number(gi);
  if (!Number.isFinite(i) || i < 0) return;
  deletePackUnitDraftIndex.value = i;
  deletePackUnitModalOpen.value = true;
}

function closeDeletePackUnitModal() {
  deletePackUnitModalOpen.value = false;
  deletePackUnitDraftIndex.value = null;
}

function confirmDeletePackUnit() {
  const i = deletePackUnitDraftIndex.value;
  closeDeletePackUnitModal();
  if (i == null || !Number.isFinite(i) || i < 0) return;
  deletePackUnitAt(i);
}

const deletePackUnitConfirmMessage = computed(() => {
  const i = deletePackUnitDraftIndex.value;
  if (i == null || !Number.isFinite(i) || i < 0) return '確定要刪除此單元嗎？';
  const label = packUnitLabelAt(i);
  return label ? `確定要刪除「${label}」嗎？` : '確定要刪除此單元嗎？';
});

function openDeleteAllPackUnitsModal() {
  if (packGroupsEditBlocked.value) return;
  if (!(currentState.value.packTasksList || []).length) return;
  deleteAllPackUnitsModalOpen.value = true;
}

function closeDeleteAllPackUnitsModal() {
  deleteAllPackUnitsModalOpen.value = false;
}

function confirmDeleteAllPackUnits() {
  closeDeleteAllPackUnitsModal();
  if (packGroupsEditBlocked.value) return;
  clearAllRagListGroups();
  activePackUnitIndex.value = 0;
}

function ensurePackUnitSidecarArrays() {
  const s = currentState.value;
  const n = Math.max(s.packTasksList?.length ?? 0, packUnitNavGroupCount());
  const stretch = (key, emptyVal) => {
    let a = Array.isArray(s[key]) ? s[key] : [];
    if (a.length > n) {
      s[key] = a.slice(0, n);
      return;
    }
    if (a.length < n) {
      a = [...a];
      while (a.length < n) a.push(emptyVal);
      s[key] = a;
    }
  };
  stretch('packUnitMarkdownTexts', '');
  stretch('packUnitYoutubeUrls', '');
  stretch('packUnitMp3PreviewUrls', '');
  stretch('packUnitSourceFileLoading', false);
  stretch('packUnitTranscriptLoading', false);
  stretch('packUnitTranscriptLoaded', false);
  stretch('packUnitTranscriptError', '');
  stretch('packChunkSizes', DEFAULT_PACK_CHUNK_SIZE);
  stretch('packChunkOverlaps', DEFAULT_PACK_CHUNK_OVERLAP);
  stretch('packUnitNames', '');
}

function ragTabIdForTranscript() {
  return String(currentState.value.zipTabId ?? activeTabId.value ?? '').trim();
}

/** 單元名稱未填時，預設為該列資料夾組合的第一個資料夾名稱 */
function fillDefaultPackUnitNamesWhereEmpty() {
  ensurePackUnitSlotsAligned();
  const state = currentState.value;
  const groups = ragListDisplayGroups.value;
  if (!groups.length) return;
  const names = [...(state.packUnitNames || [])];
  let changed = false;
  for (let i = 0; i < groups.length; i++) {
    if (String(names[i] ?? '').trim() !== '') continue;
    const def = firstFolderNameInGroup(groups[i]);
    if (!def) continue;
    names[i] = def;
    changed = true;
  }
  if (changed) {
    state.packUnitNames = names;
  }
}

watch(
  () => currentState.value.packTasksList,
  (list, prevList) => {
    ensurePackUnitSlotsAligned();
    fillDefaultPackUnitNamesWhereEmpty();
    if (!Array.isArray(list)) return;
    const state = currentState.value;
    const prevTypes = parsePackUnitTypesFromRag(state.packUnitTypes, list.length);
    const enforced = enforcePackUnitTypesForFolderGroups(list, state.packUnitTypes);
    let typesChanged = false;
    for (let i = 0; i < enforced.length; i++) {
      if (enforced[i] !== prevTypes[i]) {
        typesChanged = true;
        if (isTranscriptPackUnitType(prevTypes[i]) && enforced[i] === UNIT_TYPE_RAG) {
          clearPackUnitPreviewAt(i);
        }
      }
    }
    if (typesChanged) state.packUnitTypes = enforced;
    for (let gi = 0; gi < list.length; gi++) {
      const ut = packUnitTypeAt(gi);
      if (!isTranscriptPackUnitType(ut)) continue;
      const folderNow = firstFolderNameInGroup(list[gi]);
      const folderWas =
        Array.isArray(prevList) && prevList[gi] != null ? firstFolderNameInGroup(prevList[gi]) : '';
      if (!folderNow) {
        clearPackUnitPreviewAt(gi);
        continue;
      }
      if (folderNow !== folderWas) {
        void loadPackUnitPreviewForType(gi, list[gi]);
      }
    }
  },
  { deep: true, immediate: true }
);

/** ZIP 上傳完成、rag_tab_id 就緒後，補載尚未取得逐字稿的 unit_type 2／3／4 單元 */
watch(
  () => ragTabIdForTranscript(),
  (id, prev) => {
    if (!id || id === prev) return;
    if (prev === undefined) return;
    const list = currentState.value.packTasksList;
    if (!Array.isArray(list)) return;
    for (let gi = 0; gi < list.length; gi++) {
      if (!isTranscriptPackUnitType(packUnitTypeAt(gi))) continue;
      if (!firstFolderNameInGroup(list[gi])) continue;
      if (packUnitTranscriptBusy(gi) || packUnitTranscriptReadyAt(gi)) continue;
      void loadPackUnitPreviewForType(gi, list[gi]);
    }
  }
);

function setPackUnitMarkdownAt(gi, text) {
  const s = currentState.value;
  ensurePackUnitSidecarArrays();
  const arr = [...s.packUnitMarkdownTexts];
  arr[gi] = text != null ? String(text) : '';
  s.packUnitMarkdownTexts = arr;
}

function setPackUnitYoutubeUrlAt(gi, url) {
  const s = currentState.value;
  ensurePackUnitSidecarArrays();
  const arr = [...s.packUnitYoutubeUrls];
  arr[gi] = url != null ? String(url) : '';
  s.packUnitYoutubeUrls = arr;
}

function revokePackUnitMp3PreviewUrl(url) {
  const s = String(url ?? '').trim();
  if (!s || !s.startsWith('blob:')) return;
  try {
    URL.revokeObjectURL(s);
  } catch {
    // ignore browser object URL revoke failures
  }
}

function setPackUnitMp3PreviewUrlAt(gi, url) {
  const s = currentState.value;
  ensurePackUnitSidecarArrays();
  const arr = [...s.packUnitMp3PreviewUrls];
  revokePackUnitMp3PreviewUrl(arr[gi]);
  arr[gi] = url != null ? String(url) : '';
  s.packUnitMp3PreviewUrls = arr;
}

function setPackUnitTranscriptLoadedAt(gi, loaded) {
  const s = currentState.value;
  ensurePackUnitSidecarArrays();
  const arr = [...s.packUnitTranscriptLoaded];
  arr[gi] = !!loaded;
  s.packUnitTranscriptLoaded = arr;
}

function setPackUnitSourceFileLoadingAt(gi, on) {
  const s = currentState.value;
  ensurePackUnitSidecarArrays();
  const sf = [...(s.packUnitSourceFileLoading || [])];
  sf[gi] = !!on;
  s.packUnitSourceFileLoading = sf;
}

function clearPackUnitPreviewAt(gi) {
  setPackUnitMarkdownAt(gi, '');
  setPackUnitYoutubeUrlAt(gi, '');
  setPackUnitMp3PreviewUrlAt(gi, '');
  setPackUnitSourceFileLoadingAt(gi, false);
  setPackUnitTranscriptLoadedAt(gi, false);
  const s = currentState.value;
  const err = [...(s.packUnitTranscriptError || [])];
  err[gi] = '';
  s.packUnitTranscriptError = err;
}

function packUnitTranscriptBusy(gi) {
  const st = currentState.value;
  const tl = !!(st.packUnitTranscriptLoading && st.packUnitTranscriptLoading[gi]);
  const sf = !!(st.packUnitSourceFileLoading && st.packUnitSourceFileLoading[gi]);
  return tl || sf;
}

function packUnitTranscriptLoadedAt(gi) {
  return !!(currentState.value.packUnitTranscriptLoaded && currentState.value.packUnitTranscriptLoaded[gi]);
}

function packUnitTranscriptTextAt(gi) {
  const raw = currentState.value.packUnitMarkdownTexts?.[gi];
  return raw != null ? String(raw) : '';
}

function packUnitTranscriptReadyAt(gi) {
  const ut = packUnitTypeAt(gi);
  if (!isTranscriptPackUnitType(ut)) return true;
  return packUnitTranscriptLoadedAt(gi) && packUnitTranscriptTextAt(gi).trim() !== '';
}

function missingPackUnitTranscriptIndexes(state = currentState.value) {
  const list = Array.isArray(state?.packTasksList) ? state.packTasksList : [];
  return list
    .map((_, i) => i)
    .filter((i) => isTranscriptPackUnitType(packUnitTypeAt(i)) && !packUnitTranscriptReadyAt(i));
}

function arePackUnitTranscriptsReadyForBuild(state = currentState.value) {
  return missingPackUnitTranscriptIndexes(state).length === 0;
}

/** 「開始建立單元」按鈕：unit_type 2／3／4 時須已取得非空逐字稿；另需資料夾就緒、不在載入中、未在建置中 */
const startPackUnitBuildDisabled = computed(() => {
  const st = currentState.value;
  return (
    packGroupsEditBlocked.value ||
    !isPackTasksListReady(st.packTasksList ?? []) ||
    !arePackUnitTranscriptsReadyForBuild(st) ||
    hasPackUnitTranscriptLoading.value ||
    !!st.packLoading
  );
});

function preparePackUnitTranscriptCall(gi, group) {
  const folder = firstFolderNameInGroup(group);
  const rag_tab_id = ragTabIdForTranscript();
  const personId = getPersonId(authStore);
  if (!folder || !rag_tab_id || !personId) return null;
  return { folder, rag_tab_id, personId };
}

const PACK_UNIT_TRANSCRIPT_ERROR_FALLBACK =
  '逐字稿讀取失敗：請確認已上傳教材 ZIP／資料夾名稱與 ZIP 內二層資料夾一致，且資料夾內有可作為逐字稿的內容。';

/** 將自動載入 transcript fetch 異常／空內容寫入對列（若有 Error.message 會一併顯示以利除錯） */
function packUnitPreviewTranscriptError(gi, caught) {
  const s = currentState.value;
  ensurePackUnitSidecarArrays();
  const arr = [...s.packUnitTranscriptError];
  let detail =
    caught instanceof Error
      ? String(caught.message ?? '').trim()
      : String(caught ?? '').trim();
  if (/^empty transcript$/i.test(detail))
    detail = '伺服器回傳的逐字稿為空（可能無對應 .md 或可讀欄位）；請檢查該資料夾內容。';
  if (detail && detail.length > 600) detail = `${detail.slice(0, 597)}…`;
  arr[gi] = detail ? `逐字稿讀取失敗：${detail}` : PACK_UNIT_TRANSCRIPT_ERROR_FALLBACK;
  s.packUnitTranscriptError = arr;
}

function youtubeUrlFromUnitUrlResponse(data) {
  if (!data || typeof data !== 'object') return '';
  const candidates = [
    data.youtube_url,
    data.youtubeUrl,
    data.url,
    data.watch_url,
    data.watchUrl,
    data.video_url,
    data.videoUrl,
  ];
  for (const c of candidates) {
    if (c != null && String(c).trim() !== '') return String(c).trim();
  }
  return '';
}

function packUnitYoutubeEmbedUrl(gi) {
  const raw = currentState.value.packUnitYoutubeUrls?.[gi];
  return youtubeEmbedUrlFromInput(raw != null ? String(raw) : '');
}

/**
 * unit_type 2／3／4 自動載入：GET `/rag/unit/text`、`/rag/unit/mp3-file`、`/rag/unit/youtube-url`；
 * 回應之 transcription（Markdown）寫入逐字稿編輯區（mp3／YouTube 另設定播放器預覽）。
 */
async function loadPackUnitPreviewForType(gi, group) {
  const ut = packUnitTypeAt(gi);
  if (!isTranscriptPackUnitType(ut)) return;

  const ctx = preparePackUnitTranscriptCall(gi, group);
  if (!ctx) {
    const s = currentState.value;
    ensurePackUnitSidecarArrays();
    const err = [...s.packUnitTranscriptError];
    const folder = firstFolderNameInGroup(group);
    if (!folder) err[gi] = '請先加入一個資料夾';
    else if (!ragTabIdForTranscript()) err[gi] = '請先上傳教材 ZIP';
    else if (!getPersonId(authStore)) err[gi] = '請先登入';
    s.packUnitTranscriptError = err;
    return;
  }

  ensurePackUnitSidecarArrays();
  setPackUnitSourceFileLoadingAt(gi, true);
  const errClear = [...currentState.value.packUnitTranscriptError];
  errClear[gi] = '';
  currentState.value.packUnitTranscriptError = errClear;
  try {
    let md = '';
    if (ut === UNIT_TYPE_TEXT) {
      const data = await apiRagUnitText({
        rag_tab_id: ctx.rag_tab_id,
        folder_name: ctx.folder,
        personId: ctx.personId,
      });
      md = ragUnitTranscriptionFromResponse(data);
    } else if (ut === UNIT_TYPE_MP3) {
      const payload = await apiRagUnitMp3FileByFolder({
        rag_tab_id: ctx.rag_tab_id,
        folder_name: ctx.folder,
        personId: ctx.personId,
      });
      if (!(payload.blob instanceof Blob) || payload.blob.size <= 0) throw new Error('empty audio');
      setPackUnitMp3PreviewUrlAt(gi, URL.createObjectURL(payload.blob));
      md = String(payload.transcription ?? '').trim();
    } else if (ut === UNIT_TYPE_YOUTUBE) {
      const ytData = await apiRagUnitYoutubeUrlByFolder({
        rag_tab_id: ctx.rag_tab_id,
        folder_name: ctx.folder,
        personId: ctx.personId,
      });
      const url = youtubeUrlFromUnitUrlResponse(ytData);
      if (!url || !youtubeEmbedUrlFromInput(url)) throw new Error('invalid youtube');
      setPackUnitYoutubeUrlAt(gi, url);
      md = ragUnitTranscriptionFromResponse(ytData);
    } else {
      throw new Error('不支援此單元類型的逐字稿載入');
    }
    if (!String(md ?? '').trim()) throw new Error('empty transcript');
    setPackUnitMarkdownAt(gi, md);
    setPackUnitTranscriptLoadedAt(gi, true);
    const errOk = [...currentState.value.packUnitTranscriptError];
    errOk[gi] = '';
    currentState.value.packUnitTranscriptError = errOk;
  } catch (e) {
    setPackUnitMarkdownAt(gi, '');
    setPackUnitTranscriptLoadedAt(gi, false);
    packUnitPreviewTranscriptError(gi, e);
  } finally {
    setPackUnitSourceFileLoadingAt(gi, false);
  }
}

// ─── RAG Tab 項目與 Unit（單元）解析 ──────────────────────────────────────────

/** Tab 列用：rag 項目含 _tabId、_label、_isExamRag（測驗用題型／整庫 for_exam：綠點且鎖刪） */
const ragItems = computed(() => {
  void ragTabExamHintByTabId.value;
  return ragList.value.map((r) => ({
    ...r,
    _tabId: r.rag_tab_id ?? r.id ?? r,
    _label: getRagTabLabel(r),
    _isExamRag: ragTabIsExamProtected(r, tabStateMap),
  }));
});
/** Tab 列用：新增 tab 項目含 id、label */
const newTabItems = computed(() =>
  newTabIds.value.map((tid) => ({
    id: tid,
    label: `未命名${quizBankNoun.value}`,
  }))
);

function firstRagQuizAnchorIdFromUnit(unit) {
  if (!unit || typeof unit !== 'object') return null;
  const directCandidates = [
    unit.rag_quiz_id,
    unit.template_rag_quiz_id,
    unit.anchor_rag_quiz_id,
    unit.anchorRagQuizId,
  ];
  for (const c of directCandidates) {
    const n = Number(c);
    if (Number.isFinite(n) && n > 0) return n;
  }
  let list = [];
  if (Array.isArray(unit.quizzes)) list = unit.quizzes;
  else if (Array.isArray(unit.quiz_list)) list = unit.quiz_list;
  else if (Array.isArray(unit.Quizzes)) list = unit.Quizzes;

  for (const q of list) {
    const id =
      q?.rag_quiz_id ?? q?.RagQuizId ?? q?.quiz_id ?? q?.exam_quiz_id ?? q?.id;
    const n = Number(id);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

function ragUnitIdFromRawUnit(unit) {
  if (!unit || typeof unit !== 'object') return null;
  const raw = unit.rag_unit_id ?? unit.unit_id ?? unit.id;
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** 來源／RAG ZIP 檔名：後端可能回 rag_file_name（Rag_Unit）；題目產生 fallback 仍會使用 */
function unitSourceFilename(unit) {
  if (!unit || typeof unit !== 'object') return '';
  const raw =
    unit.rag_file_name
    ?? unit.ragFileName
    ?? unit.filename
    ?? unit.rag_filename
    ?? unit.zip_filename;
  if (raw == null || String(raw).trim() === '') return '';
  return String(raw).trim();
}

/**
 * 文字單元來源檔名（unit_type=2／POST build-rag-zip output 之 transcript_md）。
 * 優先後端 `text_file_name`；若缺漏且為文字單元，後端可能將 .md 來源放在 `filename`（非 *_rag.zip）。
 */
function unitTextFileName(unit) {
  if (!unit || typeof unit !== 'object') return '';
  const raw = unit.text_file_name ?? unit.textFileName;
  if (raw != null && String(raw).trim() !== '') return String(raw).trim();
  const ut = Number(unit.unit_type ?? unit.unitType);
  const mode = String(unit.rag_mode ?? unit.ragMode ?? '').toLowerCase();
  const isTextUnit = ut === UNIT_TYPE_TEXT || mode === 'transcript_md';
  if (!isTextUnit) return '';
  const fn =
    unit.filename
    ?? unit.rag_filename
    ?? unit.rag_file_name
    ?? unit.ragFileName;
  if (fn == null || String(fn).trim() === '') return '';
  const s = String(fn).trim();
  if (/_rag\.zip$/i.test(s)) return '';
  return s;
}

function unitMp3FileName(unit) {
  if (!unit || typeof unit !== 'object') return '';
  const raw = unit.mp3_file_name ?? unit.mp3FileName;
  return raw != null && String(raw).trim() !== '' ? String(raw).trim() : '';
}

function unitYoutubeUrl(unit) {
  if (!unit || typeof unit !== 'object') return '';
  const raw = unit.youtube_url ?? unit.youtubeUrl;
  return raw != null && String(raw).trim() !== '' ? String(raw).trim() : '';
}

/** 後端資料夾組合字串（GET units／rag 內嵌 units 等；與 unit_list 之 + 連接語意一致） */
function folderCombinationFromUnitRaw(unit) {
  if (!unit || typeof unit !== 'object') return '';
  const raw = unit.folder_combination ?? unit.folderCombination;
  return raw != null && String(raw).trim() !== '' ? String(raw).trim() : '';
}

/**
 * 後端 folder_combination：`資料夾A/t資料夾B/t資料夾C`（以 `/t` 串多個資料夾名）；
 * 若無則將 fallback（unit_list 群組之「a + b」）拆成與拖曳 tag 相同的一列名稱。
 * @param {string} folderCombinationStr
 * @param {string} [fallbackFolderLine]
 * @returns {string[]}
 */
function parseFolderCombinationTags(folderCombinationStr, fallbackFolderLine) {
  const fc = String(folderCombinationStr ?? '').trim();
  if (fc) {
    if (fc.includes('/t')) {
      return fc.split('/t').map((s) => s.trim()).filter(Boolean);
    }
    if (/\t/.test(fc)) {
      return fc.split(/\t+/).map((s) => s.trim()).filter(Boolean);
    }
    if (fc.includes(' + ')) {
      return fc.split(/\s*\+\s*/).map((s) => s.trim()).filter(Boolean);
    }
    return [fc];
  }
  const line = String(fallbackFolderLine ?? '').trim();
  if (!line) return [];
  if (line.includes(' + ')) {
    return line.split(/\s*\+\s*/).map((s) => s.trim()).filter(Boolean);
  }
  return [line];
}

/** Rag_Unit／GET /rag/tab/units／build-rag-zip output：逐字稿欄位（含 NDJSON output.transcript_plain） */
function rawUnitTranscriptionString(unit) {
  if (!unit || typeof unit !== 'object') return '';
  const out = unit.output && typeof unit.output === 'object' ? unit.output : null;
  const candidates = [
    unit.transcription,
    unit.transcript,
    unit.transcript_plain,
    unit.transcriptPlain,
    unit.transcript_text,
    unit.transcriptText,
    out?.transcription,
    out?.transcript,
    out?.transcript_plain,
    out?.transcriptPlain,
  ];
  for (const c of candidates) {
    if (c != null && String(c).trim() !== '') return String(c).trim();
  }
  return '';
}

function normalizeUnitFromRagTabsRow(unit, fallbackTabId) {
  if (!unit || typeof unit !== 'object') return null;
  const rawName =
    unit.unit_name ??
    unit.rag_name ??
    unit.name ??
    unit.rag_unit_name;
  const name = String(rawName ?? '').trim();
  if (!name) return null;
  const tabId = String(unit.rag_tab_id ?? fallbackTabId ?? '').trim();
  const safeName = name.replace(/\+/g, '_');
  const anchorRagQuizId = firstRagQuizAnchorIdFromUnit(unit);
  const ragUnitId = ragUnitIdFromRawUnit(unit);
  const src = unitSourceFilename(unit);
  const transcription = rawUnitTranscriptionString(unit);
  const ut = Number(unit.unit_type ?? unit.unitType);
  const rag_mode = unit.rag_mode ?? unit.ragMode;
  const csRaw =
    unit.rag_chunk_size ?? unit.ragChunkSize ?? unit.chunk_size ?? unit.chunkSize;
  const coRaw =
    unit.rag_chunk_overlap ?? unit.ragChunkOverlap ?? unit.chunk_overlap ?? unit.chunkOverlap;
  return {
    rag_tab_id: tabId || safeName,
    filename: src || `${safeName}_rag.zip`,
    rag_name: String(unit.rag_name ?? name).trim() || safeName,
    unit_name: safeName,
    anchor_rag_quiz_id: anchorRagQuizId,
    rag_unit_id: ragUnitId,
    transcription,
    ...(Number.isFinite(ut) && ut > 0 ? { unit_type: ut } : {}),
    ...(rag_mode != null && String(rag_mode).trim() !== '' ? { rag_mode } : {}),
    text_file_name: unitTextFileName(unit),
    mp3_file_name: unitMp3FileName(unit),
    youtube_url: unitYoutubeUrl(unit),
    ...(csRaw != null && String(csRaw).trim() !== '' && !Number.isNaN(Number(csRaw))
      ? { rag_chunk_size: ensureNumber(csRaw, DEFAULT_PACK_CHUNK_SIZE) }
      : {}),
    ...(coRaw != null && String(coRaw).trim() !== '' && !Number.isNaN(Number(coRaw))
      ? { rag_chunk_overlap: ensureNumber(coRaw, DEFAULT_PACK_CHUNK_OVERLAP) }
      : {}),
    folder_combination: folderCombinationFromUnitRaw(unit),
  };
}

/** 當 rag 未內嵌 units[] 時，由 outputs／rag_metadata.outputs／unit_list 推導單元列（與出題下拉、build-rag-zip 一致；供單元 sub-tab） */
function fallbackUnitsRawFromRag(rag) {
  if (!rag || typeof rag !== 'object') return [];
  const sourceTabId = String(rag.rag_tab_id ?? '');
  const metaObj = parseRagMetadataObject(rag);
  const topOutputs = rag.outputs;
  const nestedOutputs = metaObj?.outputs;
  const outputs =
    Array.isArray(topOutputs) && topOutputs.length > 0
      ? topOutputs
      : Array.isArray(nestedOutputs) && nestedOutputs.length > 0
        ? nestedOutputs
        : null;
  if (outputs) {
    const rawUt = rag.unit_types ?? rag.unit_type_list;
    const typesArr = parsePackUnitTypesFromRag(rawUt, outputs.length);
    return outputs.map((o, idx) => {
      const derivedName = `${(o.rag_name ?? '').replace(/\+/g, '_')}`;
      const tabId =
        o.rag_tab_id != null && String(o.rag_tab_id).trim() !== ''
          ? String(o.rag_tab_id)
          : derivedName
            ? `${derivedName}_rag`
            : sourceTabId;
      const label = deriveRagName(o);
      const rawUnit =
        (o.unit_name != null && String(o.unit_name).trim() !== '')
          ? String(o.unit_name).trim()
          : (o.rag_name != null && String(o.rag_name).trim() !== '')
            ? String(o.rag_name).trim()
            : label;
      const unit_name = String(rawUnit || '').replace(/\+/g, '_') || label || sourceTabId;
      const transcription = rawUnitTranscriptionString(o);
      const utMerged = Number(o.unit_type ?? o.unitType ?? typesArr[idx]);
      const merged = {
        ...o,
        rag_tab_id: tabId,
        filename: o.filename ?? o.rag_filename ?? `${derivedName || label || 'RAG'}.zip`,
        rag_name: label,
        unit_name,
        transcription,
      };
      if (Number.isFinite(utMerged) && utMerged > 0) merged.unit_type = utMerged;
      const ragModeOut = merged.rag_mode ?? merged.ragMode;
      const folderCombo = folderCombinationFromUnitRaw(o);
      return {
        rag_tab_id: tabId,
        filename: merged.filename,
        rag_name: label,
        unit_name,
        transcription,
        ...(Number.isFinite(utMerged) && utMerged > 0 ? { unit_type: utMerged } : {}),
        ...(ragModeOut != null && String(ragModeOut).trim() !== '' ? { rag_mode: ragModeOut } : {}),
        text_file_name: unitTextFileName(merged),
        mp3_file_name: unitMp3FileName(merged),
        youtube_url: unitYoutubeUrl(merged),
        ...(folderCombo !== '' ? { folder_combination: folderCombo } : {}),
      };
    });
  }
  const ragListStr = getRagUnitListString(rag);
  if (!ragListStr) return [];
  return String(ragListStr)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((group) => {
      const ragName = group.replace(/\+/g, '_');
      return {
        rag_tab_id: sourceTabId || `${ragName}_rag`,
        filename: `${ragName}_rag.zip`,
        rag_name: ragName,
        unit_name: ragName,
      };
    });
}

function unitsFromRagTabsRow(rag) {
  if (!rag || typeof rag !== 'object') return [];
  const fallbackTabId = String(rag.rag_tab_id ?? rag.id ?? '').trim();
  let rows = extractUnitsFromRag(rag);
  if (!rows.length) {
    rows = fallbackUnitsRawFromRag(rag);
  } else {
    const rawUt = rag.unit_types ?? rag.unit_type_list;
    const typesArr = parsePackUnitTypesFromRag(rawUt, rows.length);
    rows = rows.map((u, i) => {
      const utMerged = Number(u.unit_type ?? u.unitType ?? typesArr[i]);
      if (!Number.isFinite(utMerged) || utMerged <= 0) return u;
      return { ...u, unit_type: utMerged };
    });
  }
  return rows
    .map((u) => normalizeUnitFromRagTabsRow(u, fallbackTabId))
    .filter(Boolean);
}

/** 從 /rag/tabs 的 outputs（頂層或 rag_metadata 內）或 unit_list 推導 generateQuizUnits（與 ExamPage／tab/build-rag-zip 一致） */
const generateQuizUnitsFromRag = computed(() => {
  const rag = currentRagItem.value;
  if (!rag || typeof rag !== 'object') return [];
  return unitsFromRagTabsRow(rag);
});

function unitTabLabelFromUnit(unit, index = 0) {
  const raw = String(unit?.unit_name ?? unit?.rag_name ?? '').trim();
  return raw || `單元 ${index + 1}`;
}

/** 單元「來源」列類型（與 POST build-rag-zip unit_types 對齊；未知或非 2／3／4 視為 RAG／PDF Office） */
function tabUnitTypeFromUnit(unit) {
  const utRaw = Number(unit?.unit_type ?? unit?.unitType);
  if (utRaw === UNIT_TYPE_TEXT || utRaw === UNIT_TYPE_MP3 || utRaw === UNIT_TYPE_YOUTUBE) return utRaw;
  return UNIT_TYPE_RAG;
}

function buildUnitTabItem(unit, index = 0) {
  const ragTabId = String(unit?.rag_tab_id ?? '').trim();
  const unitName = String(unit?.unit_name ?? unit?.rag_name ?? '').trim();
  const keyBase = unitName || unit?.rag_name || `idx-${index + 1}`;
  const anchorRagQuizId =
    unit?.anchor_rag_quiz_id != null
      ? Number(unit.anchor_rag_quiz_id)
      : firstRagQuizAnchorIdFromUnit(unit);
  const ragUnitId =
    unit?.rag_unit_id != null ? Number(unit.rag_unit_id) : ragUnitIdFromRawUnit(unit);
  const ruStable = Number.isFinite(ragUnitId) && ragUnitId > 0;
  const unitType = tabUnitTypeFromUnit(unit);
  const rs =
    unit.rag_chunk_size ?? unit.ragChunkSize ?? unit.chunk_size ?? unit.chunkSize;
  const ro =
    unit.rag_chunk_overlap ?? unit.ragChunkOverlap ?? unit.chunk_overlap ?? unit.chunkOverlap;
  const ragChunkSize =
    rs != null && !Number.isNaN(Number(rs)) ? ensureNumber(rs, DEFAULT_PACK_CHUNK_SIZE) : null;
  const ragChunkOverlap =
    ro != null && !Number.isNaN(Number(ro))
      ? ensureNumber(ro, DEFAULT_PACK_CHUNK_OVERLAP)
      : null;
  return {
    id: ruStable
      ? `${ragTabId || 'tab'}::ru-${ragUnitId}`
      : `${ragTabId || 'tab'}::${keyBase}::${index}`,
    label: unitTabLabelFromUnit(unit, index),
    generateQuizTabId: unitSelectValue(unit),
    unitName: unitName || unitTabLabelFromUnit(unit, index),
    ragName: String(unit?.rag_name ?? '').trim(),
    filename: unitSourceFilename(unit),
    unitType,
    ragTabId,
    anchorRagQuizId: Number.isFinite(anchorRagQuizId) && anchorRagQuizId > 0 ? anchorRagQuizId : null,
    ragUnitDbId: Number.isFinite(ragUnitId) && ragUnitId > 0 ? ragUnitId : null,
    transcription: rawUnitTranscriptionString(unit),
    textFileName: unitTextFileName(unit),
    mp3FileName: unitMp3FileName(unit),
    youtubeUrl: unitYoutubeUrl(unit),
    ragChunkSize,
    ragChunkOverlap,
    folderCombination: folderCombinationFromUnitRaw(unit),
  };
}

/** 設定單元子分頁：滿版下拉 value／label（UnitSelectDropdown）— 保留供 generateQuiz 等子流程使用 */

function setUnitSubTabsFromUnits(state, units) {
  const safeUnits = Array.isArray(units) ? units : [];
  const tabs = safeUnits.map((u, i) => buildUnitTabItem(u, i));
  state.unitTabOrder = tabs;
  if (!tabs.length) {
    state.activeUnitTabId = null;
    return;
  }
  const active = String(state.activeUnitTabId ?? '');
  if (!active || !tabs.some((t) => t.id === active)) {
    state.activeUnitTabId = tabs[0].id;
  }
}

const activeUnitTabItem = computed(() => {
  const tabs = currentState.value.unitTabOrder ?? [];
  const activeId = String(currentState.value.activeUnitTabId ?? '');
  if (!tabs.length || !activeId) return null;
  return tabs.find((t) => t.id === activeId) ?? null;
});

/** 先前出題 Modal（目前題型 sub-tab） */
const bankQuizHistoryModalOpen = ref(false);

function openBankQuizHistoryModal() {
  bankQuizHistoryModalOpen.value = true;
}


const bankQuizHistoryModalList = computed(() => {
  if (!bankQuizHistoryModalOpen.value) return [];
  const card = activeUnitQuizCard.value;
  if (isUnitQuizFollowupMode(activeUnitSlotIndex.value, card)) {
    return unitQuizFollowupHistoryListForDisplay(card);
  }
  return unitQuizHistoryListForDisplay(card);
});

const bankQuizHistoryModalIsFollowup = computed(() => {
  if (!bankQuizHistoryModalOpen.value) return false;
  return isUnitQuizFollowupMode(activeUnitSlotIndex.value, activeUnitQuizCard.value);
});

const bankQuizHistoryModalUnitLabel = computed(() => {
  const tabs = currentState.value.unitTabOrder ?? [];
  const t = tabs[activeUnitSlotIndex.value - 1];
  const lab = t ? String(t.unitName ?? t.label ?? '').trim() : '';
  return lab || '—';
});

const bankQuizHistoryModalQuizTypeLabel = computed(() => {
  const card = activeUnitQuizCard.value;
  return card ? quizTypeTabLabel(card) : '—';
});

/** 來源內容：純預覽 + 編輯 Modal */
const transcriptEditModalOpen = ref(false);
const transcriptEditModalGi = ref(0);
const transcriptEditModalDraft = ref('');

const transcriptEditModalDisabled = computed(
  () =>
    packGroupsEditBlocked.value
    || !packUnitTranscriptLoadedAt(transcriptEditModalGi.value)
    || packUnitTranscriptBusy(transcriptEditModalGi.value),
);

function openTranscriptEditModal(gi) {
  if (
    packGroupsEditBlocked.value
    || !packUnitTranscriptLoadedAt(gi)
    || packUnitTranscriptBusy(gi)
  ) return;
  transcriptEditModalGi.value = gi;
  transcriptEditModalDraft.value = packUnitTranscriptTextAt(gi);
  transcriptEditModalOpen.value = true;
}

function closeTranscriptEditModal() {
  transcriptEditModalOpen.value = false;
  transcriptEditModalDraft.value = '';
}

function applyTranscriptEditModal() {
  setPackUnitMarkdownAt(transcriptEditModalGi.value, transcriptEditModalDraft.value);
  closeTranscriptEditModal();
}

/** 出題／批改規則：列表區黑底白字預覽，按鈕開 Modal 編輯 */
const bankPromptEditModalOpen = ref(false);
const bankPromptEditModalKind = ref(/** @type {'quiz'|'grading'|''} */ (''));
const bankPromptEditModalDraft = ref('');

const bankPromptEditModalTitle = computed(() =>
  bankPromptEditModalKind.value === 'grading' ? '批改規則' : '出題規則',
);

const bankPromptEditModalSavingDisabled = computed(() => {
  if (bankPromptEditModalKind.value === 'quiz') {
    return !!getSlotFormState(activeUnitSlotIndex.value).unitQuizCreateLoading;
  }
  const card = activeUnitQuizCard.value;
  return (
    gradingSubmittingCardId.value != null
    && card
    && String(gradingSubmittingCardId.value) === String(card.id)
  );
});

const bankPromptEditModalResetDisabled = computed(() => {
  if (bankPromptEditModalSavingDisabled.value) return true;
  const card = activeUnitQuizCard.value;
  if (!card) return true;
  if (bankPromptEditModalKind.value === 'quiz') {
    return (
      String(bankPromptEditModalDraft.value ?? '')
      === String(card.quizUserPromptBaseline ?? '')
    );
  }
  if (bankPromptEditModalKind.value === 'grading') {
    return (
      String(bankPromptEditModalDraft.value ?? '')
      === String(card.gradingPromptBaseline ?? '')
    );
  }
  return true;
});

function resetBankPromptEditModalDraft() {
  const card = activeUnitQuizCard.value;
  if (!card) return;
  if (bankPromptEditModalKind.value === 'quiz') {
    bankPromptEditModalDraft.value = String(card.quizUserPromptBaseline ?? '');
  } else if (bankPromptEditModalKind.value === 'grading') {
    bankPromptEditModalDraft.value = String(card.gradingPromptBaseline ?? '');
  }
}

function openBankQuizUserPromptEditModal() {
  const card = activeUnitQuizCard.value;
  if (!card) return;
  if (getSlotFormState(activeUnitSlotIndex.value).unitQuizCreateLoading) return;
  bankPromptEditModalKind.value = 'quiz';
  bankPromptEditModalDraft.value = String(card.quizUserPromptText ?? '');
  bankPromptEditModalOpen.value = true;
}

function openBankGradingPromptEditModal() {
  const card = activeUnitQuizCard.value;
  if (!card) return;
  bankPromptEditModalKind.value = 'grading';
  bankPromptEditModalDraft.value = String(card.gradingPrompt ?? '');
  bankPromptEditModalOpen.value = true;
}

function closeBankPromptEditModal() {
  bankPromptEditModalOpen.value = false;
  bankPromptEditModalKind.value = '';
  bankPromptEditModalDraft.value = '';
}

function applyBankPromptEditModal() {
  const card = activeUnitQuizCard.value;
  if (card) {
    if (bankPromptEditModalKind.value === 'quiz') {
      card.quizUserPromptText = bankPromptEditModalDraft.value;
    } else if (bankPromptEditModalKind.value === 'grading') {
      card.gradingPrompt = bankPromptEditModalDraft.value;
    }
  }
  closeBankPromptEditModal();
}

function closePackBuildSuccessModal() {
  packBuildSuccessModalOpen.value = false;
}

const activeUnitSlotIndex = computed(() => {
  const tabs = currentState.value.unitTabOrder ?? [];
  const activeId = String(currentState.value.activeUnitTabId ?? '');
  const idx = tabs.findIndex((t) => t.id === activeId);
  return idx >= 0 ? idx + 1 : 1;
});

/** 目前單元槽對應之 rag_tab_id／rag_unit_id（供題卡狀態與 for-exam API 對齊 Rag_Quiz 關聯欄） */
function getRagQuizUnitMeta(slotIndex) {
  const state = currentState.value;
  const tabs = state.unitTabOrder ?? [];
  const t = tabs[slotIndex - 1];
  const ragTabId = t ? String(t.ragTabId ?? '').trim() : '';
  const ru = t?.ragUnitDbId != null ? Number(t.ragUnitDbId) : 0;
  return {
    rag_tab_id: ragTabId,
    rag_unit_id: Number.isFinite(ru) && ru >= 0 ? ru : 0,
  };
}

// ─── 題目卡片：for_exam 標記與 Quiz Sub-Tab 管理 ──────────────────────────────

/** 切換 Rag_Quiz.for_exam；「設為測驗用」置於題型區塊最下方常駐，未出題或未批改時按鈕 disabled（見 isRagQuizForExamToolbarButtonDisabled） */
async function onMarkRagQuizForExam(card) {
  if (!card || typeof card !== 'object') return;
  const personId = getPersonId(authStore);
  if (!personId) {
    alert('請先登入');
    return;
  }
  const rqid = positiveRagQuizIdFromQuizRow(card);
  if (rqid == null || rqid < 1) return;
  const slotIndex = activeUnitSlotIndex.value;
  const meta = getRagQuizUnitMeta(slotIndex);
  const rag = currentRagItem.value;
  const state = currentState.value;
  const nextForExam = !(card.rag_quiz_for_exam === true || card.rag_quiz_for_exam === 1);
  card.ragQuizForExamLoading = true;
  card.ragQuizForExamError = '';
  try {
    await apiMarkRagQuizForExam(
      {
        rag_quiz_id: rqid,
        rag_tab_id: String(card.rag_tab_id ?? meta.rag_tab_id ?? rag?.rag_tab_id ?? '').trim(),
        rag_unit_id: Number(card.rag_unit_id ?? meta.rag_unit_id),
        for_exam: nextForExam,
      },
      personId
    );
    card.rag_quiz_for_exam = nextForExam;
    const ragTabId =
      String(card.rag_tab_id ?? meta.rag_tab_id ?? '').trim()
      || String(rag?.rag_tab_id ?? activeTabId.value ?? state.zipTabId ?? '').trim();
    let ragUnitId =
      card.rag_unit_id != null && card.rag_unit_id !== ''
        ? Number(card.rag_unit_id)
        : Number(meta.rag_unit_id);
    if (!Number.isFinite(ragUnitId) || ragUnitId < 0) ragUnitId = 0;
    if (ragTabId) card.rag_tab_id = ragTabId;
    if (Number.isFinite(ragUnitId) && ragUnitId >= 1) card.rag_unit_id = ragUnitId;
    if (ragTabId) {
      if (nextForExam) {
        ragTabExamHintByTabId.value = { ...ragTabExamHintByTabId.value, [ragTabId]: true };
      } else if (!tabStateHasAnyRagQuizForExam(tabStateMap, ragTabId)) {
        const nextHint = { ...ragTabExamHintByTabId.value };
        delete nextHint[ragTabId];
        ragTabExamHintByTabId.value = nextHint;
      }
    }
  } catch (err) {
    card.ragQuizForExamError = err?.message || String(err);
  } finally {
    card.ragQuizForExamLoading = false;
  }
}

/** 單元題型列／草稿預設名稱（無後端 quiz_name、使用者未填時） */
const DEFAULT_UNIT_QUIZ_DISPLAY_NAME = '未命名題型';

/**
 * POST /rag/tab/unit/quiz/create 未附 quiz_name 時，後端常將 quiz_name 設為 unit_name；
 * 與前端草稿一致：建立後立刻 PUT quiz-name（失敗則略過，不阻斷新增／出題）。
 */
async function persistDefaultUnitQuizNameAfterCreate(ragQuizId, personId) {
  const id = Number(ragQuizId);
  if (!Number.isFinite(id) || id < 1) return;
  const pid = String(personId ?? '').trim();
  if (!pid) return;
  try {
    await apiUpdateRagQuizName(
      { rag_quiz_id: id, quiz_name: DEFAULT_UNIT_QUIZ_DISPLAY_NAME },
      pid
    );
  } catch {
    /* 後端不支援或網路錯誤時保留後端預設題名 */
  }
}

const activeUnitQuizCards = computed(() => {
  const state = currentState.value;
  const i = activeUnitSlotIndex.value - 1;
  const stacks = state.unitSlotQuizCards;
  if (!Array.isArray(stacks) || i < 0 || i >= stacks.length) return [];
  const row = stacks[i];
  return Array.isArray(row) ? row : [];
});

const hasUnitSubTabs = computed(() => (currentState.value.unitTabOrder ?? []).length > 0);

/** 題型 sub-tab 顯示文字：有題名用題名，否則預設「未命名題型」（不顯示題型編號） */
function quizTypeTabLabel(row) {
  const n = String(row?.quizName ?? '').trim();
  if (n) return n;
  return DEFAULT_UNIT_QUIZ_DISPLAY_NAME;
}

const activeUnitQuizTypeIdxResolved = computed(() => {
  const state = currentState.value;
  const cards = activeUnitQuizCards.value;
  let i = Number(state.activeUnitQuizTypeIndex ?? 0);
  if (!Array.isArray(cards) || cards.length === 0) return 0;
  if (!Number.isFinite(i) || i < 0 || i >= cards.length) return 0;
  return i;
});

function unitQuizCardsAtUnitIndex(unitIndex) {
  const stacks = currentState.value.unitSlotQuizCards;
  const i = Number(unitIndex);
  if (!Array.isArray(stacks) || !Number.isFinite(i) || i < 0 || i >= stacks.length) return [];
  const row = stacks[i];
  return Array.isArray(row) ? row : [];
}

/** 右側欄：設定單元子分頁；建置完成後各單元下嵌套「設定單元題型」之題型列 */
const designRightUnitSubTabItems = computed(() => {
  if (!hasUploadedFileMetadata.value) return [];
  const items = packUnitListItemsForNav.value;
  const activeUnitIdx = activePackUnitGi.value;
  const activeQuizIdx = activeUnitQuizTypeIdxResolved.value;
  const showQuizItems = hasBuiltRagSummary.value && (currentState.value.unitTabOrder ?? []).length > 0;

  return items.map((item) => {
    const unitIndex = item.index;
    const stack = showQuizItems ? unitQuizCardsAtUnitIndex(unitIndex) : [];
    const quizItems = stack.map((qRow, qi) => ({
      key: `pack-unit-${unitIndex}-quiz-${qRow.rag_quiz_id ?? qRow.id ?? qi}`,
      label: quizTypeTabLabel(qRow),
      unitIndex,
      quizIndex: qi,
      kind: 'unit-quiz',
      active: unitIndex === activeUnitIdx && qi === activeQuizIdx,
      forExam: isRagQuizMarkedForExam(qRow),
      followup: isUnitQuizFollowupMode(unitIndex + 1, qRow),
    }));
    return {
      key: `pack-unit-${item.index}-${item.label}`,
      label: String(item.label ?? '').trim() || `單元 ${Number(item.index) + 1}`,
      unitTypeLabel: packUnitTypeDisplayLabel(packUnitTypeAt(item.index)),
      index: item.index,
      kind: 'pack-unit',
      active: unitIndex === activeUnitIdx && quizItems.length === 0,
      quizItems,
    };
  });
});

function selectUnitQuizTypeForUnit(unitIndex, quizIndex) {
  const n = packUnitCarouselCountEffective.value;
  const ui = Number(unitIndex);
  const qi = Number(quizIndex);
  if (!Number.isFinite(ui) || ui < 0 || ui >= n) return;

  activePackUnitIndex.value = ui;
  syncActiveUnitTabFromPackUnitCarousel();

  const cards = unitQuizCardsAtUnitIndex(ui);
  if (!Array.isArray(cards) || !Number.isFinite(qi) || qi < 0 || qi >= cards.length) return;

  currentState.value.activeUnitQuizTypeIndex = qi;
  scrollActivePackUnitTabIntoView();
}

function onDesignRightSubTabClick(item) {
  if (!item) return;
  if (item.kind === 'pack-unit') selectPackUnit(item.index);
  if (item.kind === 'unit-quiz') selectUnitQuizTypeForUnit(item.unitIndex, item.quizIndex);
}

async function onDesignRightAddUnitQuiz(unitIndex) {
  const ui = Number(unitIndex);
  const slotIndex = ui + 1;
  if (!Number.isFinite(ui) || ui < 0 || slotIndex < 1) return;

  activePackUnitIndex.value = ui;
  syncActiveUnitTabFromPackUnitCarousel();
  await createBlankUnitQuiz(slotIndex);
}

const activeUnitQuizCard = computed(() => {
  const cards = activeUnitQuizCards.value;
  const i = activeUnitQuizTypeIdxResolved.value;
  if (!Array.isArray(cards) || cards.length === 0) return null;
  return cards[i] ?? null;
});

/** 題型區：已產出題幹（答案／批改子區塊與題幹 QuizCard 顯示條件） */
const activeUnitQuizHasGeneratedBody = computed(() => {
  const card = activeUnitQuizCard.value;
  if (!card) return false;
  return String(card.quiz ?? '').trim().length > 0;
});

/** 題型區 QuizCard 共用 bind（各子區塊另設 design-sub-block） */
const designUnitQuizCardBind = computed(() => {
  const card = activeUnitQuizCard.value;
  const slotIndex = activeUnitSlotIndex.value;
  return {
    card,
    slotIndex: activeUnitQuizTypeIdxResolved.value + 1,
    gradeSaveAllowed: canEnableUnitQuizGradeMerged(card, slotIndex),
    gradeDbAllowed: canEnableUnitQuizGradeMerged(card, slotIndex),
    currentRagId: currentRagIdForQuizCards.value,
    designEmbedded: true,
    hideSlotIndex: true,
    gradeSubmitting:
      gradingSubmittingCardId.value != null
      && card != null
      && String(gradingSubmittingCardId.value) === String(card.id),
    designUi: true,
    createExamBankDesignLayout: true,
    gradingPromptInModal: true,
    hintReferenceInModal: true,
    showBankQuizHistoryButton: true,
    showRagQuizForExamAction: true,
    hideRagQuizForExamToolbar: true,
  };
});

watch(activeUnitQuizCards, () => {
  const state = currentState.value;
  const cards = activeUnitQuizCards.value;
  if (!Array.isArray(cards) || cards.length === 0) {
    state.activeUnitQuizTypeIndex = 0;
    return;
  }
  let i = Number(state.activeUnitQuizTypeIndex ?? 0);
  if (!Number.isFinite(i) || i < 0 || i >= cards.length) {
    state.activeUnitQuizTypeIndex = 0;
  }
}, { deep: true });

watch(
  () => currentState.value.activeUnitTabId,
  () => {
    currentState.value.activeUnitQuizTypeIndex = 0;
  }
);

/** quiz_content（card.quiz）為空與否：出題規則欄皆為編輯器；空白列顯示「產生題目」等仍用此判斷（不依賴 showGenerateForm／草稿對齊；多筆各自綁 quizUserPromptText） */
function quizRowQuizEmpty(card) {
  return !String(card?.quiz ?? '').trim();
}

/** 題卡已標為試卷／測驗用 Rag_Quiz.for_exam */
function isRagQuizMarkedForExam(card) {
  if (!card || typeof card !== 'object') return false;
  return card.rag_quiz_for_exam === true || card.rag_quiz_for_exam === 1;
}

/**
 * 「設為測驗用」常駐顯示；不可操作時為 true。
 * — 標為測驗用後「取消設為測驗用」仍應可操作（不依賴當前有無題文／批改）。
 * — 標記前須已有題目與批改結果；送批改中／API 請求中也停用。
 */
function isRagQuizForExamToolbarButtonDisabled(card) {
  if (!card || typeof card !== 'object') return true;
  if (card.ragQuizForExamLoading) return true;
  if (
    gradingSubmittingCardId.value != null &&
    String(gradingSubmittingCardId.value) === String(card.id)
  ) {
    return true;
  }
  const raw = card.rag_quiz_id ?? card.quiz_id;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return true;

  if (isRagQuizMarkedForExam(card)) return false;

  const hasQuiz = String(card.quiz ?? '').trim() !== '';
  const hasGrade = String(card.gradingResult ?? '').trim() !== '';
  return !hasQuiz || !hasGrade;
}

/** 題卡與「上次載入／產生／批改成功」對齊之比對欄位（重設還原用） */
function syncQuizCardPromptBaselines(row) {
  if (!row || typeof row !== 'object') return;
  row.quizUserPromptBaseline = String(row.quizUserPromptText ?? '');
  row.gradingPromptBaseline = String(row.gradingPrompt ?? '');
  row.quizAnswerBaseline = String(row.quiz_answer ?? '');
}

function isQuizUserPromptDirty(card) {
  if (!card || typeof card !== 'object') return false;
  return (
    String(card.quizUserPromptText ?? '') !== String(card.quizUserPromptBaseline ?? '')
  );
}

/**
 * 單元槽位 LLM 出題錨定用之 rag_quiz_id（含列、草稿、卡、focal、子分頁 anchor）。
 * @param {number} slotIndex
 * @param {object | null} quizCardRow
 * @returns {number | null}
 */
function resolveUnitQuizRagQuizIdForLlm(slotIndex, quizCardRow) {
  const slotState = getSlotFormState(slotIndex);
  const tab = activeUnitTabItem.value;
  const state = currentState.value;
  const rqFromRow =
    quizCardRow != null && typeof quizCardRow === 'object'
      ? positiveRagQuizIdFromQuizRow(quizCardRow)
      : null;
  const draftN =
    parsePositiveQuizId(slotState.unitDraftRagQuizId)
    ?? parsePositiveQuizId(slotState.lastSuccessfulCreatedRagQuizId);
  const stack = Array.isArray(state.unitSlotQuizCards?.[slotIndex - 1])
    ? state.unitSlotQuizCards[slotIndex - 1]
    : [];
  const draftCard =
    draftN != null
      ? stack.find((c) => positiveRagQuizIdFromQuizRow(c) === draftN)
      : null;
  const slotCard = draftCard ?? state.cardList[slotIndex - 1];
  const fromCard = slotCard ? positiveRagQuizIdFromCard(slotCard) : null;
  const anchorTab = tab?.anchorRagQuizId != null ? parsePositiveQuizId(tab.anchorRagQuizId) : null;
  return (
    (rqFromRow != null && rqFromRow >= 1 ? rqFromRow : null)
    ?? draftN
    ?? fromCard
    ?? anchorTab
    ?? null
  );
}

/** 「儲存並產生題目」可按：須有非空白之出題規則，且出題規則內容須與 baseline 不同（已編輯） */
/** 出題模式：slot 與題卡 quizGenerateMode 同步；GET /rag/tabs、/rag/tab/units 之 follow_up 載入時寫入題卡 */
function resolveUnitQuizGenerateMode(slotIndex, card = null) {
  if (card != null && typeof card === 'object') {
    if (card.quizGenerateMode === 'followup') return 'followup';
    if (card.quizGenerateMode === 'normal') return 'normal';
    if (ragQuizApiRowIsFollowUp(card)) return 'followup';
  }
  return getSlotFormState(slotIndex).quizGenerateMode === 'followup' ? 'followup' : 'normal';
}

function isUnitQuizFollowupMode(slotIndex, card = null) {
  return resolveUnitQuizGenerateMode(slotIndex, card) === 'followup';
}

function setUnitQuizGenerateMode(slotIndex, mode, card = null) {
  const resolved = mode === 'followup' ? 'followup' : 'normal';
  getSlotFormState(slotIndex).quizGenerateMode = resolved;
  if (card && typeof card === 'object') {
    card.quizGenerateMode = resolved;
    card.follow_up = resolved === 'followup';
  }
}

/** 切換 Rag_Quiz.follow_up；無 rag_quiz_id 時僅更新本機狀態 */
async function onSetUnitQuizGenerateMode(slotIndex, mode, card = null) {
  if (!card || typeof card !== 'object') return;
  const resolved = mode === 'followup' ? 'followup' : 'normal';
  if (resolveUnitQuizGenerateMode(slotIndex, card) === resolved) return;

  const rqid = positiveRagQuizIdFromQuizRow(card);
  if (rqid == null || rqid < 1) {
    setUnitQuizGenerateMode(slotIndex, resolved, card);
    return;
  }

  const personId = getPersonId(authStore);
  if (!personId) {
    alert('請先登入');
    return;
  }

  const meta = getRagQuizUnitMeta(slotIndex);
  const rag = currentRagItem.value;
  const followup = resolved === 'followup';
  card.ragQuizFollowupLoading = true;
  card.ragQuizFollowupError = '';
  try {
    await apiSetRagQuizFollowup(
      {
        rag_quiz_id: rqid,
        rag_tab_id: String(card.rag_tab_id ?? meta.rag_tab_id ?? rag?.rag_tab_id ?? '').trim(),
        rag_unit_id: Number(card.rag_unit_id ?? meta.rag_unit_id),
        followup,
      },
      personId
    );
    setUnitQuizGenerateMode(slotIndex, resolved, card);
  } catch (err) {
    card.ragQuizFollowupError = err?.message || String(err);
  } finally {
    card.ragQuizFollowupLoading = false;
  }
}

function canEnableUnitQuizGenerate(card, slotIndex) {
  if (!card || typeof card !== 'object') return false;
  if (!promptTextForQuizRow(card, slotIndex)) return false;
  return isQuizUserPromptDirty(card);
}

/** 「產生題目」（llm-generate-db／llm-generate-followup-db）：須已有 rag_quiz_id，且曾成功「儲存並產生題目」或載入時後端已有出題規則；出題規則若與 baseline 不同（未儲存）則不可按 */
function canEnableUnitQuizGenerateFromDb(card, slotIndex) {
  if (!card || typeof card !== 'object') return false;
  if (card.hasUsedSaveAndGenerateOnce !== true) return false;
  if (isQuizUserPromptDirty(card)) return false;
  const rqid = resolveUnitQuizRagQuizIdForLlm(slotIndex, card);
  return rqid != null && rqid >= 1;
}

/** 「儲存並開始批改」可按：對齊 {@link canEnableUnitQuizGenerate}—trim 後非空批改規則且與 baseline 不同（不依賴 slot 回填，規則僅在題卡）。 */
function canEnableUnitQuizGrade(card, slotIndex) {
  void slotIndex;
  if (!card || typeof card !== 'object') return false;
  const gpTrim = String(card.gradingPrompt ?? '').trim();
  if (!gpTrim) return false;
  return String(card.gradingPrompt ?? '') !== String(card.gradingPromptBaseline ?? '');
}

/** 「開始批改」（llm-grade-db）：對齊 {@link canEnableUnitQuizGenerateFromDb}—hasUsedSaveAndGradeOnce、規則未改動、{@link resolveUnitQuizRagQuizIdForLlm} 有效 */
function canEnableUnitQuizGradeDb(card, slotIndex) {
  if (!card || typeof card !== 'object') return false;
  if (card.hasUsedSaveAndGradeOnce !== true) return false;
  if (String(card.gradingPrompt ?? '') !== String(card.gradingPromptBaseline ?? '')) return false;
  const rqid = resolveUnitQuizRagQuizIdForLlm(slotIndex, card);
  return rqid != null && rqid >= 1;
}

/** 「開始批改」（合併 llm-grade／llm-grade-db）：非空批改規則且（規則已改動或可走後端已存規則） */
function canEnableUnitQuizGradeMerged(card, slotIndex) {
  return canEnableUnitQuizGrade(card, slotIndex) || canEnableUnitQuizGradeDb(card, slotIndex);
}

async function confirmGradeMerged(item) {
  if (!item || typeof item !== 'object') return;
  const slotIndex = activeUnitSlotIndex.value;
  const dirty =
    String(item.gradingPrompt ?? '') !== String(item.gradingPromptBaseline ?? '');
  if (dirty || !canEnableUnitQuizGradeDb(item, slotIndex)) {
    return confirmAnswer(item);
  }
  return confirmAnswerGradeDb(item);
}

/** 該列出題文字：優先題卡本身，再以 slot（舊相容）回填 */
function promptTextForQuizRow(card, slotIndex) {
  const row = String(card?.quizUserPromptText ?? '').trim();
  if (row) return row;
  return String(getSlotFormState(slotIndex).quizUserPromptText ?? '').trim();
}

function extractQuizUserPromptText(raw) {
  if (!raw || typeof raw !== 'object') return '';
  const keys = [
    'quiz_user_prompt_text',
    'quizUserPromptText',
    'user_prompt_text',
    'userPromptText',
    'prompt_text',
    'promptText',
  ];
  for (const key of keys) {
    const val = raw[key];
    if (val == null) continue;
    const text = String(val);
    if (text.trim()) return text;
  }
  return '';
}

function syncSlotPromptFromCard(slotIndex) {
  const state = currentState.value;
  const slot = getSlotFormState(slotIndex);
  if (String(slot.quizUserPromptText ?? '').trim()) return;
  const unitStacks = state.unitSlotQuizCards?.[slotIndex - 1];
  if (Array.isArray(unitStacks) && unitStacks.length) {
    for (let i = unitStacks.length - 1; i >= 0; i--) {
      const c = unitStacks[i];
      const from =
        extractQuizUserPromptText(c)
        || extractQuizUserPromptText(c?.generateQuizResponseJson);
      if (from) {
        slot.quizUserPromptText = from;
        return;
      }
    }
  }
  const card = state.cardList[slotIndex - 1];
  if (!card) return;
  const fromCard =
    extractQuizUserPromptText(card)
    || extractQuizUserPromptText(card.generateQuizResponseJson);
  if (fromCard) slot.quizUserPromptText = fromCard;
}

function sortUnitQuizCardsByRagQuizId(list) {
  const arr = Array.isArray(list) ? [...list] : [];
  return arr.sort((a, b) => {
    const ia = positiveRagQuizIdFromQuizRow(a);
    const ib = positiveRagQuizIdFromQuizRow(b);
    return (Number.isFinite(ia) ? ia : 0) - (Number.isFinite(ib) ? ib : 0);
  });
}

/** 與兼容用 cardList[slot] 對齊：草稿 id 優先，否則最後一張有題幹者 */
function focalCardFromUnitQuizList(unitCards, slotForm) {
  const cards = Array.isArray(unitCards) ? unitCards : [];
  if (cards.length === 0) return null;
  const pid =
    parsePositiveQuizId(slotForm?.unitDraftRagQuizId)
    ?? parsePositiveQuizId(slotForm?.lastSuccessfulCreatedRagQuizId);
  if (pid != null && pid > 0) {
    const m = cards.find((c) => positiveRagQuizIdFromQuizRow(c) === pid);
    if (m) return m;
  }
  for (let i = cards.length - 1; i >= 0; i--) {
    const c = cards[i];
    if (String(c?.quiz ?? '').trim()) return c;
  }
  return cards[cards.length - 1];
}

/** 自 GET /rag/tabs 單筆灌入測試題卡：優先各 unit 的 quizzes[]，否則頂層 rag.quizzes */
function hydrateQuizCardsFromRag(rag, state) {
  const ragAnswers = rag.answers ?? [];
  const answersByQuizId = ragAnswers.reduce((acc, a) => {
    const id = examOrRagAnswerRowKey(a);
    if (!id) return acc;
    if (!acc[id]) acc[id] = [];
    acc[id].push(a);
    return acc;
  }, {});

  function stitchQuizRow(q, indexFallback) {
    const qKey = examOrRagQuizRowKey(q);
    const byId = q.answers ?? (qKey ? answersByQuizId[qKey] : undefined);
    const answers =
      (Array.isArray(byId) && byId.length > 0)
        ? byId
        : (ragAnswers[indexFallback] != null ? [ragAnswers[indexFallback]] : []);
    return { ...q, answers };
  }

  const rawUnits = extractUnitsFromRag(rag);
  /** 只要 RAG 帶得出單元列，就以每單元的 quizzes[] 灌入（長度可為 0）；無限多題對應為 unitSlotQuizCards[slot] 之多個 Card */
  const hasUnitRows = rawUnits.length > 0;

  if (hasUnitRows) {
    const metaParsed = parseRagMetadataObject(rag);
    const out0 = Array.isArray(rag.outputs) && rag.outputs.length > 0 ? rag.outputs[0] : metaParsed?.outputs?.[0];
    const packFirst = parsePackTasksList(getRagUnitListString(rag))[0]?.[0];
    const fallbackName = (packFirst ?? out0?.rag_name ?? '').trim();
    const ragIdFallback = rag.rag_id ?? rag.id;
    if (!state.unitSlotQuizCards) state.unitSlotQuizCards = [];
    const listOfLists = rawUnits.map((u, ui) => {
      const uqs = Array.isArray(u.quizzes) ? u.quizzes : [];
      if (uqs.length === 0) return [];
      const unitLabel = String(u.unit_name ?? u.rag_name ?? u.name ?? '').trim();
      const ragNameForCard = unitLabel || fallbackName || '';
      const built = uqs.map((qRaw) => {
        const qw = stitchQuizRow(qRaw, ui);
        const rn = ragNameForCard || String(qw.rag_name ?? '').trim();
        return buildCardFromRagQuiz(qw, rn, ragIdFallback);
      });
      return sortUnitQuizCardsByRagQuizId(built);
    });
    state.unitSlotQuizCards = listOfLists;
    state.showQuizGeneratorBlock = true;
    state.quizSlotsCount = rawUnits.length;
    state.cardList = listOfLists.map((lst, ui) =>
      focalCardFromUnitQuizList(lst, state.slotFormState?.[ui + 1])
    );
    return;
  }

  state.unitSlotQuizCards = [];

  const quizzes = rag.quizzes ?? [];
  if (quizzes.length > 0) {
    const quizzesWithAnswers = quizzes.map((q, i) => stitchQuizRow(q, i));
    const metaParsed = parseRagMetadataObject(rag);
    const out0 = Array.isArray(rag.outputs) && rag.outputs.length > 0 ? rag.outputs[0] : metaParsed?.outputs?.[0];
    const firstRagName = (parsePackTasksList(getRagUnitListString(rag))[0]?.[0] ?? out0?.rag_name ?? quizzes[0]?.rag_name ?? '').trim();
    state.showQuizGeneratorBlock = true;
    state.quizSlotsCount = quizzesWithAnswers.length;
    const ragIdFallback = rag.rag_id ?? rag.id;
    state.cardList = quizzesWithAnswers.map((q) => buildCardFromRagQuiz(q, q.rag_name ?? firstRagName, ragIdFallback));
    return;
  }

  state.quizSlotsCount = 0;
  state.cardList = [];
  state.unitSlotQuizCards = [];
}

/**
 * 自 GET /rag/tabs 欄位還原 rag_chunk_sizes／rag_chunk_overlaps（與 unit_list 群組同序）；
 * 若僅有舊版 chunk_* 或單一 rag_chunk_size／rag_chunk_overlap 則每群填入同值。
 * @returns {{ sizes: number[], overs: number[] }}
 */
function hydratePackChunkArraysFromRag(rag, groupCount) {
  const count = Math.max(0, Math.floor(Number(groupCount)) || 0);
  let sizes = [];
  let overs = [];
  const sizesArr = rag?.rag_chunk_sizes ?? rag?.chunk_sizes;
  if (Array.isArray(sizesArr) && sizesArr.length) {
    sizes = sizesArr.map((x) => ensureNumber(x, DEFAULT_PACK_CHUNK_SIZE));
  } else if ((rag?.rag_chunk_size ?? rag?.chunk_size) != null && count > 0) {
    const v = ensureNumber(rag?.rag_chunk_size ?? rag?.chunk_size, DEFAULT_PACK_CHUNK_SIZE);
    sizes = Array(count).fill(v);
  }
  const oversArr = rag?.rag_chunk_overlaps ?? rag?.chunk_overlaps;
  if (Array.isArray(oversArr) && oversArr.length) {
    overs = oversArr.map((x) => ensureNumber(x, DEFAULT_PACK_CHUNK_OVERLAP));
  } else if ((rag?.rag_chunk_overlap ?? rag?.chunk_overlap) != null && count > 0) {
    const v = ensureNumber(rag?.rag_chunk_overlap ?? rag?.chunk_overlap, DEFAULT_PACK_CHUNK_OVERLAP);
    overs = Array(count).fill(v);
  }
  if (count === 0) return { sizes: [], overs: [] };
  while (sizes.length < count) sizes.push(DEFAULT_PACK_CHUNK_SIZE);
  while (overs.length < count) overs.push(DEFAULT_PACK_CHUNK_OVERLAP);
  return {
    sizes: sizes.slice(0, count),
    overs: overs.slice(0, count),
  };
}

/** 設定單元唯讀：unit_type → 下拉同款文字 */
function packUnitTypeDisplayLabel(unitType) {
  const normalized = normalizePackUnitType(unitType);
  const hit = PACK_UNIT_TYPE_OPTIONS.find((o) => Number(o.value) === normalized);
  if (hit) return hit.label;
  return '文字';
}

/** 唯讀「設定單元」：RAG 分段參數顯示在與類型／來源檔同列（不外層縮排） */
function quizBankReadonlyOutlineChunkFields(ragChunkSize, ragChunkOverlap) {
  return [
    { label: '分段長度（字元）', value: String(ensureNumber(ragChunkSize, DEFAULT_PACK_CHUNK_SIZE)) },
    { label: '分段重疊（字元）', value: String(ensureNumber(ragChunkOverlap, DEFAULT_PACK_CHUNK_OVERLAP)) },
  ];
}

/** 唯讀「設定單元」：來源檔一行（與單元 tab 欄位對齊） */
function quizBankReadonlySourceDisplay(tab) {
  if (!tab || typeof tab !== 'object') return '';
  const ut = Number(tab.unitType ?? UNIT_TYPE_RAG);
  if (ut === UNIT_TYPE_TEXT) return String(tab.textFileName ?? '').trim();
  if (ut === UNIT_TYPE_MP3) return String(tab.mp3FileName ?? '').trim();
  if (ut === UNIT_TYPE_YOUTUBE) return String(tab.youtubeUrl ?? '').trim();
  if (ut === UNIT_TYPE_RAG) return String(tab.filename ?? '').trim();
  return '';
}

/**
 * 唯讀「設定單元」細節：MP3／YouTube 播放器／嵌入；逐字稿另以「逐字稿」開 Modal。
 * @returns {( { kind: 'text', text: string } | { kind: 'field', label: string, value: string } | { kind: 'markdown', markdown: string } | { kind: 'audio', ragTabId: string, ragUnitId: number } | { kind: 'youtube', embedSrc: string, pageUrl: string } | { kind: 'transcript_button', markdown: string } )[]}
 */
function buildQuizBankReadonlyDetailSegments(tab) {
  const ut = Number(tab?.unitType ?? UNIT_TYPE_RAG);
  const trRaw = String(tab?.transcription ?? '').trim();
  const trLen = trRaw.length;
  const personId = getPersonId(authStore);
  /** @type {( { kind: 'text', text: string } | { kind: 'field', label: string, value: string } | { kind: 'markdown', markdown: string } | { kind: 'audio', ragTabId: string, ragUnitId: number } | { kind: 'youtube', embedSrc: string, pageUrl: string } | { kind: 'transcript_button', markdown: string } )[]} */
  const segments = [];

  if (ut === UNIT_TYPE_RAG) {
    if (trLen) segments.push({ kind: 'transcript_button', markdown: trRaw });
    return segments;
  }
  if (ut === UNIT_TYPE_TEXT) {
    if (trLen) segments.push({ kind: 'markdown', markdown: trRaw });
    else segments.push({ kind: 'field', label: '逐字稿', value: '尚未載入或無內容' });
    return segments;
  }
  if (ut === UNIT_TYPE_MP3) {
    const rag_tab_id = String(tab.ragTabId ?? '').trim();
    const ru = tab.ragUnitDbId != null ? Number(tab.ragUnitDbId) : 0;
    if (personId && rag_tab_id && Number.isFinite(ru) && ru > 0) {
      segments.push({ kind: 'audio', ragTabId: rag_tab_id, ragUnitId: ru });
    }
    if (trLen) segments.push({ kind: 'transcript_button', markdown: trRaw });
    return segments;
  }
  if (ut === UNIT_TYPE_YOUTUBE) {
    const pageUrl = String(tab.youtubeUrl ?? '').trim();
    const embedSrc = youtubeEmbedUrlFromInput(pageUrl);
    segments.push({ kind: 'youtube', embedSrc, pageUrl });
    if (trLen) segments.push({ kind: 'transcript_button', markdown: trRaw });
    return segments;
  }
  return segments;
}

/** 唯讀「設定單元」逐字稿：API 省略全文時依本頁索引補 pack 稿／最近一次 build outputs／列表 rag.outputs */
function resolveUnitSlotTranscription(index, tabLike, state, rag) {
  const i = Number(index);
  const fromTab = rawUnitTranscriptionString(tabLike ?? {});
  if (fromTab) return fromTab;
  const md = state?.packUnitMarkdownTexts?.[i];
  if (md != null && String(md).trim() !== '') return String(md).trim();
  const packOutputs = Array.isArray(state?.packResponseJson?.outputs) ? state.packResponseJson.outputs : null;
  if (packOutputs && packOutputs[i] != null) {
    const t2 = rawUnitTranscriptionString(packOutputs[i]);
    if (t2) return t2;
  }
  if (rag && Array.isArray(rag.outputs) && rag.outputs[i] != null) {
    const t3 = rawUnitTranscriptionString(rag.outputs[i]);
    if (t3) return t3;
  }
  const metaParsed = rag ? parseRagMetadataObject(rag) : null;
  const nested = metaParsed?.outputs;
  if (Array.isArray(nested) && nested[i] != null) {
    const t4 = rawUnitTranscriptionString(nested[i]);
    if (t4) return t4;
  }
  return '';
}

function tabWithResolvedTranscription(tab, index, state, rag) {
  const tr = resolveUnitSlotTranscription(index, tab, state, rag);
  return { ...tab, transcription: tr };
}

/**
 * 打包建置區唯讀「設定單元」：優先現有 unit 子分頁列（後端／GET units 對齊）；
 * 若尚未載入 tabs，fallback 資料夾群組 + Rag 列表之 unit_types／rag_chunk_*。
 */
const quizBankSettingReadonlyUnitRows = computed(() => {
  const state = currentState.value;
  const rag = currentRagItem.value;
  const tabs = state.unitTabOrder ?? [];
  const nTabs = tabs.length;

  if (nTabs > 0) {
    const chunkHL = rag ? hydratePackChunkArraysFromRag(rag, nTabs) : { sizes: [], overs: [] };
    const groupsRo = ragListReadonlyGroups.value;
    return tabs.map((t, i) => {
      const tResolved = tabWithResolvedTranscription(t, i, state, rag);
      const srcDisp = quizBankReadonlySourceDisplay(tResolved);
      const ut = Number(t.unitType ?? UNIT_TYPE_RAG);
      const cs =
        t.ragChunkSize != null ? t.ragChunkSize : chunkHL.sizes[i] ?? DEFAULT_PACK_CHUNK_SIZE;
      const co =
        t.ragChunkOverlap != null ? t.ragChunkOverlap : chunkHL.overs[i] ?? DEFAULT_PACK_CHUNK_OVERLAP;
      const folderLineRo =
        Array.isArray(groupsRo[i]) && groupsRo[i].length
          ? groupsRo[i].filter(Boolean).join(' + ')
          : '';
      const fc = String(t.folderCombination ?? '').trim();
      const folderComboTags = parseFolderCombinationTags(fc, folderLineRo);
      const folderComboTitle =
        folderComboTags.length > 0
          ? folderComboTags.join(' + ')
          : (fc || folderLineRo || String(t?.label ?? `單元 ${i + 1}`).trim() || `單元 ${i + 1}`);
      return {
        key: String(t?.id ?? `idx-${i}`),
        title: folderComboTitle,
        folderComboTags,
        unitNameDisplay: String(t.unitName ?? t.label ?? '').trim() || '—',
        unitType: t.unitType,
        typeLabel: packUnitTypeDisplayLabel(t.unitType),
        sourceDisplay: srcDisp || '—',
        outlineChunkFields: ut === UNIT_TYPE_RAG ? quizBankReadonlyOutlineChunkFields(cs, co) : [],
        detailSegments: buildQuizBankReadonlyDetailSegments(tResolved),
      };
    });
  }

  const groups = ragListReadonlyGroups.value;
  if (!Array.isArray(groups) || groups.length === 0) return [];

  const types = rag
    ? parsePackUnitTypesFromRag(rag.unit_types ?? rag.unit_type_list, groups.length)
    : [];
  const chunkHL = rag ? hydratePackChunkArraysFromRag(rag, groups.length) : { sizes: [], overs: [] };
  const unitsRow = rag ? unitsFromRagTabsRow(rag) : [];

  return groups.map((g, i) => {
    const folderLine = Array.isArray(g) ? g.filter(Boolean).join(' + ') : '';
    const fcRow = String(unitsRow[i]?.folder_combination ?? '').trim();
    const rawT = Number(types[i]);
    const ut = rawT === 0 || rawT === 1 || rawT === 2 || rawT === 3 || rawT === 4 ? rawT : UNIT_TYPE_RAG;
    const ragChunkSizeRow = chunkHL.sizes[i] ?? DEFAULT_PACK_CHUNK_SIZE;
    const ragChunkOverlapRow = chunkHL.overs[i] ?? DEFAULT_PACK_CHUNK_OVERLAP;

    const synTab = unitsRow[i] != null ? buildUnitTabItem(unitsRow[i], i) : null;
    /** @type {( { kind: 'text', text: string } | { kind: 'field', label: string, value: string } | { kind: 'markdown', markdown: string } | { kind: 'audio', ragTabId: string, ragUnitId: number } | { kind: 'youtube', embedSrc: string, pageUrl: string } | { kind: 'transcript_button', markdown: string } )[]} */
    const folderFieldLine = fcRow || (folderLine.trim() ? folderLine : '');
    const folderComboTags = parseFolderCombinationTags(fcRow, folderLine);
    const folderFieldLineForDetail =
      folderComboTags.length > 0 ? folderComboTags.join(' + ') : (folderFieldLine || '—');
    let detailSegments = [{ kind: 'field', label: '資料夾', value: folderFieldLineForDetail }];
    let sourceDisplay = folderFieldLine || '—';
    /** @type {{ label: string, value: string }[]} */
    let outlineChunkFields = [];
    if (synTab) {
      const cs = synTab.ragChunkSize != null ? synTab.ragChunkSize : ragChunkSizeRow;
      const co = synTab.ragChunkOverlap != null ? synTab.ragChunkOverlap : ragChunkOverlapRow;
      const synResolved = tabWithResolvedTranscription(synTab, i, state, rag);
      const s = quizBankReadonlySourceDisplay(synResolved);
      if (String(s ?? '').trim() !== '') sourceDisplay = String(s).trim();
      const utSyn = Number(synResolved.unitType ?? UNIT_TYPE_RAG);
      if (utSyn === UNIT_TYPE_RAG) outlineChunkFields = quizBankReadonlyOutlineChunkFields(cs, co);
      detailSegments = [
        { kind: 'field', label: '資料夾', value: folderFieldLineForDetail },
        ...buildQuizBankReadonlyDetailSegments(synResolved),
      ];
    } else if (ut === UNIT_TYPE_RAG) {
      outlineChunkFields = quizBankReadonlyOutlineChunkFields(ragChunkSizeRow, ragChunkOverlapRow);
    }
    const synUnitName = synTab ? String(synTab.unitName ?? '').trim() : '';
    const unitFromRow = unitsRow[i] ? String(unitsRow[i].unit_name ?? '').trim() : '';
    const unitNameFromState = String(state.packUnitNames?.[i] ?? '').trim();
    const unitNameDisplay = synUnitName || unitFromRow || unitNameFromState || '—';
    const folderComboTitleFb =
      folderComboTags.length > 0
        ? folderComboTags.join(' + ')
        : (fcRow || folderLine || `設定單元 ${i + 1}`);
    return {
      key: `fb-${i}-${String(folderLine).slice(0, 32)}`,
      title: folderComboTitleFb,
      folderComboTags,
      unitNameDisplay,
      unitType: ut,
      typeLabel: packUnitTypeDisplayLabel(ut),
      sourceDisplay,
      outlineChunkFields,
      detailSegments,
    };
  });
});

/** 從 Rag 項目同步到 tab state（packTasks、ragMetadata、chunk、quizzes 等） */
function syncRagItemToState(rag, state) {
  if (!rag || typeof rag !== 'object') return;
  setUnitSubTabsFromUnits(state, unitsFromRagTabsRow(rag));
  const unitListStr = getRagUnitListString(rag);
  if (unitListStr) {
    state.packTasks = unitListStr;
    state.packTasksList = parsePackTasksList(state.packTasks);
    const rawUt = rag.unit_types ?? rag.unit_type_list;
    state.packUnitTypes = enforcePackUnitTypesForFolderGroups(
      state.packTasksList,
      parsePackUnitTypesFromRag(rawUt, state.packTasksList.length),
    );
  }
  if (rag.rag_metadata != null) {
    state.ragMetadata = typeof rag.rag_metadata === 'string' ? rag.rag_metadata : JSON.stringify(rag.rag_metadata, null, 2);
  }
  const nGroups = Array.isArray(state.packTasksList) ? state.packTasksList.length : 0;
  const chunkHL = hydratePackChunkArraysFromRag(rag, nGroups);
  state.packChunkSizes = chunkHL.sizes;
  state.packChunkOverlaps = chunkHL.overs;
  const unitsHydr = unitsFromRagTabsRow(rag);
  const listForNames = state.packTasksList;
  const packNamesHydr = [];
  for (let i = 0; i < nGroups; i++) {
    const u = unitsHydr[i];
    const fromApi = u ? String(u.unit_name ?? u.rag_name ?? '').trim() : '';
    const g = Array.isArray(listForNames) ? listForNames[i] : [];
    const fromGroup = firstFolderNameInGroup(g);
    packNamesHydr.push(fromApi || fromGroup || '');
  }
  state.packUnitNames = packNamesHydr;
  const filename = rag.file_metadata?.filename ?? rag.filename;
  if (filename != null && String(filename).trim() !== '') state.zipFileName = String(filename).trim();
  hydrateQuizCardsFromRag(rag, state);
  state._synced = true;
  applyPersistedUnitSubTabsIfActive(String(rag?.rag_tab_id ?? rag?.id ?? '').trim());
}

/** 僅在首次切換到該 RAG 分頁時自列表灌入狀態；已同步過的 tab 不再覆寫，保留使用者輸入 */
watch(
  activeTabId,
  (id) => {
    if (!id || isNewTabId(id)) return;
    const state = getTabState(id);
    if (state._synced) return;
    const rag = ragList.value.find(
      (r) => String(r.rag_tab_id ?? r.id ?? r) === String(id)
    );
    if (!rag) return;
    syncRagItemToState(rag, state);
  },
  { immediate: true }
);

watch(
  [activeTabId, hasBuiltRagSummary],
  async ([id, hasBuilt]) => {
    if (!id || isNewTabId(id) || !hasBuilt) return;
    try {
      await refreshUnitSubTabsFromApi(id);
    } catch {
      // 單元 sub tab 載入失敗不阻斷主流程，維持既有出題區可用
    }
  },
  { immediate: true }
);

/** 正整數 rag_quiz_id（字串數字相容） */
function parsePositiveQuizId(raw) {
  if (raw == null || raw === '') return null;
  if (typeof raw === 'boolean') return null;
  const n =
    typeof raw === 'number'
      ? raw
      : Number(typeof raw === 'string' ? raw.trim() : raw);
  if (!Number.isFinite(n) || n < 1) return null;
  return Math.floor(n);
}

/** 自 API／題卡解析已出題幹列表（去重、去空白；支援 JSON 字串） */
function parseQuizHistoryListFromSource(source) {
  let list = source;
  if (source && typeof source === 'object' && !Array.isArray(source)) {
    list = source.quiz_history_list ?? source.quizHistoryList;
  }
  if (typeof list === 'string') {
    const trimmed = list.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        list = Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    } else {
      return [];
    }
  }
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const out = [];
  for (const item of list) {
    const s = String(item ?? '').trim();
    if (!s || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

/** 供追問 llm-generate-followup：含儲存歷史與當前問答（重新產生／繼續追問時接續） */
function unitQuizFollowupHistoryListForLlm(quizCardRow) {
  const seen = new Set();
  const out = [];
  const push = (item) => {
    const normalized = normalizeFollowupHistoryItem(item);
    if (!normalized) return;
    const key = [
      normalized.quiz_content,
      normalized.answer_content,
      normalized.quiz_answer_reference,
      normalized.answer_critique,
    ].join('\0');
    if (seen.has(key)) return;
    seen.add(key);
    out.push(normalized);
  };
  parseFollowupHistoryListFromSource(quizCardRow).forEach(push);
  if (quizCardRow && typeof quizCardRow === 'object') {
    push(followupHistoryEntryFromQuizCard(quizCardRow));
  }
  return out;
}

/** 供 Modal：追問模式過去問答（不含當前題） */
function unitQuizFollowupHistoryListForDisplay(quizCardRow) {
  return parseFollowupHistoryListFromSource(quizCardRow);
}

/** 將舊問答併入追問歷史（重新產生前） */
function appendFollowupToQuizHistory(existingHistory, pair) {
  const entry = normalizeFollowupHistoryItem(pair) ?? followupHistoryEntryFromQuizCard(pair);
  const base = parseFollowupHistoryListFromSource(existingHistory);
  if (!entry?.quiz_content) return base;
  const key = [
    entry.quiz_content,
    entry.answer_content,
    entry.quiz_answer_reference,
    entry.answer_critique,
  ].join('\0');
  if (base.some((item) => [
    item.quiz_content,
    item.answer_content,
    item.quiz_answer_reference,
    item.answer_critique,
  ].join('\0') === key)) return base;
  return [...base, entry];
}

/** 供 Modal：目前題型 tab 過去出過的題幹（不含當前題幹） */
function unitQuizHistoryListForDisplay(quizCardRow) {
  return parseQuizHistoryListFromSource(quizCardRow);
}

/** 供 llm-generate：含儲存歷史與當前題幹（重新產生時避免重複） */
function unitQuizHistoryListForLlm(quizCardRow) {
  const seen = new Set();
  const out = [];
  const push = (stem) => {
    const s = String(stem ?? '').trim();
    if (!s || seen.has(s)) return;
    seen.add(s);
    out.push(s);
  };
  parseQuizHistoryListFromSource(quizCardRow).forEach(push);
  if (quizCardRow && typeof quizCardRow === 'object') {
    push(quizCardRow.quiz);
  }
  return out;
}

/** 將舊題幹併入歷史（重新產生前） */
function appendStemToQuizHistory(existingHistory, stem) {
  const s = String(stem ?? '').trim();
  const base = Array.isArray(existingHistory)
    ? parseQuizHistoryListFromSource(existingHistory)
    : parseQuizHistoryListFromSource(existingHistory);
  if (!s) return base;
  if (base.includes(s)) return base;
  return [...base, s];
}

/** 自題目列／題卡取下正整數 rag_quiz_id（llm-generate 錨點；相容後端別名） */
function positiveRagQuizIdFromQuizRow(quizOrCard) {
  if (!quizOrCard || typeof quizOrCard !== 'object') return null;
  const keys = ['rag_quiz_id', 'quiz_id', 'ragQuizId', 'quizId'];
  for (const k of keys) {
    const v = quizOrCard[k];
    if (v == null || v === '') continue;
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) return n;
  }
  const idFallback = quizOrCard.id;
  if (idFallback != null && idFallback !== '') {
    const n = Number(idFallback);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

/** 題卡本體優先，其次產題 API 回覆（generateQuizResponseJson） */
function positiveRagQuizIdFromCard(card) {
  const direct = positiveRagQuizIdFromQuizRow(card);
  if (direct != null) return direct;
  const gj = card?.generateQuizResponseJson;
  if (gj != null && typeof gj === 'object') return positiveRagQuizIdFromQuizRow(gj);
  return null;
}

/** 由 /rag/tabs 的 quiz 組題卡：批改優先 quiz.answers 末筆；若無則讀列上 answer_content／quiz_score／answer_critique（Rag_Quiz 內嵌欄位） */
function buildCardFromRagQuiz(quiz, ragName, ragIdFallback) {
  const answers = Array.isArray(quiz.answers) ? quiz.answers : [];
  const latestAnswer = answers.length > 0 ? answers[answers.length - 1] : null;
  const latestSubmitted =
    latestAnswer?.quiz_answer ?? latestAnswer?.student_answer ?? null;
  const critStr = quiz.answer_critique != null ? String(quiz.answer_critique).trim() : '';
  const embeddedScore = quiz.quiz_score;
  const hasEmbeddedScore =
    embeddedScore != null && String(embeddedScore).trim() !== '';
  const answerContentStr = quiz.answer_content != null ? String(quiz.answer_content) : '';
  const useInlineGrading = !latestAnswer && (critStr !== '' || hasEmbeddedScore);

  let quiz_answer;
  if (latestAnswer) {
    quiz_answer =
      latestSubmitted != null && String(latestSubmitted).trim() !== ''
        ? String(latestSubmitted)
        : '';
  } else if (answerContentStr.trim() !== '') {
    quiz_answer = answerContentStr;
  } else {
    quiz_answer = '';
  }

  let gradingResult = '';
  let gradingResponseJson = null;
  let confirmed = false;
  let answer_id = null;

  if (latestAnswer) {
    gradingResult =
      formatGradingResult(JSON.stringify(latestAnswer)) ||
      (latestSubmitted != null && String(latestSubmitted).trim() !== '' ? '已批改' : '');
    confirmed = true;
    gradingResponseJson = latestAnswer;
    answer_id = latestAnswer?.answer_id ?? latestAnswer?.rag_answer_id ?? null;
  } else if (useInlineGrading) {
    if (critStr !== '') {
      gradingResult = formatGradingResult(critStr) || '';
    }
    if (!gradingResult && hasEmbeddedScore) {
      gradingResult = `總分：${embeddedScore} / 5`;
    }
    confirmed = true;
    const parsedCritique =
      critStr !== ''
        ? (() => {
            try {
              return JSON.parse(critStr);
            } catch {
              return null;
            }
          })()
        : null;
    gradingResponseJson =
      parsedCritique && typeof parsedCritique === 'object'
        ? parsedCritique
        : {
            quiz_score: embeddedScore,
            answer_critique: quiz.answer_critique,
            answer_content: quiz.answer_content,
          };
    answer_id = quiz.rag_answer_id ?? null;
  }

  const gradingPrompt = String(
    quiz.answer_user_prompt_text
    ?? quiz.answerUserPromptText
    ?? quiz.grading_prompt
    ?? quiz.gradingPrompt
    ?? '',
  ).trim();
  const rid = quiz.rag_id ?? quiz.ragId ?? ragIdFallback;
  const ragIdStr = rid != null && String(rid).trim() !== '' ? String(rid) : null;
  const fe =
    quiz.for_exam === true
    || quiz.for_exam === 1
    || quiz.rag_quiz_for_exam === true
    || quiz.rag_quiz_for_exam === 1;
  const rtid = quiz.rag_tab_id != null ? String(quiz.rag_tab_id).trim() : '';
  const ruidRaw = quiz.rag_unit_id != null ? Number(quiz.rag_unit_id) : NaN;
  const ruid = Number.isFinite(ruidRaw) && ruidRaw >= 0 ? ruidRaw : 0;
  const rawQuizName = String(quiz.quiz_name ?? quiz.quizName ?? '').trim();
  const quizNameResolved =
    rawQuizName !== '' ? rawQuizName : DEFAULT_UNIT_QUIZ_DISPLAY_NAME;
  const quizUserPromptTextResolved = extractQuizUserPromptText(quiz);
  const hasUsedSaveAndGenerateOnce =
    String(quizUserPromptTextResolved ?? '').trim() !== '';
  const hasUsedSaveAndGradeOnce = gradingPrompt !== '';
  const personId = getPersonId(authStore);
  const quiz_history_list = resolveQuizHistoryForRagQuiz(personId, quiz);
  const card = {
    id: nextCardId(),
    quiz: quiz.quiz_content ?? '',
    hint: quiz.quiz_hint ?? '',
    referenceAnswer: quiz.quiz_answer_reference ?? quiz.quiz_reference_answer ?? '',
    sourceFilename: quiz.file_name ?? null,
    ragName: (ragName || quiz.rag_name || '').trim() || null,
    rag_id: ragIdStr,
    quiz_answer,
    hintVisible: false,
    referenceAnswerVisible: false,
    confirmed,
    gradingResult,
    gradingResponseJson,
    generateQuizResponseJson: null,
    quizUserPromptText: quizUserPromptTextResolved,
    /** 曾成功「儲存並產生題目」或載入時後端已有出題規則時為 true，供「產生題目」（llm-generate-db）按鈕可啟用 */
    hasUsedSaveAndGenerateOnce,
    /** 曾成功「儲存並開始批改」或載入時後端已有批改規則時為 true，供「開始批改」（llm-grade-db）可啟用 */
    hasUsedSaveAndGradeOnce,
    rag_quiz_id: positiveRagQuizIdFromQuizRow(quiz),
    rag_tab_id: rtid,
    rag_unit_id: ruid,
    rag_quiz_for_exam: fe,
    ragQuizForExamLoading: false,
    ragQuizForExamError: '',
    ragQuizFollowupLoading: false,
    ragQuizFollowupError: '',
    answer_id,
    gradingPrompt,
    quizName: quizNameResolved,
    quiz_history_list,
    quiz_followup_history_list: parseFollowupHistoryListFromSource(quiz),
    ...(hasUsedSaveAndGenerateOnce
      ? { quizGenerateMode: ragQuizApiRowIsFollowUp(quiz) ? 'followup' : 'normal' }
      : {}),
  };
  syncQuizCardPromptBaselines(card);
  if (quiz_history_list.length > 0) {
    persistQuizHistoryForRagQuiz(personId, card.rag_quiz_id, quiz_history_list);
  }
  return card;
}

/** 單元下拉預設不選；清單變動時用 unit_name／rag_tab_id 重新對齊選取（避免無匹配 value 時 select 誤顯示第一筆） */
watch(generateQuizUnits, (units) => {
  const state = currentState.value;
  reconcileQuizUnitSelectSlot(state, units);
  const count = state.quizSlotsCount || 0;
  for (let i = 1; i <= count; i++) {
    reconcileQuizUnitSelectSlot(state.slotFormState?.[i], units);
  }
}, { immediate: true });

watch(
  () => currentState.value.unitTabOrder,
  (tabs) => {
    const state = currentState.value;
    const list = Array.isArray(tabs) ? tabs : [];
    if (!list.length) return;
    state.showQuizGeneratorBlock = true;
    state.quizSlotsCount = Math.max(state.quizSlotsCount || 0, list.length);
    while (state.cardList.length < state.quizSlotsCount) {
      state.cardList.push(null);
    }
    for (let i = 0; i < list.length; i++) {
      const tab = list[i];
      const slot = getSlotFormState(i + 1);
      if (!String(slot.generateQuizTabId ?? '').trim()) {
        slot.generateQuizTabId = tab.generateQuizTabId;
      }
    }
  },
  { immediate: true, deep: true }
);

watch(activeUnitTabItem, (tab) => {
  if (!tab) return;
  const slot = getSlotFormState(activeUnitSlotIndex.value);
  if (!slot) return;
  slot.generateQuizTabId = tab.generateQuizTabId;
  syncSlotPromptFromCard(activeUnitSlotIndex.value);
});

watch(
  () => currentState.value.cardList,
  () => {
    syncSlotPromptFromCard(activeUnitSlotIndex.value);
  },
  { deep: true, immediate: true }
);

watch(
  () => currentState.value.unitSlotQuizCards,
  () => {
    syncSlotPromptFromCard(activeUnitSlotIndex.value);
  },
  { deep: true, immediate: true }
);

/** 有 RAG 資料時預設選第一個 tab；若 session 有合法上次選擇則還原該頂層 tab */
watch(ragList, (list) => {
  if (list.length === 0 || activeTabId.value != null) return;
  const personId = getPersonId(authStore);
  const persisted = personId ? readCreateBankTabUiPersisted(personId) : null;
  const pick =
    persisted?.rag_tab_id
    && ragTabIdExistsInBankLists(persisted.rag_tab_id, list, newTabIds.value)
      ? persisted.rag_tab_id
      : null;
  activeTabId.value = pick ?? (list[0].rag_tab_id ?? list[0].id ?? list[0]);
}, { immediate: true });

watch(
  [
    activeTabId,
    () => currentState.value.activeUnitTabId,
    () => currentState.value.activeUnitQuizTypeIndex,
  ],
  () => {
    persistCreateBankTabUiSelection();
  },
  { flush: 'post' }
);

async function refreshUnitSubTabsFromApi(tabId) {
  const state = getTabState(tabId);
  const personId = getPersonId(authStore);
  if (!personId || !tabId || isNewTabId(tabId)) {
    setUnitSubTabsFromUnits(state, []);
    return [];
  }
  let units = [];
  try {
    units = await apiGetRagTabUnits(tabId, personId);
  } catch {
    units = [];
  }
  if (!Array.isArray(units) || units.length === 0) {
    const rag = ragList.value.find((r) => String(r?.rag_tab_id ?? r?.id ?? r) === String(tabId));
    units = unitsFromRagTabsRow(rag);
  }
  setUnitSubTabsFromUnits(state, units);
  const ragRow = ragList.value.find((r) => String(r?.rag_tab_id ?? r?.id ?? r) === String(tabId));
  if (
    ragRow
    && Array.isArray(units)
    && units.length > 0
  ) {
    hydrateQuizCardsFromRag({ ...ragRow, units }, state);
  }
  applyPersistedUnitSubTabsIfActive(String(tabId));
  return units;
}

/** GET /rag/tabs 由 useRagList 內 watch(immediate) 首次載入；每次從側欄再進入本頁（KeepAlive onActivated）再抓 GET /rag/tabs */
const createBankActivatedOnce = ref(false);

// ─── 生命週期：頁面啟動與初始載入 ────────────────────────────────────────────
onActivated(() => {
  if (!createBankActivatedOnce.value) {
    createBankActivatedOnce.value = true;
    return;
  }
  fetchRagList();
});

// ─── RAG Tab CRUD（新增 / 刪除 / 更名） ───────────────────────────────────────

/** 刪除 RAG */
async function deleteRag(rag, e) {
  if (e) e.stopPropagation();
  const fileId = rag?.rag_tab_id ?? rag?.id ?? rag;
  if (fileId == null || fileId === '') return;
  const personId = getPersonId(authStore);
  if (!personId) {
    alert('請先登入');
    return;
  }
  if (ragTabIsExamProtected(rag, tabStateMap)) {
    alert('此題庫含有已設為測驗用之題型，無法刪除。請先於題型區將「設為測驗用」全部取消後再試。');
    return;
  }
  const label = getRagTabLabel(rag);
  const msg = `確定要刪除「${label}」嗎？`;
  if (!confirm(msg)) return;
  deleteRagLoading.value = true;
  try {
    await apiDeleteRag(fileId);
    await fetchRagList();
    if (activeTabId.value === (rag?.rag_tab_id ?? rag?.id ?? String(fileId))) {
      if (ragList.value.length > 0) {
        activeTabId.value = ragList.value[0].rag_tab_id ?? ragList.value[0].id ?? ragList.value[0];
      } else if (newTabIds.value.length > 0) {
        activeTabId.value = newTabIds.value[0];
      } else {
        activeTabId.value = null;
      }
    }
  } catch (err) {
    alert('刪除失敗：' + (err.message || String(err)));
  } finally {
    deleteRagLoading.value = false;
  }
}

/** 分頁列 ×：依 tab id 找到列表項目後刪除 */
function onDeleteRagTab(tabId) {
  const id = tabId != null ? String(tabId) : '';
  if (!id) return;
  const rag = ragList.value.find((r) => String(r.rag_tab_id ?? r.id ?? r) === id);
  if (rag) deleteRag(rag, null);
}

/** tab/create 回傳的 created_at 與 tab 標籤用 name（key = rag_id） */
const ragCreatedAtMap = ref({});

/** 點「+」：開啟上傳 ZIP Modal（建立新題庫） */
function openNewBankUploadModal() {
  if (createRagLoading.value) return;
  createRagError.value = '';
  resetNewBankUploadDraft();
  newBankUploadModalOpen.value = true;
}

function closeNewBankUploadModal() {
  if (createRagLoading.value) return;
  newBankUploadModalOpen.value = false;
  resetNewBankUploadDraft();
}

function resetNewBankUploadDraft() {
  newBankUploadFile.value = null;
  newBankUploadFileName.value = '';
  newBankUploadError.value = '';
  newBankUploadZipDragOver.value = false;
  if (newBankUploadFileInputRef.value) {
    newBankUploadFileInputRef.value.value = '';
  }
}

function setNewBankUploadFileFromFile(file) {
  if (!file) {
    newBankUploadFile.value = null;
    newBankUploadFileName.value = '';
    newBankUploadError.value = '';
    return;
  }
  if (!fileHasAllowedUploadExtension(file)) {
    newBankUploadFile.value = null;
    newBankUploadFileName.value = '';
    newBankUploadError.value = '請選擇 .zip 檔案';
    return;
  }
  if (uploadFileExceedsMaxSize(file)) {
    newBankUploadFile.value = null;
    newBankUploadFileName.value = '';
    newBankUploadError.value = '檔案大小不可超過 50 MB，請選擇較小的檔案';
    return;
  }
  newBankUploadFile.value = file;
  newBankUploadFileName.value = file.name;
  newBankUploadError.value = '';
}

function onNewBankUploadZipChange(e) {
  if (createRagLoading.value) return;
  setNewBankUploadFileFromFile(e.target.files?.[0] ?? null);
}

function onNewBankUploadZipDragOver(e) {
  e.preventDefault();
  e.stopPropagation();
  if (e.dataTransfer.types.includes('Files')) newBankUploadZipDragOver.value = true;
}

function onNewBankUploadZipDragLeave(e) {
  e.preventDefault();
  e.stopPropagation();
  newBankUploadZipDragOver.value = false;
}

function onNewBankUploadZipDrop(e) {
  e.preventDefault();
  e.stopPropagation();
  newBankUploadZipDragOver.value = false;
  if (createRagLoading.value) return;
  setNewBankUploadFileFromFile(e.dataTransfer.files?.[0] ?? null);
  if (newBankUploadFileInputRef.value) newBankUploadFileInputRef.value.value = '';
}

function openNewBankUploadFileDialog() {
  if (createRagLoading.value) return;
  if (newBankUploadFileInputRef.value) newBankUploadFileInputRef.value.click();
}

function applyUploadMetadataToTabState(state, tabId, meta, rawResponse) {
  state.zipResponseJson = meta ?? rawResponse;
  state.zipTabId = String(tabId);
  if (meta && typeof meta === 'object') {
    if (meta.filename != null) state.zipFileName = String(meta.filename);
    state.zipSecondFolders = Array.isArray(meta.second_folders) ? meta.second_folders : [];
  }
  state.uploadedZipFile = null;
  state.zipError = '';
}

/** Modal「確定上傳」：POST create-upload-zip */
async function confirmNewBankUpload() {
  if (createRagLoading.value) return;
  if (!newBankUploadFile.value) {
    newBankUploadError.value = '請先選擇要上傳的檔案';
    return;
  }
  if (uploadFileExceedsMaxSize(newBankUploadFile.value)) {
    newBankUploadError.value = '檔案大小不可超過 50 MB，請選擇較小的檔案';
    return;
  }
  const personId = getPersonId(authStore);
  if (!personId) {
    newBankUploadError.value = '請先登入';
    return;
  }
  createRagError.value = '';
  newBankUploadError.value = '';
  createRagLoading.value = true;
  const ragTabId = generateTabId(personId);
  const tabName = `未命名${quizBankNoun.value}`;
  try {
    const data = await apiCreateUploadZip(
      newBankUploadFile.value,
      ragTabId,
      personId,
      tabName,
    );
    const create = data?.create ?? data;
    if (create?.rag_id != null && create?.created_at != null) {
      ragCreatedAtMap.value = {
        ...ragCreatedAtMap.value,
        [String(create.rag_id)]: create.created_at,
      };
    }
    const newTabId =
      create?.rag_tab_id != null
        ? String(create.rag_tab_id)
        : data?.rag_tab_id != null
          ? String(data.rag_tab_id)
          : '';
    if (!newTabId) throw new Error(`建立${quizBankNoun.value}失敗`);
    const uploadMeta = data?.file_metadata ?? create?.file_metadata ?? data;
    ragListError.value = '';
    await fetchRagList();
    activeTabId.value = newTabId;
    const state = getTabState(newTabId);
    state._synced = false;
    const rag = ragList.value.find(
      (r) => String(r.rag_tab_id ?? r.id ?? r) === newTabId,
    );
    if (rag) syncRagItemToState(rag, state);
    applyUploadMetadataToTabState(state, newTabId, uploadMeta, uploadMeta);
    newBankUploadModalOpen.value = false;
    resetNewBankUploadDraft();
  } catch (err) {
    newBankUploadError.value = is504OrNetworkError(err)
      ? '服務正在啟動（約需一分鐘），請稍後再試'
      : err.message || '上傳失敗';
  } finally {
    createRagLoading.value = false;
  }
}

/** 取得 RAG 顯示名稱（用於 tab 標籤）；以 tab_name／rag_name 為主，預設為 rag_tab_id 底線後的時間 */
function getRagTabLabel(rag) {
  if (rag == null) return '題庫';
  if (typeof rag === 'string') return ragCreatedAtMap.value[rag] ?? String(rag);
  if (typeof rag !== 'object') return String(rag);
  const id = rag.rag_id ?? rag.rag_tab_id ?? rag.id;
  const fromMap = id != null ? ragCreatedAtMap.value[String(id)] : undefined;
  const label = (rag.tab_name != null && String(rag.tab_name).trim() !== '')
    ? String(rag.tab_name).trim()
    : (rag.rag_name != null && String(rag.rag_name).trim() !== '')
      ? String(rag.rag_name).trim()
      : deriveRagNameFromTabId(rag.rag_tab_id ?? rag.id ?? '');
  return (label && label !== '') ? label : (fromMap ?? rag.file_metadata?.filename ?? rag.course_name ?? rag.filename ?? rag.created_at ?? deriveRagNameFromTabId(rag.rag_tab_id ?? '') ?? '題庫');
}

/** 編輯分頁名稱用：優先後端 tab_name／rag_name，無則空 */
function getRagTabNameForEdit(rag) {
  if (!rag || typeof rag !== 'object') return '';
  const t = rag.tab_name;
  if (t != null && String(t).trim() !== '') return String(t).trim();
  const r = rag.rag_name;
  if (r != null && String(r).trim() !== '') return String(r).trim();
  return '';
}

function openRenameRagTab(tabId) {
  const rag = ragList.value.find((x) => String(x.rag_tab_id ?? x.id ?? '') === String(tabId));
  const rid = rag?.rag_id;
  renameRagTabDraftRagId.value =
    rid != null && String(rid).trim() !== '' ? Number(rid) : null;
  renameRagTabInitialName.value = getRagTabNameForEdit(rag) || getRagTabLabel(rag);
  renameRagTabError.value = '';
  renameRagTabModalOpen.value = true;
}

async function onRenameRagTabSave(name) {
  if (!name) {
    renameRagTabError.value = '請輸入名稱';
    return;
  }
  const rid = renameRagTabDraftRagId.value;
  if (rid == null || !Number.isFinite(rid) || rid < 1) {
    renameRagTabError.value = `找不到此${quizBankNoun.value}，請重新整理頁面後再試`;
    return;
  }
  renameRagTabSaving.value = true;
  renameRagTabError.value = '';
  try {
    await apiUpdateRagTabName(rid, name);
    await fetchRagList({ silent: true });
    renameRagTabModalOpen.value = false;
  } catch (err) {
    renameRagTabError.value = err.message || '更新失敗';
  } finally {
    renameRagTabSaving.value = false;
  }
}

function openRenameUnitQuizTab(qi) {
  const cards = activeUnitQuizCards.value;
  const row = Array.isArray(cards) ? cards[qi] : null;
  const rqid = row ? positiveRagQuizIdFromQuizRow(row) : null;
  if (rqid == null) return;
  renameUnitQuizDraftRagQuizId.value = rqid;
  renameUnitQuizInitialName.value = String(row?.quizName ?? '').trim();
  renameUnitQuizError.value = '';
  renameUnitQuizModalOpen.value = true;
}

async function onRenameUnitQuizSave(name) {
  if (!name || !String(name).trim()) {
    renameUnitQuizError.value = '請輸入名稱';
    return;
  }
  const rqid = renameUnitQuizDraftRagQuizId.value;
  if (rqid == null || !Number.isFinite(rqid) || rqid < 1) {
    renameUnitQuizError.value = '找不到此題型，請重新整理頁面後再試';
    return;
  }
  const personId = getPersonId(authStore);
  if (!personId) {
    renameUnitQuizError.value = '請先登入';
    return;
  }
  renameUnitQuizSaving.value = true;
  renameUnitQuizError.value = '';
  try {
    const data = await apiUpdateRagQuizName(
      { rag_quiz_id: rqid, quiz_name: String(name).trim() },
      personId
    );
    const resolved = String(data?.quiz_name ?? name).trim();
    const si = activeUnitSlotIndex.value;
    const stack = currentState.value.unitSlotQuizCards?.[si - 1];
    if (Array.isArray(stack)) {
      const hit = stack.find((c) => positiveRagQuizIdFromQuizRow(c) === rqid);
      if (hit && resolved) hit.quizName = resolved;
    }
    await fetchRagList({ silent: true });
    renameUnitQuizModalOpen.value = false;
  } catch (err) {
    renameUnitQuizError.value = err.message || '更新失敗';
  } finally {
    renameUnitQuizSaving.value = false;
  }
}

function openDeleteUnitQuizModal(qi) {
  const slotIndex = activeUnitSlotIndex.value;
  const stackRaw = currentState.value.unitSlotQuizCards?.[slotIndex - 1];
  const cards = Array.isArray(stackRaw) ? stackRaw : [];
  const i = Number(qi);
  if (!Number.isFinite(i) || i < 0 || i >= cards.length) return;
  const row = cards[i];
  const rqid = positiveRagQuizIdFromQuizRow(row);
  if (rqid == null) {
    alert('此題型尚未建立於伺服器，無法刪除。');
    return;
  }
  deleteUnitQuizDraftIndex.value = i;
  deleteUnitQuizModalOpen.value = true;
}

function closeDeleteUnitQuizModal() {
  deleteUnitQuizModalOpen.value = false;
  deleteUnitQuizDraftIndex.value = null;
}

const deleteUnitQuizConfirmMessage = computed(() => {
  const qi = deleteUnitQuizDraftIndex.value;
  if (qi == null || !Number.isFinite(qi) || qi < 0) return '確定要刪除此題型嗎？';
  const slotIndex = activeUnitSlotIndex.value;
  const stackRaw = currentState.value.unitSlotQuizCards?.[slotIndex - 1];
  const cards = Array.isArray(stackRaw) ? stackRaw : [];
  const row = cards[qi];
  if (!row) return '確定要刪除此題型嗎？';
  const label = quizTypeTabLabel(row);
  const isExam = row.rag_quiz_for_exam === true || row.rag_quiz_for_exam === 1;
  if (isExam) return `「${label}」已標為測驗用。確定刪除此題型嗎？`;
  return label ? `確定要刪除題型「${label}」嗎？` : '確定要刪除此題型嗎？';
});

async function confirmDeleteUnitQuiz() {
  const qi = deleteUnitQuizDraftIndex.value;
  closeDeleteUnitQuizModal();
  if (qi == null || !Number.isFinite(qi) || qi < 0) return;

  const slotIndex = activeUnitSlotIndex.value;
  const state = currentState.value;
  const stackRaw = state.unitSlotQuizCards?.[slotIndex - 1];
  const cards = Array.isArray(stackRaw) ? [...stackRaw] : [];
  const row = cards[qi];
  if (!row) return;
  const rqid = positiveRagQuizIdFromQuizRow(row);
  if (rqid == null) return;
  const personId = getPersonId(authStore);
  if (!personId) {
    alert('請先登入');
    return;
  }
  deleteUnitQuizLoading.value = true;
  try {
    await apiDeleteRagQuiz(rqid, personId);
    cards.splice(qi, 1);
    state.unitSlotQuizCards[slotIndex - 1] = cards;
    const slotState = getSlotFormState(slotIndex);
    if (parsePositiveQuizId(slotState.unitDraftRagQuizId) === rqid) {
      slotState.unitDraftRagQuizId =
        cards.length > 0 ? positiveRagQuizIdFromQuizRow(cards[cards.length - 1]) : null;
    }
    if (parsePositiveQuizId(slotState.lastSuccessfulCreatedRagQuizId) === rqid) {
      slotState.lastSuccessfulCreatedRagQuizId =
        cards.length > 0 ? positiveRagQuizIdFromQuizRow(cards[cards.length - 1]) : null;
    }
    let idx = Number(state.activeUnitQuizTypeIndex ?? 0);
    if (qi < idx) idx -= 1;
    else if (qi === idx) idx = Math.min(Math.max(0, idx), Math.max(0, cards.length - 1));
    if (cards.length === 0) idx = 0;
    else if (idx >= cards.length) idx = cards.length - 1;
    if (idx < 0) idx = 0;
    state.activeUnitQuizTypeIndex = idx;
    state.cardList[slotIndex - 1] = focalCardFromUnitQuizList(cards, slotState);
    await fetchRagList({ silent: true });
  } catch (err) {
    alert('刪除失敗：' + (err.message || String(err)));
  } finally {
    deleteUnitQuizLoading.value = false;
  }
}

// ─── Pack（Build RAG ZIP） ─────────────────────────────────────────────────────

/** POST /rag/tab/build-rag-zip（按鈕「開始建立單元」） */
async function confirmPack() {
  const state = currentState.value;
  const fileId = String(state.zipTabId ?? '').trim();
  const unitList = state.packTasks?.trim();
  const personId = getPersonId(authStore);
  if (!fileId) {
    state.packError = '請先上傳教材檔，完成後再建立題庫';
    return;
  }
  if (!personId) {
    state.packError = '請先登入';
    return;
  }
  if (!isPackTasksListReady(state.packTasksList ?? [])) {
    state.packError = '請至少建立一個設定單元，且每個設定單元至少於資料夾組合放入一個課程標籤';
    return;
  }
  if (hasPackUnitTranscriptLoading.value) {
    state.packError = '逐字稿尚在分析或檔案讀取中，請稍候再開始建立單元';
    return;
  }
  const missingTranscriptIndexes = missingPackUnitTranscriptIndexes(state);
  if (missingTranscriptIndexes.length > 0) {
    const labels = missingTranscriptIndexes.map((i) => `單元 ${i + 1}`).join('、');
    state.packError = `${labels} 尚未載入逐字稿；請確認各單元已設定資料夾、教材 ZIP 已上傳，且資料夾內有對應內容。`;
    return;
  }
  if (!unitList) {
    state.packError = '請輸入單元清單（例：220222+220301 或 220222,220301+220302）';
    return;
  }
  state.packLoading = true;
  state.packError = '';
  state.packResponseJson = null;
  state.packBuildTotal = 0;
  state.packBuildDone = 0;
  state.packBuildCurrent = 0;
  state.packBuildFilename = '';
  state.packBuildRepackFilename = '';
  state.packBuildRagFilename = '';
  try {
    const unitTypesNormalized = enforcePackUnitTypesForFolderGroups(
      state.packTasksList,
      parsePackUnitTypesFromRag(state.packUnitTypes, state.packTasksList?.length ?? 0),
    );
    const transcriptions = transcriptionsForBuildRagZip(
      unitTypesNormalized,
      state.packUnitMarkdownTexts ?? []
    );
    ensurePackUnitSidecarArrays();
    const { rag_chunk_sizes: chunkSizesStr, rag_chunk_overlaps: chunkOverlapsStr } =
      chunkSizesOverlapsStringsForBuildRagZip(
        unitTypesNormalized,
        state.packChunkSizes,
        state.packChunkOverlaps,
        DEFAULT_PACK_CHUNK_SIZE,
        DEFAULT_PACK_CHUNK_OVERLAP
      );
    const unitNamesStr = serializePackUnitNamesForApi(
      state.packUnitNames,
      state.packTasksList?.length ?? 0
    );
    state.packResponseJson = await apiBuildRagZip(
      {
        rag_tab_id: fileId,
        person_id: personId,
        unit_list: unitList,
        unit_names: unitNamesStr,
        unit_types: serializePackUnitTypesForApi(unitTypesNormalized),
        transcriptions,
        rag_chunk_size: DEFAULT_PACK_CHUNK_SIZE,
        rag_chunk_overlap: DEFAULT_PACK_CHUNK_OVERLAP,
        rag_chunk_sizes: chunkSizesStr,
        rag_chunk_overlaps: chunkOverlapsStr,
        build_faiss: true,
      },
      (ev) => {
        if (!ev || typeof ev !== 'object') return;
        if (ev.type === 'start') {
          state.packBuildTotal = Number(ev.total) || 0;
          state.packBuildDone = 0;
          state.packBuildCurrent = 0;
          state.packBuildFilename = '';
          state.packBuildRepackFilename = '';
          state.packBuildRagFilename = '';
        } else if (ev.type === 'building') {
          state.packBuildTotal = Number(ev.total) || state.packBuildTotal;
          state.packBuildCurrent = Number(ev.index) || 0;
          state.packBuildDone = Number(ev.completed_before) || 0;
          state.packBuildFilename = ev.filename != null ? String(ev.filename) : '';
          state.packBuildRepackFilename = '';
          state.packBuildRagFilename = '';
        } else if (ev.type === 'unit') {
          state.packBuildTotal = Number(ev.total) || state.packBuildTotal;
          state.packBuildDone = Number(ev.index) || state.packBuildDone;
          const out = ev.output;
          if (out && typeof out === 'object') {
            if (out.filename != null && String(out.filename).trim() !== '') {
              state.packBuildFilename = String(out.filename).trim();
            }
            if (out.repack_filename != null && String(out.repack_filename).trim() !== '') {
              state.packBuildRepackFilename = String(out.repack_filename).trim();
            } else {
              state.packBuildRepackFilename = '';
            }
            if (out.rag_filename != null && String(out.rag_filename).trim() !== '') {
              state.packBuildRagFilename = String(out.rag_filename).trim();
            } else {
              state.packBuildRagFilename = '';
            }
          }
        } else if (ev.type === 'complete') {
          state.packBuildTotal = Number(ev.total) || state.packBuildTotal;
          if (ev.built_ok != null) state.packBuildDone = Number(ev.built_ok) || 0;
        }
      }
    );
    state.ragMetadata = typeof state.packResponseJson === 'string' ? state.packResponseJson : JSON.stringify(state.packResponseJson, null, 2);
    await fetchRagList();
    await refreshUnitSubTabsFromApi(fileId);
    packBuildSuccessModalOpen.value = true;
  } catch (err) {
    state.packError = is504OrNetworkError(err)
      ? '服務正在啟動（約需一分鐘），請稍後再試'
      : err.message || '壓縮失敗';
    state.packResponseJson = null;
  } finally {
    state.packLoading = false;
    state.packBuildTotal = 0;
    state.packBuildDone = 0;
    state.packBuildCurrent = 0;
    state.packBuildFilename = '';
    state.packBuildRepackFilename = '';
    state.packBuildRagFilename = '';
  }
}

/** 取得第 slotIndex 題的產生題目表單狀態（獨立、不連動） */
function getSlotFormState(slotIndex) {
  const state = currentState.value;
  if (!state.slotFormState[slotIndex]) {
    state.slotFormState[slotIndex] = reactive({
      generateQuizTabId: '',
      showGenerateForm: false,
      quizUserPromptText: '',
      unitDraftRagQuizId: null,
      /** 「產生題目」時 POST create 成功後備份 rag_quiz_id，避免列上遺漏時仍可送 llm-generate */
      lastSuccessfulCreatedRagQuizId: null,
      /** 目前此槽位在「所屬單元」內的第幾題（按題型列「+」推入草稿列時遞增） */
      unitPromptOrdinalInUnit: null,
      unitQuizCreateLoading: false,
      /** LoadingOverlay 文案：`add-row`＝題型列「+」；`llm-generate`＝單元內「產生題目」 */
      unitQuizLoadingOverlayKind: null,
      /** 出題模式：`normal`＝一般出題；`followup`＝追問出題 */
      quizGenerateMode: 'normal',
      unitQuizCreateError: '',
      loading: false,
      error: '',
      responseJson: null,
    });
  }
  const slot = state.slotFormState[slotIndex];
  if (slot.unitDraftRagQuizId === undefined) slot.unitDraftRagQuizId = null;
  if (slot.lastSuccessfulCreatedRagQuizId === undefined) slot.lastSuccessfulCreatedRagQuizId = null;
  if (slot.unitPromptOrdinalInUnit === undefined) slot.unitPromptOrdinalInUnit = null;
  if (slot.unitQuizCreateLoading === undefined) slot.unitQuizCreateLoading = false;
  if (slot.unitQuizLoadingOverlayKind === undefined) slot.unitQuizLoadingOverlayKind = null;
  if (slot.unitQuizCreateError === undefined) slot.unitQuizCreateError = '';
  if (slot.quizGenerateMode === undefined) slot.quizGenerateMode = 'normal';
  return slot;
}

/** 本機草稿列（無 rag_quiz_id）：供先顯示題名／出題規則介面，待「產生題目」再 POST create。 */
function createLocalDraftUnitQuizCard() {
  const tab = activeUnitTabItem.value;
  const rag = currentRagItem.value;
  const state = currentState.value;
  const ragId = rag?.rag_id ?? rag?.id ?? state?.zipResponseJson?.rag_id ?? state?.zipResponseJson?.id;
  const ragIdStr = ragId != null && String(ragId).trim() !== '' ? String(ragId) : null;
  const ragTabId = String(tab?.ragTabId ?? rag?.rag_tab_id ?? activeTabId.value ?? state.zipTabId ?? '').trim();
  const ruRaw = tab?.ragUnitDbId != null ? Number(tab.ragUnitDbId) : NaN;
  const ragUnitId = Number.isFinite(ruRaw) && ruRaw >= 0 ? ruRaw : 0;
  const ragName = String(tab?.unitName ?? tab?.label ?? '').trim();
  return {
    id: nextCardId(),
    quiz: '',
    hint: '',
    referenceAnswer: '',
    sourceFilename: null,
    ragName: ragName || null,
    rag_id: ragIdStr,
    quiz_answer: '',
    hintVisible: false,
    referenceAnswerVisible: false,
    confirmed: false,
    gradingResult: '',
    gradingResponseJson: null,
    generateQuizResponseJson: null,
    rag_quiz_id: null,
    rag_tab_id: ragTabId,
    rag_unit_id: ragUnitId,
    rag_quiz_for_exam: false,
    ragQuizForExamLoading: false,
    ragQuizForExamError: '',
    ragQuizFollowupLoading: false,
    ragQuizFollowupError: '',
    answer_id: null,
    gradingPrompt: '',
    quizName: DEFAULT_UNIT_QUIZ_DISPLAY_NAME,
    quizUserPromptText: '',
    quizUserPromptBaseline: '',
    gradingPromptBaseline: '',
    quizAnswerBaseline: '',
    hasUsedSaveAndGenerateOnce: false,
    hasUsedSaveAndGradeOnce: false,
    quiz_history_list: [],
    quiz_followup_history_list: [],
  };
}

// ─── 題目生成（LLM）與評分（Grading） ────────────────────────────────────────

/**
 * 題型列「+」新增題庫：POST /rag/tab/unit/quiz/create 建立空白 Rag_Quiz（不呼叫 LLM），回傳 rag_quiz_id 後推入題列並展開出題區。
 * 可選 await GET 子分頁以補齊 rag_unit_id。
 */
async function createBlankUnitQuiz(slotIndex) {
  const slotState = getSlotFormState(slotIndex);
  let tab = activeUnitTabItem.value;
  const state = currentState.value;
  const rag = currentRagItem.value;
  const personId = getPersonId(authStore);
  const ragTabId =
    String(tab?.ragTabId ?? rag?.rag_tab_id ?? activeTabId.value ?? state.zipTabId ?? '').trim();
  let ragUnitId = tab?.ragUnitDbId != null ? Number(tab.ragUnitDbId) : 0;
  if (!Number.isFinite(ragUnitId) || ragUnitId < 1) {
    if (tab?.ragTabId && String(tab.ragTabId).trim()) {
      try {
        await refreshUnitSubTabsFromApi(tab.ragTabId);
        tab = activeUnitTabItem.value;
        ragUnitId = tab?.ragUnitDbId != null ? Number(tab.ragUnitDbId) : 0;
      } catch {
        // 仍由下一段錯誤訊息處理
      }
    }
  }
  slotState.unitQuizCreateError = '';
  if (!personId) {
    slotState.unitQuizCreateError = '請先登入';
    return;
  }
  if (!ragTabId) {
    slotState.unitQuizCreateError = '無法取得 rag_tab_id';
    return;
  }
  if (!Number.isFinite(ragUnitId) || ragUnitId < 1) {
    slotState.unitQuizCreateError = '無法取得 rag_unit_id，請確認單元已建立並重新整理頁面';
    return;
  }
  slotState.unitQuizCreateLoading = true;
  slotState.unitQuizLoadingOverlayKind = 'add-row';
  try {
    const createData = await apiCreateRagUnitQuiz(
      { rag_tab_id: ragTabId, rag_unit_id: ragUnitId },
      personId
    );
    const rawNew = createData?.rag_quiz_id ?? createData?.quiz_id ?? createData?.id;
    const newRq = parsePositiveQuizId(rawNew);
    if (newRq == null) {
      throw new Error('後端未回傳有效的 rag_quiz_id');
    }
    await persistDefaultUnitQuizNameAfterCreate(newRq, personId);
    slotState.showGenerateForm = true;
    slotState.quizUserPromptText = String(slotState.quizUserPromptText ?? '');
    if (tab?.generateQuizTabId) {
      slotState.generateQuizTabId = tab.generateQuizTabId;
    }
    if (!state.unitSlotQuizCards) state.unitSlotQuizCards = [];
    while (state.unitSlotQuizCards.length < slotIndex) state.unitSlotQuizCards.push([]);
    let sub = state.unitSlotQuizCards[slotIndex - 1];
    if (!Array.isArray(sub)) {
      state.unitSlotQuizCards[slotIndex - 1] = [];
      sub = state.unitSlotQuizCards[slotIndex - 1];
    }
    const draft = createLocalDraftUnitQuizCard();
    draft.rag_quiz_id = newRq;
    draft.rag_tab_id = ragTabId;
    draft.rag_unit_id = ragUnitId;
    sub.push(draft);
    const sortedSub = sortUnitQuizCardsByRagQuizId(sub);
    state.unitSlotQuizCards[slotIndex - 1] = sortedSub;
    state.activeUnitQuizTypeIndex = sortedSub.length > 0 ? sortedSub.length - 1 : 0;
    slotState.unitDraftRagQuizId = newRq;
    slotState.lastSuccessfulCreatedRagQuizId = newRq;
    state.cardList[slotIndex - 1] = focalCardFromUnitQuizList(sortedSub, slotState);
    const tabForOrdinal = activeUnitTabItem.value ?? tab;
    const unitTabKey = tabForOrdinal?.id != null ? String(tabForOrdinal.id).trim() : '';
    if (unitTabKey) {
      if (!state.unitPromptOrdinalByUnitTabId) state.unitPromptOrdinalByUnitTabId = {};
      const map = state.unitPromptOrdinalByUnitTabId;
      const prev = Number(map[unitTabKey]);
      const next = (Number.isFinite(prev) && prev > 0 ? prev : 0) + 1;
      map[unitTabKey] = next;
      slotState.unitPromptOrdinalInUnit = next;
    } else {
      slotState.unitPromptOrdinalInUnit = slotState.unitPromptOrdinalInUnit ?? null;
    }
  } catch (err) {
    slotState.unitQuizCreateError = err?.message || String(err) || '新增題庫失敗';
  } finally {
    slotState.unitQuizCreateLoading = false;
    slotState.unitQuizLoadingOverlayKind = null;
  }
}

/**
 * POST /rag/tab/unit/quiz/llm-generate：body 僅 rag_quiz_id、quiz_name、quiz_user_prompt_text（API 允許空字串；前端按鈕仍須已填出題規則）。
 * 若該列尚無 rag_quiz_id（相容舊本機草稿），先 POST /rag/tab/unit/quiz/create 再 llm-generate；一般流程已由題型列「+」先 create。
 */
async function submitUnitQuizLlmGenerate(slotIndex, quizCardRow = null) {
  const slotState = getSlotFormState(slotIndex);
  const tab = activeUnitTabItem.value;
  const state = currentState.value;
  const rag = currentRagItem.value;
  const personId = getPersonId(authStore);
  if (!personId) {
    slotState.unitQuizCreateError = '請先登入';
    return;
  }
  let rqid = resolveUnitQuizRagQuizIdForLlm(slotIndex, quizCardRow);
  const draftN =
    parsePositiveQuizId(slotState.unitDraftRagQuizId)
    ?? parsePositiveQuizId(slotState.lastSuccessfulCreatedRagQuizId);
  const stack = Array.isArray(state.unitSlotQuizCards?.[slotIndex - 1])
    ? state.unitSlotQuizCards[slotIndex - 1]
    : [];
  const draftCard =
    draftN != null
      ? stack.find((c) => positiveRagQuizIdFromQuizRow(c) === draftN)
      : null;
  const slotCard = draftCard ?? state.cardList[slotIndex - 1];
  const promptText =
    (quizCardRow != null && typeof quizCardRow === 'object'
      ? String(quizCardRow.quizUserPromptText ?? '').trim()
      : '')
    || String(slotState.quizUserPromptText ?? '').trim();
  const quizNameRaw =
    (quizCardRow != null && typeof quizCardRow === 'object'
      ? String(quizCardRow.quizName ?? '').trim()
      : '')
    || String(slotCard?.quizName ?? '').trim();
  const quizNameOut =
    quizNameRaw !== '' ? quizNameRaw : DEFAULT_UNIT_QUIZ_DISPLAY_NAME;
  if (!String(promptText ?? '').trim()) {
    slotState.unitQuizCreateError = '請填寫出題規則';
    return;
  }
  const followupMode = isUnitQuizFollowupMode(slotIndex, quizCardRow ?? slotCard);
  slotState.unitQuizCreateLoading = true;
  slotState.unitQuizLoadingOverlayKind = followupMode ? 'llm-generate-followup' : 'llm-generate';
  slotState.unitQuizCreateError = '';
  try {
    if (
      (rqid == null || rqid < 1)
      && quizCardRow != null
      && typeof quizCardRow === 'object'
      && quizRowQuizEmpty(quizCardRow)
    ) {
      const ragTabIdCreate = String(
        quizCardRow.rag_tab_id
        ?? tab?.ragTabId
        ?? rag?.rag_tab_id
        ?? activeTabId.value
        ?? state.zipTabId
        ?? ''
      ).trim();
      const ruRaw = quizCardRow.rag_unit_id ?? tab?.ragUnitDbId;
      const ragUnitIdCreate = ruRaw != null && ruRaw !== '' ? Number(ruRaw) : 0;
      if (!ragTabIdCreate || !Number.isFinite(ragUnitIdCreate) || ragUnitIdCreate < 1) {
        slotState.unitQuizCreateError =
          '無法建立空白題目：缺少 rag_tab_id／rag_unit_id，請確認單元與題庫狀態後重試';
        return;
      }
      const createData = await apiCreateRagUnitQuiz(
        { rag_tab_id: ragTabIdCreate, rag_unit_id: ragUnitIdCreate },
        personId
      );
      const rawNew = createData?.rag_quiz_id ?? createData?.quiz_id ?? createData?.id;
      const newRq = parsePositiveQuizId(rawNew);
      if (newRq == null) {
        throw new Error('後端未回傳有效的 rag_quiz_id');
      }
      await persistDefaultUnitQuizNameAfterCreate(newRq, personId);
      quizCardRow.rag_quiz_id = newRq;
      if (quizCardRow.rag_tab_id == null || String(quizCardRow.rag_tab_id).trim() === '') {
        quizCardRow.rag_tab_id = ragTabIdCreate;
      }
      if (!Number.isFinite(Number(quizCardRow.rag_unit_id)) || Number(quizCardRow.rag_unit_id) < 1) {
        quizCardRow.rag_unit_id = ragUnitIdCreate;
      }
      rqid = newRq;
      slotState.unitDraftRagQuizId = newRq;
      slotState.lastSuccessfulCreatedRagQuizId = newRq;
      /** 不在此呼叫 refreshUnitSubTabsFromApi：會 hydrate 覆寫整份 unitSlotQuizCards，抹掉同單元其他僅本機草稿列。 */
      const subRef = state.unitSlotQuizCards?.[slotIndex - 1];
      if (Array.isArray(subRef)) {
        state.unitSlotQuizCards[slotIndex - 1] = sortUnitQuizCardsByRagQuizId(subRef);
      }
    }

    if (rqid == null || rqid < 1) {
      slotState.unitQuizCreateError =
        '無法取得 rag_quiz_id。請在空白列填寫出題規則後按「儲存並產生題目」，或重新整理頁面。';
      return;
    }

    const historyTarget = quizCardRow ?? slotCard;

    const data = followupMode
      ? await apiRagUnitQuizLlmGenerateFollowup(
          {
            rag_quiz_id: rqid,
            quiz_name: quizNameOut,
            quiz_user_prompt_text: promptText,
            quiz_history_list: unitQuizFollowupHistoryListForLlm(historyTarget),
          },
          personId
        )
      : await apiRagUnitQuizLlmGenerate(
          {
            rag_quiz_id: rqid,
            quiz_name: quizNameOut,
            quiz_user_prompt_text: promptText,
            quiz_history_list: unitQuizHistoryListForLlm(historyTarget),
          },
          personId
        );
    slotState.responseJson = data;
    const quizContentRaw = data[API_RESPONSE_QUIZ_CONTENT] ?? data[API_RESPONSE_QUIZ_LEGACY] ?? data.quiz_content ?? '';
    const quizContent = String(quizContentRaw ?? '');
    const quizContentTrimmed = quizContent.trim();
    const hintText = data.quiz_hint ?? data.hint ?? '';
    const targetFilename = data.unit_filename ?? data.target_filename ?? tab?.filename ?? '';
    const referenceAnswerText =
      data.quiz_reference_answer
      ?? data.quiz_answer_reference
      ?? data.quiz_answer
      ?? data.answer
      ?? '';
    const rawRagQuizId =
      data.rag_quiz_id != null ? Number(data.rag_quiz_id) : (data.quiz_id != null ? Number(data.quiz_id) : null);
    const ragQuizId = Number.isFinite(rawRagQuizId) ? rawRagQuizId : rqid;
    const ragName = String(tab?.unitName ?? tab?.label ?? '').trim();
    const ragId = rag?.rag_id ?? rag?.id ?? state?.zipResponseJson?.rag_id ?? state?.zipResponseJson?.id;
    if (!quizContentTrimmed) {
      slotState.unitQuizCreateError = '產生失敗：後端回傳 quiz_content 為空，請調整出題規則後重試';
      return;
    }

    /** 同一題重新產生：立即隱藏舊批改結果（合併 setCardAtSlot 亦會清空，避免短暫殘留） */
    if (quizCardRow != null && typeof quizCardRow === 'object') {
      quizCardRow.confirmed = false;
      quizCardRow.gradingResult = '';
      quizCardRow.gradingResponseJson = null;
      quizCardRow.answer_id = null;
      quizCardRow.hasUsedSaveAndGenerateOnce = true;
      quizCardRow.quizGenerateMode =
        ragQuizApiRowIsFollowUp(data) || followupMode ? 'followup' : 'normal';
    }

    slotState.unitDraftRagQuizId = null;
    slotState.lastSuccessfulCreatedRagQuizId = null;
    slotState.quizUserPromptText = promptText;
    setCardAtSlot(
      slotIndex,
      quizContent,
      hintText,
      targetFilename,
      referenceAnswerText,
      ragName,
      data,
      ragId,
      ragQuizId,
      quizCardRow
    );
  } catch (err) {
    slotState.unitQuizCreateError = err.message || '產生題目失敗';
  } finally {
    slotState.unitQuizCreateLoading = false;
    slotState.unitQuizLoadingOverlayKind = null;
  }
}

/**
 * POST /rag/tab/unit/quiz/llm-generate-db：body 僅 rag_quiz_id、quiz_name；後端使用 Rag_Quiz 已儲存之 quiz_user_prompt_text（等同 llm-generate 傳空字串行為由後端處理）。
 * 須已有 rag_quiz_id；不先 POST create，亦不傳編輯器內尚未儲存之出題規則。
 */
async function submitUnitQuizLlmGenerateDb(slotIndex, quizCardRow = null) {
  const slotState = getSlotFormState(slotIndex);
  const tab = activeUnitTabItem.value;
  const state = currentState.value;
  const rag = currentRagItem.value;
  const personId = getPersonId(authStore);
  if (!personId) {
    slotState.unitQuizCreateError = '請先登入';
    return;
  }
  const rqid = resolveUnitQuizRagQuizIdForLlm(slotIndex, quizCardRow);
  const draftN =
    parsePositiveQuizId(slotState.unitDraftRagQuizId)
    ?? parsePositiveQuizId(slotState.lastSuccessfulCreatedRagQuizId);
  const stack = Array.isArray(state.unitSlotQuizCards?.[slotIndex - 1])
    ? state.unitSlotQuizCards[slotIndex - 1]
    : [];
  const draftCard =
    draftN != null
      ? stack.find((c) => positiveRagQuizIdFromQuizRow(c) === draftN)
      : null;
  const slotCard = draftCard ?? state.cardList[slotIndex - 1];
  const quizNameRaw =
    (quizCardRow != null && typeof quizCardRow === 'object'
      ? String(quizCardRow.quizName ?? '').trim()
      : '')
    || String(slotCard?.quizName ?? '').trim();
  const quizNameOut =
    quizNameRaw !== '' ? quizNameRaw : DEFAULT_UNIT_QUIZ_DISPLAY_NAME;

  if (rqid == null || rqid < 1) {
    slotState.unitQuizCreateError =
      '無法取得 rag_quiz_id。請先用題型列「+」新增題庫，或按「儲存並產生題目」建立題列。';
    return;
  }

  const historyTarget = quizCardRow ?? slotCard;
  const followupMode = isUnitQuizFollowupMode(slotIndex, historyTarget);

  slotState.unitQuizCreateLoading = true;
  slotState.unitQuizLoadingOverlayKind = followupMode ? 'llm-generate-followup-db' : 'llm-generate-db';
  slotState.unitQuizCreateError = '';
  try {
    const data = followupMode
      ? await apiRagUnitQuizLlmGenerateFollowupDb(
          {
            rag_quiz_id: rqid,
            quiz_name: quizNameOut,
            quiz_history_list: unitQuizFollowupHistoryListForLlm(historyTarget),
          },
          personId
        )
      : await apiRagUnitQuizLlmGenerateDb(
          { rag_quiz_id: rqid, quiz_name: quizNameOut },
          personId
        );
    slotState.responseJson = data;
    const quizContentRaw = data[API_RESPONSE_QUIZ_CONTENT] ?? data[API_RESPONSE_QUIZ_LEGACY] ?? data.quiz_content ?? '';
    const quizContent = String(quizContentRaw ?? '');
    const quizContentTrimmed = quizContent.trim();
    const hintText = data.quiz_hint ?? data.hint ?? '';
    const targetFilename = data.unit_filename ?? data.target_filename ?? tab?.filename ?? '';
    const referenceAnswerText =
      data.quiz_reference_answer
      ?? data.quiz_answer_reference
      ?? data.quiz_answer
      ?? data.answer
      ?? '';
    const rawRagQuizId =
      data.rag_quiz_id != null ? Number(data.rag_quiz_id) : (data.quiz_id != null ? Number(data.quiz_id) : null);
    const ragQuizId = Number.isFinite(rawRagQuizId) ? rawRagQuizId : rqid;
    const ragName = String(tab?.unitName ?? tab?.label ?? '').trim();
    const ragId = rag?.rag_id ?? rag?.id ?? state?.zipResponseJson?.rag_id ?? state?.zipResponseJson?.id;
    if (!quizContentTrimmed) {
      slotState.unitQuizCreateError = '產生失敗：後端回傳 quiz_content 為空，請調整已儲存之出題規則後重試';
      return;
    }

    if (quizCardRow != null && typeof quizCardRow === 'object') {
      quizCardRow.confirmed = false;
      quizCardRow.gradingResult = '';
      quizCardRow.gradingResponseJson = null;
      quizCardRow.answer_id = null;
    }

    slotState.unitDraftRagQuizId = null;
    slotState.lastSuccessfulCreatedRagQuizId = null;
    const promptFromApi = extractQuizUserPromptText(data);
    const promptKeep =
      (promptFromApi && promptFromApi.trim() !== '' ? promptFromApi : '')
      || (quizCardRow != null && typeof quizCardRow === 'object'
        ? String(quizCardRow.quizUserPromptText ?? '').trim()
        : '')
      || String(slotState.quizUserPromptText ?? '').trim();
    slotState.quizUserPromptText = promptKeep;
    setCardAtSlot(
      slotIndex,
      quizContent,
      hintText,
      targetFilename,
      referenceAnswerText,
      ragName,
      data,
      ragId,
      ragQuizId,
      quizCardRow
    );
  } catch (err) {
    slotState.unitQuizCreateError = err.message || '產生題目失敗';
  } finally {
    slotState.unitQuizCreateLoading = false;
    slotState.unitQuizLoadingOverlayKind = null;
  }
}

/** 無單元子分頁時點「新增題目」：展開一個新的題目區塊（第 n 題）；cardList 與 slot 對齊 */
function openNextQuizSlot() {
  const state = currentState.value;
  state.showQuizGeneratorBlock = true;
  state.quizSlotsCount = (state.quizSlotsCount || 0) + 1;
  while (state.cardList.length < state.quizSlotsCount) {
    state.cardList.push(null);
  }
}

/**
 * 產題 API JSON 之批改規則（answer_user_prompt_text）：鍵名或巢狀層級不一時多處嘗試。
 * @param {object | null | undefined} gj
 */
function extractAnswerUserPromptFromGenerateResponse(gj) {
  if (!gj || typeof gj !== 'object') return '';
  const pick = (v) => {
    if (v == null) return '';
    const s = String(v).trim();
    return s;
  };
  let s = pick(
    gj.answer_user_prompt_text
    ?? gj.answerUserPromptText
    ?? gj.grading_prompt
    ?? gj.gradingPrompt,
  );
  if (s) return s;
  const rq = gj.rag_quiz;
  if (rq && typeof rq === 'object') {
    s = pick(
      rq.answer_user_prompt_text
      ?? rq.answerUserPromptText
      ?? rq.grading_prompt
      ?? rq.gradingPrompt,
    );
    if (s) return s;
  }
  const qz = gj.quiz;
  if (qz && typeof qz === 'object') {
    s = pick(
      qz.answer_user_prompt_text
      ?? qz.answerUserPromptText
      ?? qz.grading_prompt
      ?? qz.gradingPrompt,
    );
    if (s) return s;
  }
  const res = gj.result;
  if (res && typeof res === 'object') {
    s = pick(
      res.answer_user_prompt_text
      ?? res.answerUserPromptText
      ?? res.grading_prompt
      ?? res.gradingPrompt,
    );
    if (s) return s;
  }
  return '';
}

/**
 * 將第 slotIndex 題設為指定卡片（每題獨立，不連動）。
 * @param {object | null} [mergeTargetRow] - 單元多題時：優先合併此列（與 unitSlotQuizCards 內同一引用），避免該列無 rag_quiz_id 時誤 push 新列導致 UI 仍顯示空白出題規則。
 */
function setCardAtSlot(slotIndex, quizContent, hint, sourceFilename, referenceAnswer, ragName, generateQuizResponseJson, ragId, ragQuizId, mergeTargetRow = null) {
  const state = currentState.value;
  while (state.cardList.length < slotIndex) {
    state.cardList.push(null);
  }
  const slotStatePrompt = getSlotFormState(slotIndex);
  const promptSnap = String(slotStatePrompt.quizUserPromptText ?? '').trim();
  const gj =
    generateQuizResponseJson != null && typeof generateQuizResponseJson === 'object'
      ? generateQuizResponseJson
      : null;
  /** llm-generate／整庫產題回傳之批改規則快照（對應 Rag_Quiz.answer_user_prompt_text） */
  const answerPromptFromApi = extractAnswerUserPromptFromGenerateResponse(gj);
  const apiQuizName = gj ? String(gj.quiz_name ?? gj.quizName ?? '').trim() : '';
  const mergeRowName =
    mergeTargetRow != null && typeof mergeTargetRow === 'object'
      ? String(mergeTargetRow.quizName ?? '').trim()
      : '';
  /** 優先後端回傳 quiz_name，其次使用者輸入之題名，再為既有列。 */
  /** @param {object | null | undefined} prevRow */
  function computeQuizName(prevRow) {
    if (apiQuizName !== '') return apiQuizName;
    if (mergeRowName !== '') return mergeRowName;
    if (prevRow != null && typeof prevRow === 'object') {
      const p = String(prevRow.quizName ?? '').trim();
      if (p !== '') return p;
    }
    return '';
  }
  const ragIdStr = ragId != null && String(ragId).trim() !== '' ? String(ragId) : null;
  const hasUnitTabsEarly = (currentState.value.unitTabOrder || []).length > 0;
  const unitExamDefaults = hasUnitTabsEarly
    ? {
      ...getRagQuizUnitMeta(slotIndex),
      rag_quiz_for_exam: false,
      ragQuizForExamLoading: false,
      ragQuizForExamError: '',
      ragQuizFollowupLoading: false,
      ragQuizFollowupError: '',
    }
    : {
      rag_tab_id: '',
      rag_unit_id: 0,
      rag_quiz_for_exam: false,
      ragQuizForExamLoading: false,
      ragQuizForExamError: '',
      ragQuizFollowupLoading: false,
      ragQuizFollowupError: '',
    };
  const card = {
    id: nextCardId(),
    quiz: quizContent ?? '',
    hint: hint ?? '',
    referenceAnswer: referenceAnswer ?? '',
    sourceFilename: sourceFilename ?? null,
    ragName: ragName ?? null,
    rag_id: ragIdStr,
    quiz_answer: '',
    hintVisible: false,
    referenceAnswerVisible: false,
    confirmed: false,
    gradingResult: '',
    gradingResponseJson: null,
    generateQuizResponseJson: generateQuizResponseJson ?? null,
    rag_quiz_id: ragQuizId ?? null,
    quizUserPromptText: promptSnap,
    gradingPrompt: answerPromptFromApi,
    quizName: computeQuizName(null),
    hasUsedSaveAndGenerateOnce: false,
    hasUsedSaveAndGradeOnce: answerPromptFromApi !== '',
    quiz_history_list: [],
    quiz_followup_history_list: [],
    ...unitExamDefaults,
  };

  const followupMode = isUnitQuizFollowupMode(slotIndex, mergeTargetRow);
  const hasUnitTabs = (state.unitTabOrder || []).length > 0;
  if (hasUnitTabs) {
    if (!state.unitSlotQuizCards) state.unitSlotQuizCards = [];
    while (state.unitSlotQuizCards.length < slotIndex) state.unitSlotQuizCards.push([]);
    let sub = state.unitSlotQuizCards[slotIndex - 1];
    if (!Array.isArray(sub)) {
      state.unitSlotQuizCards[slotIndex - 1] = [];
      sub = state.unitSlotQuizCards[slotIndex - 1];
    }
    const targetRid = parsePositiveQuizId(ragQuizId);
    let idx = -1;
    if (mergeTargetRow != null && typeof mergeTargetRow === 'object') {
      idx = sub.findIndex((c) => c === mergeTargetRow);
    }
    if (idx < 0 && targetRid != null) {
      idx = sub.findIndex((c) => positiveRagQuizIdFromQuizRow(c) === targetRid);
    }
    if (idx >= 0) {
      const prev = sub[idx];
      card.id = prev.id;
      card.quiz_history_list = appendStemToQuizHistory(
        parseQuizHistoryListFromSource(prev),
        prev.quiz
      );
      card.quiz_followup_history_list = followupMode
        ? appendFollowupToQuizHistory(
            parseFollowupHistoryListFromSource(prev),
            followupHistoryEntryFromQuizCard(prev),
          )
        : parseFollowupHistoryListFromSource(prev);
      /** 重新產生題目時須帶入新題的暫存參考答案；勿沿用上一版題幹留在答案欄的內容 */
      card.quiz_answer = '';
      card.hintVisible = prev.hintVisible ?? false;
      card.referenceAnswerVisible = prev.referenceAnswerVisible ?? false;
      /** 題幹已由 LLM 更新，勿沿用上一版批改／作答對應（否則仍顯示舊評語） */
      card.confirmed = false;
      card.gradingResult = '';
      card.gradingResponseJson = null;
      card.answer_id = null;
      card.quizUserPromptText = promptSnap || prev.quizUserPromptText || '';
      card.gradingPrompt =
        answerPromptFromApi !== ''
          ? answerPromptFromApi
          : String(prev.gradingPrompt ?? '');
      card.quizName = computeQuizName(prev);
      if (typeof prev.hasUsedSaveAndGenerateOnce === 'boolean') {
        card.hasUsedSaveAndGenerateOnce = prev.hasUsedSaveAndGenerateOnce;
      }
      card.hasUsedSaveAndGradeOnce =
        String(card.gradingPrompt ?? '').trim() !== ''
        || (typeof prev.hasUsedSaveAndGradeOnce === 'boolean' && prev.hasUsedSaveAndGradeOnce);
      card.rag_tab_id =
        prev.rag_tab_id != null && String(prev.rag_tab_id).trim() !== ''
          ? prev.rag_tab_id
          : card.rag_tab_id;
      card.rag_unit_id = prev.rag_unit_id != null ? prev.rag_unit_id : card.rag_unit_id;
      card.rag_quiz_for_exam = prev.rag_quiz_for_exam ?? card.rag_quiz_for_exam;
      card.ragQuizForExamLoading = false;
      card.ragQuizForExamError = '';
      card.ragQuizFollowupLoading = false;
      card.ragQuizFollowupError = '';
      card.quizGenerateMode =
        prev.quizGenerateMode
        ?? (ragQuizApiRowIsFollowUp(generateQuizResponseJson)
          ? 'followup'
          : (followupMode ? 'followup' : 'normal'));
      const merged = { ...prev, ...card };
      applyQuizHistoryToCard(merged, generateQuizResponseJson);
      syncQuizCardPromptBaselines(merged);
      sub[idx] = merged;
    } else {
      applyQuizHistoryToCard(card, generateQuizResponseJson);
      syncQuizCardPromptBaselines(card);
      sub.push(card);
    }
    state.unitSlotQuizCards[slotIndex - 1] = sortUnitQuizCardsByRagQuizId(sub);
    state.cardList[slotIndex - 1] = focalCardFromUnitQuizList(
      state.unitSlotQuizCards[slotIndex - 1],
      state.slotFormState?.[slotIndex]
    );
    return;
  }

  syncQuizCardPromptBaselines(card);
  state.cardList[slotIndex - 1] = card;
}

/** 產生題目 */
async function generateQuiz(slotIndex) {
  const state = currentState.value;
  const slotState = getSlotFormState(slotIndex);
  const rag = currentRagItem.value;
  const tidFromZip = String(state.zipTabId ?? '').trim();
  const tidFromRag = rag?.rag_tab_id != null ? String(rag.rag_tab_id).trim() : '';
  const aid = activeTabId.value;
  const tidFromActive = aid && !isNewTabId(aid) ? String(aid).trim() : '';
  const sourceTabId = tidFromZip || tidFromRag || tidFromActive;
  const selectedUnit = findQuizUnitBySlotSelection(generateQuizUnits.value, slotState.generateQuizTabId);
  if (!selectedUnit) {
    slotState.error = '請先選擇單元';
    return;
  }
  const unitName = String(selectedUnit.unit_name ?? selectedUnit.rag_name ?? '').trim();
  const ragName = selectedUnit.rag_name?.trim() || unitName;
  const ragId = rag?.rag_id ?? rag?.id ?? state?.zipResponseJson?.rag_id ?? state?.zipResponseJson?.id;
  if (ragId == null) {
    slotState.error = '無法取得題庫編號，請先上傳教材或重新整理頁面';
    return;
  }
  if (!generateQuizUnits.value.length) {
    slotState.error = '請先在「設定單元」按「開始建立單元」完成題庫建立，或重新整理頁面';
    return;
  }
  slotState.loading = true;
  slotState.error = '';
  slotState.responseJson = null;
  try {
    const data = await apiGenerateQuiz(ragId, sourceTabId, unitName);
    slotState.responseJson = data;
    const quizContent = data[API_RESPONSE_QUIZ_CONTENT] ?? data[API_RESPONSE_QUIZ_LEGACY] ?? data.quiz_content ?? '';
    const hintText = data.quiz_hint ?? data.hint ?? '';
    const targetFilename = data.unit_filename ?? data.target_filename ?? selectedUnit?.filename ?? '';
    const referenceAnswerText =
      data.quiz_answer_reference ?? data.quiz_reference_answer ?? data.quiz_answer ?? data.answer ?? '';
    const rawRagQuizId =
      data.rag_quiz_id != null ? Number(data.rag_quiz_id) : (data.quiz_id != null ? Number(data.quiz_id) : null);
    const ragQuizId = Number.isFinite(rawRagQuizId) ? rawRagQuizId : null;
    setCardAtSlot(
      slotIndex,
      quizContent,
      hintText,
      targetFilename,
      referenceAnswerText,
      ragName,
      data,
      ragId,
      ragQuizId
    );
  } catch (err) {
    slotState.error = err.message || '產生題目失敗';
  } finally {
    slotState.loading = false;
  }
}

/** 評分（後端已儲存 answer_user_prompt_text）：POST /rag/tab/unit/quiz/llm-grade-db；body 不含 answer_user_prompt_text。按鈕啟停用同「產生題目」；送出時作答仍須非空（否則靜默 return）。 */
async function confirmAnswerGradeDb(item) {
  if (!item.quiz_answer.trim()) return;
  const state = currentState.value;
  const rag = currentRagItem.value;
  const activeRagId = rag?.rag_id ?? rag?.id ?? state?.zipResponseJson?.rag_id ?? state?.zipResponseJson?.id;
  const cardRag = item?.rag_id;
  if (
    activeRagId != null &&
    cardRag != null &&
    String(activeRagId).trim() !== '' &&
    String(cardRag).trim() !== '' &&
    String(activeRagId).trim() !== String(cardRag).trim()
  ) {
    return;
  }
  const sourceTabId = String(state.zipTabId ?? '').trim();
  const ragId = activeRagId;
  if (!sourceTabId) {
    item.gradingResult = '請先上傳教材並完成題庫建立，再進行批改。';
    return;
  }
  if (ragId == null) {
    item.gradingResult = '無法批改：請先上傳教材或重新整理頁面後再試。';
    return;
  }
  gradingSubmittingCardId.value = item.id;
  try {
    await submitGrade(item, { sourceTabId, ragId }, { ragGradeUsesStoredPrompt: true });
    if (item.confirmed) {
      item.gradingPromptBaseline = String(item.gradingPrompt ?? '');
      item.quizAnswerBaseline = String(item.quiz_answer ?? '');
      item.hasUsedSaveAndGradeOnce = true;
    }
  } finally {
    gradingSubmittingCardId.value = null;
  }
}

/** 評分：POST /rag/tab/unit/quiz/llm-grade；body 以 rag_id、rag_quiz_id、quiz_answer 為核心；quiz_content 可省略（後端自 Rag_Quiz 讀）；選填 rag_tab_id、answer_user_prompt_text。題卡區「儲存並開始批改」須批改規則非空且相對 baseline 已改動；送出時作答須非空否則靜默 return／顯示訊息。 */
async function confirmAnswer(item) {
  if (!item.quiz_answer.trim()) return;
  if (!String(item.gradingPrompt ?? '').trim()) {
    item.gradingResult = '請填寫批改規則';
    return;
  }
  const state = currentState.value;
  const rag = currentRagItem.value;
  const activeRagId = rag?.rag_id ?? rag?.id ?? state?.zipResponseJson?.rag_id ?? state?.zipResponseJson?.id;
  const cardRag = item?.rag_id;
  if (
    activeRagId != null &&
    cardRag != null &&
    String(activeRagId).trim() !== '' &&
    String(cardRag).trim() !== '' &&
    String(activeRagId).trim() !== String(cardRag).trim()
  ) {
    return;
  }
  const sourceTabId = String(state.zipTabId ?? '').trim();
  const ragId = activeRagId;
  if (!sourceTabId) {
    item.gradingResult = '請先上傳教材並完成題庫建立，再進行批改。';
    return;
  }
  if (ragId == null) {
    item.gradingResult = '無法批改：請先上傳教材或重新整理頁面後再試。';
    return;
  }
  gradingSubmittingCardId.value = item.id;
  try {
    await submitGrade(item, { sourceTabId, ragId }, {});
    if (item.confirmed) {
      item.gradingPromptBaseline = String(item.gradingPrompt ?? '');
      item.quizAnswerBaseline = String(item.quiz_answer ?? '');
      item.hasUsedSaveAndGradeOnce = true;
    }
  } finally {
    gradingSubmittingCardId.value = null;
  }
}
</script>

<template>
  <div
    class="d-flex flex-column h-100 overflow-hidden my-bgcolor-gray-4 position-relative"
    :class="{ 'my-design--side-panel-left': designSidePanelOnLeft }"
  >
    <LoadingOverlay
      :is-visible="loadingOverlayVisible"
      :loading-text="loadingOverlayText"
      :sub-text="loadingOverlaySubText"
    />
    <TabRenameModal
      v-model="renameRagTabModalOpen"
      :initial-name="renameRagTabInitialName"
      :saving="renameRagTabSaving"
      :error="renameRagTabError"
      title="修改名稱"
      @save="onRenameRagTabSave"
    />
    <TabRenameModal
      v-model="renameUnitQuizModalOpen"
      :initial-name="renameUnitQuizInitialName"
      :saving="renameUnitQuizSaving"
      :error="renameUnitQuizError"
      title="修改題型"
      @save="onRenameUnitQuizSave"
    />
    <TabRenameModal
      v-model="renamePackUnitModalOpen"
      :initial-name="renamePackUnitInitialName"
      :saving="false"
      :error="renamePackUnitError"
      title="修改單元"
      @save="onRenamePackUnitSave"
    />
    <Teleport to="body">
      <div
        v-if="packFolderPickModalOpen"
        class="modal fade show d-block my-modal-backdrop"
        tabindex="-1"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pack-folder-pick-modal-title"
        @click.self="closePackFolderPickModal"
      >
        <div
          class="modal-dialog modal-dialog-centered modal-dialog-scrollable"
          @click.stop
        >
          <div class="modal-content border-0 my-bgcolor-gray-3 p-4 d-flex flex-column gap-3">
            <div class="modal-header border-bottom-0 p-0">
              <h5
                id="pack-folder-pick-modal-title"
                class="modal-title my-color-black"
              >
                選擇資料夾
              </h5>
              <button
                type="button"
                class="btn-close"
                aria-label="關閉"
                @click="closePackFolderPickModal"
              />
            </div>
            <div class="modal-body p-0 min-w-0">
              <p
                v-if="!secondFoldersFull.length"
                class="my-font-md-400 my-color-gray-1 mb-0"
              >
                ZIP 內尚無可選資料夾
              </p>
              <div
                v-else
                class="form-control my-input-md my-input-md--on-dark rounded-2 w-100 min-w-0 px-3 py-2 my-font-md-400 d-flex flex-wrap align-items-center gap-1"
                style="min-height: 2.5rem; height: auto;"
                role="group"
                aria-label="選擇資料夾"
              >
                <div class="d-flex flex-wrap align-items-center gap-1 w-100 min-w-0">
                  <button
                    v-for="(name, i) in secondFoldersFull"
                    :key="'pack-folder-pick-' + i"
                    type="button"
                    class="badge user-select-none my-font-sm-400 d-inline-flex align-items-center gap-1 rounded px-2 py-1 my-pack-folder-pick-chip"
                    :class="{ 'my-pack-folder-pick-chip--selected': isPackFolderPickDraftSelected(name) }"
                    :aria-pressed="isPackFolderPickDraftSelected(name)"
                    :disabled="packGroupsEditBlocked"
                    @click="togglePackFolderPickDraft(name)"
                  >
                    {{ name }}
                  </button>
                </div>
              </div>
            </div>
            <div class="modal-footer border-top-0 p-0 d-flex flex-wrap justify-content-end gap-2">
              <button
                type="button"
                class="btn rounded-pill d-flex justify-content-center align-items-center my-font-md-400 my-button-transparent-borderless px-3 py-2"
                :disabled="packGroupsEditBlocked"
                @click="closePackFolderPickModal"
              >
                取消
              </button>
              <button
                type="button"
                class="btn rounded-pill d-flex justify-content-center align-items-center gap-2 my-font-md-400 my-button-black px-3 py-2"
                :disabled="packGroupsEditBlocked"
                @click="confirmPackFolderPick"
              >
                確定
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
    <Teleport to="body">
      <div
        v-if="packUnitDetailModalOpen && activeReadonlyPackUnitRow"
        class="modal fade show d-block my-modal-backdrop"
        tabindex="-1"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pack-unit-detail-modal-title"
        @click.self="closePackUnitDetailModal"
      >
        <div
          class="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable"
          @click.stop
        >
          <div class="modal-content border-0 my-bgcolor-gray-3 p-4 d-flex flex-column gap-3">
            <div class="modal-header border-bottom-0 p-0">
              <h5
                id="pack-unit-detail-modal-title"
                class="modal-title my-color-black text-break"
              >{{ builtPackUnitSectionHeadingTitle }}</h5>
              <button
                type="button"
                class="btn-close"
                aria-label="關閉"
                @click="closePackUnitDetailModal"
              />
            </div>
            <div class="modal-body p-0 min-w-0" style="max-height: 70vh; overflow: auto;">
              <div
                :key="'pack-unit-detail-' + activeReadonlyPackUnitRow.key"
                class="my-design-pack-unit-blocks w-100 min-w-0"
              >
                <div class="row g-3 w-100 min-w-0">
                  <div class="col-12 min-w-0">
                    <div class="my-design-pack-unit-section w-100 min-w-0">
                      <div
                        class="my-pack-folder-field-input rounded-2 w-100 min-w-0 d-flex align-items-center gap-1 position-relative p-2"
                        style="min-height: 2.5rem;"
                        role="group"
                        aria-label="資料夾組合"
                      >
                        <div class="d-flex flex-column gap-1 flex-grow-1 w-100 min-w-0">
                          <span class="my-font-sm-400 my-color-black">資料夾組合</span>
                          <div class="d-flex flex-wrap align-items-center gap-1 w-100 min-w-0">
                            <template v-if="activeReadonlyPackUnitRow.folderComboTags?.length">
                              <span
                                v-for="(tag, ti) in activeReadonlyPackUnitRow.folderComboTags"
                                :key="`${activeReadonlyPackUnitRow.key}-fc-${ti}`"
                                class="badge my-bgcolor-surface my-color-black border user-select-none my-font-sm-400 d-inline-flex align-items-center gap-1 rounded px-2 py-1"
                              >{{ tag }}</span>
                            </template>
                            <span
                              v-else
                              class="my-font-md-400 my-color-black lh-base text-break w-100 min-w-0"
                            >{{ activeReadonlyPackUnitRow.title }}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div
                    v-for="(och, oi) in activeReadonlyPackUnitRow.outlineChunkFields"
                    :key="activeReadonlyPackUnitRow.key + '-ochunk-' + oi"
                    class="col-12 col-md-6 min-w-0"
                  >
                    <div class="my-design-pack-unit-section w-100 min-w-0">
                      <div class="my-font-sm-400 my-color-gray-1 mb-2">
                        {{ och.label }}
                      </div>
                      <div class="my-font-md-400 my-color-black lh-base text-break w-100 min-w-0">
                        {{ och.value }}
                      </div>
                    </div>
                  </div>
                  <div
                    v-if="bankUnitMp3PlayerProps"
                    class="col-12 min-w-0"
                  >
                    <RagTabUnitMp3Player
                      :rag-tab-id="bankUnitMp3PlayerProps.ragTabId"
                      :rag-unit-id="bankUnitMp3PlayerProps.ragUnitId"
                    />
                  </div>
                  <div
                    v-if="bankUnitTranscriptMdHtml && bankUnitTranscriptSection && (bankUnitTranscriptSection.unitType === UNIT_TYPE_MP3 || bankUnitTranscriptSection.unitType === UNIT_TYPE_YOUTUBE)"
                    class="col-12 min-w-0"
                  >
                    <div class="my-design-pack-unit-section w-100 min-w-0">
                      <div class="my-font-sm-400 my-color-gray-1 mb-2">逐字稿</div>
                      <div
                        class="my-markdown-rendered my-font-md-400 my-color-black text-break"
                        v-html="bankUnitTranscriptMdHtml"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="modal-footer border-top-0 p-0 d-flex justify-content-end w-100">
              <button
                type="button"
                class="btn rounded-pill d-flex justify-content-center align-items-center my-font-md-400 my-button-black px-4 py-2"
                @click="closePackUnitDetailModal"
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
    <QuizHistoryModal
      v-model="bankQuizHistoryModalOpen"
      :unit-label="bankQuizHistoryModalUnitLabel"
      :quiz-type-label="bankQuizHistoryModalQuizTypeLabel"
      :is-followup="bankQuizHistoryModalIsFollowup"
      :history-list="bankQuizHistoryModalList"
      title-id="bank-quiz-history-modal-title"
    />
    <Teleport to="body">
      <div
        v-if="bankPromptEditModalOpen"
        class="modal fade show d-block my-modal-backdrop"
        tabindex="-1"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bank-prompt-edit-modal-title"
      >
        <div
          class="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable"
          @click.stop
        >
          <div class="modal-content border-0 my-bgcolor-gray-3 p-4 d-flex flex-column gap-3">
            <div class="modal-header border-bottom-0 p-0">
              <h5
                id="bank-prompt-edit-modal-title"
                class="modal-title my-color-black"
              >{{ bankPromptEditModalTitle }}</h5>
              <button
                type="button"
                class="btn-close"
                aria-label="關閉"
                @click="closeBankPromptEditModal"
              />
            </div>
            <div class="modal-body p-0 min-w-0">
              <EnglishExamMarkdownEditor
                v-model="bankPromptEditModalDraft"
                :textarea-id="`bank-prompt-edit-${bankPromptEditModalKind}-${activeUnitSlotIndex}`"
                :disabled="bankPromptEditModalSavingDisabled"
              />
            </div>
            <div
              class="modal-footer border-top-0 p-0 d-flex justify-content-end align-items-center flex-nowrap gap-2 w-100"
            >
              <button
                type="button"
                class="btn rounded-pill d-inline-flex justify-content-center align-items-center my-font-md-400 my-color-gray-1 my-button-transparent-borderless px-4 py-2"
                title="還原為上次載入或產生後的內容"
                aria-label="重設"
                :disabled="bankPromptEditModalResetDisabled"
                @click="resetBankPromptEditModalDraft"
              >
                重設
              </button>
              <button
                type="button"
                class="btn rounded-pill d-flex justify-content-center align-items-center my-font-md-400 my-button-black px-4 py-2"
                :disabled="bankPromptEditModalSavingDisabled"
                @click="applyBankPromptEditModal"
              >
                確定
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
    <Teleport to="body">
      <div
        v-if="transcriptEditModalOpen"
        class="modal fade show d-block my-modal-backdrop"
        tabindex="-1"
        role="dialog"
        aria-modal="true"
        aria-labelledby="transcript-edit-modal-title"
        @click.self="closeTranscriptEditModal"
      >
        <div
          class="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable"
          @click.stop
        >
          <div class="modal-content border-0 my-bgcolor-gray-3 p-4 d-flex flex-column gap-3">
            <div class="modal-header border-bottom-0 p-0">
              <h5
                id="transcript-edit-modal-title"
                class="modal-title my-color-black"
              >編輯來源內容</h5>
              <button
                type="button"
                class="btn-close"
                aria-label="關閉"
                @click="closeTranscriptEditModal"
              />
            </div>
            <div class="modal-body p-0 min-w-0">
              <EnglishExamMarkdownEditor
                v-model="transcriptEditModalDraft"
                :textarea-id="`transcript-edit-md-${transcriptEditModalGi}`"
                :disabled="transcriptEditModalDisabled"
              />
            </div>
            <div
              class="modal-footer border-top-0 p-0 d-flex justify-content-end align-items-center flex-nowrap gap-2 w-100"
            >
              <button
                type="button"
                class="btn rounded-pill d-inline-flex justify-content-center align-items-center my-font-md-400 my-color-gray-1 my-button-transparent-borderless px-4 py-2"
                aria-label="取消"
                @click="closeTranscriptEditModal"
              >
                取消
              </button>
              <button
                type="button"
                class="btn rounded-pill d-flex justify-content-center align-items-center my-font-md-400 my-button-black px-4 py-2"
                :disabled="transcriptEditModalDisabled"
                @click="applyTranscriptEditModal"
              >
                確定
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
    <Teleport to="body">
      <div
        v-if="newBankUploadModalOpen"
        class="modal fade show d-block my-modal-backdrop"
        tabindex="-1"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-bank-upload-modal-title"
        @click.self="closeNewBankUploadModal"
      >
        <div
          class="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable"
          @click.stop
        >
          <div class="modal-content border-0 my-bgcolor-gray-3 p-4 d-flex flex-column gap-3">
            <div class="modal-header border-bottom-0 p-0">
              <h5
                id="new-bank-upload-modal-title"
                class="modal-title my-color-black"
              >上傳檔案</h5>
              <button
                type="button"
                class="btn-close"
                aria-label="關閉"
                :disabled="createRagLoading"
                @click="closeNewBankUploadModal"
              />
            </div>
            <div class="modal-body p-0 min-w-0">
              <input
                ref="newBankUploadFileInputRef"
                type="file"
                :accept="zipFileInputAccept"
                class="d-none"
                @change="onNewBankUploadZipChange"
              >
              <div
                class="my-zip-drop-zone text-center position-relative"
                :class="{ 'my-zip-drop-zone-over': newBankUploadZipDragOver }"
                @dragover="onNewBankUploadZipDragOver"
                @dragenter="onNewBankUploadZipDragOver"
                @dragleave="onNewBankUploadZipDragLeave"
                @drop="onNewBankUploadZipDrop"
                @click="openNewBankUploadFileDialog"
              >
                <template v-if="newBankUploadFileName">
                  <span class="my-font-sm-400 my-color-black">{{ newBankUploadFileName }}</span>
                  <div class="my-font-sm-400 my-color-gray-4 mt-1">點擊可重新選擇檔案</div>
                </template>
                <span v-else class="my-font-sm-400 my-color-gray-4">拖曳.zip檔到這裡，或點擊選擇檔案</span>
                <div class="my-font-sm-400 my-color-gray-4 mt-2">
                  單檔不可超過 50 MB
                </div>
                <div
                  class="my-font-sm-400 my-color-gray-4 mt-2 text-start lh-sm w-100 mx-auto"
                  style="max-width: 28rem;"
                >
                  <div class="mb-1">
                    請在「設定單元」為 ZIP 內各資料夾分別選單元類型；各資料夾裡，後端會讀取的副檔名依類型如下：
                  </div>
                  <ul class="my-font-sm-400 my-color-gray-4 mb-0 ps-3">
                    <li class="mb-0">RAG：.pdf、.doc、.docx、.ppt、.pptx</li>
                    <li class="mb-0">文字：該資料夾內只能有一個 .md、.txt、.doc 或 .docx</li>
                    <li class="mb-0">mp3：該資料夾內只能有一個.mp3檔</li>
                    <li class="mb-0">youtube：.md、.txt、.doc 或 .docx（檔內須為 YouTube 網址）</li>
                  </ul>
                </div>
              </div>
              <div
                v-if="newBankUploadError"
                class="my-alert-danger-soft my-font-sm-400 py-2 mt-2 mb-0"
              >
                {{ newBankUploadError }}
              </div>
            </div>
            <div class="modal-footer border-top-0 p-0 d-flex justify-content-end gap-2 w-100">
              <button
                type="button"
                class="btn rounded-pill d-inline-flex justify-content-center align-items-center my-font-md-400 my-color-gray-1 my-button-transparent-borderless px-4 py-2"
                :disabled="createRagLoading"
                @click="closeNewBankUploadModal"
              >
                取消
              </button>
              <button
                type="button"
                class="btn rounded-pill d-flex justify-content-center align-items-center gap-2 my-font-md-400 my-button-white flex-shrink-0 px-4 py-2"
                :disabled="newBankUploadConfirmDisabled"
                :aria-busy="createRagLoading"
                @click.stop="confirmNewBankUpload"
              >
                確定上傳
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
    <Teleport to="body">
      <div
        v-if="deletePackUnitModalOpen"
        class="modal fade show d-block my-modal-backdrop"
        tabindex="-1"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-pack-unit-modal-title"
        @click.self="closeDeletePackUnitModal"
      >
        <div class="modal-dialog modal-dialog-centered" @click.stop>
          <div class="modal-content border-0 my-bgcolor-gray-3 p-4 d-flex flex-column gap-3">
            <div class="modal-header border-bottom-0 p-0">
              <h5
                id="delete-pack-unit-modal-title"
                class="modal-title my-color-black"
              >
                刪除單元
              </h5>
              <button
                type="button"
                class="btn-close"
                aria-label="關閉"
                @click="closeDeletePackUnitModal"
              />
            </div>
            <div class="modal-body p-0 min-w-0">
              <p class="my-font-md-400 my-color-black mb-0 text-break">
                {{ deletePackUnitConfirmMessage }}
              </p>
            </div>
            <div class="modal-footer border-top-0 p-0 d-flex flex-wrap justify-content-end gap-2">
              <button
                type="button"
                class="btn rounded-pill d-flex justify-content-center align-items-center my-font-md-400 my-button-transparent-borderless px-3 py-2"
                @click="closeDeletePackUnitModal"
              >
                取消
              </button>
              <button
                type="button"
                class="btn rounded-pill d-flex justify-content-center align-items-center my-font-md-400 my-button-red px-3 py-2"
                @click="confirmDeletePackUnit"
              >
                刪除
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
    <Teleport to="body">
      <div
        v-if="deleteAllPackUnitsModalOpen"
        class="modal fade show d-block my-modal-backdrop"
        tabindex="-1"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-all-pack-units-modal-title"
        @click.self="closeDeleteAllPackUnitsModal"
      >
        <div class="modal-dialog modal-dialog-centered" @click.stop>
          <div class="modal-content border-0 my-bgcolor-gray-3 p-4 d-flex flex-column gap-3">
            <div class="modal-header border-bottom-0 p-0">
              <h5
                id="delete-all-pack-units-modal-title"
                class="modal-title my-color-black"
              >
                刪除全部
              </h5>
              <button
                type="button"
                class="btn-close"
                aria-label="關閉"
                @click="closeDeleteAllPackUnitsModal"
              />
            </div>
            <div class="modal-body p-0 min-w-0">
              <p class="my-font-md-400 my-color-black mb-0 text-break">
                確定要刪除全部設定單元嗎？
              </p>
            </div>
            <div class="modal-footer border-top-0 p-0 d-flex flex-wrap justify-content-end gap-2">
              <button
                type="button"
                class="btn rounded-pill d-flex justify-content-center align-items-center my-font-md-400 my-button-transparent-borderless px-3 py-2"
                @click="closeDeleteAllPackUnitsModal"
              >
                取消
              </button>
              <button
                type="button"
                class="btn rounded-pill d-flex justify-content-center align-items-center my-font-md-400 my-button-red px-3 py-2"
                @click="confirmDeleteAllPackUnits"
              >
                刪除
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
    <Teleport to="body">
      <div
        v-if="deleteUnitQuizModalOpen"
        class="modal fade show d-block my-modal-backdrop"
        tabindex="-1"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-unit-quiz-modal-title"
        @click.self="closeDeleteUnitQuizModal"
      >
        <div class="modal-dialog modal-dialog-centered" @click.stop>
          <div class="modal-content border-0 my-bgcolor-gray-3 p-4 d-flex flex-column gap-3">
            <div class="modal-header border-bottom-0 p-0">
              <h5
                id="delete-unit-quiz-modal-title"
                class="modal-title my-color-black"
              >
                刪除題型
              </h5>
              <button
                type="button"
                class="btn-close"
                aria-label="關閉"
                @click="closeDeleteUnitQuizModal"
              />
            </div>
            <div class="modal-body p-0 min-w-0">
              <p class="my-font-md-400 my-color-black mb-0 text-break">
                {{ deleteUnitQuizConfirmMessage }}
              </p>
            </div>
            <div class="modal-footer border-top-0 p-0 d-flex flex-wrap justify-content-end gap-2">
              <button
                type="button"
                class="btn rounded-pill d-flex justify-content-center align-items-center my-font-md-400 my-button-transparent-borderless px-3 py-2"
                :disabled="deleteUnitQuizLoading"
                @click="closeDeleteUnitQuizModal"
              >
                取消
              </button>
              <button
                type="button"
                class="btn rounded-pill d-flex justify-content-center align-items-center my-font-md-400 my-button-red px-3 py-2"
                :disabled="deleteUnitQuizLoading"
                :aria-busy="deleteUnitQuizLoading"
                @click="confirmDeleteUnitQuiz"
              >
                刪除
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
    <Teleport to="body">
      <div
        v-if="packBuildSuccessModalOpen"
        class="modal fade show d-block my-modal-backdrop"
        tabindex="-1"
        role="dialog"
        aria-modal="true"
        aria-label="單元建立完成"
      >
        <div class="modal-dialog modal-dialog-centered" @click.stop>
          <div class="modal-content border-0 my-bgcolor-gray-3 p-4 d-flex flex-column gap-3">
            <div class="modal-body p-0 text-center">
              <p class="my-font-md-400 my-color-black mb-0">單元建立完成</p>
            </div>
            <div class="modal-footer border-top-0 p-0 d-flex justify-content-center w-100">
              <button
                type="button"
                class="btn rounded-pill d-flex justify-content-center align-items-center gap-2 my-font-md-400 my-button-black px-3 py-2"
                @click="closePackBuildSuccessModal"
              >
                確定
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
    <header class="flex-shrink-0 my-bgcolor-gray-4 p-4">
      <div class="container-fluid px-0 text-center">
        <p class="my-font-xl-400 my-color-black text-break mb-0">{{ pageTitle }}</p>
      </div>
    </header>
    <div class="flex-shrink-0 my-rag-tabs-bar my-bgcolor-gray-4">
      <div class="d-flex justify-content-center align-items-center w-100">
        <template v-if="ragListLoading && ragItems.length === 0 && newTabItems.length === 0">
          <div class="w-100 py-2" aria-busy="true" />
        </template>
        <template v-else-if="ragItems.length === 0 && newTabItems.length === 0">
          <div class="w-100 py-2" aria-hidden="true" />
        </template>
        <template v-else>
          <ul class="nav nav-tabs w-100">
            <li v-for="item in ragItems" :key="'rag-' + item._tabId" class="nav-item">
              <div
                role="tab"
                class="nav-link d-flex align-items-center gap-1"
                :class="{ active: activeTabId === item._tabId }"
                :aria-current="activeTabId === item._tabId ? 'page' : undefined"
              >
                <span
                  class="flex-grow-1 text-start pe-2"
                  style="cursor: pointer"
                  @click="activeTabId = item._tabId"
                >
                  {{ item._label }}
                </span>
                <button
                  v-if="activeTabId === item._tabId"
                  type="button"
                  class="btn btn-link text-decoration-none my-tab-nav-action-btn my-color-gray-4 pe-2"
                  title="重新命名分頁"
                  :disabled="deleteRagLoading || renameRagTabSaving || renameUnitQuizSaving || deleteUnitQuizLoading"
                  @click.stop="openRenameRagTab(item._tabId)"
                >
                  <i class="fa-solid fa-pen" aria-hidden="true" />
                </button>
                <!-- 綠點／× 同槽；綠點僅依題庫是否含測驗用，不依是否選中該分頁 -->
                <span
                  v-if="item._isExamRag || activeTabId === item._tabId"
                  class="d-inline-flex justify-content-center align-items-center flex-shrink-0 my-tab-nav-action-btn"
                >
                  <span
                    v-if="item._isExamRag"
                    class="d-inline-flex justify-content-center align-items-center"
                    title="試卷用題庫"
                    role="img"
                    aria-label="試卷用題庫"
                  >
                    <span
                      class="rounded-circle d-inline-block my-bgcolor-green"
                      style="width: 0.5rem; height: 0.5rem"
                    />
                  </span>
                  <button
                    v-else
                    type="button"
                    class="btn btn-link text-decoration-none my-color-gray-4 p-0 border-0 lh-1 align-middle"
                    title="刪除此題庫"
                    :disabled="deleteRagLoading || renameRagTabSaving || renameUnitQuizSaving || deleteUnitQuizLoading"
                    @click.stop="onDeleteRagTab(item._tabId)"
                  >
                    <i class="fa-solid fa-xmark" aria-hidden="true" />
                  </button>
                </span>
              </div>
            </li>
            <li v-for="item in newTabItems" :key="'new-' + item.id" class="nav-item">
              <button
                type="button"
                class="nav-link d-flex align-items-center gap-1 w-100 text-start border-0 bg-transparent"
                :class="{ active: activeTabId === item.id }"
                :aria-current="activeTabId === item.id ? 'page' : undefined"
                @click="activeTabId = item.id"
              >
                <span class="flex-grow-1 text-start pe-2">{{ item.label }}</span>
              </button>
            </li>
            <li class="nav-item d-flex align-items-center ms-2">
              <button
                type="button"
                title="新增分頁"
                aria-label="新增分頁"
                :aria-busy="createRagLoading"
                class="btn rounded-circle d-flex justify-content-center align-items-center my-font-md-400 my-button-transparent-borderless my-btn-circle mb-2"
                :disabled="createRagLoading"
                @click="openNewBankUploadModal"
              >
                <i class="fa-solid fa-plus" aria-hidden="true" />
              </button>
            </li>
          </ul>
        </template>
      </div>
      <div v-if="ragListError" class="my-alert-warning-soft my-font-sm-400 py-2 mx-4 mb-3">
        {{ ragListError }}
      </div>
      <div v-if="createRagError" class="my-alert-danger-soft my-font-sm-400 py-2 mx-4 mb-3">
        {{ createRagError }}
      </div>
    </div>

    <div class="flex-grow-1 overflow-hidden my-bgcolor-gray-4 d-flex flex-column min-h-0">
      <div
        class="row g-0 flex-grow-1 min-h-0 h-100 my-design-tab-split-layout"
        :class="{ 'my-design-tab-split-layout--side-left': designSidePanelOnLeft }"
      >
        <div
          class="h-100 min-h-0 overflow-hidden my-design-tab-left-view"
          :class="[
            showSidePanelColumn ? 'col-8 col-xl-8 col-xxl-9' : 'col-12',
            showSidePanelColumn && designSidePanelOnLeft ? 'order-2' : '',
          ]"
        >
          <div
            class="my-design-tab-left-view-scroll h-100 min-h-0 overflow-auto d-flex flex-column"
            :class="{ 'my-design-tab-left-view-scroll--show-scrollbar': designSidePanelOnLeft }"
          >
      <div
        v-if="!showCreateBankMainForm"
        class="flex-grow-1 d-flex align-items-center justify-content-center px-3 py-5 min-h-0"
      >
        <button
          v-if="!ragListLoading"
          type="button"
          class="btn rounded-pill d-flex justify-content-center align-items-center gap-2 my-font-md-400 my-button-gray-3 px-4 py-3"
          :title="`新增${quizBankNoun}`"
          :aria-label="`新增${quizBankNoun}`"
          :disabled="createRagLoading"
          :aria-busy="createRagLoading"
          @click="openNewBankUploadModal"
        >
          <i class="fa-solid fa-plus" aria-hidden="true" />
          新增{{ quizBankNoun }}
        </button>
      </div>
      <div
        v-else
        class="container-fluid px-3 px-md-4 py-4 d-flex flex-column flex-grow-1 min-h-0"
        :class="{ 'my-pack-empty-start-layout': isPackEmptyStartView }"
      >
        <div class="row justify-content-center">
          <div
            :class="
              showSidePanelColumn
                ? 'col-12 col-xl-10 col-xxl-8'
                : 'col-12 col-lg-10 col-xl-8 col-xxl-6'
            "
          >
      <!-- 有資料或已點新增後顯示表單 -->
      <template v-if="showCreateBankMainForm">
      <!-- 建立 RAG：要有 file_metadata 且尚未建置；建置前 left 顯示可編輯設定單元（上傳檔名改由 right view） -->
      <template v-if="fileMetadataToShow != null && !hasBuiltRagSummary">
        <div class="w-100">
          <!-- 設定單元（建置前可編輯；標題／面板樣式對齊建置後「設定單元題型」） -->
          <section class="text-start my-page-block-spacing">
            <div class="my-design-pack-unit-blocks w-100 min-w-0">
            <div class="my-pack-unit-settings-body">
          <!-- 單元：Carousel 一次只顯示一個出題單元；切換由右側單元 list 負責 -->
          <div class="my-pack-unit-settings-carousel">
            <template v-if="packUnitCarouselCountEffective > 0">
              <div
                :key="'pack-unit-heading-' + activePackUnitGi"
                class="w-100 min-w-0"
              >
                <div
                  id="design-pack-unit-section-label"
                  class="my-font-sm-400 my-color-gray-1 mb-2"
                >
                  設定單元
                </div>
                <div
                  class="d-flex align-items-center gap-1 flex-nowrap min-w-0 overflow-hidden"
                  role="heading"
                  aria-level="2"
                >
                  <span class="my-design-pack-unit-main-title my-test-section-heading-title text-truncate mb-0">{{ activePackUnitDisplayLabel }}</span>
                  <button
                    type="button"
                    class="btn btn-link text-decoration-none my-tab-nav-action-btn my-color-gray-4 flex-shrink-0"
                    title="重新命名單元"
                    aria-label="重新命名單元"
                    :disabled="packGroupsEditBlocked"
                    @click="openRenamePackUnitTab(activePackUnitGi)"
                  >
                    <i class="fa-solid fa-pen" aria-hidden="true" />
                  </button>
                </div>
              </div>
            <div
              :key="'rg-' + activePackUnitGi"
              class="my-pack-unit-attrs-panel rounded-4 my-bgcolor-gray-3 p-3 w-100 min-w-0 d-flex flex-column gap-4"
              role="group"
              aria-label="單元設定"
            >
              <div class="row gx-2 gy-4 w-100 min-w-0">
                  <div class="col-12 min-w-0">
                    <div class="my-design-pack-unit-section w-100 min-w-0">
                      <div class="my-font-sm-400 my-color-gray-1 mb-0">資料夾組合</div>
                      <div
                        class="form-control my-input-md my-input-md--on-dark rounded-2 w-100 min-w-0 px-2 py-2 my-font-md-400 mt-1 d-flex align-items-center gap-2 my-pack-folder-combo-field"
                        style="min-height: 2.5rem; height: auto;"
                        role="group"
                        aria-label="資料夾組合"
                      >
                        <div class="d-flex flex-wrap align-items-center gap-1 flex-grow-1 min-w-0">
                          <div
                            v-for="(tag, ti) in activePackUnitGroup"
                            :key="'t-' + activePackUnitGi + '-' + ti"
                            class="badge my-bgcolor-surface my-color-black border user-select-none my-font-sm-400 d-inline-flex align-items-center gap-1 rounded px-2 py-1"
                          >
                            {{ tag }}
                            <span
                              class="my-color-gray-4 ms-1"
                              style="cursor: pointer;"
                              @click.stop="removeFromRagList(activePackUnitGi, ti)"
                            >×</span>
                          </div>
                          <span v-if="!activePackUnitGroup.length" class="my-color-gray-4 my-font-sm-400">尚未選擇資料夾</span>
                        </div>
                        <button
                          type="button"
                          class="btn rounded-pill d-inline-flex justify-content-center align-items-center gap-2 flex-shrink-0 my-font-sm-400 my-button-gray-3 px-3 py-1"
                          title="加入資料夾"
                          aria-label="加入資料夾"
                          :disabled="packGroupsEditBlocked || !secondFoldersFull.length"
                          @click="openPackFolderPickModal(activePackUnitGi)"
                        >
                          <i class="fa-solid fa-plus" aria-hidden="true" />
                          加入資料夾
                        </button>
                      </div>
                    </div>
                  </div>
                  <div class="col-12 min-w-0">
                    <div class="my-design-pack-unit-section w-100 min-w-0">
                      <div class="my-font-sm-400 my-color-gray-1 mb-0">
                        類型
                      </div>
                      <div
                        class="d-inline-flex flex-wrap gap-1 rounded-pill my-bgcolor-white flex-shrink-0 align-self-start p-1 mt-1"
                        role="group"
                        :aria-label="`設定單元 ${activePackUnitGi + 1} 類型`"
                      >
                        <button
                          v-for="opt in PACK_UNIT_TYPE_OPTIONS"
                          :key="'pack-unit-type-' + activePackUnitGi + '-' + opt.value"
                          type="button"
                          class="btn rounded-pill d-flex justify-content-center align-items-center my-font-sm-400 px-3 py-1"
                          :class="
                            packUnitTypeAt(activePackUnitGi) === opt.value
                              ? 'my-button-gray-3'
                              : 'my-button-transparent-borderless'
                          "
                          :disabled="
                            packGroupsEditBlocked
                              || activePackUnitGroup.length === 0
                              || packUnitTypeOptionDisabled(activePackUnitGi, opt.value)
                          "
                          @click="onPackUnitTypePick(activePackUnitGi, opt.value)"
                        >
                          {{ opt.label }}
                        </button>
                      </div>
                    </div>
                  </div>
                    <div
                      v-if="packUnitTypeAt(activePackUnitGi) === UNIT_TYPE_RAG"
                      class="col-12 col-md-6 min-w-0"
                    >
                      <div class="my-design-pack-unit-section w-100 min-w-0">
                      <label
                        class="my-font-sm-400 my-color-gray-1 mb-0"
                        :for="'rag-pack-chunk-size-' + activePackUnitGi"
                      >分段長度（字元）</label>
                      <input
                        :id="'rag-pack-chunk-size-' + activePackUnitGi"
                        type="number"
                        min="1"
                        step="1"
                        class="form-control my-input-md my-input-md--on-dark rounded-2 w-100 min-w-0 px-3 py-2 my-font-md-400 mt-1"
                        :disabled="packGroupsEditBlocked || activePackUnitGroup.length === 0"
                        :value="ensureNumber(currentState.packChunkSizes?.[activePackUnitGi], DEFAULT_PACK_CHUNK_SIZE)"
                        :aria-label="`設定單元 ${activePackUnitGi + 1} 分段長度（字元）`"
                        autocomplete="off"
                        @input="onPackChunkSizeInput(activePackUnitGi, $event)"
                      >
                      </div>
                    </div>
                    <div
                      v-if="packUnitTypeAt(activePackUnitGi) === UNIT_TYPE_RAG"
                      class="col-12 col-md-6 min-w-0"
                    >
                      <div class="my-design-pack-unit-section w-100 min-w-0">
                      <label
                        class="my-font-sm-400 my-color-gray-1 mb-0"
                        :for="'rag-pack-chunk-overlap-' + activePackUnitGi"
                      >分段重疊（字元）</label>
                      <input
                        :id="'rag-pack-chunk-overlap-' + activePackUnitGi"
                        type="number"
                        min="0"
                        step="1"
                        class="form-control my-input-md my-input-md--on-dark rounded-2 w-100 min-w-0 px-3 py-2 my-font-md-400 mt-1"
                        :disabled="packGroupsEditBlocked || activePackUnitGroup.length === 0"
                        :value="ensureNumber(currentState.packChunkOverlaps?.[activePackUnitGi], DEFAULT_PACK_CHUNK_OVERLAP)"
                        :aria-label="`設定單元 ${activePackUnitGi + 1} 分段重疊（字元）`"
                        autocomplete="off"
                        @input="onPackChunkOverlapInput(activePackUnitGi, $event)"
                      >
                      </div>
                    </div>
                  <div
                    v-if="packUnitTypeAt(activePackUnitGi) === UNIT_TYPE_TEXT || packUnitTypeAt(activePackUnitGi) === UNIT_TYPE_MP3 || packUnitTypeAt(activePackUnitGi) === UNIT_TYPE_YOUTUBE"
                    class="col-12 min-w-0"
                  >
                    <div class="my-design-pack-unit-section w-100 min-w-0">
                      <div class="d-flex align-items-center justify-content-between mb-0">
                        <div class="my-font-sm-400 my-color-gray-1">
                          來源內容
                        </div>
                        <button
                          type="button"
                          class="btn rounded-pill d-inline-flex justify-content-center align-items-center flex-shrink-0 my-font-sm-400 my-button-gray-3 my-design-quiz-stem-history-btn px-3 py-1"
                          :disabled="packGroupsEditBlocked || !packUnitTranscriptLoadedAt(activePackUnitGi) || packUnitTranscriptBusy(activePackUnitGi)"
                          aria-label="編輯來源內容"
                          @click="openTranscriptEditModal(activePackUnitGi)"
                        >
                          編輯
                        </button>
                      </div>
                      <div class="d-flex flex-column gap-2 w-100 min-w-0 mt-1">
                        <audio
                          v-if="packUnitTypeAt(activePackUnitGi) === UNIT_TYPE_MP3 && (currentState.packUnitMp3PreviewUrls?.[activePackUnitGi] ?? '').trim() !== ''"
                          :key="currentState.packUnitMp3PreviewUrls[activePackUnitGi]"
                          controls
                          class="w-100"
                          preload="none"
                          :src="currentState.packUnitMp3PreviewUrls[activePackUnitGi]"
                        />
                        <div
                          v-if="packUnitTypeAt(activePackUnitGi) === UNIT_TYPE_YOUTUBE && packUnitYoutubeEmbedUrl(activePackUnitGi)"
                          class="ratio ratio-16x9 w-100 rounded-2 overflow-hidden my-border-muted"
                        >
                          <iframe
                            class="border-0"
                            title="YouTube 影片"
                            :src="packUnitYoutubeEmbedUrl(activePackUnitGi)"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            referrerpolicy="strict-origin-when-cross-origin"
                            allowfullscreen
                          />
                        </div>
                        <div
                          class="my-pack-unit-md-preview min-w-0"
                          role="region"
                          aria-label="逐字稿預覽"
                        >
                          <EnglishExamMarkdownEditor
                            :model-value="packUnitTranscriptTextAt(activePackUnitGi)"
                            :preview-only="true"
                            :textarea-id="'pack-unit-transcript-md-' + activePackUnitGi"
                          />
                        </div>
                      </div>
                      <p
                        v-if="currentState.packUnitTranscriptError?.[activePackUnitGi]"
                        class="my-font-sm-400 my-color-red mt-2 mb-0"
                      >
                        {{ currentState.packUnitTranscriptError[activePackUnitGi] }}
                      </p>
                    </div>
                  </div>
              </div>
            </div>
            <div class="d-flex justify-content-start">
              <button
                type="button"
                class="btn rounded-pill d-inline-flex justify-content-center align-items-center my-font-md-400 my-pack-unit-delete-btn px-4 py-2"
                title="刪除此單元"
                aria-label="刪除此單元"
                :disabled="packGroupsEditBlocked"
                @click="openDeletePackUnitModal(activePackUnitGi)"
              >
                刪除此單元
              </button>
            </div>
            </template>
            <div
              v-else
              class="my-pack-empty-start-panel d-flex flex-column align-items-center text-center gap-4 w-100 min-w-0"
            >
              <p class="my-font-lg-400 my-color-gray-1 mb-0">
                {{ packUnitEmptyStartHint }}
              </p>
              <div
                v-if="secondFoldersFull.length"
                class="d-flex flex-wrap justify-content-center align-items-center gap-1 w-100 min-w-0"
                role="list"
                aria-label="ZIP 內資料夾"
              >
                <span
                  v-for="(name, i) in secondFoldersFull"
                  :key="'pack-empty-folder-' + i"
                  class="badge my-bgcolor-surface my-color-black border user-select-none my-font-sm-400 d-inline-flex align-items-center rounded px-2 py-1"
                  role="listitem"
                >
                  {{ name }}
                </span>
              </div>
              <p
                v-else
                class="my-font-md-400 my-color-gray-1 mb-0"
              >
                ZIP 內尚無可選資料夾
              </p>
              <div class="d-flex flex-wrap justify-content-center align-items-stretch gap-2 w-100 min-w-0 my-pack-empty-actions-row">
                <button
                  type="button"
                  class="btn rounded-pill d-flex justify-content-center align-items-center gap-2 my-font-md-400 my-button-black px-4 py-3"
                  :disabled="packGroupsEditBlocked"
                  title="新增單元"
                  aria-label="新增單元"
                  @click="onAddPackUnitClick"
                >
                  <i class="fa-solid fa-plus" aria-hidden="true" />
                  新增單元
                </button>
                <div
                  v-if="secondFoldersFull.length"
                  class="dropdown flex-shrink-0 d-flex"
                >
                  <button
                    type="button"
                    class="btn rounded-circle d-flex justify-content-center align-items-center flex-shrink-0 my-font-md-400 my-button-gray-3 my-pack-empty-quick-menu-btn dropdown-toggle my-dropdown-caret lh-1"
                    data-bs-toggle="dropdown"
                    aria-expanded="false"
                    aria-label="單元快捷選單"
                    :disabled="packGroupsEditBlocked"
                  >
                    <i class="fa-solid fa-chevron-down" aria-hidden="true" />
                  </button>
                  <ul class="dropdown-menu dropdown-menu-end">
                    <li>
                      <button
                        type="button"
                        class="dropdown-item my-font-md-400"
                        :disabled="packGroupsEditBlocked"
                        @click="addAllSecondFoldersAsGroups"
                      >
                        每個資料夾獨立單元
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        class="dropdown-item my-font-md-400"
                        :disabled="packGroupsEditBlocked"
                        title="在現有設定單元之後追加一組，內含全部資料夾；打包時檔名以 + 連接"
                        @click="setAllSecondFoldersAsSingleGroup"
                      >
                        每個資料夾合併單元
                      </button>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
            </div>
            </div>
          </section>
        </div>
      </template>
      <!-- 建置完成後：left 設定單元＋設定單元題型（區塊間距一致） -->
      <section
        v-if="hasBuiltRagSummary"
        class="text-start my-page-block-spacing"
      >
        <div class="my-design-pack-unit-blocks w-100 min-w-0">
        <div
          class="w-100 min-w-0 text-start"
          role="group"
          aria-labelledby="design-pack-unit-quiz-section-label"
        >
          <div
            id="design-pack-unit-quiz-section-label"
            class="my-font-sm-400 my-color-gray-1 mb-2"
          >
            設定單元題型
          </div>
          <div
            class="d-flex align-items-center gap-2 flex-nowrap w-100 min-w-0 mb-4"
            role="heading"
            aria-level="2"
          >
            <div class="d-flex align-items-center gap-2 flex-nowrap min-w-0 flex-grow-1 overflow-hidden">
              <span class="my-design-pack-unit-main-title my-test-section-heading-title text-truncate mb-0">{{ builtPackUnitSectionHeadingTitle }}</span>
              <span
                v-if="activeReadonlyPackUnitRow?.typeLabel"
                class="badge my-bgcolor-surface my-color-black border user-select-none my-font-sm-400 rounded px-2 py-1 flex-shrink-0"
              >{{ activeReadonlyPackUnitRow.typeLabel }}</span>
            </div>
            <button
              v-if="activeReadonlyPackUnitRow"
              type="button"
              class="btn rounded-pill d-inline-flex justify-content-center align-items-center flex-shrink-0 ms-auto my-font-sm-400 my-button-gray-3 my-design-quiz-stem-history-btn px-3 py-1"
              aria-label="詳細資訊"
              @click="openPackUnitDetailModal"
            >
              詳細資訊
            </button>
          </div>
          <span
            v-if="!packUnitCarouselCountEffective"
            class="my-font-md-400 my-color-black"
          >—</span>
          <template v-else>
            <section
              v-if="bankShowUnitTranscriptUi"
              class="w-100 min-w-0 mb-3"
              aria-label="單元內容"
            >
              <div
                class="min-w-0 pb-2 position-relative"
                :style="bankUnitContentCollapsed ? 'height: 96px; overflow: hidden' : ''"
              >
                <div
                  v-if="bankUnitTranscriptSection?.unitType === UNIT_TYPE_TEXT"
                  class="my-rag-unit-type-text-scroll min-w-0"
                  role="region"
                  aria-label="單元逐字稿"
                >
                  <div
                    v-if="bankUnitTranscriptMdHtml"
                    class="my-markdown-rendered my-font-md-400 my-color-black text-break"
                    v-html="bankUnitTranscriptMdHtml"
                  />
                  <span
                    v-else
                    class="my-font-md-400 my-color-black"
                  >—</span>
                </div>
                <div
                  v-else-if="bankUnitTranscriptSection?.unitType === UNIT_TYPE_YOUTUBE"
                  class="w-100 min-w-0"
                >
                  <div
                    v-if="bankUnitYoutubeEmbedUrl"
                    class="ratio ratio-16x9 w-100 rounded-2 overflow-hidden my-border-muted"
                  >
                    <iframe
                      class="border-0"
                      title="YouTube 影片"
                      :src="bankUnitYoutubeEmbedUrl"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      referrerpolicy="strict-origin-when-cross-origin"
                      allowfullscreen
                    />
                  </div>
                  <span
                    v-else
                    class="my-font-md-400 my-color-black text-break"
                  >{{ bankUnitTranscriptSection?.sourceDisplay }}</span>
                </div>
                <RagTabUnitMp3Player
                  v-else-if="bankUnitTranscriptSection?.unitType === UNIT_TYPE_MP3 && bankUnitMp3PlayerProps"
                  :rag-tab-id="bankUnitMp3PlayerProps.ragTabId"
                  :rag-unit-id="bankUnitMp3PlayerProps.ragUnitId"
                />
                <div
                  v-if="bankUnitContentCollapsed"
                  style="position: absolute; bottom: 0; left: 0; right: 0; height: 64px; background: linear-gradient(to bottom, transparent, var(--my-color-gray-4)); pointer-events: none;"
                />
              </div>
              <div
                v-if="bankUnitTranscriptSection?.unitType !== UNIT_TYPE_MP3"
                class="d-flex justify-content-center align-items-center flex-wrap gap-2 w-100 min-w-0 py-2"
              >
                <button
                  type="button"
                  class="btn rounded-pill d-inline-flex justify-content-center align-items-center gap-2 flex-shrink-0 my-font-sm-400 my-button-transparent-borderless px-3 py-1"
                  :title="bankUnitContentCollapsed ? '顯示文本' : '隱藏文本'"
                  :aria-label="bankUnitContentCollapsed ? '顯示文本' : '隱藏文本'"
                  :aria-expanded="!bankUnitContentCollapsed"
                  @click="toggleBankUnitContentCollapsed"
                >
                  <template v-if="bankUnitContentCollapsed">
                    顯示文本
                    <i class="fa-solid fa-chevron-down" aria-hidden="true" />
                  </template>
                  <template v-else>
                    隱藏文本
                    <i class="fa-solid fa-chevron-up" aria-hidden="true" />
                  </template>
                </button>
              </div>
            </section>
            <hr style="border-top: 1px solid var(--my-color-gray-2); margin: 0 0 1rem; opacity: 1;" />
            <div
              class="my-pack-unit-settings-body w-100 min-w-0"
              :class="{ 'my-color-gray-4': ragGenerateDisabled }"
            >
          <template v-if="hasUnitSubTabs">
            <div class="my-pack-unit-field">
              <div
                v-if="!activeUnitQuizCards.length"
                class="w-100 d-flex justify-content-center align-items-center px-3 py-5 min-w-0"
              >
                <button
                  type="button"
                  class="btn rounded-pill d-flex justify-content-center align-items-center gap-2 my-font-md-400 my-button-gray-3 px-4 py-3"
                  title="新增題型"
                  aria-label="新增題型"
                  :aria-busy="getSlotFormState(activeUnitSlotIndex).unitQuizCreateLoading"
                  :disabled="
                    getSlotFormState(activeUnitSlotIndex).unitQuizCreateLoading
                    || renameUnitQuizSaving
                    || deleteUnitQuizLoading
                  "
                  @click="createBlankUnitQuiz(activeUnitSlotIndex)"
                >
                  <i class="fa-solid fa-plus" aria-hidden="true" />
                  新增題型
                </button>
              </div>
            </div>
              <div
                v-if="getSlotFormState(activeUnitSlotIndex).unitQuizCreateError"
                class="d-flex justify-content-center pt-2 mb-0 w-100 px-1"
              >
                <div
                  class="my-alert-danger-soft my-font-sm-400 py-2 mb-0 text-break w-100"
                  style="max-width: 42rem"
                  role="alert"
                >
                  {{ getSlotFormState(activeUnitSlotIndex).unitQuizCreateError }}
                </div>
              </div>
              <div
                v-if="activeUnitQuizCard"
                class="w-100 min-w-0 text-start d-flex flex-column gap-3"
              >
                <div class="d-flex flex-column align-items-stretch gap-2 w-100 min-w-0">
                  <div
                    class="d-inline-flex align-items-center gap-2 flex-nowrap min-w-0 max-w-100 mb-3"
                    role="heading"
                    aria-level="3"
                  >
                    <span class="my-design-pack-unit-main-title my-test-section-heading-title text-truncate mb-0 min-w-0">{{ quizTypeTabLabel(activeUnitQuizCard) }}</span>
                    <button
                      v-if="positiveRagQuizIdFromQuizRow(activeUnitQuizCard) != null"
                      type="button"
                      class="btn btn-link text-decoration-none my-tab-nav-action-btn my-color-gray-4 flex-shrink-0"
                      title="重新命名題型"
                      aria-label="重新命名題型"
                      :disabled="
                        getSlotFormState(activeUnitSlotIndex).unitQuizCreateLoading
                        || renameUnitQuizSaving
                        || deleteUnitQuizLoading
                        || deleteRagLoading
                        || renameRagTabSaving
                      "
                      @click="openRenameUnitQuizTab(activeUnitQuizTypeIdxResolved)"
                    >
                      <i class="fa-solid fa-pen" aria-hidden="true" />
                    </button>
                  </div>
                  <div
                    class="d-flex flex-wrap align-items-center justify-content-start gap-2 w-100 min-w-0"
                  >
                    <div
                      class="d-inline-flex flex-wrap gap-1 rounded-pill my-bgcolor-gray-3 flex-shrink-0 align-self-start p-1 my-quiz-generate-mode-segment"
                      role="group"
                      aria-label="出題模式"
                    >
                      <button
                        type="button"
                        class="btn rounded-pill d-flex justify-content-center align-items-center my-font-sm-400 px-3 py-1"
                        :class="
                          !isUnitQuizFollowupMode(activeUnitSlotIndex, activeUnitQuizCard)
                            ? 'my-button-white'
                            : 'my-button-transparent-borderless'
                        "
                        :disabled="
                          !!getSlotFormState(activeUnitSlotIndex).unitQuizCreateLoading
                          || isRagQuizMarkedForExam(activeUnitQuizCard)
                          || activeUnitQuizCard.ragQuizFollowupLoading
                        "
                        :aria-busy="activeUnitQuizCard.ragQuizFollowupLoading"
                        :aria-pressed="!isUnitQuizFollowupMode(activeUnitSlotIndex, activeUnitQuizCard)"
                        @click="onSetUnitQuizGenerateMode(activeUnitSlotIndex, 'normal', activeUnitQuizCard)"
                      >
                        一般
                      </button>
                      <button
                        type="button"
                        class="btn rounded-pill d-flex justify-content-center align-items-center my-font-sm-400 px-3 py-1"
                        :class="
                          isUnitQuizFollowupMode(activeUnitSlotIndex, activeUnitQuizCard)
                            ? 'my-button-white'
                            : 'my-button-transparent-borderless'
                        "
                        :disabled="
                          !!getSlotFormState(activeUnitSlotIndex).unitQuizCreateLoading
                          || isRagQuizMarkedForExam(activeUnitQuizCard)
                          || activeUnitQuizCard.ragQuizFollowupLoading
                        "
                        :aria-busy="activeUnitQuizCard.ragQuizFollowupLoading"
                        :aria-pressed="isUnitQuizFollowupMode(activeUnitSlotIndex, activeUnitQuizCard)"
                        @click="onSetUnitQuizGenerateMode(activeUnitSlotIndex, 'followup', activeUnitQuizCard)"
                      >
                        追問
                      </button>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      class="my-quiz-generate-mode-switch d-inline-flex align-items-center gap-2 flex-shrink-0"
                      :class="{
                        'my-quiz-generate-mode-switch--on': isRagQuizMarkedForExam(activeUnitQuizCard),
                      }"
                      :aria-checked="isRagQuizMarkedForExam(activeUnitQuizCard)"
                      :aria-label="
                        isRagQuizMarkedForExam(activeUnitQuizCard) ? '取消測驗用' : '設為測驗用'
                      "
                      :disabled="isRagQuizForExamToolbarButtonDisabled(activeUnitQuizCard)"
                      :aria-busy="activeUnitQuizCard.ragQuizForExamLoading"
                      @click="onMarkRagQuizForExam(activeUnitQuizCard)"
                    >
                      <span class="my-quiz-generate-mode-switch__track" aria-hidden="true">
                        <span class="my-quiz-generate-mode-switch__knob" aria-hidden="true" />
                      </span>
                      <span class="my-quiz-generate-mode-switch__label my-font-sm-400 flex-shrink-0">設為測驗用</span>
                    </button>
                  </div>
                  <div
                    v-if="String(activeUnitQuizCard.ragQuizFollowupError ?? '').trim()"
                    class="my-alert-danger-soft my-font-sm-400 py-2 mb-0 w-100 text-break text-center"
                    style="max-width: 42rem"
                    role="alert"
                  >
                    {{ activeUnitQuizCard.ragQuizFollowupError }}
                  </div>
                  <div
                    v-if="String(activeUnitQuizCard.ragQuizForExamError ?? '').trim()"
                    class="my-alert-danger-soft my-font-sm-400 py-2 mb-0 w-100 text-break text-center"
                    style="max-width: 42rem"
                    role="alert"
                  >
                    {{ activeUnitQuizCard.ragQuizForExamError }}
                  </div>
                </div>
                <!-- 子區塊：題目區（頂部 pt-2 在出題規則黑區上方；產生題目按鈕與題目 title 間不加 pt-2） -->
                <div class="my-design-quiz-sub-block-outer">
                  <div class="my-design-quiz-sub-block rounded-4 my-bgcolor-gray-3 p-0 pb-2">
                    <div
                      class="w-100 min-w-0 pt-2 my-design-quiz-stem-sub-block-top d-flex flex-column"
                    >
                    <div class="my-design-quiz-question-prompt-wrap px-3 pt-2 pb-0 w-100 min-w-0">
                      <section
                        class="my-design-quiz-question-prompt-block w-100 min-w-0"
                        aria-label="出題規則"
                      >
                      <header class="my-design-quiz-question-prompt-block__head">
                        <div
                          class="my-design-quiz-question-prompt-block__title-row d-flex justify-content-between align-items-center gap-2 px-3 py-2"
                        >
                          <h3
                            class="my-design-quiz-question-prompt-block__title my-font-sm-400 mb-0"
                          >
                            出題規則
                          </h3>
                          <div class="d-flex align-items-center gap-3 flex-shrink-0">
                            <button
                              type="button"
                              class="btn rounded-circle d-flex justify-content-center align-items-center flex-shrink-0 my-design-quiz-question-prompt-block__edit-btn lh-1"
                              title="編輯出題規則"
                              aria-label="編輯出題規則"
                              :disabled="!!getSlotFormState(activeUnitSlotIndex).unitQuizCreateLoading || isRagQuizMarkedForExam(activeUnitQuizCard)"
                              @click="openBankQuizUserPromptEditModal"
                            >
                              <i class="fa-solid fa-pen" aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                        <div class="px-3 py-0">
                          <hr class="my-design-quiz-question-prompt-block__rule m-0">
                        </div>
                      </header>
                      <div class="my-design-quiz-question-prompt-block__content min-w-0 w-100">
                        <EnglishExamMarkdownEditor
                          :model-value="String(activeUnitQuizCard.quizUserPromptText ?? '')"
                          preview-only
                          preview-design-dark
                          preview-design-dark-embedded
                          :textarea-id="`rag-unit-quiz-prompt-ro-${activeUnitSlotIndex}-${activeUnitQuizTypeIdxResolved}`"
                        />
                      </div>
                      </section>
                    </div>
                    <div
                      class="my-design-quiz-generate-action-row d-flex justify-content-start align-items-center flex-wrap gap-2 px-3 py-2"
                    >
                      <button
                        v-if="!getSlotFormState(activeUnitSlotIndex).unitQuizCreateLoading && canEnableUnitQuizGenerateFromDb(activeUnitQuizCard, activeUnitSlotIndex)"
                        type="button"
                        class="btn rounded-pill d-inline-flex justify-content-center align-items-center flex-shrink-0 my-font-md-400 my-button-white px-4 py-2"
                        title="使用後端已儲存之出題規則產生題目；須曾成功「儲存並產生題目」且未在編輯器中改動出題規則。若已修改出題規則請先按「儲存並產生題目」，或於編輯 Modal 內重設"
                        aria-label="產生題目"
                        @click="submitUnitQuizLlmGenerateDb(activeUnitSlotIndex, activeUnitQuizCard)"
                      >
                        產生題目
                      </button>
                      <button
                        v-if="!isRagQuizMarkedForExam(activeUnitQuizCard) && !getSlotFormState(activeUnitSlotIndex).unitQuizCreateLoading && canEnableUnitQuizGenerate(activeUnitQuizCard, activeUnitSlotIndex)"
                        type="button"
                        class="btn rounded-pill d-inline-flex justify-content-center align-items-center flex-shrink-0 my-font-md-400 my-button-white px-4 py-2"
                        aria-label="儲存並產生題目"
                        @click="submitUnitQuizLlmGenerate(activeUnitSlotIndex, activeUnitQuizCard)"
                      >
                        儲存並產生題目
                      </button>
                      <button
                        v-if="
                          (getSlotFormState(activeUnitSlotIndex).unitQuizCreateLoading || !canEnableUnitQuizGenerateFromDb(activeUnitQuizCard, activeUnitSlotIndex)) &&
                          (isRagQuizMarkedForExam(activeUnitQuizCard) || getSlotFormState(activeUnitSlotIndex).unitQuizCreateLoading || !canEnableUnitQuizGenerate(activeUnitQuizCard, activeUnitSlotIndex))
                        "
                        type="button"
                        class="btn rounded-pill d-inline-flex justify-content-center align-items-center flex-shrink-0 my-font-md-400 my-button-white px-4 py-2"
                        aria-label="儲存並產生題目"
                        disabled
                      >
                        儲存並產生題目
                      </button>
                    </div>
                    <div
                      v-if="activeUnitQuizHasGeneratedBody"
                      class="w-100 min-w-0"
                    >
                      <QuizCard
                        v-bind="designUnitQuizCardBind"
                        create-exam-bank-design-layout
                        design-sub-block="question"
                        @confirm-answer="confirmGradeMerged"
                        @update:quiz_answer="(val) => { activeUnitQuizCard.quiz_answer = val }"
                        @open-grading-prompt-edit="openBankGradingPromptEditModal"
                        @open-quiz-history="openBankQuizHistoryModal"
                      />
                    </div>
                    </div>
                  </div>
                </div>
                <!-- 子區塊：答案 + 批改（合併） -->
                <div
                  v-if="activeUnitQuizHasGeneratedBody"
                  class="my-design-quiz-sub-block-outer"
                >
                  <div class="my-design-quiz-sub-block rounded-4 my-bgcolor-white p-0 pb-2">
                    <div class="w-100 min-w-0 pt-2">
                      <QuizCard
                        v-bind="designUnitQuizCardBind"
                        create-exam-bank-design-layout
                        design-sub-block="answer"
                        @confirm-answer="confirmGradeMerged"
                        @update:quiz_answer="(val) => { activeUnitQuizCard.quiz_answer = val }"
                        @open-grading-prompt-edit="openBankGradingPromptEditModal"
                        @open-quiz-history="openBankQuizHistoryModal"
                      />
                    </div>
                    <div class="w-100 min-w-0">
                      <QuizCard
                        v-bind="designUnitQuizCardBind"
                        create-exam-bank-design-layout
                        design-sub-block="grading"
                        @confirm-answer="confirmGradeMerged"
                        @update:quiz_answer="(val) => { activeUnitQuizCard.quiz_answer = val }"
                        @open-grading-prompt-edit="openBankGradingPromptEditModal"
                        @open-quiz-history="openBankQuizHistoryModal"
                      />
                    </div>
                  </div>
                </div>
                <div class="d-flex flex-column align-items-stretch gap-2 w-100 min-w-0">
                  <div
                    class="d-flex flex-wrap align-items-center justify-content-start gap-2 w-100 min-w-0"
                  >
                    <button
                      v-if="positiveRagQuizIdFromQuizRow(activeUnitQuizCard) != null"
                      type="button"
                      class="btn rounded-pill d-inline-flex justify-content-center align-items-center flex-shrink-0 my-font-md-400 my-pack-unit-delete-btn px-4 py-2"
                      title="刪除此題型"
                      aria-label="刪除此題型"
                      :disabled="
                        isRagQuizMarkedForExam(activeUnitQuizCard)
                        || getSlotFormState(activeUnitSlotIndex).unitQuizCreateLoading
                        || renameUnitQuizSaving
                        || deleteUnitQuizLoading
                        || deleteRagLoading
                        || renameRagTabSaving
                      "
                      :aria-busy="deleteUnitQuizLoading"
                      @click="openDeleteUnitQuizModal(activeUnitQuizTypeIdxResolved)"
                    >
                      刪除此題型
                    </button>
                  </div>
                </div>
              </div>
            </template>
            <template v-else-if="!hasUnitSubTabs">
              <div
                class="w-100 min-w-0 d-flex flex-column gap-3"
              >
                <div class="my-font-lg-600 my-color-black mb-0">
                  {{ activeUnitTabItem ? activeUnitTabItem.label : '出題' }}
                </div>
                <div class="text-start w-100 min-w-0">
                  <div
                    class="d-flex flex-row align-items-end gap-3 w-100 min-w-0 flex-nowrap justify-content-center"
                  >
                    <div class="d-flex flex-column gap-0 w-100 min-w-0 flex-grow-1">
                      <label
                        class="my-color-gray-1 flex-shrink-0 my-font-sm-400 mb-0"
                        :for="`rag-quiz-unit-${activeUnitSlotIndex}-toggle`"
                      >單元</label>
                      <UnitSelectDropdown
                        v-model="getSlotFormState(activeUnitSlotIndex).generateQuizTabId"
                        :options="generateQuizUnits"
                        :menu-id="`rag-quiz-unit-${activeUnitSlotIndex}`"
                        :disabled="getSlotFormState(activeUnitSlotIndex).loading"
                      />
                    </div>
                  </div>
                  <div class="d-flex justify-content-center mt-3">
                    <button
                      v-if="!getSlotFormState(activeUnitSlotIndex).loading && String(getSlotFormState(activeUnitSlotIndex).generateQuizTabId || '').trim()"
                      type="button"
                      class="btn rounded-pill d-flex justify-content-center align-items-center gap-2 my-font-md-400 my-button-white px-4 py-2"
                      aria-label="儲存並產生題目"
                      @click="generateQuiz(activeUnitSlotIndex)"
                    >
                      儲存並產生題目
                    </button>
                  </div>
                  <div v-if="getSlotFormState(activeUnitSlotIndex).error" class="my-alert-danger-soft my-font-sm-400 py-2 mt-2 mb-0">
                    {{ getSlotFormState(activeUnitSlotIndex).error }}
                  </div>
                </div>
              </div>
            </template>

            <!-- 新增題目按鈕：無單元子分頁時固定在最下面；與「新增測驗題庫」同款灰底膠囊＋加號 -->
            <div
              v-if="(currentState.unitTabOrder || []).length === 0"
              class="d-flex justify-content-center pt-2 mb-0"
            >
              <button
                type="button"
                class="btn rounded-pill d-flex justify-content-center align-items-center gap-2 my-font-md-400 my-button-gray-3 px-4 py-3"
                title="新增題目"
                aria-label="新增題目"
                @click="openNextQuizSlot"
              >
                <i class="fa-solid fa-plus" aria-hidden="true" />
                新增題目
              </button>
            </div>
          </div>
          </template>
        </div>
        </div>
      </section>
      </template>
          </div>
        </div>
      </div>
        </div>
        </div>
        <div
          v-if="showSidePanelColumn"
          class="col-4 col-xl-4 col-xxl-3 h-100 min-h-0 overflow-hidden my-bgcolor-gray-4 my-design-tab-side-panel"
          :class="designSidePanelOnLeft ? 'order-1 border-end' : 'border-start'"
        >
          <aside
            class="h-100 w-100 my-design-tab-right-view d-flex flex-column overflow-hidden"
            aria-label="設計輔助面板"
          >
            <div
              v-if="designSidePanelOnLeft && $slots['side-panel-header']"
              class="flex-shrink-0 my-design-tab-side-panel-header"
            >
              <slot name="side-panel-header" />
            </div>
            <!-- 建立流程：上傳檔案、設定單元 + 子項目垂直列表 -->
            <nav
              v-if="showDesignRightNav"
              class="my-design-right-nav nav nav-pills flex-column flex-nowrap flex-grow-1 justify-content-start align-items-stretch overflow-y-auto overflow-x-hidden min-h-0"
              :class="[
                designSidePanelOnLeft ? 'my-design-right-nav--flat gap-0' : 'px-3 py-3 gap-3',
              ]"
              aria-label="建立流程"
            >
              <!-- 區塊 1：上傳檔案 -->
              <div
                class="my-design-right-step-block"
                :class="designSidePanelOnLeft ? 'p-3 my-design-right-step-block--section-divide' : 'py-2'"
              >
                <div
                  class="my-design-right-step-heading my-font-sm-400 my-color-gray-1"
                  :class="designSidePanelOnLeft ? 'pb-2' : 'px-3 py-2'"
                >上傳檔案</div>
                <div class="nav-item">
                  <span
                    class="nav-link w-100 text-start text-break"
                    :class="{ active: !hasUploadedFileMetadata }"
                  >{{ designRightUploadFileLabel || '—' }}</span>
                </div>
              </div>

              <!-- 區塊 2：單元 -->
              <div
                v-if="hasUploadedFileMetadata"
                class="my-design-right-step-block"
                :class="designSidePanelOnLeft ? 'p-3' : (hasBuiltRagSummary ? 'py-2' : 'pb-2')"
              >
                <div
                  class="my-design-right-step-block-head d-flex align-items-center justify-content-between gap-2 min-w-0"
                  :class="designSidePanelOnLeft ? 'pb-2' : 'px-3 py-2'"
                >
                  <div class="my-design-right-step-heading my-font-sm-400 my-color-gray-1 mb-0">{{ hasBuiltRagSummary ? '單元 / 題型' : '單元' }}</div>
                  <div
                    v-if="!hasBuiltRagSummary"
                    class="d-flex align-items-center flex-shrink-0"
                  >
                    <button
                      type="button"
                      class="btn rounded-circle d-flex justify-content-center align-items-center flex-shrink-0 my-font-md-400 my-color-gray-1 my-btn-outline-gray-1 my-btn-circle lh-1"
                      title="新增單元"
                      aria-label="新增單元"
                      :disabled="packGroupsEditBlocked"
                      @click="onAddPackUnitClick"
                    >
                      <i class="fa-solid fa-plus" aria-hidden="true" />
                    </button>
                    <div class="dropdown flex-shrink-0">
                      <button
                        type="button"
                        class="btn rounded-circle d-flex justify-content-center align-items-center flex-shrink-0 my-font-md-400 my-color-gray-1 my-btn-outline-gray-1 my-btn-circle lh-1 dropdown-toggle my-dropdown-caret"
                        data-bs-toggle="dropdown"
                        aria-expanded="false"
                        aria-label="單元功能選單"
                        :disabled="packGroupsEditBlocked"
                      >
                      <i class="fa-solid fa-chevron-down" aria-hidden="true" />
                    </button>
                    <ul class="dropdown-menu dropdown-menu-end">
                      <li>
                        <button
                          type="button"
                          class="dropdown-item my-font-md-400"
                          :disabled="!(currentState.packTasksList || []).length"
                          title="清空所有設定單元（含空位）"
                          @click="openDeleteAllPackUnitsModal"
                        >
                          刪除全部
                        </button>
                      </li>
                      <li v-if="secondFoldersFull.length">
                        <button
                          type="button"
                          class="dropdown-item my-font-md-400"
                          @click="addAllSecondFoldersAsGroups"
                        >
                          每個資料夾獨立單元
                        </button>
                      </li>
                      <li v-if="secondFoldersFull.length">
                        <button
                          type="button"
                          class="dropdown-item my-font-md-400"
                          title="在現有設定單元之後追加一組，內含全部資料夾；打包時檔名以 + 連接"
                          @click="setAllSecondFoldersAsSingleGroup"
                        >
                          每個資料夾合併單元
                        </button>
                      </li>
                    </ul>
                    </div>
                  </div>
                </div>
                <template v-if="designRightUnitSubTabItems.length">
                  <div
                    v-for="item in designRightUnitSubTabItems"
                    :key="item.key"
                    class="nav-item"
                  >
                    <div class="d-flex align-items-stretch min-w-0 my-design-right-unit-row">
                      <button
                        type="button"
                        class="nav-link flex-grow-1 min-w-0 text-start text-break"
                        :class="{ active: item.active }"
                        :aria-current="item.active ? 'page' : undefined"
                        @click="onDesignRightSubTabClick(item)"
                      >
                        {{ item.label }}<span class="badge my-bgcolor-surface my-color-black border user-select-none my-font-sm-400 rounded px-2 py-1 ms-2">{{ item.unitTypeLabel }}</span>
                      </button>
                      <button
                        v-if="hasBuiltRagSummary && hasUnitSubTabs"
                        type="button"
                        class="btn rounded-circle d-flex justify-content-center align-items-center flex-shrink-0 my-font-md-400 my-color-gray-1 my-btn-outline-gray-1 my-btn-circle lh-1 my-design-right-unit-add-quiz-btn"
                        title="新增題型"
                        aria-label="新增題型"
                        :aria-busy="getSlotFormState(item.index + 1).unitQuizCreateLoading"
                        :disabled="
                          getSlotFormState(item.index + 1).unitQuizCreateLoading
                          || renameUnitQuizSaving
                          || deleteUnitQuizLoading
                        "
                        @click.stop="onDesignRightAddUnitQuiz(item.index)"
                      >
                        <i class="fa-solid fa-plus" aria-hidden="true" />
                      </button>
                    </div>
                    <div
                      v-if="item.quizItems.length"
                      class="my-design-right-unit-quiz-list"
                    >
                      <div
                        v-for="qItem in item.quizItems"
                        :key="qItem.key"
                        class="nav-item"
                      >
                        <button
                          type="button"
                          class="nav-link w-100 text-start text-break my-design-right-unit-quiz-link"
                          :class="{ active: qItem.active }"
                          :aria-current="qItem.active ? 'page' : undefined"
                          @click="onDesignRightSubTabClick(qItem)"
                        >
                          {{ qItem.label }}<span v-if="qItem.followup" class="badge my-bgcolor-surface my-color-black border user-select-none my-font-sm-400 rounded px-2 py-1 ms-2">追問</span><span
                            v-if="qItem.forExam"
                            class="rounded-circle d-inline-block my-bgcolor-green flex-shrink-0 ms-2"
                            style="width: 0.5rem; height: 0.5rem"
                            title="測驗用題型"
                            role="img"
                            aria-label="測驗用題型"
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                </template>
                <div
                  v-if="!hasBuiltRagSummary && packUnitCarouselCountEffective > 0"
                  class="my-design-right-pack-build-action w-100 min-w-0"
                  :class="designSidePanelOnLeft ? '' : 'pb-2'"
                >
                  <button
                    type="button"
                    class="btn rounded-pill d-flex justify-content-center align-items-center gap-2 my-font-md-400 my-button-white px-4 py-2 w-100"
                    :disabled="startPackUnitBuildDisabled"
                    :aria-busy="currentState.packLoading"
                    aria-label="開始建立單元"
                    @click="confirmPack"
                  >
                    開始建立單元
                  </button>
                  <div
                    v-if="currentState.packError"
                    class="my-alert-danger-soft my-font-sm-400 py-2 mt-2 mb-0 text-break"
                    style="white-space: pre-wrap"
                  >
                    {{ currentState.packError }}
                  </div>
                </div>
              </div>
            </nav>
          </aside>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 出題模式：gray-3 軌＋選中白底（與原白軌＋gray-3 選中對調） */
.my-quiz-generate-mode-segment :deep(> .btn.my-button-white) {
  background-color: var(--my-color-white);
  color: var(--my-color-black);
  border-color: transparent;
  box-shadow: none;
}
.my-quiz-generate-mode-segment :deep(> .btn.my-button-white:hover),
.my-quiz-generate-mode-segment :deep(> .btn.my-button-white:active:not(:disabled)) {
  background-color: color-mix(in srgb, var(--my-color-black) 7%, var(--my-color-white));
  color: var(--my-color-black);
}
/* 子元件若仍帶 px-3 utility，與本頁按鈕一致改為 px-4 水平內距 */
:deep(button.btn.rounded-pill.px-3),
:deep(button.btn.rounded-2.px-3) {
  padding-left: 1.5rem !important;
  padding-right: 1.5rem !important;
}

/* create-exam-bank_3：小 pill 按鈕 px-2 */
.my-design--side-panel-left :deep(button.btn.rounded-pill.my-font-sm-400),
.my-design--side-panel-left :deep(button.btn.rounded-2.my-font-sm-400) {
  padding-left: 0.5rem !important;
  padding-right: 0.5rem !important;
}
/* 產生題目／開始批改 pill：px-4 py-2（my-font-md-400 中號） */
.my-design-pack-unit-blocks :deep(.my-design-quiz-generate-action-row .btn.my-button-white),
.my-design-quiz-sub-block :deep(.my-design-quiz-grading-start-row .btn.my-button-white) {
  padding-top: 0.5rem !important;
  padding-bottom: 0.5rem !important;
  padding-left: 1.5rem !important;
  padding-right: 1.5rem !important;
}
.my-pack-drop-target.my-pack-drop-active {
  background-color: var(--my-drop-pack-active-bg) !important;
  border-color: var(--my-color-blue) !important;
}
/* 以下樣式僅供 create-exam-bank_design，勿移至 common.css（避免影響 /create-exam-bank） */
.my-design-tab-split-layout {
  min-height: 0;
  flex: 1 1 0;
}
.my-design-tab-split-layout--side-left {
  flex-wrap: nowrap;
}
.my-design-tab-side-panel {
  border-color: var(--my-color-gray-2, #e5e5e5) !important;
}
.my-design-tab-side-panel-header {
  flex-shrink: 0;
  z-index: 31;
  border-bottom: 1px solid var(--my-color-gray-2, #e5e5e5);
}
.my-design-tab-left-view,
.my-design-tab-right-view {
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}
.my-design-right-nav {
  flex-wrap: nowrap;
  width: 100%;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
}
.my-design-tab-left-view-scroll:not(.my-design-tab-left-view-scroll--show-scrollbar) {
  scrollbar-width: none;
}
.my-design-tab-left-view-scroll:not(.my-design-tab-left-view-scroll--show-scrollbar)::-webkit-scrollbar {
  display: none;
}
/* 右側欄捲軸：對齊全站 gray-2 滑塊 */
.my-design-tab-right-view,
.my-design-right-nav {
  scrollbar-width: thin;
  scrollbar-color: var(--my-scrollbar-thumb) var(--my-scrollbar-track);
}
.my-design-tab-right-view::-webkit-scrollbar,
.my-design-right-nav::-webkit-scrollbar {
  width: var(--my-scrollbar-size);
  height: var(--my-scrollbar-size);
}
.my-design-tab-right-view::-webkit-scrollbar-track,
.my-design-right-nav::-webkit-scrollbar-track {
  background: var(--my-scrollbar-track);
  border-radius: calc(var(--my-scrollbar-size) / 2);
}
.my-design-tab-right-view::-webkit-scrollbar-thumb,
.my-design-right-nav::-webkit-scrollbar-thumb {
  background-color: var(--my-scrollbar-thumb);
  background-clip: padding-box;
  border: var(--my-scrollbar-thumb-inset) solid var(--my-scrollbar-track);
  border-radius: calc(var(--my-scrollbar-size) / 2 - var(--my-scrollbar-thumb-inset));
}
.my-design-tab-right-view::-webkit-scrollbar-thumb:hover,
.my-design-right-nav::-webkit-scrollbar-thumb:hover {
  background-color: var(--my-scrollbar-thumb-hover);
}
.my-design-right-step-block {
  display: flex;
  flex-direction: column;
  flex: 0 0 auto;
  width: 100%;
  min-width: 0;
  gap: 0;
  background-color: var(--my-color-gray-3);
  border-radius: 0.75rem;
}
.my-design-right-nav--flat {
  gap: 0;
}
.my-design-right-nav--flat .my-design-right-step-block {
  background-color: transparent;
  border-radius: 0;
}
.my-design-right-nav--flat .my-design-right-step-block--section-divide {
  border-bottom: 1px solid var(--my-color-gray-2, #e5e5e5);
}

.my-design-right-nav--flat .my-design-right-step-block .nav-link {
  padding-left: 0;
  padding-right: 0;
}

.my-design-right-nav--flat .my-design-right-unit-quiz-link {
  padding-left: 0.75rem;
}
.my-design-right-pack-build-action {
  box-sizing: border-box;
}
.my-design-right-step-heading {
  line-height: 1.35;
  white-space: nowrap;
}
.my-design-right-step-block-head {
  min-width: 0;
}
.my-design-right-step-block-head .my-design-right-step-heading {
  min-width: 0;
}
/* 稿頁設定單元屬性：row/col 排版，欄位間距由 .row.g-3 負責 */
.my-design-pack-unit-blocks {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;
}
.my-design-pack-unit-blocks > .row {
  --bs-gutter-x: 1rem;
  --bs-gutter-y: 1rem;
}
/* 建置後單元主標題：大於全站 xl（1.125rem） */
.my-design-pack-unit-main-title {
  font-size: 1.5rem;
  font-weight: var(--my-font-weight-semibold);
  line-height: 1.35;
  color: var(--my-color-black);
  white-space: nowrap;
}
/* 區段主標題：title → 橫線 → 內容（併 .my-font-lg-600.my-test-section-heading-title） */
.my-design-page-section-heading {
  display: flex;
  flex-direction: column;
  gap: 0;
  width: 100%;
  min-width: 0;
}
.my-design-page-section-heading__body {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  width: 100%;
  min-width: 0;
}
/* 欄位區：標題 → 內容（標題字階同「設定單元題型」小標 sm-400 gray-1） */
.my-design-pack-unit-section {
  display: flex;
  flex-direction: column;
  gap: 0;
  width: 100%;
  min-width: 0;
}
/* 欄位區：標題字階同「設定單元題型」小標（my-font-sm-400 my-color-gray-1） */
.my-design-pack-unit-section__title {
  margin-bottom: 0;
  line-height: 1.35;
  white-space: nowrap;
}
/* 標題與內容間距：等同 Bootstrap mt-1 */
.my-design-pack-unit-section__title + * {
  margin-top: 0.25rem !important;
  padding-top: 0;
}
.my-design-page-section-heading > .my-test-section-heading-title + .my-design-page-section-heading__body {
  margin-top: 0.5rem !important;
}
/* 對齊 LeftView 側欄 nav-pills */
.my-design-right-nav .nav-link {
  color: var(--my-color-black);
  border: none;
  border-radius: 0;
  background: transparent;
}
.my-design-right-nav button.nav-link {
  cursor: pointer;
}
.my-design-right-nav button.nav-link:not(.active):hover,
.my-design-right-nav button.nav-link:not(.active):focus-visible {
  background-color: var(--my-color-gray-4);
  color: var(--my-color-black);
}
.my-design-right-unit-row {
  width: 100%;
  transition: background-color 0.15s ease;
}
.my-design-right-unit-row:has(> .nav-link.active) {
  background-color: var(--my-color-white);
}
.my-design-right-unit-row:not(:has(> .nav-link.active)):hover,
.my-design-right-unit-row:not(:has(> .nav-link.active)):focus-within {
  background-color: var(--my-color-gray-4);
}
.my-design-right-unit-row .nav-link,
.my-design-right-unit-row .nav-link:not(.active):hover,
.my-design-right-unit-row .nav-link:not(.active):focus-visible,
.my-design-right-unit-row .nav-link.active,
.my-design-right-unit-row .nav-link.active:hover,
.my-design-right-unit-row .nav-link.active:focus,
.my-design-right-unit-row .nav-link.active:focus-visible {
  background-color: transparent;
}
.my-design-right-nav .nav-link.active,
.my-design-right-nav .nav-link.active:hover,
.my-design-right-nav .nav-link.active:focus,
.my-design-right-nav .nav-link.active:focus-visible {
  background-color: var(--my-color-white);
  color: var(--my-color-black);
}
.my-design-right-unit-quiz-list {
  padding-left: 0;
}
.my-design-right-unit-row .my-design-right-unit-add-quiz-btn {
  align-self: center;
  margin-right: 0;
  background: transparent;
}
.my-design-right-unit-row .my-design-right-unit-add-quiz-btn:hover:not(:disabled),
.my-design-right-unit-row .my-design-right-unit-add-quiz-btn:focus-visible:not(:disabled) {
  background: transparent;
  color: var(--my-color-black);
}
.my-design-right-unit-quiz-list .nav-item {
  width: 100%;
}
.my-design-right-unit-quiz-link {
  font-size: var(--my-font-size-sm);
  padding-left: calc(var(--bs-nav-link-padding-x, 1rem) + 0.75rem);
}
.my-pack-empty-start-layout {
  justify-content: center;
  min-height: 100%;
}
.my-pack-empty-start-layout .my-page-block-spacing {
  margin-bottom: 0;
}
.my-pack-empty-start-layout > .row {
  width: 100%;
}
.my-pack-empty-start-panel {
  width: 100%;
}
.my-pack-empty-actions-row .my-pack-empty-quick-menu-btn {
  width: auto;
  min-width: 0;
  min-height: 0;
  height: auto;
  align-self: stretch;
  aspect-ratio: 1;
  padding: 0;
  box-sizing: border-box;
}
.my-pack-folder-combo-field {
  cursor: default;
}
.my-pack-folder-pick-chip {
  background-color: var(--my-color-gray-4);
  color: var(--my-color-gray-1);
  border: 1px solid var(--my-color-gray-2);
}
.my-pack-folder-pick-chip:hover:not(:disabled) {
  color: var(--my-color-black);
  border-color: var(--my-color-gray-1);
}
.my-pack-folder-pick-chip--selected,
.my-pack-folder-pick-chip--selected:hover:not(:disabled),
.my-pack-folder-pick-chip--selected:active:not(:disabled) {
  background-color: color-mix(in srgb, var(--my-color-blue) 14%, var(--my-color-white));
  color: var(--my-color-black);
  border-color: var(--my-color-blue);
  font-weight: var(--my-font-weight-semibold);
}
.my-pack-folder-field-input {
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  font-family: inherit;
  font-size: var(--my-font-size-md);
  font-weight: var(--my-font-weight-regular);
  line-height: 1.5;
  color: var(--my-color-black);
  background-color: var(--my-pack-folder-field-bg) !important;
  border: 1px solid var(--my-color-gray-2) !important;
  border-radius: 0.375rem;
}
.my-pack-folder-field-input:focus {
  outline: 0;
  box-shadow: none;
  background-color: var(--my-pack-folder-field-bg) !important;
  border-color: var(--my-color-gray-2) !important;
}
.my-pack-drop-target.my-pack-drop-active {
  background-color: var(--my-drop-pack-active-bg) !important;
  border-color: var(--my-color-blue) !important;
}
/* 設定單元「拖入此處」等：沿用上一則淺藍反白，勿另用藍+黑混色（會整塊過深） */
/* 出題規則 EasyMDE 編輯區：固定 96pt（與稿頁黑底預覽一致） */
.my-rag-unit-quiz-prompt-editor :deep(.english-exam-md-editor-root) {
  --english-md-preview-max-h: 96pt;
}
.my-rag-unit-quiz-prompt-editor :deep(.english-exam-md-editor-wrap .CodeMirror-scroll) {
  min-height: 96pt;
}
/* 設定單元：區塊內欄位／工具列統一縱向間距 */
.my-pack-unit-settings-body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
  min-width: 0;
}
.my-pack-unit-field {
  display: flex;
  flex-direction: column;
  gap: 0;
  width: 100%;
  min-width: 0;
}
.my-pack-unit-field--tabs {
  align-items: center;
}
/* 設定單元屬性灰底面板：單層 padding，欄位間距由 .row.gy-4 與面板 gap-4 負責 */
.my-pack-unit-attrs-panel > .row {
  --bs-gutter-x: 0.5rem;
  --bs-gutter-y: 1.5rem;
}
.my-pack-unit-delete-btn {
  color: var(--my-color-red);
  background-color: var(--my-color-white);
  border: none;
  text-decoration: none;
}
.my-pack-unit-delete-btn:hover,
.my-pack-unit-delete-btn:active:not(:disabled) {
  color: var(--my-color-red-hover);
  background-color: color-mix(in srgb, var(--my-color-red) 8%, var(--my-color-white));
}
.my-pack-unit-delete-btn:disabled {
  opacity: 0.55;
}
.my-pack-unit-settings-carousel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
  min-width: 0;
}
.my-pack-unit-toolbar-row {
  display: flex;
  flex-wrap: nowrap;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  min-width: 0;
}
/* 稿頁 pill 按鈕文字不換行（先前出題、詳細資訊、產生題目等） */
.my-design-pack-unit-blocks :deep(.btn.rounded-pill),
.my-pack-unit-settings-body :deep(.btn.rounded-pill) {
  white-space: nowrap;
  flex-shrink: 0;
}
/* 題型區三子區塊：題目／批改＝淺灰底 gray-3；答案＝白底 */
.my-design-quiz-sub-block-outer {
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  min-width: 0;
}
.my-design-quiz-sub-block {
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  min-width: 0;
}
/* 稿頁三子區塊：題目／答案無框；批改規則／批改結果為灰框白底；出題規則為黑底區 */
/* 灰框欄位：圓角灰邊白底（批改子區） */
.my-design-quiz-field-inset,
.my-design-quiz-sub-block :deep(.my-design-quiz-field-inset) {
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  border: 1px solid var(--my-color-gray-2);
  border-radius: 0.5rem;
  background-color: var(--my-color-white);
}
/* 題目／答案：無灰框，沿用子區白底 */
.my-design-quiz-field-inset--plain,
.my-design-quiz-sub-block :deep(.my-design-quiz-field-inset--plain) {
  border: none;
  border-radius: 0;
  background-color: transparent;
}
.my-design-quiz-field-inset-label,
.my-design-quiz-sub-block :deep(.my-design-quiz-field-inset-label) {
  line-height: 1.35;
  white-space: nowrap;
}
/* 出題／答案／批改規則：標題列統一 px-3 py-2（頁內 + QuizCard 子區塊） */
.my-design-quiz-question-prompt-block__title-row,
.my-design-pack-unit-blocks :deep(.my-design-quiz-question-prompt-block__title-row),
.my-design-pack-unit-blocks :deep(.my-design-quiz-field-inset__head > .d-flex.gap-2.px-3) {
  padding-top: 0.5rem !important;
  padding-bottom: 0.5rem !important;
  padding-left: 1rem !important;
  padding-right: 1rem !important;
}
/* 題目等灰框白底：標題列 px-3 py-2 → 橫線 → 內文 px-3 pt-2 pb-2 */
.my-design-quiz-field-inset__rule,
.my-design-quiz-sub-block :deep(.my-design-quiz-field-inset__rule) {
  border: 0;
  border-top: 1px solid var(--my-color-gray-2);
  opacity: 1;
}
/*
 * 出題／批改規則黑底區外層 wrap：px-3 pt-2；標題列 px-3 py-2 → 橫線 → 內文
 * 題目／批改子區塊頂部：.my-design-quiz-stem-sub-block-top（w-100 pt-2，灰底區最上方、非題目 title 列）
 */
.my-design-quiz-stem-sub-block-top,
.my-design-pack-unit-blocks :deep(.my-design-quiz-stem-sub-block-top) {
  padding-top: 0.5rem !important;
}
.my-design-quiz-question-prompt-block,
.my-design-quiz-sub-block :deep(.my-design-quiz-question-prompt-block) {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  border: 1px solid var(--my-color-white);
  border-radius: 0.5rem;
  background-color: var(--my-color-black);
  overflow: hidden;
}
.my-design-quiz-question-prompt-block__title,
.my-design-quiz-sub-block :deep(.my-design-quiz-question-prompt-block__title) {
  color: var(--my-color-gray-2);
  line-height: 1.35;
  font-weight: 400;
  white-space: nowrap;
}
/* 稿頁區塊小標（設定單元題型、來源檔等）不換行 */
.my-design-pack-unit-blocks .my-font-sm-400.my-color-gray-1.mb-2,
.my-design-pack-unit-section > .my-font-sm-400.my-color-gray-1.mb-2 {
  white-space: nowrap;
}
/* 黑底區右上編輯：白 icon、小圓鈕（對齊 sm 標題列） */
.my-design-quiz-question-prompt-block__edit-btn,
.my-design-quiz-sub-block :deep(.my-design-quiz-question-prompt-block__edit-btn) {
  box-sizing: border-box;
  width: 1.75rem;
  height: 1.75rem;
  min-width: 1.75rem;
  min-height: 1.75rem;
  padding: 0;
  border: 1px solid color-mix(in srgb, var(--my-color-white) 40%, transparent);
  background-color: transparent;
  color: var(--my-color-white);
}
.my-design-quiz-question-prompt-block__edit-btn:hover:not(:disabled),
.my-design-quiz-question-prompt-block__edit-btn:focus-visible:not(:disabled),
.my-design-quiz-sub-block :deep(.my-design-quiz-question-prompt-block__edit-btn:hover:not(:disabled)),
.my-design-quiz-sub-block :deep(.my-design-quiz-question-prompt-block__edit-btn:focus-visible:not(:disabled)) {
  color: var(--my-color-white);
  border-color: var(--my-color-white);
  background-color: color-mix(in srgb, var(--my-color-white) 14%, transparent);
}
.my-design-quiz-question-prompt-block__edit-btn .fa-solid,
.my-design-quiz-sub-block :deep(.my-design-quiz-question-prompt-block__edit-btn .fa-solid) {
  font-size: var(--my-font-size-sm);
  line-height: 1;
}
.my-design-quiz-question-prompt-block__rule,
.my-design-quiz-sub-block :deep(.my-design-quiz-question-prompt-block__rule) {
  border: 0;
  border-top: 1px solid color-mix(in srgb, var(--my-color-white) 35%, transparent);
  opacity: 1;
}
/* 黑底預覽內層：無白框（頁內出題規則 + QuizCard 內批改規則） */
.my-design-quiz-question-prompt-block__content :deep(.english-exam-md-preview-panel--design-dark),
.my-design-quiz-sub-block :deep(.my-design-quiz-question-prompt-block__content .english-exam-md-preview-panel--design-dark) {
  margin-bottom: 0;
  background: transparent !important;
  border: none !important;
  border-radius: 0;
}
.my-design-quiz-question-prompt-block__content :deep(.english-exam-md-preview-panel),
.my-design-quiz-sub-block :deep(.my-design-quiz-question-prompt-block__content .english-exam-md-preview-panel) {
  margin-bottom: 0;
}
.my-design-quiz-question-prompt-block__content :deep(.english-exam-md-preview-body),
.my-design-quiz-question-prompt-block__content :deep(.english-exam-md-preview-empty),
.my-design-quiz-sub-block :deep(.my-design-quiz-question-prompt-block__content .english-exam-md-preview-body),
.my-design-quiz-sub-block :deep(.my-design-quiz-question-prompt-block__content .english-exam-md-preview-empty) {
  color: var(--my-color-white);
}
.my-design-quiz-question-prompt-block__content :deep(.english-exam-md-preview-empty),
.my-design-quiz-sub-block :deep(.my-design-quiz-question-prompt-block__content .english-exam-md-preview-empty) {
  color: var(--my-color-gray-2);
}
.my-design-quiz-question-prompt-block__content :deep(.english-exam-md-preview-body h1),
.my-design-quiz-question-prompt-block__content :deep(.english-exam-md-preview-body h2),
.my-design-quiz-question-prompt-block__content :deep(.english-exam-md-preview-body h3),
.my-design-quiz-question-prompt-block__content :deep(.english-exam-md-preview-body p),
.my-design-quiz-question-prompt-block__content :deep(.english-exam-md-preview-body li),
.my-design-quiz-question-prompt-block__content :deep(.english-exam-md-preview-body td),
.my-design-quiz-question-prompt-block__content :deep(.english-exam-md-preview-body th),
.my-design-quiz-sub-block :deep(.my-design-quiz-question-prompt-block__content .english-exam-md-preview-body h1),
.my-design-quiz-sub-block :deep(.my-design-quiz-question-prompt-block__content .english-exam-md-preview-body h2),
.my-design-quiz-sub-block :deep(.my-design-quiz-question-prompt-block__content .english-exam-md-preview-body h3),
.my-design-quiz-sub-block :deep(.my-design-quiz-question-prompt-block__content .english-exam-md-preview-body p),
.my-design-quiz-sub-block :deep(.my-design-quiz-question-prompt-block__content .english-exam-md-preview-body li),
.my-design-quiz-sub-block :deep(.my-design-quiz-question-prompt-block__content .english-exam-md-preview-body td),
.my-design-quiz-sub-block :deep(.my-design-quiz-question-prompt-block__content .english-exam-md-preview-body th) {
  color: var(--my-color-white);
}
.my-design-quiz-question-prompt-block__content :deep(.english-exam-md-preview-body a),
.my-design-quiz-sub-block :deep(.my-design-quiz-question-prompt-block__content .english-exam-md-preview-body a) {
  color: var(--my-color-blue-hover);
  word-break: break-word;
}
.my-design-quiz-question-prompt-block__content :deep(.english-exam-md-preview-body pre),
.my-design-quiz-sub-block :deep(.my-design-quiz-question-prompt-block__content .english-exam-md-preview-body pre) {
  background: color-mix(in srgb, var(--my-color-white) 12%, transparent);
  color: var(--my-color-white);
}
.my-design-quiz-question-prompt-block__content :deep(.english-exam-md-preview-body code),
.my-design-quiz-sub-block :deep(.my-design-quiz-question-prompt-block__content .english-exam-md-preview-body code) {
  color: var(--my-color-white);
}
.my-design-quiz-question-prompt-block__content :deep(.english-exam-md-preview-body p code),
.my-design-quiz-question-prompt-block__content :deep(.english-exam-md-preview-body li code),
.my-design-quiz-sub-block :deep(.my-design-quiz-question-prompt-block__content .english-exam-md-preview-body p code),
.my-design-quiz-sub-block :deep(.my-design-quiz-question-prompt-block__content .english-exam-md-preview-body li code) {
  background: color-mix(in srgb, var(--my-color-white) 14%, transparent);
  color: var(--my-color-white);
}
.my-design-quiz-question-prompt-block__content :deep(.english-exam-md-preview-body blockquote),
.my-design-quiz-sub-block :deep(.my-design-quiz-question-prompt-block__content .english-exam-md-preview-body blockquote) {
  border-left-color: var(--my-color-gray-2);
  color: var(--my-color-gray-2);
}
.my-design-quiz-question-prompt-block__content :deep(.english-exam-md-preview-body th),
.my-design-quiz-question-prompt-block__content :deep(.english-exam-md-preview-body td),
.my-design-quiz-sub-block :deep(.my-design-quiz-question-prompt-block__content .english-exam-md-preview-body th),
.my-design-quiz-sub-block :deep(.my-design-quiz-question-prompt-block__content .english-exam-md-preview-body td) {
  border-color: color-mix(in srgb, var(--my-color-white) 35%, transparent);
}
.my-design-quiz-field-inset-body :deep(.english-exam-md-preview-panel) {
  margin-bottom: 0;
}
/* 題目標題列「先前出題」pill：白底、無描邊 */
.btn.my-design-quiz-history-btn,
:deep(.btn.my-design-quiz-history-btn) {
  border: none;
  white-space: nowrap;
  background-color: var(--my-color-white);
  color: var(--my-color-black);
}
.btn.my-design-quiz-history-btn:hover:not(:disabled),
.btn.my-design-quiz-history-btn:focus-visible:not(:disabled),
.btn.my-design-quiz-history-btn:active:not(:disabled),
:deep(.btn.my-design-quiz-history-btn:hover:not(:disabled)),
:deep(.btn.my-design-quiz-history-btn:focus-visible:not(:disabled)),
:deep(.btn.my-design-quiz-history-btn:active:not(:disabled)) {
  background-color: color-mix(in srgb, var(--my-color-black) 7%, var(--my-color-white));
  color: var(--my-color-black);
}
/* 答案標題列 pill（提示、參考答案、詳細資訊等）：淺灰底 gray-3、無描邊 */
.btn.my-design-quiz-stem-history-btn,
:deep(.btn.my-design-quiz-stem-history-btn) {
  border: none;
  white-space: nowrap;
  background-color: var(--my-color-gray-3);
  color: var(--my-color-black);
}
.btn.my-design-quiz-stem-history-btn:hover:not(:disabled),
.btn.my-design-quiz-stem-history-btn:focus-visible:not(:disabled),
.btn.my-design-quiz-stem-history-btn:active:not(:disabled),
:deep(.btn.my-design-quiz-stem-history-btn:hover:not(:disabled)),
:deep(.btn.my-design-quiz-stem-history-btn:focus-visible:not(:disabled)),
:deep(.btn.my-design-quiz-stem-history-btn:active:not(:disabled)) {
  background-color: color-mix(in srgb, var(--my-color-black) 5%, var(--my-color-gray-3));
  color: var(--my-color-black);
}
/* 答案子區塊：作答欄白底、淡灰框（--my-color-gray-2） */
.form-control.my-design-quiz-answer-input,
.my-design-quiz-sub-block :deep(.form-control.my-design-quiz-answer-input) {
  background-color: var(--my-color-white);
  border: 1px solid var(--my-color-gray-2);
}
.form-control.my-design-quiz-answer-input:focus,
.my-design-quiz-sub-block :deep(.form-control.my-design-quiz-answer-input:focus) {
  background-color: var(--my-color-white);
  border-color: var(--my-color-gray-2);
  box-shadow: none;
}
.form-control.my-design-quiz-answer-input:disabled,
.my-design-quiz-sub-block :deep(.form-control.my-design-quiz-answer-input:disabled) {
  background-color: var(--my-color-gray-4);
  border-color: var(--my-color-gray-2);
  opacity: 1;
}
/* 與產生題目／開始批改 pill 同高之灰底圓形編輯鈕（僅稿頁；含 QuizCard 批改子區塊內按鈕） */
.btn.my-design-quiz-action-edit-btn,
.my-design-quiz-sub-block :deep(.btn.my-design-quiz-action-edit-btn) {
  box-sizing: border-box;
  width: 2.5rem;
  height: 2.5rem;
  min-width: 2.5rem;
  min-height: 2.5rem;
  padding: 0;
  border: none;
}


.my-pack-unit-md-editor :deep(.english-exam-md-editor-root) {
  --english-md-preview-max-h: min(50vh, 22rem);
}
.my-pack-unit-md-editor :deep(.english-exam-md-editor-wrap .CodeMirror-scroll) {
  min-height: 200px;
}
</style>
