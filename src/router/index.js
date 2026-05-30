/**
 * Vue Router 設定 - 前端路由與頁面標題
 *
 * 路由結構（課程相關頁面以 /{course_id}/ 為前綴，按前後頁時即可得知所屬課程）：
 * - / → 重導向至 /login
 * - /login → 登入頁（LoginView）
 * - /courses → 選擇課程頁（不帶 course_id）
 * - /design → UI 元件參考（全域，不帶 course_id）
 * - /:course_id/exam、/:course_id/exam/:exam_id/:exam_quiz_id → 測驗
 * - /:course_id/create-exam-bank、/:course_id/create-exam-bank/:exam_id/:exam_quiz_id → 建立測驗題庫
 * - /:course_id/:view → 課程範圍其他頁（person-analysis、course-analysis、log）
 * - /:view → 全域頁（profile、settings、manage-users、logo、prompt-text）
 * - 舊網址（/exam、/main/... 等不含 course_id）依目前 scope 記憶課程導向對應 /{course_id}/... 頁
 *
 * 主區塊與課程頁需登入、依 user_type 限制路由，見 main.js 的 router.beforeEach 與 permissions.js。
 */
import { createRouter, createWebHistory } from 'vue-router';
import LoginView from '../views/LoginView.vue';
import HomeView from '../views/HomeView.vue';
import { buildPageHeaderTitle } from '../utils/pageHeaderTitle.js';
import { useAuthStore } from '../stores/authStore.js';
import { COURSE_SCOPED_VIEW_SEGMENTS } from '../utils/courseScope.js';

/** 全域 view（/:view，無 course_id 前綴，用於側邊選單） */
const GLOBAL_VIEWS = [
  'profile',
  'logo',
  'manage-users',
  'settings',
  'prompt-text',
];

/**
 * 依目前 scope 記憶課程，把舊的無前綴網址導向帶 course_id 的對應頁。
 * @param {string} viewSegment - 'exam' | 'create-exam-bank' | 'person-analysis' | 'course-analysis' | 'log'
 * @param {(to: import('vue-router').RouteLocationNormalized) => string} [buildExtra] - 額外路徑片段（如試卷深連結）
 */
function scopedRedirect(viewSegment, buildExtra) {
  return (to) => {
    let loc;
    try {
      loc = useAuthStore().scopedRouteFor(viewSegment);
    } catch {
      loc = null;
    }
    if (!loc || typeof loc !== 'string') {
      const fallback = loc && typeof loc === 'object' ? loc : { path: '/courses' };
      return { path: fallback.path, query: { ...(fallback.query ?? {}), ...to.query } };
    }
    const extra = buildExtra ? buildExtra(to) : '';
    return { path: `${loc}${extra}`, query: to.query };
  };
}

/** 舊試卷深連結（/exam/:exam_id[/:exam_quiz_id]）→ /:course_id/exam/:exam_id/:exam_quiz_id 片段 */
function examDetailExtra(to) {
  const examId = String(to.params.exam_id ?? '').trim();
  if (!examId) return '';
  const quizId = String(to.params.exam_quiz_id ?? '0').trim() || '0';
  return `/${encodeURIComponent(examId)}/${encodeURIComponent(quizId)}`;
}

/** 舊題庫深連結（/create-exam-bank/:rag_id 或 /:exam_id/:exam_quiz_id）→ 對應片段 */
function bankDetailExtra(to) {
  const examId = String(to.params.exam_id ?? to.params.rag_id ?? '').trim();
  if (!examId) return '';
  const quizId = String(to.params.exam_quiz_id ?? '0').trim() || '0';
  return `/${encodeURIComponent(examId)}/${encodeURIComponent(quizId)}`;
}

const routes = [
  { path: '/', redirect: '/login' },
  {
    path: '/login',
    name: 'Login',
    component: LoginView,
    meta: { title: '登入 - MyQuiz.ai' },
  },
  {
    path: '/courses',
    name: 'Courses',
    component: HomeView,
    meta: { title: 'MyQuiz.ai | 選擇課程' },
  },
  {
    path: '/design',
    name: 'Design',
    component: HomeView,
    meta: { title: 'UI 元件參考 - MyQuiz.ai' },
  },

  // ── 課程範圍：測驗 ──
  {
    path: '/:course_id(\\d+)/exam',
    name: 'Exam',
    component: HomeView,
    meta: { title: '測驗 - MyQuiz.ai' },
  },
  {
    path: '/:course_id(\\d+)/exam/:exam_id/:exam_quiz_id',
    name: 'ExamDetail',
    component: HomeView,
    meta: { title: '測驗 - MyQuiz.ai' },
  },
  {
    path: '/:course_id(\\d+)/exam/:exam_id',
    redirect: (to) => ({
      path: `/${encodeURIComponent(String(to.params.course_id ?? ''))}/exam/${encodeURIComponent(String(to.params.exam_id ?? ''))}/0`,
      query: to.query,
    }),
  },

  // ── 課程範圍：建立測驗題庫 ──
  {
    path: '/:course_id(\\d+)/create-exam-bank',
    name: 'CreateExamBank',
    component: HomeView,
    meta: { title: '建立測驗題庫 - MyQuiz.ai' },
  },
  {
    path: '/:course_id(\\d+)/create-exam-bank/:exam_id/:exam_quiz_id',
    name: 'CreateExamBankDetail',
    component: HomeView,
    meta: { title: '建立測驗題庫 - MyQuiz.ai' },
  },
  {
    path: '/:course_id(\\d+)/create-exam-bank/:rag_id',
    redirect: (to) => ({
      path: `/${encodeURIComponent(String(to.params.course_id ?? ''))}/create-exam-bank/${encodeURIComponent(String(to.params.rag_id ?? ''))}/0`,
      query: to.query,
    }),
  },

  // ── 課程範圍：其他（person-analysis、course-analysis、log）──
  {
    path: '/:course_id(\\d+)/:view',
    name: 'CourseView',
    component: HomeView,
    meta: { title: 'MyQuiz.ai' },
    beforeEnter(to, _from, next) {
      if (COURSE_SCOPED_VIEW_SEGMENTS.includes(to.params.view)) return next();
      next(scopedRedirect('exam')(to));
    },
  },

  // ── 舊網址相容（無 course_id）：依目前 scope 記憶課程導向 ──
  { path: '/exam', redirect: scopedRedirect('exam') },
  { path: '/exam/:exam_id/:exam_quiz_id', redirect: scopedRedirect('exam', examDetailExtra) },
  { path: '/exam/:exam_id', redirect: scopedRedirect('exam', examDetailExtra) },
  { path: '/exam_3', redirect: scopedRedirect('exam') },
  { path: '/exam_3/:exam_id/:exam_quiz_id', redirect: scopedRedirect('exam', examDetailExtra) },
  { path: '/exam_3/:exam_id', redirect: scopedRedirect('exam', examDetailExtra) },
  { path: '/work', redirect: scopedRedirect('exam') },
  { path: '/exam_design', redirect: scopedRedirect('exam') },

  { path: '/create-exam-bank', redirect: scopedRedirect('create-exam-bank') },
  { path: '/create-exam-bank/:exam_id/:exam_quiz_id', redirect: scopedRedirect('create-exam-bank', bankDetailExtra) },
  { path: '/create-exam-bank/:rag_id', redirect: scopedRedirect('create-exam-bank', bankDetailExtra) },
  { path: '/create-exam-bank_2', redirect: scopedRedirect('create-exam-bank') },
  { path: '/create-exam-bank_2/:rag_id', redirect: scopedRedirect('create-exam-bank', bankDetailExtra) },
  { path: '/create-exam-bank_3', redirect: scopedRedirect('create-exam-bank') },
  { path: '/create-exam-bank_3/:exam_id/:exam_quiz_id', redirect: scopedRedirect('create-exam-bank', bankDetailExtra) },
  { path: '/create-exam-bank_3/:rag_id', redirect: scopedRedirect('create-exam-bank', bankDetailExtra) },
  { path: '/create-exam-bank_design', redirect: scopedRedirect('create-exam-bank') },
  { path: '/create-unit', redirect: scopedRedirect('create-exam-bank') },
  { path: '/create-rag', redirect: scopedRedirect('create-exam-bank') },

  { path: '/person-analysis', redirect: scopedRedirect('person-analysis') },
  { path: '/analysis', redirect: scopedRedirect('person-analysis') },
  { path: '/student-weakness-analysis', redirect: scopedRedirect('person-analysis') },
  { path: '/student-weakness-analysis_3', redirect: scopedRedirect('person-analysis') },

  { path: '/course-analysis', redirect: scopedRedirect('course-analysis') },
  { path: '/student-answer-analysis', redirect: scopedRedirect('course-analysis') },
  { path: '/student-answer-analysis_3', redirect: scopedRedirect('course-analysis') },

  { path: '/log', redirect: scopedRedirect('log') },
  { path: '/logs', redirect: scopedRedirect('log') },
  { path: '/logs_3', redirect: scopedRedirect('log') },

  // 舊網址相容（書籤）：/main/... → 新路徑
  { path: '/main', redirect: scopedRedirect('exam') },
  { path: '/main/analysis', redirect: scopedRedirect('person-analysis') },
  { path: '/main/create-unit', redirect: scopedRedirect('create-exam-bank') },
  { path: '/main/create-rag', redirect: scopedRedirect('create-exam-bank') },
  { path: '/main/course-analysis', redirect: scopedRedirect('course-analysis') },
  {
    path: '/main/:view',
    redirect: (to) => ({ path: `/${to.params.view}`, query: to.query }),
  },

  // 全域頁面別名
  { path: '/design_2', redirect: '/design' },
  { path: '/design_3', redirect: '/design' },
  { path: '/manage-users_3', redirect: '/manage-users' },
  { path: '/settings_3', redirect: '/settings' },
  { path: '/profile_3', redirect: '/profile' },
  { path: '/users', redirect: (to) => ({ path: '/manage-users', query: to.query }) },
  { path: '/user-management', redirect: (to) => ({ path: '/manage-users', query: to.query }) },

  // ── 全域 view（無 course_id 前綴）──
  {
    path: '/:view',
    name: 'Main',
    component: HomeView,
    meta: { title: 'MyQuiz.ai' },
    beforeEnter(to, _from, next) {
      if (GLOBAL_VIEWS.includes(to.params.view)) return next();
      next(scopedRedirect('exam')(to));
    },
  },
];

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
  scrollBehavior(to, from, savedPosition) {
    return savedPosition ?? { top: 0 };
  },
});

/** 每次導航完成後設定 document.title，並同步目前頁面的課程 scope */
router.afterEach((to) => {
  document.title = buildPageHeaderTitle(to);
  try {
    useAuthStore().syncActiveCourseScopeFromRoute(to);
  } catch {
    /* Pinia 尚未就緒 */
  }
});

export default router;
