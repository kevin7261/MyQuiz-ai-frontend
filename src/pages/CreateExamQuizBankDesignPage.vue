<script setup>
/**
 * 建立測驗題庫（僅前端示範）— 與 CreateExamQuizBankPage 同一元件，不呼叫 API。
 */
import CreateExamQuizBankPage from './CreateExamQuizBankPage.vue';

defineProps({
  tabId: { type: String, required: true },
});
</script>

<template>
  <CreateExamQuizBankPage :tab-id="tabId" :mock-without-api="true" />
</template>
