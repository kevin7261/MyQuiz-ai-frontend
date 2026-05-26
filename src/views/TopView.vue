<script>
  /**
   * TopView - 頂部導覽列（create-exam-bank_3 等全寬版面）
   *
   * 職責與 LeftView 相同，改為水平排列於頁面頂部。
   */
  import { computed } from 'vue';
  import { useAuthStore } from '../stores/authStore.js';
  import { canSeeNavLink } from '../router/permissions.js';
  import LogoGridSvg from '../components/LogoGridSvg.vue';

  const TOP_VIEW_LOGO_WIDTH = 40;
  const TOP_VIEW_LOGO_HEIGHT = Math.round(TOP_VIEW_LOGO_WIDTH * (180 / 240));

  export default {
    name: 'TopView',
    components: { LogoGridSvg },
    props: {
      userName: { type: String, default: '' },
      userType: { type: [Number, String], default: undefined },
    },
    emits: ['logout', 'open-course-modal'],
    setup(props, { emit }) {
      const authStore = useAuthStore();
      const onLogout = () => emit('logout');
      const onOpenCourseModal = () => emit('open-course-modal');

      const currentCourseName = computed(() => {
        const c = authStore.currentCourse;
        return c ? (c.course_name || `課程 ${c.course_id}`) : '選擇課程...';
      });

      /** 超過一門課程時顯示可切換的 v 鈕；僅一門時為一般文字 */
      const hasMultipleCourses = computed(() => authStore.courses.length > 1);

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
        onOpenCourseModal,
        canSeeNavLink,
        showDividerBeforeProfile,
        currentCourseName,
        hasMultipleCourses,
        topViewLogoWidth: TOP_VIEW_LOGO_WIDTH,
        topViewLogoHeight: TOP_VIEW_LOGO_HEIGHT,
      };
    },
  };
</script>

<template>
  <header class="my-top-view flex-shrink-0 my-bgcolor-gray-3 border-bottom">
    <div class="my-top-view-inner d-flex align-items-center gap-2 gap-md-3 px-3 py-2 min-w-0">
      <div class="d-flex align-items-center gap-2 flex-shrink-0 min-w-0">
        <div class="my-top-view-brand flex-shrink-0" aria-label="MyQuiz.ai">
          <LogoGridSvg
            :show-grid="false"
            :show-background="false"
            id-prefix="top-view-brand"
            :colors="{ background: 'var(--my-color-gray-3)' }"
            :svg-width="topViewLogoWidth"
            :svg-height="topViewLogoHeight"
          />
        </div>

        <button
          v-if="hasMultipleCourses"
          type="button"
          class="my-top-view-course-btn d-inline-flex align-items-center gap-2 p-2 flex-shrink-0"
          @click="onOpenCourseModal"
        >
          <span class="overflow-hidden text-truncate">{{ currentCourseName }}</span>
          <i class="fa-solid fa-chevron-down my-top-view-course-caret flex-shrink-0" aria-hidden="true" />
        </button>
        <span v-else class="my-top-view-course-label py-2 flex-shrink-0">{{ currentCourseName }}</span>
      </div>

      <nav
        class="my-top-view-nav nav nav-pills flex-row flex-grow-1 justify-content-center gap-1 min-w-0 overflow-auto"
      >
        <router-link
          v-if="canSeeNavLink(userType, 'work')"
          to="/exam"
          class="nav-link text-nowrap"
          active-class="active"
        >測驗</router-link>
        <router-link
          v-if="canSeeNavLink(userType, 'student-weakness-analysis')"
          to="/student-weakness-analysis"
          class="nav-link text-nowrap"
          active-class="active"
        >作答弱點分析</router-link>
      </nav>

      <div class="my-design-08-dropdown dropdown flex-shrink-0">
        <button
          type="button"
          class="btn rounded-2 d-flex justify-content-between align-items-center dropdown-toggle my-dropdown-caret my-font-md-400 my-button-white min-w-0 px-3 py-2 text-start"
          data-bs-toggle="dropdown"
          aria-expanded="false"
          aria-haspopup="true"
        >
          <span class="overflow-hidden text-truncate text-start pe-2">{{ userName || '—' }}</span>
          <i class="fa-solid fa-chevron-down my-dropdown-toggle-caret flex-shrink-0" aria-hidden="true" />
        </button>
        <ul class="dropdown-menu dropdown-menu-end">
          <li>
            <router-link class="dropdown-item" to="/create-exam-bank" active-class="active">建立測驗題庫</router-link>
          </li>
          <li v-if="canSeeNavLink(userType, 'design')">
            <router-link class="dropdown-item" to="/design" active-class="active">UI 元件參考</router-link>
          </li>
          <li v-if="canSeeNavLink(userType, 'design_2')">
            <router-link class="dropdown-item" to="/design_2" active-class="active">UI 元件參考 2</router-link>
          </li>
          <li v-if="canSeeNavLink(userType, 'logo')">
            <router-link class="dropdown-item" to="/logo" active-class="active">Logo 繪製</router-link>
          </li>
          <li v-if="canSeeNavLink(userType, 'student-answer-analysis')">
            <router-link class="dropdown-item" to="/student-answer-analysis" active-class="active">學生作答分析</router-link>
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
  </header>
</template>

<style scoped>
.my-top-view {
  z-index: 40;
}

.my-top-view-inner {
  min-height: 3.25rem;
}

.my-top-view-brand {
  display: flex;
  align-items: center;
  line-height: 0;
}

.my-top-view-course-btn,
.my-top-view-course-label {
  max-width: 12rem;
  margin: 0;
  font-size: var(--my-font-size-md, 1rem);
  font-weight: var(--my-font-weight-semibold, 600);
  line-height: 1.5;
  color: var(--my-color-black);
}

.my-top-view-course-btn {
  border: none;
  border-radius: 0.375rem;
  background: transparent;
  cursor: pointer;
  min-width: 0;
}

.my-top-view-course-label {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.my-top-view-course-caret {
  font-size: var(--my-font-size-sm);
  line-height: 1;
}

.my-top-view-course-btn:hover,
.my-top-view-course-btn:focus-visible {
  background-color: color-mix(in srgb, var(--my-color-black) 8%, transparent);
  outline: none;
}

.my-top-view-nav .nav-link {
  color: var(--my-color-black);
}

.my-top-view-nav .nav-link:not(.active):hover,
.my-top-view-nav .nav-link:not(.active):focus-visible {
  background-color: var(--my-color-gray-4);
  color: var(--my-color-black);
}

.my-top-view-nav .nav-link.active,
.my-top-view-nav .nav-link.active:hover,
.my-top-view-nav .nav-link.active:focus,
.my-top-view-nav .nav-link.active:focus-visible {
  background-color: var(--my-color-white);
  color: var(--my-color-black);
}

.my-design-08-dropdown .btn {
  min-width: 7rem;
  max-width: 10rem;
}
</style>
