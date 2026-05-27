/** 建立測驗題庫：session 還原頂層 tab／單元／題型（依使用者分鍵） */
export const CREATE_BANK_TAB_UI_STORAGE_PREFIX = 'myquiz:createBankTabUI:v1:';

export function createBankTabUiStorageKey(personId) {
  const p = String(personId ?? '').trim();
  return `${CREATE_BANK_TAB_UI_STORAGE_PREFIX}${p || 'anon'}`;
}

export function readCreateBankTabUiPersisted(personId) {
  try {
    const raw = sessionStorage.getItem(createBankTabUiStorageKey(personId));
    if (!raw) return null;
    const o = JSON.parse(raw);
    if (!o || typeof o !== 'object') return null;
    const expanded = Array.isArray(o.design_right_unit_expanded)
      ? o.design_right_unit_expanded.map((k) => String(k))
      : [];
    return {
      rag_tab_id: o.rag_tab_id != null ? String(o.rag_tab_id) : '',
      unit_tab_id: o.unit_tab_id != null ? String(o.unit_tab_id) : '',
      quiz_type_index: Number(o.quiz_type_index) || 0,
      rag_unit_id:
        o.rag_unit_id != null && String(o.rag_unit_id).trim() !== ''
          ? Number(o.rag_unit_id)
          : 0,
      rag_quiz_id:
        o.rag_quiz_id != null && Number(o.rag_quiz_id) >= 1
          ? Number(o.rag_quiz_id)
          : 0,
      design_right_unit_expanded: expanded,
    };
  } catch {
    return null;
  }
}

export function writeCreateBankTabUiPersisted(personId, payload) {
  try {
    sessionStorage.setItem(
      createBankTabUiStorageKey(personId),
      JSON.stringify({
        v: 1,
        rag_tab_id: payload.rag_tab_id,
        unit_tab_id: payload.unit_tab_id,
        quiz_type_index: payload.quiz_type_index,
        rag_unit_id: payload.rag_unit_id,
        rag_quiz_id:
          payload.rag_quiz_id != null && Number(payload.rag_quiz_id) >= 1
            ? Number(payload.rag_quiz_id)
            : 0,
        design_right_unit_expanded: Array.isArray(payload.design_right_unit_expanded)
          ? payload.design_right_unit_expanded.map((k) => String(k))
          : [],
      }),
    );
  } catch {
    /* private mode / quota */
  }
}

/** 僅更新 rag_tab_id；同一題庫時保留單元／題型選取 */
export function persistCreateBankRagTabSelection(personId, ragTabId) {
  if (!personId || !ragTabId) return;
  const prev = readCreateBankTabUiPersisted(personId);
  const same = prev && String(prev.rag_tab_id) === String(ragTabId);
  writeCreateBankTabUiPersisted(personId, {
    rag_tab_id: String(ragTabId),
    unit_tab_id: same ? (prev.unit_tab_id ?? '') : '',
    quiz_type_index: same ? (Number(prev.quiz_type_index) || 0) : 0,
    rag_unit_id: same ? (Number(prev.rag_unit_id) || 0) : 0,
    rag_quiz_id: same ? (Number(prev.rag_quiz_id) || 0) : 0,
    design_right_unit_expanded: same ? (prev.design_right_unit_expanded ?? []) : [],
  });
}
