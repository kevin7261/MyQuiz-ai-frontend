<script>
  /**
   * RightView - 主畫面右側內容區
   *
   * 職責：
   * - 依 currentView 渲染對應頁面：測驗、作答弱點分析、建立測驗題庫、學生作答分析等
   * - 使用 KeepAlive + 動態元件：切換左側選單時保留各頁 DOM／狀態（捲動、表單、分頁內容），避免 v-if 卸載導致重設
  */
  import { markRaw } from 'vue';
  import ExamPage from '../pages/ExamPage.vue';
  import AnswerWeaknessAnalysisPage from '../pages/AnswerWeaknessAnalysisPage.vue';
  import StudentAnswerAnalysisPage from '../pages/StudentAnswerAnalysisPage.vue';
  import ProfilePage from '../pages/ProfilePage.vue';
  import CreateExamQuizBankPage from '../pages/CreateExamQuizBankPage.vue';
  import DesignPage from '../pages/DesignPage.vue';
  import LogoPage from '../pages/LogoPage.vue';
  import UserManagementPage from '../pages/UserManagementPage.vue';
  import SystemSettingsPage from '../pages/SystemSettingsPage.vue';
  import LogListPage from '../pages/LogListPage.vue';
  import PromptTextPage from '../pages/PromptTextPage.vue';
  import CourseListPage from '../pages/CourseListPage.vue';

  /** 與 HomeView currentView 鍵一致；markRaw 避免把元件選項做成深度 reactive */
  const VIEW_COMPONENTS = {
    work: markRaw(ExamPage),
    personAnalysis: markRaw(AnswerWeaknessAnalysisPage),
    courseAnalysis: markRaw(StudentAnswerAnalysisPage),
    profile: markRaw(ProfilePage),
    createExamQuizBank: markRaw(CreateExamQuizBankPage),
    designPage: markRaw(DesignPage),
    logoPage: markRaw(LogoPage),
    userManagement: markRaw(UserManagementPage),
    systemSettings: markRaw(SystemSettingsPage),
    logList: markRaw(LogListPage),
    promptText: markRaw(PromptTextPage),
    courseList: markRaw(CourseListPage),
  };

  export default {
    name: 'RightView',
    props: {
      currentView: { type: String, required: true },
      tabId: { type: String, required: true },
    },
    computed: {
      activePageComponent() {
        return VIEW_COMPONENTS[this.currentView] ?? ExamPage;
      },
      activePageProps() {
        const cid = String(this.$route.params.course_id ?? '').trim();
        const prefix = cid ? `/${cid}` : '';
        if (this.currentView === 'work') {
          return { tabId: this.tabId, routeBase: `${prefix}/exam`, sidePanelOnLeft: true, useExamDetailRoute: true, design3: true };
        }
        if (this.currentView === 'createExamQuizBank') {
          return { tabId: this.tabId, routeBase: `${prefix}/create-exam-bank`, sidePanelOnLeft: true, useExamDetailRoute: true, design3: true };
        }
        return { design3: true };
      },
      /** 測驗／建立測驗題庫／design / 分析頁：主內容區顯示捲軸（與左側清單一致） */
      showMainScrollbar() {
        return (
          this.currentView === 'createExamQuizBank'
          || this.currentView === 'work'
          || this.currentView === 'designPage'
          || this.currentView === 'personAnalysis'
          || this.currentView === 'courseAnalysis'
          || this.currentView === 'userManagement'
          || this.currentView === 'systemSettings'
          || this.currentView === 'profile'
          || this.currentView === 'logList'
          || this.currentView === 'promptText'
          || this.currentView === 'logoPage'
          || this.currentView === 'courseList'
        );
      },
    },
  };
</script>

<template>
  <main class="my-right-view flex-grow-1 overflow-hidden d-flex flex-column min-h-0 my-bgcolor-white">
    <div
      class="my-right-view-scroll flex-grow-1 min-h-0 d-flex flex-column"
      :class="{ 'my-right-view-scroll--visible': showMainScrollbar }"
    >
      <KeepAlive :max="12">
        <component
          :is="activePageComponent"
          :key="currentView"
          v-bind="activePageProps"
        />
      </KeepAlive>
    </div>
  </main>
</template>

<style scoped>
.my-right-view {
  min-height: 0;
  min-width: 0;
  background-color: var(--my-color-white);
}

.my-right-view-scroll {
  min-height: 0;
  min-width: 0;
  overflow: hidden;
  background-color: var(--my-color-white);
}

.my-right-view-scroll--visible {
  overflow: auto;
}
</style>
