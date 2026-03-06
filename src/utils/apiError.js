/**
 * 從 fetch Response 與 response text 解析錯誤訊息。
 * 支援後端回傳的 detail、error 欄位；detail 為物件時會 JSON.stringify。
 */
export function parseFetchError(res, text) {
  let msg = res?.statusText ?? 'Request failed';
  if (text && typeof text === 'string') {
    try {
      const err = JSON.parse(text);
      const d = err.detail;
      const e = err.error;
      if (d != null) {
        msg = typeof d === 'string' ? d : JSON.stringify(d);
      } else if (e != null) {
        msg = typeof e === 'string' ? e : String(e);
      } else if (msg === (res?.statusText ?? 'Request failed')) {
        msg = text;
      }
    } catch (_) {
      msg = text;
    }
  }
  return msg;
}
