<script>
  /**
   * LeftView - 主畫面左側選單
   *
   * 職責：
   * - 顯示品牌（MyQuiz.ai）
   * - 品牌下方課程切換下拉選單：顯示目前課程名稱；展開後可切換其他課程
   * - 主要導覽（測驗、作答弱點分析）
   * - 左下角使用者名下拉：其餘功能與登出
   */
  import { computed } from 'vue';
  import { useAuthStore } from '../stores/authStore.js';
  import { canSeeNavLink } from '../router/permissions.js';

  export default {
    name: 'LeftView',
    props: {
      /** 下拉按鈕顯示名稱 */
      userName: { type: String, default: '' },
      /** 後端 user_type；3 為學生，側邊欄僅顯示允許的項目 */
      userType: { type: [Number, String], default: undefined },
    },
    emits: ['logout'],
    setup(props, { emit }) {
      const authStore = useAuthStore();
      const onLogout = () => emit('logout');

      const currentCourseName = computed(() => {
        const c = authStore.currentCourse;
        return c ? (c.course_name || `課程 ${c.course_id}`) : '選擇課程...';
      });

      const hasCourses = computed(() => authStore.courses.length > 0);

      function selectCourse(course) {
        authStore.setCurrentCourse(course);
      }

      const showDividerBeforeProfile = computed(() => {
        const t = props.userType;
        if (!canSeeNavLink(t, 'profile')) return false;
        return (
          canSeeNavLink(t, 'student-answer-analysis') ||
          canSeeNavLink(t, 'users') ||
          canSeeNavLink(t, 'settings') ||
          canSeeNavLink(t, 'logs')
        );
      });

      return {
        onLogout,
        canSeeNavLink,
        showDividerBeforeProfile,
        currentCourseName,
        hasCourses,
        authStore,
        selectCourse,
      };
    },
  };
</script>

<template>
  <aside class="h-100 d-flex flex-column w-100 my-bgcolor-gray-3">
    <div class="fw-semibold fs-5 my-color-black lh-sm px-3 pt-3 pb-2">MyQuiz.ai</div>

    <!-- 課程切換下拉（樣式與左下使用者名下拉一致） -->
    <div class="flex-shrink-0 px-3 pb-2">
      <div class="my-design-08-dropdown dropdown w-100 min-w-0">
        <button
          type="button"
          class="btn rounded-2 d-flex justify-content-between align-items-center dropdown-toggle my-dropdown-caret my-font-md-400 my-button-white w-100 min-w-0 px-3 py-2 text-start"
          data-bs-toggle="dropdown"
          aria-expanded="false"
          aria-haspopup="true"
        >
          <span class="flex-grow-1 overflow-hidden text-truncate text-start pe-2">{{ currentCourseName }}</span>
          <i class="fa-solid fa-chevron-down my-dropdown-toggle-caret flex-shrink-0" aria-hidden="true" />
        </button>
        <ul class="dropdown-menu dropdown-menu-start w-100">
          <li v-if="!hasCourses">
            <span class="dropdown-item disabled">無可用課程</span>
          </li>
          <template v-else>
            <li v-for="course in authStore.courses" :key="course.course_user_id">
              <a
                class="dropdown-item"
                :class="{ active: authStore.currentCourse?.course_id === course.course_id }"
                href="#"
                @click.prevent="selectCourse(course)"
              >
                {{ course.course_name || `課程 ${course.course_id}` }}
              </a>
            </li>
          </template>
        </ul>
      </div>
    </div>

    <nav
      class="my-left-view-nav nav nav-pills flex-column flex-grow-1 justify-content-start align-items-stretch gap-1 overflow-auto px-3 mt-4 pb-3"
    >
      <router-link
        v-if="canSeeNavLink(userType, 'work')"
        to="/exam"
        class="nav-link"
        active-class="active"
        >測驗</router-link
      >
      <router-link
        v-if="canSeeNavLink(userType, 'student-weakness-analysis')"
        to="/student-weakness-analysis"
        class="nav-link"
        active-class="active"
        >作答弱點分析</router-link
      >
    </nav>
    <div class="flex-shrink-0 px-3 pb-2 mt-auto">
      <div class="my-design-08-dropdown dropdown dropup w-100 min-w-0">
        <button
          type="button"
          class="btn rounded-2 d-flex justify-content-between align-items-center dropdown-toggle my-dropdown-caret my-font-md-400 my-button-white w-100 min-w-0 px-3 py-2 text-start"
          data-bs-toggle="dropdown"
          aria-expanded="false"
          aria-haspopup="true"
        >
          <span class="flex-grow-1 overflow-hidden text-truncate text-start pe-2">{{ userName || '—' }}</span>
          <i class="fa-solid fa-chevron-down my-dropdown-toggle-caret flex-shrink-0" aria-hidden="true" />
        </button>
        <ul class="dropdown-menu dropdown-menu-start w-100">
          <li>
            <router-link class="dropdown-item" to="/create-exam-bank" active-class="active">建立測驗題庫</router-link>
          </li>
          <li v-if="canSeeNavLink(userType, 'student-answer-analysis')">
            <router-link class="dropdown-item" to="/student-answer-analysis" active-class="active"
              >學生作答分析</router-link
            >
          </li>
          <li v-if="canSeeNavLink(userType, 'users')">
            <router-link class="dropdown-item" to="/manage-users" active-class="active">使用者管理</router-link>
          </li>
          <li v-if="canSeeNavLink(userType, 'settings')">
            <router-link class="dropdown-item" to="/settings" active-class="active">系統設定</router-link>
          </li>
          <li v-if="canSeeNavLink(userType, 'logs')">
            <router-link class="dropdown-item" to="/logs" active-class="active">系統紀錄</router-link>
          </li>
          <li v-if="showDividerBeforeProfile">
            <hr class="dropdown-divider" />
          </li>
          <li v-if="canSeeNavLink(userType, 'profile')">
            <router-link class="dropdown-item" to="/profile" active-class="active">設定</router-link>
          </li>
          <li>
            <hr class="dropdown-divider" />
          </li>
          <li>
            <a class="dropdown-item my-color-red" href="#" @click.prevent="onLogout">登出</a>
          </li>
        </ul>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.my-left-view-nav .nav-link {
  color: var(--my-color-black);
}
.my-left-view-nav .nav-link:not(.active):hover,
.my-left-view-nav .nav-link:not(.active):focus-visible {
  background-color: var(--my-color-gray-4);
  color: var(--my-color-black);
}
.my-left-view-nav .nav-link.active,
.my-left-view-nav .nav-link.active:hover,
.my-left-view-nav .nav-link.active:focus,
.my-left-view-nav .nav-link.active:focus-visible {
  background-color: var(--my-color-white);
  color: var(--my-color-black);
}
</style>
