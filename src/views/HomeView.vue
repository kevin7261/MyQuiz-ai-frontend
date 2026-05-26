<script>
  /**
   * HomeView - 登入後的主畫面
   *
   * 職責：
   * - 左側選單：測驗、作答弱點分析；其餘項目與登出在使用者名下拉選單
   * - 依 route.path / route.params.view 決定 currentView，只渲染對應的一個頁面組件
   * - /exam 對應 work（ExamPage），/:view 對應 student-weakness-analysis / create-exam-bank（建立測驗題庫頁）等
   * - onMounted 時在 dataStore 註冊一個工作分頁（MAIN_WORK_TAB_ID）供 Exam 使用
   * - 登入後若 currentCourse 為 null，自動顯示 CourseSelectModal 讓使用者選擇課程
   * - 切換至不同課程時整頁重新載入，確保各頁 API 與快取狀態皆對應新 course_id
   */
  import { ref, computed, onMounted, watch } from 'vue';
  import { useRouter, useRoute } from 'vue-router';
  import LoadingOverlay from '../components/LoadingOverlay.vue';
  import CourseSelectModal from '../components/CourseSelectModal.vue';
  import LeftView from './LeftView.vue';
  import TopView from './TopView.vue';
  import RightView from './RightView.vue';
  import { useDataStore } from '../stores/dataStore.js';
  import { useAuthStore } from '../stores/authStore.js';
  import { userMayAccessRoute } from '../router/permissions.js';

  /** Exam 頁使用的固定分頁 id（與 dataStore workTabs 對應） */
  const MAIN_WORK_TAB_ID = 'main';

/** 網址 params.view 對應內部 currentView 類型 */
const PATH_TO_VIEW = {
  work: 'work',
  'student-weakness-analysis': 'studentWeaknessAnalysis',
  'student-answer-analysis': 'studentAnswerAnalysis',
  profile: 'profile',
  'create-exam-bank': 'createExamQuizBank',
  'create-exam-bank_2': 'createExamQuizBank2',
  'create-exam-bank_3': 'createExamQuizBank3',
  design: 'designPage',
  design_2: 'designPage2',
  logo: 'logoPage',
  'manage-users': 'userManagement',
  settings: 'systemSettings',
  logs: 'logList',
};
  const VIEW_TO_PATH = Object.fromEntries(Object.entries(PATH_TO_VIEW).map(([k, v]) => [v, k]));

  export default {
    name: 'HomeView',
    components: { LoadingOverlay, CourseSelectModal, LeftView, TopView, RightView },

    setup() {
      const router = useRouter();
      const route = useRoute();
      const dataStore = useDataStore();
      const authStore = useAuthStore();

      /** 課程 Modal 是否開啟：currentCourse 為 null 時自動開啟；亦可由左側課程按鈕手動開啟 */
      const courseModalOpen = ref(false);

      /** 目前要顯示的區塊：work | studentWeaknessAnalysis | studentAnswerAnalysis | profile | createExamQuizBank | designPage | userManagement | systemSettings | logList */
      const currentView = computed(() => {
        if (route.path === '/exam') return 'work';
        if (route.path === '/exam_2' || route.name === 'Exam2Detail') return 'work2';
        if (route.path === '/create-exam-bank_2' || route.name === 'CreateExamBank2Detail') {
          return 'createExamQuizBank2';
        }
        if (route.path === '/create-exam-bank_3' || route.name === 'CreateExamBank3Detail') {
          return 'createExamQuizBank3';
        }
        return PATH_TO_VIEW[route.params.view] || 'work';
      });
      const userName = computed(() => (authStore.user && authStore.user.name ? authStore.user.name : '—'));

      /** create-exam-bank_3：全寬版面，頂部導覽列取代左側欄 */
      const useTopHeaderLayout = computed(
        () => route.path.startsWith('/create-exam-bank_3') || route.name === 'CreateExamBank3Detail',
      );

      /** currentCourse 為 null 時（含登入後首次進入）自動彈出選課 Modal */
      watch(
        () => authStore.currentCourse,
        (course) => {
          if (course === null && authStore.user) {
            courseModalOpen.value = true;
          }
        },
        { immediate: true }
      );

      function onCourseSelect(course) {
        const prev = authStore.currentCourse;
        const isDifferent =
          !prev ||
          prev.course_id !== course.course_id ||
          prev.course_user_id !== course.course_user_id;
        authStore.setCurrentCourse(course);
        courseModalOpen.value = false;
        if (isDifferent) {
          window.location.reload();
        }
      }

      function onCourseModalClose() {
        courseModalOpen.value = false;
      }

      function openCourseModal() {
        courseModalOpen.value = true;
      }

      /** 切換顯示區塊（由導覽連結或程式呼叫）；work 導向 /exam，其餘導向 /:view */
      const setView = (type) => {
        if (type === 'work') {
          if (route.path !== '/exam') router.push('/exam');
          return;
        }
        if (type === 'work2') {
          if (!route.path.startsWith('/exam_2')) router.push('/exam_2');
          return;
        }
        if (type === 'createExamQuizBank2') {
          if (!route.path.startsWith('/create-exam-bank_2')) router.push('/create-exam-bank_2');
          return;
        }
        if (type === 'createExamQuizBank3') {
          if (!route.path.startsWith('/create-exam-bank_3')) router.push('/create-exam-bank_3');
          return;
        }
        const path = VIEW_TO_PATH[type] ?? 'work';
        if (route.params.view !== path) router.push(`/${path}`);
      };

      /** 登出：清空 authStore 並導向 /login */
      const onLogout = () => {
        authStore.logout();
        router.push('/login');
      };

      onMounted(() => {
        dataStore.addWorkTab(MAIN_WORK_TAB_ID);
      });

      /** 與全域守衛雙重確認：若仍落在無權限路由（例如狀態還原時序），強制導向 /exam */
      watch(
        () => [route.fullPath, authStore.user],
        () => {
          if (!authStore.user) return;
          if (!userMayAccessRoute(authStore.user, route)) {
            router.replace({ path: '/exam', replace: true });
          }
        },
        { immediate: true }
      );

      return {
        currentView,
        useTopHeaderLayout,
        MAIN_WORK_TAB_ID,
        userName,
        authStore,
        courseModalOpen,
        setView,
        onLogout,
        onCourseSelect,
        onCourseModalClose,
        openCourseModal,
      };
    },
  };
</script>

<template>
  <div class="container-fluid h-100 d-flex flex-column p-0">
    <LoadingOverlay
      :isVisible="false"
      loadingText="載入中..."
      :progress="0"
      :showProgress="false"
      subText=""
    />

    <CourseSelectModal
      :open="courseModalOpen"
      :courses="authStore.courses"
      :closable="authStore.currentCourse !== null"
      @select="onCourseSelect"
      @close="onCourseModalClose"
    />

    <div v-if="useTopHeaderLayout" class="d-flex flex-column h-100 g-0 my-home-layout">
      <TopView
        :user-name="userName"
        :user-type="authStore.user?.user_type"
        @logout="onLogout"
        @open-course-modal="openCourseModal"
      />
      <div class="flex-grow-1 min-h-0 overflow-hidden d-flex flex-column">
        <RightView :current-view="currentView" :tab-id="MAIN_WORK_TAB_ID" />
      </div>
    </div>

    <div v-else class="row h-100 g-0 my-home-layout">
      <div class="col-4 col-md-3 col-lg-2 h-100 overflow-hidden">
        <LeftView
          :user-name="userName"
          :user-type="authStore.user?.user_type"
          @logout="onLogout"
          @open-course-modal="openCourseModal"
        />
      </div>
      <div class="col-8 col-md-9 col-lg-10 h-100 overflow-hidden d-flex flex-column">
        <RightView :current-view="currentView" :tab-id="MAIN_WORK_TAB_ID" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.my-home-layout {
  min-height: 0;
  flex: 1 1 0;
}
</style>
