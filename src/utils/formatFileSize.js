/**
 * 將檔案大小轉成可讀字串（1024 進位）。無效值回傳空字串。
 * @param {unknown} value 數值
 * @param {'bytes'|'MB'} [inputUnit='bytes'] 後端 Rag／file_metadata／outputs 的 file_size 為 MB 時傳 'MB'
 * @returns {string}
 */
export function formatFileSize(value, inputUnit = 'bytes') {
  if (value == null || value === '') return '';
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return '';
  const bytes = inputUnit === 'MB' ? n * 1024 * 1024 : n;
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let v = bytes;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  const decimals = v >= 100 || i === 0 ? 0 : v >= 10 ? 1 : 2;
  return `${v.toFixed(decimals)} ${units[i]}`;
}
