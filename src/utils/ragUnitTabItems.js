/**
 * RAG 題庫單元 → 單元分頁項目（純函式）
 *
 * 自 CreateExamQuizBankDetailPage 抽出的單元解析邏輯：自 GET /rag/tabs 列、outputs／
 * rag_metadata.outputs／unit_list 推導單元列，並組成單元 sub-tab 顯示項目（含逐字稿、
 * 來源檔名、unit_type、chunk 設定、資料夾組合等）。所有函式僅依賴傳入參數、rag 常數／
 * 工具與彼此，不存取任何元件響應式狀態，可獨立測試與重用。
 */
import {
  deriveRagName,
  getRagUnitListString,
  parsePackUnitTypesFromRag,
  parseRagMetadataObject,
  unitSelectValue,
  UNIT_TYPE_RAG,
  UNIT_TYPE_TEXT,
  UNIT_TYPE_MP3,
  UNIT_TYPE_YOUTUBE,
  DEFAULT_PACK_CHUNK_SIZE,
  DEFAULT_PACK_CHUNK_OVERLAP,
} from './rag.js';
import { ensureNumber, extractUnitsFromRag } from './ragExamRows.js';

export function firstRagQuizAnchorIdFromUnit(unit) {
  if (!unit || typeof unit !== 'object') return null;
  const directCandidates = [
    unit.rag_quiz_id,
    unit.template_rag_quiz_id,
    unit.anchor_rag_quiz_id,
    unit.anchorRagQuizId,
  ];
  for (const c of directCandidates) {
    const n = Number(c);
    if (Number.isFinite(n) && n > 0) return n;
  }
  let list = [];
  if (Array.isArray(unit.quizzes)) list = unit.quizzes;
  else if (Array.isArray(unit.quiz_list)) list = unit.quiz_list;
  else if (Array.isArray(unit.Quizzes)) list = unit.Quizzes;

  for (const q of list) {
    const id =
      q?.rag_quiz_id ?? q?.RagQuizId ?? q?.quiz_id ?? q?.exam_quiz_id ?? q?.id;
    const n = Number(id);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

export function ragUnitIdFromRawUnit(unit) {
  if (!unit || typeof unit !== 'object') return null;
  const raw = unit.rag_unit_id ?? unit.unit_id ?? unit.id;
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** 來源／RAG ZIP 檔名：後端可能回 rag_file_name（Rag_Unit）；題目產生 fallback 仍會使用 */
export function unitSourceFilename(unit) {
  if (!unit || typeof unit !== 'object') return '';
  const raw =
    unit.rag_file_name
    ?? unit.ragFileName
    ?? unit.filename
    ?? unit.rag_filename
    ?? unit.zip_filename;
  if (raw == null || String(raw).trim() === '') return '';
  return String(raw).trim();
}

/**
 * 文字單元來源檔名（unit_type=2／POST build-rag-zip output 之 transcript_md）。
 * 優先後端 `text_file_name`；若缺漏且為文字單元，後端可能將 .md 來源放在 `filename`（非 *_rag.zip）。
 */
export function unitTextFileName(unit) {
  if (!unit || typeof unit !== 'object') return '';
  const raw = unit.text_file_name ?? unit.textFileName;
  if (raw != null && String(raw).trim() !== '') return String(raw).trim();
  const ut = Number(unit.unit_type ?? unit.unitType);
  const mode = String(unit.rag_mode ?? unit.ragMode ?? '').toLowerCase();
  const isTextUnit = ut === UNIT_TYPE_TEXT || mode === 'transcript_md';
  if (!isTextUnit) return '';
  const fn =
    unit.filename
    ?? unit.rag_filename
    ?? unit.rag_file_name
    ?? unit.ragFileName;
  if (fn == null || String(fn).trim() === '') return '';
  const s = String(fn).trim();
  if (/_rag\.zip$/i.test(s)) return '';
  return s;
}

export function unitMp3FileName(unit) {
  if (!unit || typeof unit !== 'object') return '';
  const raw = unit.mp3_file_name ?? unit.mp3FileName;
  return raw != null && String(raw).trim() !== '' ? String(raw).trim() : '';
}

export function unitYoutubeUrl(unit) {
  if (!unit || typeof unit !== 'object') return '';
  const raw = unit.youtube_url ?? unit.youtubeUrl;
  return raw != null && String(raw).trim() !== '' ? String(raw).trim() : '';
}

/** 後端資料夾組合字串（GET units／rag 內嵌 units 等；與 unit_list 之 + 連接語意一致） */
export function folderCombinationFromUnitRaw(unit) {
  if (!unit || typeof unit !== 'object') return '';
  const raw = unit.folder_combination ?? unit.folderCombination;
  return raw != null && String(raw).trim() !== '' ? String(raw).trim() : '';
}

/**
 * 後端 folder_combination：`資料夾A/t資料夾B/t資料夾C`（以 `/t` 串多個資料夾名）；
 * 若無則將 fallback（unit_list 群組之「a + b」）拆成與拖曳 tag 相同的一列名稱。
 * @param {string} folderCombinationStr
 * @param {string} [fallbackFolderLine]
 * @returns {string[]}
 */
export function parseFolderCombinationTags(folderCombinationStr, fallbackFolderLine) {
  const fc = String(folderCombinationStr ?? '').trim();
  if (fc) {
    if (fc.includes('/t')) {
      return fc.split('/t').map((s) => s.trim()).filter(Boolean);
    }
    if (/\t/.test(fc)) {
      return fc.split(/\t+/).map((s) => s.trim()).filter(Boolean);
    }
    if (fc.includes(' + ')) {
      return fc.split(/\s*\+\s*/).map((s) => s.trim()).filter(Boolean);
    }
    return [fc];
  }
  const line = String(fallbackFolderLine ?? '').trim();
  if (!line) return [];
  if (line.includes(' + ')) {
    return line.split(/\s*\+\s*/).map((s) => s.trim()).filter(Boolean);
  }
  return [line];
}

/** Rag_Unit／GET /rag/tab/units／build-rag-zip output：逐字稿欄位（含 NDJSON output.transcript_plain） */
export function rawUnitTranscriptString(unit) {
  if (!unit || typeof unit !== 'object') return '';
  const out = unit.output && typeof unit.output === 'object' ? unit.output : null;
  const candidates = [
    unit.transcript,
    unit.transcription,
    unit.transcript_plain,
    unit.transcriptPlain,
    unit.transcript_text,
    unit.transcriptText,
    out?.transcript,
    out?.transcription,
    out?.transcript_plain,
    out?.transcriptPlain,
  ];
  for (const c of candidates) {
    if (c != null && String(c).trim() !== '') return String(c).trim();
  }
  return '';
}

export function normalizeUnitFromRagTabsRow(unit, fallbackTabId) {
  if (!unit || typeof unit !== 'object') return null;
  const rawName =
    unit.unit_name ??
    unit.rag_name ??
    unit.name ??
    unit.rag_unit_name;
  const name = String(rawName ?? '').trim();
  if (!name) return null;
  const tabId = String(unit.rag_tab_id ?? fallbackTabId ?? '').trim();
  const safeName = name.replace(/\+/g, '_');
  const anchorRagQuizId = firstRagQuizAnchorIdFromUnit(unit);
  const ragUnitId = ragUnitIdFromRawUnit(unit);
  const src = unitSourceFilename(unit);
  const transcript = rawUnitTranscriptString(unit);
  const ut = Number(unit.unit_type ?? unit.unitType);
  const rag_mode = unit.rag_mode ?? unit.ragMode;
  const csRaw =
    unit.rag_chunk_size ?? unit.ragChunkSize ?? unit.chunk_size ?? unit.chunkSize;
  const coRaw =
    unit.rag_chunk_overlap ?? unit.ragChunkOverlap ?? unit.chunk_overlap ?? unit.chunkOverlap;
  return {
    rag_tab_id: tabId || safeName,
    filename: src || `${safeName}_rag.zip`,
    rag_name: String(unit.rag_name ?? name).trim() || safeName,
    unit_name: safeName,
    anchor_rag_quiz_id: anchorRagQuizId,
    rag_unit_id: ragUnitId,
    transcript,
    ...(Number.isFinite(ut) && ut > 0 ? { unit_type: ut } : {}),
    ...(rag_mode != null && String(rag_mode).trim() !== '' ? { rag_mode } : {}),
    text_file_name: unitTextFileName(unit),
    mp3_file_name: unitMp3FileName(unit),
    youtube_url: unitYoutubeUrl(unit),
    ...(csRaw != null && String(csRaw).trim() !== '' && !Number.isNaN(Number(csRaw))
      ? { rag_chunk_size: ensureNumber(csRaw, DEFAULT_PACK_CHUNK_SIZE) }
      : {}),
    ...(coRaw != null && String(coRaw).trim() !== '' && !Number.isNaN(Number(coRaw))
      ? { rag_chunk_overlap: ensureNumber(coRaw, DEFAULT_PACK_CHUNK_OVERLAP) }
      : {}),
    folder_combination: folderCombinationFromUnitRaw(unit),
  };
}

/** 當 rag 未內嵌 units[] 時，由 outputs／rag_metadata.outputs／unit_list 推導單元列（與出題下拉、build-rag-zip 一致；供單元 sub-tab） */
export function fallbackUnitsRawFromRag(rag) {
  if (!rag || typeof rag !== 'object') return [];
  const sourceTabId = String(rag.rag_tab_id ?? '');
  const metaObj = parseRagMetadataObject(rag);
  const topOutputs = rag.outputs;
  const nestedOutputs = metaObj?.outputs;
  const outputs =
    Array.isArray(topOutputs) && topOutputs.length > 0
      ? topOutputs
      : Array.isArray(nestedOutputs) && nestedOutputs.length > 0
        ? nestedOutputs
        : null;
  if (outputs) {
    const rawUt = rag.unit_types ?? rag.unit_type_list;
    const typesArr = parsePackUnitTypesFromRag(rawUt, outputs.length);
    return outputs.map((o, idx) => {
      const derivedName = `${(o.rag_name ?? '').replace(/\+/g, '_')}`;
      const tabId =
        o.rag_tab_id != null && String(o.rag_tab_id).trim() !== ''
          ? String(o.rag_tab_id)
          : derivedName
            ? `${derivedName}_rag`
            : sourceTabId;
      const label = deriveRagName(o);
      const rawUnit =
        (o.unit_name != null && String(o.unit_name).trim() !== '')
          ? String(o.unit_name).trim()
          : (o.rag_name != null && String(o.rag_name).trim() !== '')
            ? String(o.rag_name).trim()
            : label;
      const unit_name = String(rawUnit || '').replace(/\+/g, '_') || label || sourceTabId;
      const transcript = rawUnitTranscriptString(o);
      const utMerged = Number(o.unit_type ?? o.unitType ?? typesArr[idx]);
      const merged = {
        ...o,
        rag_tab_id: tabId,
        filename: o.filename ?? o.rag_filename ?? `${derivedName || label || 'RAG'}.zip`,
        rag_name: label,
        unit_name,
        transcript,
      };
      if (Number.isFinite(utMerged) && utMerged > 0) merged.unit_type = utMerged;
      const ragModeOut = merged.rag_mode ?? merged.ragMode;
      const folderCombo = folderCombinationFromUnitRaw(o);
      return {
        rag_tab_id: tabId,
        filename: merged.filename,
        rag_name: label,
        unit_name,
        transcript,
        ...(Number.isFinite(utMerged) && utMerged > 0 ? { unit_type: utMerged } : {}),
        ...(ragModeOut != null && String(ragModeOut).trim() !== '' ? { rag_mode: ragModeOut } : {}),
        text_file_name: unitTextFileName(merged),
        mp3_file_name: unitMp3FileName(merged),
        youtube_url: unitYoutubeUrl(merged),
        ...(folderCombo !== '' ? { folder_combination: folderCombo } : {}),
      };
    });
  }
  const ragListStr = getRagUnitListString(rag);
  if (!ragListStr) return [];
  return String(ragListStr)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((group) => {
      const ragName = group.replace(/\+/g, '_');
      return {
        rag_tab_id: sourceTabId || `${ragName}_rag`,
        filename: `${ragName}_rag.zip`,
        rag_name: ragName,
        unit_name: ragName,
      };
    });
}

export function unitsFromRagTabsRow(rag) {
  if (!rag || typeof rag !== 'object') return [];
  const fallbackTabId = String(rag.rag_tab_id ?? rag.id ?? '').trim();
  let rows = extractUnitsFromRag(rag);
  if (!rows.length) {
    rows = fallbackUnitsRawFromRag(rag);
  } else {
    const rawUt = rag.unit_types ?? rag.unit_type_list;
    const typesArr = parsePackUnitTypesFromRag(rawUt, rows.length);
    rows = rows.map((u, i) => {
      const utMerged = Number(u.unit_type ?? u.unitType ?? typesArr[i]);
      if (!Number.isFinite(utMerged) || utMerged <= 0) return u;
      return { ...u, unit_type: utMerged };
    });
  }
  return rows
    .map((u) => normalizeUnitFromRagTabsRow(u, fallbackTabId))
    .filter(Boolean);
}

export function unitTabLabelFromUnit(unit, index = 0) {
  const raw = String(unit?.unit_name ?? unit?.rag_name ?? '').trim();
  return raw || `單元 ${index + 1}`;
}

/** 單元「來源」列類型（與 POST build-rag-zip unit_types 對齊；未知或非 2／3／4 視為 RAG／PDF Office） */
export function tabUnitTypeFromUnit(unit) {
  const utRaw = Number(unit?.unit_type ?? unit?.unitType);
  if (utRaw === UNIT_TYPE_TEXT || utRaw === UNIT_TYPE_MP3 || utRaw === UNIT_TYPE_YOUTUBE) return utRaw;
  return UNIT_TYPE_RAG;
}

export function buildUnitTabItem(unit, index = 0) {
  const ragTabId = String(unit?.rag_tab_id ?? '').trim();
  const unitName = String(unit?.unit_name ?? unit?.rag_name ?? '').trim();
  const keyBase = unitName || unit?.rag_name || `idx-${index + 1}`;
  const anchorRagQuizId =
    unit?.anchor_rag_quiz_id != null
      ? Number(unit.anchor_rag_quiz_id)
      : firstRagQuizAnchorIdFromUnit(unit);
  const ragUnitId =
    unit?.rag_unit_id != null ? Number(unit.rag_unit_id) : ragUnitIdFromRawUnit(unit);
  const ruStable = Number.isFinite(ragUnitId) && ragUnitId > 0;
  const unitType = tabUnitTypeFromUnit(unit);
  const rs =
    unit.rag_chunk_size ?? unit.ragChunkSize ?? unit.chunk_size ?? unit.chunkSize;
  const ro =
    unit.rag_chunk_overlap ?? unit.ragChunkOverlap ?? unit.chunk_overlap ?? unit.chunkOverlap;
  const ragChunkSize =
    rs != null && !Number.isNaN(Number(rs)) ? ensureNumber(rs, DEFAULT_PACK_CHUNK_SIZE) : null;
  const ragChunkOverlap =
    ro != null && !Number.isNaN(Number(ro))
      ? ensureNumber(ro, DEFAULT_PACK_CHUNK_OVERLAP)
      : null;
  return {
    id: ruStable
      ? `${ragTabId || 'tab'}::ru-${ragUnitId}`
      : `${ragTabId || 'tab'}::${keyBase}::${index}`,
    label: unitTabLabelFromUnit(unit, index),
    generateQuizTabId: unitSelectValue(unit),
    unitName: unitName || unitTabLabelFromUnit(unit, index),
    ragName: String(unit?.rag_name ?? '').trim(),
    filename: unitSourceFilename(unit),
    unitType,
    ragTabId,
    anchorRagQuizId: Number.isFinite(anchorRagQuizId) && anchorRagQuizId > 0 ? anchorRagQuizId : null,
    ragUnitDbId: Number.isFinite(ragUnitId) && ragUnitId > 0 ? ragUnitId : null,
    transcript: rawUnitTranscriptString(unit),
    textFileName: unitTextFileName(unit),
    mp3FileName: unitMp3FileName(unit),
    youtubeUrl: unitYoutubeUrl(unit),
    ragChunkSize,
    ragChunkOverlap,
    folderCombination: folderCombinationFromUnitRaw(unit),
  };
}
