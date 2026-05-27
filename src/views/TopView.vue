<script>
  /**
   * TopView - 課程 header（create-exam-bank_3 等全寬版面頂部橫欄）
   *
   * 課程切換由左側系統 header 負責；本列中央顯示課程名稱，右側為導覽與使用者選單。
   */
  import { computed } from 'vue';
  import { storeToRefs } from 'pinia';
  import { useAuthStore } from '../stores/authStore.js';
  import { useCourseHeaderStore } from '../stores/courseHeaderStore.js';
  import { canSeeNavLink } from '../router/permissions.js';
  import CreateExamQuizBankBankSwitchDropdown from '../components/CreateExamQuizBankBankSwitchDropdown.vue';

  export default {
    name: 'TopView',
    components: { CreateExamQuizBankBankSwitchDropdown },
    props: {
      userName: { type: String, default: '' },
      userType: { type: [Number, String], default: undefined },
    },
    setup() {
      const authStore = useAuthStore();
      const courseHeaderStore = useCourseHeaderStore();
      const {
        showBankSwitcher,
        gridItems: bankGridItems,
        selectedBankTabId,
        actionsDisabled: bankActionsDisabled,
        deleteRagLoading: bankDeleteRagLoading,
      } = storeToRefs(courseHeaderStore);

      const currentCourseName = computed(() => {
        const c = authStore.currentCourse;
        return c ? (c.course_name || `課程 ${c.course_id}`) : '選擇課程...';
      });

      return {
        canSeeNavLink,
        currentCourseName,
        showBankSwitcher,
        bankGridItems,
        selectedBankTabId,
        bankActionsDisabled,
        bankDeleteRagLoading,
        onBankSwitch: courseHeaderStore.switchBank,
        onBankDelete: courseHeaderStore.deleteBank,
      };
    },
  };
</script>

<template>
  <header class="my-course-header flex-shrink-0 my-bgcolor-white border-bottom">
    <div class="my-course-header-inner px-3 min-w-0 w-100">
      <div class="my-course-header-inner__center min-w-0">
        <p class="my-course-header-course-title my-font-xl-400 my-color-black text-truncate text-start w-100 mb-0">
          {{ currentCourseName }}
        </p>
      </div>

      <div class="my-course-header-inner__end d-flex align-items-center justify-content-end gap-2 gap-md-3 min-w-0 flex-shrink-0">
        <nav
          class="my-course-header-nav d-flex flex-row flex-shrink-0 gap-2 min-w-0 overflow-auto"
        >
          <CreateExamQuizBankBankSwitchDropdown
            v-if="showBankSwitcher"
            :grid-items="bankGridItems"
            :selected-bank-tab-id="selectedBankTabId"
            :disabled="bankActionsDisabled"
            :delete-rag-loading="bankDeleteRagLoading"
            variant="course-header-nav"
            @switch-bank="onBankSwitch"
            @delete-bank="onBankDelete"
          />
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

        <div class="my-course-header__user-dropdown my-design-08-dropdown dropdown flex-shrink-0 position-static">
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
        <ul class="dropdown-menu dropdown-menu-end my-course-header__user-menu">
          <li>
            <router-link class="dropdown-item" to="/create-exam-bank" active-class="active">建立測驗題庫</router-link>
          </li>
          <li v-if="canSeeNavLink(userType, 'student-answer-analysis')">
            <router-link class="dropdown-item" to="/student-answer-analysis" active-class="active">學生作答分析</router-link>
          </li>
          <li v-if="canSeeNavLink(userType, 'users')">
            <router-link class="dropdown-item" to="/manage-users" active-class="active">使用者管理</router-link>
          </li>
        </ul>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
.my-course-header {
  position: relative;
  z-index: 50;
  display: flex;
  align-items: stretch;
  box-sizing: border-box;
  height: 64px;
  min-height: 64px;
  max-height: 64px;
  overflow: visible;
}

.my-course-header-inner {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.75rem;
  height: 100%;
  min-height: 0;
  overflow: visible;
}

.my-course-header-inner__center {
  justify-self: stretch;
  width: 100%;
  min-width: 0;
}

.my-course-header-inner__end {
  justify-self: end;
  min-width: 0;
  overflow: visible;
}

.my-course-header__user-dropdown {
  position: static;
}

.my-course-header__user-menu {
  z-index: 1100;
}

.my-course-header-course-title {
  line-height: 1.35;
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
