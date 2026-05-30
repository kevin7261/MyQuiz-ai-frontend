/**
 * 試卷題卡／追問鏈工具（純函式）
 *
 * 自 ExamDetailPage 抽出的無狀態邏輯：作答是否含批改證據、follow_up 巢狀作答補回、
 * 依 exam_quiz_id 建立題目索引、沿 follow_up_quiz 走訪追問鏈。所有函式僅依賴傳入參數與
 * grading／rag 工具，不存取任何元件響應式狀態。
 */
import { formatGradingResult } from './grading.js';
import {
  mergeQuizzesWithTopLevelAnswers,
  examQuizChainFromRoot,
  examOrRagQuizRowKey,
} from './rag.js';

/** 試卷／Exam_Quiz 列上顯示用題名（rag-for-exams、GET /exam/tabs 與 llm-generate 回傳之 quiz_name） */
/**
 * latestAnswer 是否含有真實批改資料（quiz_score／quiz_comments／answer_metadata）。
 * 若只有 answer_content（作答但未批改），回傳 false，避免誤設 confirmed 與 gradingResult。
 */
export function answerHasGradingEvidence(ans) {
  if (!ans) return false;
  const score = ans.quiz_score;
  if (score != null && String(score).trim() !== '') return true;
  const comments = ans.quiz_comments;
  if (Array.isArray(comments) && comments.some((c) => c != null && String(c).trim() !== '')) return true;
  if (ans.answer_critique != null && String(ans.answer_critique).trim() !== '') return true;
  if (ans.answer_metadata != null && String(ans.answer_metadata).trim() !== '') return true;
  if (ans.answer_feedback_metadata != null && String(ans.answer_feedback_metadata).trim() !== '') return true;
  return false;
}

/**
 * 若 follow_up_quiz 巢狀節點缺 answers 陣列，從嵌入欄位（answer_content／quiz_score／answer_critique）補回，
 * 讓 buildCardFromExamQuiz 可正常讀取 gradingResult。
 */
export function normalizeFollowupQuizAnswers(q) {
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
export function buildExamQuizByIdMapForExam(exam) {
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
 * 沿 follow_up_quiz 鏈走到底：
 * API 鏈方向：頂層 quiz 為最舊題目，follow_up_quiz 往較新方向串接（舊→新，exam_quiz_id 遞增）。
 * 例：Q1（最舊，頂層）→ follow_up_quiz → Q2 → Q3 → Q4（最新，鏈尾）
 *
 * 處理：
 * - 鏈尾（最新）= activeQuiz（當前槽位可作答之卡片）
 * - 頂層至鏈尾前一段 = followupRounds（舊→新順序顯示）
 */
export function buildFollowupChain(quiz) {
  const chain = [];
  let current = quiz;
  while (current) {
    chain.push(current);
    current = current.follow_up_quiz;
  }
  if (chain.length <= 1) {
    return { rounds: [], activeQuiz: quiz };
  }
  const activeQuiz = normalizeFollowupQuizAnswers(chain[chain.length - 1]);
  const rounds = chain.slice(0, -1).map((q) => normalizeFollowupQuizAnswers(q));
  return { rounds, activeQuiz };
}
