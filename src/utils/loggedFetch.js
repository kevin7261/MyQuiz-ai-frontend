/**
 * 與原生 fetch 相同介面；取得最終回應後在 console 輸出 method、URL、status 與 body（可解析為 JSON 則顯示物件）。
 *
 * 所有指向 API_BASE 的 URL 會自動附加 query（與後端 OpenAPI 一致）：
 * - person_id：優先 authStore.user.person_id，缺則 fallback user_id／id；登入前可傳 `{ personId }` 覆寫
 * - course_id、course_name：來自 authStore.currentCourse；登入／選課前可傳 `{ omitCourseQuery: true }` 略過
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
 * @returns {{ course_id: number | string, course_name: string } | null}
 */
function getCourseForQuery() {
  try {
    if (!getActivePinia()) return null;
    const c = useAuthStore().currentCourse;
    if (!c) return null;
    if (c.course_id == null) return null;
    return {
      course_id: c.course_id,
      course_name: c.course_name != null ? String(c.course_name) : '',
    };
  } catch {
    return null;
  }
}

/**
 * @param {string} urlString
 * @returns {{ u: URL, inputWasRelative: boolean } | null}
 */
function parseApiUrl(urlString) {
  if (typeof urlString !== 'string' || !API_BASE) return null;

  const baseTrim = String(API_BASE).replace(/\/$/, '');
  let baseOrigin;
  try {
    baseOrigin = new URL(baseTrim).origin;
  } catch {
    baseOrigin = null;
  }

  let u;
  let inputWasRelative = false;
  try {
    if (/^https?:\/\//i.test(urlString)) {
      u = new URL(urlString);
    } else if (urlString.startsWith('/')) {
      if (typeof window === 'undefined' || !window.location?.origin) return null;
      u = new URL(urlString, window.location.origin);
      inputWasRelative = true;
    } else {
      return null;
    }
  } catch {
    return null;
  }

  const p = u.pathname;
  const isApiPath =
    p.startsWith('/english_system') ||
    p.startsWith('/rag') ||
    p.startsWith('/user/') ||
    p.startsWith('/exam/') ||
    p.startsWith('/system-settings') ||
    p.startsWith('/person-analysis') ||
    p.startsWith('/course-analysis') ||
    p.startsWith('/log/') ||
    p.startsWith('/api');

  if (!isApiPath) return null;

  const abs = u.toString();
  const sameApiHost = baseOrigin != null && u.origin === baseOrigin;
  const sameDevOrigin =
    typeof process !== 'undefined' &&
    process.env.NODE_ENV === 'development' &&
    typeof window !== 'undefined' &&
    inputWasRelative &&
    baseOrigin === window.location.origin;
  const startsWithConfiguredBase = abs.startsWith(baseTrim);

  if (!startsWithConfiguredBase && !sameApiHost && !sameDevOrigin) return null;

  return { u, inputWasRelative };
}

/**
 * @param {string} urlString
 * @param {{ personId?: string | null, courseId?: number | string | null, courseName?: string | null, omitPersonIdQuery?: boolean, omitCourseQuery?: boolean }} [fetchOptions]
 * @returns {string}
 */
function mergeApiQuery(urlString, fetchOptions) {
  const parsed = parseApiUrl(urlString);
  if (!parsed) return urlString;

  const { u, inputWasRelative } = parsed;

  if (!fetchOptions?.omitPersonIdQuery) {
    let personId = null;
    if (fetchOptions?.personId != null && String(fetchOptions.personId).trim() !== '') {
      personId = String(fetchOptions.personId).trim();
    } else {
      personId = getPersonIdForQuery();
    }
    if (personId) u.searchParams.set('person_id', personId);
  }

  if (!fetchOptions?.omitCourseQuery) {
    let courseId = fetchOptions?.courseId;
    let courseName = fetchOptions?.courseName;
    if (courseId == null || courseName == null) {
      const course = getCourseForQuery();
      if (course) {
        if (courseId == null) courseId = course.course_id;
        if (courseName == null) courseName = course.course_name;
      }
    }
    if (courseId != null && String(courseId).trim() !== '') {
      u.searchParams.set('course_id', String(courseId).trim());
    }
    if (courseName != null && String(courseName).trim() !== '') {
      u.searchParams.set('course_name', String(courseName).trim());
    }
  }

  if (inputWasRelative) {
    return `${u.pathname}${u.search}${u.hash}`;
  }
  return u.toString();
}

/**
 * @param {RequestInfo | URL} input
 * @param {RequestInit} [init]
 * @param {{ personId?: string | null, courseId?: number | string | null, courseName?: string | null, omitPersonIdQuery?: boolean, omitCourseQuery?: boolean }} [fetchOptions]
 * @returns {Promise<Response>}
 */
export async function loggedFetch(input, init, fetchOptions) {
  const mergedInput =
    typeof input === 'string' ? mergeApiQuery(input, fetchOptions) : input;

  const method = (init && init.method) || 'GET';
  const url = typeof mergedInput === 'string' ? mergedInput : String(mergedInput.url);

  let res;
  try {
    res = await fetch(mergedInput, init);
  } catch (e) {
    const msg = e?.message ?? String(e);
    if (e?.name === 'TypeError' && msg.includes('Failed to fetch')) {
      throw new Error(
        '無法連線至後端。開發預設直連本機 8000；請確認後端已啟動，且 CORS 允許目前頁面 origin。若要改經 dev 代理，請在 .env 設 VUE_APP_API_BASE 與目前頁面 origin 相同（如 http://localhost:8081）並參考 vue.config.js。'
      );
    }
    throw e;
  }
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
