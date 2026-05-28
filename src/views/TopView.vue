<script>
  /**
   * TopView - 課程 header（create-exam-bank_3 等全寬版面頂部橫欄）
   *
   * 課程切換由左側系統 header 負責；本列顯示「課程名稱 | 頁面名稱」，右側為題庫／試卷切換（詳情時）與使用者下拉選單。
   */
  import { computed } from 'vue';
  import { useRoute, useRouter } from 'vue-router';
  import { storeToRefs } from 'pinia';
  import { useAuthStore } from '../stores/authStore.js';
  import { useCourseHeaderStore } from '../stores/courseHeaderStore.js';
  import { canSeeNavLink } from '../router/permissions.js';
  import CreateExamQuizBankBankSwitchDropdown from '../components/CreateExamQuizBankBankSwitchDropdown.vue';
  import ExamPageExamSwitchDropdown from '../components/ExamPageExamSwitchDropdown.vue';

  export default {
    name: 'TopView',
    components: { CreateExamQuizBankBankSwitchDropdown, ExamPageExamSwitchDropdown },
    props: {
      userName: { type: String, default: '' },
      userType: { type: [Number, String], default: undefined },
    },
    setup() {
      const authStore = useAuthStore();
      const route = useRoute();
      const router = useRouter();
      const courseHeaderStore = useCourseHeaderStore();
      const {
        showBankSwitcher,
        gridItems: bankGridItems,
        selectedBankTabId,
        actionsDisabled: bankActionsDisabled,
        showExamSwitcher,
        examGridItems,
        selectedExamTabId,
        examActionsDisabled,
      } = storeToRefs(courseHeaderStore);

      const currentCourseName = computed(() => {
        const c = authStore.currentCourse;
        return c ? (c.course_name || `課程 ${c.course_id}`) : '選擇課程...';
      });

      /** TopView 版面之頁面名稱（課程名稱 | 頁面名稱） */
      const pageTitle = computed(() => {
        if (route.name === 'Exam' || route.name === 'ExamDetail') return '測驗';
        if (route.name === 'CreateExamBank' || route.name === 'CreateExamBankDetail') {
          return '建立測驗題庫';
        }
        if (route.name === 'Design') return 'UI 元件參考';
        if (route.params.view === 'person-analysis') return '作答弱點分析';
        if (route.params.view === 'course-analysis') return '學生作答分析';
        if (route.params.view === 'manage-users') return '使用者管理';
        if (route.params.view === 'profile') return '個人設定';
        if (route.params.view === 'settings') return '系統設定';
        if (route.params.view === 'log') return '系統紀錄';
        if (route.params.view === 'logo') return 'Logo 繪製';
        return '';
      });

      function onHeaderTitleClick() {
        router.push('/exam');
      }

      return {
        canSeeNavLink,
        currentCourseName,
        pageTitle,
        onHeaderTitleClick,
        showBankSwitcher,
        bankGridItems,
        selectedBankTabId,
        bankActionsDisabled,
        onBankSwitch: courseHeaderStore.switchBank,
        showExamSwitcher,
        examGridItems,
        selectedExamTabId,
        examActionsDisabled,
        onExamSwitch: courseHeaderStore.switchExam,
      };
    },
  };
</script>

<template>
  <header class="my-course-header flex-shrink-0 my-bgcolor-white border-bottom">
    <div class="my-course-header-inner px-3 min-w-0 w-100">
      <div class="my-course-header-inner__center min-w-0">
        <p class="my-course-header-course-title my-color-black text-truncate text-start w-100 mb-0">
          <span
            class="my-course-header-course-name my-font-lg-600"
            role="button"
            tabindex="0"
            @click="onHeaderTitleClick"
            @keydown.enter.prevent="onHeaderTitleClick"
          >{{ currentCourseName }}</span>
          <template v-if="pageTitle">
            <span class="my-course-header-course-title__sep my-color-gray-1 my-font-lg-400 mx-2" aria-hidden="true">|</span>
            <span class="my-font-lg-400">{{ pageTitle }}</span>
          </template>
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
            variant="course-header-nav"
            @switch-bank="onBankSwitch"
          />
          <ExamPageExamSwitchDropdown
            v-if="showExamSwitcher"
            :grid-items="examGridItems"
            :selected-exam-tab-id="selectedExamTabId"
            :disabled="examActionsDisabled"
            @switch-exam="onExamSwitch"
          />
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
            <li v-if="canSeeNavLink(userType, 'work')">
              <router-link class="dropdown-item" to="/exam" active-class="active">測驗</router-link>
            </li>
            <li>
              <router-link class="dropdown-item" to="/create-exam-bank" active-class="active">
                建立測驗題庫
              </router-link>
            </li>
            <li v-if="canSeeNavLink(userType, 'person-analysis')">
              <router-link
                class="dropdown-item"
                to="/person-analysis"
                active-class="active"
              >
                作答弱點分析
              </router-link>
            </li>
            <li v-if="canSeeNavLink(userType, 'course-analysis')">
              <router-link
                class="dropdown-item"
                to="/course-analysis"
                active-class="active"
              >
                學生作答分析
              </router-link>
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

.my-course-header-course-name {
  cursor: pointer;
}

.my-course-header-nav-btn {
  background-color: var(--my-color-white);
  border: 1px solid var(--my-color-gray-2);
  box-shadow: none;
  text-decoration: none;
}

.my-course-header-nav-btn.btn.rounded-pill {
  padding-left: 1.5rem !important;
  padding-right: 1.5rem !important;
}

.my-course-header-nav-btn:hover,
.my-course-header-nav-btn:focus-visible {
  background-color: color-mix(in srgb, var(--my-color-black) 7%, var(--my-color-white));
  border-color: color-mix(in srgb, var(--my-color-black) 18%, var(--my-color-gray-2));
  outline: none;
}

.my-course-header-nav-btn--active,
.my-course-header-nav-btn--active:hover,
.my-course-header-nav-btn--active:focus,
.my-course-header-nav-btn--active:focus-visible {
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
