<script setup>
import { API_BASE, API_QUIZZES_BY_PERSON, API_PERSON_ANALYSIS_USER_PROMPT } from '../constants/api.js';
import LoadingOverlay from '../components/LoadingOverlay.vue';
import QuizCard from '../components/QuizCard.vue';
import AnalysisDesign3QuizBlocks from '../components/AnalysisDesign3QuizBlocks.vue';
import AnalysisItemUnitQuizField from '../components/AnalysisItemUnitQuizField.vue';
import AnalysisRulesViewModal from '../components/AnalysisRulesViewModal.vue';
import AnalysisEditModal from '../components/AnalysisEditModal.vue';
import AnalysisRulesBlock from '../components/AnalysisRulesBlock.vue';
import LogoGradientPillButton from '../components/LogoGradientPillButton.vue';
import { useAnalysisPage } from '../composables/useAnalysisPage.js';

const props = defineProps({
  hidePageHeader: { type: Boolean, default: false },
  design3:        { type: Boolean, default: false },
  /** true 時對齊 ExamPage2／CreateExamQuizBankPage2 白底主內容（TopView 嵌入） */
  sidePanelOnLeft: { type: Boolean, default: false },
});

function parsePromptFromBody(data) {
  if (!data || typeof data !== 'object') return '';
  const v =
    data.person_analysis_user_prompt_text ??
    data.personAnalysisUserPromptText ??
    data.value ??
    data.prompt_text;
  return v != null ? String(v) : '';
}

const {
  authStore,
  canEditRules,
  md,
  weaknessScalarToMdHtml,
  items,
  quizCardUi,
  weaknessReport,
  loading,
  error,
  analysisLoadedOnce,
  promptText,
  promptSectionLoading,
  promptSaving,
  overlayBlocking,
  overlayLoadingText,
  hasSelectedCourse,
  fetchAnalysisOnly,
  startAnalysisFromRulesEditor,
  promptDirty,
  analysisStartButtonDisabled,
  resetPromptToBaseline,
  analysisRulesModalOpen,
  analysisRulesModalLoading,
  analysisRulesModalHtml,
  analysisRulesSnapshotTrimmed,
  openRulesModal,
  closeRulesModal,
  editModalOpen,
  editModalDraft,
  editModalSavingDisabled,
  editModalResetDisabled,
  openEditModal,
  closeEditModal,
  resetEditModalDraft,
  applyEditModal,
  reportParsed,
  reportSections,
  quizTypeLabel,
  unitLabelForItem,
  itemUnitType,
  itemIsFollowUpQuiz,
  toggleHint,
  toggleReferenceAnswer,
  slotQuizBodyTrim,
} = useAnalysisPage({
  apiQuizzesUrlFn: (personId) => `${API_BASE}${API_QUIZZES_BY_PERSON}/${encodeURIComponent(personId)}`,
  apiPromptUrl: `${API_BASE}${API_PERSON_ANALYSIS_USER_PROMPT}`,
  promptBodyKey: 'person_analysis_user_prompt_text',
  parsePromptFromBody,
  courseRequiredMsg: '請先於左側選單選擇課程，再進行弱點分析。',
  loginRequiredMsg: '請先登入以查看作答弱點分析',
  overlayFetchText: '載入作答與弱點分析中...',
  cardIdPrefix: 'weakness-card',
  scopeKey: 'person-analysis',
});
</script>

<template>
  <div
    class="d-flex flex-column h-100 overflow-hidden position-relative"
    :class="{
      'analysis-2 analysis-page-3-rules my-bgcolor-white': props.design3,
      'analysis-2--side-panel-left my-design--side-panel-left': props.design3 && props.sidePanelOnLeft,
      'my-bgcolor-gray-4': !props.design3,
    }"
  >
    <LoadingOverlay :is-visible="overlayBlocking" :loading-text="overlayLoadingText" />

    <!-- 查看規則 Modal -->
    <AnalysisRulesViewModal
      :open="analysisRulesModalOpen"
      title-id="weakness-analysis-rules-modal-title"
      :loading="analysisRulesModalLoading"
      :html="analysisRulesModalHtml"
      @close="closeRulesModal"
    />

    <!-- 編輯規則 Modal -->
    <AnalysisEditModal
      :open="editModalOpen"
      title-id="weakness-analysis-prompt-edit-modal-title"
      textarea-id="weakness-analysis-rules-edit-md"
      v-model="editModalDraft"
      :saving-disabled="editModalSavingDisabled"
      :reset-disabled="editModalResetDisabled"
      @reset="resetEditModalDraft"
      @apply="applyEditModal"
      @close="closeEditModal"
    />

    <header v-if="!props.hidePageHeader && !props.design3" class="flex-shrink-0 my-bgcolor-gray-4 p-4">
      <div class="container-fluid px-0 text-center">
        <p class="my-font-xl-400 my-color-black text-break mb-0">作答弱點分析</p>
      </div>
    </header>

    <div v-if="error" class="flex-shrink-0">
      <div class="my-alert-warning-soft my-font-sm-400 py-2 mx-4 mb-3">{{ error }}</div>
    </div>

    <div
      class="flex-grow-1 d-flex flex-column min-h-0"
      :class="[
        props.design3
          ? 'analysis-2__scroll overflow-auto position-relative my-bgcolor-white'
          : 'overflow-auto my-bgcolor-gray-4',
      ]"
    >
      <div
        :class="props.design3 ? 'w-100 min-w-0 pt-3' : 'container-fluid px-3 px-md-4 py-4'"
      >
        <div class="row justify-content-center">
          <div
            class="col-12 col-lg-10 col-xl-8 col-xxl-6"
            :class="props.design3 ? 'd-flex flex-column' : ''"
          >

            <!-- 分析規則區塊（管理員／開發者可見） -->
            <AnalysisRulesBlock
              v-if="canEditRules"
              :design3="props.design3"
              id-prefix="weakness-analysis"
              v-model="promptText"
              :edit-modal-saving-disabled="editModalSavingDisabled"
              :prompt-section-loading="promptSectionLoading"
              :loading="loading"
              :prompt-saving="promptSaving"
              :prompt-dirty="promptDirty"
              :start-button-disabled="analysisStartButtonDisabled"
              :can-start="!!authStore.user?.person_id && hasSelectedCourse()"
              @open-edit-modal="openEditModal"
              @start-analysis="startAnalysisFromRulesEditor"
              @reset-prompt="resetPromptToBaseline"
            />

            <hr
              v-if="props.design3 && canEditRules && analysisLoadedOnce && !loading && (items.length > 0 || weaknessReport)"
              class="analysis-2__section-rule w-100"
            />

            <!-- 開始分析按鈕（一般使用者，無規則編輯區） -->
            <div
              v-if="!canEditRules"
              :class="props.design3
                ? 'd-flex justify-content-start align-items-center w-100 pb-3'
                : 'd-flex justify-content-center align-items-center w-100 py-2 px-2 mb-4'"
            >
              <LogoGradientPillButton
                v-if="props.design3"
                id-prefix="weakness-analysis-start"
                tone="generate"
                gradient-bias="work3"
                extra-class="my-design-quiz-generate-btn"
                title="開始弱點分析"
                aria-label="開始弱點分析"
                :disabled="analysisStartButtonDisabled"
                :aria-busy="loading"
                @click="fetchAnalysisOnly"
              >
                開始弱點分析
              </LogoGradientPillButton>
              <button
                v-else
                type="button"
                :class="['btn rounded-pill d-flex justify-content-center align-items-center gap-2 my-font-md-400 my-btn-lg px-5 py-3']"
                title="開始弱點分析"
                aria-label="開始弱點分析"
                :disabled="analysisStartButtonDisabled"
                :aria-busy="loading"
                @click="fetchAnalysisOnly"
              >
                <i class="fa-solid fa-play" aria-hidden="true" />
                開始弱點分析
              </button>
            </div>

            <div v-if="loading" class="text-center my-color-gray-4 py-5" />

            <div
              v-else-if="analysisLoadedOnce && !error && items.length === 0 && !weaknessReport"
              class="my-alert-info-soft rounded my-font-sm-400 p-3 mt-0"
            >
              尚無答題紀錄。
            </div>

            <template v-else-if="analysisLoadedOnce && !loading && (items.length > 0 || weaknessReport)">
              <!-- design3：區塊／分隔線直屬 col（對齊分析規則上方 hr） -->
              <template v-if="props.design3">
                <AnalysisRulesBlock
                  v-if="!canEditRules && analysisRulesSnapshotTrimmed"
                  :design3="true"
                  hide-actions
                  id-prefix="weakness-analysis-rules-snapshot"
                  :model-value="promptText"
                  :edit-modal-saving-disabled="true"
                  :prompt-section-loading="promptSectionLoading"
                  :loading="loading"
                  :prompt-saving="promptSaving"
                />

                <hr
                  v-if="!canEditRules && analysisRulesSnapshotTrimmed && (weaknessReport || items.length)"
                  class="analysis-2__section-rule w-100"
                />

                <div
                  v-if="weaknessReport"
                  class="w-100 min-w-0 text-start d-flex flex-column gap-3 py-3"
                >
                  <div
                    role="heading"
                    aria-level="2"
                    class="my-font-xl-400 my-color-black mb-0"
                  >
                    分析報告
                  </div>

                  <div class="w-100 min-w-0 d-flex flex-column gap-4 text-start pb-3">
                    <template v-if="reportParsed">
                      <div
                        v-for="sectionKey in reportSections"
                        :key="sectionKey"
                        class="d-flex flex-column gap-2 mb-0"
                      >
                        <div
                          class="my-weakness-report-md my-weakness-report-md--section-title my-font-md-400 text-break mb-0"
                          v-html="md(sectionKey)"
                        />
                        <ul
                          v-if="Array.isArray(reportParsed[sectionKey]) && reportParsed[sectionKey].length"
                          class="my-weakness-report-md-list my-font-md-400 lh-base ps-3 mb-0"
                        >
                          <li
                            v-for="(line, i) in reportParsed[sectionKey]"
                            :key="i"
                            class="my-weakness-report-md my-font-md-400 my-color-black text-break"
                            v-html="md(line)"
                          />
                        </ul>
                        <div
                          v-else-if="Array.isArray(reportParsed[sectionKey]) && reportParsed[sectionKey].length === 0"
                          class="my-font-md-400 my-color-gray-4 mb-0"
                        >
                          —
                        </div>
                        <div
                          v-else
                          class="my-weakness-report-md my-font-md-400 lh-base my-color-black text-break mb-0"
                          v-html="weaknessScalarToMdHtml(reportParsed[sectionKey])"
                        />
                      </div>
                    </template>
                    <div
                      v-else
                      class="my-weakness-report-md my-font-md-400 lh-base my-color-black text-break mb-0"
                      v-html="md(weaknessReport)"
                    />
                  </div>
                </div>

                <hr
                  v-if="weaknessReport && items.length"
                  class="analysis-2__section-rule w-100"
                />

                <div
                  v-if="items.length"
                  class="d-flex flex-column gap-3 w-100 min-w-0 py-3"
                >
                  <div
                    v-for="(item, idx) in items"
                    :key="item.exam_quiz_id ?? item.rag_quiz_id ?? idx"
                    class="w-100 min-w-0 text-start d-flex flex-column gap-3"
                  >
                    <AnalysisItemUnitQuizField
                      :design3="true"
                      :unit-label="unitLabelForItem(item)"
                      :quiz-type-label="quizTypeLabel(item)"
                      :unit-type="itemUnitType(item)"
                      :is-follow-up="itemIsFollowUpQuiz(item)"
                    />
                    <AnalysisDesign3QuizBlocks
                      v-if="slotQuizBodyTrim(idx) !== ''"
                      :card="quizCardUi[idx]"
                      :slot-index="idx + 1"
                      :side-panel-on-left="props.sidePanelOnLeft"
                    />
                  </div>
                </div>
              </template>

              <div
                v-else
                class="text-start w-100 min-w-0 d-flex flex-column gap-4 my-page-block-spacing"
              >
                <div
                  v-if="weaknessReport"
                  class="rounded-4 my-bgcolor-gray-4 p-4 w-100 min-w-0 d-flex flex-column gap-4 text-start"
                >
                  <div class="my-font-lg-600 my-color-black mb-0">
                    學習弱點分析報告
                  </div>

                  <div class="w-100 min-w-0 d-flex flex-column gap-4 text-start pb-3">
                    <template v-if="reportParsed">
                      <div
                        v-for="sectionKey in reportSections"
                        :key="sectionKey"
                        class="d-flex flex-column gap-2 mb-0"
                      >
                        <div
                          class="my-weakness-report-md my-weakness-report-md--section-title my-font-md-400 text-break mb-0"
                          v-html="md(sectionKey)"
                        />
                        <ul
                          v-if="Array.isArray(reportParsed[sectionKey]) && reportParsed[sectionKey].length"
                          class="my-weakness-report-md-list my-font-md-400 lh-base ps-3 mb-0"
                        >
                          <li
                            v-for="(line, i) in reportParsed[sectionKey]"
                            :key="i"
                            class="my-weakness-report-md my-font-md-400 my-color-black text-break"
                            v-html="md(line)"
                          />
                        </ul>
                        <div
                          v-else-if="Array.isArray(reportParsed[sectionKey]) && reportParsed[sectionKey].length === 0"
                          class="my-font-md-400 my-color-gray-4 mb-0"
                        >
                          —
                        </div>
                        <div
                          v-else
                          class="my-weakness-report-md my-font-md-400 lh-base my-color-black text-break mb-0"
                          v-html="weaknessScalarToMdHtml(reportParsed[sectionKey])"
                        />
                      </div>
                    </template>
                    <div
                      v-else
                      class="my-weakness-report-md my-font-md-400 lh-base my-color-black text-break mb-0"
                      v-html="md(weaknessReport)"
                    />

                    <div
                      v-if="analysisRulesSnapshotTrimmed"
                      class="d-flex justify-content-start align-items-center w-100 pt-3"
                    >
                      <button
                        type="button"
                        class="btn rounded-pill d-inline-flex justify-content-center align-items-center flex-shrink-0 my-font-sm-400 my-color-gray-1 px-3 py-1 my-btn-outline-gray-1"
                        title="分析規則（Markdown）"
                        aria-label="分析規則"
                        @click="openRulesModal"
                      >
                        分析規則
                      </button>
                    </div>
                  </div>
                </div>

                <div
                  v-if="items.length"
                  class="d-flex flex-column gap-4 w-100 min-w-0"
                >
                  <div
                    v-for="(item, idx) in items"
                    :key="item.exam_quiz_id ?? item.rag_quiz_id ?? idx"
                    class="rounded-4 my-bgcolor-gray-4 p-4 w-100 min-w-0 text-start d-flex flex-column gap-3"
                  >
                    <AnalysisItemUnitQuizField
                      :design3="false"
                      :unit-label="unitLabelForItem(item)"
                      :quiz-type-label="quizTypeLabel(item)"
                      :unit-type="itemUnitType(item)"
                      :is-follow-up="itemIsFollowUpQuiz(item)"
                    />
                    <QuizCard
                      v-if="slotQuizBodyTrim(idx) !== ''"
                      :card="quizCardUi[idx]"
                      :slot-index="idx + 1"
                      :current-rag-id="quizCardUi[idx]?.rag_id"
                      show-exam-rating
                      exam-rating-read-only
                      read-only-answer
                      design-ui
                      design-embedded
                      hide-slot-index
                      hide-grading-prompt
                      @toggle-hint="toggleHint"
                      @toggle-reference-answer="toggleReferenceAnswer"
                    />
                  </div>
                </div>
              </div>
            </template>

          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped src="./AnalysisPage.css"></style>
<style scoped src="../assets/css/design-quiz-shared.css"></style>
