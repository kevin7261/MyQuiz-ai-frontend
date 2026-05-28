<script>
  /**
   * SideRailView - 系統 header（create-exam-bank_3 等全寬版面左側直立欄）
   *
   * 與課程 header（TopView）對稱：固定 64px 寬、高度 100%。
   * 頂部 64×64：僅白色菱形 logo（點擊重繪頂部隨機漸層）。
   * 中段：開發者功能選單（dropend；測驗等四項僅在 TopView 右上角姓名下拉）。
   * 底部 64×64 icon：課程、系統設定、個人設定（使用者 icon 直連 /profile）。
   */
  import { computed, ref } from 'vue';
  import { useRoute } from 'vue-router';
  import LogoCenterMark from '../components/LogoCenterMark.vue';
  import { canSeeNavLink } from '../router/permissions.js';
  import { createRandomLogoDiamondSplitHorizontalGradients } from '../utils/logoDiamondGradient.js';

  /** 64×64 方塊內圖示撐滿（48pt ≈ 64px） */
  const SYSTEM_HEADER_LOGO_MARK_SIZE_PT = 48;

  /** 左欄漢堡選單（不含測驗／題庫／分析四項，該四項在 TopView 姓名下拉） */
  const SIDE_RAIL_MENU_ITEMS = [
    { perm: 'users', to: '/manage-users', label: '使用者管理' },
    { perm: 'design', to: '/design', label: 'UI 元件參考' },
    { perm: 'logo', to: '/logo', label: 'Logo 繪製' },
    { perm: 'log', to: '/log', label: '系統紀錄' },
  ];

  export default {
    name: 'SideRailView',
    components: { LogoCenterMark },
    props: {
      userName: { type: String, default: '' },
      userType: { type: [Number, String], default: undefined },
    },
    emits: ['open-course-modal'],
    setup(props, { emit }) {
      const route = useRoute();
      const systemHeaderGradientLeftStyle = ref({});
      const systemHeaderGradientRightStyle = ref({});

      function applyLogoGradients() {
        const split = createRandomLogoDiamondSplitHorizontalGradients();
        systemHeaderGradientLeftStyle.value = split.left;
        systemHeaderGradientRightStyle.value = split.right;
      }

      applyLogoGradients();

      const onOpenCourseModal = () => emit('open-course-modal');

      const visibleMenuItems = computed(() =>
        SIDE_RAIL_MENU_ITEMS.filter(
          (item) => item.perm == null || canSeeNavLink(props.userType, item.perm),
        ),
      );

      const isMenuActive = computed(() =>
        visibleMenuItems.value.some(
          (item) => route.path === item.to || route.path.startsWith(`${item.to}/`),
        ),
      );

      return {
        SYSTEM_HEADER_LOGO_MARK_SIZE_PT,
        systemHeaderGradientLeftStyle,
        systemHeaderGradientRightStyle,
        regenerateLogoGradients: applyLogoGradients,
        onOpenCourseModal,
        canSeeNavLink,
        visibleMenuItems,
        isMenuActive,
      };
    },
  };
</script>

<template>
  <aside class="my-system-header flex-shrink-0 my-bgcolor-white border-end" aria-label="系統 header">
    <div class="my-system-header__gradient" aria-hidden="true">
      <div
        class="my-system-header__gradient-half"
        :style="systemHeaderGradientLeftStyle"
      />
      <div
        class="my-system-header__gradient-half"
        :style="systemHeaderGradientRightStyle"
      />
    </div>

    <button
      type="button"
      class="my-system-header__logo"
      aria-label="重新產生標誌漸層"
      title="重新產生標誌漸層"
      @click="regenerateLogoGradients"
    >
      <LogoCenterMark
        id-prefix="system-header-logo"
        variant="white-diamond-only"
        :size-pt="SYSTEM_HEADER_LOGO_MARK_SIZE_PT"
      />
    </button>

    <div class="my-system-header__spacer flex-grow-1 min-h-0" aria-hidden="true" />

    <nav class="my-system-header__nav" aria-label="功能導覽">
      <div
        v-if="visibleMenuItems.length > 0"
        class="my-system-header__user-dropdown dropdown dropend position-static"
      >
        <button
          type="button"
          class="my-system-header__action-btn"
          :class="{ 'my-system-header__action-btn--active': isMenuActive }"
          data-bs-toggle="dropdown"
          aria-expanded="false"
          aria-haspopup="true"
          aria-label="功能選單"
          title="功能選單"
        >
          <i class="fa-solid fa-bars" aria-hidden="true" />
        </button>
        <ul class="dropdown-menu dropdown-menu-end my-system-header__user-menu">
          <li v-for="item in visibleMenuItems" :key="item.to">
            <router-link class="dropdown-item" :to="item.to" active-class="active">
              {{ item.label }}
            </router-link>
          </li>
        </ul>
      </div>
    </nav>

    <nav class="my-system-header__footer" aria-label="系統功能">
      <button
        type="button"
        class="my-system-header__action-btn"
        aria-label="課程"
        title="課程"
        @click="onOpenCourseModal"
      >
        <i class="fa-solid fa-chalkboard" aria-hidden="true" />
      </button>

      <router-link
        v-if="canSeeNavLink(userType, 'settings')"
        to="/settings"
        class="my-system-header__action-btn"
        active-class="my-system-header__action-btn--active"
        aria-label="系統設定"
        title="系統設定"
      >
        <i class="fa-solid fa-gear" aria-hidden="true" />
      </router-link>

      <router-link
        v-if="canSeeNavLink(userType, 'profile')"
        to="/profile"
        class="my-system-header__action-btn"
        active-class="my-system-header__action-btn--active"
        aria-label="個人設定"
        :title="userName || '個人設定'"
      >
        <i class="fa-solid fa-user" aria-hidden="true" />
      </router-link>
    </nav>
  </aside>
</template>

<style scoped>
.my-system-header {
  position: relative;
  z-index: 50;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  width: 64px;
  min-width: 64px;
  max-width: 64px;
  height: 100%;
  min-height: 0;
  align-self: stretch;
  flex-shrink: 0;
  overflow: visible;
}

.my-system-header__gradient {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 0;
  display: flex;
  width: 100%;
  height: 15%;
  pointer-events: none;
  -webkit-mask-image: linear-gradient(to bottom, #000 0%, transparent 100%);
  mask-image: linear-gradient(to bottom, #000 0%, transparent 100%);
}

.my-system-header__gradient-half {
  flex: 1 1 50%;
  width: 50%;
  height: 100%;
  min-width: 0;
  overflow: hidden;
}

.my-system-header__logo {
  position: relative;
  z-index: 1;
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 64px;
  height: 64px;
  min-width: 64px;
  min-height: 64px;
  margin: 0;
  padding: 0;
  border: none;
  line-height: 0;
  background: transparent;
  cursor: pointer;
}

.my-system-header__logo:hover,
.my-system-header__logo:focus-visible {
  background-color: color-mix(in srgb, var(--my-color-black) 7%, var(--my-color-white));
  outline: none;
}

.my-system-header__spacer {
  position: relative;
  z-index: 1;
}

.my-system-header__nav {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  overflow: visible;
}

.my-system-header__footer {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  overflow: visible;
}

.my-system-header__action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 64px;
  height: 64px;
  min-width: 64px;
  min-height: 64px;
  margin: 0;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--my-color-gray-1);
  font-size: 1.25rem;
  line-height: 1;
  text-decoration: none;
  cursor: pointer;
}

.my-system-header__action-btn:hover,
.my-system-header__action-btn:focus-visible {
  color: var(--my-color-black);
  background-color: color-mix(in srgb, var(--my-color-black) 7%, var(--my-color-white));
  outline: none;
}

.my-system-header__action-btn--active,
.my-system-header__action-btn--active:hover,
.my-system-header__action-btn--active:focus-visible {
  color: var(--my-color-black);
  background-color: var(--my-color-gray-3);
}

.my-system-header__user-dropdown {
  position: static;
  width: 100%;
}

.my-system-header__user-menu {
  z-index: 1100;
  min-width: 12rem;
}
</style>
