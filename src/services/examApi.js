/**
 * Exam 相關 API（測驗分頁更名：PUT /exam/tab/tab-name 等）
 */
import { API_BASE, API_EXAM_UNIT_NAME } from '../constants/api.js';
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
