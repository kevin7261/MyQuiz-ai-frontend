/**
 * GET /exam/rag-for-exams 回應正規化（純函式）
 *
 * 後端此端點的回傳包裝不一（陣列／{ data }／{ rag }／{ rags }／巢狀 result 等）。
 * 此函式整理成與測驗詳情頁既有邏輯相容的 rag 形狀（rag_id、rag_tab_id、outputs[]／
 * units[]／rag_metadata 等）。若內嵌 Rag_Quiz：出題／批改規則後端僅給預覽，前端勿當完整字串送 LLM。
 * 後端明確回傳 units: [] 時仍回物件（與 JSON 解析失敗的 null 區分），測驗頁才能顯示「題庫為空」。
 *
 * 純函式：僅依賴傳入的 data，不存取任何元件響應式狀態。
 */
export function normalizeExamRagForExamsPayload(data) {
  if (data == null) return null;

  function parseArrayMaybeJson(raw) {
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string' && raw.trim() !== '') {
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  }

  function normalizeUnitRows(rawUnits) {
    const rows = parseArrayMaybeJson(rawUnits);
    return rows.map((u) => {
      if (!u || typeof u !== 'object') return u;
      const parsedQuizzes = parseArrayMaybeJson(u.quizzes);
      if (Array.isArray(u.quizzes) || parsedQuizzes.length > 0) {
        return { ...u, quizzes: parsedQuizzes };
      }
      return u;
    });
  }

  function unitToOutput(u) {
    if (!u || typeof u !== 'object') return {};
    const unitName = u.unit_name ?? u.name ?? '';
    const ragName = u.rag_name ?? unitName;
    return {
      rag_tab_id: u.rag_tab_id ?? u.RagTabId,
      rag_unit_id: u.rag_unit_id ?? u.RagUnitId,
      unit_name: unitName,
      rag_name: ragName,
      filename:
        u.filename ??
        u.file_name ??
        u.repack_file_name ??
        u.rag_file_name ??
        '',
      quizzes: u.quizzes,
    };
  }

  if (Array.isArray(data)) {
    const units = normalizeUnitRows(data);
    if (!units.length) return null;
    const u0 = units[0];
    return {
      rag_id: u0.rag_id ?? u0.RagId,
      rag_tab_id: u0.rag_tab_id ?? u0.RagTabId,
      rag_name: u0.rag_name ?? u0.unit_name,
      units,
      outputs: units.map(unitToOutput),
      transcript: u0.transcript ?? u0.transcription ?? undefined,
    };
  }

  if (typeof data !== 'object') return null;

  /** @param {object} obj */
  function extractRawUnitsList(obj) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null;
    const keys = [
      'units',
      'rag_units',
      'Units',
      'RagUnits',
      'exam_units',
      'examUnits',
      'unit_list',
      'unitList',
    ];
    for (const k of keys) {
      if (!Object.prototype.hasOwnProperty.call(obj, k)) continue;
      const rows = parseArrayMaybeJson(obj[k]);
      if (rows.length > 0) return rows;
    }
    return null;
  }

  /** @param {object} container */
  function deepExtractUnits(container) {
    const direct = extractRawUnitsList(container);
    if (direct) return direct;
    if (!container || typeof container !== 'object' || Array.isArray(container)) return null;
    for (const nk of ['result', 'payload', 'body', 'content', 'records']) {
      const inner = container[nk];
      if (!inner || typeof inner !== 'object') continue;
      if (Array.isArray(inner)) {
        const rows = normalizeUnitRows(inner);
        if (rows.length > 0) return inner;
        continue;
      }
      const nested = extractRawUnitsList(inner);
      if (nested) return nested;
    }
    return null;
  }

  let unwrap = data;
  if (data.data != null && typeof data.data === 'object') {
    unwrap = data.data;
  } else if (data.Data != null && typeof data.Data === 'object') {
    unwrap = data.Data;
  }

  // 某些 API 將單元陣列放在 data 本體：{ data: [ { unit... }, ... ] }
  if (Array.isArray(unwrap)) {
    const units = normalizeUnitRows(unwrap);
    if (units.length > 0) {
      const u0 = units[0];
      const ragId = u0.rag_id ?? u0.RagId;
      const ragTabId = u0.rag_tab_id ?? u0.RagTabId;
      return {
        rag_id: ragId,
        rag_tab_id: ragTabId,
        rag_name: u0.rag_name ?? u0.unit_name,
        units,
        outputs: units.map(unitToOutput),
        transcript: u0.transcript ?? u0.transcription ?? undefined,
      };
    }
  }

  const unwrapHasUnitsKey =
    Object.prototype.hasOwnProperty.call(unwrap, 'units')
    || Object.prototype.hasOwnProperty.call(unwrap, 'rag_units');

  function countNestedQuizzes(unitRows) {
    if (!Array.isArray(unitRows)) return 0;
    let total = 0;
    for (const u of unitRows) {
      const quizzes = parseArrayMaybeJson(u?.quizzes);
      total += quizzes.length;
    }
    return total;
  }

  function pickRicherUnitRows(a, b) {
    const aa = Array.isArray(a) ? a : [];
    const bb = Array.isArray(b) ? b : [];
    if (!aa.length) return bb;
    if (!bb.length) return aa;
    const aq = countNestedQuizzes(aa);
    const bq = countNestedQuizzes(bb);
    if (bq > aq) return bb;
    if (aq > bq) return aa;
    return bb.length > aa.length ? bb : aa;
  }

  const pickRag =
    unwrap.rag
    ?? (Array.isArray(unwrap.rags) && unwrap.rags.length ? unwrap.rags[0] : null);

  const unitsFromRag = normalizeUnitRows(pickRag && (pickRag.units ?? pickRag.rag_units));
  const rawRootUnits =
    deepExtractUnits(unwrap)
    ?? extractRawUnitsList(unwrap)
    ?? unwrap.units
    ?? unwrap.rag_units;
  const unitsFromRoot = normalizeUnitRows(rawRootUnits);
  let units = unitsFromRag.length > 0 ? unitsFromRag : unitsFromRoot;

  if (!Array.isArray(units)) {
    const alt = unwrap.items ?? unwrap.results ?? unwrap.rows;
    units = normalizeUnitRows(alt);
  }
  if (!units.length) {
    const alt = unwrap.items ?? unwrap.results ?? unwrap.rows;
    units = normalizeUnitRows(alt);
  }

  const sys =
    unwrap.transcript
    ?? unwrap.transcription
    ?? pickRag?.transcript
    ?? pickRag?.transcription
    ?? null;
  const rootQuizzes = parseArrayMaybeJson(unwrap.quizzes);

  if (pickRag != null && typeof pickRag === 'object') {
    const base = { ...pickRag };
    if (sys != null && base.transcript == null) base.transcript = sys;
    const baseUnits = normalizeUnitRows(base.units ?? base.rag_units);
    const mergedUnits = pickRicherUnitRows(baseUnits, units);
    if (mergedUnits.length > 0) {
      if (!Array.isArray(base.outputs) || base.outputs.length === 0) base.outputs = mergedUnits.map(unitToOutput);
      base.units = mergedUnits;
    }
    const baseQuizzes = parseArrayMaybeJson(base.quizzes);
    if (baseQuizzes.length > 0 || rootQuizzes.length > 0) {
      base.quizzes = baseQuizzes.length > 0 ? baseQuizzes : rootQuizzes;
    }
    if (base.rag_tab_id != null || base.rag_id != null) return base;
  }

  if (Array.isArray(units) && units.length > 0) {
    const u0 = units[0];
    const ragId = unwrap.rag_id ?? u0.rag_id ?? u0.RagId;
    const ragTabId = unwrap.rag_tab_id ?? u0.rag_tab_id ?? u0.RagTabId;
    return {
      rag_id: ragId,
      rag_tab_id: ragTabId,
      rag_name: unwrap.rag_name,
      units,
      outputs: units.map(unitToOutput),
      quizzes: rootQuizzes.length > 0 ? rootQuizzes : undefined,
      transcript: sys ?? undefined,
      rag_metadata: unwrap.rag_metadata,
      unit_list: unwrap.unit_list,
      file_metadata: unwrap.file_metadata,
      file_size: unwrap.file_size,
    };
  }

  /** 後端明確回傳 units: [] 時仍回物件，避免與 JSON 解析失敗（null）混淆，測驗頁才能顯示「題庫為空」 */
  if (Array.isArray(units) && units.length === 0 && unwrapHasUnitsKey) {
    return {
      rag_id: unwrap.rag_id,
      rag_tab_id: unwrap.rag_tab_id ?? null,
      rag_name: unwrap.rag_name,
      units: [],
      outputs: [],
      quizzes: rootQuizzes.length > 0 ? rootQuizzes : undefined,
      transcript: sys ?? undefined,
      rag_metadata: unwrap.rag_metadata,
      unit_list: unwrap.unit_list,
      file_metadata: unwrap.file_metadata,
      file_size: unwrap.file_size,
    };
  }

  return null;
}
