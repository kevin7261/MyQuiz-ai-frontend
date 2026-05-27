<script>
  /**
   * SideRailView - 系統 header（create-exam-bank_3 等全寬版面左側直立欄）
   *
   * 與課程 header（TopView）對稱：固定 64px 寬、高度 100%。
   * 頂部 64×64：僅白色菱形 logo（點擊重繪頂部隨機漸層）；15% 高度左右各 50% 隨機漸層淡出。
   * 底部 64×64 icon：課程、設定、使用者。
   */
  import { ref } from 'vue';
  import LogoCenterMark from '../components/LogoCenterMark.vue';
  import { canSeeNavLink } from '../router/permissions.js';
  import { createRandomLogoDiamondSplitHorizontalGradients } from '../utils/logoDiamondGradient.js';

  /** 64×64 方塊內圖示撐滿（48pt ≈ 64px） */
  const SYSTEM_HEADER_LOGO_MARK_SIZE_PT = 48;

  export default {
    name: 'SideRailView',
    components: { LogoCenterMark },
    props: {
      userName: { type: String, default: '' },
      userType: { type: [Number, String], default: undefined },
    },
    emits: ['logout', 'open-course-modal'],
    setup(props, { emit }) {
      const systemHeaderGradientLeftStyle = ref({ background: 'transparent' });
      const systemHeaderGradientRightStyle = ref({ background: 'transparent' });

      function applyLogoGradients() {
        const split = createRandomLogoDiamondSplitHorizontalGradients();
        systemHeaderGradientLeftStyle.value = { background: split.left };
        systemHeaderGradientRightStyle.value = { background: split.right };
      }

      applyLogoGradients();

      const onLogout = () => emit('logout');
      const onOpenCourseModal = () => emit('open-course-modal');

      return {
        SYSTEM_HEADER_LOGO_MARK_SIZE_PT,
        systemHeaderGradientLeftStyle,
        systemHeaderGradientRightStyle,
        regenerateLogoGradients: applyLogoGradients,
        onLogout,
        onOpenCourseModal,
        canSeeNavLink,
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
        v-if="canSeeNavLink(userType, 'profile')"
        to="/profile"
        class="my-system-header__action-btn"
        active-class="my-system-header__action-btn--active"
        aria-label="設定"
        title="設定"
      >
        <i class="fa-solid fa-gear" aria-hidden="true" />
      </router-link>

      <div class="my-system-header__user-dropdown dropdown dropend position-static">
        <button
          type="button"
          class="my-system-header__action-btn"
          data-bs-toggle="dropdown"
          aria-expanded="false"
          aria-haspopup="true"
          aria-label="使用者"
          :title="userName || '使用者'"
        >
          <i class="fa-solid fa-user" aria-hidden="true" />
        </button>
        <ul class="dropdown-menu dropdown-menu-end my-system-header__user-menu">
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
          <li v-if="canSeeNavLink(userType, 'settings')">
            <router-link class="dropdown-item" to="/settings" active-class="active">系統設定</router-link>
          </li>
          <li v-if="canSeeNavLink(userType, 'logs')">
            <router-link class="dropdown-item" to="/logs" active-class="active">系統紀錄</router-link>
          </li>
          <li>
            <hr class="dropdown-divider" />
          </li>
          <li>
            <a class="dropdown-item my-color-red" href="#" @click.prevent="onLogout">登出</a>
          </li>
        </ul>
      </div>
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
