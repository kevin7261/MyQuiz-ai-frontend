/**
 * 各功能頁課程 scope：同一使用者可在不同頁面選不同課程，互不覆寫。
 * 已選課程存於 authStore.coursesByScope[key]（persist）；currentCourse 為目前路由對應 scope 的課程。
 */

/** @typedef {'exam'|'create-exam-bank'|'person-analysis'|'course-analysis'|'log'} CourseScopeKey */

export const COURSE_SCOPE_KEYS = {
  EXAM: 'exam',
  CREATE_EXAM_BANK: 'create-exam-bank',
  PERSON_ANALYSIS: 'person-analysis',
  COURSE_ANALYSIS: 'course-analysis',
  LOG: 'log',
};

/** @type {CourseScopeKey[]} */
export const ALL_COURSE_SCOPE_KEYS = Object.values(COURSE_SCOPE_KEYS);

/**
 * scope key → 網址 view 片段（course_id 之後的那一段）。
 * @type {Record<CourseScopeKey, string>}
 */
export const SCOPE_TO_VIEW_SEGMENT = {
  [COURSE_SCOPE_KEYS.EXAM]: 'exam',
  [COURSE_SCOPE_KEYS.CREATE_EXAM_BANK]: 'create-exam-bank',
  [COURSE_SCOPE_KEYS.PERSON_ANALYSIS]: 'person-analysis',
  [COURSE_SCOPE_KEYS.COURSE_ANALYSIS]: 'course-analysis',
  [COURSE_SCOPE_KEYS.LOG]: 'log',
};

/**
 * 網址 view 片段 → scope key（含舊鍵 work）。非課程片段查無對應 → undefined。
 * @type {Record<string, CourseScopeKey>}
 */
export const VIEW_SEGMENT_TO_SCOPE = {
  exam: COURSE_SCOPE_KEYS.EXAM,
  work: COURSE_SCOPE_KEYS.EXAM,
  'create-exam-bank': COURSE_SCOPE_KEYS.CREATE_EXAM_BANK,
  'person-analysis': COURSE_SCOPE_KEYS.PERSON_ANALYSIS,
  'course-analysis': COURSE_SCOPE_KEYS.COURSE_ANALYSIS,
  log: COURSE_SCOPE_KEYS.LOG,
};

/** 走 /:course_id/:view 的課程範圍 view 片段（exam／create-exam-bank 另有專屬路由） */
export const COURSE_SCOPED_VIEW_SEGMENTS = ['person-analysis', 'course-analysis', 'log'];

/**
 * @param {unknown} raw
 * @returns {CourseScopeKey | null}
 */
export function normalizeCourseScopeKey(raw) {
  const s = String(raw ?? '').trim();
  if (ALL_COURSE_SCOPE_KEYS.includes(/** @type {CourseScopeKey} */ (s))) return /** @type {CourseScopeKey} */ (s);
  return null;
}

/**
 * 由路由判定目前頁面所屬 scope；非課程功能頁回傳 null。
 * @param {import('vue-router').RouteLocationNormalizedLoaded | import('vue-router').RouteLocationNormalized} route
 * @returns {CourseScopeKey | null}
 */
export function resolveCourseScopeKey(route) {
  if (!route) return null;
  const name = route.name;
  if (name === 'Exam' || name === 'ExamDetail') return COURSE_SCOPE_KEYS.EXAM;
  if (name === 'CreateExamBank' || name === 'CreateExamBankDetail') {
    return COURSE_SCOPE_KEYS.CREATE_EXAM_BANK;
  }
  const view = route.params?.view;
  if (view === 'person-analysis') return COURSE_SCOPE_KEYS.PERSON_ANALYSIS;
  if (view === 'course-analysis') return COURSE_SCOPE_KEYS.COURSE_ANALYSIS;
  if (view === 'log') return COURSE_SCOPE_KEYS.LOG;
  return null;
}

/**
 * 該 scope 對應功能頁的網址（course_id 為前綴）。無 course_id 則回選課頁。
 * @param {string | null | undefined} scopeKey
 * @param {number | string | null | undefined} courseId
 * @returns {string | { path: string, query: { scope: CourseScopeKey } }}
 */
export function courseScopedPath(scopeKey, courseId) {
  const key = normalizeCourseScopeKey(scopeKey) ?? COURSE_SCOPE_KEYS.EXAM;
  const segment = SCOPE_TO_VIEW_SEGMENT[key] ?? 'exam';
  const cid = String(courseId ?? '').trim();
  if (!cid) return { path: '/courses', query: { scope: key } };
  return `/${cid}/${segment}`;
}

/**
 * 左側／頂部課程名稱點擊：前往選課頁，query.scope 對應目前功能頁。
 * @param {import('vue-router').RouteLocationNormalizedLoaded | import('vue-router').RouteLocationNormalized} route
 * @returns {{ path: string, query: { scope: CourseScopeKey } }}
 */
export function buildCoursesPageLocation(route) {
  const scope = resolveCourseScopeKey(route) ?? COURSE_SCOPE_KEYS.EXAM;
  return { path: '/courses', query: { scope } };
}
