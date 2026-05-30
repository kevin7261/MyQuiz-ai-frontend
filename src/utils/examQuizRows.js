/**
 * 測驗（Exam）題目列工具（純函式）
 *
 * 自 ExamDetailPage 抽出的無狀態邏輯：Exam_Quiz／Rag_Quiz 列的顯示名稱與題型標籤、
 * 評分值正規化、追問祖先鏈處理、以及「先前出題」歷史清單解析。所有函式僅依賴傳入參數
 * 與 ragApi 之歷史正規化工具，不存取任何元件響應式狀態。
 */
import { normalizeFollowupHistoryItem } from '../services/ragApi.js';

/** GET 回應為 404／訊息含 not found／查無 時視為「找不到」 */
export function isNotFoundLike(status, message) {
  if (Number(status) === 404) return true;
  const msg = String(message ?? '').toLowerCase();
  return msg.includes('not found') || msg.includes('查無');
}

/** Exam_Quiz.quiz_rate 僅 -1／0／1，其餘正規化為 0 */
export function normalizeExamQuizRate(v) {
  const n = Number(v);
  if (n === 1 || n === -1 || n === 0) return n;
  return 0;
}

export function examQuizNameFromPreviewRow(qz) {
  if (!qz || typeof qz !== 'object') return '';
  return String(qz.quiz_name ?? qz.title ?? '').trim();
}

export function examQuizDisplayNameFromRow(quiz) {
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

/** GET /exam/tabs、/exam/rag-for-exams 之 Exam_Quiz／Rag_Quiz.follow_up */
export function examQuizApiRowIsFollowUp(quiz) {
  if (!quiz || typeof quiz !== 'object') return false;
  return (
    quiz.follow_up === true
    || quiz.follow_up === 1
    || quiz.followUp === true
    || quiz.followUp === 1
  );
}

export function examQuizGenerateModeLabel(isFollowUp) {
  return isFollowUp ? '追問出題' : '一般出題';
}

/** 題型顯示：{quiz_name} (一般出題/追問出題) */
export function examQuizTypeDisplayLabelFromParts(name, isFollowUp) {
  const n = String(name ?? '').trim();
  if (!n) return '—';
  return `${n} (${examQuizGenerateModeLabel(!!isFollowUp)})`;
}

export function examQuizTypeDisplayLabel(quiz) {
  const name = examQuizDisplayNameFromRow(quiz) || examQuizNameFromPreviewRow(quiz);
  return examQuizTypeDisplayLabelFromParts(name, examQuizApiRowIsFollowUp(quiz));
}

export function examYoutubeLooksLikeUrl(s) {
  return /^https?:\/\//i.test(String(s ?? '').trim());
}

/**
 * 自 exam_quiz_id 沿 follow_up_exam_quiz_id 往前至 0，回傳所有祖先題（舊→新）。
 * @param {number | string} examQuizId
 * @param {Map<number, object>} quizById
 * @returns {object[]}
 */
export function examFollowupPredecessorsByExamQuizId(examQuizId, quizById) {
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

/** 合併追問祖先列時的去重鍵（exam_quiz_id 優先，否則題幹） */
export function examFollowupRowMergeKey(row) {
  if (!row || typeof row !== 'object') return '';
  const id = Number(row.exam_quiz_id ?? row.quiz_id);
  if (Number.isFinite(id) && id >= 1) return `id:${Math.trunc(id)}`;
  const stem = String(row.quiz_content ?? row.quiz ?? '').trim();
  return stem ? `stem:${stem}` : '';
}

/** 合併 DB 祖先鏈與 slot.followupRounds（舊→新、去重；繼續追問快照在 GET 鏈未就緒時仍可顯示） */
export function mergeExamFollowupPredecessorRows(fromDb, localRounds) {
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

export function examRichQuizHistoryDedupKey(entry) {
  return [
    entry.quiz_content,
    entry.answer_content,
    entry.quiz_answer_reference,
    entry.answer_critique,
  ].join('\0');
}

/** 先前出題單筆：題目／答案／參考答案／批改結果（相容舊版僅題幹字串） */
export function parseExamRichQuizHistoryListFromSource(source) {
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
