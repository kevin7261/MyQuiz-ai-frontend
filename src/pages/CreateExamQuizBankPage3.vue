<script setup>
/**
 * CreateExamQuizBankPage3 - 建立測驗題庫（九宮格入口版，/create-exam-bank_3）
 * 與 CreateExamQuizBankPage2 相同，僅路由前綴不同。
 */
import CreateExamQuizBankPage2 from './CreateExamQuizBankPage2.vue';

defineProps({
  tabId: { type: String, required: true },
});
</script>

<template>
  <CreateExamQuizBankPage2 :tab-id="tabId" route-base="/create-exam-bank_3" />
</template>
