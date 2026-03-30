/**
 * 與原生 fetch 相同介面；取得最終回應後在 console 輸出 method、URL、status 與 body（可解析為 JSON 則顯示物件）。
 *
 * 所有指向 API_BASE 的 URL 會自動附加 query `person_id`（與後端 OpenAPI 一致）：優先使用 authStore.user.person_id，
 * 缺則 fallback user_id／id（與 ExamPage getCurrentPersonId 一致）。登入前可傳第三參數 `{ personId }` 覆寫。
 *
 * 若回應為 HTTP 500，會間隔延遲後重試同一請求（含 POST body），直到 status 不再是 500（通常為 200）。
 * 注意：開發者工具 Network／Console 仍可能對每次失敗的請求顯示紅字，此為瀏覽器行為，無法由前端關閉。
 */
/* eslint-disable no-console */

import { getActivePinia } from 'pinia';
import { API_BASE } from '../constants/api.js';
import { useAuthStore } from '../stores/authStore.js';

const RETRY_500_DELAY_MS = 2000;

/**
 * @returns {string | null}
 */
function getPersonIdForQuery() {
  try {
    if (!getActivePinia()) return null;
    const u = useAuthStore().user;
    if (!u) return null;
    const pid = u.person_id;
    if (pid != null && String(pid).trim() !== '') return String(pid).trim();
    const uid = u.user_id ?? u.id;
    if (uid != null && String(uid).trim() !== '') return String(uid).trim();
    return null;
  } catch {
    return null;
  }
}

/**
 * @param {string} urlString
 * @param {string | null | undefined} overridePersonId
 * @returns {string}
 */
function mergePersonIdQuery(urlString, overridePersonId) {
  if (typeof urlString !== 'string' || !urlString.startsWith(API_BASE)) return urlString;

  let personId = null;
  if (overridePersonId != null && String(overridePersonId).trim() !== '') {
    personId = String(overridePersonId).trim();
  } else {
    personId = getPersonIdForQuery();
  }
  if (!personId) return urlString;

  const u = new URL(urlString);
  u.searchParams.set('person_id', personId);
  return u.toString();
}

/**
 * @param {RequestInfo | URL} input
 * @param {RequestInit} [init]
 * @param {{ personId?: string | null }} [fetchOptions] - 例如 POST /user/login 時 store 尚無 user，傳表單 person_id
 * @returns {Promise<Response>}
 */
export async function loggedFetch(input, init, fetchOptions) {
  const mergedInput =
    typeof input === 'string' ? mergePersonIdQuery(input, fetchOptions?.personId) : input;

  const method = (init && init.method) || 'GET';
  const url = typeof mergedInput === 'string' ? mergedInput : String(mergedInput.url);

  let res = await fetch(mergedInput, init);
  while (res.status === 500) {
    await new Promise((r) => setTimeout(r, RETRY_500_DELAY_MS));
    res = await fetch(mergedInput, init);
  }

  let bodyLog;
  try {
    const text = await res.clone().text();
    if (text === '') bodyLog = text;
    else {
      try {
        bodyLog = JSON.parse(text);
      } catch {
        bodyLog = text;
      }
    }
  } catch (e) {
    bodyLog = `(無法讀取 body: ${e?.message ?? e})`;
  }
  console.log('[API response]', { method, url, status: res.status, ok: res.ok, body: bodyLog });
  return res;
}
