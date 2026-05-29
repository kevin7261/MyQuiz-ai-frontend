<script setup>
import { API_BASE, API_COURSE_ANALYSIS_QUIZZES, API_COURSE_ANALYSIS_USER_PROMPT } from '../constants/api.js';
import LoadingOverlay from '../components/LoadingOverlay.vue';
import QuizCard from '../components/QuizCard.vue';
import AnalysisDesign3QuizBlocks from '../components/AnalysisDesign3QuizBlocks.vue';
import EnglishExamMarkdownEditor from '../components/EnglishExamMarkdownEditor.vue';
import AnalysisRulesViewModal from '../components/AnalysisRulesViewModal.vue';
import AnalysisEditModal from '../components/AnalysisEditModal.vue';
import AnalysisRulesBlock from '../components/AnalysisRulesBlock.vue';
import { useAnalysisPage } from '../composables/useAnalysisPage.js';

const props = defineProps({
  hidePageHeader: { type: Boolean, default: false },
  design3:        { type: Boolean, default: false },
});

function parsePromptFromBody(data) {
  if (!data || typeof data !== 'object') return '';
  const v =
    data.course_analysis_user_prompt_text ??
    data.courseAnalysisUserPromptText ??
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
  canStartFromSavedRules,
  canSaveAndStart,
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
  toggleHint,
  toggleReferenceAnswer,
  slotQuizBodyTrim,
} = useAnalysisPage({
  apiQuizzesUrlFn: () => `${API_BASE}${API_COURSE_ANALYSIS_QUIZZES}`,
  apiPromptUrl: `${API_BASE}${API_COURSE_ANALYSIS_USER_PROMPT}`,
  promptBodyKey: 'course_analysis_user_prompt_text',
  parsePromptFromBody,
  courseRequiredMsg: '請先於左側選單選擇課程，再進行學生作答分析。',
  loginRequiredMsg: '請先登入以查看學生作答分析',
  overlayFetchText: '載入學生作答與分析報告中...',
  cardIdPrefix: 'student-analysis-card',
});
</script>

<template>
  <div
    class="d-flex flex-column h-100 overflow-hidden position-relative"
    :class="props.design3 ? 'my-bgcolor-white' : 'my-bgcolor-gray-4'"
  >
    <LoadingOverlay :is-visible="overlayBlocking" :loading-text="overlayLoadingText" />

    <!-- 查看規則 Modal -->
    <AnalysisRulesViewModal
      :open="analysisRulesModalOpen"
      title-id="student-analysis-rules-modal-title"
      :loading="analysisRulesModalLoading"
      :html="analysisRulesModalHtml"
      @close="closeRulesModal"
    />

    <!-- 編輯規則 Modal -->
    <AnalysisEditModal
      :open="editModalOpen"
      title-id="student-analysis-prompt-edit-modal-title"
      textarea-id="student-analysis-rules-edit-md"
      v-model="editModalDraft"
      :saving-disabled="editModalSavingDisabled"
      :reset-disabled="editModalResetDisabled"
      @reset="resetEditModalDraft"
      @apply="applyEditModal"
      @close="closeEditModal"
    />

    <header v-if="!props.hidePageHeader && !props.design3" class="flex-shrink-0 my-bgcolor-gray-4 p-4">
      <div class="container-fluid px-0 text-center">
        <p class="my-font-xl-400 my-color-black text-break mb-0">學生作答分析</p>
      </div>
    </header>

    <div v-if="error" class="flex-shrink-0">
      <div class="my-alert-warning-soft my-font-sm-400 py-2 mx-4 mb-3">{{ error }}</div>
    </div>

    <div
      class="flex-grow-1 overflow-auto d-flex flex-column min-h-0"
      :class="props.design3 ? 'my-bgcolor-white' : 'my-bgcolor-gray-4'"
    >
      <div class="container-fluid px-3 px-md-4 py-4">
        <div class="row justify-content-center">
          <div :class="props.design3 ? 'col-12 col-md-12 col-lg-10 col-xl-8 col-xxl-6' : 'col-12 col-lg-10 col-xl-8 col-xxl-6'">

            <!-- 分析規則區塊（管理員／開發者可見） -->
            <AnalysisRulesBlock
              v-if="canEditRules"
              :design3="props.design3"
              id-prefix="student-analysis"
              v-model="promptText"
              :edit-modal-saving-disabled="editModalSavingDisabled"
              :prompt-section-loading="promptSectionLoading"
              :loading="loading"
              :prompt-saving="promptSaving"
              :prompt-dirty="promptDirty"
              :can-start-from-saved-rules="canStartFromSavedRules"
              :can-save-and-start="canSaveAndStart"
              :can-start="!!authStore.user?.person_id && hasSelectedCourse()"
              @open-edit-modal="openEditModal"
              @fetch-analysis-only="fetchAnalysisOnly"
              @start-analysis="startAnalysisFromRulesEditor"
              @reset-prompt="resetPromptToBaseline"
            />

            <!-- 開始分析按鈕（一般使用者，無規則編輯區） -->
            <div
              v-if="!canEditRules"
              :class="props.design3
                ? 'd-flex justify-content-start align-items-center w-100 py-4 analysis-page-3-section'
                : 'd-flex justify-content-center align-items-center w-100 py-2 px-2 mb-4'"
            >
              <button
                type="button"
                :class="['btn rounded-pill d-flex justify-content-center align-items-center gap-2 my-font-md-400 px-4 py-3', props.design3 ? 'my-button-white' : 'my-button-gray-4']"
                title="開始作答分析"
                aria-label="開始作答分析"
                :disabled="promptSectionLoading || loading || promptSaving || !authStore.user?.person_id || !hasSelectedCourse()"
                :aria-busy="loading"
                @click="fetchAnalysisOnly"
              >
                <i class="fa-solid fa-play" aria-hidden="true" />
                開始作答分析
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
              <div class="text-start" :class="{ 'my-page-block-spacing': !props.design3 }">
                <div :class="props.design3 ? 'd-flex flex-column w-100 min-w-0' : 'd-flex flex-column gap-4 w-100 min-w-0'">

                  <!-- 分析報告 -->
                  <div
                    v-if="weaknessReport"
                    :class="props.design3
                      ? 'w-100 min-w-0 d-flex flex-column gap-4 text-start py-4 analysis-page-3-section'
                      : 'rounded-4 my-bgcolor-gray-4 p-4 w-100 min-w-0 d-flex flex-column gap-4 text-start'"
                  >
                    <div :class="props.design3 ? 'my-font-xl-400 my-color-black mb-0' : 'my-font-lg-600 my-color-black mb-0'">
                      課程作答分析報告
                    </div>
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

                    <!-- 查看規則按鈕（舊版） -->
                    <div
                      v-if="analysisRulesSnapshotTrimmed && !props.design3"
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

                    <!-- 規則唯讀預覽（design3，一般使用者） -->
                    <div
                      v-if="analysisRulesSnapshotTrimmed && props.design3 && !canEditRules"
                      class="w-100 min-w-0 pt-3 analysis-page-3-rules my-design--side-panel-left"
                    >
                      <div class="my-design-quiz-question-prompt-wrap w-100 min-w-0">
                        <section class="my-design-quiz-question-prompt-block w-100 min-w-0" aria-label="分析規則">
                          <header class="my-design-quiz-question-prompt-block__head">
                            <div class="my-design-quiz-question-prompt-block__title-row d-flex justify-content-between align-items-center gap-2 px-3 py-2">
                              <h3 class="my-design-quiz-question-prompt-block__title my-font-sm-400 my-color-gray-3 mb-0">
                                分析規則
                              </h3>
                            </div>
                          </header>
                          <div class="my-design-quiz-question-prompt-block__content min-w-0 w-100">
                            <EnglishExamMarkdownEditor
                              :model-value="promptText"
                              textarea-id="student-analysis-rules-report-ro"
                              preview-only
                              preview-design-dark
                              preview-design-dark-embedded
                            />
                          </div>
                        </section>
                      </div>
                    </div>
                  </div>

                  <!-- 逐題結果（學生頁多顯示「使用者 ID」） -->
                  <div
                    v-for="(item, idx) in items"
                    :key="`${item.exam_quiz_id ?? item.rag_quiz_id ?? idx}-${item.person_id ?? ''}`"
                    :class="props.design3
                      ? 'w-100 min-w-0 text-start d-flex flex-column gap-3 py-4 analysis-page-3-section'
                      : 'rounded-4 my-bgcolor-gray-4 p-4 w-100 min-w-0 text-start d-flex flex-column gap-3'"
                  >
                    <div :class="props.design3 ? 'my-font-xl-400 my-color-black mb-0' : 'my-font-lg-600 my-color-black mb-0'">
                      第 {{ idx + 1 }} 題
                    </div>
                    <div class="d-flex flex-column gap-3 w-100 min-w-0">
                      <div class="w-100 min-w-0">
                        <div class="my-color-gray-1 my-font-sm-400 mb-0 d-block">使用者 ID</div>
                        <div
                          class="my-font-md-400 my-color-black text-break lh-base mt-1"
                          role="status"
                          :aria-label="`使用者 ID：${item.person_id ?? '—'}`"
                        >
                          {{ item.person_id ?? '—' }}
                        </div>
                      </div>
                      <div class="d-flex flex-row flex-nowrap w-100 min-w-0 align-items-start gap-3">
                        <div class="min-w-0 flex-grow-1" style="flex-basis: 0">
                          <div class="d-flex flex-column gap-0 w-100 min-w-0">
                            <div class="my-color-gray-1 my-font-sm-400 mb-0 d-block">單元</div>
                            <div
                              class="my-font-md-400 my-color-black text-break lh-base mt-1"
                              role="status"
                              :aria-label="`單元：${item.rag_name ?? item.unit_name ?? item.exam_name ?? '—'}`"
                            >
                              {{ item.rag_name ?? item.unit_name ?? item.exam_name ?? '—' }}
                            </div>
                          </div>
                        </div>
                        <div class="min-w-0 flex-grow-1" style="flex-basis: 0">
                          <div class="d-flex flex-column gap-0 w-100 min-w-0">
                            <div class="my-color-gray-1 my-font-sm-400 mb-0 d-block">題型</div>
                            <div
                              class="my-font-md-400 my-color-black text-break lh-base mt-1"
                              role="status"
                              :aria-label="`題型：${quizTypeLabel(item)}`"
                            >
                              {{ quizTypeLabel(item) }}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <AnalysisDesign3QuizBlocks
                      v-if="props.design3 && slotQuizBodyTrim(idx) !== ''"
                      :card="quizCardUi[idx]"
                      :slot-index="idx + 1"
                    />
                    <QuizCard
                      v-else-if="!props.design3 && slotQuizBodyTrim(idx) !== ''"
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
