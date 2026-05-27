<script setup>
/**
 * ExamPage3 - 測驗（TopView 全寬版，/exam_3）
 * 詳情路由：/exam_3/:exam_id/:exam_quiz_id（exam_id=exam_tab_id，exam_quiz_id=Exam_Quiz id；0 表示未指定題目）
 */
import ExamPage2 from './ExamPage2.vue';

defineProps({
  tabId: { type: String, required: true },
});
</script>

<template>
  <ExamPage2
    :tab-id="tabId"
    route-base="/exam_3"
    :side-panel-on-left="true"
    use-exam-detail-route
  />
</template>
