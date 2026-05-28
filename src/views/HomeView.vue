<script>
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import CourseSelectModal from '../components/CourseSelectModal.vue';
import SideRailView from './SideRailView.vue';
import TopView from './TopView.vue';
import RightView from './RightView.vue';
import { useDataStore } from '../stores/dataStore.js';
import { useAuthStore } from '../stores/authStore.js';
import { userMayAccessRoute } from '../router/permissions.js';

const MAIN_WORK_TAB_ID = 'main';

const PATH_TO_VIEW = {
  work: 'work',
  'person-analysis': 'personAnalysis',
  'course-analysis': 'courseAnalysis',
  profile: 'profile',
  'create-exam-bank': 'createExamQuizBank',
  design: 'designPage',
  logo: 'logoPage',
  'manage-users': 'userManagement',
  settings: 'systemSettings',
  log: 'logList',
  'prompt-text': 'promptText',
};
const VIEW_TO_PATH = Object.fromEntries(Object.entries(PATH_TO_VIEW).map(([k, v]) => [v, k]));

export default {
  name: 'HomeView',
  components: { CourseSelectModal, SideRailView, TopView, RightView },

  setup() {
    const router = useRouter();
    const route = useRoute();
    const dataStore = useDataStore();
    const authStore = useAuthStore();

    const courseModalOpen = ref(false);

    const currentView = computed(() => {
      if (route.name === 'Exam' || route.name === 'ExamDetail') return 'work';
      if (route.name === 'CreateExamBank' || route.name === 'CreateExamBankDetail') return 'createExamQuizBank';
      if (route.name === 'Design') return 'designPage';
      return PATH_TO_VIEW[route.params.view] || 'work';
    });

    const userName = computed(() =>
      authStore.user?.name ? authStore.user.name : '—',
    );

    watch(
      () => authStore.currentCourse,
      (course) => {
        if (course === null && authStore.user) courseModalOpen.value = true;
      },
      { immediate: true },
    );

    function onCourseSelect(course) {
      const prev = authStore.currentCourse;
      const isDifferent =
        !prev ||
        prev.course_id !== course.course_id ||
        prev.course_user_id !== course.course_user_id;
      authStore.setCurrentCourse(course);
      courseModalOpen.value = false;
      if (isDifferent) window.location.reload();
    }

    function openCourseModal() {
      courseModalOpen.value = true;
    }

    const setView = (type) => {
      if (type === 'work') {
        if (route.name !== 'Exam' && route.name !== 'ExamDetail') router.push('/exam');
        return;
      }
      if (type === 'createExamQuizBank') {
        if (route.name !== 'CreateExamBank' && route.name !== 'CreateExamBankDetail') {
          router.push('/create-exam-bank');
        }
        return;
      }
      const path = VIEW_TO_PATH[type] ?? 'work';
      if (route.params.view !== path) router.push(`/${path}`);
    };

    const onLogout = () => {
      authStore.logout();
      router.push('/login');
    };

    onMounted(() => {
      dataStore.addWorkTab(MAIN_WORK_TAB_ID);
    });

    watch(
      () => [route.fullPath, authStore.user],
      () => {
        if (!authStore.user) return;
        if (!userMayAccessRoute(authStore.user, route)) {
          router.replace({ path: '/exam', replace: true });
        }
      },
      { immediate: true },
    );

    return {
      currentView,
      MAIN_WORK_TAB_ID,
      userName,
      authStore,
      courseModalOpen,
      setView,
      onLogout,
      onCourseSelect,
      openCourseModal,
      onCourseModalClose: () => { courseModalOpen.value = false; },
    };
  },
};
</script>

<template>
  <div class="container-fluid h-100 d-flex flex-column p-0">
    <CourseSelectModal
      :open="courseModalOpen"
      :courses="authStore.courses"
      :closable="authStore.currentCourse !== null"
      @select="onCourseSelect"
      @close="onCourseModalClose"
    />

    <div class="d-flex flex-row h-100 g-0 my-home-layout">
      <SideRailView
        :user-name="userName"
        :user-type="authStore.user?.user_type"
        @open-course-modal="openCourseModal"
      />
      <div class="d-flex flex-column flex-grow-1 min-w-0 min-h-0">
        <TopView
          :user-name="userName"
          :user-type="authStore.user?.user_type"
        />
        <div class="flex-grow-1 min-h-0 overflow-hidden d-flex flex-column">
          <RightView :current-view="currentView" :tab-id="MAIN_WORK_TAB_ID" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.my-home-layout {
  min-height: 0;
  flex: 1 1 0;
  align-items: stretch;
}
</style>
