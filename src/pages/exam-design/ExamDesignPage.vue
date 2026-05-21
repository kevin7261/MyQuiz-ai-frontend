<script setup>
/**
 * ExamDesignPage - 測驗 UI 示範，不串接 API
 *
 * 版面與 ExamPage 相同（分頁、單元／題型選擇、逐字稿／MP3／YouTube、產生題目、作答與評分、讚／差），
 * 樣式對齊 create-exam-bank_design（QuizCard 三子區塊：題目／答案／批改）。
 * 資料來自 mockData.js，互動經 examApiDesign.js 模擬延遲回應。
 */
import { ref, computed, watch, onActivated, reactive, nextTick } from 'vue';
import { useAuthStore } from '../../stores/authStore.js';
import {
  API_RESPONSE_QUIZ_CONTENT,
  API_RESPONSE_QUIZ_LEGACY,
} from '../../constants/api.js';
import {
  parseRagMetadataObject,
  getRagUnitListString,
  mergeQuizzesWithTopLevelAnswers,
  parsePackUnitTypesFromRag,
  ragQuizSelectValue,
  UNIT_TYPE_RAG,
  UNIT_TYPE_TEXT,
  UNIT_TYPE_MP3,
  UNIT_TYPE_YOUTUBE,
} from '../../utils/rag.js';
import { renderMarkdownToSafeHtml } from '../../utils/renderMarkdown.js';
import { youtubeEmbedUrlFromInput } from '../../utils/youtubeEmbed.js';
import LoadingOverlay from '../../components/LoadingOverlay.vue';
import QuizCard from '../../components/QuizCard.vue';
import QuizHistoryModal from '../../components/QuizHistoryModal.vue';
import TabRenameModal from '../../components/TabRenameModal.vue';
import ExamAddQuestionModal from '../../components/ExamAddQuestionModal.vue';
import {
  apiUpdateExamTabName,
  apiExamTabQuizLlmGenerate,
  apiExamTabQuizCreateLlmGenerate,
  apiExamTabQuizLlmGenerateFollowup,
  apiExamTabQuizCreateLlmGenerateFollowup,
  apiExamTabDelete,
} from './examApiDesign.js';
import { formatGradingResult } from '../../utils/grading.js';
import { submitGrade } from './composables/useQuizGradingDesign.js';
import {
  followupHistoryEntryFromQuizCard,
  normalizeFollowupHistoryItem,
} from '../../services/ragApi.js';
import {
  DESIGN_DEMO_MP3_SAMPLE_URL,
  DESIGN_MOCK_FOR_EXAM_RAG,
  buildDesignExamListMerged,
  addDesignExamRow,
  markDesignExamDeleted,
  nextDesignExamId,
} from './mockData.js';
import { DESIGN_DEMO_GRADING_PROMPT_SAMPLE, DESIGN_DEMO_QUIZ_USER_PROMPT_SAMPLE } from '../create-exam-bank-design/mockData.js';

const designDelay = (ms) => new Promise((r) => setTimeout(r, ms));

defineProps({
  tabId: { type: String, required: true },
});

const authStore = useAuthStore();

// ─── 頁面描述常數 ──────────────────────────────────────────────────────────────

/** 與 ExamPage 相同命名，供標題／載入文案／空狀態按鈕共用 */
const pageTitle = computed(() => '測驗');
const quizBankNoun = computed(() => '試卷');

// ─── 純輔助函式（不依賴 Vue 狀態） ────────────────────────────────────────────

/** 從 test_tab_id 取得 test_name：與 RAG 頁一致，底線後的部份（時間），無底線則用整段 */
function deriveNameFromTabId(tabId) {
  if (!tabId || typeof tabId !== 'string') return '';
  const idx = String(tabId).indexOf('_');
  return idx >= 0 ? String(tabId).slice(idx + 1) : String(tabId);
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
      transcription: u0.transcription ?? undefined,
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
        transcription: u0.transcription ?? undefined,
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
    unwrap.transcription
    ?? pickRag?.transcription
    ?? null;
  const rootQuizzes = parseArrayMaybeJson(unwrap.quizzes);

  if (pickRag != null && typeof pickRag === 'object') {
    const base = { ...pickRag };
    if (sys != null && base.transcription == null) base.transcription = sys;
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
      transcription: sys ?? undefined,
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
      transcription: sys ?? undefined,
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

/** 自 Rag_Quiz／Exam_Quiz 列取出批改規則（不顯示於 UI，供「開始批改」啟用判斷） */
function extractAnswerUserPromptFromSource(raw) {
  if (!raw || typeof raw !== 'object') return '';
  for (const key of [
    'answer_user_prompt_text',
    'answerUserPromptText',
    'critique_user_prompt_instruction',
  ]) {
    const val = raw[key];
    if (val == null) continue;
    const text = String(val).trim();
    if (text) return text;
  }
  return '';
}

function syncExamCardPromptBaselines(card) {
  if (!card || typeof card !== 'object') return;
  card.gradingPromptBaseline = String(card.gradingPrompt ?? '');
  card.quizUserPromptBaseline = String(
    card.quiz_user_prompt_text ?? card.quizUserPromptText ?? '',
  );
  card.quizAnswerBaseline = String(card.quiz_answer ?? '');
}

function extractQuizUserPromptText(raw) {
  if (!raw || typeof raw !== 'object') return '';
  for (const key of [
    'quiz_user_prompt_text',
    'quizUserPromptText',
    'user_prompt_text',
    'userPromptText',
    'prompt_text',
    'promptText',
  ]) {
    const val = raw[key];
    if (val == null) continue;
    const text = String(val).trim();
    if (text) return text;
  }
  return '';
}

/** 稿頁題卡：寫入出題／批改規則與 baseline（對齊 create-exam-bank_design syncQuizCardPromptBaselines） */
function applyExamDesignCardPromptFields(card, promptSources = []) {
  if (!card || typeof card !== 'object') return;
  let qp = '';
  for (const src of promptSources) {
    qp = extractQuizUserPromptText(src).trim();
    if (qp) break;
  }
  if (!qp) qp = String(DESIGN_DEMO_QUIZ_USER_PROMPT_SAMPLE ?? '').trim();
  card.quiz_user_prompt_text = qp;
  card.quizUserPromptText = qp;

  let gp = '';
  for (const src of promptSources) {
    gp = extractAnswerUserPromptFromSource(src).trim();
    if (gp) break;
  }
  if (!gp) gp = String(DESIGN_DEMO_GRADING_PROMPT_SAMPLE ?? '').trim();
  card.gradingPrompt = gp;
  card.hasUsedSaveAndGradeOnce = gp !== '';
  syncExamCardPromptBaselines(card);
}

/** 「儲存並開始批改」可按：對齊 create-exam-bank_design canEnableUnitQuizGrade */
function canEnableExamDesignGrade(card) {
  if (!card || typeof card !== 'object') return false;
  const gpTrim = String(card.gradingPrompt ?? '').trim();
  if (!gpTrim) return false;
  return String(card.gradingPrompt ?? '') !== String(card.gradingPromptBaseline ?? '');
}

/** 「開始批改」（llm-grade-db）：對齊 create-exam-bank_design canEnableUnitQuizGradeDb */
function canEnableExamDesignGradeDb(card) {
  if (!card || typeof card !== 'object') return false;
  if (card.hasUsedSaveAndGradeOnce !== true) return false;
  if (String(card.gradingPrompt ?? '') !== String(card.gradingPromptBaseline ?? '')) return false;
  const rq = Number(card.rag_quiz_id ?? card.quiz_id);
  return Number.isFinite(rq) && rq >= 1;
}

function canEnableExamDesignGradeMerged(card) {
  return canEnableExamDesignGrade(card) || canEnableExamDesignGradeDb(card);
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

function examUnitTranscriptionFromRaw(unit) {
  if (!unit || typeof unit !== 'object') return '';
  const tx = unit.transcription;
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
  const transcription = examUnitTranscriptionFromRaw(raw);
  const sourceValue = examUnitSourceFilenameLabel(raw);
  const youtubeHref =
    ut === UNIT_TYPE_YOUTUBE && examYoutubeLooksLikeUrl(sourceValue) ? sourceValue.trim() : '';
  return {
    unitType: ut,
    transcription,
    sourceDisplay: sourceValue || '—',
    youtubeHref,
  };
}

/**
 * 文字／YouTube／MP3 單元之逐字稿與播放器：須先選妥單元與題型（條件對齊「產生題目」）；已產生題幹後一律顯示。
 * @param {number} slotIndex
 */
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
  const t = sec.transcription;
  return renderMarkdownToSafeHtml(t != null ? String(t) : '');
}

/** unit_type=4：iframe 用 embed URL */
function examSlotYoutubeEmbedUrl(slotIndex) {
  const sec = examSlotUnitTranscriptSection(slotIndex);
  if (!sec || sec.unitType !== UNIT_TYPE_YOUTUBE) return '';
  const raw = (sec.youtubeHref || sec.sourceDisplay || '').trim();
  return youtubeEmbedUrlFromInput(raw);
}

/** MP3／YouTube 單元：逐字稿改以 Modal 顯示（槽位 1-based） */
const examUnitTranscriptModalSlotIndex = ref(null);

function openExamUnitTranscriptModal(slotIndex) {
  examUnitTranscriptModalSlotIndex.value = slotIndex;
}

function closeExamUnitTranscriptModal() {
  examUnitTranscriptModalSlotIndex.value = null;
}

/** 先前出題 Modal：槽位 1-based */
const examQuizHistoryModalSlotIndex = ref(null);

function openExamQuizHistoryModal(slotIndex) {
  examQuizHistoryModalSlotIndex.value = slotIndex;
}

function closeExamQuizHistoryModal() {
  examQuizHistoryModalSlotIndex.value = null;
}

const examQuizHistoryModalList = computed(() => {
  const idx = examQuizHistoryModalSlotIndex.value;
  if (idx == null) return [];
  if (examSlotIsFollowupMode(idx)) {
    return examQuizFollowupHistoryListForDisplay(idx);
  }
  const list = getSlotFormState(idx).quiz_history_list;
  return Array.isArray(list) ? list : [];
});

const examQuizHistoryModalIsFollowup = computed(() => {
  const idx = examQuizHistoryModalSlotIndex.value;
  if (idx == null) return false;
  return examSlotIsFollowupMode(idx);
});


const examQuizHistoryModalOpen = computed({
  get: () => examQuizHistoryModalSlotIndex.value != null,
  set: (open) => {
    if (!open) closeExamQuizHistoryModal();
  },
});

const examQuizHistoryModalUnitLabel = computed(() => {
  const idx = examQuizHistoryModalSlotIndex.value;
  if (idx == null) return '—';
  return examSlotUnitLabelForHistoryModal(idx);
});

const examQuizHistoryModalQuizTypeLabel = computed(() => {
  const idx = examQuizHistoryModalSlotIndex.value;
  if (idx == null) return '—';
  return examSlotQuizTypeLabelForHistoryModal(idx);
});

const examUnitTranscriptModalMdHtml = computed(() => {
  const idx = examUnitTranscriptModalSlotIndex.value;
  if (idx == null || !Number.isFinite(Number(idx)) || Number(idx) < 1) return '';
  return examSlotUnitTranscriptMdHtml(Number(idx));
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

/** 試卷題庫載入後重新同步目前分頁（單元下拉需 forExamRag） */
watch(forExamRag, (rag) => {
  if (!rag || !activeTabId.value || examListLoading.value) return;
  const idStr = String(activeTabId.value);
  const exam = examList.value.find((e) => getExamTabId(e) === idStr);
  if (!exam) return;
  const state = getTabState(idStr);
  state._synced = false;
  syncExamItemToTabState(exam);
});

/** 「產生題目」「新增題目」：試卷題庫清單載入中則暫停（create 僅需 exam_tab_id，不依賴 rag_unit_id） */
const generateQuizBlocked = computed(() => forExamLoading.value);

/** 右側欄：有測驗分頁時顯示題目清單與「新增題目」（對齊 create-exam-bank_design） */
const showDesignRightView = computed(() => !!activeTabId.value);

/** 題目 Carousel：一次只顯示一題，由右側清單切換 */
const activeExamSlotIndex = ref(0);

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

/** 稿頁題目區標題：小字 breadcrumb「單元 > 題型」 */
function examSlotHeadingBreadcrumb(slotIndex) {
  return `${examSlotUnitLabelForHistoryModal(slotIndex)} > ${examSlotQuizTypeLabelForHistoryModal(slotIndex)}`;
}

/** 稿頁題目區主標題：第 1 題、第 2 題…（對齊 create-exam-bank_design 主標題字階） */
function examSlotHeadingQuestionTitle(slotIndex) {
  const n = Math.trunc(Number(slotIndex));
  if (!Number.isFinite(n) || n < 1) return '—';
  return `第 ${n} 題`;
}

/** 稿頁題目區主標題旁 badge：一般出題／追問出題 */
function examSlotHeadingGenerateModeLabel(slotIndex) {
  return examQuizGenerateModeLabel(examSlotIsFollowupMode(slotIndex));
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
}

function onDesignRightQuizClick(item) {
  if (!item) return;
  if (item.kind === 'exam-slot') selectExamSlot(item.index);
}

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

/** 稿頁：進入時載入示範資料 */
watch(
  () => authStore.user,
  () => {
    fetchExamTests();
    fetchExamRagSource();
  },
  { immediate: true }
);

/** 有測驗列表時預設選第一個 tab */
watch(examList, (list) => {
  if (list.length > 0 && activeTabId.value == null) {
    activeTabId.value = getExamTabId(list[0]) || list[0];
  }
}, { immediate: true });

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
  const gradingResult = latestAnswer
    ? (formatGradingResult(JSON.stringify(latestAnswer)) || (latestSubmitted != null && String(latestSubmitted).trim() !== '' ? '已批改' : ''))
    : '';
  const quizId = quiz.exam_quiz_id ?? quiz.quiz_id ?? null;
  const answerId = latestAnswer?.exam_answer_id ?? latestAnswer?.answer_id ?? null;
  const rid = quiz.rag_id ?? quiz.ragId ?? fallbackRagId;
  const ragIdStr = rid != null && String(rid).trim() !== '' ? String(rid) : null;
  const card = {
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
    confirmed: !!latestAnswer,
    gradingResult,
    gradingResponseJson: latestAnswer ?? null,
    generateQuizResponseJson: null,
    exam_quiz_id: quizId,
    answer_id: answerId,
    gradingPrompt: '',
    quiz_user_prompt_text: '',
    quizUserPromptText: '',
    hasUsedSaveAndGradeOnce: false,
    gradingPromptBaseline: '',
    quizUserPromptBaseline: '',
    quizAnswerBaseline: '',
    examQuizDisplayName: examQuizDisplayNameFromRow(quiz),
    follow_up: examQuizApiRowIsFollowUp(quiz),
    quizGenerateMode: examQuizApiRowIsFollowUp(quiz) ? 'followup' : 'normal',
    follow_up_exam_quiz_id:
      quiz.follow_up_exam_quiz_id != null && quiz.follow_up_exam_quiz_id !== ''
        ? Number(quiz.follow_up_exam_quiz_id)
        : null,
  };
  applyExamDesignCardPromptFields(card, [quiz]);
  return card;
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
    state.cardList = quizzesWithAnswers.map((q) =>
      buildCardFromExamQuiz(q, q.unit_name ?? q.rag_name ?? firstRagName, fallbackRid));
    for (let i = 1; i <= state.quizSlotsCount; i++) {
      const card = state.cardList[i - 1];
      if (!card) continue;
      if (!state.slotFormState[i]) state.slotFormState[i] = reactive(getDefaultExamSlotForm());
      hydrateExamSlotFromRagCard(state.slotFormState[i], card);
    }
    syncAllExamSlotQuizHistoryLists();
  } else {
    state.quizSlotsCount = 0;
    state.cardList = [];
  }
  state._synced = true;
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

/** 稿頁：取得示範 person_id */
function getCurrentPersonId() {
  const u = authStore.user;
  if (u?.person_id != null && String(u.person_id).trim() !== '') return String(u.person_id).trim();
  if (u?.user_id != null && String(u.user_id).trim() !== '') return String(u.user_id).trim();
  return 'design_person';
}

/** 稿頁：重新載入時允許 mock 資料再次灌入 tab 狀態 */
function resetDesignTabSyncFlags() {
  for (const id of Object.keys(tabStateMap)) {
    const state = tabStateMap[id];
    if (state) state._synced = false;
  }
}

/**
 * 載入示範測驗列表（不呼叫 GET /exam/tabs）
 */
async function fetchExamTests() {
  examListLoading.value = true;
  examListError.value = '';
  try {
    await designDelay(250);
    resetDesignTabSyncFlags();
    examList.value = buildDesignExamListMerged().map((row) => {
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
    examListError.value = err.message || '無法載入示範測驗列表';
    examList.value = [];
  } finally {
    examListLoading.value = false;
  }
}

/** 試卷題庫：示範 GET /exam/rag-for-exams */
async function fetchExamRagSource() {
  forExamLoading.value = true;
  forExamError.value = '';
  try {
    await designDelay(200);
    forExamRag.value = normalizeExamRagForExamsPayload(DESIGN_MOCK_FOR_EXAM_RAG);
  } catch (err) {
    forExamError.value = err.message || '無法載入示範試卷題庫';
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
  const fromTabId = deriveNameFromTabId(tabId);
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
  examRenameInitialName.value = getExamTabNameForEdit(exam) || getExamTabLabel(exam);
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
    const exam = examList.value.find((e) => (e.exam_id ?? e.test_id) === eid);
    if (exam) {
      exam.tab_name = name;
      exam.exam_name = name;
      exam.test_name = name;
    }
    examRenameModalOpen.value = false;
  } catch (err) {
    examRenameError.value = err.message || '更新失敗';
  } finally {
    examRenameSaving.value = false;
  }
}

/** 按「＋」新增試卷分頁（稿頁：僅追加本地示範列） */
async function addNewTab() {
  createExamError.value = '';
  createExamLoading.value = true;
  const examTabId = `design_exam_${Date.now()}`;
  const tabName = '未命名試卷';
  try {
    await designDelay(200);
    const eid = nextDesignExamId();
    const item = {
      exam_id: eid,
      exam_tab_id: examTabId,
      tab_name: tabName,
      exam_name: tabName,
      test_id: eid,
      test_tab_id: examTabId,
      test_name: tabName,
      units: [],
    };
    addDesignExamRow(item);
    examList.value = [...examList.value, item];
    activeTabId.value = examTabId;
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
/** 「新增題目」正在 POST /exam/tab/quiz/create */
const examAddQuestionSubmitting = ref(false);
/** 新增題目：先選單元／題型 Modal */
const examAddQuestionModalOpen = ref(false);
const examAddQuestionModalError = ref('');

/** 新增題目 Modal 開啟前載入試卷題庫 */
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

/** 追問模式 Modal：本分頁同單元／題型、此槽位之前槽位之問答（不含當前題） */
function examQuizFollowupHistoryListForDisplay(slotIndex) {
  const card = currentState.value.cardList[slotIndex - 1];
  const prevName = String(card?.examQuizDisplayName ?? '').trim();
  const { ragUnitId, ragQuizId } = examLlmRagIdsForSlot(slotIndex, prevName);
  if (ragUnitId < 1 || ragQuizId < 1) return [];
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
  const cards = currentState.value.cardList;
  if (!Array.isArray(cards)) return out;
  for (let i = 0; i < slotIndex - 1; i++) {
    const c = cards[i];
    if (!c || typeof c !== 'object') continue;
    const ru = c.rag_unit_id != null ? Number(c.rag_unit_id) : NaN;
    const rq = c.rag_quiz_id != null ? Number(c.rag_quiz_id) : NaN;
    if (!Number.isFinite(ru) || ru !== ragUnitId || !Number.isFinite(rq) || rq !== ragQuizId) {
      continue;
    }
    push(followupHistoryEntryFromQuizCard(c));
  }
  return out;
}

/** 追問出題：同單元／題型、此槽位之前最後一筆 Exam_Quiz 主鍵（follow_up_exam_quiz_id） */
function examFollowUpExamQuizIdForSlot(slotIndex) {
  const card = currentState.value.cardList[slotIndex - 1];
  const prevName = String(card?.examQuizDisplayName ?? '').trim();
  const { ragUnitId, ragQuizId } = examLlmRagIdsForSlot(slotIndex, prevName);
  if (ragUnitId < 1 || ragQuizId < 1) return null;
  const cards = currentState.value.cardList;
  if (!Array.isArray(cards)) return null;
  let lastId = null;
  for (let i = 0; i < slotIndex - 1; i++) {
    const c = cards[i];
    if (!c || typeof c !== 'object') continue;
    const ru = c.rag_unit_id != null ? Number(c.rag_unit_id) : NaN;
    const rq = c.rag_quiz_id != null ? Number(c.rag_quiz_id) : NaN;
    if (!Number.isFinite(ru) || ru !== ragUnitId || !Number.isFinite(rq) || rq !== ragQuizId) {
      continue;
    }
    const id = Number(c.exam_quiz_id ?? c.quiz_id);
    if (Number.isFinite(id) && id >= 1) lastId = Math.trunc(id);
  }
  return lastId;
}

/** 追問出題 POST llm-generate-followup 用之 quiz_history_list（同槽位之前、同單元／題型問答） */
function examQuizFollowupHistoryListForLlm(slotIndex) {
  return examQuizFollowupHistoryListForDisplay(slotIndex);
}

/** 實際走追問 API：題型為追問且已有同題型先前題目與問答；首題（無先前題）改走一般 llm-generate */
function examSlotUseFollowupLlmGenerate(slotIndex) {
  if (!examSlotIsFollowupMode(slotIndex)) return false;
  const followUpExamQuizId = examFollowUpExamQuizIdForSlot(slotIndex);
  if (followUpExamQuizId == null) return false;
  return examQuizFollowupHistoryListForLlm(slotIndex).length > 0;
}

/**
 * 須已選單元（若有選項）且能解析題型名稱才可開啟「先前出題」。
 * 勿僅查 examQuizDisplayName：已產題／GET 載入時題名常來自 rag 列對齊。
 */
function canOpenExamQuizHistoryModal(slotIndex) {
  const slotState = getSlotFormState(slotIndex);
  if (
    examUnitSelectDropdownOptions.value.length > 0
    && !String(slotState.examUnitSelectId ?? '').trim()
  ) {
    return false;
  }
  return examSlotQuizTypeLabelForHistoryModal(slotIndex) !== '—';
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

/** 稿頁「產生題目」：永遠可點（示範用，不鎖選項／錨定條件） */
function examGenerateQuizButtonDisabled() {
  return false;
}

const isGradingSubmitting = computed(() => gradingSubmittingCardId.value != null);

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

/**
 * 全螢幕遮罩：首次載入測驗列表、建立／刪除分頁、更名、批改中、產生題目（LLM）。
 */
const loadingOverlayVisible = computed(
  () =>
    (examListLoading.value && examList.value.length === 0) ||
    createExamLoading.value ||
    deleteExamLoading.value ||
    examRenameSaving.value ||
    isGradingSubmitting.value ||
    examGenerateQuizOverlayVisible.value
);

const loadingOverlayText = computed(() => {
  if (isGradingSubmitting.value) return '批改中...';
  if (examGenerateQuizOverlayVisible.value) {
    const n = Number(currentState.value.quizSlotsCount) || 0;
    for (let i = 1; i <= n; i++) {
      if (!getSlotFormState(i).loading) continue;
      if (examSlotUseFollowupLlmGenerate(i)) return '追問出題中...';
    }
    return '產生題目中...';
  }
  if (deleteExamLoading.value) return '刪除中...';
  if (examRenameSaving.value) return '儲存中...';
  if (createExamLoading.value) return '建立中...';
  if (examListLoading.value && examList.value.length === 0) return `載入${quizBankNoun.value}中`;
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
    await apiExamTabDelete(examTabId);
    markDesignExamDeleted(examTabId);
    examList.value = examList.value.filter((t) => getExamTabId(t) !== examTabId);
    if (activeTabId.value === examTabId) {
      activeTabId.value = examList.value.length > 0 ? getExamTabId(examList.value[0]) : null;
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
    /** 出題模式：`normal`＝一般出題；`followup`＝追問出題 */
    quizGenerateMode: 'normal',
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
  if (slot.quizGenerateMode !== 'followup' && slot.quizGenerateMode !== 'normal') {
    slot.quizGenerateMode = 'normal';
  }
  return slot;
}

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
  if (ragRow && examQuizApiRowIsFollowUp(ragRow)) {
    slot.quizGenerateMode = 'followup';
  }
  await generateQuiz(idx, { createAndGenerate: true });
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
  return { ok: true, error: '' };
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
    examQuizDisplayName: '',
  };
}

/**
 * 「產生題目」：新題 POST create-llm-generate／create-llm-generate-followup；既有題列 POST llm-generate／llm-generate-followup。
 * @param {{ createAndGenerate?: boolean }} [options]
 */
async function generateQuiz(slotIndex, options = {}) {
  const slotState = getSlotFormState(slotIndex);
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
  const useFollowupGenerate = examSlotUseFollowupLlmGenerate(slotIndex);
  if (followupMode && !useFollowupGenerate) {
    const followUpExamQuizId = examFollowUpExamQuizIdForSlot(slotIndex);
    if (followUpExamQuizId != null) {
      slotState.error = '追問出題須先有題目與作答內容';
      return;
    }
  }

  slotState.loading = true;
  slotState.error = '';
  slotState.responseJson = null;
  try {
    const quizHistoryList = Array.isArray(slotState.quiz_history_list)
      ? slotState.quiz_history_list
      : [];

    const data = createAndGenerate
      ? (useFollowupGenerate
          ? await apiExamTabQuizCreateLlmGenerateFollowup(
              {
                exam_tab_id: examTabStr,
                rag_tab_id: ragTabIdForLlm,
                rag_unit_id: ragUnitIdForLlm,
                rag_quiz_id: ragQuizIdForLlm,
                follow_up_exam_quiz_id: examFollowUpExamQuizIdForSlot(slotIndex),
                quiz_history_list: examQuizFollowupHistoryListForLlm(slotIndex),
              },
              personId,
            )
          : await apiExamTabQuizCreateLlmGenerate(
              {
                exam_tab_id: examTabStr,
                rag_tab_id: ragTabIdForLlm,
                rag_unit_id: ragUnitIdForLlm,
                rag_quiz_id: ragQuizIdForLlm,
                quiz_history_list: quizHistoryList,
              },
              personId,
            ))
      : (useFollowupGenerate
          ? await apiExamTabQuizLlmGenerateFollowup(
              {
                exam_quiz_id: draftEq,
                rag_tab_id: ragTabIdForLlm,
                rag_unit_id: ragUnitIdForLlm,
                rag_quiz_id: ragQuizIdForLlm,
                follow_up_exam_quiz_id: examFollowUpExamQuizIdForSlot(slotIndex),
                quiz_history_list: examQuizFollowupHistoryListForLlm(slotIndex),
              },
              personId,
            )
          : await apiExamTabQuizLlmGenerate(
              {
                exam_quiz_id: draftEq,
                rag_tab_id: ragTabIdForLlm,
                rag_unit_id: ragUnitIdForLlm,
                rag_quiz_id: ragQuizIdForLlm,
                quiz_history_list: quizHistoryList,
              },
              personId,
            ));

    slotState.responseJson = data;
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
        || followupMode;
      const fuFromApi = Number(
        data.follow_up_exam_quiz_id ?? data.followUpExamQuizId ?? NaN,
      );
      if (Number.isFinite(fuFromApi) && fuFromApi >= 1) {
        newCard.follow_up_exam_quiz_id = Math.trunc(fuFromApi);
      } else if (useFollowupGenerate) {
        const fuReq = examFollowUpExamQuizIdForSlot(slotIndex);
        if (fuReq != null) newCard.follow_up_exam_quiz_id = fuReq;
      }
      const unitItem = findExamUnitDropdownItemBySelectId(
        String(slotState.examUnitSelectId ?? '').trim(),
      );
      const pickName =
        String(newCard.examQuizDisplayName ?? '').trim()
        || String(slotState.examQuizNamePick ?? '').trim();
      const ragRow = findExamRagQuizRowBySelectedPick(unitItem, pickName);
      applyExamDesignCardPromptFields(newCard, [data, ragRow]);
    }
    slotState.draftExamQuizId = null;
    syncAllExamSlotQuizHistoryLists();
  } catch (err) {
    slotState.error = err.message || '產生題目失敗';
  } finally {
    slotState.loading = false;
  }
}

// ─── 題目評分（讚 / 差）與作答評改 ───────────────────────────────────────────

/** 題目讚(1)／差(-1)；稿頁僅更新 UI，不呼叫 API */
function rateExamQuiz(item, direction) {
  if (!item || typeof item !== 'object') return;
  const target = direction === 'up' ? 1 : -1;
  const previousRate = normalizeExamQuizRate(item.quiz_rate);
  item.quiz_rate = previousRate === target ? 0 : target;
  item.rateError = '';
}

/** 評分：稿頁不呼叫後端，以示範批改結果更新題卡 */
async function confirmAnswer(item) {
  if (!item.quiz_answer.trim()) return;
  gradingSubmittingCardId.value = item.id;
  try {
    await submitGrade(item);
    if (item.confirmed) {
      item.gradingPromptBaseline = String(item.gradingPrompt ?? '');
      item.quizAnswerBaseline = String(item.quiz_answer ?? '');
      item.hasUsedSaveAndGradeOnce = true;
    }
  } finally {
    gradingSubmittingCardId.value = null;
  }
}

/** 稿頁 QuizCard 三子區塊共用 bind（版式對齊 create-exam-bank_design；功能對齊 exam） */
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
    gradeSubmitting: examCardGradeSubmitting(card),
    examQuizHistoryList: examSlotIsFollowupMode(slotIndex)
      ? examQuizFollowupHistoryListForDisplay(slotIndex)
      : getSlotFormState(slotIndex).quiz_history_list,
    examQuizHistoryUnitLabel: examSlotUnitLabelForHistoryModal(slotIndex),
    examQuizHistoryQuizTypeLabel: examSlotQuizTypeLabelForHistoryModal(slotIndex),
    examQuizHistoryIsFollowup: examSlotIsFollowupMode(slotIndex),
    examQuizHistoryOpenAllowed: canOpenExamQuizHistoryModal(slotIndex),
  };
}

onActivated(() => {
  fetchExamTests();
  fetchExamRagSource();
});
</script>

<template>
  <div class="d-flex flex-column h-100 overflow-hidden my-bgcolor-gray-4 position-relative">
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
      @save="onExamRenameSave"
    />
    <ExamAddQuestionModal
      v-model="examAddQuestionModalOpen"
      :submitting="examAddQuestionSubmitting"
      :blocked="examAddQuestionModalLoading"
      :error="examAddQuestionModalError"
      :unit-options="examUnitSelectDropdownOptions"
      :unit-select-value="examUnitSelectValue"
      :unit-option-label="(u) => String(u.label ?? '').trim() || '—'"
      :quiz-options-for-unit="examAddQuestionModalQuizOptions"
      :quiz-pick-select-value="examQuizPickSelectValue"
      :quiz-option-label="examQuizTypeDisplayLabelForDropdownOption"
      @confirm="onExamAddQuestionModalConfirm"
    />
    <Teleport to="body">
      <div
        v-if="examUnitTranscriptModalSlotIndex != null"
        class="modal fade show d-block my-modal-backdrop"
        tabindex="-1"
        role="dialog"
        aria-modal="true"
        aria-labelledby="exam-unit-transcript-modal-title"
      >
        <div
          class="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable"
          @click.stop
        >
          <div class="modal-content border-0 my-bgcolor-gray-3 p-4 d-flex flex-column gap-3">
            <div class="modal-header border-bottom-0 p-0">
              <h5 id="exam-unit-transcript-modal-title" class="modal-title my-color-black">逐字稿</h5>
              <button
                type="button"
                class="btn-close"
                aria-label="關閉"
                @click="closeExamUnitTranscriptModal"
              />
            </div>
            <div class="modal-body p-0" style="max-height: 70vh; overflow: auto;">
              <div
                v-if="examUnitTranscriptModalMdHtml"
                class="my-markdown-rendered my-font-md-400 my-color-black text-break"
                v-html="examUnitTranscriptModalMdHtml"
              />
              <span
                v-else
                class="my-font-md-400 my-color-black"
              >—</span>
            </div>
          </div>
        </div>
      </div>
      <QuizHistoryModal
        v-model="examQuizHistoryModalOpen"
        :unit-label="examQuizHistoryModalUnitLabel"
        :quiz-type-label="examQuizHistoryModalQuizTypeLabel"
        :is-followup="examQuizHistoryModalIsFollowup"
        :history-list="examQuizHistoryModalList"
        title-id="exam-quiz-history-modal-title"
      />
    </Teleport>
    <header class="flex-shrink-0 my-bgcolor-gray-4 p-4">
      <div class="container-fluid px-0 text-center">
        <p class="my-font-xl-400 my-color-black text-break mb-0">{{ pageTitle }}</p>
      </div>
    </header>
    <div class="flex-shrink-0 my-rag-tabs-bar my-bgcolor-gray-4">
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
      <div v-if="forExamError" class="my-alert-warning-soft my-font-sm-400 py-2 mx-4 mb-3">
        {{ forExamError }}
      </div>
      <div v-if="examListError" class="my-alert-warning-soft my-font-sm-400 py-2 mx-4 mb-3">
        {{ examListError }}
      </div>
      <div v-if="createExamError" class="my-alert-danger-soft my-font-sm-400 py-2 mx-4 mb-3">
        {{ createExamError }}
      </div>
      <div v-if="deleteExamError" class="my-alert-danger-soft my-font-sm-400 py-2 mx-4 mb-3">
        {{ deleteExamError }}
      </div>
    </div>

    <div class="flex-grow-1 overflow-hidden my-bgcolor-gray-4 d-flex flex-column min-h-0">
      <div
        v-if="examList.length === 0"
        class="flex-grow-1 d-flex align-items-center justify-content-center px-3 py-5 min-h-0 overflow-auto"
      >
        <button
          v-if="!examListLoading"
          type="button"
          class="btn rounded-pill d-flex justify-content-center align-items-center gap-2 my-font-md-400 my-button-gray-3 px-4 py-3"
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
      >
        <div
          class="h-100 min-h-0 overflow-hidden my-design-tab-left-view"
          :class="showDesignRightView ? 'col-8 col-lg-9 col-xl-9 col-xxl-10' : 'col-12'"
        >
          <div class="my-design-tab-left-view-scroll h-100 min-h-0 overflow-auto d-flex flex-column">
            <div
              v-if="activeTabId && !(Number(currentState.quizSlotsCount) || 0)"
              class="flex-grow-1 d-flex align-items-center justify-content-center px-3 py-5 min-h-0"
            >
              <button
                type="button"
                class="btn rounded-pill d-flex justify-content-center align-items-center gap-2 my-font-md-400 my-button-gray-3 px-4 py-3"
                title="新增題目"
                aria-label="新增題目"
                :disabled="generateQuizBlocked || examAddQuestionSubmitting || !String(activeTabId ?? '').trim()"
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
                    showDesignRightView
                      ? 'col-12 col-lg-12 col-xl-10 col-xxl-8'
                      : 'col-12 col-lg-10 col-xl-8 col-xxl-6'
                  "
                >
                  <div
                    v-if="activeTabId"
                    class="text-start my-page-block-spacing"
                  >
                    <template v-if="currentState.quizSlotsCount > 0">
                      <div class="my-design-pack-unit-blocks w-100 min-w-0">
                        <div
                          :key="activeExamSlotIndex1"
                          class="w-100 min-w-0 text-start"
                          role="group"
                          :aria-labelledby="`exam-slot-${activeExamSlotIndex1}-heading-label`"
                        >
                          <div
                            :id="`exam-slot-${activeExamSlotIndex1}-heading-label`"
                            class="my-font-sm-400 my-color-gray-1 mb-2 text-break"
                            :aria-label="`單元與題型：${examSlotHeadingBreadcrumb(activeExamSlotIndex1)}`"
                          >
                            {{ examSlotHeadingBreadcrumb(activeExamSlotIndex1) }}
                          </div>
                          <div
                            class="d-flex align-items-center gap-2 flex-nowrap w-100 min-w-0 mb-4"
                            role="heading"
                            aria-level="2"
                          >
                            <div class="d-flex align-items-center gap-2 flex-nowrap min-w-0 flex-grow-1 overflow-hidden">
                              <span
                                class="my-design-pack-unit-main-title my-test-section-heading-title text-truncate mb-0"
                              >{{ examSlotHeadingQuestionTitle(activeExamSlotIndex1) }}</span>
                              <span
                                class="badge my-bgcolor-surface my-color-black border user-select-none my-font-sm-400 rounded px-2 py-1 flex-shrink-0"
                              >{{ examSlotHeadingGenerateModeLabel(activeExamSlotIndex1) }}</span>
                            </div>
                          </div>
                          <div class="my-pack-unit-settings-body w-100 min-w-0">
                            <div class="w-100 min-w-0 text-start d-flex flex-column gap-3">
                        <template v-if="examSlotShowUnitTranscriptUi(activeExamSlotIndex1)">
                          <section
                            class="w-100 min-w-0 rounded-4 my-border-gray-2 overflow-hidden"
                            aria-label="單元內容"
                          >
                            <div
                              class="d-flex justify-content-end align-items-center w-100 min-w-0 px-3 pt-3"
                            >
                              <button
                                type="button"
                                class="btn rounded-pill d-inline-flex justify-content-center align-items-center flex-shrink-0 my-font-sm-400 my-button-gray-3 my-design-quiz-stem-history-btn px-3 py-1"
                                title="逐字稿"
                                aria-label="逐字稿"
                                @click="openExamUnitTranscriptModal(activeExamSlotIndex1)"
                              >
                                逐字稿
                              </button>
                            </div>
                            <div class="px-3 pt-2 pb-3 min-w-0">
                              <div
                                v-if="examSlotUnitTranscriptSection(activeExamSlotIndex1).unitType === UNIT_TYPE_TEXT"
                                class="my-rag-unit-type-text-scroll px-3 py-2 my-bgcolor-gray-4 min-w-0 rounded-2"
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
                              <audio
                                v-else-if="examSlotUnitTranscriptSection(activeExamSlotIndex1).unitType === UNIT_TYPE_MP3"
                                controls
                                class="w-100"
                                :src="DESIGN_DEMO_MP3_SAMPLE_URL"
                              />
                            </div>
                          </section>
                        </template>
                              <!-- 子區塊：題目；外層 pe-5＝灰底上、白底右側留白（對齊 create-exam-bank_design） -->
                              <div class="my-design-quiz-sub-block-outer pe-5">
                        <div
                          class="my-design-quiz-sub-block rounded-4 my-bgcolor-gray-3 p-0 d-flex flex-column"
                        >
                          <template v-if="examSlotQuizBodyTrim(activeExamSlotIndex1) === ''">
                            <div
                              class="my-design-quiz-generate-action-row d-flex justify-content-start align-items-center flex-nowrap gap-2 px-3 py-2"
                            >
                              <button
                                type="button"
                                class="btn rounded-pill d-inline-flex justify-content-center align-items-center flex-shrink-0 my-font-md-400 my-button-white px-4 py-2"
                                :disabled="examGenerateQuizButtonDisabled(activeExamSlotIndex1)"
                                :aria-busy="getSlotFormState(activeExamSlotIndex1).loading || getSlotFormState(activeExamSlotIndex1).draftCreating"
                                aria-label="產生題目"
                                @click="generateQuiz(activeExamSlotIndex1)"
                              >
                                產生題目
                              </button>
                            </div>
                            <div
                              v-if="getSlotFormState(activeExamSlotIndex1).error"
                              class="my-alert-danger-soft my-font-sm-400 py-2 mx-3 mb-3"
                            >
                              {{ getSlotFormState(activeExamSlotIndex1).error }}
                            </div>
                          </template>
                          <div
                            v-if="examSlotQuizBodyTrim(activeExamSlotIndex1) !== ''"
                            class="w-100 min-w-0 pt-2"
                          >
                            <QuizCard
                              v-bind="designExamQuizCardBind(activeExamSlotIndex1)"
                              create-exam-bank-design-layout
                              design-sub-block="question"
                              @confirm-answer="confirmAnswer"
                              @rate-quiz="(dir) => rateExamQuiz(currentState.cardList[activeExamSlotGi], dir)"
                              @open-quiz-history="openExamQuizHistoryModal(activeExamSlotIndex1)"
                              @update:quiz_answer="(val) => { currentState.cardList[activeExamSlotGi].quiz_answer = val }"
                              @update:grading_prompt="(val) => { currentState.cardList[activeExamSlotGi].gradingPrompt = val }"
                            />
                          </div>
                        </div>
                      </div>
                      <!-- 子區塊：答案；外層 ps-5＝灰底上、白底左側留白 -->
                      <div
                        v-if="examSlotQuizBodyTrim(activeExamSlotIndex1) !== ''"
                        class="my-design-quiz-sub-block-outer ps-5"
                      >
                        <div class="my-design-quiz-sub-block rounded-4 my-bgcolor-white p-0">
                          <div class="w-100 min-w-0 pt-2">
                            <QuizCard
                              v-bind="designExamQuizCardBind(activeExamSlotIndex1)"
                              create-exam-bank-design-layout
                              design-sub-block="answer"
                              @confirm-answer="confirmAnswer"
                              @update:quiz_answer="(val) => { currentState.cardList[activeExamSlotGi].quiz_answer = val }"
                              @update:grading_prompt="(val) => { currentState.cardList[activeExamSlotGi].gradingPrompt = val }"
                            />
                          </div>
                        </div>
                      </div>
                      <!-- 子區塊：批改；外層 pe-5＝灰底上、白底右側留白 -->
                      <div
                        v-if="examSlotQuizBodyTrim(activeExamSlotIndex1) !== ''"
                        class="my-design-quiz-sub-block-outer pe-5"
                      >
                        <div class="my-design-quiz-sub-block rounded-4 my-bgcolor-gray-3 p-0">
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
                        </div>
                      </div>
                    </template>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div
          v-if="showDesignRightView"
          class="col-4 col-lg-3 col-xl-3 col-xxl-2 h-100 min-h-0 overflow-hidden my-bgcolor-gray-3"
        >
          <aside
            class="h-100 w-100 my-design-tab-right-view d-flex flex-column overflow-auto"
            aria-label="題目清單"
          >
            <nav
              v-if="activeTabId"
              class="my-design-right-nav nav nav-pills flex-column flex-grow-1 justify-content-start align-items-stretch gap-1 overflow-auto px-3 py-3"
              aria-label="題目清單"
            >
              <div class="my-design-right-step-heading my-font-md-400 my-color-black">
                題目
              </div>
              <div
                v-for="item in designRightQuizSubTabItems"
                :key="item.key"
                class="nav-item"
              >
                <button
                  type="button"
                  class="nav-link w-100 text-start text-break"
                  :class="{ active: item.active }"
                  :aria-current="item.active ? 'page' : undefined"
                  @click="onDesignRightQuizClick(item)"
                >
                  {{ item.label }}
                </button>
              </div>
              <div class="d-flex justify-content-center pt-2 pb-1 w-100">
                <button
                  type="button"
                  class="btn rounded-pill d-flex justify-content-center align-items-center gap-2 my-font-md-400 my-button-black px-4 py-2 w-100"
                  title="新增題目"
                  aria-label="新增題目"
                  :disabled="generateQuizBlocked || examAddQuestionSubmitting || !String(activeTabId ?? '').trim()"
                  :aria-busy="examAddQuestionSubmitting"
                  @click="openExamAddQuestionModal"
                >
                  <i class="fa-solid fa-plus" aria-hidden="true" />
                  新增題目
                </button>
              </div>
            </nav>
          </aside>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 子元件若仍帶 px-3 utility，與本頁按鈕一致改為 px-4 水平內距 */
:deep(button.btn.rounded-pill.px-3),
:deep(button.btn.rounded-2.px-3) {
  padding-left: 1.5rem !important;
  padding-right: 1.5rem !important;
}
/* 產生題目／開始批改 pill：px-4 py-2（my-font-md-400 中號） */
.my-design-pack-unit-blocks :deep(.my-design-quiz-generate-action-row .btn.my-button-white),
.my-design-quiz-sub-block :deep(.my-design-quiz-grading-start-row .btn.my-button-white),
.my-design-quiz-sub-block :deep(.my-design-quiz-grading-start-row--answer .btn.my-button-white) {
  padding-top: 0.5rem !important;
  padding-bottom: 0.5rem !important;
  padding-left: 1.5rem !important;
  padding-right: 1.5rem !important;
}
/* 左右分欄（對齊 create-exam-bank_design） */
.my-design-tab-split-layout {
  min-height: 0;
  flex: 1 1 0;
}
.my-design-tab-left-view,
.my-design-tab-right-view {
  min-width: 0;
  min-height: 0;
}
/* 右側欄：淺灰底上 scrollbar 需較深（對齊 create-exam-bank_design） */
.my-design-tab-right-view,
.my-design-right-nav {
  scrollbar-width: thin;
  scrollbar-color: var(--my-color-gray-1) var(--my-color-gray-2);
}
.my-design-tab-right-view::-webkit-scrollbar,
.my-design-right-nav::-webkit-scrollbar {
  width: var(--my-scrollbar-size);
  height: var(--my-scrollbar-size);
}
.my-design-tab-right-view::-webkit-scrollbar-track,
.my-design-right-nav::-webkit-scrollbar-track {
  background: var(--my-color-gray-2);
  border-radius: calc(var(--my-scrollbar-size) / 2);
}
.my-design-tab-right-view::-webkit-scrollbar-thumb,
.my-design-right-nav::-webkit-scrollbar-thumb {
  background-color: var(--my-color-gray-1);
  background-clip: padding-box;
  border: var(--my-scrollbar-thumb-inset) solid transparent;
  border-radius: calc(var(--my-scrollbar-size) / 2 - var(--my-scrollbar-thumb-inset));
}
.my-design-tab-right-view::-webkit-scrollbar-thumb:hover,
.my-design-right-nav::-webkit-scrollbar-thumb:hover {
  background-color: var(--my-color-black);
}
.my-design-tab-left-view-scroll {
  min-height: 0;
}
.my-design-right-step-heading {
  line-height: 1.35;
  white-space: nowrap;
  padding: 0 0.5rem;
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
.my-design-right-nav .nav-link.active,
.my-design-right-nav .nav-link.active:hover,
.my-design-right-nav .nav-link.active:focus,
.my-design-right-nav .nav-link.active:focus-visible {
  background-color: var(--my-color-white);
  color: var(--my-color-black);
}
/* 題目區主標題（對齊 create-exam-bank_design .my-design-pack-unit-main-title） */
.my-design-pack-unit-main-title {
  font-size: 1.5rem;
  font-weight: var(--my-font-weight-semibold);
  line-height: 1.35;
  color: var(--my-color-black);
  white-space: nowrap;
}
/* 題型區三子區塊：outer＝pe-5／ps-5；題目／批改＝淺灰底 gray-3；答案＝白底 */
.my-design-quiz-sub-block-outer,
.my-design-quiz-sub-block {
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  min-width: 0;
}
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
/* 稿頁區塊小標（單元／題型、設定單元題型等）不換行 */
.my-design-pack-unit-blocks .my-font-sm-400.my-color-gray-1.mb-2 {
  white-space: nowrap;
}
.my-design-quiz-field-inset__rule,
.my-design-quiz-sub-block :deep(.my-design-quiz-field-inset__rule) {
  border: 0;
  border-top: 1px solid var(--my-color-gray-2);
  opacity: 1;
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
/* 答案標題列 pill（提示、參考答案）：淺灰底 gray-3、無描邊 */
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
/* 稿頁 pill 按鈕（產生題目、開始批改等）不換行 — 對齊 create-exam-bank_design */
.my-design-pack-unit-blocks :deep(.btn.rounded-pill),
.my-design-quiz-sub-block :deep(.btn.rounded-pill) {
  white-space: nowrap;
  flex-shrink: 0;
}
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
