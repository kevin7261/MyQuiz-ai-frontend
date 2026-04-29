/**
 * useExcelImport — Excel 檔案匯入 composable
 *
 * 封裝 Excel 拖放／選擇、解析、預覽等邏輯，供批次匯入學生等功能使用。
 * 表頭須含 ID 欄（大寫 ID）與姓名欄（「姓名」或 NAME），資料從第二列起讀取。
 *
 * @param {{ disabled?: import('vue').Ref<boolean> }} [options]
 * @returns Excel 相關 refs 與事件處理函式
 */

import { ref } from 'vue';

export const EXCEL_ACCEPT_ATTR =
  '.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel';

function isExcelFile(file) {
  if (!file || !file.name) return false;
  const n = file.name.toLowerCase();
  return n.endsWith('.xlsx') || n.endsWith('.xls');
}

function trimHeaderCell(v) {
  return String(v ?? '').trim();
}

function findIdColumnIndex(headerRow) {
  if (!Array.isArray(headerRow)) return -1;
  return headerRow.findIndex((c) => trimHeaderCell(c).toUpperCase() === 'ID');
}

function findNameColumnIndex(headerRow) {
  if (!Array.isArray(headerRow)) return -1;
  const trimmed = headerRow.map((c) => trimHeaderCell(c));
  const zh = trimmed.indexOf('姓名');
  if (zh !== -1) return zh;
  return trimmed.findIndex((h) => h.toUpperCase() === 'NAME');
}

export function useExcelImport({ disabled = ref(false) } = {}) {
  const excelFileInputRef = ref(null);
  const isExcelDragOver = ref(false);
  const excelFileName = ref('');
  const excelPreviewRows = ref([]);
  const excelParseError = ref('');

  function clearExcelFileInput() {
    if (excelFileInputRef.value) excelFileInputRef.value.value = '';
  }

  async function setExcelPreviewFromFile(file) {
    excelParseError.value = '';
    excelPreviewRows.value = [];
    excelFileName.value = '';
    if (!file) return;
    if (!isExcelFile(file)) {
      excelParseError.value = '請選擇 Excel 檔（.xlsx 或 .xls）';
      return;
    }
    excelFileName.value = file.name;
    try {
      const ab = await file.arrayBuffer();
      const XLSX = await import('xlsx');
      const wb = XLSX.read(ab, { type: 'array' });
      const sheetName = wb.SheetNames[0];
      if (!sheetName) throw new Error('檔案中沒有工作表');
      const ws = wb.Sheets[sheetName];
      const matrix = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });
      if (!Array.isArray(matrix) || matrix.length === 0) throw new Error('工作表為空');
      const headerRow = matrix[0];
      if (!Array.isArray(headerRow)) throw new Error('無法讀取表頭');
      const idIdx = findIdColumnIndex(headerRow);
      const nameIdx = findNameColumnIndex(headerRow);
      if (idIdx === -1 || nameIdx === -1) {
        throw new Error('表頭須包含 ID 與 姓名 兩欄');
      }
      const out = [];
      for (let r = 1; r < matrix.length; r++) {
        const row = matrix[r];
        if (!Array.isArray(row)) continue;
        const idVal = row[idIdx];
        const nameVal = row[nameIdx];
        const empty =
          (idVal === '' || idVal == null) &&
          (nameVal === '' || nameVal == null) &&
          row.every((c) => c === '' || c == null);
        if (empty) continue;
        out.push({
          id: idVal === '' || idVal == null ? '—' : String(idVal).trim(),
          name: nameVal === '' || nameVal == null ? '—' : String(nameVal).trim(),
        });
      }
      excelPreviewRows.value = out;
      if (out.length === 0) excelParseError.value = '沒有資料列（或僅有表頭）';
    } catch (e) {
      excelParseError.value = e.message || '無法讀取 Excel';
      excelPreviewRows.value = [];
      excelFileName.value = '';
    }
  }

  function onExcelDragOver(e) {
    if (disabled.value) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer?.types?.includes('Files')) isExcelDragOver.value = true;
  }

  function onExcelDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    isExcelDragOver.value = false;
  }

  function onExcelDrop(e) {
    if (disabled.value) return;
    e.preventDefault();
    e.stopPropagation();
    isExcelDragOver.value = false;
    const file = e.dataTransfer?.files?.[0];
    clearExcelFileInput();
    void setExcelPreviewFromFile(file);
  }

  function openExcelFileDialog() {
    if (disabled.value) return;
    excelFileInputRef.value?.click();
  }

  function onExcelChange(e) {
    if (disabled.value) return;
    const file = e.target.files?.[0];
    void setExcelPreviewFromFile(file);
    clearExcelFileInput();
  }

  /** 清空所有 Excel 狀態（成功送出後呼叫） */
  function resetExcel() {
    excelFileName.value = '';
    excelPreviewRows.value = [];
    excelParseError.value = '';
    clearExcelFileInput();
  }

  return {
    excelFileInputRef,
    isExcelDragOver,
    excelFileName,
    excelPreviewRows,
    excelParseError,
    onExcelDragOver,
    onExcelDragLeave,
    onExcelDrop,
    openExcelFileDialog,
    onExcelChange,
    resetExcel,
  };
}
