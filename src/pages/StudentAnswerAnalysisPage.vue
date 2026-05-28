<script setup>
import { API_BASE, API_COURSE_ANALYSIS_QUIZZES, API_COURSE_ANALYSIS_USER_PROMPT } from '../constants/api.js';
import LoadingOverlay from '../components/LoadingOverlay.vue';
import QuizCard from '../components/QuizCard.vue';
import AnalysisDesign3QuizBlocks from '../components/AnalysisDesign3QuizBlocks.vue';
import EnglishExamMarkdownEditor from '../components/EnglishExamMarkdownEditor.vue';
import LogoGradientPillButton from '../components/LogoGradientPillButton.vue';
import { useAnalysisPage } from '../composables/useAnalysisPage.js';

const props = defineProps({
  hidePageHeader: { type: Boolean, default: false },
  design3: { type: Boolean, default: false },
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
    <LoadingOverlay
      :is-visible="overlayBlocking"
      :loading-text="overlayLoadingText"
    />
    <Teleport to="body">
      <div
        v-if="analysisRulesModalOpen"
        class="modal fade show d-block my-modal-backdrop"
        tabindex="-1"
        role="dialog"
        aria-modal="true"
        aria-labelledby="student-analysis-rules-modal-title"
      >
        <div
          class="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable"
          @click.stop
        >
          <div class="modal-content border-0 my-bgcolor-white p-4 d-flex flex-column gap-3">
            <div class="modal-header border-bottom-0 p-0">
              <h5
                id="student-analysis-rules-modal-title"
                class="modal-title my-color-black"
              >
                分析規則
              </h5>
              <button
                type="button"
                class="btn-close"
                aria-label="關閉"
                @click="closeRulesModal"
              />
            </div>
            <div class="modal-body p-0 lh-base" style="max-height: 70vh; overflow: auto;">
              <div
                v-if="analysisRulesModalLoading"
                class="my-font-md-400 my-color-gray-4"
              >
                載入中…
              </div>
              <template v-else>
                <div
                  v-if="analysisRulesModalHtml"
                  class="my-markdown-rendered my-font-md-400 my-color-black text-break"
                  v-html="analysisRulesModalHtml"
                />
                <span v-else class="my-font-md-400 my-color-black">—</span>
              </template>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
    <Teleport to="body">
      <div
        v-if="editModalOpen"
        class="modal fade show d-block my-modal-backdrop"
        tabindex="-1"
        role="dialog"
        aria-modal="true"
        aria-labelledby="student-analysis-prompt-edit-modal-title"
      >
        <div
          class="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable"
          @click.stop
        >
          <div class="modal-content border-0 my-bgcolor-white p-4 d-flex flex-column gap-3">
            <div class="modal-header border-bottom-0 p-0">
              <h5
                id="student-analysis-prompt-edit-modal-title"
                class="modal-title my-color-black"
              >
                分析規則
              </h5>
              <button
                type="button"
                class="btn-close"
                aria-label="關閉"
                @click="closeEditModal"
              />
            </div>
            <div class="modal-body p-0 min-w-0">
              <EnglishExamMarkdownEditor
                v-model="editModalDraft"
                textarea-id="student-analysis-rules-edit-md"
                :disabled="editModalSavingDisabled"
                prompt-code-font
              />
            </div>
            <div
              class="modal-footer border-top-0 p-0 d-flex justify-content-end align-items-center flex-nowrap gap-2 w-100"
            >
              <button
                type="button"
                class="btn rounded-pill d-inline-flex justify-content-center align-items-center my-font-md-400 my-color-gray-1 my-button-transparent-borderless px-4 py-2"
                title="還原為上次載入或儲存後的內容"
                aria-label="重設"
                :disabled="editModalResetDisabled"
                @click="resetEditModalDraft"
              >
                重設
              </button>
              <button
                type="button"
                class="btn rounded-pill d-flex justify-content-center align-items-center my-font-md-400 my-button-white px-4 py-2"
                :disabled="editModalSavingDisabled"
                @click="applyEditModal"
              >
                確定
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
    <header v-if="!props.hidePageHeader && !props.design3" class="flex-shrink-0 my-bgcolor-gray-4 p-4">
      <div class="container-fluid px-0 text-center">
        <p class="my-font-xl-400 my-color-black text-break mb-0">學生作答分析</p>
      </div>
    </header>
    <div v-if="error" class="flex-shrink-0">
      <div class="my-alert-warning-soft my-font-sm-400 py-2 mx-4 mb-3">
        {{ error }}
      </div>
    </div>

    <div class="flex-grow-1 overflow-auto d-flex flex-column min-h-0" :class="props.design3 ? 'my-bgcolor-white' : 'my-bgcolor-gray-4'">
      <div class="container-fluid px-3 px-md-4 py-4">
        <div class="row justify-content-center">
          <div :class="props.design3 ? 'col-12 col-md-12 col-lg-10 col-xl-8 col-xxl-6' : 'col-12 col-lg-10 col-xl-8 col-xxl-6'">
            <div
              v-if="canEditRules"
              :class="props.design3
                ? 'w-100 min-w-0 text-start mb-0 py-4 analysis-page-3-section analysis-page-3-rules my-design--side-panel-left'
                : 'rounded-4 my-bgcolor-gray-3 p-4 w-100 min-w-0 text-start mb-4'"
            >
              <template v-if="props.design3">
                <div class="my-design-quiz-sub-block-outer">
                  <div class="my-design-quiz-sub-block my-design-quiz-sub-block--stem rounded-4 py-2">
                    <div class="w-100 min-w-0 my-design-quiz-stem-sub-block-top d-flex flex-column">
                      <div class="my-design-quiz-question-prompt-wrap px-3 pt-2 pb-0 w-100 min-w-0">
                        <section
                          class="my-design-quiz-question-prompt-block w-100 min-w-0"
                          aria-label="分析規則"
                        >
                          <header class="my-design-quiz-question-prompt-block__head">
                            <div
                              class="my-design-quiz-question-prompt-block__title-row d-flex justify-content-between align-items-center gap-2 px-3 py-2"
                            >
                              <h3
                                class="my-design-quiz-question-prompt-block__title my-font-sm-400 my-color-gray-2 mb-0"
                              >
                                分析規則
                              </h3>
                              <div class="d-flex align-items-center gap-3 flex-shrink-0">
                                <button
                                  type="button"
                                  class="btn rounded-circle d-flex justify-content-center align-items-center flex-shrink-0 my-design-quiz-question-prompt-block__edit-btn lh-1"
                                  title="編輯分析規則"
                                  aria-label="編輯分析規則"
                                  :disabled="editModalSavingDisabled"
                                  @click="openEditModal"
                                >
                                  <i class="fa-solid fa-pen" aria-hidden="true" />
                                </button>
                              </div>
                            </div>
                          </header>
                          <div class="my-design-quiz-question-prompt-block__content min-w-0 w-100">
                            <EnglishExamMarkdownEditor
                              :model-value="promptText"
                              preview-only
                              preview-design-dark
                              preview-design-dark-embedded
                              textarea-id="student-analysis-rules-preview"
                              :disabled="editModalSavingDisabled"
                            />
                          </div>
                        </section>
                      </div>
                      <div
                        class="my-design-quiz-generate-action-row d-flex justify-content-start align-items-center flex-wrap gap-2 px-3 py-2"
                      >
                        <LogoGradientPillButton
                          v-if="canStartFromSavedRules"
                          id-prefix="student-analysis-start"
                          tone="generate"
                          gradient-bias="work3"
                          extra-class="my-design-quiz-generate-btn"
                          title="使用後端已儲存之分析規則開始分析；若已修改分析規則請先按「儲存並開始分析」，或於編輯 Modal 內重設"
                          aria-label="開始分析"
                          :aria-busy="loading || promptSaving"
                          @click="fetchAnalysisOnly"
                        >
                          開始分析
                        </LogoGradientPillButton>
                        <LogoGradientPillButton
                          v-if="canSaveAndStart"
                          id-prefix="student-analysis-save-start"
                          tone="generate"
                          gradient-bias="work3"
                          extra-class="my-design-quiz-generate-btn"
                          title="儲存分析規則並開始分析"
                          aria-label="儲存並開始分析"
                          :aria-busy="loading || promptSaving"
                          @click="startAnalysisFromRulesEditor"
                        >
                          儲存並開始分析
                        </LogoGradientPillButton>
                        <LogoGradientPillButton
                          v-if="!canStartFromSavedRules && !canSaveAndStart"
                          id-prefix="student-analysis-save-start-disabled"
                          tone="generate"
                          gradient-bias="work3"
                          extra-class="my-design-quiz-generate-btn"
                          aria-label="儲存並開始分析"
                          disabled
                        >
                          儲存並開始分析
                        </LogoGradientPillButton>
                      </div>
                    </div>
                  </div>
                </div>
              </template>
              <template v-else>
                <div class="d-flex flex-column gap-0 min-w-0 w-100 mb-3">
                  <label
                    class="form-label my-color-gray-1 flex-shrink-0 my-font-sm-400 mb-0"
                    for="student-analysis-report-rules-md"
                  >分析規則</label>
                  <EnglishExamMarkdownEditor
                    v-model="promptText"
                    textarea-id="student-analysis-report-rules-md"
                    placeholder=""
                    :disabled="promptSectionLoading || loading || promptSaving"
                  />
                </div>
                <div class="d-flex justify-content-center flex-wrap gap-3 pt-2">
                  <button
                    type="button"
                    class="btn rounded-pill my-font-md-400 px-4 py-2 my-btn-outline-gray-1"
                    title="還原為上次載入或儲存後的內容"
                    aria-label="重設分析規則"
                    :disabled="promptSectionLoading || loading || promptSaving || !promptDirty"
                    @click="resetPromptToBaseline"
                  >
                    重設
                  </button>
                  <button
                    type="button"
                    class="btn rounded-pill my-font-md-400 px-4 py-2 my-button-black"
                    title="儲存規則（若有修改）並開始分析"
                    aria-label="儲存並開始分析"
                    :disabled="promptSectionLoading || loading || promptSaving || !authStore.user?.person_id || !hasSelectedCourse()"
                    :aria-busy="loading || promptSaving"
                    @click="startAnalysisFromRulesEditor"
                  >
                    儲存並開始分析
                  </button>
                </div>
              </template>
            </div>

            <!-- 非開發者／管理者：無編輯區時由此啟動分析 -->
            <div
              v-if="!canEditRules"
              :class="props.design3
                ? 'd-flex justify-content-start align-items-center w-100 py-4 analysis-page-3-section'
                : 'd-flex justify-content-center align-items-center w-100 py-2 px-2 mb-4'"
            >
              <button
                type="button"
                :class="['btn rounded-pill d-flex justify-content-center align-items-center gap-2 my-font-md-400 px-4 py-3', props.design3 ? 'my-button-white' : 'my-button-gray-3']"
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
                  <div
                    v-if="weaknessReport"
                    :class="props.design3
                      ? 'w-100 min-w-0 d-flex flex-column gap-4 text-start py-4 analysis-page-3-section'
                      : 'rounded-4 my-bgcolor-gray-3 p-4 w-100 min-w-0 d-flex flex-column gap-4 text-start'"
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
                    <div
                      v-if="analysisRulesSnapshotTrimmed && props.design3 && !canEditRules"
                      class="w-100 min-w-0 pt-3 analysis-page-3-rules my-design--side-panel-left"
                    >
                      <div class="my-design-quiz-question-prompt-wrap w-100 min-w-0">
                        <section
                          class="my-design-quiz-question-prompt-block w-100 min-w-0"
                          aria-label="分析規則"
                        >
                          <header class="my-design-quiz-question-prompt-block__head">
                            <div
                              class="my-design-quiz-question-prompt-block__title-row d-flex justify-content-between align-items-center gap-2 px-3 py-2"
                            >
                              <h3
                                class="my-design-quiz-question-prompt-block__title my-font-sm-400 my-color-gray-2 mb-0"
                              >
                                分析規則
                              </h3>
                            </div>
                          </header>
                          <div class="my-design-quiz-question-prompt-block__content min-w-0 w-100">
                            <EnglishExamMarkdownEditor
                              :model-value="promptText"
                              preview-only
                              preview-design-dark
                              preview-design-dark-embedded
                              textarea-id="student-analysis-rules-report-ro"
                            />
                          </div>
                        </section>
                      </div>
                    </div>
                  </div>

                  <div
                    v-for="(item, idx) in items"
                    :key="`${item.exam_quiz_id ?? item.rag_quiz_id ?? idx}-${item.person_id ?? ''}`"
                    :class="props.design3
                      ? 'w-100 min-w-0 text-start d-flex flex-column gap-3 py-4 analysis-page-3-section'
                      : 'rounded-4 my-bgcolor-gray-3 p-4 w-100 min-w-0 text-start d-flex flex-column gap-3'"
                  >
                    <div :class="props.design3 ? 'my-font-xl-400 my-color-black mb-0' : 'my-font-lg-600 my-color-black mb-0'">第 {{ idx + 1 }} 題</div>
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

<style scoped>
.my-weakness-report-md :deep(p) {
  margin-bottom: 0.5em;
}
.my-weakness-report-md :deep(p:last-child) {
  margin-bottom: 0;
}
.my-weakness-report-md :deep(h1),
.my-weakness-report-md :deep(h2),
.my-weakness-report-md :deep(h3),
.my-weakness-report-md :deep(h4),
.my-weakness-report-md :deep(h5),
.my-weakness-report-md :deep(h6) {
  color: var(--my-color-black);
  font-size: var(--my-font-size-md);
  font-weight: var(--my-font-weight-semibold);
  margin-bottom: 0.35em;
  margin-top: 0.5em;
}
.my-weakness-report-md :deep(h1:first-child),
.my-weakness-report-md :deep(h2:first-child),
.my-weakness-report-md :deep(h3:first-child) {
  margin-top: 0;
}
.my-weakness-report-md--section-title :deep(p),
.my-weakness-report-md--section-title :deep(h1),
.my-weakness-report-md--section-title :deep(h2),
.my-weakness-report-md--section-title :deep(h3),
.my-weakness-report-md--section-title :deep(h4),
.my-weakness-report-md--section-title :deep(h5),
.my-weakness-report-md--section-title :deep(h6),
.my-weakness-report-md--section-title :deep(li),
.my-weakness-report-md--section-title :deep(strong),
.my-weakness-report-md--section-title :deep(em) {
  color: var(--my-color-gray-1);
}
.my-weakness-report-md :deep(ul),
.my-weakness-report-md :deep(ol) {
  margin-bottom: 0.5em;
  padding-left: 1.25rem;
}
.my-weakness-report-md :deep(li) {
  margin-bottom: 0.15em;
}
.my-weakness-report-md :deep(a) {
  color: var(--my-color-blue);
}
.my-weakness-report-md :deep(code) {
  font-size: 0.92em;
  padding: 0.1em 0.35em;
  border-radius: 0.25rem;
  background-color: color-mix(in srgb, var(--my-color-black) 6%, var(--my-color-white));
}
.my-weakness-report-md :deep(pre) {
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  background-color: var(--my-color-gray-3);
  overflow-x: auto;
  margin-bottom: 0.5em;
}
.my-weakness-report-md :deep(pre code) {
  padding: 0;
  background: none;
}
.my-weakness-report-md :deep(blockquote) {
  margin: 0 0 0.5em;
  padding-left: 0.75rem;
  border-left: 3px solid var(--my-color-gray-2);
  color: var(--my-color-gray-1);
}
.my-weakness-report-md :deep(table) {
  width: 100%;
  margin-bottom: 0.5em;
  border-collapse: collapse;
  font-size: inherit;
}
.my-weakness-report-md :deep(th),
.my-weakness-report-md :deep(td) {
  border: 1px solid var(--my-color-gray-2);
  padding: 0.35rem 0.5rem;
  text-align: start;
}
.my-weakness-report-md :deep(hr) {
  margin: 0.75em 0;
  border: 0;
  border-top: 1px solid var(--my-color-gray-2);
}
.my-weakness-report-md-list > li :deep(p:last-child) {
  margin-bottom: 0;
}
</style>
