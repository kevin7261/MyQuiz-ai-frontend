<script>
  /**
   * RightView - 主畫面右側內容區
   *
   * 職責：
   * - 依 currentView 渲染對應頁面：測驗、作答弱點分析、建立測驗題庫、學生作答分析等
  */
  import ExamPage from '../pages/ExamPage.vue';
  import AnswerWeaknessAnalysisPage from '../pages/AnswerWeaknessAnalysisPage.vue';
  import StudentAnswerAnalysisPage from '../pages/StudentAnswerAnalysisPage.vue';
  import ProfilePage from '../pages/ProfilePage.vue';
  import CreateExamQuizBankPage from '../pages/CreateExamQuizBankPage.vue';
  import UserManagementPage from '../pages/UserManagementPage.vue';
  import SystemSettingsPage from '../pages/SystemSettingsPage.vue';

  export default {
    name: 'RightView',
    components: { ExamPage, AnswerWeaknessAnalysisPage, StudentAnswerAnalysisPage, ProfilePage, CreateExamQuizBankPage, UserManagementPage, SystemSettingsPage },
    props: {
      currentView: { type: String, required: true },
      tabId: { type: String, required: true },
    },
  };
</script>

<template>
  <main class="right-view flex-grow-1 overflow-hidden d-flex flex-column">
    <ExamPage v-if="currentView === 'work'" :tabId="tabId" />
    <AnswerWeaknessAnalysisPage v-else-if="currentView === 'studentWeaknessAnalysis'" />
    <StudentAnswerAnalysisPage v-else-if="currentView === 'studentAnswerAnalysis'" />
    <ProfilePage v-else-if="currentView === 'profile'" />
    <CreateExamQuizBankPage v-else-if="currentView === 'createExamQuizBank'" :tabId="tabId" />
    <UserManagementPage v-else-if="currentView === 'userManagement'" />
    <SystemSettingsPage v-else-if="currentView === 'systemSettings'" />
  </main>
</template>

<style scoped>
.right-view {
  min-height: 0;
  min-width: 0;
}
</style>
