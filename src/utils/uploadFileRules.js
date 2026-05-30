/**
 * 教材上傳檔案規則（純函式）
 *
 * 自 CreateExamQuizBankDetailPage 抽出：POST /rag/tab/upload-zip 僅接受 .zip，
 * 單檔大小上限與檔案總管／Finder 顯示的「MB」一致（50×10⁶，非 50×1024²）。
 * 所有判斷僅依賴傳入的 file，不存取任何元件響應式狀態。
 */

/** POST /rag/tab/upload-zip：此頁僅接受 .zip */
export const UPLOAD_ALLOWED_EXTENSIONS = ['.zip'];

/** `<input accept>` 屬性值 */
export const UPLOAD_ACCEPT_ATTR = UPLOAD_ALLOWED_EXTENSIONS.join(',');

/** 教材上傳單檔大小上限（位元組）：50×10⁶，與 Finder 顯示的 MB 一致 */
export const UPLOAD_MAX_FILE_BYTES = 50 * 1000 * 1000;

export function uploadFileExceedsMaxSize(file) {
  if (!file || typeof file.size !== 'number' || !Number.isFinite(file.size)) return false;
  return file.size > UPLOAD_MAX_FILE_BYTES;
}

export function fileHasAllowedUploadExtension(file) {
  if (!file?.name) return false;
  const lower = file.name.toLowerCase();
  return UPLOAD_ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}
