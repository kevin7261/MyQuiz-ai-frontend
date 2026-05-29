/** 建立測驗題庫：題卡「您的答案／評閱」cookie 備援（鍵 rag_tab_id|rag_unit_id|rag_quiz_id|出題模式；依使用者分 cookie） */
const COOKIE_PREFIX = 'myquiz_createBankQuizDraft_v1_';
/** 1 年 */
const COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 365;

function cookieNameForPerson(personId) {
  const p = String(personId ?? '').trim() || 'anon';
  return `${COOKIE_PREFIX}${encodeURIComponent(p)}`;
}

function getCookie(name) {
  if (typeof document === 'undefined') return null;
  const prefix = `${encodeURIComponent(name)}=`;
  const parts = document.cookie.split(';');
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) {
      return decodeURIComponent(trimmed.slice(prefix.length));
    }
  }
  return null;
}

function setCookie(name, value, maxAgeSec) {
  if (typeof document === 'undefined') return;
  const encoded = encodeURIComponent(value);
  document.cookie = `${encodeURIComponent(name)}=${encoded}; path=/; max-age=${maxAgeSec}; SameSite=Lax`;
}

function readMap(personId) {
  try {
    const raw = getCookie(cookieNameForPerson(personId));
    if (!raw) return {};
    const o = JSON.parse(raw);
    const map = o?.byKey;
    if (map && typeof map === 'object' && !Array.isArray(map)) return map;
    return {};
  } catch {
    return {};
  }
}

function writeMap(personId, byKey) {
  try {
    setCookie(
      cookieNameForPerson(personId),
      JSON.stringify({ v: 1, byKey }),
      COOKIE_MAX_AGE_SEC,
    );
  } catch {
    /* quota / private mode */
  }
}

/**
 * @param {string} personId
 * @param {string} anchorKey
 * @returns {{ answer_content?: string, answer_critique?: string, gradingResponseJson?: unknown } | null}
 */
export function readCreateBankQuizDraftEntry(personId, anchorKey) {
  const pid = String(personId ?? '').trim();
  const key = String(anchorKey ?? '').trim();
  if (!pid || !key) return null;
  const entry = readMap(pid)[key];
  if (!entry || typeof entry !== 'object') return null;
  return entry;
}

/**
 * @param {string} personId
 * @param {string} anchorKey
 * @param {string} answerContent
 */
export function writeCreateBankQuizDraftAnswer(personId, anchorKey, answerContent) {
  const pid = String(personId ?? '').trim();
  const key = String(anchorKey ?? '').trim();
  if (!pid || !key) return;
  const map = readMap(pid);
  const prev = map[key] && typeof map[key] === 'object' ? map[key] : {};
  map[key] = {
    ...prev,
    answer_content: String(answerContent ?? ''),
  };
  writeMap(pid, map);
}

/**
 * @param {string} personId
 * @param {string} anchorKey
 * @param {string} answerCritique
 * @param {unknown} [gradingResponseJson]
 */
export function writeCreateBankQuizDraftCritique(
  personId,
  anchorKey,
  answerCritique,
  gradingResponseJson = null,
) {
  const pid = String(personId ?? '').trim();
  const key = String(anchorKey ?? '').trim();
  const critique = String(answerCritique ?? '').trim();
  if (!pid || !key || !critique) return;
  const map = readMap(pid);
  const prev = map[key] && typeof map[key] === 'object' ? map[key] : {};
  const next = {
    ...prev,
    answer_critique: critique,
  };
  if (gradingResponseJson != null && typeof gradingResponseJson === 'object') {
    next.gradingResponseJson = gradingResponseJson;
  }
  map[key] = next;
  writeMap(pid, map);
}

/** @param {string} personId @param {string} anchorKey */
export function clearCreateBankQuizDraftEntry(personId, anchorKey) {
  const pid = String(personId ?? '').trim();
  const key = String(anchorKey ?? '').trim();
  if (!pid || !key) return;
  const map = readMap(pid);
  if (map[key] == null) return;
  delete map[key];
  writeMap(pid, map);
}

/**
 * 後端無資料時以 cookie 補齊題卡「您的答案／評閱」。
 * @param {Record<string, unknown>} card
 * @param {string} personId
 * @param {string} anchorKey
 */
export function applyCreateBankQuizDraftToCard(card, personId, anchorKey) {
  if (!card || typeof card !== 'object') return;
  const draft = readCreateBankQuizDraftEntry(personId, anchorKey);
  if (!draft) return;
  if (!String(card.quiz_answer ?? '').trim() && String(draft.answer_content ?? '').trim()) {
    card.quiz_answer = String(draft.answer_content);
  }
  if (!String(card.gradingResult ?? '').trim() && String(draft.answer_critique ?? '').trim()) {
    card.gradingResult = String(draft.answer_critique);
    card.confirmed = true;
    if (draft.gradingResponseJson != null && typeof draft.gradingResponseJson === 'object') {
      card.gradingResponseJson = draft.gradingResponseJson;
    }
  }
}
