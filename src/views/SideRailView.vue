<script setup>
/**
 * SideRailView - 系統 header（create-exam-bank_3 等全寬版面左側直立欄）
 *
 * 與課程 header（TopView）對稱：固定 64px 寬、高度 100%。
 * 頂部 64×(64+16)pt：51–54、71–72 漸層與白色菱形 logo（點擊重繪隨機漸層）。
 * 中段：開發者功能選單（dropend；測驗等四項僅在 TopView 右上角姓名下拉）。
 * 底部 64×64 icon：課程、系統設定、個人設定（使用者 icon 直連 /profile）；其下顯示目前版本。
 */
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import LogoCenterMark from '../components/LogoCenterMark.vue';
import { canSeeNavLink } from '../router/permissions.js';
import { useAppStore } from '../stores/appStore.js';
import { useSystemHeaderLogoGradients } from '../composables/useSystemHeaderLogoGradients.js';

/** 左欄漢堡選單（不含測驗／題庫／分析四項，該四項在 TopView 姓名下拉） */
const SIDE_RAIL_MENU_ITEMS = [
  { perm: 'users', to: '/manage-users', label: '使用者管理' },
  { perm: 'design', to: '/design', label: 'UI 元件參考' },
  { perm: 'logo', to: '/logo', label: 'Logo 繪製' },
  { perm: 'log', to: '/log', label: '系統紀錄' },
  { perm: 'prompt-text', to: '/prompt-text', label: 'Prompt 模板' },
];

const props = defineProps({
  userName: { type: String, default: '' },
  userType: { type: [Number, String], default: undefined },
});

const route = useRoute();
const appStore = useAppStore();
const currentVersion = appStore.currentVersion;
const {
  systemHeaderGradientLeftStyle,
  systemHeaderGradientRightStyle,
  regenerateSystemHeaderLogoGradients: regenerateLogoGradients,
} = useSystemHeaderLogoGradients();

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
</script>

<template>
  <aside class="my-system-header position-relative d-flex flex-column h-100 align-self-stretch overflow-visible flex-shrink-0 my-bgcolor-white" aria-label="系統 header">
    <div
      class="my-system-header__gradient position-absolute top-0 start-0 z-0 d-flex w-100 pe-none overflow-hidden"
      aria-hidden="true"
    >
      <div
        class="my-system-header__gradient-half w-50 h-100 min-w-0"
        :style="systemHeaderGradientLeftStyle"
      />
      <div
        class="my-system-header__gradient-half w-50 h-100 min-w-0"
        :style="systemHeaderGradientRightStyle"
      />
    </div>

    <button
      type="button"
      class="my-system-header__logo position-relative z-1 d-flex flex-shrink-0 align-items-center justify-content-center m-0 p-0 border-0 bg-transparent"
      aria-label="重新產生標誌漸層"
      title="重新產生標誌漸層"
      @click="regenerateLogoGradients"
    >
      <LogoCenterMark
        id-prefix="system-header-logo"
        variant="white-diamond-only"
        include-extension-row
        size-to-container
      />
    </button>

    <div class="my-system-header__spacer position-relative z-1 flex-grow-1 min-h-0" aria-hidden="true" />

    <nav class="my-system-header__nav position-relative z-2 d-flex flex-column flex-shrink-0 overflow-visible" aria-label="功能導覽">
      <div
        v-if="visibleMenuItems.length > 0"
        class="my-system-header__user-dropdown dropdown dropend position-static w-100"
      >
        <button
          type="button"
          class="my-system-header__action-btn d-flex align-items-center justify-content-center m-0 p-0 border-0 my-color-gray-1 fs-5 lh-1 text-decoration-none"
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

    <nav class="my-system-header__footer position-relative z-2 d-flex flex-column flex-shrink-0 overflow-visible" aria-label="系統功能">
      <router-link
        to="/courses"
        class="my-system-header__action-btn d-flex align-items-center justify-content-center m-0 p-0 border-0 my-color-gray-1 fs-5 lh-1 text-decoration-none"
        active-class="my-system-header__action-btn--active"
        aria-label="課程"
        title="課程"
      >
        <i class="fa-solid fa-chalkboard" aria-hidden="true" />
      </router-link>

      <router-link
        v-if="canSeeNavLink(userType, 'settings')"
        to="/settings"
        class="my-system-header__action-btn d-flex align-items-center justify-content-center m-0 p-0 border-0 my-color-gray-1 fs-5 lh-1 text-decoration-none"
        active-class="my-system-header__action-btn--active"
        aria-label="系統設定"
        title="系統設定"
      >
        <i class="fa-solid fa-gear" aria-hidden="true" />
      </router-link>

      <router-link
        v-if="canSeeNavLink(userType, 'profile')"
        to="/profile"
        class="my-system-header__action-btn d-flex align-items-center justify-content-center m-0 p-0 border-0 my-color-gray-1 fs-5 lh-1 text-decoration-none"
        active-class="my-system-header__action-btn--active"
        aria-label="個人設定"
        :title="userName || '個人設定'"
      >
        <i class="fa-solid fa-user" aria-hidden="true" />
      </router-link>
      <p class="my-system-header__version my-font-family-code my-font-sm-400 my-color-gray-1 text-center mb-0 px-1 pb-2">
        v{{ currentVersion }}
      </p>
    </nav>
  </aside>
</template>

<style scoped>
.my-system-header {
  /* 高於 TopView（50），右側直線分隔線 ::after 需蓋過欄內漸層與按鈕 */
  z-index: 51;
  width: 64px;
  min-width: 64px;
  max-width: 64px;
  min-height: 0;
}

.my-system-header::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  border-right: 1px solid var(--bs-border-color);
  z-index: 10;
  pointer-events: none;
}

.my-system-header__gradient {
  /* 51–54（64）+ 71–72（16）= 80，與 80×100 格網同比例 */
  height: calc(64px + 16px);
  /* 底部 32pt：上緣 0% 透明（實心）→ 底緣 100% 透明 */
  -webkit-mask-image: linear-gradient(
    to bottom,
    #000 0,
    #000 calc(100% - 32pt),
    transparent 100%
  );
  mask-image: linear-gradient(
    to bottom,
    #000 0,
    #000 calc(100% - 32pt),
    transparent 100%
  );
}

.my-system-header__gradient-half {
  flex: 1 1 50%;
}

.my-system-header__logo {
  width: 64px;
  height: calc(64px + 16px);
  min-width: 64px;
  min-height: calc(64px + 16px);
  line-height: 0;
  cursor: pointer;
  outline: none;
}

.my-system-header__action-btn {
  width: 64px;
  height: 64px;
  min-width: 64px;
  min-height: 64px;
  background: transparent;
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
  background-color: var(--my-color-gray-4);
}

.my-system-header__user-menu {
  z-index: 1100;
  min-width: 12rem;
}

.my-system-header__version {
  line-height: 1.2;
  word-break: break-all;
}
</style>
