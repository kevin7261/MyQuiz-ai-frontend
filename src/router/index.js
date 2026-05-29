/**
 * Vue Router 設定 - 前端路由與頁面標題
 *
 * 路由結構：
 * - / → 重導向至 /login
 * - /login → 登入頁（LoginView）
 * - /exam、/exam/:exam_id/:exam_quiz_id → 測驗 TopView 全寬版（work）
 * - /create-exam-bank、/create-exam-bank/:exam_id/:exam_quiz_id → 建立測驗題庫九宮格版（詳情含題型深連結）
 * - /courses → 選擇課程頁（CourseListPage）
 * - /:view → 主區塊各功能（person-analysis、course-analysis、profile、design、manage-users 等），由 HomeView 依 view 渲染
 * - /main、/main/:view → 舊網址相容，重導向至 /exam 或 /:view
 *
 * 主區塊與 /exam 需登入、依 user_type 限制路由（/log 僅 user_type=1），見 main.js 的 router.beforeEach 與 permissions.js。
 */
import { createRouter, createWebHistory } from 'vue-router';
import LoginView from '../views/LoginView.vue';
import HomeView from '../views/HomeView.vue';
import { buildPageHeaderTitle } from '../utils/pageHeaderTitle.js';

/** 允許的 view 參數（對應 /:view 的網址片段，用於側邊選單） */
const VALID_VIEWS = [
  'work',
  'person-analysis',
  'course-analysis',
  'profile',
  'logo',
  'manage-users',
  'settings',
  'log',
  'prompt-text',
];

const routes = [
  { path: '/', redirect: '/login' },
  {
    path: '/login',
    name: 'Login',
    component: LoginView,
    meta: { title: '登入 - MyQuiz.ai' },
  },
  {
    path: '/exam',
    name: 'Exam',
    component: HomeView,
    meta: { title: '測驗 - MyQuiz.ai' },
  },
  {
    path: '/exam/:exam_id/:exam_quiz_id',
    name: 'ExamDetail',
    component: HomeView,
    meta: { title: '測驗 - MyQuiz.ai' },
  },
  {
    path: '/exam/:exam_id',
    redirect: (to) => ({
      path: `/exam/${encodeURIComponent(String(to.params.exam_id ?? ''))}/0`,
      query: to.query,
    }),
  },
  {
    path: '/exam_3',
    redirect: '/exam',
  },
  {
    path: '/exam_3/:exam_id/:exam_quiz_id',
    redirect: (to) => ({
      path: `/exam/${encodeURIComponent(String(to.params.exam_id ?? ''))}/${encodeURIComponent(String(to.params.exam_quiz_id ?? '0'))}`,
      query: to.query,
    }),
  },
  {
    path: '/exam_3/:exam_id',
    redirect: (to) => ({
      path: `/exam/${encodeURIComponent(String(to.params.exam_id ?? ''))}/0`,
      query: to.query,
    }),
  },
  {
    path: '/create-exam-bank',
    name: 'CreateExamBank',
    component: HomeView,
    meta: { title: '建立測驗題庫 - MyQuiz.ai' },
  },
  {
    path: '/create-exam-bank/:exam_id/:exam_quiz_id',
    name: 'CreateExamBankDetail',
    component: HomeView,
    meta: { title: '建立測驗題庫 - MyQuiz.ai' },
  },
  {
    path: '/create-exam-bank/:rag_id',
    redirect: (to) => ({
      path: `/create-exam-bank/${encodeURIComponent(String(to.params.rag_id ?? ''))}/0`,
      query: to.query,
    }),
  },
  {
    path: '/create-exam-bank_2',
    redirect: '/create-exam-bank',
  },
  {
    path: '/create-exam-bank_2/:rag_id',
    redirect: (to) => ({
      path: `/create-exam-bank/${encodeURIComponent(String(to.params.rag_id ?? ''))}/0`,
      query: to.query,
    }),
  },
  {
    path: '/create-exam-bank_3',
    redirect: '/create-exam-bank',
  },
  {
    path: '/create-exam-bank_3/:exam_id/:exam_quiz_id',
    redirect: (to) => ({
      path: `/create-exam-bank/${encodeURIComponent(String(to.params.exam_id ?? ''))}/${encodeURIComponent(String(to.params.exam_quiz_id ?? '0'))}`,
      query: to.query,
    }),
  },
  {
    path: '/create-exam-bank_3/:rag_id',
    redirect: (to) => ({
      path: `/create-exam-bank/${encodeURIComponent(String(to.params.rag_id ?? ''))}/0`,
      query: to.query,
    }),
  },
  {
    path: '/work',
    redirect: '/exam',
  },
  // 舊網址相容（書籤）：/main/... → 新路徑
  {
    path: '/main',
    redirect: (to) => ({ path: '/exam', query: to.query }),
  },
  {
    path: '/main/analysis',
    redirect: '/person-analysis',
  },
  {
    path: '/main/create-unit',
    redirect: '/create-exam-bank',
  },
  {
    path: '/main/create-rag',
    redirect: '/create-exam-bank',
  },
  {
    path: '/main/course-analysis',
    redirect: '/course-analysis',
  },
  {
    path: '/main/:view',
    redirect: (to) => ({ path: `/${to.params.view}`, query: to.query }),
  },
  {
    path: '/analysis',
    redirect: '/person-analysis',
  },
  {
    path: '/create-unit',
    redirect: '/create-exam-bank',
  },
  {
    path: '/create-rag',
    redirect: '/create-exam-bank',
  },
  {
    path: '/exam_design',
    redirect: '/exam',
  },
  {
    path: '/create-exam-bank_design',
    redirect: '/create-exam-bank',
  },
  {
    path: '/design',
    name: 'Design',
    component: HomeView,
    meta: { title: 'UI 元件參考 - MyQuiz.ai' },
  },
  {
    path: '/courses',
    name: 'Courses',
    component: HomeView,
    meta: { title: 'MyQuiz.ai | 選擇課程' },
  },
  {
    path: '/design_2',
    redirect: '/design',
  },
  {
    path: '/design_3',
    redirect: '/design',
  },
  {
    path: '/student-weakness-analysis',
    redirect: '/person-analysis',
  },
  {
    path: '/student-weakness-analysis_3',
    redirect: '/person-analysis',
  },
  {
    path: '/student-answer-analysis',
    redirect: '/course-analysis',
  },
  {
    path: '/student-answer-analysis_3',
    redirect: '/course-analysis',
  },
  {
    path: '/manage-users_3',
    redirect: '/manage-users',
  },
  {
    path: '/settings_3',
    redirect: '/settings',
  },
  {
    path: '/profile_3',
    redirect: '/profile',
  },
  {
    path: '/logs',
    redirect: '/log',
  },
  {
    path: '/logs_3',
    redirect: '/log',
  },
  {
    path: '/users',
    redirect: (to) => ({ path: '/manage-users', query: to.query }),
  },
  {
    path: '/user-management',
    redirect: (to) => ({ path: '/manage-users', query: to.query }),
  },
  {
    path: '/:view',
    name: 'Main',
    component: HomeView,
    meta: { title: 'MyQuiz.ai' },
    beforeEnter(to, _from, next) {
      const view = to.params.view;
      if (VALID_VIEWS.includes(view)) return next();
      next({ path: '/exam', replace: true });
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

/** 每次導航完成後設定 document.title */
router.afterEach((to) => {
  document.title = buildPageHeaderTitle(to);
});

export default router;
