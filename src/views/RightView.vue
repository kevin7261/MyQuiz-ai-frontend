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
  import ExamPage2 from '../pages/ExamPage2.vue';
  import AnswerWeaknessAnalysisPage from '../pages/AnswerWeaknessAnalysisPage.vue';
  import StudentAnswerAnalysisPage from '../pages/StudentAnswerAnalysisPage.vue';
  import ProfilePage from '../pages/ProfilePage.vue';
  import CreateExamQuizBankPage from '../pages/CreateExamQuizBankPage.vue';
  import CreateExamQuizBankPage2 from '../pages/CreateExamQuizBankPage2.vue';
  import CreateExamQuizBankPage3 from '../pages/CreateExamQuizBankPage3.vue';
  import DesignPage from '../pages/DesignPage.vue';
  import DesignPage2 from '../pages/DesignPage2.vue';
  import LogoPage from '../pages/LogoPage.vue';
  import UserManagementPage from '../pages/UserManagementPage.vue';
  import SystemSettingsPage from '../pages/SystemSettingsPage.vue';
  import LogListPage from '../pages/LogListPage.vue';

  /** 與 HomeView currentView 鍵一致；markRaw 避免把元件選項做成深度 reactive */
  const VIEW_COMPONENTS = {
    work: markRaw(ExamPage),
    work2: markRaw(ExamPage2),
    studentWeaknessAnalysis: markRaw(AnswerWeaknessAnalysisPage),
    studentAnswerAnalysis: markRaw(StudentAnswerAnalysisPage),
    profile: markRaw(ProfilePage),
    createExamQuizBank: markRaw(CreateExamQuizBankPage),
    createExamQuizBank2: markRaw(CreateExamQuizBankPage2),
    createExamQuizBank3: markRaw(CreateExamQuizBankPage3),
    designPage: markRaw(DesignPage),
    designPage2: markRaw(DesignPage2),
    logoPage: markRaw(LogoPage),
    userManagement: markRaw(UserManagementPage),
    systemSettings: markRaw(SystemSettingsPage),
    logList: markRaw(LogListPage),
  };

  const VIEWS_WITH_WORK_TAB_ID = new Set([
    'work',
    'work2',
    'createExamQuizBank',
    'createExamQuizBank2',
    'createExamQuizBank3',
  ]);

  export default {
    name: 'RightView',
    components: { ExamPage, ExamPage2, AnswerWeaknessAnalysisPage, StudentAnswerAnalysisPage, ProfilePage, CreateExamQuizBankPage, CreateExamQuizBankPage2, CreateExamQuizBankPage3, DesignPage, DesignPage2, LogoPage, UserManagementPage, SystemSettingsPage, LogListPage },
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
      /** create-exam-bank_3：主內容區顯示捲軸（與左側清單一致） */
      showMainScrollbar() {
        return this.currentView === 'createExamQuizBank3';
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
  scrollbar-width: thin;
  scrollbar-color: var(--my-scrollbar-thumb) var(--my-scrollbar-track);
}

.my-right-view-scroll--visible::-webkit-scrollbar {
  width: var(--my-scrollbar-size);
  height: var(--my-scrollbar-size);
}

.my-right-view-scroll--visible::-webkit-scrollbar-track {
  background: var(--my-scrollbar-track);
  border-radius: calc(var(--my-scrollbar-size) / 2);
}

.my-right-view-scroll--visible::-webkit-scrollbar-thumb {
  background-color: var(--my-scrollbar-thumb);
  background-clip: padding-box;
  border: var(--my-scrollbar-thumb-inset) solid var(--my-scrollbar-track);
  border-radius: calc(var(--my-scrollbar-size) / 2 - var(--my-scrollbar-thumb-inset));
}

.my-right-view-scroll--visible::-webkit-scrollbar-thumb:hover {
  background-color: var(--my-scrollbar-thumb-hover);
}
</style>
