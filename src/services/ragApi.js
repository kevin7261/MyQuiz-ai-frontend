/**
 * RAG 相關 API 呼叫，集中管理以減少重複程式碼。
 */
import { API_BASE, API_CREATE_RAG, API_UPLOAD_ZIP, API_BUILD_RAG_ZIP, API_GENERATE_QUIZ, API_RAG_FOR_EXAM } from '../constants/api.js';
import { parseFetchError } from '../utils/apiError.js';

/** 檢查 person_id，回傳 null 表示未登入，否則回傳 personId 字串 */
export function getPersonId(authStore) {
  const id = authStore.user?.person_id;
  if (id == null || String(id).trim() === '') return null;
  return String(id);
}

/** 解析 JSON，失敗時回傳 null */
function parseJson(text) {
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

/** POST /rag/create-rag */
export async function apiCreateRag(personId, ragTabId, ragName) {
  const res = await fetch(`${API_BASE}${API_CREATE_RAG}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rag_tab_id: ragTabId, person_id: personId, rag_name: ragName }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(parseFetchError(res, text));
  return parseJson(text);
}

/** POST /rag/upload-zip */
export async function apiUploadZip(file, ragTabId, personId) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('rag_tab_id', String(ragTabId));
  formData.append('person_id', String(personId));
  const res = await fetch(`${API_BASE}${API_UPLOAD_ZIP}`, {
    method: 'POST',
    body: formData,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status}: ${parseFetchError(res, text)}`);
  return parseJson(text);
}

/** POST /rag/delete/{rag_tab_id} */
export async function apiDeleteRag(ragTabId, personId) {
  const res = await fetch(`${API_BASE}/rag/delete/${encodeURIComponent(String(ragTabId))}`, {
    method: 'POST',
    headers: { 'X-Person-Id': String(personId) },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(parseFetchError(res, text));
  }
}

/** PATCH /rag/for-exam/{rag_tab_id} */
export async function apiSetRagForExam(ragTabId, personId) {
  const res = await fetch(`${API_BASE}${API_RAG_FOR_EXAM}/${encodeURIComponent(String(ragTabId))}`, {
    method: 'PATCH',
    headers: { 'X-Person-Id': String(personId) },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(parseFetchError(res, text));
  }
}

/** POST /rag/build-rag-zip */
export async function apiBuildRagZip(body) {
  const res = await fetch(`${API_BASE}${API_BUILD_RAG_ZIP}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(parseFetchError(res, text));
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
}

/** POST /rag/generate-quiz */
export async function apiGenerateQuiz(ragId, ragTabId, quizLevel) {
  const res = await fetch(`${API_BASE}${API_GENERATE_QUIZ}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      rag_id: Number(ragId) || 0,
      rag_tab_id: Number(ragTabId) || 0,
      quiz_level: quizLevel >= 0 ? quizLevel : 0,
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const errBody = JSON.parse(text);
      msg = errBody.detail ? JSON.stringify(errBody.detail) : msg;
    } catch {
      if (text) msg = text;
    }
    throw new Error(msg);
  }
  return parseJson(text);
}

/** 判斷是否為 504 / Failed to fetch 錯誤 */
export function is504OrNetworkError(err) {
  return err?.message?.includes('504') || (err?.name === 'TypeError' && err?.message?.includes('Failed to fetch'));
}
