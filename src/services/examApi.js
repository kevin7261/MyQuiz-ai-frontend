/**
 * Exam 相關 API（測驗分頁更名：PUT /exam/tab/tab-name 等）
 */
import {
  API_BASE,
  API_EXAM_CREATE_QUIZ,
  API_EXAM_QUIZ_GRADE,
  API_EXAM_TAB_QUIZ_LLM_GENERATE,
  API_EXAM_UNIT_NAME,
} from '../constants/api.js';
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
 * 空白 Exam_Quiz（不呼叫 LLM）：{@link API_EXAM_CREATE_QUIZ}（OpenAPI: Exam Create Quiz）。
 * - Query（必填）：`person_id`（由 {@link loggedFetch} 第三參數 `personId` 附加於 URL）
 * - Body：`exam_tab_id`（不需上傳 rag_unit_id）
 * LLM 出題請改用 {@link apiExamTabQuizLlmGenerate}
 *
 * @param {{ exam_tab_id: string | number }} body
 * @param {string | number} personId - 同 query person_id（呼叫者）
 * @param {{ signal?: AbortSignal }} [fetchExtra] - `signal`：中止未完成之草稿請求
 */
export async function apiExamTabQuizCreate(body, personId, fetchExtra = undefined) {
  const pid = String(personId ?? '').trim();
  if (!pid) throw new Error('person_id 為必填');
  const examTabId = body?.exam_tab_id != null ? String(body.exam_tab_id).trim() : '';
  if (!examTabId) throw new Error('缺少 exam_tab_id');
  /** @type {RequestInit} */
  const init = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      exam_tab_id: examTabId,
    }),
  };
  if (fetchExtra?.signal != null) {
    init.signal = fetchExtra.signal;
  }
  const res = await loggedFetch(`${API_BASE}${API_EXAM_CREATE_QUIZ}`, init, { personId: pid });
  const text = await res.text();
  if (!res.ok) throw new Error(parseFetchError(res, text));
  return parseJson(text);
}

/**
 * 測驗 LLM 批改（非同步）：POST /exam/tab/quiz/llm-grade（Exam Grade Quiz）。
 * Body：`exam_quiz_id`、`quiz_answer`；選填 `quiz_content`。批改指引由後端自 Rag_Quiz（含 answer_user_prompt_text 等）依題目關聯讀取，**勿傳**於 body。
 * 預期 **202** 與 `job_id`；輪詢 GET `/exam/tab/quiz/grade-result/{job_id}`（見 `useQuizGrading` 之 `submitGrade`）。
 *
 * @param {{
 *   exam_quiz_id: number,
 *   quiz_answer: string,
 *   quiz_content?: string,
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
 * 測驗 LLM 出題：POST /exam/tab/quiz/llm-generate（OpenAPI：Rag LLM Generate Quiz）
 * Query：`person_id`（必填，由 {@link loggedFetch} 第三參數帶入）。
 *
 * Body：`exam_quiz_id` 必填；選填 `rag_unit_id`（正整數，無效或未選時傳 `0`）、`rag_quiz_id`；`unit_name`／`quiz_name` 僅在有非空白值時才加入 JSON（不送空字串）。
 * **勿傳** `quiz_user_prompt_text`：後端僅自 Rag_Quiz（effective `rag_quiz_id`）讀取出題補充。
 *
 * @param {{
 *   exam_quiz_id: number | string,
 *   rag_unit_id?: number | string,
 *   rag_quiz_id?: number | string,
 *   unit_name?: string,
 *   quiz_name?: string,
 * }} body
 * @returns {Promise<object>} 預期含 quiz_content、quiz_hint、quiz_reference_answer、exam_quiz_id、quiz_name、
 *   quiz_user_prompt_text（回傳）、unit_name、rag_unit_id、rag_quiz_id 等
 */
export async function apiExamTabQuizLlmGenerate(body, personId) {
  const pid = String(personId ?? '').trim();
  if (!pid) throw new Error('person_id 為必填');
  const eid = Number(body?.exam_quiz_id);
  if (!Number.isFinite(eid) || eid < 1) throw new Error('無效的 exam_quiz_id');
  const ru = body?.rag_unit_id != null && body.rag_unit_id !== '' ? Number(body.rag_unit_id) : 0;
  const ragUnitId = Number.isFinite(ru) && ru > 0 ? Math.trunc(ru) : 0;
  const rq = body?.rag_quiz_id != null && body.rag_quiz_id !== '' ? Number(body.rag_quiz_id) : 0;
  const ragQuizId = Number.isFinite(rq) && rq > 0 ? Math.trunc(rq) : 0;
  const unitNameTrim = String(body?.unit_name ?? '').trim();
  const quizNameTrim = String(body?.quiz_name ?? '').trim();
  const payload = {
    exam_quiz_id: Math.trunc(eid),
    rag_unit_id: ragUnitId,
    rag_quiz_id: ragQuizId,
  };
  if (unitNameTrim !== '') payload.unit_name = unitNameTrim;
  if (quizNameTrim !== '') payload.quiz_name = quizNameTrim;
  const res = await loggedFetch(`${API_BASE}${API_EXAM_TAB_QUIZ_LLM_GENERATE}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }, { personId: pid });
  const text = await res.text();
  if (!res.ok) throw new Error(parseFetchError(res, text));
  return parseJson(text);
}
