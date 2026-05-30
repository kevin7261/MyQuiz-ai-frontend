/**
 * RAG 列／題型「測驗用」判斷工具（純函式）
 *
 * 自 CreateExamQuizBankDetailPage 抽出的無狀態邏輯：判讀 GET /rag/tabs、
 * GET /rag/tab/units 回傳之 Rag／Rag_Unit／Rag_Quiz 列，以及本機分頁狀態（tabState）
 * 是否含「測驗用」題型。所有函式僅依賴傳入參數與 rag 工具，不存取元件響應式狀態。
 */
import { getRagUnitListString } from './rag.js';

/** 確保為數字，空字串/null/undefined/NaN 時回傳預設值 */
export function ensureNumber(val, defaultVal) {
  const n = Number(val);
  return (n === n && isFinite(n)) ? n : defaultVal;
}

export function checkRagHasMetadata(rag) {
  if (!rag || typeof rag !== 'object') return false;
  return rag.rag_metadata != null && (typeof rag.rag_metadata === 'string' ? String(rag.rag_metadata).trim() !== '' : true);
}

export function extractUnitsFromRag(rag) {
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

export function checkRagHasList(rag) {
  if (!rag || typeof rag !== 'object') return false;
  if (extractUnitsFromRag(rag).length > 0) return true;
  return getRagUnitListString(rag) !== '';
}

/** 至少一列出題單元，且每列至少一個課程標籤（與「建立單元」按鈕啟用條件一致） */
export function isPackTasksListReady(list) {
  if (!Array.isArray(list) || list.length < 1) return false;
  return list.every((g) => Array.isArray(g) && g.length >= 1);
}

/** GET /rag/tabs 列之 Rag.for_exam===true 時為試卷用（不做 system-settings 對照） */
export function ragIsForExamFromListRow(rag) {
  return !!rag?.for_exam;
}

/** GET /rag/tabs 之 quiz 列是否標為測驗用（與 buildCardFromRagQuiz 一致） */
export function ragQuizApiRowIsForExam(quiz) {
  if (!quiz || typeof quiz !== 'object') return false;
  return (
    quiz.for_exam === true
    || quiz.for_exam === 1
    || quiz.rag_quiz_for_exam === true
    || quiz.rag_quiz_for_exam === 1
  );
}

/** GET /rag/tabs、GET /rag/tab/units 之 Rag_Quiz.follow_up===true 時為追問出題 */
export function ragQuizApiRowIsFollowUp(quiz) {
  if (!quiz || typeof quiz !== 'object') return false;
  return (
    quiz.follow_up === true
    || quiz.follow_up === 1
    || quiz.followUp === true
    || quiz.followUp === 1
  );
}

/** 單元列：quizzes／quiz_list／Quizzes */
export function quizRowsFromUnitApiRow(u) {
  if (!u || typeof u !== 'object') return [];
  if (Array.isArray(u.quizzes)) return u.quizzes;
  if (Array.isArray(u.quiz_list)) return u.quiz_list;
  if (Array.isArray(u.Quizzes)) return u.Quizzes;
  return [];
}

/** GET /rag/tabs 單筆：units[] 或頂層 quizzes[] 是否含任一測驗用題型 */
export function ragListRowHasNestedForExamQuiz(rag) {
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
export function stateHasExamQuizCardsInTabState(st) {
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
export function tabStateHasAnyRagQuizForExam(tabStateMapRef, tabId) {
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
