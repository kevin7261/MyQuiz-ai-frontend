/**
 * 建立測驗題庫「先前出題」歷史工具（純函式）
 *
 * 自 CreateExamQuizBankDetailPage 抽出的無狀態邏輯：題型「先前出題」的
 * localStorage 讀寫、歷史清單解析／去重／合併、以及錨點（rag_tab_id|rag_unit_id|
 * rag_quiz_id|出題模式）的鍵值處理。所有函式僅依賴傳入參數與 ragApi 之歷史正規化工具，
 * 不存取任何元件響應式狀態，因此可獨立測試與重用。
 */
import {
  normalizeFollowupHistoryItem,
  followupHistoryEntryFromQuizCard,
} from '../services/ragApi.js';

/** 題型「先前出題」：localStorage 備援（鍵 rag_tab_id|rag_unit_id|rag_quiz_id|出題模式；每筆含題目／答案／參考答案／批改結果） */
export const CREATE_BANK_QUIZ_HISTORY_STORAGE_PREFIX = 'myquiz:createBankQuizHistory:v1:';

export function createBankQuizHistoryStorageKey(personId) {
  const p = String(personId ?? '').trim();
  return `${CREATE_BANK_QUIZ_HISTORY_STORAGE_PREFIX}${p || 'anon'}`;
}

export function readRagQuizHistoryMap(personId) {
  try {
    const raw = localStorage.getItem(createBankQuizHistoryStorageKey(personId));
    if (!raw) return {};
    const o = JSON.parse(raw);
    const map = o?.byKey ?? o?.byRagQuizId ?? o?.by_rag_quiz_id;
    if (map && typeof map === 'object' && !Array.isArray(map)) return map;
    return {};
  } catch {
    return {};
  }
}

export function writeRagQuizHistoryMap(personId, byKey) {
  try {
    localStorage.setItem(
      createBankQuizHistoryStorageKey(personId),
      JSON.stringify({ v: 3, byKey })
    );
  } catch {
    /* private mode / quota */
  }
}

export function richQuizHistoryDedupKey(item) {
  return [
    item.quiz_content,
    item.answer_content,
    item.quiz_answer_reference,
    item.answer_critique,
  ].join('\0');
}

/** 先前出題單筆：題目／答案／參考答案／批改結果（相容舊版僅題幹字串） */
export function parseRichQuizHistoryListFromSource(source) {
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
    const key = richQuizHistoryDedupKey(normalized);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(normalized);
  }
  return out;
}

export function richQuizHistoryRichnessScore(entry) {
  if (!entry || typeof entry !== 'object') return 0;
  return (
    (String(entry.answer_content ?? '').trim() ? 4 : 0)
    + (String(entry.quiz_answer_reference ?? '').trim() ? 2 : 0)
    + (String(entry.answer_critique ?? '').trim() ? 1 : 0)
  );
}

export function mergeRichQuizHistoryLists(...sources) {
  const stemOrder = [];
  const bestByStem = new Map();
  for (const src of sources) {
    for (const entry of parseRichQuizHistoryListFromSource(src)) {
      const stem = String(entry?.quiz_content ?? '').trim();
      if (!stem) continue;
      if (!bestByStem.has(stem)) stemOrder.push(stem);
      const prev = bestByStem.get(stem);
      if (
        !prev
        || richQuizHistoryRichnessScore(entry) > richQuizHistoryRichnessScore(prev)
      ) {
        bestByStem.set(stem, entry);
      }
    }
  }
  return stemOrder.map((stem) => bestByStem.get(stem));
}

export function quizHistoryListFieldForMode(generateMode) {
  return generateMode === 'followup' ? 'quiz_followup_history_list' : 'quiz_history_list';
}

export function richHistoryFromSourceForAnchor(source, anchor) {
  if (!source) return [];
  if (Array.isArray(source)) return parseRichQuizHistoryListFromSource(source);
  if (typeof source !== 'object') return [];
  const field = quizHistoryListFieldForMode(anchor?.generate_mode ?? 'normal');
  return parseRichQuizHistoryListFromSource(source[field] ?? source);
}

export function quizHistoryAnchorKey(anchor) {
  if (!anchor) return '';
  return `${anchor.rag_tab_id}|${anchor.rag_unit_id}|${anchor.rag_quiz_id}|${anchor.generate_mode}`;
}

export function quizHistoryAnchorsEqual(a, b) {
  if (!a || !b) return false;
  return (
    a.rag_tab_id === b.rag_tab_id
    && a.rag_unit_id === b.rag_unit_id
    && a.rag_quiz_id === b.rag_quiz_id
    && a.generate_mode === b.generate_mode
  );
}

export function storedQuizHistoryForAnchor(personId, anchor) {
  const pid = String(personId ?? '').trim();
  const key = quizHistoryAnchorKey(anchor);
  if (!pid || !key) return [];
  const map = readRagQuizHistoryMap(pid);
  if (map[key] != null) return parseRichQuizHistoryListFromSource(map[key]);
  /** 舊版三 id 鍵（無出題模式）：僅一般模式沿用 */
  if (anchor.generate_mode === 'normal') {
    const legacyTriple = `${anchor.rag_tab_id}|${anchor.rag_unit_id}|${anchor.rag_quiz_id}`;
    if (legacyTriple !== key && map[legacyTriple] != null) {
      return parseRichQuizHistoryListFromSource(map[legacyTriple]);
    }
    const legacyQuizId = String(anchor.rag_quiz_id);
    if (legacyQuizId !== key && map[legacyQuizId] != null) {
      return parseRichQuizHistoryListFromSource(map[legacyQuizId]);
    }
  }
  return [];
}

export function resolveRichQuizHistoryForAnchor(personId, anchor, ...sources) {
  const parts = sources.map((src) => richHistoryFromSourceForAnchor(src, anchor));
  if (anchor) parts.push(storedQuizHistoryForAnchor(personId, anchor));
  return mergeRichQuizHistoryLists(...parts);
}

export function persistQuizHistoryForAnchor(personId, anchor, list) {
  const pid = String(personId ?? '').trim();
  const key = quizHistoryAnchorKey(anchor);
  if (!pid || !key) return;
  const normalized = parseRichQuizHistoryListFromSource(list);
  const map = readRagQuizHistoryMap(pid);
  map[key] = normalized;
  const legacyTriple = `${anchor.rag_tab_id}|${anchor.rag_unit_id}|${anchor.rag_quiz_id}`;
  if (legacyTriple !== key && map[legacyTriple] != null) {
    delete map[legacyTriple];
  }
  const legacyQuizId = String(anchor.rag_quiz_id);
  if (legacyQuizId !== key && map[legacyQuizId] != null) {
    delete map[legacyQuizId];
  }
  writeRagQuizHistoryMap(pid, map);
}

/** 合併既有歷史與新一筆問答（去重後 append） */
export function appendRichQuizHistory(existingHistory, entrySource) {
  const entry =
    normalizeFollowupHistoryItem(entrySource) ?? followupHistoryEntryFromQuizCard(entrySource);
  const base = parseRichQuizHistoryListFromSource(existingHistory);
  if (!entry?.quiz_content) return base;
  const key = richQuizHistoryDedupKey(entry);
  if (base.some((item) => richQuizHistoryDedupKey(item) === key)) return base;
  return [...base, entry];
}
