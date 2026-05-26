<script>
  /**
   * LeftView - 主畫面左側選單
   *
   * 職責：
   * - 顯示品牌（MyQuiz.ai）
   * - 品牌下方課程按鈕：顯示目前課程名稱；點擊開啟選課 Modal
   * - 主要導覽（測驗、作答弱點分析）
   * - 左下角使用者名下拉：其餘功能與登出（含建立測驗題庫介面稿、UI 元件參考）
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
    emits: ['logout', 'open-course-modal'],
    setup(props, { emit }) {
      const authStore = useAuthStore();
      const onLogout = () => emit('logout');
      const onOpenCourseModal = () => emit('open-course-modal');

      const currentCourseName = computed(() => {
        const c = authStore.currentCourse;
        return c ? (c.course_name || `課程 ${c.course_id}`) : '選擇課程...';
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
      };
    },
  };
</script>

<template>
  <aside class="h-100 d-flex flex-column w-100 my-bgcolor-gray-3">
    <div class="my-left-view-header">
      <div class="my-left-view-brand">MyQuiz.ai</div>
      <button
        type="button"
        class="my-left-view-course-btn"
        @click="onOpenCourseModal"
      >
        {{ currentCourseName }}
      </button>
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
.my-left-view-header {
  flex-shrink: 0;
  width: 100%;
  padding: 1rem 0 0.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.my-left-view-brand {
  width: 100%;
  margin: 0;
  padding: 0;
  text-align: center;
  font-weight: 600;
  font-size: 1.25rem;
  line-height: 1.25;
  color: var(--my-color-black);
}

.my-left-view-course-btn {
  display: block;
  width: 100%;
  margin: 0;
  padding: 0.5rem 0;
  border: none;
  background: transparent;
  text-align: center;
  font-size: var(--my-font-size-md, 1rem);
  font-weight: 400;
  line-height: 1.5;
  color: var(--my-color-black);
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.my-left-view-course-btn:hover,
.my-left-view-course-btn:focus-visible {
  background-color: color-mix(in srgb, var(--my-color-black) 8%, transparent);
  outline: none;
}

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
