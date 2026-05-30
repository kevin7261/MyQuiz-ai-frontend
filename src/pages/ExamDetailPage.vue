<script setup>
/**
 * ExamDetailPage - 測驗詳情（題目、出題、評分；由 ExamPage 九宮格進入）
 *
 * 與 CreateExamQuizBankPage 版面類似（分頁、題目卡片、出題/評分），但無 RAG 建立/上傳/Pack；題目來源為 GET /exam/rag-for-exams／測驗分頁。**新增題目**（按 + 開 Modal 選單元／題型）：POST /exam/tab/quiz/create-llm-generate 或 create-llm-generate-followup（body 不需 exam_quiz_id）；**重新產生題目**（已有題列）POST /exam/tab/quiz/llm-generate／llm-generate-followup（須 exam_quiz_id）。
 *
 * 資料來源：
 * - 試卷題庫／單元選項：GET /exam/rag-for-exams（units[]：unit_type、transcript、text_file_name 等；內嵌 quizzes 時出題／批改規則為預覽）；不呼叫 GET /rag/tab/for-exam
 * - GET /exam/tabs?local=&person_id=&course_id=：person_id、course_id 為必填 query（course_id 由 loggedFetch 自 currentCourse 帶入）；local 與 GET /rag/tabs 相同；每筆 Exam 含 units[]（Exam_Unit），每單元 quizzes[]（Exam_Quiz）；作答可為頂層 answers[] 或題列內嵌 answer_content／quiz_score／answer_critique；mergeQuizzesWithTopLevelAnswers 展平後 syncExamItemToTabState 灌入卡片；題型區塊內 unit_type=2 內嵌 Markdown（不標「逐字稿」，不列文字檔名）；3 僅 `<audio>`（不列 mp3 檔名、不標聽取音訊）；4 內嵌 iframe（不標 YouTube 字樣）；題目標題列「詳細資訊」Modal 僅 JSON 資料（合併 GET /exam/tabs 與本頁編輯狀態）
 * 出題：Modal「產生題目」→ create-llm-generate／create-llm-generate-followup；槽位內「產生題目」→ llm-generate／llm-generate-followup（提示自 Rag_Quiz 讀勿傳）。追問先前出題 Modal 不含當前題；followup API 之 quiz_history_list 為祖先鏈＋followupRounds（繼續追問含剛批改輪）。評分：POST /exam/tab/quiz/llm-grade；題目讚／差：POST /exam/tab/quiz/rate；分頁更名：PUT /exam/tab/tab-name；刪除：PUT /exam/tab/delete/{exam_tab_id}
 *
 * 試題資料表 public."Exam_Quiz"（與 GET/POST 題目 payload 對齊）：exam_quiz_id、exam_id、exam_tab_id、person_id、rag_id、unit_name、file_name、quiz_content、quiz_hint、quiz_answer_reference、quiz_rate（-1／0／1）、quiz_metadata、updated_at、created_at。畫面「單元」優先 unit_name。
 */
import { ref, computed, watch, onActivated, reactive, nextTick, useSlots, provide } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/authStore.js';
import { COURSE_SCOPE_KEYS } from '../utils/courseScope.js';
import {
  API_BASE,
  API_RESPONSE_QUIZ_CONTENT,
  API_RESPONSE_QUIZ_LEGACY,
  API_RAG_FOR_EXAMS,
  API_EXAM_TESTS,
  API_CREATE_EXAM,
  API_EXAM_DELETE,
  API_EXAM_QUIZ_GRADE,
  API_EXAM_QUIZ_GRADE_RESULT,
  API_EXAM_RATE_QUIZ,
  isFrontendLocalHost,
} from '../constants/api.js';
import {
  generateTabId,
  deriveRagNameFromTabId,
  parseRagMetadataObject,
  getRagUnitListString,
  normalizeExamListResponse,
  mergeQuizzesWithTopLevelAnswers,
  findExamQuizRootInList,
  examQuizChainFromRoot,
  examOrRagQuizRowKey,
  isExamListWrapperResponse,
  parsePackUnitTypesFromRag,
  ragQuizSelectValue,
  UNIT_TYPE_RAG,
  UNIT_TYPE_TEXT,
  UNIT_TYPE_MP3,
  UNIT_TYPE_YOUTUBE,
} from '../utils/rag.js';
import JsonTreeViewer from '../components/JsonTreeViewer.vue';
import { renderMarkdownToSafeHtml } from '../utils/renderMarkdown.js';
import { youtubeEmbedUrlFromInput } from '../utils/youtubeEmbed.js';
import LoadingOverlay from '../components/LoadingOverlay.vue';
import LogoLayerMark from '../components/LogoLayerMark.vue';
import MessageModal from '../components/MessageModal.vue';
import PackUnitTypeIcon from '../components/PackUnitTypeIcon.vue';
import QuizCard from '../components/QuizCard.vue';
import RagTabUnitMp3Player from '../components/RagTabUnitMp3Player.vue';
import TabRenameModal from '../components/TabRenameModal.vue';
import DeleteButtonLabel from '../components/DeleteButtonLabel.vue';
import ExamAddQuestionModal from '../components/ExamAddQuestionModal.vue';
import {
  apiUpdateExamTabName,
  apiExamTabQuizLlmGenerate,
  apiExamTabQuizCreateLlmGenerate,
  apiExamTabQuizLlmGenerateFollowup,
  apiExamTabQuizCreateLlmGenerateFollowup,
} from '../services/examApi.js';
import { formatGradingResult } from '../utils/grading.js';
import { submitGrade } from '../composables/useQuizGrading.js';
import {
  followupHistoryEntryFromQuizCard,
  normalizeFollowupHistoryItem,
} from '../services/ragApi.js';
import { loggedFetch } from '../utils/loggedFetch.js';
import {
  readExamTabUiPersisted,
  writeExamTabUiPersisted,
} from '../utils/examTabUiStorage.js';
import { useMessageModal } from '../composables/useMessageModal.js';

const props = defineProps({
  tabId: { type: String, required: true },
  /** exam_3：左側清單欄、白底主內容（對齊 create-exam-bank_3） */
  designSidePanelOnLeft: { type: Boolean, default: false },
  /** exam_3 深連結路由前綴（例如 /exam_3） */
  routeDetailBase: { type: String, default: '' },
  /** exam_3 URL 之 exam_quiz_id（對應 Exam_Quiz；0 或未指定則不強制選取） */
  routeExamQuizId: { type: String, default: '' },
  /** exam_3：左側清單「刪除此試卷」是否停用 */
  sidePanelDeleteExamDisabled: { type: Boolean, default: false },
  /** 刪除試卷進行中（由 ExamPage 傳入） */
  sidePanelDeleteExamLoading: { type: Boolean, default: false },
});

const emit = defineEmits(['delete-exam']);

const slots = useSlots();
const router = useRouter();
const route = useRoute();
const showSidePanelHeader = computed(
  () => props.designSidePanelOnLeft && !!slots['side-panel-header'],
);

const authStore = useAuthStore();

// ─── 頁面描述常數 ──────────────────────────────────────────────────────────────

/** 與 CreateExamQuizBankPage 相同命名，供標題／載入文案／空狀態按鈕共用 */
const pageTitle = computed(() => '測驗');
const quizBankNoun = computed(() => '試卷');
const work3LogoGradientBias = computed(() => (props.designSidePanelOnLeft ? 'work3' : 'default'));
const generateDbOverlayLabel = computed(() => (props.designSidePanelOnLeft ? '開始出題中...' : '產生題目中...'));
const examAddQuestionConfirmLabel = computed(() => (props.designSidePanelOnLeft ? '開始出題' : '產生題目'));
const d3ConfirmPillMd = computed(() => (props.designSidePanelOnLeft ? 'my-button-white' : 'my-button-black'));
const d3HistoryPill = computed(() => (props.designSidePanelOnLeft ? 'my-button-transparent-borderless' : 'my-button-gray-4'));

const messageModal = useMessageModal();
const {
  open: messageModalOpen,
  title: messageModalTitle,
  message: messageModalMessage,
  confirmButtonClass: messageModalConfirmClass,
  close: closeMessageModal,
} = messageModal;
provide('showMessageModal', (modalTitle, text, options = {}) => {
  messageModal.show(modalTitle, text, {
    confirmButtonClass: () => d3ConfirmPillMd.value,
    ...options,
  });
});

// ─── 純輔助函式（不依賴 Vue 狀態） ────────────────────────────────────────────

/** API 若回傳「找不到資料」（404/Not Found），在空畫面視為無資料而非錯誤。 */
function isNotFoundLike(status, message) {
  if (Number(status) === 404) return true;
  const msg = String(message ?? '').toLowerCase();
  return msg.includes('not found') || msg.includes('查無');
}

/**
 * GET /exam/rag-for-exams 回傳包裝不一；整理成與題面既有邏輯相容的 rag 形狀（rag_id、rag_tab_id、outputs[]／rag_metadata 等）。
 * 若內嵌 Rag_Quiz：出題規則／批改規則後端僅給預覽，前端勿當完整字串送去 LLM。
 *
 * 注意：此端點通常只回傳「測驗用」單元／題目（for_exam=true 等後端規則）。若全為 for_exam=false，回傳的 units 可能為 []，與其他 API（例如完整單元列表）長相不同。
 * @param {unknown} data
 * @returns {object | null}
 */
function normalizeExamRagForExamsPayload(data) {
  if (data == null) return null;

  function parseArrayMaybeJson(raw) {
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

  function normalizeUnitRows(rawUnits) {
    const rows = parseArrayMaybeJson(rawUnits);
    return rows.map((u) => {
      if (!u || typeof u !== 'object') return u;
      const parsedQuizzes = parseArrayMaybeJson(u.quizzes);
      if (Array.isArray(u.quizzes) || parsedQuizzes.length > 0) {
        return { ...u, quizzes: parsedQuizzes };
      }
      return u;
    });
  }

  function unitToOutput(u) {
    if (!u || typeof u !== 'object') return {};
    const unitName = u.unit_name ?? u.name ?? '';
    const ragName = u.rag_name ?? unitName;
    return {
      rag_tab_id: u.rag_tab_id ?? u.RagTabId,
      rag_unit_id: u.rag_unit_id ?? u.RagUnitId,
      unit_name: unitName,
      rag_name: ragName,
      filename:
        u.filename ??
        u.file_name ??
        u.repack_file_name ??
        u.rag_file_name ??
        '',
      quizzes: u.quizzes,
    };
  }

  if (Array.isArray(data)) {
    const units = normalizeUnitRows(data);
    if (!units.length) return null;
    const u0 = units[0];
    return {
      rag_id: u0.rag_id ?? u0.RagId,
      rag_tab_id: u0.rag_tab_id ?? u0.RagTabId,
      rag_name: u0.rag_name ?? u0.unit_name,
      units,
      outputs: units.map(unitToOutput),
      transcript: u0.transcript ?? u0.transcription ?? undefined,
    };
  }

  if (typeof data !== 'object') return null;

  /** @param {object} obj */
  function extractRawUnitsList(obj) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null;
    const keys = [
      'units',
      'rag_units',
      'Units',
      'RagUnits',
      'exam_units',
      'examUnits',
      'unit_list',
      'unitList',
    ];
    for (const k of keys) {
      if (!Object.prototype.hasOwnProperty.call(obj, k)) continue;
      const rows = parseArrayMaybeJson(obj[k]);
      if (rows.length > 0) return rows;
    }
    return null;
  }

  /** @param {object} container */
  function deepExtractUnits(container) {
    const direct = extractRawUnitsList(container);
    if (direct) return direct;
    if (!container || typeof container !== 'object' || Array.isArray(container)) return null;
    for (const nk of ['result', 'payload', 'body', 'content', 'records']) {
      const inner = container[nk];
      if (!inner || typeof inner !== 'object') continue;
      if (Array.isArray(inner)) {
        const rows = normalizeUnitRows(inner);
        if (rows.length > 0) return inner;
        continue;
      }
      const nested = extractRawUnitsList(inner);
      if (nested) return nested;
    }
    return null;
  }

  let unwrap = data;
  if (data.data != null && typeof data.data === 'object') {
    unwrap = data.data;
  } else if (data.Data != null && typeof data.Data === 'object') {
    unwrap = data.Data;
  }

  // 某些 API 將單元陣列放在 data 本體：{ data: [ { unit... }, ... ] }
  if (Array.isArray(unwrap)) {
    const units = normalizeUnitRows(unwrap);
    if (units.length > 0) {
      const u0 = units[0];
      const ragId = u0.rag_id ?? u0.RagId;
      const ragTabId = u0.rag_tab_id ?? u0.RagTabId;
      return {
        rag_id: ragId,
        rag_tab_id: ragTabId,
        rag_name: u0.rag_name ?? u0.unit_name,
        units,
        outputs: units.map(unitToOutput),
        transcript: u0.transcript ?? u0.transcription ?? undefined,
      };
    }
  }

  const unwrapHasUnitsKey =
    Object.prototype.hasOwnProperty.call(unwrap, 'units')
    || Object.prototype.hasOwnProperty.call(unwrap, 'rag_units');

  function countNestedQuizzes(unitRows) {
    if (!Array.isArray(unitRows)) return 0;
    let total = 0;
    for (const u of unitRows) {
      const quizzes = parseArrayMaybeJson(u?.quizzes);
      total += quizzes.length;
    }
    return total;
  }

  function pickRicherUnitRows(a, b) {
    const aa = Array.isArray(a) ? a : [];
    const bb = Array.isArray(b) ? b : [];
    if (!aa.length) return bb;
    if (!bb.length) return aa;
    const aq = countNestedQuizzes(aa);
    const bq = countNestedQuizzes(bb);
    if (bq > aq) return bb;
    if (aq > bq) return aa;
    return bb.length > aa.length ? bb : aa;
  }

  const pickRag =
    unwrap.rag
    ?? (Array.isArray(unwrap.rags) && unwrap.rags.length ? unwrap.rags[0] : null);

  const unitsFromRag = normalizeUnitRows(pickRag && (pickRag.units ?? pickRag.rag_units));
  const rawRootUnits =
    deepExtractUnits(unwrap)
    ?? extractRawUnitsList(unwrap)
    ?? unwrap.units
    ?? unwrap.rag_units;
  const unitsFromRoot = normalizeUnitRows(rawRootUnits);
  let units = unitsFromRag.length > 0 ? unitsFromRag : unitsFromRoot;

  if (!Array.isArray(units)) {
    const alt = unwrap.items ?? unwrap.results ?? unwrap.rows;
    units = normalizeUnitRows(alt);
  }
  if (!units.length) {
    const alt = unwrap.items ?? unwrap.results ?? unwrap.rows;
    units = normalizeUnitRows(alt);
  }

  const sys =
    unwrap.transcript
    ?? unwrap.transcription
    ?? pickRag?.transcript
    ?? pickRag?.transcription
    ?? null;
  const rootQuizzes = parseArrayMaybeJson(unwrap.quizzes);

  if (pickRag != null && typeof pickRag === 'object') {
    const base = { ...pickRag };
    if (sys != null && base.transcript == null) base.transcript = sys;
    const baseUnits = normalizeUnitRows(base.units ?? base.rag_units);
    const mergedUnits = pickRicherUnitRows(baseUnits, units);
    if (mergedUnits.length > 0) {
      if (!Array.isArray(base.outputs) || base.outputs.length === 0) base.outputs = mergedUnits.map(unitToOutput);
      base.units = mergedUnits;
    }
    const baseQuizzes = parseArrayMaybeJson(base.quizzes);
    if (baseQuizzes.length > 0 || rootQuizzes.length > 0) {
      base.quizzes = baseQuizzes.length > 0 ? baseQuizzes : rootQuizzes;
    }
    if (base.rag_tab_id != null || base.rag_id != null) return base;
  }

  if (Array.isArray(units) && units.length > 0) {
    const u0 = units[0];
    const ragId = unwrap.rag_id ?? u0.rag_id ?? u0.RagId;
    const ragTabId = unwrap.rag_tab_id ?? u0.rag_tab_id ?? u0.RagTabId;
    return {
      rag_id: ragId,
      rag_tab_id: ragTabId,
      rag_name: unwrap.rag_name,
      units,
      outputs: units.map(unitToOutput),
      quizzes: rootQuizzes.length > 0 ? rootQuizzes : undefined,
      transcript: sys ?? undefined,
      rag_metadata: unwrap.rag_metadata,
      unit_list: unwrap.unit_list,
      file_metadata: unwrap.file_metadata,
      file_size: unwrap.file_size,
    };
  }

  /** 後端明確回傳 units: [] 時仍回物件，避免與 JSON 解析失敗（null）混淆，測驗頁才能顯示「題庫為空」 */
  if (Array.isArray(units) && units.length === 0 && unwrapHasUnitsKey) {
    return {
      rag_id: unwrap.rag_id,
      rag_tab_id: unwrap.rag_tab_id ?? null,
      rag_name: unwrap.rag_name,
      units: [],
      outputs: [],
      quizzes: rootQuizzes.length > 0 ? rootQuizzes : undefined,
      transcript: sys ?? undefined,
      rag_metadata: unwrap.rag_metadata,
      unit_list: unwrap.unit_list,
      file_metadata: unwrap.file_metadata,
      file_size: unwrap.file_size,
    };
  }

  return null;
}

let cardIdSeq = 0;
function nextCardId() {
  return `card-${++cardIdSeq}`;
}

// ─── 試卷題庫資料（GET /exam/rag-for-exams） ──────────────────────────────────
function normalizeExamQuizRate(v) {
  const n = Number(v);
  if (n === 1 || n === -1 || n === 0) return n;
  return 0;
}

/** GET /exam/rag-for-exams 正規化後的試卷題庫摘要（供 generateQuizUnits／題卡 rag_id 比對）；非 GET /rag/tab/for-exam */
const forExamRag = ref(null);
const forExamLoading = ref(false);
const forExamError = ref('');

function examNormalizeUnitRow(unit, fallbackTabId) {
  if (!unit || typeof unit !== 'object') return null;
  const rawName = unit.unit_name ?? unit.rag_name ?? unit.name ?? '';
  const name = String(rawName ?? '').trim();
  if (!name) return null;
  const tabId = String(unit.rag_tab_id ?? fallbackTabId ?? '').trim();
  const safeName = name.replace(/\+/g, '_');
  const src =
    unit.filename ??
    unit.file_name ??
    unit.repack_file_name ??
    unit.rag_file_name ??
    '';
  return {
    rag_tab_id: tabId || safeName,
    filename: src || `${safeName}_rag.zip`,
    rag_name: String(unit.rag_name ?? name).trim() || safeName,
    unit_name: safeName,
  };
}

function parseExamUnitQuizzesMaybe(unit) {
  if (!unit || typeof unit !== 'object') return [];
  const raw = unit.quizzes;
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const p = JSON.parse(raw);
      return Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * 試卷題庫該單元之 quizzes[]（優先用建列時保存之來源列，避免 rag.units 為空僅有 outputs 時題目下拉升空）
 * @param {object | null | undefined} unitItem - examUnitTabItems 其中一筆
 */
function examQuizzesForUnitTabItem(unitItem) {
  if (!unitItem || unitItem.sourceUnitIndex == null) return [];
  const src = unitItem.examRagUnitSource;
  if (src && typeof src === 'object') {
    return parseExamUnitQuizzesMaybe(src);
  }
  const rag = forExamRag.value;
  const rawUnits = rag?.units ?? rag?.rag_units;
  if (!Array.isArray(rawUnits) || rawUnits.length === 0) return [];
  const idx = Number(unitItem.sourceUnitIndex);
  if (!Number.isFinite(idx) || idx < 0 || idx >= rawUnits.length) return [];
  return parseExamUnitQuizzesMaybe(rawUnits[idx]);
}

function examBuildUnitTabItem(unit, index, fallbackTabId) {
  const n = examNormalizeUnitRow(unit, fallbackTabId);
  if (!n) return null;
  const label = String(n.unit_name || n.rag_name || `單元 ${index + 1}`);
  const ragTabId = String(n.rag_tab_id ?? '').trim();
  const keyBase = label;
  const rawRagUnitId = unit?.rag_unit_id ?? unit?.RagUnitId;
  const ragUnitIdNum = Number(rawRagUnitId);
  const ragUnitId = Number.isFinite(ragUnitIdNum) ? ragUnitIdNum : null;
  return {
    id: `${ragTabId || 'tab'}::${keyBase}::${index}`,
    label,
    unitName: label,
    ragName: n.rag_name,
    filename: n.filename,
    ragTabId,
    ragUnitId,
    /** 正規化前原始列（quizzes／prompt；outputs 路徑下 rag.units 可能為空） */
    examRagUnitSource: unit,
    /** 對應 `GET /exam/rag-for-exams` 之 `units[index]`，供讀取 `quizzes[]` */
    sourceUnitIndex: index,
  };
}

const examUnitTabItems = computed(() => {
  const rag = forExamRag.value;
  if (!rag || typeof rag !== 'object') return [];
  const fallbackTabId = String(rag.rag_tab_id ?? '');
  const rawUnits = rag.units ?? rag.rag_units;
  let rows = [];
  if (Array.isArray(rawUnits) && rawUnits.length > 0) {
    rows = rawUnits;
  } else if (Array.isArray(rag.outputs) && rag.outputs.length > 0) {
    rows = rag.outputs.map((o) => (o && typeof o === 'object' ? { ...o } : o)).filter(Boolean);
  }
  const rawUt = rag.unit_types ?? rag.unit_type_list;
  const typesArr = parsePackUnitTypesFromRag(rawUt, rows.length);
  rows = rows.map((u, i) => {
    const mergedUt = Number(u.unit_type ?? u.unitType ?? typesArr[i]);
    if (!Number.isFinite(mergedUt) || mergedUt <= 0) return u;
    return { ...u, unit_type: mergedUt };
  });
  return rows.map((u, i) => examBuildUnitTabItem(u, i, fallbackTabId)).filter(Boolean);
});

/** 出題區「單元」下拉 value（與 examUnitTabItems[].id 一致） */
function examUnitSelectValue(item) {
  if (!item || typeof item !== 'object') return '';
  return String(item.id ?? '').trim();
}

/**
 * Rag_Quiz／預覽列上的題名（對齊後端 quiz_name）
 * @param {object | null | undefined} qz
 */
function examQuizNameFromPreviewRow(qz) {
  if (!qz || typeof qz !== 'object') return '';
  return String(qz.quiz_name ?? qz.title ?? '').trim();
}

/** GET /exam/tabs、/exam/rag-for-exams 之 Exam_Quiz／Rag_Quiz.follow_up */
function examQuizApiRowIsFollowUp(quiz) {
  if (!quiz || typeof quiz !== 'object') return false;
  return (
    quiz.follow_up === true
    || quiz.follow_up === 1
    || quiz.followUp === true
    || quiz.followUp === 1
  );
}

function examQuizGenerateModeLabel(isFollowUp) {
  return isFollowUp ? '追問出題' : '一般出題';
}

/** 題型顯示：{quiz_name} (一般出題/追問出題) */
function examQuizTypeDisplayLabelFromParts(name, isFollowUp) {
  const n = String(name ?? '').trim();
  if (!n) return '—';
  return `${n} (${examQuizGenerateModeLabel(!!isFollowUp)})`;
}

function examQuizTypeDisplayLabel(quiz) {
  const name = examQuizDisplayNameFromRow(quiz) || examQuizNameFromPreviewRow(quiz);
  return examQuizTypeDisplayLabelFromParts(name, examQuizApiRowIsFollowUp(quiz));
}

/** 依槽位題卡 rag_quiz_id 對齊試卷題庫 quizzes[] 列 */
function examRagQuizRowForCard(slotIndex, card) {
  if (!card || typeof card !== 'object') return null;
  const rq = Number(card.rag_quiz_id);
  if (!Number.isFinite(rq) || rq < 1) return null;
  const uidSel = String(getSlotFormState(slotIndex).examUnitSelectId ?? '').trim();
  let unitItem = uidSel ? findExamUnitDropdownItemBySelectId(uidSel) : null;
  const uidCard = Number(card.rag_unit_id);
  if (
    (!unitItem || examQuizzesForUnitTabItem(unitItem).length === 0)
    && Number.isFinite(uidCard)
    && uidCard >= 1
  ) {
    unitItem =
      examUnitSelectDropdownOptions.value.find(
        (it) => it?.ragUnitId != null && Number(it.ragUnitId) === uidCard,
      ) ?? null;
  }
  if (!unitItem) return null;
  return (
    examQuizzesForUnitTabItem(unitItem).find(
      (q) => Number(ragQuizSelectValue(q)) === rq,
    ) ?? null
  );
}

function examQuizFollowUpForCard(slotIndex, card) {
  if (!card || typeof card !== 'object') return false;
  if (examQuizApiRowIsFollowUp(card)) return true;
  const gj = card.generateQuizResponseJson;
  if (gj && typeof gj === 'object' && examQuizApiRowIsFollowUp(gj)) return true;
  const ragRow = examRagQuizRowForCard(slotIndex, card);
  return ragRow ? examQuizApiRowIsFollowUp(ragRow) : false;
}

function examQuizTypeDisplayLabelForDropdownOption(opt) {
  if (!opt || typeof opt !== 'object') return '—';
  return examQuizTypeDisplayLabelFromParts(opt.quiz_name, opt.follow_up);
}

function examQuizNameLabelForDropdownOption(opt) {
  if (!opt || typeof opt !== 'object') return '—';
  return String(opt.quiz_name ?? '').trim() || '—';
}

function examQuizDropdownOptionIsFollowUp(opt) {
  return !!opt?.follow_up;
}

/**
 * 目前選定單元在試卷題庫中的 quiz_name 下拉選項。
 * @param {object | null | undefined} unitItem - examUnitTabItems 其中一筆
 */
function examQuizDropdownItems(unitItem) {
  if (!unitItem || unitItem.sourceUnitIndex == null) return [];
  const quizzes = examQuizzesForUnitTabItem(unitItem);
  const seen = new Set();
  const out = [];
  for (const qz of quizzes) {
    const name = examQuizNameFromPreviewRow(qz);
    if (!name || seen.has(name)) continue;
    seen.add(name);
    out.push({ quiz_name: name, follow_up: examQuizApiRowIsFollowUp(qz) });
  }
  return out;
}

function examQuizPickSelectValue(opt) {
  return String(opt?.quiz_name ?? '').trim();
}

/**
 * 與 CreateExamQuizBankPage `extractQuizUserPromptText` 鍵名對齊（GET /exam/rag-for-exams `units[].quizzes[]`）。
 * @param {object | null | undefined} raw
 * @returns {string}
 */
function extractQuizUserPromptFromExamRagRow(raw) {
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

/**
 * 批改指引：與 Rag_Quiz／題庫頁對齊（`answer_user_prompt_text`）。
 * @param {object | null | undefined} raw
 * @returns {string}
 */
function extractAnswerUserPromptFromExamRagRow(raw) {
  if (!raw || typeof raw !== 'object') return '';
  const keys = [
    'answer_user_prompt_text',
    'answerUserPromptText',
    'critique_user_prompt_instruction',
  ];
  for (const key of keys) {
    const val = raw[key];
    if (val == null) continue;
    const text = String(val);
    if (text.trim()) return text;
  }
  return '';
}

/**
 * 依選定單元＋quiz_name 在試卷題庫中找對應 `quizzes[]` 列（與下拉選項之 `examQuizNameFromPreviewRow` 一致）。
 * @param {object | null | undefined} unitItem
 * @param {string} quizNameTrimmed
 * @returns {object | null}
 */
function findExamRagQuizRowBySelectedPick(unitItem, quizNameTrimmed) {
  if (!unitItem || unitItem.sourceUnitIndex == null) return null;
  const name = String(quizNameTrimmed ?? '').trim();
  if (!name) return null;
  const quizzes = examQuizzesForUnitTabItem(unitItem);
  for (const qz of quizzes) {
    if (examQuizNameFromPreviewRow(qz) === name) return qz;
  }
  return null;
}

/**
 * 目前槽位選定單元＋quiz_name 對應之試卷題庫列指引（批改指引仍取自 GET /exam/rag-for-exams；POST llm-generate **不再**於 body 送出 quiz_user_prompt_text）。
 * @param {number} slotIndex
 * @param {string} [quizNameFallback] - 無下拉選值時用以對齊試卷題庫列（例如題列已有 examQuizDisplayName）
 * @returns {{ quiz_user_prompt_text: string, answer_user_prompt_text: string }}
 */
function examQuizPromptBundleForSlot(slotIndex, quizNameFallback = '') {
  const slotState = getSlotFormState(slotIndex);
  const uid = String(slotState.examUnitSelectId ?? '').trim();
  const quizName =
    String(slotState.examQuizNamePick ?? '').trim()
    || String(quizNameFallback ?? '').trim();
  const unitItem = findExamUnitDropdownItemBySelectId(uid);
  const row = findExamRagQuizRowBySelectedPick(unitItem, quizName);
  if (!row) {
    return { quiz_user_prompt_text: '', answer_user_prompt_text: '' };
  }
  return {
    quiz_user_prompt_text: extractQuizUserPromptFromExamRagRow(row).trim(),
    answer_user_prompt_text: extractAnswerUserPromptFromExamRagRow(row).trim(),
  };
}

/** @param {number} slotIndex */
function examQuizDropdownItemsForSlot(slotIndex) {
  const slotState = getSlotFormState(slotIndex);
  const uid = String(slotState.examUnitSelectId ?? '').trim();
  const unitItem = findExamUnitDropdownItemBySelectId(uid);
  return examQuizDropdownItems(unitItem);
}

/** GET /exam/rag-for-exams units[]：unit_type 與建立題庫頁對齊（1 RAG、2 文字、3 mp3、4 YouTube） */
function examResolvedUnitType(unit) {
  const ut = Number(unit?.unit_type ?? unit?.unitType);
  if (ut === UNIT_TYPE_TEXT || ut === UNIT_TYPE_MP3 || ut === UNIT_TYPE_YOUTUBE) return ut;
  return UNIT_TYPE_RAG;
}

function examUnitTranscriptFromRaw(unit) {
  if (!unit || typeof unit !== 'object') return '';
  const tx = unit.transcript ?? unit.transcription;
  return tx != null && String(tx).trim() !== '' ? String(tx).trim() : '';
}

/** 與 CreateExamQuizBankPage 單元來源列對齊（文字／MP3／YouTube） */
function examUnitSourceFilenameLabel(unit) {
  if (!unit || typeof unit !== 'object') return '';
  const ut = examResolvedUnitType(unit);
  if (ut === UNIT_TYPE_TEXT) {
    const direct = unit.text_file_name ?? unit.textFileName;
    if (direct != null && String(direct).trim() !== '') return String(direct).trim();
    const mode = String(unit.rag_mode ?? unit.ragMode ?? '').toLowerCase();
    if (mode === 'transcript_md') {
      const fn = unit.filename ?? unit.rag_filename ?? unit.rag_file_name ?? unit.ragFileName;
      if (fn != null && String(fn).trim() !== '') {
        const s = String(fn).trim();
        if (!/_rag\.zip$/i.test(s)) return s;
      }
    }
    return '';
  }
  if (ut === UNIT_TYPE_MP3) {
    const v = unit.mp3_file_name ?? unit.mp3FileName;
    return v != null && String(v).trim() !== '' ? String(v).trim() : '';
  }
  if (ut === UNIT_TYPE_YOUTUBE) {
    const v = unit.youtube_url ?? unit.youtubeUrl;
    return v != null && String(v).trim() !== '' ? String(v).trim() : '';
  }
  return '';
}

function examYoutubeLooksLikeUrl(s) {
  return /^https?:\/\//i.test(String(s ?? '').trim());
}

/** 選定單元為 unit_type 2／3／4 時：內容與來源欄位（資料來自 GET /exam/rag-for-exams units[]；畫面不另標「逐字稿」／文字檔名／mp3 檔名／YouTube 字樣） */
function examSlotUnitTranscriptSection(slotIndex) {
  const slotState = getSlotFormState(slotIndex);
  const uid = String(slotState.examUnitSelectId ?? '').trim();
  if (!uid) return null;
  const uitem = findExamUnitDropdownItemBySelectId(uid);
  const raw = uitem?.examRagUnitSource;
  if (!raw || typeof raw !== 'object') return null;
  const ut = Number(raw.unit_type ?? raw.unitType);
  if (ut !== UNIT_TYPE_TEXT && ut !== UNIT_TYPE_MP3 && ut !== UNIT_TYPE_YOUTUBE) return null;
  const transcript = examUnitTranscriptFromRaw(raw);
  const sourceValue = examUnitSourceFilenameLabel(raw);
  const youtubeHref =
    ut === UNIT_TYPE_YOUTUBE && examYoutubeLooksLikeUrl(sourceValue) ? sourceValue.trim() : '';
  return {
    unitType: ut,
    transcript,
    sourceDisplay: sourceValue || '—',
    youtubeHref,
  };
}

/**
 * 文字／YouTube／MP3 單元之逐字稿與播放器：須先選妥單元與題型（條件對齊「產生題目」）；已產生題幹後一律顯示。
 * @param {number} slotIndex
 */
/** 槽位對應單元 unit_type（1 RAG、2 文字、3 MP3、4 YouTube；對齊題庫頁 PackUnitTypeIcon） */
function examSlotUnitType(slotIndex) {
  const sec = examSlotUnitTranscriptSection(slotIndex);
  if (sec?.unitType != null) return sec.unitType;
  const slotState = getSlotFormState(slotIndex);
  const uid = String(slotState.examUnitSelectId ?? '').trim();
  const uitem = findExamUnitDropdownItemBySelectId(uid);
  const raw = uitem?.examRagUnitSource;
  if (raw && typeof raw === 'object') return examResolvedUnitType(raw);
  return null;
}

function examSlotShowUnitTranscriptUi(slotIndex) {
  const sec = examSlotUnitTranscriptSection(slotIndex);
  if (!sec) return false;
  if (examSlotRagChoicesLocked(slotIndex)) return true;
  const slotState = getSlotFormState(slotIndex);
  if (
    examUnitSelectDropdownOptions.value.length > 0
    && !String(slotState.examUnitSelectId ?? '').trim()
  ) {
    return false;
  }
  const quizOpts = examQuizDropdownItemsForSlot(slotIndex);
  if (quizOpts.length > 0 && !String(slotState.examQuizNamePick ?? '').trim()) {
    return false;
  }
  return true;
}

/** 測驗頁單元逐字稿：Markdown → 安全 HTML（與建立題庫頁「單元內容」區一致） */
function examSlotUnitTranscriptMdHtml(slotIndex) {
  const sec = examSlotUnitTranscriptSection(slotIndex);
  if (!sec) return '';
  const t = sec.transcript;
  return renderMarkdownToSafeHtml(t != null ? String(t) : '');
}

/** 選定單元為 unit_type=3 時：RagTabUnitMp3Player 之 rag_tab_id、rag_unit_id（GET /rag/tab/unit/mp3-file 不附 person_id） */
function examSlotMp3PlayerProps(slotIndex) {
  const slotState = getSlotFormState(slotIndex);
  const uid = String(slotState.examUnitSelectId ?? '').trim();
  if (!uid) return null;
  const uitem = findExamUnitDropdownItemBySelectId(uid);
  if (!uitem) return null;
  const raw = uitem.examRagUnitSource;
  if (!raw || typeof raw !== 'object') return null;
  const ut = Number(raw.unit_type ?? raw.unitType);
  if (ut !== UNIT_TYPE_MP3) return null;
  const rag_tab_id = String(uitem.ragTabId ?? '').trim();
  const ru = uitem.ragUnitId != null ? Number(uitem.ragUnitId) : 0;
  if (!rag_tab_id || !Number.isFinite(ru) || ru < 1) return null;
  return { ragTabId: rag_tab_id, ragUnitId: ru };
}

/** unit_type=4：iframe 用 embed URL */
function examSlotYoutubeEmbedUrl(slotIndex) {
  const sec = examSlotUnitTranscriptSection(slotIndex);
  if (!sec || sec.unitType !== UNIT_TYPE_YOUTUBE) return '';
  const raw = (sec.youtubeHref || sec.sourceDisplay || '').trim();
  return youtubeEmbedUrlFromInput(raw);
}

/** 詳細資訊 Modal（僅 JSON 資料）：槽位 1-based */
const examUnitDetailModalSlotIndex = ref(null);

function openExamUnitDetailModal(slotIndex) {
  examUnitDetailModalSlotIndex.value = slotIndex;
}

function closeExamUnitDetailModal() {
  examUnitDetailModalSlotIndex.value = null;
}

function buildExamQuizRowFromCardCore(card, slotIndex) {
  const slotState = getSlotFormState(slotIndex);
  const followUp =
    card.quizGenerateMode === 'followup'
    || card.follow_up === true
    || examQuizApiRowIsFollowUp(card);
  const row = {
    quiz_content: String(card.quiz ?? ''),
    quiz_hint: String(card.hint ?? ''),
    quiz_answer_reference: String(card.referenceAnswer ?? ''),
    unit_name: String(card.ragName ?? '').trim(),
    rag_id: card.rag_id ?? null,
    rag_unit_id: card.rag_unit_id ?? null,
    rag_quiz_id: card.rag_quiz_id ?? null,
    quiz_rate: card.quiz_rate ?? 0,
    follow_up: followUp,
    file_name: card.sourceFilename ?? null,
  };
  const eqid = card.exam_quiz_id ?? card.quiz_id;
  if (eqid != null && Number(eqid) >= 1) row.exam_quiz_id = Number(eqid);
  const qn = String(card.examQuizDisplayName ?? '').trim();
  if (qn) row.quiz_name = qn;
  const qp = String(card.quizUserPromptText ?? card.quiz_user_prompt_text ?? '').trim();
  if (qp) row.quiz_user_prompt_text = qp;
  const gp = String(card.gradingPrompt ?? '').trim();
  if (gp) row.answer_user_prompt_text = gp;
  const ans = String(card.quiz_answer ?? '').trim();
  if (ans) row.answer_content = ans;
  if (card.follow_up_exam_quiz_id != null && card.follow_up_exam_quiz_id !== '') {
    row.follow_up_exam_quiz_id = Number(card.follow_up_exam_quiz_id);
  }
  if (card.gradingResponseJson && typeof card.gradingResponseJson === 'object') {
    row.answers = [{ ...card.gradingResponseJson }];
    if (card.answer_id != null) {
      row.answers[0].exam_answer_id = row.answers[0].exam_answer_id ?? card.answer_id;
      row.answers[0].answer_id = row.answers[0].answer_id ?? card.answer_id;
    }
  } else if (ans || card.answer_id != null) {
    row.answers = [{
      exam_answer_id: card.answer_id ?? null,
      answer_id: card.answer_id ?? null,
      quiz_answer: ans,
      answer_content: ans,
    }];
  }
  if (!followUp) {
    const hist = slotState?.quiz_history_list;
    if (Array.isArray(hist) && hist.length) row.quiz_history_list = [...hist];
    const rich = slotState?.quiz_history_rich;
    if (Array.isArray(rich) && rich.length) row.quiz_history_rich = [...rich];
  }
  return row;
}

/** 題卡 → GET /exam/tabs 之 quizzes[] 列（含 follow_up_quiz 鏈；供 JSON 快照） */
function buildExamQuizRowFromCard(card, slotIndex) {
  if (!card || typeof card !== 'object') return null;
  const slotState = getSlotFormState(slotIndex);
  const activeRow = buildExamQuizRowFromCardCore(card, slotIndex);
  const rounds = Array.isArray(slotState?.followupRounds) ? slotState.followupRounds : [];
  if (!rounds.length) return activeRow;
  let chain = activeRow;
  for (let i = rounds.length - 1; i >= 0; i--) {
    const round = rounds[i];
    if (!round || typeof round !== 'object') continue;
    const node = normalizeFollowupQuizAnswers({ ...round });
    node.follow_up_quiz = chain;
    chain = node;
  }
  return chain;
}

/** 合併 GET /exam/tabs 列與 tabState，供 JSON 檢視即時反映頁面內容 */
function buildLiveExamTabsRowSnapshot(state, examBase) {
  const base = examBase && typeof examBase === 'object'
    ? JSON.parse(JSON.stringify(examBase))
    : {};

  const slotCount = Math.max(
    Number(state?.quizSlotsCount) || 0,
    state?.cardList?.length ?? 0,
  );
  const liveQuizRows = [];
  for (let i = 0; i < slotCount; i++) {
    const card = state?.cardList?.[i];
    if (card && typeof card === 'object') {
      const built = buildExamQuizRowFromCard(card, i + 1);
      if (built) liveQuizRows.push(built);
    }
  }

  if (liveQuizRows.length === 0) {
    return Object.keys(base).length > 0 ? base : null;
  }

  const baseUnits = base.units ?? base.exam_units;
  if (Array.isArray(baseUnits) && baseUnits.length > 0) {
    let slotIdx = 0;
    base.units = baseUnits.map((u) => {
      const uqs = Array.isArray(u.quizzes)
        ? u.quizzes
        : (Array.isArray(u.exam_quizzes) ? u.exam_quizzes : []);
      const rebuilt = [];
      for (let j = 0; j < uqs.length; j++) {
        if (slotIdx < liveQuizRows.length && liveQuizRows[slotIdx]) {
          rebuilt.push(liveQuizRows[slotIdx]);
        } else if (uqs[j]) {
          rebuilt.push(uqs[j]);
        }
        slotIdx += 1;
      }
      return { ...u, quizzes: rebuilt };
    });
    while (slotIdx < liveQuizRows.length) {
      const lastUnit = base.units[base.units.length - 1];
      if (lastUnit) {
        if (!Array.isArray(lastUnit.quizzes)) lastUnit.quizzes = [];
        lastUnit.quizzes.push(liveQuizRows[slotIdx]);
      }
      slotIdx += 1;
    }
    delete base.quizzes;
    delete base.exam_quizzes;
  } else {
    base.quizzes = liveQuizRows;
    if (base.exam_quizzes) base.exam_quizzes = liveQuizRows;
  }

  return Object.keys(base).length > 0 ? base : null;
}

const examUnitDetailModalJsonData = computed(() => {
  const state = currentState.value;
  void state.cardList;
  void state.quizSlotsCount;
  void state.slotFormState;
  void examList.value;
  for (const card of state.cardList ?? []) {
    if (!card || typeof card !== 'object') continue;
    void card.quiz;
    void card.hint;
    void card.referenceAnswer;
    void card.quiz_answer;
    void card.examQuizDisplayName;
    void card.quizUserPromptText;
    void card.gradingPrompt;
    void card.quiz_rate;
    void card.quizGenerateMode;
    void card.gradingResponseJson;
  }
  const n = Number(state.quizSlotsCount) || 0;
  for (let i = 1; i <= n; i++) {
    const slot = state.slotFormState?.[i];
    if (!slot) continue;
    void slot.followupRounds;
    void slot.quiz_history_list;
    void slot.quiz_history_rich;
  }
  return buildLiveExamTabsRowSnapshot(state, currentExamItem.value);
});

const examUnitDetailModalTitle = computed(() => {
  const idx = examUnitDetailModalSlotIndex.value;
  if (idx == null || !Number.isFinite(Number(idx)) || Number(idx) < 1) return 'JSON資料';
  const label = examSlotUnitLabelForHistoryModal(Number(idx));
  return label !== '—' ? label : 'JSON資料';
});

/**
 * 草稿 POST（同槽位連打時中止上一個請求；鍵須含 exam_tab_id 以免切換測驗分頁時誤.abort 他頁）
 * @type {Map<string, AbortController>}
 */
const examQuizDraftAbortBySlotIndex = new Map();

/** @param {number} slotIndex */
function examQuizDraftAbortKey(slotIndex) {
  const tid = activeTabId.value != null ? String(activeTabId.value).trim() : '';
  return `${tid || '__no_tab__'}::${slotIndex}`;
}

/** 測驗列表（GET /exam/tabs 載入；按 + 呼叫 POST /exam/tab/create 新增） */
const examList = ref([]);
const examListLoading = ref(false);
const examListError = ref('');
const createExamLoading = ref(false);
const createExamError = ref('');
/** 當前選中的 tab = 該測驗的 test_tab_id / exam_tab_id */
const activeTabId = ref(null);

// ─── 分頁更名 Modal 狀態 ────────────────────────────────────────────────────────

const examRenameModalOpen = ref(false);
/** PUT /exam/tab/tab-name 用 Exam 主鍵 */
const examRenameDraftExamId = ref(null);
const examRenameInitialName = ref('');
const examRenameSaving = ref(false);
const examRenameError = ref('');

// ─── 分頁題目卡片狀態（每個 tab 獨立） ───────────────────────────────────────

/** 每個 tab（test_tab_id）的狀態 */
const tabStateMap = reactive({});

function getTabState(id) {
  const resolvedId = id || (examList.value[0] ? getExamTabId(examList.value[0]) : '') || '';
  if (!resolvedId) {
    return {
      cardList: [],
      slotFormState: {},
      showQuizGeneratorBlock: false,
      quizSlotsCount: 0,
    };
  }
  if (!tabStateMap[resolvedId]) {
    tabStateMap[resolvedId] = reactive({
      cardList: [],
      slotFormState: {},
      showQuizGeneratorBlock: false,
      quizSlotsCount: 0,
      _synced: false,
    });
  }
  return tabStateMap[resolvedId];
}

/** 當前 tab 的狀態（template 與方法內使用） */
const currentState = computed(() => {
  const id = activeTabId.value;
  if (id) return getTabState(id);
  return getTabState(examList.value[0] ? getExamTabId(examList.value[0]) : '');
});

/** 當前選中 tab 對應的 Exam（來自 GET /exam/tabs 列表）；可為 units→quizzes 或扁平 quizzes／answers */
const currentExamItem = computed(() => {
  const id = activeTabId.value;
  if (!id) return null;
  return examList.value.find((exam) => getExamTabId(exam) === id) ?? null;
});

/** 從 GET /exam/rag-for-exams 正規化結果推導 generateQuizUnits（格式同 build-rag-zip outputs） */
const generateQuizUnits = computed(() => {
  const rag = forExamRag.value;
  if (!rag || typeof rag !== 'object') return [];
  const sourceTabId = String(rag.rag_tab_id ?? '');
  const outputBaseName = (o) => String((o.rag_name ?? o.unit_name ?? '').trim()).replace(/\+/g, '_');
  const mapOutput = (o) => {
    const base = outputBaseName(o);
    const fromFile = (o.filename || o.rag_filename || '').replace(/_rag\.zip?$/i, '').replace(/\.zip$/i, '');
    const label = base || fromFile;
    const rawUnit =
      (o.unit_name != null && String(o.unit_name).trim() !== '')
        ? String(o.unit_name).trim()
        : (o.rag_name != null && String(o.rag_name).trim() !== '')
          ? String(o.rag_name).trim()
          : label;
    const unit_name = String(rawUnit || '').replace(/\+/g, '_') || label || sourceTabId;
    return {
      rag_tab_id: o.rag_tab_id || (base ? `${base}_rag` : '') || sourceTabId,
      filename: o.filename ?? o.rag_filename ?? (label ? `${label.replace(/\+/g, '_')}.zip` : `${sourceTabId}.zip`),
      rag_name: label || sourceTabId,
      unit_name,
    };
  };
  // 與 /rag/tab/build-rag-zip 相同：頂層 outputs
  const topOutputs = rag.outputs;
  if (Array.isArray(topOutputs) && topOutputs.length > 0) {
    return topOutputs.map(mapOutput);
  }
  const nestedOutputs = parseRagMetadataObject(rag)?.outputs;
  if (Array.isArray(nestedOutputs) && nestedOutputs.length > 0) {
    return nestedOutputs.map(mapOutput);
  }
  const ragListStr = getRagUnitListString(rag);
  if (ragListStr) {
    return String(ragListStr)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((group) => {
        const ragName = group.replace(/\+/g, '_');
        return {
          rag_tab_id: `${ragName}_rag` || sourceTabId,
          filename: `${ragName}_rag.zip`,
          rag_name: ragName,
          unit_name: ragName,
        };
      });
  }
  // 僅有 rag_tab_id、尚無 outputs／unit_list（後端精簡回傳）時仍要能選單元並出題
  if (sourceTabId) {
    const nm = String(rag.rag_name ?? rag.unit_name ?? '').replace(/\+/g, '_').trim() || sourceTabId;
    return [{
      rag_tab_id: sourceTabId,
      filename: `${nm}_rag.zip`,
      rag_name: nm,
      unit_name: nm,
    }];
  }
  return [];
});

/**
 * 「選擇單元」下拉選項：優先由 units／outputs 建成之 examUnitTabItems；
 * 若該列缺欄位導致 tab 為空，則沿用 generateQuizUnits 之後備（與出題 API 推導一致），避免「沒選項卻鎖 UI」。
 */
const examUnitSelectDropdownOptions = computed(() => {
  const tabs = examUnitTabItems.value;
  if (tabs.length > 0) return tabs;
  const rag = forExamRag.value;
  const gq = generateQuizUnits.value;
  if (!rag || !Array.isArray(gq) || gq.length === 0) return [];
  const fid = String(rag.rag_tab_id ?? '');
  return gq.map((u, i) => examBuildUnitTabItem(u, i, fid)).filter(Boolean);
});

/** 依 examUnitSelectId 解析目前選中之單元列（與下拉 options 同源） */
function findExamUnitDropdownItemBySelectId(uid) {
  const id = String(uid ?? '').trim();
  if (!id) return null;
  return examUnitSelectDropdownOptions.value.find((it) => examUnitSelectValue(it) === id) ?? null;
}

/** 與題卡 rag_id 比對：試題用 RAG 的 rag_id（與 CreateExamQuizBankPage currentRagIdForQuizCards 對齊） */
const currentRagIdForQuizCards = computed(() => {
  const rag = forExamRag.value;
  const v = rag?.rag_id ?? rag?.id;
  return v != null && String(v).trim() !== '' ? v : null;
});

/** 試題用 rag_id、rag_tab_id（除錯／console） */
const forExamRagIdAndTabId = computed(() => {
  const rag = forExamRag.value;
  if (!rag) return { rag_id: '未載入', rag_tab_id: '未載入' };
  const rid = rag.rag_id ?? rag.id;
  const tid = rag.rag_tab_id ?? rag.id ?? '';
  return { rag_id: rid != null ? String(rid) : '—', rag_tab_id: tid ? String(tid) : '—' };
});

/** 當前測驗顯示用（exam_tab_id、名稱；列表可能為 tab_name 或舊欄位 exam_name） */
const currentExamDisplay = computed(() => {
  const exam = currentExamItem.value;
  const id = activeTabId.value;
  if (!id) return { exam_tab_id: '—', exam_name: '—' };
  if (!exam) return { exam_tab_id: id, exam_name: getExamTabLabel({ exam_tab_id: id, test_tab_id: id }) || id };
  return {
    exam_tab_id: getExamTabId(exam) || id,
    exam_name: getExamTabLabel(exam) || id,
  };
});

/** 原「基本資訊」區塊改為載入完成後於 console 輸出（切換測驗 tab、for-exam／列表載入就緒時） */
watch(
  [
    () => activeTabId.value,
    () => examList.value.length,
    () => examListLoading.value,
    () => forExamLoading.value,
    () => `${currentExamDisplay.value.exam_tab_id}|${currentExamDisplay.value.exam_name}`,
    () => `${forExamRagIdAndTabId.value.rag_id}|${forExamRagIdAndTabId.value.rag_tab_id}`,
    () => String(forExamRag.value?.transcript ?? forExamRag.value?.transcription ?? ''),
  ],
  () => {
    if (examList.value.length === 0 || !activeTabId.value) return;
    if (examListLoading.value || forExamLoading.value) return;
    // eslint-disable-next-line no-console -- 除錯：目前選中測驗與試題用 RAG 摘要
    console.log('[測驗] 基本資訊', {
      當前測驗: { ...currentExamDisplay.value },
      試卷題庫: { ...forExamRagIdAndTabId.value },
      file_size:
        forExamRag.value?.file_metadata?.file_size ?? forExamRag.value?.file_size ?? '—',
      transcript:
        forExamRag.value != null
          ? (forExamRag.value.transcript ?? forExamRag.value.transcription ?? '—')
          : '—',
    });
  }
);

/** 「產生題目」「新增題目」：試卷題庫清單載入中則暫停（create 僅需 exam_tab_id，不依賴 rag_unit_id） */
const generateQuizBlocked = computed(() => forExamLoading.value);

/** 右側欄：有題目時顯示題目清單與「新增題目」 */
const showDesignRightView = computed(() => {
  if (!activeTabId.value) return false;
  return (Number(currentState.value.quizSlotsCount) || 0) > 0;
});

/** 左欄是否顯示：exam_3 有 side-panel-header 時即使尚無題目也保留左欄（含 detail bar、題目清單） */
const showSidePanelColumn = computed(() => {
  if (showSidePanelHeader.value) return true;
  return showDesignRightView.value;
});

/** 題目 Carousel：一次只顯示一題，由右側清單切換 */
const activeExamSlotIndex = ref(0);
/** 程式選題（如新增題目）時暫停 URL exam_quiz_id 還原，避免蓋掉新題 */
let suppressRouteExamQuizSelectionDepth = 0;

const examSlotCarouselCount = computed(
  () => Number(currentState.value.quizSlotsCount) || 0,
);

const activeExamSlotGi = computed(() => {
  const n = examSlotCarouselCount.value;
  if (n <= 0) return 0;
  return Math.min(Math.max(0, activeExamSlotIndex.value), n - 1);
});

/** 目前顯示的題目槽序（1-based，供 template） */
const activeExamSlotIndex1 = computed(() => activeExamSlotGi.value + 1);

function examQuizNavDisplayLabel(slotIndex) {
  return examSlotHeadingQuestionTitle(slotIndex);
}

/** 稿頁題目區 breadcrumb 題型名（不含出題模式括號） */
function examSlotHeadingBreadcrumbQuizTypeName(slotIndex) {
  const fullLabel = examSlotQuizTypeLabelForHistoryModal(slotIndex);
  return fullLabel.replace(/ \((?:一般出題|追問出題)\)$/, '');
}

/** 稿頁題目區標題：小字 breadcrumb「單元 > 題型」（aria 用文字；畫面用 icon 分隔） */
function examSlotHeadingBreadcrumb(slotIndex) {
  return `${examSlotUnitLabelForHistoryModal(slotIndex)} > ${examSlotHeadingBreadcrumbQuizTypeName(slotIndex)}`;
}

/** 稿頁題目區主標題：第 1 題、第 2 題… */
function examSlotHeadingQuestionTitle(slotIndex) {
  const n = Math.trunc(Number(slotIndex));
  if (!Number.isFinite(n) || n < 1) return '—';
  return `第 ${n} 題`;
}

/** 右側欄：題目子分頁 */
const designRightQuizSubTabItems = computed(() => {
  const n = examSlotCarouselCount.value;
  if (n <= 0) return [];
  const items = [];
  for (let i = 1; i <= n; i++) {
    items.push({
      key: `exam-slot-${i}`,
      label: examQuizNavDisplayLabel(i),
      unitLabel: examSlotUnitLabelForHistoryModal(i),
      unitType: examSlotUnitType(i),
      quizTypeLabel: examSlotHeadingBreadcrumbQuizTypeName(i),
      breadcrumb: examSlotHeadingBreadcrumb(i),
      followup: examSlotIsFollowupMode(i),
      index: i - 1,
      slotIndex: i,
      kind: 'exam-slot',
      active: i - 1 === activeExamSlotGi.value,
    });
  }
  return items;
});

function selectExamSlot(index) {
  const n = examSlotCarouselCount.value;
  if (n <= 0) return;
  const i = Number(index);
  if (!Number.isFinite(i) || i < 0 || i >= n) return;
  activeExamSlotIndex.value = i;
  if (props.routeDetailBase && props.designSidePanelOnLeft) {
    const card = currentState.value.cardList?.[i];
    syncDetailRouteExamQuizId(card);
  }
}

/** 依 exam_quiz_id 選取槽位（新增題目成功後對齊左欄與主內容） */
function selectExamSlotByCard(card) {
  if (!card || typeof card !== 'object') return;
  const qid = Number(card.exam_quiz_id ?? card.quiz_id);
  const list = currentState.value.cardList;
  if (Number.isFinite(qid) && qid >= 1 && Array.isArray(list)) {
    for (let i = 0; i < list.length; i++) {
      const cid = Number(list[i]?.exam_quiz_id ?? list[i]?.quiz_id);
      if (cid === qid) {
        selectExamSlot(i);
        return;
      }
    }
  }
  const n = examSlotCarouselCount.value;
  if (n > 0) selectExamSlot(n - 1);
}

function syncDetailRouteExamQuizId(card) {
  const base = String(props.routeDetailBase ?? '').trim();
  const tab = String(activeTabId.value ?? '').trim();
  if (!base || !tab) return;
  const qid = card?.exam_quiz_id ?? card?.quiz_id;
  const segment = qid != null && Number(qid) >= 1 ? String(qid) : '0';
  const path = `${base}/${encodeURIComponent(tab)}/${encodeURIComponent(segment)}`;
  if (router.currentRoute.value.path !== path) {
    router.replace(path);
  }
}

function applyRouteExamQuizIdSelection() {
  if (suppressRouteExamQuizSelectionDepth > 0) return;
  const rqid = Number(String(props.routeExamQuizId ?? '').trim());
  if (!Number.isFinite(rqid) || rqid < 1) return;
  const list = currentState.value.cardList;
  if (!Array.isArray(list)) return;
  for (let i = 0; i < list.length; i++) {
    const card = list[i];
    const cid = Number(card?.exam_quiz_id ?? card?.quiz_id);
    if (cid === rqid) {
      activeExamSlotIndex.value = i;
      return;
    }
  }
}

function onDesignRightQuizClick(item) {
  if (!item) return;
  if (item.kind === 'exam-slot') selectExamSlot(item.index);
}

watch(
  () => [props.routeExamQuizId, activeTabId.value, currentState.value.quizSlotsCount],
  () => {
    applyRouteExamQuizIdSelection();
  },
);

watch(examSlotCarouselCount, (n) => {
  if (n <= 0) {
    activeExamSlotIndex.value = 0;
    return;
  }
  if (activeExamSlotIndex.value >= n) {
    activeExamSlotIndex.value = n - 1;
  }
});

watch(activeTabId, () => {
  activeExamSlotIndex.value = 0;
});

/** 單元內容區：預設展開；切換題目時還原 */
const examUnitContentCollapsed = ref(false);

function toggleExamUnitContentCollapsed() {
  examUnitContentCollapsed.value = !examUnitContentCollapsed.value;
}

watch(activeExamSlotGi, () => {
  examUnitContentCollapsed.value = false;
});

/** 題目區標題列：有槽位時顯示「詳細資訊」（對齊題庫頁） */
function examSlotDetailModalButtonVisible(slotIndex) {
  const n = Number(currentState.value.quizSlotsCount) || 0;
  return slotIndex >= 1 && slotIndex <= n;
}

/** 評閱子區塊：已批改（confirmed 或已有批改結果）才顯示 */
const activeExamSlotShowGradingSubBlock = computed(() => {
  const slotIndex = activeExamSlotIndex1.value;
  const card = currentState.value.cardList[slotIndex - 1];
  if (!card || examSlotQuizBodyTrim(slotIndex) === '') return false;
  if (String(card.gradingResult ?? '').trim() !== '') return true;
  return card.confirmed === true;
});

/**
 * 載入 GET /exam/tabs、GET /exam/rag-for-exams：watch person_id 與 currentCourse.course_id（immediate）。
 * KeepAlive onActivated：再抓兩者；首次 onActivated 僅補抓試卷題庫，避免與 immediate 雙重 GET /exam/tabs。
 */
watch(
  () => [getCurrentPersonId(), authStore.getCourseForScope(COURSE_SCOPE_KEYS.EXAM)?.course_id],
  () => {
    fetchExamTests();
    fetchExamRagSource();
  },
  { immediate: true }
);

// ─── 重新整理後還原 tab／slot（sessionStorage，依使用者分鍵） ──────────────────

function routeForcedExamTabId() {
  if (!String(props.routeDetailBase ?? '').trim()) return '';
  return String(route.params.exam_id ?? '').trim();
}

function persistExamTabUiSelection() {
  const personId = getCurrentPersonId();
  if (!personId) return;
  const tid = String(activeTabId.value ?? '').trim();
  if (!tid) return;
  const card = currentState.value.cardList?.[activeExamSlotIndex.value];
  const eqid = card?.exam_quiz_id ?? card?.quiz_id;
  writeExamTabUiPersisted(personId, {
    exam_tab_id: tid,
    exam_slot_index: activeExamSlotIndex.value,
    exam_quiz_id: eqid != null && Number(eqid) >= 1 ? Number(eqid) : 0,
  });
}

function applyPersistedExamSlotIfActive(tabId) {
  const id = String(tabId ?? '').trim();
  if (!id || String(activeTabId.value ?? '').trim() !== id) return;
  const rqid = Number(String(props.routeExamQuizId ?? '').trim());
  if (Number.isFinite(rqid) && rqid >= 1) {
    nextTick(() => applyRouteExamQuizIdSelection());
    return;
  }
  const personId = getCurrentPersonId();
  if (!personId) return;
  const persisted = readExamTabUiPersisted(personId);
  if (!persisted || String(persisted.exam_tab_id) !== id) return;
  const idx = Number(persisted.exam_slot_index);
  nextTick(() => {
    if (String(activeTabId.value ?? '').trim() !== id) return;
    const n = examSlotCarouselCount.value;
    if (n > 0 && Number.isFinite(idx) && idx >= 0 && idx < n) {
      activeExamSlotIndex.value = idx;
    }
  });
}

/** 有測驗列表時預設選第一個 tab；exam_3 深連結或 session 還原 */
watch(examList, (list) => {
  if (list.length === 0 || activeTabId.value != null) return;
  const forced = routeForcedExamTabId();
  if (forced && list.some((e) => getExamTabId(e) === forced)) {
    activeTabId.value = forced;
    return;
  }
  const personId = getCurrentPersonId();
  const persisted = personId ? readExamTabUiPersisted(personId) : null;
  const pick =
    persisted?.exam_tab_id && list.some((e) => getExamTabId(e) === persisted.exam_tab_id)
      ? persisted.exam_tab_id
      : null;
  activeTabId.value = pick ?? getExamTabId(list[0]) ?? list[0];
}, { immediate: true });

watch(
  () => [examList.value.length, routeForcedExamTabId()],
  () => {
    const forced = routeForcedExamTabId();
    if (!forced) return;
    const list = examList.value;
    if (list.length === 0) return;
    if (!list.some((e) => getExamTabId(e) === forced)) return;
    if (String(activeTabId.value ?? '') !== forced) {
      activeTabId.value = forced;
    }
  },
  { immediate: true },
);

watch(
  [activeTabId, activeExamSlotIndex],
  () => { persistExamTabUiSelection(); },
  { flush: 'post' }
);

/** 試卷單元列變動時，清除已不存在的單元選取，並重置該槽未完成的草稿請求 */
watch(examUnitSelectDropdownOptions, (tabs) => {
  const state = currentState.value;
  const count = state.quizSlotsCount || 0;
  const validIds = new Set(tabs.map((t) => t.id));
  for (let i = 1; i <= count; i++) {
    const slot = state.slotFormState?.[i];
    if (!slot) continue;
    const uid = String(slot.examUnitSelectId ?? '').trim();
    if (uid && !validIds.has(uid)) {
      slot.examUnitSelectId = '';
      slot.examQuizNamePick = '';
      slot.draftExamQuizId = null;
      const k = examQuizDraftAbortKey(i);
      examQuizDraftAbortBySlotIndex.get(k)?.abort();
      examQuizDraftAbortBySlotIndex.delete(k);
    }
  }
}, { deep: true });

/** 試卷／Exam_Quiz 列上顯示用題名（rag-for-exams、GET /exam/tabs 與 llm-generate 回傳之 quiz_name） */
function examQuizDisplayNameFromRow(quiz) {
  if (!quiz || typeof quiz !== 'object') return '';
  const direct =
    quiz.quiz_name ?? quiz.quizName ?? quiz.QuizName;
  if (direct != null && String(direct).trim() !== '') {
    return String(direct).trim();
  }
  const meta = quiz.quiz_metadata ?? quiz.quizMetadata;
  if (meta != null && typeof meta === 'object') {
    const mn = meta.quiz_name ?? meta.quizName;
    if (mn != null && String(mn).trim() !== '') {
      return String(mn).trim();
    }
  }
  return '';
}

/**
 * latestAnswer 是否含有真實批改資料（quiz_score／quiz_comments／answer_metadata）。
 * 若只有 answer_content（作答但未批改），回傳 false，避免誤設 confirmed 與 gradingResult。
 */
function answerHasGradingEvidence(ans) {
  if (!ans) return false;
  const score = ans.quiz_score;
  if (score != null && String(score).trim() !== '') return true;
  const comments = ans.quiz_comments;
  if (Array.isArray(comments) && comments.some((c) => c != null && String(c).trim() !== '')) return true;
  if (ans.answer_metadata != null && String(ans.answer_metadata).trim() !== '') return true;
  if (ans.answer_feedback_metadata != null && String(ans.answer_feedback_metadata).trim() !== '') return true;
  return false;
}

/** 由 GET /exam/tabs 回傳的 quiz（Exam_Quiz 列 + answers）組成一張題目卡片（欄位後備與 CreateExamQuizBankPage buildCardFromRagQuiz 對齊） */
function buildCardFromExamQuiz(quiz, ragName, fallbackRagId) {
  const answers = Array.isArray(quiz.answers) ? quiz.answers : [];
  const latestAnswer = answers.length > 0 ? answers[answers.length - 1] : null;
  const latestSubmitted =
    latestAnswer?.quiz_answer ??
    latestAnswer?.student_answer ??
    latestAnswer?.answer_text ??
    latestAnswer?.content ??
    (quiz.answer_content != null && String(quiz.answer_content).trim() !== ''
      ? String(quiz.answer_content)
      : null);
  const quiz_answer =
    latestSubmitted != null && String(latestSubmitted).trim() !== ''
      ? String(latestSubmitted)
      : '';
  // 僅在有真實批改資料時設 gradingResult／confirmed；純作答紀錄不算批改
  const hasGrading = answerHasGradingEvidence(latestAnswer);
  const gradingResult = hasGrading
    ? (formatGradingResult(JSON.stringify(latestAnswer)) || '已批改')
    : '';
  const quizId = quiz.exam_quiz_id ?? quiz.quiz_id ?? null;
  const answerId = latestAnswer?.exam_answer_id ?? latestAnswer?.answer_id ?? null;
  const rid = quiz.rag_id ?? quiz.ragId ?? fallbackRagId;
  const ragIdStr = rid != null && String(rid).trim() !== '' ? String(rid) : null;
  const gp = extractAnswerUserPromptFromExamRagRow(quiz).trim();
  const qp = extractQuizUserPromptFromExamRagRow(quiz).trim();
  return {
    id: nextCardId(),
    quiz: quiz.quiz_content ?? quiz.quiz ?? quiz.question ?? '',
    hint: quiz.quiz_hint ?? quiz.hint ?? '',
    referenceAnswer: quiz.quiz_answer_reference ?? quiz.quiz_reference_answer ?? quiz.reference_answer ?? '',
    sourceFilename: quiz.file_name ?? null,
    ragName: (ragName || quiz.unit_name || quiz.rag_name || '').trim() || null,
    rag_id: ragIdStr,
    rag_unit_id:
      quiz.rag_unit_id != null && quiz.rag_unit_id !== ''
        ? Number(quiz.rag_unit_id)
        : null,
    rag_quiz_id:
      quiz.rag_quiz_id != null && quiz.rag_quiz_id !== ''
        ? Number(quiz.rag_quiz_id)
        : null,
    quiz_answer,
    hintVisible: false,
    referenceAnswerVisible: false,
    quiz_rate: normalizeExamQuizRate(quiz.quiz_rate),
    rateError: '',
    confirmed: hasGrading,
    gradingResult,
    gradingResponseJson: latestAnswer ?? null,
    generateQuizResponseJson: null,
    exam_quiz_id: quizId,
    answer_id: answerId,
    gradingPrompt: gp,
    quiz_user_prompt_text: qp,
    quizUserPromptText: qp,
    hasUsedSaveAndGradeOnce: hasGrading,
    gradingPromptBaseline: gp,
    quizAnswerBaseline: hasGrading ? quiz_answer : '',
    examQuizDisplayName: examQuizDisplayNameFromRow(quiz),
    follow_up: examQuizApiRowIsFollowUp(quiz),
    quizGenerateMode: examQuizApiRowIsFollowUp(quiz) ? 'followup' : 'normal',
    follow_up_exam_quiz_id:
      quiz.follow_up_exam_quiz_id != null && quiz.follow_up_exam_quiz_id !== ''
        ? Number(quiz.follow_up_exam_quiz_id)
        : null,
  };
}

/**
 * 若 follow_up_quiz 巢狀節點缺 answers 陣列，從嵌入欄位（answer_content／quiz_score／answer_critique）補回，
 * 讓 buildCardFromExamQuiz 可正常讀取 gradingResult。
 */
function normalizeFollowupQuizAnswers(q) {
  if (!q || typeof q !== 'object') return q;
  if (Array.isArray(q.answers) && q.answers.length > 0) return q;
  const c = q.answer_content;
  const g = q.quiz_score;
  const crit = q.answer_critique;
  const hasEmbedded =
    (c != null && String(c).trim() !== '')
    || (g != null && String(g).trim() !== '')
    || (crit != null && String(crit).trim() !== '');
  if (!hasEmbedded) return q;
  const row = {
    quiz_answer: c ?? '',
    student_answer: c ?? '',
    exam_quiz_id: q.exam_quiz_id,
  };
  if (crit != null && String(crit).trim() !== '') {
    // answer_critique 可能是 JSON 批改字串（API 原始格式）或純文字（本地快照已格式化）；
    // 先透過 formatGradingResult 統一格式化。
    // 注意：不將 quiz_score 設入 row，避免與 formattedCrit（可能已含分數）重複輸出。
    const formattedCrit = formatGradingResult(String(crit));
    row.quiz_comments = [formattedCrit.trim()];
  } else {
    // 無批改文字時，僅保留分數（供 answerHasGradingEvidence 偵測）
    row.quiz_score = g;
  }
  return { ...q, answers: [row] };
}

/** 本分頁所有 Exam_Quiz（含 follow_up_quiz 巢狀鏈）依 exam_quiz_id 索引 */
function buildExamQuizByIdMapForExam(exam) {
  const map = new Map();
  if (!exam || typeof exam !== 'object') return map;
  const quizzes = mergeQuizzesWithTopLevelAnswers(exam);
  for (const root of quizzes) {
    for (const node of examQuizChainFromRoot(root)) {
      const key = examOrRagQuizRowKey(node);
      const id = key != null && key !== '' ? Number(key) : NaN;
      if (Number.isFinite(id) && id >= 1) map.set(Math.trunc(id), node);
    }
  }
  return map;
}

/**
 * 自 exam_quiz_id 沿 follow_up_exam_quiz_id 往前至 0，回傳所有祖先題（舊→新）。
 * @param {number | string} examQuizId
 * @param {Map<number, object>} quizById
 * @returns {object[]}
 */
function examFollowupPredecessorsByExamQuizId(examQuizId, quizById) {
  const tid = Number(examQuizId);
  if (!Number.isFinite(tid) || tid < 1 || !quizById || quizById.size === 0) return [];
  const start = quizById.get(Math.trunc(tid));
  if (!start || typeof start !== 'object') return [];
  const chain = [];
  let parentId = start.follow_up_exam_quiz_id ?? start.followUpExamQuizId;
  while (parentId != null && parentId !== '') {
    const pid = Number(parentId);
    if (!Number.isFinite(pid) || pid < 1) break;
    const parent = quizById.get(Math.trunc(pid));
    if (!parent) break;
    chain.push(parent);
    parentId = parent.follow_up_exam_quiz_id ?? parent.followUpExamQuizId;
  }
  chain.reverse();
  return chain;
}

/** Exam_Quiz 列 → 追問 quiz_history_list 單筆（與 llm-generate-followup body 一致） */
function examQuizRowToFollowupHistoryItem(quiz) {
  const normalized = normalizeFollowupQuizAnswers(quiz);
  const card = buildCardFromExamQuiz(normalized, normalized.unit_name ?? '', null);
  return followupHistoryEntryFromQuizCard(card);
}

/** 合併追問祖先列時的去重鍵（exam_quiz_id 優先，否則題幹） */
function examFollowupRowMergeKey(row) {
  if (!row || typeof row !== 'object') return '';
  const id = Number(row.exam_quiz_id ?? row.quiz_id);
  if (Number.isFinite(id) && id >= 1) return `id:${Math.trunc(id)}`;
  const stem = String(row.quiz_content ?? row.quiz ?? '').trim();
  return stem ? `stem:${stem}` : '';
}

/** 合併 DB 祖先鏈與 slot.followupRounds（舊→新、去重；繼續追問快照在 GET 鏈未就緒時仍可顯示） */
function mergeExamFollowupPredecessorRows(fromDb, localRounds) {
  const byKey = new Map();
  const order = [];
  const add = (row) => {
    const key = examFollowupRowMergeKey(row);
    if (!key) return;
    if (!byKey.has(key)) order.push(key);
    byKey.set(key, row);
  };
  for (const row of fromDb) add(row);
  for (const row of localRounds) add(row);
  return order.map((k) => byKey.get(k));
}

/**
 * 本槽追問歷史原始列：follow_up_exam_quiz_id 祖先鏈 ＋ followupRounds 快照（舊→新）。
 * @param {number} slotIndex 1-based
 * @returns {object[]}
 */
function examFollowupPredecessorRowsForSlot(slotIndex) {
  const card = currentState.value.cardList[slotIndex - 1];
  const exam = currentExamItem.value;
  const slotState = getSlotFormState(slotIndex);
  const localRounds = Array.isArray(slotState?.followupRounds) ? slotState.followupRounds : [];
  let fromDb = [];
  const idNum = Number(card?.exam_quiz_id ?? card?.quiz_id);
  if (Number.isFinite(idNum) && idNum >= 1 && exam) {
    const quizById = buildExamQuizByIdMapForExam(exam);
    fromDb = examFollowupPredecessorsByExamQuizId(idNum, quizById);
  }
  return mergeExamFollowupPredecessorRows(fromDb, localRounds);
}

/**
 * 沿 follow_up_quiz 鏈走到底：
 * API 鏈方向：頂層 quiz 為最舊題目，follow_up_quiz 往較新方向串接（舊→新，exam_quiz_id 遞增）。
 * 例：Q1（最舊，頂層）→ follow_up_quiz → Q2 → Q3 → Q4（最新，鏈尾）
 *
 * 處理：
 * - 鏈尾（最新）= activeQuiz（當前槽位可作答之卡片）
 * - 頂層至鏈尾前一段 = followupRounds（舊→新順序顯示）
 */
function buildFollowupChain(quiz) {
  const chain = [];
  let current = quiz;
  while (current) {
    chain.push(current);
    current = current.follow_up_quiz;
  }
  if (chain.length <= 1) {
    return { rounds: [], activeQuiz: quiz };
  }
  const activeQuiz = chain[chain.length - 1];
  const rounds = chain.slice(0, -1).map((q) => normalizeFollowupQuizAnswers(q));
  return { rounds, activeQuiz };
}

/** 將 POST llm-generate／create-llm-generate(-followup) 回傳之 Exam 合併進 examList（對齊 fetchExamTests 正規化） */
function mergeExamFromApiResponse(exam) {
  if (!exam || typeof exam !== 'object') return;
  const tabId = getExamTabId(exam);
  const label = exam.tab_name ?? exam.exam_name ?? exam.test_name;
  const normalized = {
    ...exam,
    exam_id: exam.exam_id ?? exam.test_id,
    exam_tab_id: exam.exam_tab_id ?? exam.test_tab_id,
    exam_name: label,
    test_id: exam.exam_id ?? exam.test_id,
    test_tab_id: exam.exam_tab_id ?? exam.test_tab_id,
    test_name: label,
  };
  const idx = examList.value.findIndex((e) => getExamTabId(e) === tabId);
  if (idx >= 0) {
    examList.value[idx] = normalized;
    examList.value = [...examList.value];
  } else {
    examList.value = [...examList.value, normalized];
  }
}

/**
 * 解析 LLM 出題 API 回傳：新版 { exams, count } 取當前 tab／槽位之 activeQuiz（follow_up_quiz 鏈尾）；
 * 舊版扁平 Exam_Quiz 物件則原樣回傳 quizRow。
 * @param {unknown} rawData
 * @param {{ examTabId: string, slotIndex: number, examQuizId?: number | null, createAndGenerate?: boolean }} ctx
 */
function parseExamLlmGenerateApiResponse(rawData, ctx) {
  if (!isExamListWrapperResponse(rawData)) {
    return {
      rawResponse: rawData,
      exam: null,
      quizRow: rawData,
      chainInfo: null,
      quizzes: null,
    };
  }
  const exams = normalizeExamListResponse(rawData);
  const examTabId = String(ctx.examTabId ?? '').trim();
  const exam = exams.find((e) => getExamTabId(e) === examTabId) ?? exams[0];
  const quizzes = mergeQuizzesWithTopLevelAnswers(exam);
  const slotIndex = Number(ctx.slotIndex);
  const examQuizId = ctx.examQuizId;
  let rootQuiz = null;
  if (Number.isFinite(slotIndex) && slotIndex >= 1 && quizzes[slotIndex - 1]) {
    rootQuiz = quizzes[slotIndex - 1];
  }
  if (!rootQuiz && examQuizId != null) {
    rootQuiz = findExamQuizRootInList(quizzes, examQuizId);
  }
  if (!rootQuiz && ctx.createAndGenerate && quizzes.length > 0) {
    rootQuiz = quizzes[quizzes.length - 1];
  }
  if (!rootQuiz && quizzes.length > 0) {
    rootQuiz = quizzes[quizzes.length - 1];
  }
  const chainInfo = rootQuiz ? buildFollowupChain(rootQuiz) : null;
  const quizRow = chainInfo?.activeQuiz ?? rootQuiz ?? rawData;
  return { rawResponse: rawData, exam, quizRow, chainInfo, quizzes };
}

/** 將 GET /exam/tabs 題卡上的 unit／題名對到試卷題庫下拉（需已載入 GET /exam/rag-for-exams） */
function hydrateExamSlotFromRagCard(slotState, card) {
  if (!slotState || !card) return;
  const items = examUnitSelectDropdownOptions.value;
  const uidNum = Number(card.rag_unit_id);
  let match =
    Number.isFinite(uidNum) && uidNum >= 1
      ? items.find((it) => it.ragUnitId != null && Number(it.ragUnitId) === uidNum)
      : null;
  if (!match) {
    const ragName = String(card.ragName ?? '').trim();
    match = items.find(
      (it) =>
        String(it.label ?? '').trim() === ragName
        || String(it.unitName ?? '').trim() === ragName
    );
  }
  if (match) slotState.examUnitSelectId = examUnitSelectValue(match);
  if (card.quizGenerateMode === 'followup' || card.quizGenerateMode === 'normal') {
    slotState.quizGenerateMode = card.quizGenerateMode;
  }
  const rqNum = Number(card.rag_quiz_id);
  if (match && Number.isFinite(rqNum) && rqNum >= 1) {
    const quizzes = examQuizzesForUnitTabItem(match);
    const row = quizzes.find((q) => Number(ragQuizSelectValue(q)) === rqNum);
    if (row) {
      slotState.examQuizNamePick = examQuizNameFromPreviewRow(row);
      return;
    }
  }
  const qn = String(card.examQuizDisplayName ?? '').trim();
  if (qn) slotState.examQuizNamePick = qn;
}

/**
 * 從 GET /exam/tabs 單筆 Exam 填入該 tab 的題目卡片（units→quizzes 或扁平 quizzes；見 mergeQuizzesWithTopLevelAnswers）。
 */
function syncExamItemToTabState(exam) {
  if (!exam || typeof exam !== 'object') return;
  const tabId = getExamTabId(exam);
  if (!tabId) return;
  const state = getTabState(tabId);
  const quizzesWithAnswers = mergeQuizzesWithTopLevelAnswers(exam);
  const units = generateQuizUnits.value;
  const rag = forExamRag.value;
  const out0 = rag?.outputs?.[0];
  const meta0 = rag?.rag_metadata?.outputs?.[0];
  const firstQuiz = quizzesWithAnswers[0];
  const firstRagName = (
    units[0]?.rag_name
    ?? out0?.rag_name ?? out0?.unit_name
    ?? meta0?.rag_name ?? meta0?.unit_name
    ?? firstQuiz?.unit_name ?? firstQuiz?.rag_name
    ?? ''
  ).trim();
  if (quizzesWithAnswers.length > 0) {
    state.showQuizGeneratorBlock = true;
    state.quizSlotsCount = quizzesWithAnswers.length;
    const fallbackRid = rag?.rag_id ?? rag?.id;
    // 展開每題的 follow_up_quiz 鏈：取歷史輪次 + 當前活躍題目
    const chainInfos = quizzesWithAnswers.map((q) => (
      q.follow_up_quiz
        ? buildFollowupChain(q)
        : { rounds: [], activeQuiz: q }
    ));
    state.cardList = chainInfos.map(({ activeQuiz }, idx) => {
      const rn = quizzesWithAnswers[idx].unit_name ?? quizzesWithAnswers[idx].rag_name ?? firstRagName;
      return buildCardFromExamQuiz(activeQuiz, activeQuiz.unit_name ?? rn, fallbackRid);
    });
    for (let i = 1; i <= state.quizSlotsCount; i++) {
      const card = state.cardList[i - 1];
      if (!card) continue;
      if (!state.slotFormState[i]) state.slotFormState[i] = reactive(getDefaultExamSlotForm());
      hydrateExamSlotFromRagCard(state.slotFormState[i], card);
      const { rounds } = chainInfos[i - 1];
      if (rounds.length > 0) {
        state.slotFormState[i].followupRounds = rounds;
        // 鏈中有歷史輪次時強制 followup 模式，即使 activeQuiz.follow_up 不為 true
        state.slotFormState[i].quizGenerateMode = 'followup';
      }
    }
    syncAllExamSlotQuizHistoryLists();
  } else {
    state.quizSlotsCount = 0;
    state.cardList = [];
  }
  state._synced = true;
  applyPersistedExamSlotIfActive(tabId);
}

/** 僅在首次切換到該測驗分頁時自 GET /exam/tabs 灌入卡片；已同步過的 tab 不再覆寫，保留使用者輸入 */
watch(
  activeTabId,
  (id) => {
    if (id == null || id === '') return;
    const idStr = String(id);
    const state = getTabState(idStr);
    if (state._synced) return;
    const exam = examList.value.find((e) => getExamTabId(e) === idStr);
    if (exam) syncExamItemToTabState(exam);
  },
  { immediate: true }
);

// ─── 使用者身分與 API 資料載入 ────────────────────────────────────────────────

/** 取得當前使用者的 person_id（與 RAG 頁一致；後端若只回傳 user_id 則用 user_id 當 person_id） */
function getCurrentPersonId() {
  const u = authStore.user;
  if (!u) return null;
  const pid = u.person_id;
  if (pid != null && String(pid).trim() !== '') return String(pid).trim();
  const uid = u.user_id ?? u.id;
  if (uid != null && String(uid).trim() !== '') return String(uid).trim();
  return null;
}

/** 載入測驗列表：GET /exam/tabs；query person_id、course_id（loggedFetch 自 authStore 帶入）、local */
async function fetchExamTests() {
  examListLoading.value = true;
  examListError.value = '';
  try {
    const personId = getCurrentPersonId();
    if (!personId) {
      examList.value = [];
      examListError.value = '請先登入以載入測驗列表';
      return;
    }
    if (authStore.currentCourse?.course_id == null) {
      examList.value = [];
      return;
    }
    const params = new URLSearchParams();
    params.set('person_id', personId);
    params.set('local', String(isFrontendLocalHost()));
    const url = `${API_BASE}${API_EXAM_TESTS}?${params}`;
    const headers = {};
    headers['X-Person-Id'] = personId;
    const res = await loggedFetch(url, { method: 'GET', headers });
    if (!res.ok) {
      const text = await res.text();
      let msg = res.statusText;
      try {
        const err = JSON.parse(text);
        msg = err.detail ?? err.error ?? msg;
      } catch (_) {
        if (text) msg = text;
      }
      if (isNotFoundLike(res.status, msg)) {
        examList.value = [];
        examListError.value = '';
        return;
      }
      throw new Error(msg);
    }
    const data = await res.json();
    const list = normalizeExamListResponse(data);
    // 保留完整欄位與 quizzes、answers（供 watch(currentExamItem) 預填題目卡片）
    examList.value = list.map((row) => {
      const label = row.tab_name ?? row.exam_name ?? row.test_name;
      return {
        ...row,
        exam_id: row.exam_id ?? row.test_id,
        exam_tab_id: row.exam_tab_id ?? row.test_tab_id,
        exam_name: label,
        test_id: row.exam_id ?? row.test_id,
        test_tab_id: row.exam_tab_id ?? row.test_tab_id,
        test_name: label,
      };
    });
  } catch (err) {
    examListError.value = err.message || '無法載入測驗列表';
    examList.value = [];
  } finally {
    examListLoading.value = false;
  }
}

/** 試卷題庫：GET /exam/rag-for-exams；query person_id、course_id（loggedFetch 自 authStore 帶入）、local */
async function fetchExamRagSource() {
  forExamLoading.value = true;
  forExamError.value = '';
  try {
    const personId = getCurrentPersonId();
    if (!personId) {
      forExamRag.value = null;
      return;
    }
    if (authStore.currentCourse?.course_id == null) {
      forExamRag.value = null;
      return;
    }
    const params = new URLSearchParams();
    params.set('local', String(isFrontendLocalHost()));
    const res = await loggedFetch(`${API_BASE}${API_RAG_FOR_EXAMS}?${params.toString()}`, { method: 'GET' });
    const text = await res.text();
    if (!res.ok) {
      let msg = res.statusText;
      try {
        const err = JSON.parse(text);
        msg = err.detail ?? err.error ?? msg;
      } catch (_) {
        if (text) msg = text;
      }
      if (isNotFoundLike(res.status, msg)) {
        forExamRag.value = null;
        forExamError.value = '';
        return;
      }
      throw new Error(msg);
    }
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      throw new Error('無法解析試卷題庫回應');
    }
    forExamRag.value = normalizeExamRagForExamsPayload(data);
  } catch (err) {
    forExamError.value = err.message || '無法載入試卷題庫，請稍後再試或聯絡管理員';
    forExamRag.value = null;
  } finally {
    forExamLoading.value = false;
  }
}


/** 測驗 tab 顯示名稱：優先 tab_name，其次 exam_name／test_name／exam_tab_id */
function getExamTabLabel(exam) {
  if (exam == null) return '測驗';
  if (typeof exam === 'string') return exam;
  const tabId = exam.exam_tab_id ?? exam.test_tab_id ?? exam.id ?? '';
  const raw = exam.tab_name ?? exam.exam_name ?? exam.test_name;
  const name = raw != null && String(raw).trim() !== '' ? String(raw).trim() : '';
  const fromTabId = deriveRagNameFromTabId(tabId);
  const created = exam.created_at ?? '';
  return name || fromTabId || tabId || created || '測驗';
}

/** 取得測驗的 tab id（exam_tab_id 或 test_tab_id） */
function getExamTabId(exam) {
  if (exam == null || typeof exam !== 'object') return '';
  return String(exam.exam_tab_id ?? exam.test_tab_id ?? exam.id ?? '');
}

function getExamTabNameForEdit(exam) {
  if (!exam || typeof exam !== 'object') return '';
  const t = exam.tab_name ?? exam.exam_name ?? exam.test_name;
  if (t != null && String(t).trim() !== '') return String(t).trim();
  return '';
}

function openExamRenameModal(examTabId) {
  const exam = examList.value.find((e) => getExamTabId(e) === String(examTabId));
  const eid = exam?.exam_id ?? exam?.test_id;
  examRenameDraftExamId.value =
    eid != null && String(eid).trim() !== '' ? Number(eid) : null;
  examRenameInitialName.value = getExamTabNameForEdit(exam);
  examRenameError.value = '';
  examRenameModalOpen.value = true;
}

async function onExamRenameSave(name) {
  if (!name) {
    examRenameError.value = '請輸入名稱';
    return;
  }
  const eid = examRenameDraftExamId.value;
  if (eid == null || !Number.isFinite(eid) || eid < 1) {
    examRenameError.value = '找不到此測驗，請重新整理頁面後再試';
    return;
  }
  examRenameSaving.value = true;
  examRenameError.value = '';
  try {
    await apiUpdateExamTabName(eid, name);
    await fetchExamTests();
    examRenameModalOpen.value = false;
  } catch (err) {
    examRenameError.value = err.message || '更新失敗';
  } finally {
    examRenameSaving.value = false;
  }
}

/** 按「＋」新增試卷分頁：POST /exam/tab/create，query 需帶 person_id；body 含 exam_tab_id、tab_name、person_id、local（依 OpenAPI 順序） */
async function addNewTab() {
  const personId = getCurrentPersonId();
  if (!personId) {
    createExamError.value = '請先登入以建立測驗';
    return;
  }
  createExamError.value = '';
  createExamLoading.value = true;
  const examTabId = generateTabId(personId);
  const tabName = '未命名試卷';
  const local = isFrontendLocalHost();
  const params = new URLSearchParams({ person_id: personId });
  try {
    const res = await loggedFetch(`${API_BASE}${API_CREATE_EXAM}?${params.toString()}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        exam_tab_id: examTabId,
        person_id: personId,
        tab_name: tabName,
        local,
      }),
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      const msg = errBody.detail ? JSON.stringify(errBody.detail) : res.statusText;
      throw new Error(msg);
    }
    const data = await res.json();
    const tabIdVal = data?.exam_tab_id != null ? String(data.exam_tab_id) : (data?.test_tab_id != null ? String(data.test_tab_id) : examTabId);
    const resolvedName = data.tab_name ?? data.exam_name ?? data.test_name ?? tabName;
    const item = {
      exam_id: data.exam_id ?? data.test_id,
      exam_tab_id: tabIdVal,
      tab_name: resolvedName,
      exam_name: resolvedName,
      test_id: data.exam_id ?? data.test_id,
      test_tab_id: tabIdVal,
      test_name: resolvedName,
      person_id: data.person_id,
      local: data.local ?? local,
      created_at: data.created_at,
    };
    examList.value = [...examList.value, item];
    activeTabId.value = tabIdVal;
    await fetchExamRagSource();
  } catch (err) {
    createExamError.value = err.message || '建立測驗失敗';
  } finally {
    createExamLoading.value = false;
  }
}

/** 刪除測驗：PUT /exam/tab/delete/{exam_tab_id}（不需 X-Person-Id），成功後從列表移除並切到其他 tab */
const deleteExamLoading = ref(false);
/** 正在送出批改的題卡 id（全螢幕 LoadingOverlay「批改中...」；結果區待回傳） */
const gradingSubmittingCardId = ref(null);
/** 「新增題目」Modal「產生題目」流程中 */
const examAddQuestionSubmitting = ref(false);
const examAddQuestionModalOpen = ref(false);
const examAddQuestionModalError = ref('');
const examAddQuestionModalLoading = ref(false);

function examAddQuestionModalQuizOptions(unitSelectId) {
  const unitItem = findExamUnitDropdownItemBySelectId(unitSelectId);
  return examQuizDropdownItems(unitItem);
}

async function openExamAddQuestionModal() {
  if (examAddQuestionSubmitting.value || examAddQuestionModalLoading.value) return;
  if (!String(activeTabId.value ?? '').trim()) return;
  examAddQuestionModalError.value = '';
  examAddQuestionModalLoading.value = true;
  try {
    if (!forExamRag.value) {
      await fetchExamRagSource();
    }
    if (!forExamRag.value) {
      examAddQuestionModalError.value = forExamError.value || '無法載入試卷題庫';
    } else if (examUnitSelectDropdownOptions.value.length === 0) {
      examAddQuestionModalError.value = '尚無可選單元';
    }
  } finally {
    examAddQuestionModalLoading.value = false;
  }
  examAddQuestionModalOpen.value = true;
}

async function onExamAddQuestionModalConfirm(picks) {
  examAddQuestionModalError.value = '';
  examAddQuestionSubmitting.value = true;
  try {
    const result = await openNextQuizSlot(picks);
    if (result.ok) {
      examAddQuestionModalOpen.value = false;
    } else {
      examAddQuestionModalError.value = result.error || '產生題目失敗';
    }
  } finally {
    examAddQuestionSubmitting.value = false;
  }
}

function examCardGradeSubmitting(card) {
  if (!card) return false;
  return (
    gradingSubmittingCardId.value != null &&
    String(gradingSubmittingCardId.value) === String(card.id)
  );
}

/** 該槽題卡題幹文字（trim） */
function examSlotQuizBodyTrim(slotIndex) {
  const c = currentState.value.cardList[slotIndex - 1];
  return c ? String(c.quiz ?? '').trim() : '';
}

/** 已出題並鎖定下拉時：僅顯示之單元名稱 */
function examSlotLockedStaticUnitLabel(slotIndex) {
  const slotState = getSlotFormState(slotIndex);
  const uid = String(slotState.examUnitSelectId ?? '').trim();
  if (uid) {
    const item = findExamUnitDropdownItemBySelectId(uid);
    const lab = item && String(item.label ?? '').trim();
    if (lab) return lab;
  }
  const card = currentState.value.cardList[slotIndex - 1];
  if (card && typeof card === 'object') {
    const rn = String(card.ragName ?? '').trim();
    if (rn) return rn;
  }
  return '—';
}

/** 已出題並鎖定下拉時：題型顯示 {quiz_name} (一般出題/追問出題) */
function examSlotLockedStaticQuizTypeLabel(slotIndex) {
  const card = currentState.value.cardList[slotIndex - 1];
  if (card && typeof card === 'object') {
    const dn = String(card.examQuizDisplayName ?? '').trim();
    if (dn) {
      return examQuizTypeDisplayLabelFromParts(dn, examQuizFollowUpForCard(slotIndex, card));
    }
    const gj = card.generateQuizResponseJson;
    if (gj && typeof gj === 'object') {
      const fromGen = examQuizDisplayNameFromRow(gj);
      if (fromGen) return examQuizTypeDisplayLabel(gj);
    }
    const ragRow = examRagQuizRowForCard(slotIndex, card);
    if (ragRow) return examQuizTypeDisplayLabel(ragRow);
  }
  const slotState = getSlotFormState(slotIndex);
  const pick = String(slotState.examQuizNamePick ?? '').trim();
  if (pick) {
    const uid = String(slotState.examUnitSelectId ?? '').trim();
    const unitItem = findExamUnitDropdownItemBySelectId(uid);
    const row = findExamRagQuizRowBySelectedPick(unitItem, pick);
    if (row) return examQuizTypeDisplayLabel(row);
    const opt = examQuizDropdownItems(unitItem).find((o) => examQuizPickSelectValue(o) === pick);
    if (opt) return examQuizTypeDisplayLabelForDropdownOption(opt);
    return examQuizTypeDisplayLabelFromParts(pick, false);
  }
  return '—';
}

/** 先前出題 Modal：目前槽位單元名稱（下拉或已鎖定題列） */
function examSlotUnitLabelForHistoryModal(slotIndex) {
  if (examSlotRagChoicesLocked(slotIndex)) {
    return examSlotLockedStaticUnitLabel(slotIndex);
  }
  const uid = String(getSlotFormState(slotIndex).examUnitSelectId ?? '').trim();
  if (uid) {
    const item = findExamUnitDropdownItemBySelectId(uid);
    const lab = item && String(item.label ?? '').trim();
    if (lab) return lab;
  }
  return '—';
}

/** 先前出題 Modal：目前槽位題型名稱 */
function examSlotQuizTypeLabelForHistoryModal(slotIndex) {
  if (examSlotRagChoicesLocked(slotIndex)) {
    return examSlotLockedStaticQuizTypeLabel(slotIndex);
  }
  const slotState = getSlotFormState(slotIndex);
  const pick = String(slotState.examQuizNamePick ?? '').trim();
  if (!pick) return '—';
  const uid = String(slotState.examUnitSelectId ?? '').trim();
  const unitItem = findExamUnitDropdownItemBySelectId(uid);
  const row = findExamRagQuizRowBySelectedPick(unitItem, pick);
  if (row) return examQuizTypeDisplayLabel(row);
  const opt = examQuizDropdownItems(unitItem).find((o) => examQuizPickSelectValue(o) === pick);
  if (opt) return examQuizTypeDisplayLabelForDropdownOption(opt);
  return examQuizTypeDisplayLabelFromParts(pick, false);
}

/**
 * 由槽位表單解析 POST llm-generate 所需 rag_tab_id、rag_unit_id、rag_quiz_id（皆須有效才合法出題）
 * @returns {{ ragTabId: string, ragUnitId: number, ragQuizId: number, resolvedQuizName: string, unitItemForLlm: object | null, ragRowForLlm: object | null }}
 */
function examLlmRagIdsForSlot(slotIndex, prevExamQuizDisplayName = '') {
  const slotState = getSlotFormState(slotIndex);
  const resolvedQuizName =
    String(slotState.examQuizNamePick ?? '').trim()
    || String(prevExamQuizDisplayName ?? '').trim();
  const uidSel = String(slotState.examUnitSelectId ?? '').trim();
  const unitItemForLlm = findExamUnitDropdownItemBySelectId(uidSel);
  const ragRowForLlm = findExamRagQuizRowBySelectedPick(unitItemForLlm, resolvedQuizName);
  const ragTabId = String(unitItemForLlm?.ragTabId ?? '').trim();
  const ragUnitId =
    unitItemForLlm?.ragUnitId != null && Number.isFinite(Number(unitItemForLlm.ragUnitId)) && Number(unitItemForLlm.ragUnitId) >= 1
      ? Number(unitItemForLlm.ragUnitId)
      : 0;
  let ragQuizId = 0;
  if (ragRowForLlm) {
    const idStr = ragQuizSelectValue(ragRowForLlm);
    const n = Number(idStr);
    if (Number.isFinite(n) && n >= 1) ragQuizId = Math.trunc(n);
  }
  return {
    ragTabId,
    ragUnitId,
    ragQuizId,
    resolvedQuizName,
    unitItemForLlm,
    ragRowForLlm,
  };
}

/**
 * 本分頁、相同 rag_unit_id＋rag_quiz_id、且槽位序號小於 beforeSlotIndex 的已出題幹（去重）。
 * @param {number} ragUnitId
 * @param {number} ragQuizId
 * @param {number} [beforeSlotIndex] 1-based；僅含此槽位之前的題目
 * @returns {string[]}
 */
function examQuizHistoryListForLlm(ragUnitId, ragQuizId, beforeSlotIndex = Infinity) {
  if (ragUnitId < 1 || ragQuizId < 1) return [];
  const cards = currentState.value.cardList;
  if (!Array.isArray(cards)) return [];
  const maxSlot = Number.isFinite(beforeSlotIndex) && beforeSlotIndex >= 1
    ? Math.trunc(beforeSlotIndex)
    : Infinity;
  const seen = new Set();
  const out = [];
  for (let i = 0; i < cards.length; i++) {
    const slotNum = i + 1;
    if (slotNum >= maxSlot) continue;
    const card = cards[i];
    if (!card || typeof card !== 'object') continue;
    const ru = card.rag_unit_id != null ? Number(card.rag_unit_id) : NaN;
    const rq = card.rag_quiz_id != null ? Number(card.rag_quiz_id) : NaN;
    if (!Number.isFinite(ru) || ru !== ragUnitId || !Number.isFinite(rq) || rq !== ragQuizId) {
      continue;
    }
    const stem = String(card.quiz ?? '').trim();
    if (!stem || seen.has(stem)) continue;
    seen.add(stem);
    out.push(stem);
  }
  return out;
}

/** 供 QuizCard 預覽與同步：本分頁同單元／題型、此槽位先前出題幹（與 llm-generate 之 quiz_history_list 同源） */
function examQuizHistoryListForSlot(slotIndex) {
  const card = currentState.value.cardList[slotIndex - 1];
  const prevName = String(card?.examQuizDisplayName ?? '').trim();
  const { ragUnitId, ragQuizId } = examLlmRagIdsForSlot(slotIndex, prevName);
  return examQuizHistoryListForLlm(ragUnitId, ragQuizId, slotIndex);
}

function examRichQuizHistoryDedupKey(entry) {
  return [
    entry.quiz_content,
    entry.answer_content,
    entry.quiz_answer_reference,
    entry.answer_critique,
  ].join('\0');
}

/** 先前出題單筆：題目／答案／參考答案／批改結果（相容舊版僅題幹字串） */
function parseExamRichQuizHistoryListFromSource(source) {
  let list = source;
  if (source && typeof source === 'object' && !Array.isArray(source)) {
    list =
      source.quiz_followup_history_list
      ?? source.quizFollowupHistoryList
      ?? source.quiz_history_list
      ?? source.quizHistoryList;
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
    if (typeof item === 'string') {
      const s = item.trim();
      if (!s || seen.has(s)) continue;
      seen.add(s);
      out.push({
        quiz_content: s,
        answer_content: '',
        quiz_answer_reference: '',
        answer_critique: '',
      });
      continue;
    }
    const normalized = normalizeFollowupHistoryItem(item);
    if (!normalized) continue;
    const key = examRichQuizHistoryDedupKey(normalized);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(normalized);
  }
  return out;
}

/** 將舊題問答併入歷史（同槽重新產題前；含題目／答案／參考答案／批改結果） */
function appendExamRichQuizHistory(existingHistory, entrySource) {
  const entry = examHistoryEntryFromRow(entrySource);
  const base = parseExamRichQuizHistoryListFromSource(existingHistory);
  if (!entry?.quiz_content) return base;
  const key = examRichQuizHistoryDedupKey(entry);
  if (base.some((item) => examRichQuizHistoryDedupKey(item) === key)) return base;
  return [...base, entry];
}

/**
 * 先前出題 tab：同一試卷分頁、相同單元與題型、此槽位之前（含同槽重新產題累積）的完整問答。
 * @param {number} slotIndex 1-based
 */
function examQuizHistoryListForDisplay(slotIndex) {
  const card = currentState.value.cardList[slotIndex - 1];
  const prevName = String(card?.examQuizDisplayName ?? '').trim();
  const { ragUnitId, ragQuizId } = examLlmRagIdsForSlot(slotIndex, prevName);
  const rows = [];

  if (ragUnitId >= 1 && ragQuizId >= 1) {
    const cards = currentState.value.cardList;
    if (Array.isArray(cards)) {
      for (let i = 0; i < slotIndex - 1; i++) {
        const c = cards[i];
        if (!c || typeof c !== 'object') continue;
        const ru = c.rag_unit_id != null ? Number(c.rag_unit_id) : NaN;
        const rq = c.rag_quiz_id != null ? Number(c.rag_quiz_id) : NaN;
        if (!Number.isFinite(ru) || ru !== ragUnitId || !Number.isFinite(rq) || rq !== ragQuizId) {
          continue;
        }
        const priorSlot = i + 1;
        if (resolveExamSlotGenerateMode(priorSlot, c) === 'followup') {
          for (const row of examFollowupPredecessorRowsForSlot(priorSlot)) {
            rows.push(row);
          }
        }
        rows.push(c);
      }
    }
  }

  const slotState = getSlotFormState(slotIndex);
  for (const item of parseExamRichQuizHistoryListFromSource(slotState.quiz_history_rich)) {
    rows.push(item);
  }

  if (examSlotIsFollowupMode(slotIndex)) {
    const currentId = Number(card?.exam_quiz_id ?? card?.quiz_id);
    for (const row of examFollowupPredecessorRowsForSlot(slotIndex)) {
      if (Number.isFinite(currentId) && currentId >= 1) {
        const rid = Number(row.exam_quiz_id ?? row.quiz_id);
        if (Number.isFinite(rid) && Math.trunc(rid) === Math.trunc(currentId)) continue;
      }
      rows.push(row);
    }
  }

  let merged = examQuizFollowupHistoryListFromRows(rows);
  const currentStem = String(card?.quiz ?? '').trim();
  if (currentStem) {
    merged = merged.filter(
      (e) => String(e.quiz_content ?? '').trim() !== currentStem,
    );
  }
  return merged;
}

/** 依槽位目前選取，同步 slot.quiz_history_list（產生題目時直接傳此欄位） */
function syncExamSlotQuizHistoryList(slotIndex) {
  getSlotFormState(slotIndex).quiz_history_list = examQuizHistoryListForSlot(slotIndex);
}

function syncAllExamSlotQuizHistoryLists() {
  const n = Number(currentState.value.quizSlotsCount) || 0;
  for (let i = 1; i <= n; i++) syncExamSlotQuizHistoryList(i);
}

/** 槽位是否為追問出題（使用者切換優先；否則試卷題庫 quizzes[] 之 follow_up 或 Exam_Quiz 列） */
function examSlotFollowUpFromApi(slotIndex, card = null) {
  const c = card ?? currentState.value.cardList[slotIndex - 1];
  const slotState = getSlotFormState(slotIndex);
  const uid = String(slotState.examUnitSelectId ?? '').trim();
  const unitItem = findExamUnitDropdownItemBySelectId(uid);
  const pick =
    String(slotState.examQuizNamePick ?? '').trim()
    || String(c?.examQuizDisplayName ?? '').trim();
  const row = findExamRagQuizRowBySelectedPick(unitItem, pick);
  if (row) return examQuizApiRowIsFollowUp(row);
  return c ? examQuizFollowUpForCard(slotIndex, c) : false;
}

function resolveExamSlotGenerateMode(slotIndex, card = null) {
  const c = card ?? currentState.value.cardList[slotIndex - 1];
  if (c != null && typeof c === 'object') {
    if (c.quizGenerateMode === 'followup') return 'followup';
    if (c.quizGenerateMode === 'normal') return 'normal';
  }
  const slotState = getSlotFormState(slotIndex);
  if (slotState.quizGenerateMode === 'followup') return 'followup';
  if (slotState.quizGenerateMode === 'normal') return 'normal';
  return examSlotFollowUpFromApi(slotIndex, c) ? 'followup' : 'normal';
}

function examSlotIsFollowupMode(slotIndex) {
  return resolveExamSlotGenerateMode(slotIndex) === 'followup';
}

/** 自題卡／API 列／快照物件解析「先前出題」單筆（含參考答案、您的答案、批改結果） */
function examHistoryEntryFromRow(row) {
  if (!row || typeof row !== 'object') return null;
  if (row.quiz != null || row.referenceAnswer != null) {
    return followupHistoryEntryFromQuizCard(row);
  }
  const isRawExamQuizApiRow =
    row.exam_quiz_id != null
    || row.quiz_id != null
    || Array.isArray(row.answers);
  if (isRawExamQuizApiRow) {
    const fromApi = examQuizRowToFollowupHistoryItem(row);
    if (fromApi) return fromApi;
  }
  return normalizeFollowupHistoryItem(row);
}

function examQuizFollowupHistoryListFromRows(rows) {
  const seen = new Set();
  const out = [];
  for (const row of rows) {
    const normalized = examHistoryEntryFromRow(row);
    if (!normalized) continue;
    const key = examRichQuizHistoryDedupKey(normalized);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(normalized);
  }
  return out;
}

/** 追問出題：本槽前一題 follow_up 錨點（當前題卡 follow_up_exam_quiz_id；首題追問則為 exam_quiz_id） */
function examFollowUpExamQuizIdForSlot(slotIndex) {
  const resolveFromRow = (row) => {
    if (!row || typeof row !== 'object') return null;
    const fu = row.follow_up_exam_quiz_id;
    if (fu != null && fu !== '' && Number(fu) >= 1) {
      return Math.trunc(Number(fu));
    }
    const id = Number(row.exam_quiz_id ?? row.quiz_id);
    if (Number.isFinite(id) && id >= 1) return Math.trunc(id);
    return null;
  };
  const card = currentState.value.cardList[slotIndex - 1];
  const fromCard = resolveFromRow(card);
  if (fromCard != null) return fromCard;
  const slotState = getSlotFormState(slotIndex);
  const rounds = Array.isArray(slotState?.followupRounds) ? slotState.followupRounds : [];
  if (rounds.length > 0) {
    return resolveFromRow(rounds[rounds.length - 1]);
  }
  return null;
}

/** 追問 POST llm-generate-followup：含祖先鏈與 followupRounds（繼續追問時含剛批改那一輪；不含「新題」本身） */
function examQuizFollowupHistoryListForLlm(slotIndex) {
  return examQuizFollowupHistoryListFromRows(examFollowupPredecessorRowsForSlot(slotIndex));
}

/** 實際走追問 API：題型為追問且已有同題型先前題目與問答；首題（無先前題）改走一般 llm-generate */
function examSlotUseFollowupLlmGenerate(slotIndex) {
  if (!examSlotIsFollowupMode(slotIndex)) return false;
  const followUpExamQuizId = examFollowUpExamQuizIdForSlot(slotIndex);
  if (followUpExamQuizId == null) return false;
  return examQuizFollowupHistoryListForLlm(slotIndex).length > 0;
}

/** 已產生題幹後鎖定「單元／題型」下拉，避免與後端 Exam_Quiz 綁定不一致 */
function examSlotRagChoicesLocked(slotIndex) {
  return examSlotQuizBodyTrim(slotIndex) !== '';
}

/**
 * 題幹仍空白但後端已有 Exam_Quiz 列：產生題目時 POST llm-generate 送四鍵；列已存 rag_unit_id／rag_quiz_id 時須與請求一致；提示文字勿傳（後端自 Rag_Quiz 讀）。
 */
function examSlotHasAnchoredExamQuizId(slotIndex) {
  const c = currentState.value.cardList[slotIndex - 1];
  if (!c || examSlotQuizBodyTrim(slotIndex) !== '') return false;
  const id = Number(c.exam_quiz_id ?? c.quiz_id);
  return Number.isFinite(id) && id >= 1;
}

const isGradingSubmitting = computed(() => gradingSubmittingCardId.value != null);

/**
 * 當前活躍槽位的追問歷史輪次卡片（統一由原始 API 格式轉換）。
 * followupRounds 儲存 /tabs API 相容格式（quiz_content、answer_content、answer_critique 等），
 * 此處統一透過 normalizeFollowupQuizAnswers + buildCardFromExamQuiz pipeline 轉成顯示用卡片，
 * 確保 API 載入（buildFollowupChain）與本地追問快照（generateQuiz）走同一條路。
 */
const activeExamSlotFollowupRoundCards = computed(() => {
  const slotIdx = activeExamSlotIndex1.value;
  if (!slotIdx) return [];
  const rows = examFollowupPredecessorRowsForSlot(slotIdx);
  if (rows.length === 0) return [];
  const fallbackRid = forExamRag.value?.rag_id ?? forExamRag.value?.id ?? null;
  return rows.map((round, idx) => {
    const normalized = normalizeFollowupQuizAnswers(round);
    const ragName = round.unit_name ?? '';
    const card = buildCardFromExamQuiz(normalized, ragName, fallbackRid);
    return { ...card, _roundId: card.exam_quiz_id ?? round.exam_quiz_id ?? `round-${idx}` };
  });
});

/** 任一題列「產生題目」流程中（含建立空白列與 llm-generate） */
const examGenerateQuizOverlayVisible = computed(() => {
  const state = currentState.value;
  const n = Number(state.quizSlotsCount) || 0;
  for (let i = 1; i <= n; i++) {
    const s = state.slotFormState?.[i];
    if (s?.loading) return true;
  }
  return false;
});

/** 全螢幕 LoadingOverlay：任一 API 請求（列表／試卷題庫／建立／刪除／更名／新增題目／批改／產生題目等） */
const loadingOverlayVisible = computed(
  () =>
    examListLoading.value ||
    forExamLoading.value ||
    createExamLoading.value ||
    deleteExamLoading.value ||
    examRenameSaving.value ||
    examAddQuestionModalLoading.value ||
    examAddQuestionSubmitting.value ||
    isGradingSubmitting.value ||
    examGenerateQuizOverlayVisible.value
);

const loadingOverlayText = computed(() => {
  if (isGradingSubmitting.value) return '批改中...';
  if (examGenerateQuizOverlayVisible.value || examAddQuestionSubmitting.value) {
    const n = Number(currentState.value.quizSlotsCount) || 0;
    for (let i = 1; i <= n; i++) {
      if (!getSlotFormState(i).loading) continue;
      if (examSlotUseFollowupLlmGenerate(i)) return '追問出題中...';
    }
    return generateDbOverlayLabel.value;
  }
  if (deleteExamLoading.value) return '刪除中...';
  if (examRenameSaving.value) return '儲存中...';
  if (createExamLoading.value) return '建立中...';
  if (forExamLoading.value || examAddQuestionModalLoading.value) return '載入試卷題庫中...';
  if (examListLoading.value) return `載入${quizBankNoun.value}中`;
  return '處理中...';
});

/** 預留與題庫頁相同的 subText API（測驗頁無 Pack 串流進度） */
const loadingOverlaySubText = computed(() => '');

// ─── 測驗 CRUD（新增 / 刪除 / 更名） ──────────────────────────────────────────

const deleteExamError = ref('');
async function deleteExam(examTabId) {
  if (!examTabId) return;
  if (!confirm('確定要刪除此測驗嗎？')) return;
  deleteExamError.value = '';
  deleteExamLoading.value = true;
  try {
    const res = await loggedFetch(`${API_BASE}${API_EXAM_DELETE}/${encodeURIComponent(examTabId)}`, {
      method: 'PUT',
    });
    if (!res.ok) {
      const text = await res.text();
      let msg = res.statusText;
      try {
        const err = JSON.parse(text);
        msg = err.detail ?? err.error ?? msg;
      } catch (_) {
        if (text) msg = text;
      }
      throw new Error(msg);
    }
    examList.value = examList.value.filter((t) => getExamTabId(t) !== examTabId);
    const examHome = String(props.routeDetailBase ?? '').trim() || '/exam';
    if (route.path !== examHome) {
      router.push(examHome);
    }
  } catch (err) {
    deleteExamError.value = err.message || '刪除測驗失敗';
  } finally {
    deleteExamLoading.value = false;
  }
}

function getDefaultExamSlotForm() {
  return {
    examUnitSelectId: '',
    /** 對應試卷 quizzes[].quiz_name；用於解析 rag_quiz_id 與顯示（llm-generate body 不帶 quiz_name） */
    examQuizNamePick: '',
    /** 「新增題目」POST /exam/tab/quiz/create 成功後之 exam_quiz_id；產生題目時併入 llm-generate */
    draftExamQuizId: null,
    /** 正在送出 POST /exam/tab/quiz/create（新增題目） */
    draftCreating: false,
    loading: false,
    error: '',
    responseJson: null,
    /** 本分頁、相同單元與題型、此槽位之前已出過的題幹；產生題目時原樣傳入 quiz_history_list */
    quiz_history_list: [],
    /** 同槽重新產題累積之完整問答（供「先前出題」顯示） */
    quiz_history_rich: [],
    /** 出題模式：`normal`＝一般出題；`followup`＝追問出題 */
    quizGenerateMode: 'normal',
    /** 追問出題：已完成批改之舊輪次快照（題目／答案／批改），繼續追問前存入 */
    followupRounds: [],
  };
}

function getSlotFormState(slotIndex) {
  const state = currentState.value;
  if (!state.slotFormState[slotIndex]) {
    state.slotFormState[slotIndex] = reactive(getDefaultExamSlotForm());
  }
  const slot = state.slotFormState[slotIndex];
  if (slot.draftExamQuizId === undefined) slot.draftExamQuizId = null;
  if (slot.draftCreating === undefined) slot.draftCreating = false;
  if (slot.examQuizNamePick === undefined) {
    slot.examQuizNamePick = String(slot.quizNameDraft ?? '').trim();
  }
  if (!Array.isArray(slot.quiz_history_list)) slot.quiz_history_list = [];
  if (!Array.isArray(slot.quiz_history_rich)) slot.quiz_history_rich = [];
  if (!Array.isArray(slot.followupRounds)) slot.followupRounds = [];
  if (slot.quizGenerateMode !== 'followup' && slot.quizGenerateMode !== 'normal') {
    slot.quizGenerateMode = 'normal';
  }
  return slot;
}

const messageModalOpts = { confirmButtonClass: () => d3ConfirmPillMd.value };
messageModal.bindErrorRef(forExamError, '無法載入試卷題庫', messageModalOpts);
messageModal.bindErrorRef(examListError, '無法載入列表', messageModalOpts);
messageModal.bindErrorRef(createExamError, '建立失敗', messageModalOpts);
messageModal.bindErrorRef(deleteExamError, '刪除失敗', messageModalOpts);
messageModal.bindErrorGetter(
  () => getSlotFormState(activeExamSlotIndex1.value).error,
  '出題失敗',
  (val) => { getSlotFormState(activeExamSlotIndex1.value).error = val; },
  messageModalOpts,
);

watch(examUnitSelectDropdownOptions, () => {
  const state = currentState.value;
  const n = Number(state.quizSlotsCount) || 0;
  for (let i = 1; i <= n; i++) {
    const card = state.cardList[i - 1];
    if (card) {
      hydrateExamSlotFromRagCard(getSlotFormState(i), card);
    }
  }
  syncAllExamSlotQuizHistoryLists();
});

watch(
  () => {
    const state = currentState.value;
    const n = Number(state.quizSlotsCount) || 0;
    const parts = [];
    for (let i = 1; i <= n; i++) {
      const s = state.slotFormState[i];
      const c = state.cardList[i - 1];
      parts.push([
        s?.examUnitSelectId ?? '',
        s?.examQuizNamePick ?? '',
        c?.rag_unit_id ?? '',
        c?.rag_quiz_id ?? '',
        c?.quiz ?? '',
      ].join('\0'));
    }
    return `${activeTabId.value ?? ''}\n${parts.join('\n')}`;
  },
  () => {
    syncAllExamSlotQuizHistoryLists();
  },
);

/**
 * @param {{ examUnitSelectId?: string, examQuizNamePick?: string } | undefined} picks
 * @returns {Promise<{ ok: boolean, error: string }>}
 */
async function openNextQuizSlot(picks) {
  suppressRouteExamQuizSelectionDepth += 1;
  try {
    const state = currentState.value;
    state.showQuizGeneratorBlock = true;
    state.quizSlotsCount = (state.quizSlotsCount || 0) + 1;
    const idx = state.quizSlotsCount;
    activeExamSlotIndex.value = idx - 1;
    while (state.cardList.length < idx) {
      state.cardList.push(null);
    }
    const slot = getSlotFormState(idx);
    slot.examQuizNamePick = String(picks?.examQuizNamePick ?? '').trim();
    slot.draftExamQuizId = null;
    slot.error = '';
    slot.examUnitSelectId = String(picks?.examUnitSelectId ?? '').trim();
    slot.quizGenerateMode = 'normal';
    slot.loading = false;
    await nextTick();
    const unitItem = findExamUnitDropdownItemBySelectId(slot.examUnitSelectId);
    const ragRow = findExamRagQuizRowBySelectedPick(unitItem, slot.examQuizNamePick);
    const modalFollowUp = !!(ragRow && examQuizApiRowIsFollowUp(ragRow));
    if (modalFollowUp) slot.quizGenerateMode = 'followup';
    await generateQuiz(idx, {
      createAndGenerate: true,
      fromAddQuestionModal: true,
      modalFollowUp,
    });
    syncAllExamSlotQuizHistoryLists();
    const success = !slot.error && examSlotQuizBodyTrim(idx) !== '';
    const errMsg = slot.error || '';
    if (!success) {
      state.quizSlotsCount = Math.max(0, (state.quizSlotsCount || 0) - 1);
      if (state.cardList.length >= idx) {
        state.cardList.splice(idx - 1, 1);
      }
      if (activeExamSlotIndex.value >= state.quizSlotsCount) {
        activeExamSlotIndex.value = Math.max(0, state.quizSlotsCount - 1);
      }
      return { ok: false, error: errMsg || '產生題目失敗' };
    }
    const newCard = state.cardList[idx - 1];
    selectExamSlotByCard(newCard);
    return { ok: true, error: '' };
  } finally {
    suppressRouteExamQuizSelectionDepth = Math.max(0, suppressRouteExamQuizSelectionDepth - 1);
  }
}

function setCardAtSlot(slotIndex, quizContent, hint, sourceFilename, referenceAnswer, ragName, generateQuizResponseJson, quizId, ragId) {
  const state = currentState.value;
  while (state.cardList.length < slotIndex) {
    state.cardList.push(null);
  }
  const ragIdStr = ragId != null && String(ragId).trim() !== '' ? String(ragId) : null;
  state.cardList[slotIndex - 1] = {
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
    quiz_rate: 0,
    rateError: '',
    confirmed: false,
    gradingResult: '',
    gradingResponseJson: null,
    generateQuizResponseJson: generateQuizResponseJson ?? null,
    exam_quiz_id: quizId ?? null,
    gradingPrompt: '',
    quiz_user_prompt_text: '',
    quizUserPromptText: '',
    examQuizDisplayName: '',
    hasUsedSaveAndGradeOnce: false,
    gradingPromptBaseline: '',
    quizAnswerBaseline: '',
    quizGenerateMode: 'normal',
  };
}

/**
 * 「產生題目」：追問模式（useFollowupGenerate）一律 POST llm-generate-followup（無 exam_quiz_id 時先 create）；
 * 一般模式新題 POST create-llm-generate，既有題列 POST llm-generate（須 exam_quiz_id）。
 * @param {{ createAndGenerate?: boolean, fromAddQuestionModal?: boolean, modalFollowUp?: boolean }} [options]
 */
async function generateQuiz(slotIndex, options = {}) {
  const slotState = getSlotFormState(slotIndex);
  const fromAddQuestionModal = options.fromAddQuestionModal === true;
  const modalFollowUp = fromAddQuestionModal && options.modalFollowUp === true;
  const examTabStr = activeTabId.value != null && activeTabId.value !== '' ? String(activeTabId.value).trim() : '';
  const personId = getCurrentPersonId();
  const existingCard = currentState.value.cardList[slotIndex - 1];
  const prevExamQuizDisplayName = String(existingCard?.examQuizDisplayName ?? '').trim();
  const anchoredId = examSlotHasAnchoredExamQuizId(slotIndex)
    ? Number(existingCard.exam_quiz_id ?? existingCard.quiz_id)
    : null;

  if (!examTabStr) {
    slotState.error = '請先選擇測驗分頁，或按「＋」建立測驗';
    return;
  }
  if (!personId) {
    slotState.error = '請先登入';
    return;
  }

  if (examUnitSelectDropdownOptions.value.length > 0 && !String(slotState.examUnitSelectId ?? '').trim()) {
    slotState.error = '請先選擇單元';
    return;
  }

  const quizPickOpts = examQuizDropdownItemsForSlot(slotIndex);
  if (quizPickOpts.length > 0 && !String(slotState.examQuizNamePick ?? '').trim()) {
    slotState.error = '請選擇題型（quiz_name）';
    return;
  }

  const {
    ragTabId: ragTabIdForLlm,
    ragUnitId: ragUnitIdForLlm,
    ragQuizId: ragQuizIdForLlm,
  } = examLlmRagIdsForSlot(slotIndex, prevExamQuizDisplayName);

  if (!ragTabIdForLlm) {
    slotState.error = '無法取得試卷題庫 rag_tab_id，請確認試卷題庫已載入。';
    return;
  }
  if (ragUnitIdForLlm < 1 || ragQuizIdForLlm < 1) {
    slotState.error = '請選擇試卷題庫單元與題目，以取得有效的 rag_unit_id、rag_quiz_id。';
    return;
  }

  if (anchoredId != null && existingCard) {
    const storedU = existingCard.rag_unit_id != null ? Number(existingCard.rag_unit_id) : NaN;
    const storedQ = existingCard.rag_quiz_id != null ? Number(existingCard.rag_quiz_id) : NaN;
    const hasStored = Number.isFinite(storedU) && storedU >= 1 && Number.isFinite(storedQ) && storedQ >= 1;
    if (hasStored && (storedU !== ragUnitIdForLlm || storedQ !== ragQuizIdForLlm)) {
      slotState.error = '單元／題目選擇與此題列已儲存之 rag_unit_id／rag_quiz_id 不一致，請對齊後再試。';
      return;
    }
  }

  let draftEq = anchoredId;
  if (draftEq == null) {
    const d = Number(slotState.draftExamQuizId);
    if (Number.isFinite(d) && d >= 1) draftEq = d;
  }
  const createAndGenerate =
    options.createAndGenerate === true
    || !(Number.isFinite(draftEq) && draftEq >= 1);

  const followupMode = examSlotIsFollowupMode(slotIndex);
  const useFollowupGenerate = followupMode || modalFollowUp;

  // 追問模式：將當前已批改卡片快照進 followupRounds（/tabs 相容格式），再產生下一題
  if (useFollowupGenerate && !modalFollowUp && existingCard && String(existingCard.gradingResult ?? '').trim()) {
    if (!Array.isArray(slotState.followupRounds)) slotState.followupRounds = [];
    slotState.followupRounds.push({
      exam_quiz_id: existingCard.exam_quiz_id ?? existingCard.quiz_id,
      follow_up_exam_quiz_id: existingCard.follow_up_exam_quiz_id,
      quiz_content: existingCard.quiz ?? '',
      quiz_hint: existingCard.hint ?? '',
      quiz_answer_reference: existingCard.referenceAnswer ?? '',
      answer_content: existingCard.quiz_answer ?? '',
      answer_critique: existingCard.gradingResult ?? '',
      quiz_score: null,
      unit_name: existingCard.ragName ?? '',
      rag_unit_id: existingCard.rag_unit_id,
      rag_quiz_id: existingCard.rag_quiz_id,
    });
  }

  // 一般模式重新產題：快照舊題問答供「先前出題」顯示
  if (!useFollowupGenerate && existingCard && String(existingCard.quiz ?? '').trim()) {
    if (!Array.isArray(slotState.quiz_history_rich)) slotState.quiz_history_rich = [];
    slotState.quiz_history_rich = appendExamRichQuizHistory(
      slotState.quiz_history_rich,
      existingCard,
    );
  }

  // 追問 API 參數：直接從當前題卡或多槽 helper 取得，不依賴 ragUnitId 迴圈
  let followupApiExamQuizId = null;
  let followupApiHistoryList = [];
  if (useFollowupGenerate) {
    if (modalFollowUp) {
      // 新增題目 Modal + 追問題型：follow_up_exam_quiz_id 固定 0
      followupApiExamQuizId = 0;
      followupApiHistoryList = [];
    } else if (!createAndGenerate) {
      // 同槽重新產生追問：follow_up_exam_quiz_id 為前一題錨點
      followupApiExamQuizId = examFollowUpExamQuizIdForSlot(slotIndex);
      followupApiHistoryList = examQuizFollowupHistoryListForLlm(slotIndex);
    } else {
      // create-llm-generate-followup：首題追問為 0；繼續追問須帶前一題 follow_up 錨點
      const prevFollowUpId = examFollowUpExamQuizIdForSlot(slotIndex);
      followupApiExamQuizId = prevFollowUpId != null ? prevFollowUpId : 0;
      followupApiHistoryList = examQuizFollowupHistoryListForLlm(slotIndex);
    }
  }
  // 追問模式一律走 followup API
  slotState.loading = true;
  slotState.error = '';
  slotState.responseJson = null;
  try {
    const promptBundle = examQuizPromptBundleForSlot(slotIndex, prevExamQuizDisplayName);
    const quizHistoryList = Array.isArray(slotState.quiz_history_list)
      ? slotState.quiz_history_list
      : [];

    // 追問模式：新題走 create-llm-generate-followup；重新產生走 llm-generate-followup
    let data;
    if (useFollowupGenerate) {
      if (createAndGenerate || modalFollowUp) {
        data = await apiExamTabQuizCreateLlmGenerateFollowup(
          {
            exam_tab_id: examTabStr,
            rag_tab_id: ragTabIdForLlm,
            rag_unit_id: ragUnitIdForLlm,
            rag_quiz_id: ragQuizIdForLlm,
            follow_up_exam_quiz_id: modalFollowUp ? 0 : followupApiExamQuizId,
            quiz_history_list: followupApiHistoryList,
          },
          personId,
        );
      } else {
        data = await apiExamTabQuizLlmGenerateFollowup(
          {
            exam_quiz_id: draftEq,
            rag_tab_id: ragTabIdForLlm,
            rag_unit_id: ragUnitIdForLlm,
            rag_quiz_id: ragQuizIdForLlm,
            follow_up_exam_quiz_id: followupApiExamQuizId,
            quiz_history_list: followupApiHistoryList,
          },
          personId,
        );
      }
    } else if (createAndGenerate) {
      data = await apiExamTabQuizCreateLlmGenerate(
        {
          exam_tab_id: examTabStr,
          rag_tab_id: ragTabIdForLlm,
          rag_unit_id: ragUnitIdForLlm,
          rag_quiz_id: ragQuizIdForLlm,
          quiz_history_list: quizHistoryList,
        },
        personId,
      );
    } else {
      data = await apiExamTabQuizLlmGenerate(
        {
          exam_quiz_id: draftEq,
          rag_tab_id: ragTabIdForLlm,
          rag_unit_id: ragUnitIdForLlm,
          rag_quiz_id: ragQuizIdForLlm,
          quiz_history_list: quizHistoryList,
        },
        personId,
      );
    }

    const parsed = parseExamLlmGenerateApiResponse(data, {
      examTabId: examTabStr,
      slotIndex,
      examQuizId: draftEq,
      createAndGenerate,
    });
    if (parsed.exam) {
      mergeExamFromApiResponse(parsed.exam);
      const tabState = currentState.value;
      if (Array.isArray(parsed.quizzes) && parsed.quizzes.length > (tabState.quizSlotsCount || 0)) {
        tabState.quizSlotsCount = parsed.quizzes.length;
      }
    }
    if (parsed.chainInfo?.rounds?.length > 0) {
      slotState.followupRounds = parsed.chainInfo.rounds;
      slotState.quizGenerateMode = 'followup';
    }
    slotState.responseJson = parsed.rawResponse;
    data = parsed.quizRow ?? data;
    if (!data || typeof data !== 'object' || isExamListWrapperResponse(data)) {
      throw new Error('產生題目失敗：無法解析回傳的題目資料');
    }
    const quizContent = data[API_RESPONSE_QUIZ_CONTENT] ?? data[API_RESPONSE_QUIZ_LEGACY] ?? data.quiz_content ?? '';
    const hintText = data.quiz_hint ?? data.hint ?? '';
    const unitTab = findExamUnitDropdownItemBySelectId(slotState.examUnitSelectId);
    const targetFilename =
      data.file_name ?? data.unit_filename ?? data.target_filename ?? unitTab?.filename ?? null;
    const referenceAnswerText =
      data.quiz_reference_answer ?? data.quiz_answer_reference ?? data.quiz_answer ?? data.answer ?? '';
    const nameFromUnit = String(unitTab?.label ?? unitTab?.unitName ?? '').trim();
    const nameFromQuiz = String(data.quiz_name ?? '').trim();
    const ragFallback = existingCard?.ragName != null ? String(existingCard.ragName).trim() : '';
    const displayRagName = (
      data.unit_name
      ?? data.rag_name
      ?? nameFromQuiz
      ?? nameFromUnit
      ?? ragFallback
      ?? ''
    ).trim() || nameFromUnit || nameFromQuiz || ragFallback;
    const quizId =
      data.exam_quiz_id != null
        ? Number(data.exam_quiz_id)
        : (data.quiz_id != null ? Number(data.quiz_id) : (createAndGenerate ? null : draftEq));
    const fr = forExamRag.value;
    const cardRagId = data.rag_id ?? data.ragId ?? fr?.rag_id ?? fr?.id;
    setCardAtSlot(
      slotIndex,
      quizContent,
      hintText,
      targetFilename,
      referenceAnswerText,
      displayRagName,
      data,
      quizId,
      cardRagId
    );
    const newCard = currentState.value.cardList[slotIndex - 1];
    if (newCard) {
      newCard.rag_unit_id = ragUnitIdForLlm;
      newCard.rag_quiz_id = ragQuizIdForLlm;
      newCard.quiz_rate = normalizeExamQuizRate(data.quiz_rate);
      const fromApi = examQuizDisplayNameFromRow(data);
      const fromDraft = String(slotState.examQuizNamePick ?? '').trim();
      newCard.examQuizDisplayName = fromApi || fromDraft || prevExamQuizDisplayName || '';
      newCard.follow_up =
        examQuizApiRowIsFollowUp(data)
        || examQuizFollowUpForCard(slotIndex, newCard)
        || useFollowupGenerate;
      const fuFromApi = Number(
        data.follow_up_exam_quiz_id ?? data.followUpExamQuizId ?? NaN,
      );
      if (modalFollowUp) {
        newCard.follow_up_exam_quiz_id = 0;
      } else if (Number.isFinite(fuFromApi) && fuFromApi >= 1) {
        newCard.follow_up_exam_quiz_id = Math.trunc(fuFromApi);
      } else if (useFollowupGenerate) {
        const fuReq = examFollowUpExamQuizIdForSlot(slotIndex);
        if (fuReq != null) newCard.follow_up_exam_quiz_id = fuReq;
      }
      const qpFromResponse = extractQuizUserPromptFromExamRagRow(data).trim();
      newCard.quiz_user_prompt_text = qpFromResponse || promptBundle.quiz_user_prompt_text;
      const apFromResponse = extractAnswerUserPromptFromExamRagRow(data).trim();
      const ap = apFromResponse || promptBundle.answer_user_prompt_text;
      if (ap) {
        newCard.gradingPrompt = ap;
        newCard.hasUsedSaveAndGradeOnce = true;
        newCard.gradingPromptBaseline = ap;
      }
      newCard.quizGenerateMode = useFollowupGenerate ? 'followup' : 'normal';
    }
    slotState.draftExamQuizId = null;
    syncAllExamSlotQuizHistoryLists();
  } catch (err) {
    slotState.error = err.message || '產生題目失敗';
  } finally {
    slotState.loading = false;
  }
}


// ─── 題目卡片輔助（Design 版式） ────────────────────────────────────────────

/**
 * 測驗頁「開始批改」：答案非空且（未批改過，或答案／規則相對上次批改有異動）。
 * gradingPrompt 通常為空（題庫規則由後端讀），故不依賴規則是否 dirty 作為唯一條件。
 */
function canEnableExamDesignGradeMerged(card) {
  if (!card || typeof card !== 'object') return false;
  if (String(card.quiz_answer ?? '').trim() === '') return false;
  if (!card.confirmed) return true;
  const answerDirty = String(card.quiz_answer ?? '') !== String(card.quizAnswerBaseline ?? '');
  const promptDirty = String(card.gradingPrompt ?? '') !== String(card.gradingPromptBaseline ?? '');
  return answerDirty || promptDirty;
}

/** QuizCard 三子區塊共用 bind（版式對齊 exam_design／create-exam-bank） */
function designExamQuizCardBind(slotIndex) {
  const card = currentState.value.cardList[slotIndex - 1];
  return {
    card,
    slotIndex,
    gradeSaveAllowed: canEnableExamDesignGradeMerged(card),
    gradeDbAllowed: canEnableExamDesignGradeMerged(card),
    currentRagId: currentRagIdForQuizCards.value,
    showExamRating: true,
    designUi: true,
    designEmbedded: true,
    createExamBankDesignLayout: true,
    hideSlotIndex: true,
    hideExamRulePills: true,
    gradingPromptInModal: true,
    hintReferenceInModal: true,
    showBankQuizHistoryButton: true,
    quizHistoryInline: true,
    bankQuizHistoryList: examQuizHistoryListForDisplay(slotIndex),
    bankQuizHistoryUnitLabel: examSlotUnitLabelForHistoryModal(slotIndex),
    bankQuizHistoryQuizTypeLabel: examSlotQuizTypeLabelForHistoryModal(slotIndex),
    bankQuizHistoryIsFollowup: examSlotIsFollowupMode(slotIndex),
    gradeSubmitting: examCardGradeSubmitting(card),
    logoGradientBias: work3LogoGradientBias.value,
  };
}

// ─── 題目評分（讚 / 差）與作答評改 ───────────────────────────────────────────

/** 題目讚(1)／差(-1)；再點同一顆送 quiz_rate=0 取消。POST /exam/tab/quiz/rate；畫面立即變化，背景送出成功時可與回傳之 quiz_rate 同步 */
function rateExamQuiz(item, direction) {
  if (!item || typeof item !== 'object') return;
  const examQuizId = item.exam_quiz_id ?? item.quiz_id;
  const idNum = Number(examQuizId);
  if (!Number.isFinite(idNum) || idNum < 1) {
    item.rateError = '無法評分：缺少題目編號（exam_quiz_id）。';
    return;
  }
  const target = direction === 'up' ? 1 : -1;
  const previousRate = normalizeExamQuizRate(item.quiz_rate);
  const nextRate = previousRate === target ? 0 : target;
  item.quiz_rate = nextRate;
  item.rateError = '';
  void (async () => {
    try {
      const res = await loggedFetch(`${API_BASE}${API_EXAM_RATE_QUIZ}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exam_quiz_id: idNum, quiz_rate: nextRate }),
      });
      const text = await res.text();
      if (!res.ok) return;
      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        return;
      }
      if (data.quiz_rate != null) {
        item.quiz_rate = normalizeExamQuizRate(data.quiz_rate);
      }
    } catch {
      /* 樂觀 UI 已更新，不還原、不提示 */
    }
  })();
}

/** 試題用 RAG 的 rag_id（與題卡 card.rag_id 比對；皆有值且不同則不可作答） */
function forExamRagIdForCards() {
  const rag = forExamRag.value;
  const v = rag?.rag_id ?? rag?.id;
  return v != null && String(v).trim() !== '' ? v : null;
}

/** 評分：POST /exam/tab/quiz/llm-grade（exam_quiz_id、quiz_content、quiz_answer）、GET /exam/tab/quiz/grade-result/{job_id} */
async function confirmAnswer(item) {
  if (!item.quiz_answer.trim()) return;
  const curR = forExamRagIdForCards();
  const cardR = item?.rag_id;
  if (
    curR != null &&
    cardR != null &&
    String(curR).trim() !== '' &&
    String(cardR).trim() !== '' &&
    String(curR).trim() !== String(cardR).trim()
  ) {
    return;
  }
  if (!activeTabId.value) {
    item.confirmed = true;
    item.gradingResult = '請先選擇一個測驗分頁，或按「＋」建立測驗。';
    return;
  }
  const exam = currentExamItem.value;
  const examId = exam?.exam_id ?? exam?.test_id;
  if (examId == null) {
    item.confirmed = true;
    item.gradingResult = '無法送出批改，請重新整理頁面或切換測驗後再試。';
    return;
  }
  gradingSubmittingCardId.value = item.id;
  try {
    await submitGrade(
      item,
      { examId, examTabId: String(activeTabId.value) },
      {
        gradingMode: 'exam',
        quizGradeSubmissionPath: API_EXAM_QUIZ_GRADE,
        quizGradeResultPath: API_EXAM_QUIZ_GRADE_RESULT,
      }
    );
    if (item.confirmed) {
      item.gradingPromptBaseline = String(item.gradingPrompt ?? '');
      item.quizAnswerBaseline = String(item.quiz_answer ?? '');
      item.hasUsedSaveAndGradeOnce = true;
    }
  } finally {
    gradingSubmittingCardId.value = null;
  }
}

/** 與使用者管理頁相同：每次「打開」測驗頁（含從快取恢復）拉 GET /exam/tabs、GET /exam/rag-for-exams */
const examPageActivatedOnce = ref(false);

// ─── 生命週期：頁面啟動與初始載入 ────────────────────────────────────────────
onActivated(() => {
  if (!examPageActivatedOnce.value) {
    examPageActivatedOnce.value = true;
    fetchExamRagSource();
    return;
  }
  fetchExamTests();
  fetchExamRagSource();
});
</script>

<template>
  <div
    class="d-flex flex-column h-100 overflow-hidden position-relative"
    :class="[
      designSidePanelOnLeft ? 'my-bgcolor-white' : 'my-bgcolor-gray-4',
      { 'my-design--side-panel-left': designSidePanelOnLeft },
    ]"
  >
    <LoadingOverlay
      :is-visible="loadingOverlayVisible"
      :loading-text="loadingOverlayText"
      :sub-text="loadingOverlaySubText"
    />
    <TabRenameModal
      v-model="examRenameModalOpen"
      :initial-name="examRenameInitialName"
      :saving="examRenameSaving"
      :error="examRenameError"
      title="修改名稱"
      :confirm-button-class="d3ConfirmPillMd"
      @save="onExamRenameSave"
    />
    <ExamAddQuestionModal
      v-model="examAddQuestionModalOpen"
      :submitting="examAddQuestionSubmitting"
      :blocked="examAddQuestionModalLoading"
      :error="examAddQuestionModalError"
      :confirm-button-label="examAddQuestionConfirmLabel"
      :confirm-uses-logo-gradient="designSidePanelOnLeft"
      :unit-options="examUnitSelectDropdownOptions"
      :unit-select-value="examUnitSelectValue"
      :unit-option-label="(u) => String(u.label ?? '').trim() || '—'"
      :quiz-options-for-unit="examAddQuestionModalQuizOptions"
      :quiz-pick-select-value="examQuizPickSelectValue"
      :quiz-option-label="examQuizNameLabelForDropdownOption"
      :quiz-option-follow-up="examQuizDropdownOptionIsFollowUp"
      @confirm="onExamAddQuestionModalConfirm"
    />
    <MessageModal
      v-model="messageModalOpen"
      :title="messageModalTitle"
      :message="messageModalMessage"
      :confirm-button-class="messageModalConfirmClass"
      @update:model-value="(v) => { if (!v) closeMessageModal(); else messageModalOpen = v; }"
    />
    <Teleport to="body">
      <div
        v-if="examUnitDetailModalSlotIndex != null"
        class="modal fade show d-block my-modal-backdrop"
        tabindex="-1"
        role="dialog"
        aria-modal="true"
        aria-labelledby="exam-unit-detail-modal-title"
        @click.self="closeExamUnitDetailModal"
      >
        <div
          class="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable"
          @click.stop
        >
          <div class="modal-content border-0 my-bgcolor-white p-4 d-flex flex-column gap-3">
            <div class="modal-header border-bottom-0 p-0">
              <h5
                id="exam-unit-detail-modal-title"
                class="modal-title my-color-black text-break mb-0"
              >{{ examUnitDetailModalTitle }}</h5>
              <button
                type="button"
                class="btn-close flex-shrink-0"
                aria-label="關閉"
                @click="closeExamUnitDetailModal"
              />
            </div>
            <div
              class="modal-body p-0 min-w-0"
              style="max-height: 70vh; overflow: auto;"
              role="region"
              aria-label="JSON資料"
            >
              <JsonTreeViewer
                :data="examUnitDetailModalJsonData"
                :default-expand-depth="1"
              />
            </div>
            <div class="modal-footer border-top-0 p-0 d-flex justify-content-end w-100">
              <button
                type="button"
                class="btn rounded-pill d-flex justify-content-center align-items-center my-font-md-400 px-4 py-2"
                :class="d3ConfirmPillMd"
                @click="closeExamUnitDetailModal"
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
    <header v-if="!designSidePanelOnLeft" class="flex-shrink-0 my-bgcolor-gray-4 p-4">
      <div class="container-fluid px-0 text-center">
        <p class="my-font-xl-400 my-color-black text-break mb-0">{{ pageTitle }}</p>
      </div>
    </header>
    <div v-if="!designSidePanelOnLeft" class="flex-shrink-0 my-rag-tabs-bar my-bgcolor-gray-4">
      <div class="d-flex justify-content-center align-items-center w-100">
        <template v-if="examListLoading && examList.length === 0">
          <div class="w-100 py-2" aria-busy="true" />
        </template>
        <template v-else-if="examList.length === 0">
          <div class="w-100 py-2" aria-hidden="true" />
        </template>
        <template v-else>
          <ul class="nav nav-tabs w-100">
            <li v-for="exam in examList" :key="'exam-' + getExamTabId(exam)" class="nav-item">
              <div
                role="tab"
                class="nav-link d-flex align-items-center gap-1"
                :class="{ active: activeTabId === getExamTabId(exam) }"
                :aria-current="activeTabId === getExamTabId(exam) ? 'page' : undefined"
              >
                <span
                  class="flex-grow-1 text-start pe-2"
                  style="cursor: pointer"
                  @click="activeTabId = getExamTabId(exam)"
                >
                  {{ getExamTabLabel(exam) }}
                </span>
                <button
                  v-if="activeTabId === getExamTabId(exam)"
                  type="button"
                  class="btn btn-link text-decoration-none my-tab-nav-action-btn my-color-gray-4 pe-2"
                  title="重新命名分頁"
                  :disabled="deleteExamLoading || examRenameSaving"
                  @click.stop="openExamRenameModal(getExamTabId(exam))"
                >
                  <i class="fa-solid fa-pen" aria-hidden="true" />
                </button>
                <button
                  v-if="activeTabId === getExamTabId(exam)"
                  type="button"
                  class="btn btn-link text-decoration-none my-tab-nav-action-btn my-color-gray-4"
                  title="刪除此測驗"
                  :disabled="deleteExamLoading || examRenameSaving"
                  @click.stop="deleteExam(getExamTabId(exam))"
                >
                  <i class="fa-solid fa-xmark" aria-hidden="true" />
                </button>
              </div>
            </li>
            <li class="nav-item d-flex align-items-center ms-2">
              <button
                type="button"
                class="btn rounded-circle d-flex justify-content-center align-items-center my-font-md-400 my-button-transparent-borderless my-btn-circle mb-2"
                title="新增分頁"
                aria-label="新增分頁"
                :aria-busy="createExamLoading"
                :disabled="createExamLoading"
                @click="addNewTab"
              >
                <i class="fa-solid fa-plus" aria-hidden="true" />
              </button>
            </li>
          </ul>
        </template>
      </div>
    </div>

    <div
      class="flex-grow-1 overflow-hidden d-flex flex-column min-h-0"
      :class="designSidePanelOnLeft ? 'my-bgcolor-white' : 'my-bgcolor-gray-4'"
    >
      <div
        v-if="examList.length === 0"
        class="flex-grow-1 d-flex align-items-center justify-content-center px-3 py-5 min-h-0 overflow-auto"
      >
        <button
          v-if="!examListLoading"
          type="button"
          class="btn rounded-pill d-flex justify-content-center align-items-center gap-2 my-btn-lg px-5 py-3"
          :class="[designSidePanelOnLeft ? 'my-font-lg-400' : 'my-font-md-400']"
          :title="`新增${quizBankNoun}`"
          :aria-label="`新增${quizBankNoun}`"
          :disabled="createExamLoading"
          :aria-busy="createExamLoading"
          @click="addNewTab"
        >
          <i class="fa-solid fa-plus" aria-hidden="true" />
          新增{{ quizBankNoun }}
        </button>
      </div>
      <div
        v-else
        class="row g-0 flex-grow-1 min-h-0 h-100 my-design-tab-split-layout"
        :class="{ 'my-design-tab-split-layout--side-left': designSidePanelOnLeft }"
      >
        <div
          class="h-100 min-h-0 overflow-hidden my-design-tab-left-view"
          :class="[
            showSidePanelColumn ? 'col-8 col-xl-8 col-xxl-9' : 'col-12',
            showSidePanelColumn && designSidePanelOnLeft ? 'order-2' : '',
            { 'my-design-tab-left-view--white-canvas': designSidePanelOnLeft },
          ]"
        >
          <div
            class="my-design-tab-left-view-scroll h-100 min-h-0 overflow-auto d-flex flex-column"
            :class="{
              'my-design-tab-left-view-scroll--show-scrollbar': designSidePanelOnLeft,
              'my-design-tab-left-view--white-canvas': designSidePanelOnLeft,
            }"
          >
            <div
              v-if="activeTabId && !(Number(currentState.quizSlotsCount) || 0)"
              class="flex-grow-1 d-flex align-items-center justify-content-center px-3 py-5 min-h-0 w-100"
            >
              <p
                v-if="designSidePanelOnLeft"
                class="my-main-empty-hint mb-0 text-center text-break"
              >
                目前沒有題目，請在左側選單下方新增題目
              </p>
              <button
                v-else
                type="button"
                class="btn rounded-pill d-flex justify-content-center align-items-center gap-2 my-font-md-400 my-btn-lg px-5 py-3"
                title="新增題目"
                aria-label="新增題目"
                :disabled="generateQuizBlocked || examAddQuestionSubmitting || !String(activeTabId ?? '').trim() || !getCurrentPersonId()"
                :aria-busy="examAddQuestionSubmitting"
                @click="openExamAddQuestionModal"
              >
                <i class="fa-solid fa-plus" aria-hidden="true" />
                新增題目
              </button>
            </div>
            <div
              v-else
              class="container-fluid px-3 px-md-4 py-4"
            >
              <div class="row justify-content-center">
                <div
                  :class="
                    showSidePanelColumn
                      ? 'col-12 col-xl-10 col-xxl-8'
                      : 'col-12 col-lg-10 col-xl-8 col-xxl-6'
                  "
                >
                  <section
                    v-if="activeTabId && (Number(currentState.quizSlotsCount) || 0) > 0"
                    class="text-start my-page-block-spacing"
                  >
                    <div class="my-design-pack-unit-blocks w-100 min-w-0">
                      <div
                        :key="activeExamSlotIndex1"
                        class="w-100 min-w-0 text-start flex-shrink-0"
                        role="group"
                        :aria-labelledby="`exam-slot-${activeExamSlotIndex1}-heading-label`"
                      >
                        <div
                          :id="`exam-slot-${activeExamSlotIndex1}-heading-label`"
                          class="my-font-sm-400 my-color-gray-1 mb-2"
                        >
                          題目
                        </div>
                        <div
                          class="d-flex align-items-center gap-2 flex-nowrap w-100 min-w-0 mb-4"
                          role="heading"
                          aria-level="2"
                        >
                          <div class="d-flex align-items-center gap-2 flex-nowrap min-w-0 flex-grow-1 overflow-hidden my-color-black">
                            <span
                              v-if="examSlotUnitType(activeExamSlotIndex1) != null"
                              class="my-pack-unit-type-icon-slot flex-shrink-0"
                              aria-hidden="true"
                            >
                              <PackUnitTypeIcon
                                :unit-type="examSlotUnitType(activeExamSlotIndex1)"
                                decorative
                              />
                            </span>
                            <span
                              class="my-design-pack-unit-main-title my-test-section-heading-title my-font-xl-400 my-color-black text-truncate mb-0"
                            >{{ examSlotUnitLabelForHistoryModal(activeExamSlotIndex1) }}</span>
                          </div>
                          <button
                            v-if="examSlotDetailModalButtonVisible(activeExamSlotIndex1)"
                            type="button"
                            :class="['btn rounded-pill d-inline-flex justify-content-center align-items-center flex-shrink-0 ms-auto my-font-sm-400 my-design-quiz-stem-history-btn px-3 py-1', d3HistoryPill]"
                            aria-label="詳細資訊"
                            @click="openExamUnitDetailModal(activeExamSlotIndex1)"
                          >
                            詳細資訊
                          </button>
                        </div>
                      </div>
                      <section
                        v-if="examSlotShowUnitTranscriptUi(activeExamSlotIndex1)"
                        class="w-100 min-w-0 mb-3"
                        aria-label="單元內容"
                      >
                                <div
                                  class="min-w-0 pb-2 position-relative"
                                  :style="examUnitContentCollapsed ? 'height: 96px; overflow: hidden' : ''"
                                >
                                  <div
                                    v-if="examSlotUnitTranscriptSection(activeExamSlotIndex1).unitType === UNIT_TYPE_TEXT"
                                    class="my-rag-unit-type-text-scroll min-w-0"
                                    role="region"
                                    aria-label="單元逐字稿"
                                  >
                                    <div
                                      v-if="examSlotUnitTranscriptMdHtml(activeExamSlotIndex1)"
                                      class="my-markdown-rendered my-font-md-400 my-color-black text-break"
                                      v-html="examSlotUnitTranscriptMdHtml(activeExamSlotIndex1)"
                                    />
                                    <span
                                      v-else
                                      class="my-font-md-400 my-color-black"
                                    >—</span>
                                  </div>
                                  <div
                                    v-else-if="examSlotUnitTranscriptSection(activeExamSlotIndex1).unitType === UNIT_TYPE_YOUTUBE"
                                    class="w-100 min-w-0"
                                  >
                                    <div
                                      v-if="examSlotYoutubeEmbedUrl(activeExamSlotIndex1)"
                                      class="ratio ratio-16x9 w-100 rounded-2 overflow-hidden my-border-muted"
                                    >
                                      <iframe
                                        class="border-0"
                                        title="YouTube 影片"
                                        :src="examSlotYoutubeEmbedUrl(activeExamSlotIndex1)"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                        referrerpolicy="strict-origin-when-cross-origin"
                                        allowfullscreen
                                      />
                                    </div>
                                    <span
                                      v-else
                                      class="my-font-md-400 my-color-black text-break"
                                    >{{ examSlotUnitTranscriptSection(activeExamSlotIndex1).sourceDisplay }}</span>
                                  </div>
                                  <template
                                    v-for="mp3Props in [examSlotMp3PlayerProps(activeExamSlotIndex1)]"
                                    :key="mp3Props ? `exam-mp3-${activeExamSlotIndex1}-${mp3Props.ragTabId}-${mp3Props.ragUnitId}` : `exam-mp3-empty-${activeExamSlotIndex1}`"
                                  >
                                    <RagTabUnitMp3Player
                                      v-if="mp3Props && examSlotUnitTranscriptSection(activeExamSlotIndex1).unitType === UNIT_TYPE_MP3"
                                      :rag-tab-id="mp3Props.ragTabId"
                                      :rag-unit-id="mp3Props.ragUnitId"
                                    />
                                  </template>
                                  <div
                                    v-if="examUnitContentCollapsed"
                                    :style="{
                                      position: 'absolute',
                                      bottom: 0,
                                      left: 0,
                                      right: 0,
                                      height: '64px',
                                      background: `linear-gradient(to bottom, transparent, ${designSidePanelOnLeft ? 'var(--my-color-white)' : 'var(--my-color-gray-4)'})`,
                                      pointerEvents: 'none',
                                    }"
                                  />
                                </div>
                                <div
                                  v-if="examSlotUnitTranscriptSection(activeExamSlotIndex1)?.unitType !== UNIT_TYPE_MP3"
                                  class="d-flex justify-content-center align-items-center flex-wrap gap-2 w-100 min-w-0 py-2"
                                >
                                  <button
                                    type="button"
                                    class="btn d-inline-flex align-items-center gap-2 flex-shrink-0 my-font-sm-400 my-color-gray-1 my-button-transparent-borderless exam-2-detail-bar__back-btn px-3 pt-3 pb-2"
                                    :title="examUnitContentCollapsed ? '顯示文本' : '隱藏文本'"
                                    :aria-label="examUnitContentCollapsed ? '顯示文本' : '隱藏文本'"
                                    :aria-expanded="!examUnitContentCollapsed"
                                    @click="toggleExamUnitContentCollapsed"
                                  >
                                    <template v-if="examUnitContentCollapsed">
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
                      <hr style="border-top: 1px solid var(--my-color-gray-3); margin: 0 0 1rem; opacity: 1;" />
                      <div class="my-pack-unit-settings-body w-100 min-w-0">
                        <div class="w-100 min-w-0 text-start d-flex flex-column gap-3">
                          <div class="d-flex flex-column align-items-stretch gap-2 w-100 min-w-0">
                            <div
                              class="w-100 min-w-0"
                              :class="designSidePanelOnLeft ? 'd-flex align-items-center flex-wrap gap-2' : 'd-flex flex-column gap-2'"
                              role="heading"
                              aria-level="3"
                            >
                              <span
                                class="my-design-unit-quiz-type-title my-font-lg-400 my-color-black text-truncate mb-0 text-start px-0 py-2 rounded-2"
                                :class="designSidePanelOnLeft ? 'flex-grow-1 min-w-0' : 'w-100'"
                              >{{ examSlotHeadingBreadcrumbQuizTypeName(activeExamSlotIndex1) }}</span>
                              <div
                                v-if="examSlotIsFollowupMode(activeExamSlotIndex1)"
                                class="d-flex flex-wrap align-items-center gap-2 flex-shrink-0"
                                :class="designSidePanelOnLeft ? 'ms-auto' : ''"
                              >
                                <span
                                  class="badge my-bgcolor-surface my-color-black border user-select-none my-font-sm-400 rounded px-2 py-1 flex-shrink-0"
                                >追問</span>
                              </div>
                            </div>
                          </div>
                          <!-- 追問歷史輪次（唯讀，舊→新順序） -->
                          <template v-if="activeExamSlotFollowupRoundCards.length">
                            <template
                              v-for="roundCard in activeExamSlotFollowupRoundCards"
                              :key="roundCard._roundId"
                            >
                              <div class="my-design-quiz-sub-block-outer">
                                <div
                                  class="my-design-quiz-sub-block my-design-quiz-sub-block--stem rounded-4"
                                  :class="[
                                    designSidePanelOnLeft ? 'py-2' : 'p-0 pb-2',
                                    { 'my-design-quiz-sub-block--with-logo': designSidePanelOnLeft },
                                  ]"
                                >
                                  <LogoLayerMark
                                    v-if="designSidePanelOnLeft"
                                    layer="primary"
                                    :size-pt="24"
                                    :id-prefix="`exam-quiz-q-${activeExamSlotIndex1}-${roundCard._roundId}`"
                                    class="my-design-quiz-sub-block__logo pt-2"
                                  />
                                  <div class="my-design-quiz-sub-block__body min-w-0 flex-grow-1">
                                    <div class="w-100 min-w-0 my-design-quiz-stem-sub-block-top d-flex flex-column">
                                      <div class="w-100 min-w-0">
                                        <QuizCard
                                          :card="roundCard"
                                          create-exam-bank-design-layout
                                          design-sub-block="question"
                                          :design-embedded="true"
                                          :design-ui="true"
                                          :hide-slot-index="true"
                                          :hide-exam-rule-pills="true"
                                          :show-exam-rating="false"
                                          :hint-reference-in-modal="true"
                                          :grading-prompt-in-modal="true"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <!-- 子區塊：答案 + 批改（合併） -->
                              <div class="my-design-quiz-sub-block-outer">
                                <div
                                  class="my-design-quiz-sub-block rounded-4"
                                  :class="[
                                    designSidePanelOnLeft ? 'py-2' : 'p-0 pb-2',
                                    designSidePanelOnLeft ? 'my-bgcolor-gray-4' : 'my-bgcolor-white',
                                    { 'my-design-quiz-sub-block--with-logo': designSidePanelOnLeft },
                                  ]"
                                >
                                  <LogoLayerMark
                                    v-if="designSidePanelOnLeft"
                                    layer="secondary"
                                    :size-pt="24"
                                    :id-prefix="`exam-quiz-a-${activeExamSlotIndex1}-${roundCard._roundId}`"
                                    class="my-design-quiz-sub-block__logo pt-2"
                                  />
                                  <div class="my-design-quiz-sub-block__body min-w-0 flex-grow-1">
                                    <div class="w-100 min-w-0">
                                      <QuizCard
                                        :card="roundCard"
                                        create-exam-bank-design-layout
                                        design-sub-block="answer"
                                        :design-embedded="true"
                                        :design-ui="true"
                                        :hide-slot-index="true"
                                        :read-only-answer="true"
                                      />
                                    </div>
                                    <div
                                      v-if="roundCard.gradingResult"
                                      class="w-100 min-w-0"
                                    >
                                      <QuizCard
                                        :card="roundCard"
                                        create-exam-bank-design-layout
                                        design-sub-block="grading"
                                        :design-embedded="true"
                                        :design-ui="true"
                                        :hide-slot-index="true"
                                        :hide-exam-rule-pills="true"
                                        :grading-prompt-in-modal="true"
                                        :hide-grading-prompt="true"
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <hr style="border-top: 1px solid var(--my-color-gray-3); margin: 0 0 1rem; opacity: 1;" />
                            </template>
                          </template>
                          <!-- 子區塊：題目 -->
                          <div class="my-design-quiz-sub-block-outer">
                            <div
                              class="my-design-quiz-sub-block my-design-quiz-sub-block--stem rounded-4"
                              :class="[
                                designSidePanelOnLeft ? 'py-2' : 'p-0 pb-2',
                                { 'my-design-quiz-sub-block--with-logo': designSidePanelOnLeft },
                              ]"
                            >
                              <LogoLayerMark
                                v-if="designSidePanelOnLeft"
                                layer="primary"
                                :size-pt="24"
                                :id-prefix="`exam-quiz-q-${activeExamSlotIndex1}`"
                                class="my-design-quiz-sub-block__logo pt-2"
                              />
                              <div class="my-design-quiz-sub-block__body min-w-0 flex-grow-1">
                                <div class="w-100 min-w-0 my-design-quiz-stem-sub-block-top d-flex flex-column">
                                  <div
                                    v-if="examSlotQuizBodyTrim(activeExamSlotIndex1) !== ''"
                                    class="w-100 min-w-0"
                                  >
                                    <QuizCard
                                      v-bind="designExamQuizCardBind(activeExamSlotIndex1)"
                                      create-exam-bank-design-layout
                                      design-sub-block="question"
                                      @confirm-answer="confirmAnswer"
                                      @rate-quiz="(dir) => rateExamQuiz(currentState.cardList[activeExamSlotGi], dir)"
                                      @update:quiz_answer="(val) => { currentState.cardList[activeExamSlotGi].quiz_answer = val }"
                                      @update:grading_prompt="(val) => { currentState.cardList[activeExamSlotGi].gradingPrompt = val }"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          <!-- 子區塊：答案 + 批改（合併） -->
                          <div
                            v-if="examSlotQuizBodyTrim(activeExamSlotIndex1) !== ''"
                            class="my-design-quiz-sub-block-outer"
                          >
                            <div
                              class="my-design-quiz-sub-block rounded-4"
                              :class="[
                                designSidePanelOnLeft ? 'py-2' : 'p-0 pb-2',
                                designSidePanelOnLeft ? 'my-bgcolor-gray-4' : 'my-bgcolor-white',
                                { 'my-design-quiz-sub-block--with-logo': designSidePanelOnLeft },
                              ]"
                            >
                              <LogoLayerMark
                                v-if="designSidePanelOnLeft"
                                layer="secondary"
                                :size-pt="24"
                                :id-prefix="`exam-quiz-a-${activeExamSlotIndex1}`"
                                class="my-design-quiz-sub-block__logo pt-2"
                              />
                              <div class="my-design-quiz-sub-block__body min-w-0 flex-grow-1">
                                <div class="w-100 min-w-0">
                                  <QuizCard
                                    v-bind="designExamQuizCardBind(activeExamSlotIndex1)"
                                    create-exam-bank-design-layout
                                    design-sub-block="answer"
                                    @confirm-answer="confirmAnswer"
                                    @update:quiz_answer="(val) => { currentState.cardList[activeExamSlotGi].quiz_answer = val }"
                                    @update:grading_prompt="(val) => { currentState.cardList[activeExamSlotGi].gradingPrompt = val }"
                                  />
                                </div>
                                <div class="w-100 min-w-0">
                                  <QuizCard
                                    v-bind="designExamQuizCardBind(activeExamSlotIndex1)"
                                    create-exam-bank-design-layout
                                    design-sub-block="grading"
                                    @confirm-answer="confirmAnswer"
                                    @update:quiz_answer="(val) => { currentState.cardList[activeExamSlotGi].quiz_answer = val }"
                                    @update:grading_prompt="(val) => { currentState.cardList[activeExamSlotGi].gradingPrompt = val }"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                          <!-- 繼續追問：追問出題模式且已有批改結果 -->
                          <div
                            v-if="examSlotIsFollowupMode(activeExamSlotIndex1) && activeExamSlotShowGradingSubBlock"
                            class="d-flex justify-content-center w-100"
                          >
                            <button
                              type="button"
                              class="btn rounded-pill d-inline-flex justify-content-center align-items-center flex-shrink-0 my-font-md-400 my-button-white px-4 py-2"
                              :aria-busy="getSlotFormState(activeExamSlotIndex1).loading || getSlotFormState(activeExamSlotIndex1).draftCreating"
                              aria-label="繼續追問"
                              @click="generateQuiz(activeExamSlotIndex1)"
                            >
                              繼續追問
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div
          v-if="showSidePanelColumn"
          class="col-4 col-xl-4 col-xxl-3 h-100 min-h-0 overflow-hidden my-design-tab-side-panel"
          :class="designSidePanelOnLeft ? 'order-1 border-end my-bgcolor-gray-4' : 'border-start my-bgcolor-gray-4'"
        >
          <aside
            class="h-100 w-100 my-design-tab-right-view d-flex flex-column overflow-hidden"
            aria-label="題目清單"
          >
            <div
              v-if="showSidePanelHeader"
              class="flex-shrink-0 my-design-tab-side-panel-header"
            >
              <slot name="side-panel-header" />
            </div>
            <nav
              v-if="activeTabId"
              class="my-design-right-nav nav nav-pills flex-column flex-nowrap flex-grow-1 justify-content-start align-items-stretch overflow-y-auto overflow-x-hidden min-h-0"
              :class="designSidePanelOnLeft ? 'my-design-right-nav--flat gap-0 my-bgcolor-gray-4' : 'px-3 py-3 gap-3'"
              aria-label="題目清單"
            >
              <div
                class="my-design-right-step-block"
                :class="designSidePanelOnLeft ? 'pb-2 my-design-right-step-block--units' : 'py-2'"
              >
                <div
                  class="my-design-right-step-heading my-font-sm-400 my-color-gray-1"
                  :class="designSidePanelOnLeft ? 'px-3 pt-3 pb-2' : 'px-3 py-2'"
                >題目</div>
                <div
                  class="my-design-right-unit-list w-100 min-w-0"
                  :class="{ 'my-design-right-unit-list--empty': !designRightQuizSubTabItems.length }"
                >
                  <template v-if="designRightQuizSubTabItems.length">
                    <div
                      v-for="item in designRightQuizSubTabItems"
                      :key="item.key"
                      class="nav-item w-100"
                    >
                      <button
                        type="button"
                        class="nav-link w-100 text-start text-break"
                        :class="{ active: item.active }"
                        :aria-current="item.active ? 'page' : undefined"
                        :aria-label="`${item.label}，${item.breadcrumb}${item.followup ? '，追問' : ''}`"
                        @click="onDesignRightQuizClick(item)"
                      >
                        <span class="d-flex flex-column align-items-stretch gap-1 min-w-0 w-100">
                          <span>{{ item.label }}</span>
                          <span
                            class="exam-quiz-nav-breadcrumb my-font-sm-400 my-color-gray-1 d-flex align-items-center gap-1 flex-nowrap min-w-0 overflow-hidden"
                            aria-hidden="true"
                          >
                            <span
                              v-if="item.unitType != null"
                              class="my-pack-unit-type-icon-slot flex-shrink-0"
                              aria-hidden="true"
                            >
                              <PackUnitTypeIcon
                                :unit-type="item.unitType"
                                decorative
                              />
                            </span>
                            <span class="exam-slot-heading-breadcrumb__segment text-truncate">{{ item.unitLabel }}</span>
                            <i
                              class="fa-solid fa-chevron-right exam-slot-heading-breadcrumb__chevron flex-shrink-0"
                              aria-hidden="true"
                            />
                            <span class="d-flex align-items-center gap-1 min-w-0 flex-shrink-1 overflow-hidden">
                              <span class="exam-slot-heading-breadcrumb__segment text-truncate">{{ item.quizTypeLabel }}</span>
                              <span
                                v-if="item.followup"
                                class="badge my-bgcolor-surface my-color-black border user-select-none my-font-sm-400 rounded px-2 py-1 flex-shrink-0"
                              >追問</span>
                            </span>
                          </span>
                        </span>
                      </button>
                    </div>
                  </template>
                  <p
                    v-else
                    class="my-design-right-unit-empty my-font-lg-400 my-color-gray-2 mb-0"
                  >
                    沒有題目
                  </p>
                </div>
              </div>
            </nav>
            <div
              v-if="designSidePanelOnLeft && activeTabId"
              class="my-design-side-nav-delete"
            >
              <div class="d-flex flex-column gap-2 w-100 min-w-0">
                <button
                  type="button"
                  class="btn rounded-pill d-inline-flex justify-content-center align-items-center gap-2 my-font-md-400 my-btn-login-submit px-4 py-2 w-100"
                  title="新增題目"
                  aria-label="新增題目"
                  :disabled="generateQuizBlocked || examAddQuestionSubmitting || !String(activeTabId ?? '').trim() || !getCurrentPersonId()"
                  :aria-busy="examAddQuestionSubmitting"
                  @click="openExamAddQuestionModal"
                >
                  <i class="fa-solid fa-plus" aria-hidden="true" />
                  新增題目
                </button>
                <button
                  type="button"
                  class="btn rounded-pill d-inline-flex justify-content-center align-items-center gap-2 my-font-md-400 my-btn-outline-red-hollow my-design-side-nav-delete__btn px-4 py-2 w-100"
                  title="刪除此試卷"
                  aria-label="刪除此試卷"
                  :disabled="sidePanelDeleteExamDisabled || sidePanelDeleteExamLoading"
                  :aria-busy="sidePanelDeleteExamLoading"
                  @click="emit('delete-exam')"
                >
                  <DeleteButtonLabel label="刪除此試卷" />
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.exam-slot-heading-breadcrumb__chevron {
  font-size: 0.625rem;
  line-height: 1;
  color: inherit;
}

.exam-slot-heading-breadcrumb__segment {
  min-width: 0;
}

/* 子元件若仍帶 px-3 utility，與本頁按鈕一致改為 px-4 水平內距 */
:deep(button.btn.rounded-pill.px-3:not(.my-unit-content-toggle-btn)),
:deep(button.btn.rounded-2.px-3:not(.my-unit-content-toggle-btn)) {
  padding-left: 1.5rem !important;
  padding-right: 1.5rem !important;
}

/* exam_3：小 pill 按鈕 px-2（對齊 create-exam-bank_3）；出題規則（my-design-quiz-history-btn）和顯示／隱藏文本（my-unit-content-toggle-btn）維持 px-3 */
.my-design--side-panel-left :deep(button.btn.rounded-pill.my-font-sm-400:not(.my-design-quiz-stem-history-btn):not(.my-design-quiz-history-btn):not(.my-button-transparent-borderless):not(.my-unit-content-toggle-btn)),
.my-design--side-panel-left :deep(button.btn.rounded-2.my-font-sm-400:not(.my-design-quiz-stem-history-btn):not(.my-design-quiz-history-btn):not(.my-button-transparent-borderless):not(.my-unit-content-toggle-btn)) {
  padding-left: 0.5rem !important;
  padding-right: 0.5rem !important;
}
.my-design--side-panel-left :deep(button.btn.my-design-quiz-stem-history-btn.rounded-pill.my-font-sm-400),
.my-design--side-panel-left :deep(button.btn.my-design-quiz-stem-history-btn.rounded-2.my-font-sm-400),
.my-design--side-panel-left :deep(button.btn.my-design-quiz-history-btn.rounded-pill.my-font-sm-400),
.my-design--side-panel-left :deep(button.btn.my-design-quiz-history-btn.rounded-2.my-font-sm-400),
.my-design--side-panel-left :deep(button.btn.my-unit-content-toggle-btn.rounded-pill.my-font-sm-400) {
  padding-left: 1rem !important;
  padding-right: 1rem !important;
}
.my-design--side-panel-left :deep(button.btn.rounded-pill.my-font-sm-400:not(.my-button-white):not(.my-button-black):not(.my-button-red):not(.my-btn-outline-red-hollow):not(.my-button-green):not(.my-button-blue):not(.my-button-logo-gradient)),
.my-design--side-panel-left :deep(button.btn.rounded-2.my-font-sm-400:not(.my-button-white):not(.my-button-black):not(.my-button-red):not(.my-btn-outline-red-hollow):not(.my-button-green):not(.my-button-blue):not(.my-button-logo-gradient)) {
  color: var(--my-color-gray-1);
}
.my-design--side-panel-left :deep(button.btn.rounded-pill.my-font-sm-400.my-button-transparent-borderless:hover:not(:disabled)),
.my-design--side-panel-left :deep(button.btn.rounded-pill.my-font-sm-400.my-button-transparent-borderless:focus-visible:not(:disabled)),
.my-design--side-panel-left :deep(button.btn.rounded-2.my-font-sm-400.my-button-transparent-borderless:hover:not(:disabled)),
.my-design--side-panel-left :deep(button.btn.rounded-2.my-font-sm-400.my-button-transparent-borderless:focus-visible:not(:disabled)) {
  color: var(--my-color-gray-1);
}
/* 產生題目／開始批改 pill：px-4 py-2（my-font-md-400 中號） */
.my-design-pack-unit-blocks :deep(.my-design-quiz-generate-action-row .btn.my-button-white),
.my-design-pack-unit-blocks :deep(.my-design-quiz-generate-action-row .btn.my-button-logo-gradient),
.my-design-quiz-sub-block :deep(.my-design-quiz-grading-start-row .btn.my-button-white),
.my-design-quiz-sub-block :deep(.my-design-quiz-grading-start-row .btn.my-button-logo-gradient) {
  padding-top: 0.5rem !important;
  padding-bottom: 0.5rem !important;
  padding-left: 1.5rem !important;
  padding-right: 1.5rem !important;
}
/* 左右分欄（對齊 exam_design／create-exam-bank_3） */
.my-design-tab-split-layout {
  min-height: 0;
  flex: 1 1 0;
}
.my-design-tab-split-layout--side-left {
  flex-wrap: nowrap;
}
.my-design-tab-side-panel {
  border-color: var(--my-color-gray-3) !important;
}
.my-design-tab-side-panel-header {
  flex-shrink: 0;
  z-index: 31;
  border-bottom: 1px solid var(--my-color-gray-3);
}
.my-design-tab-left-view,
.my-design-tab-right-view {
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}
.my-design--side-panel-left {
  background-color: var(--my-color-white) !important;
}
.my-design--side-panel-left .my-design-tab-left-view,
.my-design--side-panel-left .my-design-tab-left-view-scroll,
.my-design-tab-left-view--white-canvas {
  background-color: var(--my-color-white) !important;
}
.my-design--side-panel-left .my-design-quiz-sub-block.my-bgcolor-gray-4,
.my-design--side-panel-left .my-design-quiz-sub-block.my-bgcolor-white {
  background-color: var(--my-color-gray-4) !important;
}
.my-design--side-panel-left .my-design-quiz-sub-block.my-design-quiz-sub-block--stem {
  background-color: var(--my-color-white) !important;
  border: 1px solid var(--my-color-gray-3);
}
/* exam_3：題目／答案 tab 列不加 pt-2 */
.my-design--side-panel-left .my-design-quiz-sub-block :deep(.my-design-quiz-stem-tabs-row),
.my-design--side-panel-left .my-design-pack-unit-blocks :deep(.my-design-quiz-stem-tabs-row),
.my-design--side-panel-left .my-design-pack-unit-blocks :deep(.my-design-quiz-field-inset__head > .my-design-quiz-stem-tabs-row.d-flex.gap-2.px-3),
.my-design--side-panel-left .my-design-quiz-sub-block :deep(.my-design-quiz-field-inset__head > .my-design-quiz-stem-tabs-row.d-flex.gap-2.px-3) {
  padding-top: 0 !important;
}
/* exam_3：題目／答案內文（標題列 hr 下方）pt-2 pb-2（對齊 create-exam-bank_3） */
.my-design--side-panel-left .my-design-quiz-sub-block :deep(.my-design-quiz-field-inset-body.px-3.pb-2),
.my-design--side-panel-left .my-design-quiz-sub-block :deep(.my-design-quiz-field-inset-body.px-3.pt-2.pb-2),
.my-design--side-panel-left .my-design-pack-unit-blocks :deep(.my-design-quiz-field-inset-body.px-3.pb-2),
.my-design--side-panel-left .my-design-pack-unit-blocks :deep(.my-design-quiz-field-inset-body.px-3.pt-2.pb-2) {
  padding-top: 0.5rem !important;
}
/* exam_3：出題／批改規則黑底區 hr 下方文字 pt-2 */
.my-design--side-panel-left .my-design-quiz-question-prompt-block__content :deep(.english-exam-md-preview-body),
.my-design--side-panel-left .my-design-quiz-question-prompt-block__content :deep(.english-exam-md-preview-empty),
.my-design--side-panel-left .my-design-quiz-sub-block :deep(.my-design-quiz-question-prompt-block__content .english-exam-md-preview-body),
.my-design--side-panel-left .my-design-quiz-sub-block :deep(.my-design-quiz-question-prompt-block__content .english-exam-md-preview-empty) {
  padding-top: 0.5rem !important;
  padding-bottom: 0.5rem !important;
  padding-left: 1rem !important;
  padding-right: 1rem !important;
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
.my-design-right-step-block {
  display: flex;
  flex-direction: column;
  flex: 0 0 auto;
  width: 100%;
  min-width: 0;
  gap: 0;
  background-color: var(--my-color-gray-4);
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
  border-bottom: 1px solid var(--my-color-gray-3);
}
.my-design-right-nav--flat .my-design-right-step-block .nav-link {
  padding-left: 1rem;
  padding-right: 1rem;
}
.my-design-right-step-heading {
  line-height: 1.35;
  white-space: nowrap;
}
.my-design-pack-unit-blocks {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;
}
.my-pack-unit-settings-body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
  min-width: 0;
}
.my-design-right-nav .nav-link {
  color: var(--my-color-black);
  border: none;
  border-radius: 0;
  background: transparent;
}
.my-design-right-nav button.nav-link {
  cursor: pointer;
}
.my-design-right-nav .nav-link:not(.active):hover,
.my-design-right-nav .nav-link:not(.active):focus-visible {
  background-color: var(--my-color-gray-4);
  color: var(--my-color-black);
}
/* 左欄（gray-4 底）：hover 須用 gray-4 才看得見 */
.my-design-right-nav--flat button.nav-link:not(.active):hover,
.my-design-right-nav--flat button.nav-link:not(.active):focus-visible {
  background-color: var(--my-color-gray-4);
}
.my-design-right-nav .nav-link.active,
.my-design-right-nav .nav-link.active:hover,
.my-design-right-nav .nav-link.active:focus,
.my-design-right-nav .nav-link.active:focus-visible {
  background-color: var(--my-color-white);
  color: var(--my-color-black);
}
.my-design-pack-unit-main-title {
  line-height: 1.35;
  white-space: nowrap;
}
.my-design-quiz-sub-block-outer {
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  min-width: 0;
}
/* exam_3：Q／A 標誌在區塊內左側同一欄（對齊 create-exam-bank_3） */
.my-design-quiz-sub-block--with-logo {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 0;
  padding-left: 1rem;
  box-sizing: border-box;
}
.my-design-quiz-sub-block__logo {
  flex: 0 0 24pt;
  width: 24pt;
  min-width: 24pt;
  max-width: 24pt;
  align-self: flex-start;
  box-sizing: content-box;
}
.my-design-quiz-sub-block__body {
  box-sizing: border-box;
  min-width: 0;
  flex: 1 1 0;
}
.my-design-quiz-sub-block {
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  min-width: 0;
}
.my-design-quiz-sub-block--stem {
  background-color: var(--my-color-white);
  border: 1px solid var(--my-color-gray-3);
}
.my-design-quiz-field-inset,
.my-design-quiz-sub-block :deep(.my-design-quiz-field-inset) {
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  border: 1px solid var(--my-color-gray-3);
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
.my-design-pack-unit-blocks .my-font-sm-400.my-color-gray-1.mb-2,
.my-design-pack-unit-section > .my-font-sm-400.my-color-gray-1.mb-2 {
  white-space: nowrap;
}
.my-design-quiz-question-prompt-block__title-row,
.my-design-pack-unit-blocks :deep(.my-design-quiz-question-prompt-block__title-row),
.my-design-pack-unit-blocks :deep(.my-design-quiz-field-inset__head > .d-flex.gap-2.px-3:not(.my-design-quiz-stem-tabs-row)) {
  padding-top: 0.5rem !important;
  padding-bottom: 0.5rem !important;
  padding-left: 1rem !important;
  padding-right: 1rem !important;
}
.my-design-pack-unit-blocks :deep(.my-design-quiz-field-inset__head > .my-design-quiz-stem-tabs-row.d-flex.gap-2.px-3),
.my-design-quiz-sub-block :deep(.my-design-quiz-field-inset__head > .my-design-quiz-stem-tabs-row.d-flex.gap-2.px-3) {
  padding-top: 0 !important;
  padding-bottom: 0 !important;
}
.my-design-quiz-field-inset__rule,
.my-design-quiz-sub-block :deep(.my-design-quiz-field-inset__rule) {
  border: 0;
  border-top: 1px solid var(--my-color-gray-3);
  opacity: 1;
}
/* 題目子區塊頂部容器不留 pt */
.my-design-quiz-stem-sub-block-top,
.my-design-pack-unit-blocks :deep(.my-design-quiz-stem-sub-block-top) {
  padding-top: 0 !important;
}
.my-design-quiz-question-prompt-block,
.my-design-quiz-sub-block :deep(.my-design-quiz-question-prompt-block) {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  border: none;
  border-radius: 0.5rem;
  background-color: var(--my-color-black);
  overflow: hidden;
}
.my-design-quiz-question-prompt-block__title,
.my-design-quiz-sub-block :deep(.my-design-quiz-question-prompt-block__title) {
  line-height: 1.35;
  white-space: nowrap;
}
.my-design-quiz-question-prompt-block__edit-btn,
.my-design-quiz-sub-block :deep(.my-design-quiz-question-prompt-block__edit-btn) {
  box-sizing: border-box;
  width: 1.75rem;
  height: 1.75rem;
  min-width: 1.75rem;
  min-height: 1.75rem;
  padding: 0;
  border: none;
  background-color: transparent;
  color: var(--my-color-white);
}
.my-design-quiz-question-prompt-block__edit-btn:hover:not(:disabled),
.my-design-quiz-question-prompt-block__edit-btn:focus-visible:not(:disabled),
.my-design-quiz-sub-block :deep(.my-design-quiz-question-prompt-block__edit-btn:hover:not(:disabled)),
.my-design-quiz-sub-block :deep(.my-design-quiz-question-prompt-block__edit-btn:focus-visible:not(:disabled)) {
  color: var(--my-color-white);
  background-color: color-mix(in srgb, var(--my-color-white) 14%, transparent);
}
.my-design-quiz-question-prompt-block__rule,
.my-design-quiz-sub-block :deep(.my-design-quiz-question-prompt-block__rule) {
  border: 0;
  border-top: 1px solid color-mix(in srgb, var(--my-color-white) 35%, transparent);
  opacity: 1;
}
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
  border-left-color: var(--my-color-gray-3);
  color: var(--my-color-gray-3);
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
/* 答案標題列 pill（提示、參考答案、詳細資訊等）：淺灰底 gray-4、無描邊 */
.btn.my-design-quiz-stem-history-btn,
:deep(.btn.my-design-quiz-stem-history-btn) {
  border: none;
  white-space: nowrap;
  background-color: var(--my-color-gray-4);
  color: var(--my-color-black);
}
.btn.my-design-quiz-stem-history-btn:hover:not(:disabled),
.btn.my-design-quiz-stem-history-btn:focus-visible:not(:disabled),
.btn.my-design-quiz-stem-history-btn:active:not(:disabled),
:deep(.btn.my-design-quiz-stem-history-btn:hover:not(:disabled)),
:deep(.btn.my-design-quiz-stem-history-btn:focus-visible:not(:disabled)),
:deep(.btn.my-design-quiz-stem-history-btn:active:not(:disabled)) {
  background-color: color-mix(in srgb, var(--my-color-black) 5%, var(--my-color-gray-4));
  color: var(--my-color-black);
}
.my-design-pack-unit-blocks :deep(.btn.rounded-pill),
.my-pack-unit-settings-body :deep(.btn.rounded-pill),
.my-design-quiz-sub-block :deep(.btn.rounded-pill) {
  white-space: nowrap;
  flex-shrink: 0;
}
.form-control.my-design-quiz-answer-input,
.my-design-quiz-sub-block :deep(.form-control.my-design-quiz-answer-input) {
  background-color: var(--my-color-white);
  border: 1px solid var(--my-color-gray-3);
}
.form-control.my-design-quiz-answer-input:focus,
.my-design-quiz-sub-block :deep(.form-control.my-design-quiz-answer-input:focus) {
  background-color: var(--my-color-white);
  border-color: var(--my-color-gray-3);
  box-shadow: none;
}
.form-control.my-design-quiz-answer-input:disabled,
.my-design-quiz-sub-block :deep(.form-control.my-design-quiz-answer-input:disabled) {
  background-color: var(--my-color-gray-4);
  border-color: var(--my-color-gray-3);
  opacity: 1;
}

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
</style>
