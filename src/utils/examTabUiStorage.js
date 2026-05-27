/** 測驗頁：session 還原頂層 tab／題目 slot（依使用者分鍵；exam_3 另含 exam_quiz_id 深連結） */
export const EXAM_TAB_UI_STORAGE_PREFIX = 'myquiz:examTabUI:v1:';

export function examTabUiStorageKey(personId) {
  const p = String(personId ?? '').trim();
  return `${EXAM_TAB_UI_STORAGE_PREFIX}${p || 'anon'}`;
}

export function readExamTabUiPersisted(personId) {
  try {
    const raw = sessionStorage.getItem(examTabUiStorageKey(personId));
    if (!raw) return null;
    const o = JSON.parse(raw);
    if (!o || typeof o !== 'object') return null;
    const eqid = Number(o.exam_quiz_id);
    return {
      exam_tab_id: o.exam_tab_id != null ? String(o.exam_tab_id) : '',
      exam_slot_index: Number.isFinite(Number(o.exam_slot_index)) ? Number(o.exam_slot_index) : 0,
      exam_quiz_id: Number.isFinite(eqid) && eqid >= 1 ? eqid : 0,
    };
  } catch {
    return null;
  }
}

export function writeExamTabUiPersisted(personId, payload) {
  try {
    const eqid = Number(payload.exam_quiz_id);
    sessionStorage.setItem(
      examTabUiStorageKey(personId),
      JSON.stringify({
        v: 1,
        exam_tab_id: payload.exam_tab_id,
        exam_slot_index: payload.exam_slot_index,
        exam_quiz_id: Number.isFinite(eqid) && eqid >= 1 ? eqid : 0,
      }),
    );
  } catch {
    /* private mode / quota */
  }
}

/** 僅更新 exam_tab_id；同一試卷時保留 slot／exam_quiz_id */
export function persistExamTabSelection(personId, examTabId) {
  if (!personId || !examTabId) return;
  const prev = readExamTabUiPersisted(personId);
  const same = prev && String(prev.exam_tab_id) === String(examTabId);
  writeExamTabUiPersisted(personId, {
    exam_tab_id: String(examTabId),
    exam_slot_index: same ? (Number(prev.exam_slot_index) || 0) : 0,
    exam_quiz_id: same ? (Number(prev.exam_quiz_id) || 0) : 0,
  });
}
