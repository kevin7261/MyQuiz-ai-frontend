<script>
  /**
   * RightView - 主畫面右側內容區
   *
   * 職責：
   * - 依 currentView 渲染對應頁面：測驗、個人分析、建立 RAG、課程分析等
   */
  import ExamPage from '../pages/ExamPage.vue';
  import AnalysisPage from '../pages/AnalysisPage.vue';
  import CourseAnalysisPage from '../pages/CourseAnalysisPage.vue';
  import ProfilePage from '../pages/ProfilePage.vue';
  import CreateRAG from '../pages/CreateRAG.vue';
  import UserManagementPage from '../pages/UserManagementPage.vue';
  import SystemSettingsPage from '../pages/SystemSettingsPage.vue';

  export default {
    name: 'RightView',
    components: { ExamPage, AnalysisPage, CourseAnalysisPage, ProfilePage, CreateRAG, UserManagementPage, SystemSettingsPage },
    props: {
      currentView: { type: String, required: true },
      tabId: { type: String, required: true },
    },
  };
</script>

<template>
  <main class="right-view flex-grow-1 overflow-hidden d-flex flex-column">
    <ExamPage v-if="currentView === 'work'" :tabId="tabId" />
    <AnalysisPage v-else-if="currentView === 'analysis'" />
    <CourseAnalysisPage v-else-if="currentView === 'courseAnalysis'" />
    <ProfilePage v-else-if="currentView === 'profile'" />
    <CreateRAG v-else-if="currentView === 'createRAG'" :tabId="tabId" />
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
