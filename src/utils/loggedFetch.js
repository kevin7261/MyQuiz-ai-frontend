/**
 * 與原生 fetch 相同介面；取得最終回應後在 console 輸出 method、URL、status 與 body（可解析為 JSON 則顯示物件）。
 *
 * 若回應為 HTTP 500，會間隔延遲後重試同一請求（含 POST body），直到 status 不再是 500（通常為 200）。
 * 注意：開發者工具 Network／Console 仍可能對每次失敗的請求顯示紅字，此為瀏覽器行為，無法由前端關閉。
 */
/* eslint-disable no-console */

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
  while (res.status === 500) {
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
