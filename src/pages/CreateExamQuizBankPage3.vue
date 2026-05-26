<script setup>
/**
 * CreateExamQuizBankPage3 - 建立測驗題庫（九宮格入口版，/create-exam-bank_3）
 * 詳情路由：/create-exam-bank_3/:exam_id/:exam_quiz_id（exam_id=rag_tab_id，exam_quiz_id=rag_quiz_id；0 表示未指定題型）
 */
import CreateExamQuizBankPage2 from './CreateExamQuizBankPage2.vue';

defineProps({
  tabId: { type: String, required: true },
});
</script>

<template>
  <CreateExamQuizBankPage2
    :tab-id="tabId"
    route-base="/create-exam-bank_3"
    :side-panel-on-left="true"
    use-exam-detail-route
  />
</template>
