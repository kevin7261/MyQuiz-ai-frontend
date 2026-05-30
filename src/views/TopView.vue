<script>
  /**
   * TopView - 課程 header（create-exam-bank_3 等全寬版面頂部橫欄）
   *
   * 課程切換由左側系統 header 負責；本列顯示「課程名稱 | 頁面名稱」（測驗等四頁）或「MyQuiz.ai | 頁面名稱」。課程名稱點擊回選課；頁面名稱為「建立測驗題庫」或「測驗」時點擊回該頁九宮格主頁。右側題庫／試卷切換（詳情時）與使用者下拉選單僅在已選課程之課程四頁顯示；其餘頁面（選課、系統／個人設定、左欄開發者選單等）僅顯示姓名。
   */
  import { computed } from 'vue';
  import { useRoute, useRouter } from 'vue-router';
  import { storeToRefs } from 'pinia';
  import { useAuthStore } from '../stores/authStore.js';
  import { useCourseHeaderStore } from '../stores/courseHeaderStore.js';
  import { canSeeNavLink } from '../router/permissions.js';
  import { resolveBrandName, resolvePageName, isCourseScopedHeaderRoute } from '../utils/pageHeaderTitle.js';
  import { buildCoursesPageLocation, resolveCourseScopeKey } from '../utils/courseScope.js';

  /** 右上角姓名下拉（測驗等四頁）僅在已選課程且為課程範圍頁面時顯示 */
  function shouldShowCourseUserNavDropdown(route, course) {
    return isCourseScopedHeaderRoute(route) && course?.course_id != null;
  }
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
      const route = useRoute();
      const router = useRouter();
      const authStore = useAuthStore();
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

      const routeCourse = computed(() => {
        const scope = resolveCourseScopeKey(route);
        return scope ? authStore.getCourseForScope(scope) : authStore.currentCourse;
      });

      const currentCourseName = computed(() =>
        resolveBrandName(route, routeCourse.value),
      );

      /** 非課程四頁左側為 MYQUIZ.ai：Google Sans Code，字寬與課程名稱相同 */
      const useBrandCodeFont = computed(() => !isCourseScopedHeaderRoute(route));

      /** TopView 版面之頁面名稱（課程名稱 | 頁面名稱） */
      const pageTitle = computed(() => resolvePageName(route));

      const showUserNavDropdown = computed(() =>
        shouldShowCourseUserNavDropdown(route, routeCourse.value),
      );

      function onHeaderTitleClick() {
        router.push(buildCoursesPageLocation(route));
      }

      /** 「課程名稱 | 頁面名稱」之頁面名稱：建立測驗題庫／測驗可點擊回該頁九宮格主頁 */
      const pageTitleClickable = computed(() => {
        const t = pageTitle.value;
        return t === '建立測驗題庫' || t === '測驗';
      });

      function onPageTitleClick() {
        if (!pageTitleClickable.value) return;
        const name = route.name;
        if (name === 'Exam' || name === 'ExamDetail') {
          courseHeaderStore.backToExamHome();
        } else if (name === 'CreateExamBank' || name === 'CreateExamBankDetail') {
          courseHeaderStore.backToBankHome();
        }
      }

      return {
        canSeeNavLink,
        scopedRouteFor: authStore.scopedRouteFor,
        currentCourseName,
        useBrandCodeFont,
        pageTitle,
        pageTitleClickable,
        showUserNavDropdown,
        onHeaderTitleClick,
        onPageTitleClick,
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
  <header class="my-course-header position-relative d-flex align-items-stretch overflow-visible flex-shrink-0 my-bgcolor-white border-bottom">
    <div class="my-course-header-inner d-grid align-items-center gap-3 h-100 overflow-visible px-3 min-w-0 w-100">
      <div class="my-course-header-inner__center w-100 min-w-0">
        <p class="my-course-header-course-title my-color-black text-truncate text-start w-100 mb-0">
          <span
            class="my-course-header-course-name my-font-lg-600"
            :class="{ 'my-font-family-code': useBrandCodeFont }"
            role="button"
            tabindex="0"
            @click="onHeaderTitleClick"
            @keydown.enter.prevent="onHeaderTitleClick"
          >{{ currentCourseName }}</span>
          <template v-if="pageTitle">
            <span class="my-course-header-course-title__sep my-color-gray-1 my-font-lg-400 mx-3" aria-hidden="true">|</span>
            <span
              class="my-font-lg-400"
              :class="{ 'my-course-header-page-name': pageTitleClickable }"
              :role="pageTitleClickable ? 'button' : undefined"
              :tabindex="pageTitleClickable ? 0 : undefined"
              @click="onPageTitleClick"
              @keydown.enter.prevent="onPageTitleClick"
            >{{ pageTitle }}</span>
          </template>
        </p>
      </div>

      <div class="my-course-header-inner__end overflow-visible d-flex align-items-center justify-content-end gap-2 gap-md-3 min-w-0 flex-shrink-0">
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

        <div
          v-if="showUserNavDropdown"
          class="my-course-header__user-dropdown my-design-08-dropdown dropdown flex-shrink-0 position-static"
        >
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
              <router-link class="dropdown-item" :to="scopedRouteFor('exam')" active-class="active">測驗</router-link>
            </li>
            <li>
              <router-link class="dropdown-item" :to="scopedRouteFor('create-exam-bank')" active-class="active">
                建立測驗題庫
              </router-link>
            </li>
            <li v-if="canSeeNavLink(userType, 'person-analysis')">
              <router-link
                class="dropdown-item"
                :to="scopedRouteFor('person-analysis')"
                active-class="active"
              >
                作答弱點分析
              </router-link>
            </li>
            <li v-if="canSeeNavLink(userType, 'course-analysis')">
              <router-link
                class="dropdown-item"
                :to="scopedRouteFor('course-analysis')"
                active-class="active"
              >
                學生作答分析
              </router-link>
            </li>
          </ul>
        </div>
        <span
          v-else
          class="my-course-header__user-name my-font-md-400 my-color-black overflow-hidden text-truncate text-start flex-shrink-0 px-4 py-2"
        >{{ userName || '—' }}</span>
      </div>
    </div>
  </header>
</template>

<style scoped>
.my-course-header {
  z-index: 50;
  height: 64px;
  min-height: 64px;
  max-height: 64px;
}

.my-course-header-inner {
  grid-template-columns: minmax(0, 1fr) auto;
  min-height: 0;
}

.my-course-header-inner__center {
  justify-self: stretch;
}

.my-course-header-inner__end {
  justify-self: end;
}

.my-course-header__user-menu {
  z-index: 1100;
}

.my-course-header-course-title {
  line-height: 1.35;
}

.my-course-header-course-name,
.my-course-header-page-name {
  cursor: pointer;
}

.my-course-header__user-name {
  max-width: 10rem;
  line-height: 1.35;
}

.my-course-header .my-design-08-dropdown .btn.my-button-white {
  max-width: 10rem;
  color: var(--my-color-black) !important;
  background-color: var(--my-color-white) !important;
  border: 1px solid var(--my-color-gray-3) !important;
  box-shadow: none;
}

.my-course-header .my-design-08-dropdown .btn.my-button-white:hover:not(:disabled),
.my-course-header .my-design-08-dropdown .btn.my-button-white:focus-visible:not(:disabled),
.my-course-header .my-design-08-dropdown .btn.my-button-white:active:not(:disabled),
.my-course-header .my-design-08-dropdown .btn.my-button-white.show {
  color: var(--my-color-black) !important;
  background-color: color-mix(in srgb, var(--my-color-black) 7%, var(--my-color-white)) !important;
  border: 1px solid color-mix(in srgb, var(--my-color-black) 18%, var(--my-color-gray-3)) !important;
}
</style>
