<script setup>
/**
 * AnalysisDesign3QuizBlocks - 分析頁 design_3 題目區（對齊 ExamDetailPage／CreateExamQuizBankDetailPage 子區塊，無外框／底色）
 */
import QuizCard from './QuizCard.vue';
import LogoLayerMark from './LogoLayerMark.vue';

const props = defineProps({
  card: { type: Object, required: true },
  slotIndex: { type: Number, required: true },
  sidePanelOnLeft: { type: Boolean, default: false },
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
  <div class="my-design-pack-unit-blocks d-flex flex-column gap-3 w-100 min-w-0">
    <!-- 子區塊：題目 -->
    <div
      class="my-design-quiz-sub-block-outer"
      :class="{
        'my-design-quiz-sub-block-outer--with-logo': sidePanelOnLeft,
        'my-design-quiz-sub-block-outer--with-logo-q': sidePanelOnLeft,
      }"
    >
      <div
        v-if="sidePanelOnLeft"
        class="my-design-quiz-sub-block-outer__logo-col"
      >
        <LogoLayerMark
          layer="primary"
          :size-pt="24"
          :id-prefix="`analysis-quiz-q-${slotIndex}`"
          class="my-design-quiz-sub-block-outer__logo"
        />
        <div
          class="my-design-quiz-sub-block-outer__logo-spacer pb-3"
          aria-hidden="true"
        />
        <div class="my-design-quiz-sub-block-outer__logo-stem" aria-hidden="true" />
        <svg
          class="my-design-quiz-sub-block-outer__logo-arrowhead"
          viewBox="0 0 24 12"
          aria-hidden="true"
        >
          <path
            d="M12 0 L12 12 M6 6 L12 12 M18 6 L12 12"
            fill="none"
            stroke="currentColor"
            stroke-width="1"
            vector-effect="non-scaling-stroke"
          />
        </svg>
      </div>
      <div class="my-design-quiz-sub-block my-design-quiz-sub-block--stem rounded-4 p-0">
        <div class="my-design-quiz-sub-block__body min-w-0 flex-grow-1">
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
    </div>
    <!-- 子區塊：答案 + 批改 -->
    <div
      class="my-design-quiz-sub-block-outer"
      :class="{ 'my-design-quiz-sub-block-outer--with-logo': sidePanelOnLeft }"
    >
      <LogoLayerMark
        v-if="sidePanelOnLeft"
        layer="secondary"
        :size-pt="24"
        :id-prefix="`analysis-quiz-a-${slotIndex}`"
        class="my-design-quiz-sub-block-outer__logo"
      />
      <div class="my-design-quiz-sub-block my-design-quiz-sub-block--answer rounded-4 p-0">
        <div class="my-design-quiz-sub-block__body min-w-0 flex-grow-1">
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
  </div>
</template>

<style scoped src="../assets/css/design-quiz-shared.css"></style>
<style scoped src="./AnalysisDesign3QuizBlocks.css"></style>
