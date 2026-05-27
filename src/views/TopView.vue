<script>
  /**
   * TopView - 課程 header（create-exam-bank_3 等全寬版面頂部橫欄）
   *
   * 職責與 LeftView 相同，改為水平排列；左側系統 header 由 SideRailView 負責。
   */
  import { computed } from 'vue';
  import { useRoute } from 'vue-router';
  import { useAuthStore } from '../stores/authStore.js';
  import { canSeeNavLink } from '../router/permissions.js';

  export default {
    name: 'TopView',
    props: {
      userName: { type: String, default: '' },
      userType: { type: [Number, String], default: undefined },
    },
    emits: ['logout', 'open-course-modal'],
    setup(props, { emit }) {
      const route = useRoute();
      const authStore = useAuthStore();
      const onLogout = () => emit('logout');
      const onOpenCourseModal = () => emit('open-course-modal');

      const currentCourseName = computed(() => {
        const c = authStore.currentCourse;
        return c ? (c.course_name || `課程 ${c.course_id}`) : '選擇課程...';
      });

      /** 超過一門課程時顯示可切換的 v 鈕；僅一門時為一般文字 */
      const hasMultipleCourses = computed(() => authStore.courses.length > 1);

      /** 頂欄中央：目前頁面名稱（取自路由 meta.title，去掉站名後綴） */
      const currentPageTitle = computed(() => {
        const raw = String(route.meta?.title ?? '').trim();
        if (!raw) return 'MyQuiz.ai';
        return raw.replace(/\s*-\s*MyQuiz\.ai\s*$/i, '').trim() || 'MyQuiz.ai';
      });

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
        currentPageTitle,
      };
    },
  };
</script>

<template>
  <header class="my-course-header flex-shrink-0 my-bgcolor-white border-bottom">
    <div class="my-course-header-inner px-3 min-w-0 w-100">
      <div class="my-course-header-inner__start d-flex align-items-center min-w-0">
        <button
          v-if="hasMultipleCourses"
          type="button"
          class="my-course-header-course-btn d-inline-flex align-items-center gap-2 p-2 flex-shrink-0"
          @click="onOpenCourseModal"
        >
          <span class="overflow-hidden text-truncate">{{ currentCourseName }}</span>
          <i class="fa-solid fa-chevron-down my-course-header-course-caret flex-shrink-0" aria-hidden="true" />
        </button>
        <span v-else class="my-course-header-course-label flex-shrink-0">{{ currentCourseName }}</span>
      </div>

      <div class="my-course-header-inner__center min-w-0">
        <p class="my-course-header-page-title my-font-xl-400 my-color-black text-truncate text-center w-100 mb-0 px-3">
          {{ currentPageTitle }}
        </p>
      </div>

      <div class="my-course-header-inner__end d-flex align-items-center justify-content-end gap-2 gap-md-3 min-w-0 flex-shrink-0">
        <nav
          class="my-course-header-nav d-flex flex-row flex-shrink-0 gap-2 min-w-0 overflow-auto"
        >
          <router-link
            v-if="canSeeNavLink(userType, 'work')"
            to="/exam"
            class="btn rounded-pill my-font-md-400 px-3 py-2 text-nowrap my-course-header-nav-btn"
            active-class="my-course-header-nav-btn--active"
          >測驗</router-link>
          <router-link
            v-if="canSeeNavLink(userType, 'student-weakness-analysis')"
            to="/student-weakness-analysis"
            class="btn rounded-pill my-font-md-400 px-3 py-2 text-nowrap my-course-header-nav-btn"
            active-class="my-course-header-nav-btn--active"
          >作答弱點分析</router-link>
        </nav>

        <div class="my-design-08-dropdown dropdown flex-shrink-0">
        <button
          type="button"
          class="btn rounded-pill d-inline-flex align-items-center gap-3 dropdown-toggle my-dropdown-caret my-font-md-400 my-button-white min-w-0 px-4 py-2 text-start"
          data-bs-toggle="dropdown"
          aria-expanded="false"
          aria-haspopup="true"
        >
          <span class="overflow-hidden text-truncate text-start">{{ userName || '—' }}</span>
          <i class="fa-solid fa-bars my-dropdown-toggle-caret flex-shrink-0" aria-hidden="true" />
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
          <li v-if="canSeeNavLink(userType, 'design_3')">
            <router-link class="dropdown-item" to="/design_3" active-class="active">UI 元件參考 3</router-link>
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
    </div>
  </header>
</template>

<style scoped>
.my-course-header {
  z-index: 40;
  display: flex;
  align-items: stretch;
  box-sizing: border-box;
  height: 64px;
  min-height: 64px;
  max-height: 64px;
  overflow: hidden;
}

.my-course-header-inner {
  display: grid;
  grid-template-columns: 1fr minmax(0, 50%) 1fr;
  align-items: center;
  gap: 0.75rem;
  height: 100%;
  min-height: 0;
}

.my-course-header-inner__start {
  justify-self: start;
  min-width: 0;
}

.my-course-header-inner__center {
  justify-self: stretch;
  width: 100%;
  min-width: 0;
}

.my-course-header-inner__end {
  justify-self: end;
  min-width: 0;
}

.my-course-header-page-title {
  line-height: 1.35;
}

.my-course-header-course-btn,
.my-course-header-course-label {
  max-width: 12rem;
  margin: 0;
  font-size: var(--my-font-size-md, 1rem);
  font-weight: var(--my-font-weight-semibold, 600);
  line-height: 1.5;
  color: var(--my-color-black);
}

.my-course-header-course-btn {
  border: none;
  border-radius: 0.375rem;
  background: transparent;
  cursor: pointer;
  min-width: 0;
}

.my-course-header-course-label {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.my-course-header-course-caret {
  font-size: var(--my-font-size-sm);
  line-height: 1;
}

.my-course-header-course-btn:hover,
.my-course-header-course-btn:focus-visible {
  background-color: color-mix(in srgb, var(--my-color-black) 8%, transparent);
  outline: none;
}

.my-course-header-nav-btn {
  color: var(--my-color-gray-1);
  background-color: var(--my-color-white);
  border: 1px solid var(--my-color-gray-2);
  box-shadow: none;
  text-decoration: none;
}

.my-course-header-nav-btn:hover,
.my-course-header-nav-btn:focus-visible {
  color: var(--my-color-gray-1);
  background-color: color-mix(in srgb, var(--my-color-black) 7%, var(--my-color-white));
  border-color: color-mix(in srgb, var(--my-color-black) 18%, var(--my-color-gray-2));
  outline: none;
}

.my-course-header-nav-btn--active,
.my-course-header-nav-btn--active:hover,
.my-course-header-nav-btn--active:focus,
.my-course-header-nav-btn--active:focus-visible {
  color: var(--my-color-gray-1);
  background-color: var(--my-color-gray-3);
  border-color: var(--my-color-gray-2);
}

.my-course-header .my-design-08-dropdown .btn.my-button-white {
  min-width: 0;
  max-width: 10rem;
  width: auto;
  color: var(--my-color-black) !important;
  background-color: var(--my-color-white) !important;
  border: 1px solid var(--my-color-gray-2) !important;
  box-shadow: none;
}

.my-course-header .my-design-08-dropdown .btn.my-button-white:hover:not(:disabled),
.my-course-header .my-design-08-dropdown .btn.my-button-white:focus-visible:not(:disabled),
.my-course-header .my-design-08-dropdown .btn.my-button-white:active:not(:disabled),
.my-course-header .my-design-08-dropdown .btn.my-button-white.show {
  color: var(--my-color-black) !important;
  background-color: color-mix(in srgb, var(--my-color-black) 7%, var(--my-color-white)) !important;
  border: 1px solid color-mix(in srgb, var(--my-color-black) 18%, var(--my-color-gray-2)) !important;
}
</style>
