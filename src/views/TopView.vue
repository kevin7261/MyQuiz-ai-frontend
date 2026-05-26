<script>
  /**
   * TopView - 頂部導覽列（create-exam-bank_3 等全寬版面）
   *
   * 職責與 LeftView 相同，改為水平排列於頁面頂部。
   */
  import { computed, ref } from 'vue';
  import { useRoute } from 'vue-router';
  import { useAuthStore } from '../stores/authStore.js';
  import { canSeeNavLink } from '../router/permissions.js';
  import LogoGridSvg from '../components/LogoGridSvg.vue';

  /** 中央菱形：每次 TopView 建立時隨機鮮豔二色線性漸層 */
  function createRandomLogoDiamondGradient() {
    const vividHues = [0, 18, 32, 48, 120, 155, 195, 220, 265, 290, 315, 340];
    const hue1 = vividHues[Math.floor(Math.random() * vividHues.length)]
      + Math.floor(Math.random() * 14) - 7;
    const hue2 = (hue1 + 55 + Math.floor(Math.random() * 95)) % 360;
    const sat = 96 + Math.floor(Math.random() * 4);
    const dirs = [
      { x1: '0%', y1: '0%', x2: '100%', y2: '100%' },
      { x1: '0%', y1: '100%', x2: '100%', y2: '0%' },
      { x1: '0%', y1: '50%', x2: '100%', y2: '50%' },
      { x1: '50%', y1: '0%', x2: '50%', y2: '100%' },
    ];
    const dir = dirs[Math.floor(Math.random() * dirs.length)];
    return {
      ...dir,
      stops: [
        { offset: '0%', color: `hsl(${hue1}, ${sat}%, ${50 + Math.floor(Math.random() * 8)}%)` },
        { offset: '100%', color: `hsl(${hue2}, ${sat}%, ${44 + Math.floor(Math.random() * 10)}%)` },
      ],
    };
  }

  export default {
    name: 'TopView',
    components: { LogoGridSvg },
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

      function buildTopViewLogoColors() {
        return {
          primary: 'var(--my-color-white)',
          secondary: 'var(--my-color-gray-3)',
          backgroundGradient: createRandomLogoDiamondGradient(),
        };
      }

      const topViewLogoColors = ref(buildTopViewLogoColors());
      const topViewLogoIdSuffix = ref(0);

      function onLogoClick() {
        topViewLogoColors.value = buildTopViewLogoColors();
        topViewLogoIdSuffix.value += 1;
      }

      return {
        onLogout,
        onOpenCourseModal,
        onLogoClick,
        canSeeNavLink,
        showDividerBeforeProfile,
        currentCourseName,
        hasMultipleCourses,
        currentPageTitle,
        topViewLogoColors,
        topViewLogoIdSuffix,
      };
    },
  };
</script>

<template>
  <header class="my-top-view flex-shrink-0 my-bgcolor-white border-bottom">
    <button
      type="button"
      class="my-top-view-brand flex-shrink-0"
      aria-label="MyQuiz.ai，點擊變更 logo 配色"
      @click="onLogoClick"
    >
      <LogoGridSvg
        :key="topViewLogoIdSuffix"
        :show-grid="false"
        :show-background="false"
        center-cells-only
        size-to-container
        :id-prefix="`top-view-brand-${topViewLogoIdSuffix}`"
        :colors="topViewLogoColors"
      />
    </button>

    <div class="my-top-view-inner px-3 py-2 min-w-0 flex-grow-1">
      <div class="my-top-view-inner__start d-flex align-items-center min-w-0">
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

      <div class="my-top-view-inner__center min-w-0">
        <p class="my-top-view-page-title my-font-lg-400 my-color-black text-truncate text-center w-100 mb-0 px-3 py-2">
          {{ currentPageTitle }}
        </p>
      </div>

      <div class="my-top-view-inner__end d-flex align-items-center justify-content-end gap-2 gap-md-3 min-w-0 flex-shrink-0">
        <nav
          class="my-top-view-nav nav nav-pills flex-row flex-shrink-0 gap-1 min-w-0 overflow-auto"
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
    </div>
  </header>
</template>

<style scoped>
.my-top-view {
  z-index: 40;
  display: flex;
  align-items: stretch;
}

.my-top-view-inner {
  display: grid;
  grid-template-columns: 1fr minmax(0, 50%) 1fr;
  align-items: center;
  gap: 0.75rem;
  min-height: 3.25rem;
}

.my-top-view-inner__start {
  justify-self: start;
  min-width: 0;
}

.my-top-view-inner__center {
  justify-self: stretch;
  width: 100%;
  min-width: 0;
}

.my-top-view-inner__end {
  justify-self: end;
  min-width: 0;
}

.my-top-view-page-title {
  line-height: 1.35;
}

.my-top-view-brand {
  display: flex;
  align-self: stretch;
  flex-shrink: 0;
  height: 100%;
  line-height: 0;
  margin: 0;
  padding: 0;
  border: none;
  background-color: var(--my-color-gray-3);
  cursor: pointer;
}

.my-top-view-brand:hover,
.my-top-view-brand:focus-visible {
  outline: none;
  opacity: 0.92;
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
  background-color: var(--my-color-gray-3);
  color: var(--my-color-black);
}

.my-design-08-dropdown .btn {
  min-width: 7rem;
  max-width: 10rem;
}
</style>
