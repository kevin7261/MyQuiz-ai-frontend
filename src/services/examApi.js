/**
 * Exam 相關 API 呼叫模組
 *
 * 集中封裝測驗分頁的建立與管理操作，包含：
 * - 分頁更名：PUT /exam/tab/tab-name
 * - 空白題目建立：POST /exam/tab/quiz/create
 * - LLM 批改（非同步）：POST /exam/tab/quiz/llm-grade（回傳 202 + job_id，需輪詢）
 * - LLM 出題：POST /exam/tab/quiz/llm-generate、追問 POST /exam/tab/quiz/llm-generate-followup
 * - 建立並出題：POST /exam/tab/quiz/create-llm-generate、追問 POST /exam/tab/quiz/create-llm-generate-followup
 *
 * 使用 loggedFetch；錯誤時以 parseFetchError 解析並 throw Error，供呼叫端 catch 顯示。
 */
import {
  API_BASE,
  API_EXAM_QUIZ_GRADE,
  API_EXAM_TAB_QUIZ_LLM_GENERATE,
  API_EXAM_TAB_QUIZ_CREATE_LLM_GENERATE,
  API_EXAM_TAB_QUIZ_LLM_GENERATE_FOLLOWUP,
  API_EXAM_TAB_QUIZ_CREATE_LLM_GENERATE_FOLLOWUP,
  API_EXAM_UNIT_NAME,
} from '../constants/api.js';
import { normalizeFollowupHistoryItem } from './ragApi.js';
import { parseFetchError } from '../utils/apiError.js';
import { loggedFetch } from '../utils/loggedFetch.js';

function parseJson(text) {
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

/**
 * 字串型歷史去重：trim、過濾空字串、Set 去重
 * @param {unknown[]} [list]
 * @returns {string[]}
 */
function deduplicateStringHistory(list) {
  if (!Array.isArray(list)) return [];
  return [
    ...new Set(
      list
        .map((s) => String(s ?? '').trim())
        .filter((s) => s !== ''),
    ),
  ];
}

/**
 * 物件型追問歷史去重：以 normalizeFollowupHistoryItem 正規化後，依四個欄位 key 去重
 * @param {unknown[]} [list]
 * @returns {object[]}
 */
function deduplicateFollowupHistory(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  return list.reduce((acc, item) => {
    const normalized = normalizeFollowupHistoryItem(item);
    if (!normalized) return acc;
    const key = [
      normalized.quiz_content,
      normalized.answer_content,
      normalized.quiz_answer_reference,
      normalized.answer_critique,
    ].join('\0');
    if (seen.has(key)) return acc;
    seen.add(key);
    acc.push(normalized);
    return acc;
  }, []);
}

/**
 * 更新測驗分頁名稱：PUT /exam/tab/tab-name（以 exam_id 比對，僅 deleted=false）
 * @param {string | number} examId - Exam 主鍵
 * @param {string} tabName
 * @returns {Promise<object>} exam_id、exam_tab_id、person_id、tab_name、updated_at
 */
export async function apiUpdateExamTabName(examId, tabName) {
  const eid = Number(examId);
  if (!Number.isInteger(eid) || eid < 1) {
    throw new Error('無效的 exam_id（須為正整數）');
  }
  const res = await loggedFetch(`${API_BASE}${API_EXAM_UNIT_NAME}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      exam_id: eid,
      tab_name: String(tabName).trim(),
    }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(parseFetchError(res, text));
  return parseJson(text);
}

/**
 * 測驗 LLM 批改（非同步）：POST /exam/tab/quiz/llm-grade（Exam Grade Quiz）。
 * Body：`exam_quiz_id`、`quiz_content`（字串，可空字串）、`quiz_answer`。以 `exam_quiz_id` 定位題目；RAG+LLM 非同步評分；`unit_type` 2／3／4 改 transcript 純 LLM 批改；完成後更新 Exam_Quiz.answer_content／answer_critique。回傳 **202** + `job_id`；輪詢 GET `/exam/tab/quiz/grade-result/{job_id}`。
 * 批改指引由後端讀取，**勿傳**於 body。
 *
 * @param {{
 *   exam_quiz_id: number,
 *   quiz_content: string,
 *   quiz_answer: string,
 * }} gradeBody
 * @param {string} [submissionPath] - 預設 `API_EXAM_QUIZ_GRADE`（`/exam/tab/quiz/llm-grade`）；與 `submitGrade` 之 `quizGradeSubmissionPath` 一致時傳入
 * @returns {Promise<{ res: Response, text: string }>}
 */
export async function apiExamTabQuizLlmGrade(gradeBody, submissionPath) {
  const p =
    typeof submissionPath === 'string' && submissionPath.trim() !== ''
      ? submissionPath.trim()
      : API_EXAM_QUIZ_GRADE;
  const res = await loggedFetch(`${API_BASE}${p}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(gradeBody),
  });
  const text = await res.text();
  return { res, text };
}

/**
 * 建立 Exam_Quiz 並 LLM 出題：POST /exam/tab/quiz/create-llm-generate（body 不需 exam_quiz_id）
 * @param {{
 *   exam_tab_id: string,
 *   rag_quiz_id: number | string,
 *   rag_tab_id: string,
 *   rag_unit_id: number | string,
 *   quiz_history_list?: string[],
 * }} body
 * @param {string | number} personId
 * @returns {Promise<object>}
 */
export async function apiExamTabQuizCreateLlmGenerate(body, personId) {
  const pid = String(personId ?? '').trim();
  if (!pid) throw new Error('person_id 為必填');
  const examTabId = body?.exam_tab_id != null ? String(body.exam_tab_id).trim() : '';
  if (!examTabId) throw new Error('缺少 exam_tab_id');
  const ru = body?.rag_unit_id != null && body.rag_unit_id !== '' ? Number(body.rag_unit_id) : NaN;
  const ragUnitId = Number.isFinite(ru) && ru > 0 ? Math.trunc(ru) : 0;
  const rq = body?.rag_quiz_id != null && body.rag_quiz_id !== '' ? Number(body.rag_quiz_id) : NaN;
  const ragQuizId = Number.isFinite(rq) && rq > 0 ? Math.trunc(rq) : 0;
  if (ragUnitId < 1 || ragQuizId < 1) {
    throw new Error('create-llm-generate 須提供有效的 rag_unit_id、rag_quiz_id（正整數）');
  }
  const ragTabId = String(body?.rag_tab_id ?? '').trim();
  if (!ragTabId) throw new Error('create-llm-generate 須提供 rag_tab_id');
  const history = deduplicateStringHistory(body?.quiz_history_list);
  const payload = {
    exam_tab_id: examTabId,
    rag_tab_id: ragTabId,
    rag_unit_id: ragUnitId,
    rag_quiz_id: ragQuizId,
    quiz_history_list: history,
  };
  const res = await loggedFetch(`${API_BASE}${API_EXAM_TAB_QUIZ_CREATE_LLM_GENERATE}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }, { personId: pid });
  const text = await res.text();
  if (!res.ok) throw new Error(parseFetchError(res, text));
  return parseJson(text);
}

/**
 * 建立 Exam_Quiz 並追問出題：POST /exam/tab/quiz/create-llm-generate-followup
 * @param {{
 *   exam_tab_id: string,
 *   rag_quiz_id: number | string,
 *   rag_tab_id: string,
 *   rag_unit_id: number | string,
 *   follow_up_exam_quiz_id: number | string,
 *   quiz_history_list?: { quiz_content: string, answer_content: string, quiz_answer_reference?: string, answer_critique?: string }[],
 * }} body
 * @param {string | number} personId
 * @returns {Promise<object>} 新版回傳 { exams: Exam[], count }（與 GET /exam/tabs 每筆相同；quizzes[] 可含 follow_up_quiz 鏈）；舊版為單筆 Exam_Quiz 扁平物件
 */
export async function apiExamTabQuizCreateLlmGenerateFollowup(body, personId) {
  const pid = String(personId ?? '').trim();
  if (!pid) throw new Error('person_id 為必填');
  const examTabId = body?.exam_tab_id != null ? String(body.exam_tab_id).trim() : '';
  if (!examTabId) throw new Error('缺少 exam_tab_id');
  const hasFollowUpId =
    body?.follow_up_exam_quiz_id != null && body.follow_up_exam_quiz_id !== '';
  const fuRaw = Number(body?.follow_up_exam_quiz_id);
  const followUpExamQuizId =
  body?.follow_up_exam_quiz_id === 0 || body?.follow_up_exam_quiz_id === '0'
    ? 0
    : hasFollowUpId && Number.isFinite(fuRaw) && fuRaw >= 0
      ? Math.trunc(fuRaw)
      : 0;
  const ru = body?.rag_unit_id != null && body.rag_unit_id !== '' ? Number(body.rag_unit_id) : NaN;
  const ragUnitId = Number.isFinite(ru) && ru > 0 ? Math.trunc(ru) : 0;
  const rq = body?.rag_quiz_id != null && body.rag_quiz_id !== '' ? Number(body.rag_quiz_id) : NaN;
  const ragQuizId = Number.isFinite(rq) && rq > 0 ? Math.trunc(rq) : 0;
  if (ragUnitId < 1 || ragQuizId < 1) {
    throw new Error('create-llm-generate-followup 須提供有效的 rag_unit_id、rag_quiz_id（正整數）');
  }
  const ragTabId = String(body?.rag_tab_id ?? '').trim();
  if (!ragTabId) throw new Error('create-llm-generate-followup 須提供 rag_tab_id');
  const history = deduplicateFollowupHistory(body?.quiz_history_list);
  const payload = {
    exam_tab_id: examTabId,
    rag_tab_id: ragTabId,
    rag_unit_id: ragUnitId,
    rag_quiz_id: ragQuizId,
    follow_up_exam_quiz_id: followUpExamQuizId,
    quiz_history_list: history,
  };
  const res = await loggedFetch(`${API_BASE}${API_EXAM_TAB_QUIZ_CREATE_LLM_GENERATE_FOLLOWUP}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }, { personId: pid });
  const text = await res.text();
  if (!res.ok) throw new Error(parseFetchError(res, text));
  return parseJson(text);
}

/**
 * 測驗 LLM 出題：POST /exam/tab/quiz/llm-generate（OpenAPI：Rag LLM Generate Quiz）
 * Query：`person_id`（必填，由 {@link loggedFetch} 第三參數帶入）。
 *
 * Body 欄位順序（對應 DB）：`exam_quiz_id`、`rag_tab_id`、`rag_unit_id`、`rag_quiz_id`、`quiz_history_list`（皆必填除 history 可 []）。三 RAG 鍵須對應同一 Tab。勿傳出題／批改提示文字。
 *
 * @param {{
 *   exam_quiz_id: number | string,
 *   rag_quiz_id: number | string,
 *   rag_tab_id: string,
 *   rag_unit_id: number | string,
 *   quiz_history_list?: string[],
 * }} body
 * @returns {Promise<object>} 預期含 quiz_content、quiz_hint、quiz_answer_reference／quiz_reference_answer、exam_quiz_id、quiz_name、
 *   quiz_user_prompt_text／answer_user_prompt_text（回傳，後端自 Rag_Quiz 寫入之模板快照）、unit_name、rag_unit_id、rag_quiz_id 等
 */
export async function apiExamTabQuizLlmGenerate(body, personId) {
  const pid = String(personId ?? '').trim();
  if (!pid) throw new Error('person_id 為必填');
  const eid = Number(body?.exam_quiz_id);
  if (!Number.isFinite(eid) || eid < 1) throw new Error('無效的 exam_quiz_id');
  const ru = body?.rag_unit_id != null && body.rag_unit_id !== '' ? Number(body.rag_unit_id) : NaN;
  const ragUnitId = Number.isFinite(ru) && ru > 0 ? Math.trunc(ru) : 0;
  const rq = body?.rag_quiz_id != null && body.rag_quiz_id !== '' ? Number(body.rag_quiz_id) : NaN;
  const ragQuizId = Number.isFinite(rq) && rq > 0 ? Math.trunc(rq) : 0;
  if (ragUnitId < 1 || ragQuizId < 1) {
    throw new Error('llm-generate 須提供有效的 rag_unit_id、rag_quiz_id（正整數）');
  }
  const ragTabId = String(body?.rag_tab_id ?? '').trim();
  if (!ragTabId) throw new Error('llm-generate 須提供 rag_tab_id');
  const history = deduplicateStringHistory(body?.quiz_history_list);
  const payload = {
    exam_quiz_id: Math.trunc(eid),
    rag_tab_id: ragTabId,
    rag_unit_id: ragUnitId,
    rag_quiz_id: ragQuizId,
    quiz_history_list: history,
  };
  const res = await loggedFetch(`${API_BASE}${API_EXAM_TAB_QUIZ_LLM_GENERATE}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }, { personId: pid });
  const text = await res.text();
  if (!res.ok) throw new Error(parseFetchError(res, text));
  return parseJson(text);
}

/**
 * 測驗 LLM 追問出題：POST /exam/tab/quiz/llm-generate-followup。
 * Query：`person_id`、`course_id`（必填，由 {@link loggedFetch} 帶入）。
 *
 * @param {{
 *   exam_quiz_id: number | string,
 *   rag_quiz_id: number | string,
 *   rag_tab_id: string,
 *   rag_unit_id: number | string,
 *   follow_up_exam_quiz_id: number | string,
 *   quiz_history_list?: { quiz_content: string, answer_content: string, quiz_answer_reference?: string, answer_critique?: string }[],
 * }} body
 * @param {string | number} personId
 * @returns {Promise<object>} 新版回傳 { exams: Exam[], count }；舊版為單筆 Exam_Quiz 扁平物件
 */
export async function apiExamTabQuizLlmGenerateFollowup(body, personId) {
  const pid = String(personId ?? '').trim();
  if (!pid) throw new Error('person_id 為必填');
  const eid = Number(body?.exam_quiz_id);
  if (!Number.isFinite(eid) || eid < 1) throw new Error('無效的 exam_quiz_id');
  const fu = Number(body?.follow_up_exam_quiz_id);
  if (!Number.isFinite(fu) || fu < 1) {
    throw new Error('追問出題須提供有效的 follow_up_exam_quiz_id');
  }
  const ru = body?.rag_unit_id != null && body.rag_unit_id !== '' ? Number(body.rag_unit_id) : NaN;
  const ragUnitId = Number.isFinite(ru) && ru > 0 ? Math.trunc(ru) : 0;
  const rq = body?.rag_quiz_id != null && body.rag_quiz_id !== '' ? Number(body.rag_quiz_id) : NaN;
  const ragQuizId = Number.isFinite(rq) && rq > 0 ? Math.trunc(rq) : 0;
  if (ragUnitId < 1 || ragQuizId < 1) {
    throw new Error('llm-generate-followup 須提供有效的 rag_unit_id、rag_quiz_id（正整數）');
  }
  const ragTabId = String(body?.rag_tab_id ?? '').trim();
  if (!ragTabId) throw new Error('llm-generate-followup 須提供 rag_tab_id');
  const history = deduplicateFollowupHistory(body?.quiz_history_list);
  const payload = {
    exam_quiz_id: Math.trunc(eid),
    rag_tab_id: ragTabId,
    rag_unit_id: ragUnitId,
    rag_quiz_id: ragQuizId,
    follow_up_exam_quiz_id: Math.trunc(fu),
    quiz_history_list: history,
  };
  const res = await loggedFetch(`${API_BASE}${API_EXAM_TAB_QUIZ_LLM_GENERATE_FOLLOWUP}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }, { personId: pid });
  const text = await res.text();
  if (!res.ok) throw new Error(parseFetchError(res, text));
  return parseJson(text);
}
