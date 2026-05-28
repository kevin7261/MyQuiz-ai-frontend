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
  import ExamPage3 from '../pages/ExamPage3.vue';
  import AnswerWeaknessAnalysisPage from '../pages/AnswerWeaknessAnalysisPage.vue';
  import AnswerWeaknessAnalysisPage3 from '../pages/AnswerWeaknessAnalysisPage3.vue';
  import StudentAnswerAnalysisPage from '../pages/StudentAnswerAnalysisPage.vue';
  import StudentAnswerAnalysisPage3 from '../pages/StudentAnswerAnalysisPage3.vue';
  import ProfilePage from '../pages/ProfilePage.vue';
  import ProfilePage3 from '../pages/ProfilePage3.vue';
  import CreateExamQuizBankPage from '../pages/CreateExamQuizBankPage.vue';
  import CreateExamQuizBankPage3 from '../pages/CreateExamQuizBankPage3.vue';
  import DesignPage from '../pages/DesignPage.vue';
  import DesignPage3 from '../pages/DesignPage3.vue';
  import LogoPage from '../pages/LogoPage.vue';
  import UserManagementPage from '../pages/UserManagementPage.vue';
  import UserManagementPage3 from '../pages/UserManagementPage3.vue';
  import SystemSettingsPage from '../pages/SystemSettingsPage.vue';
  import SystemSettingsPage3 from '../pages/SystemSettingsPage3.vue';
  import LogListPage from '../pages/LogListPage.vue';
  import LogListPage3 from '../pages/LogListPage3.vue';

  /** 與 HomeView currentView 鍵一致；markRaw 避免把元件選項做成深度 reactive */
  const VIEW_COMPONENTS = {
    work: markRaw(ExamPage),
    work3: markRaw(ExamPage3),
    studentWeaknessAnalysis: markRaw(AnswerWeaknessAnalysisPage),
    studentWeaknessAnalysis3: markRaw(AnswerWeaknessAnalysisPage3),
    studentAnswerAnalysis: markRaw(StudentAnswerAnalysisPage),
    studentAnswerAnalysis3: markRaw(StudentAnswerAnalysisPage3),
    profile: markRaw(ProfilePage),
    profile3: markRaw(ProfilePage3),
    createExamQuizBank: markRaw(CreateExamQuizBankPage),
    createExamQuizBank3: markRaw(CreateExamQuizBankPage3),
    designPage: markRaw(DesignPage),
    designPage3: markRaw(DesignPage3),
    logoPage: markRaw(LogoPage),
    userManagement: markRaw(UserManagementPage),
    userManagement3: markRaw(UserManagementPage3),
    systemSettings: markRaw(SystemSettingsPage),
    systemSettings3: markRaw(SystemSettingsPage3),
    logList: markRaw(LogListPage),
    logList3: markRaw(LogListPage3),
  };

  const VIEWS_WITH_WORK_TAB_ID = new Set([
    'work',
    'work3',
    'createExamQuizBank',
    'createExamQuizBank3',
  ]);

  export default {
    name: 'RightView',
    components: { ExamPage, ExamPage3, AnswerWeaknessAnalysisPage, AnswerWeaknessAnalysisPage3, StudentAnswerAnalysisPage, StudentAnswerAnalysisPage3, ProfilePage, ProfilePage3, CreateExamQuizBankPage, CreateExamQuizBankPage3, DesignPage, DesignPage3, LogoPage, UserManagementPage, UserManagementPage3, SystemSettingsPage, SystemSettingsPage3, LogListPage, LogListPage3 },
    props: {
      currentView: { type: String, required: true },
      tabId: { type: String, required: true },
    },
    computed: {
      activePageComponent() {
        return VIEW_COMPONENTS[this.currentView] ?? ExamPage;
      },
      activePageProps() {
        if (VIEWS_WITH_WORK_TAB_ID.has(this.currentView)) {
          return { tabId: this.tabId };
        }
        return {};
      },
      /** create-exam-bank_3 / exam_3 / design_3 / 分析頁 _3：主內容區顯示捲軸（與左側清單一致） */
      showMainScrollbar() {
        return (
          this.currentView === 'createExamQuizBank3'
          || this.currentView === 'work3'
          || this.currentView === 'designPage3'
          || this.currentView === 'studentWeaknessAnalysis3'
          || this.currentView === 'studentAnswerAnalysis3'
          || this.currentView === 'userManagement3'
          || this.currentView === 'systemSettings3'
          || this.currentView === 'profile3'
          || this.currentView === 'logList3'
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
