/**
 * RAG 題庫題卡／題型列工具（純函式）
 *
 * 自 CreateExamQuizBankDetailPage 抽出的無狀態邏輯：題型顯示名稱、軟刪判斷、for_exam
 * 標記與規則檢查、出題提示擷取、rag_quiz_id 取值與排序、唯讀「設定單元」欄位顯示等。
 * 所有函式僅依賴傳入參數與 rag 常數／工具，不存取任何元件響應式狀態。
 */
import {
  UNIT_TYPE_RAG,
  UNIT_TYPE_TEXT,
  UNIT_TYPE_MP3,
  UNIT_TYPE_YOUTUBE,
  DEFAULT_PACK_CHUNK_SIZE,
  DEFAULT_PACK_CHUNK_OVERLAP,
} from './rag.js';
import { ensureNumber, ragQuizApiRowIsFollowUp } from './ragExamRows.js';

/** 題型未命名時的顯示名稱（Rag_Quiz.quiz_name 缺漏時的預設） */
export const DEFAULT_UNIT_QUIZ_DISPLAY_NAME = '未命名題型';

export function youtubeUrlFromUnitUrlResponse(data) {
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

/** 題型 sub-tab 顯示文字：有題名用題名，否則預設「未命名題型」（不顯示題型編號） */
export function quizTypeTabLabel(row) {
  const n = String(row?.quizName ?? '').trim();
  if (n) return n;
  return DEFAULT_UNIT_QUIZ_DISPLAY_NAME;
}

/** 後端軟刪或未同步清單時，題型列可能仍帶 deleted／deleted_at */
export function isRagQuizRowDeleted(row) {
  if (!row || typeof row !== 'object') return false;
  if (row.deleted === true || row.deleted === 1 || String(row.deleted).toLowerCase() === 'true') {
    return true;
  }
  if (row.is_deleted === true || row.is_deleted === 1) return true;
  const at = row.deleted_at ?? row.deletedAt;
  return at != null && String(at).trim() !== '';
}

export function unitStackRowMatchesRagUnitId(row, ragUnitId) {
  if (!Number.isFinite(ragUnitId) || ragUnitId <= 0 || !Array.isArray(row)) return false;
  for (const c of row) {
    if (isRagQuizRowDeleted(c)) continue;
    const ru = Number(c?.rag_unit_id);
    if (Number.isFinite(ru) && ru === ragUnitId) return true;
  }
  return false;
}

/** quiz_content（card.quiz）為空與否：出題規則欄皆為編輯器；空白列顯示「產生題目」等仍用此判斷（不依賴 showGenerateForm／草稿對齊；多筆各自綁 quizUserPromptText） */
export function quizRowQuizEmpty(card) {
  return !String(card?.quiz ?? '').trim();
}

/** 題卡已標為試卷／測驗用 Rag_Quiz.for_exam */
export function isRagQuizMarkedForExam(card) {
  if (!card || typeof card !== 'object') return false;
  return card.rag_quiz_for_exam === true || card.rag_quiz_for_exam === 1;
}

/** 出題規則與批改規則皆已有內容（trim 後非空） */
export function hasRagQuizPromptRulesForExam(card) {
  if (!card || typeof card !== 'object') return false;
  return (
    String(card.quizUserPromptText ?? '').trim() !== ''
    && String(card.gradingPrompt ?? '').trim() !== ''
  );
}

export function extractQuizUserPromptText(raw) {
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

export function sortUnitQuizCardsByRagQuizId(list) {
  const arr = Array.isArray(list) ? [...list] : [];
  return arr.sort((a, b) => {
    const ia = positiveRagQuizIdFromQuizRow(a);
    const ib = positiveRagQuizIdFromQuizRow(b);
    return (Number.isFinite(ia) ? ia : 0) - (Number.isFinite(ib) ? ib : 0);
  });
}

/** 唯讀「設定單元」：RAG 分段參數顯示在與類型／來源檔同列（不外層縮排） */
export function quizBankReadonlyOutlineChunkFields(ragChunkSize, ragChunkOverlap) {
  return [
    { label: '分段長度（字元）', value: String(ensureNumber(ragChunkSize, DEFAULT_PACK_CHUNK_SIZE)) },
    { label: '分段重疊（字元）', value: String(ensureNumber(ragChunkOverlap, DEFAULT_PACK_CHUNK_OVERLAP)) },
  ];
}

/** 唯讀「設定單元」：來源檔一行（與單元 tab 欄位對齊） */
export function quizBankReadonlySourceDisplay(tab) {
  if (!tab || typeof tab !== 'object') return '';
  const ut = Number(tab.unitType ?? UNIT_TYPE_RAG);
  if (ut === UNIT_TYPE_TEXT) return String(tab.textFileName ?? '').trim();
  if (ut === UNIT_TYPE_MP3) return String(tab.mp3FileName ?? '').trim();
  if (ut === UNIT_TYPE_YOUTUBE) return String(tab.youtubeUrl ?? '').trim();
  if (ut === UNIT_TYPE_RAG) return String(tab.filename ?? '').trim();
  return '';
}

/** 正整數 rag_quiz_id（字串數字相容） */
export function parsePositiveQuizId(raw) {
  if (raw == null || raw === '') return null;
  if (typeof raw === 'boolean') return null;
  const n =
    typeof raw === 'number'
      ? raw
      : Number(typeof raw === 'string' ? raw.trim() : raw);
  if (!Number.isFinite(n) || n < 1) return null;
  return Math.floor(n);
}

/** 側欄題目數：僅依題卡 follow_up／quizGenerateMode，不沿用單元 slot 出題模式（避免同單元多題型誤判） */
export function isQuizCardFollowupModeForCount(quizCardRow) {
  if (!quizCardRow || typeof quizCardRow !== 'object') return false;
  if (quizCardRow.quizGenerateMode === 'followup') return true;
  if (quizCardRow.quizGenerateMode === 'normal') return false;
  return ragQuizApiRowIsFollowUp(quizCardRow);
}

/** 自題目列／題卡取下正整數 rag_quiz_id（llm-generate 錨點；相容後端別名） */
export function positiveRagQuizIdFromQuizRow(quizOrCard) {
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
export function positiveRagQuizIdFromCard(card) {
  const direct = positiveRagQuizIdFromQuizRow(card);
  if (direct != null) return direct;
  const gj = card?.generateQuizResponseJson;
  if (gj != null && typeof gj === 'object') return positiveRagQuizIdFromQuizRow(gj);
  return null;
}
