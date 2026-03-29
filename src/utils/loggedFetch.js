/**
 * 與原生 fetch 相同介面；每次取得回應後在 console 輸出 method、URL、status 與 body（可解析為 JSON 則顯示物件）。
 *
 * 若回應為 HTTP 500，不立即交給呼叫端：間隔延遲後自動重試同一請求（含 POST body），
 * 適用後端短暫錯誤或冷啟動；仍為 500 時才回傳最後一次 Response。
 */
/* eslint-disable no-console */

/** 500 時額外重試次數（不含第一次請求） */
const RETRY_500_MAX = 4;
const RETRY_500_DELAY_MS = 2000;

/**
 * @param {RequestInfo | URL} input
 * @param {RequestInit} [init]
 * @returns {Promise<Response>}
 */
export async function loggedFetch(input, init) {
  const method = (init && init.method) || 'GET';
  const url = typeof input === 'string' ? input : String(input.url);

  let res = await fetch(input, init);
  for (let attempt = 0; attempt < RETRY_500_MAX && res.status === 500; attempt += 1) {
    await new Promise((r) => setTimeout(r, RETRY_500_DELAY_MS));
    res = await fetch(input, init);
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
