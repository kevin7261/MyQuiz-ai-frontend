<script>
  /**
   * RightView - 主畫面右側內容區
   *
   * 職責：
   * - 依 currentView 渲染對應頁面：試卷、學生弱點分析、建立測試題庫、學生試卷分析等
   */
  import ExamPage from '../pages/ExamPage.vue';
  import StudentWeaknessAnalysisPage from '../pages/StudentWeaknessAnalysisPage.vue';
  import CourseAnalysisPage from '../pages/CourseAnalysisPage.vue';
  import ProfilePage from '../pages/ProfilePage.vue';
  import CreateTestBankPage from '../pages/CreateTestBankPage.vue';
  import UserManagementPage from '../pages/UserManagementPage.vue';
  import SystemSettingsPage from '../pages/SystemSettingsPage.vue';

  export default {
    name: 'RightView',
    components: { ExamPage, StudentWeaknessAnalysisPage, CourseAnalysisPage, ProfilePage, CreateTestBankPage, UserManagementPage, SystemSettingsPage },
    props: {
      currentView: { type: String, required: true },
      tabId: { type: String, required: true },
    },
  };
</script>

<template>
  <main class="right-view flex-grow-1 overflow-hidden d-flex flex-column">
    <ExamPage v-if="currentView === 'work'" :tabId="tabId" />
    <StudentWeaknessAnalysisPage v-else-if="currentView === 'studentWeaknessAnalysis'" />
    <CourseAnalysisPage v-else-if="currentView === 'courseAnalysis'" />
    <ProfilePage v-else-if="currentView === 'profile'" />
    <CreateTestBankPage v-else-if="currentView === 'createTestBank'" :tabId="tabId" />
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
