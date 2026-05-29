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
 * 選課完成後返回該 scope 對應的功能頁。
 * @param {string | null | undefined} scopeKey
 * @returns {string}
 */
export function courseScopeReturnPath(scopeKey) {
  const key = normalizeCourseScopeKey(scopeKey) ?? COURSE_SCOPE_KEYS.EXAM;
  switch (key) {
    case COURSE_SCOPE_KEYS.EXAM:
      return '/exam';
    case COURSE_SCOPE_KEYS.CREATE_EXAM_BANK:
      return '/create-exam-bank';
    case COURSE_SCOPE_KEYS.PERSON_ANALYSIS:
      return '/person-analysis';
    case COURSE_SCOPE_KEYS.COURSE_ANALYSIS:
      return '/course-analysis';
    case COURSE_SCOPE_KEYS.LOG:
      return '/log';
    default:
      return '/exam';
  }
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
