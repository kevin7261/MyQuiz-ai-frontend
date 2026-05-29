/**
 * TopView 頂部「課程名稱 | 頁面名稱」（課程四頁）或「MyQuiz.ai | 頁面名稱」與 document.title 共用邏輯。
 */

/** @param {import('vue-router').RouteLocationNormalizedLoaded} route */
export function isCourseScopedHeaderRoute(route) {
  if (route.name === 'Exam' || route.name === 'ExamDetail') return true;
  if (route.name === 'CreateExamBank' || route.name === 'CreateExamBankDetail') return true;
  const view = route.params?.view;
  return view === 'person-analysis' || view === 'course-analysis';
}

/** @param {{ course_name?: string, course_id?: number } | null | undefined} course */
export function resolveCourseDisplayName(course) {
  if (!course) return null;
  return course.course_name || `課程 ${course.course_id}`;
}

/** @param {import('vue-router').RouteLocationNormalizedLoaded} route */
export function resolvePageName(route) {
  if (route.name === 'Courses') return '選擇課程';
  if (route.name === 'Login') return '登入';
  if (route.name === 'Exam' || route.name === 'ExamDetail') return '測驗';
  if (route.name === 'CreateExamBank' || route.name === 'CreateExamBankDetail') {
    return '建立測驗題庫';
  }
  if (route.name === 'Design') return 'UI 元件參考';

  const view = route.params?.view;
  if (view === 'person-analysis') return '作答弱點分析';
  if (view === 'course-analysis') return '學生作答分析';
  if (view === 'manage-users') return '使用者管理';
  if (view === 'profile') return '個人設定';
  if (view === 'settings') return '系統設定';
  if (view === 'log') return '系統紀錄';
  if (view === 'prompt-text') return 'Prompt 模板';
  if (view === 'logo') return 'Logo 繪製';
  if (view === 'work') return '測驗';
  if (view === 'create-exam-bank') return '建立測驗題庫';
  if (view === 'design') return 'UI 元件參考';

  return '';
}

/**
 * TopView 左側標題：課程四頁為課程名稱，其餘為 MyQuiz.ai。
 * @param {import('vue-router').RouteLocationNormalizedLoaded} route
 * @param {{ course_name?: string, course_id?: number } | null | undefined} [course]
 */
export function resolveBrandName(route, course) {
  if (isCourseScopedHeaderRoute(route)) {
    return resolveCourseDisplayName(course) ?? '選擇課程...';
  }
  return 'MYQUIZ.ai';
}

/**
 * @param {import('vue-router').RouteLocationNormalizedLoaded} route
 * @param {{ course_name?: string, course_id?: number } | null | undefined} [course]
 */
export function buildPageHeaderTitle(route, course) {
  const left = resolveBrandName(route, course);
  const right = resolvePageName(route);
  if (right) return `${left} | ${right}`;
  return left;
}
