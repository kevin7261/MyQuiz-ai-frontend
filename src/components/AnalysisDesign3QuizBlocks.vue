<script setup>
/**
 * AnalysisDesign3QuizBlocks - 分析頁 design_3 題目區（對齊 exam_3／create-exam-bank_3 三子區塊 + tab）
 */
import QuizCard from './QuizCard.vue';

const props = defineProps({
  card: { type: Object, required: true },
  slotIndex: { type: Number, required: true },
});

function quizCardBind() {
  return {
    card: props.card,
    slotIndex: props.slotIndex,
    currentRagId: props.card?.rag_id,
    logoGradientBias: 'work3',
    showExamRating: true,
    examRatingReadOnly: true,
    designUi: true,
    designEmbedded: true,
    createExamBankDesignLayout: true,
    hideSlotIndex: true,
    hideExamRulePills: true,
    hintReferenceInModal: true,
    gradingPromptInModal: true,
    hideGradingPrompt: true,
  };
}
</script>

<template>
  <div class="analysis-page-3-quiz my-design--side-panel-left d-flex flex-column gap-3 w-100 min-w-0">
    <div class="my-design-quiz-sub-block-outer">
      <div class="my-design-quiz-sub-block my-design-quiz-sub-block--stem rounded-4 py-2">
        <div class="w-100 min-w-0 my-design-quiz-stem-sub-block-top d-flex flex-column">
          <div class="w-100 min-w-0">
            <QuizCard
              v-bind="quizCardBind()"
              create-exam-bank-design-layout
              design-sub-block="question"
            />
          </div>
        </div>
      </div>
    </div>
    <div class="my-design-quiz-sub-block-outer">
      <div class="my-design-quiz-sub-block rounded-4 py-2 my-bgcolor-gray-3">
        <div class="w-100 min-w-0">
          <QuizCard
            v-bind="quizCardBind()"
            create-exam-bank-design-layout
            design-sub-block="answer"
            read-only-answer
          />
        </div>
        <div class="w-100 min-w-0">
          <QuizCard
            v-bind="quizCardBind()"
            create-exam-bank-design-layout
            design-sub-block="grading"
            read-only-answer
          />
        </div>
      </div>
    </div>
  </div>
</template>
