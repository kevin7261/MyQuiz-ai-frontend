/**
 * TopView 頂部「MyQuiz.ai | 頁面名稱」與 document.title 共用邏輯。
 */

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

export function resolveBrandName() {
  return 'MyQuiz.ai';
}

/** @param {import('vue-router').RouteLocationNormalizedLoaded} route */
export function buildPageHeaderTitle(route) {
  const left = resolveBrandName();
  const right = resolvePageName(route);
  if (right) return `${left} | ${right}`;
  return left;
}
