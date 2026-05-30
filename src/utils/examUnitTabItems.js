/**
 * 試卷題庫單元 → 單元／題目下拉項目（純函式）
 *
 * 自 ExamDetailPage 抽出的無狀態邏輯：GET /exam/rag-for-exams units[] 的單元正規化、
 * 單元 sub-tab 項目、題目下拉選項標籤、出題／批改指引擷取、單元來源檔名與 unit_type 判斷。
 * 所有函式僅依賴傳入參數與 rag 常數／examQuizRows 工具，不存取任何元件響應式狀態。
 */
import { examQuizTypeDisplayLabelFromParts } from './examQuizRows.js';
import {
  UNIT_TYPE_RAG,
  UNIT_TYPE_TEXT,
  UNIT_TYPE_MP3,
  UNIT_TYPE_YOUTUBE,
} from './rag.js';

export function examNormalizeUnitRow(unit, fallbackTabId) {
  if (!unit || typeof unit !== 'object') return null;
  const rawName = unit.unit_name ?? unit.rag_name ?? unit.name ?? '';
  const name = String(rawName ?? '').trim();
  if (!name) return null;
  const tabId = String(unit.rag_tab_id ?? fallbackTabId ?? '').trim();
  const safeName = name.replace(/\+/g, '_');
  const src =
    unit.filename ??
    unit.file_name ??
    unit.repack_file_name ??
    unit.rag_file_name ??
    '';
  return {
    rag_tab_id: tabId || safeName,
    filename: src || `${safeName}_rag.zip`,
    rag_name: String(unit.rag_name ?? name).trim() || safeName,
    unit_name: safeName,
  };
}

export function parseExamUnitQuizzesMaybe(unit) {
  if (!unit || typeof unit !== 'object') return [];
  const raw = unit.quizzes;
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const p = JSON.parse(raw);
      return Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function examBuildUnitTabItem(unit, index, fallbackTabId) {
  const n = examNormalizeUnitRow(unit, fallbackTabId);
  if (!n) return null;
  const label = String(n.unit_name || n.rag_name || `單元 ${index + 1}`);
  const ragTabId = String(n.rag_tab_id ?? '').trim();
  const keyBase = label;
  const rawRagUnitId = unit?.rag_unit_id ?? unit?.RagUnitId;
  const ragUnitIdNum = Number(rawRagUnitId);
  const ragUnitId = Number.isFinite(ragUnitIdNum) ? ragUnitIdNum : null;
  return {
    id: `${ragTabId || 'tab'}::${keyBase}::${index}`,
    label,
    unitName: label,
    ragName: n.rag_name,
    filename: n.filename,
    ragTabId,
    ragUnitId,
    /** 正規化前原始列（quizzes／prompt；outputs 路徑下 rag.units 可能為空） */
    examRagUnitSource: unit,
    /** 對應 `GET /exam/rag-for-exams` 之 `units[index]`，供讀取 `quizzes[]` */
    sourceUnitIndex: index,
  };
}

/** 出題區「單元」下拉 value（與 examUnitTabItems[].id 一致） */
export function examUnitSelectValue(item) {
  if (!item || typeof item !== 'object') return '';
  return String(item.id ?? '').trim();
}

export function examQuizTypeDisplayLabelForDropdownOption(opt) {
  if (!opt || typeof opt !== 'object') return '—';
  return examQuizTypeDisplayLabelFromParts(opt.quiz_name, opt.follow_up);
}

export function examQuizNameLabelForDropdownOption(opt) {
  if (!opt || typeof opt !== 'object') return '—';
  return String(opt.quiz_name ?? '').trim() || '—';
}

export function examQuizDropdownOptionIsFollowUp(opt) {
  return !!opt?.follow_up;
}

export function examQuizPickSelectValue(opt) {
  return String(opt?.quiz_name ?? '').trim();
}

/**
 * 與 CreateExamQuizBankPage `extractQuizUserPromptText` 鍵名對齊（GET /exam/rag-for-exams `units[].quizzes[]`）。
 * @param {object | null | undefined} raw
 * @returns {string}
 */
export function extractQuizUserPromptFromExamRagRow(raw) {
  if (!raw || typeof raw !== 'object') return '';
  const keys = [
    'quiz_user_prompt_text',
    'quizUserPromptText',
    'user_prompt_text',
    'userPromptText',
    'prompt_text',
    'promptText',
  ];
  for (const key of keys) {
    const val = raw[key];
    if (val == null) continue;
    const text = String(val);
    if (text.trim()) return text;
  }
  return '';
}

/**
 * 批改指引：與 Rag_Quiz／題庫頁對齊（`answer_user_prompt_text`）。
 * @param {object | null | undefined} raw
 * @returns {string}
 */
export function extractAnswerUserPromptFromExamRagRow(raw) {
  if (!raw || typeof raw !== 'object') return '';
  const keys = [
    'answer_user_prompt_text',
    'answerUserPromptText',
    'critique_user_prompt_instruction',
  ];
  for (const key of keys) {
    const val = raw[key];
    if (val == null) continue;
    const text = String(val);
    if (text.trim()) return text;
  }
  return '';
}

/** GET /exam/rag-for-exams units[]：unit_type 與建立題庫頁對齊（1 RAG、2 文字、3 mp3、4 YouTube） */
export function examResolvedUnitType(unit) {
  const ut = Number(unit?.unit_type ?? unit?.unitType);
  if (ut === UNIT_TYPE_TEXT || ut === UNIT_TYPE_MP3 || ut === UNIT_TYPE_YOUTUBE) return ut;
  return UNIT_TYPE_RAG;
}

export function examUnitTranscriptFromRaw(unit) {
  if (!unit || typeof unit !== 'object') return '';
  const tx = unit.transcript ?? unit.transcription;
  return tx != null && String(tx).trim() !== '' ? String(tx).trim() : '';
}

/** 與 CreateExamQuizBankPage 單元來源列對齊（文字／MP3／YouTube） */
export function examUnitSourceFilenameLabel(unit) {
  if (!unit || typeof unit !== 'object') return '';
  const ut = examResolvedUnitType(unit);
  if (ut === UNIT_TYPE_TEXT) {
    const direct = unit.text_file_name ?? unit.textFileName;
    if (direct != null && String(direct).trim() !== '') return String(direct).trim();
    const mode = String(unit.rag_mode ?? unit.ragMode ?? '').toLowerCase();
    if (mode === 'transcript_md') {
      const fn = unit.filename ?? unit.rag_filename ?? unit.rag_file_name ?? unit.ragFileName;
      if (fn != null && String(fn).trim() !== '') {
        const s = String(fn).trim();
        if (!/_rag\.zip$/i.test(s)) return s;
      }
    }
    return '';
  }
  if (ut === UNIT_TYPE_MP3) {
    const v = unit.mp3_file_name ?? unit.mp3FileName;
    return v != null && String(v).trim() !== '' ? String(v).trim() : '';
  }
  if (ut === UNIT_TYPE_YOUTUBE) {
    const v = unit.youtube_url ?? unit.youtubeUrl;
    return v != null && String(v).trim() !== '' ? String(v).trim() : '';
  }
  return '';
}
