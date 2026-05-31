<script setup>
/**
 * AnalysisRulesBlock — 分析規則區塊
 *
 * 依 design3 顯示兩種版面：
 *   design3=true  → 黑底規則預覽（唯讀） + 編輯按鈕 + 開始分析按鈕（無外框／底色卡片）
 *   design3=false → 可直接編輯的 Markdown Editor + 重設/儲存按鈕
 *
 * idPrefix 用於產生各元素唯一 id，避免兩個分析頁同時在 DOM 中時 id 衝突。
 * 用於 AnswerWeaknessAnalysisPage 與 StudentAnswerAnalysisPage。
 */
import EnglishExamMarkdownEditor from './EnglishExamMarkdownEditor.vue';
import LogoGradientPillButton from './LogoGradientPillButton.vue';

const props = defineProps({
  design3:              { type: Boolean, default: false },
  /** id 前綴，e.g. "weakness-analysis" 或 "student-analysis" */
  idPrefix:             { type: String,  required: true },
  /** 分析規則文字（v-model） */
  modelValue:           { type: String,  default: '' },
  editModalSavingDisabled: { type: Boolean, default: false },
  promptSectionLoading: { type: Boolean, default: false },
  loading:              { type: Boolean, default: false },
  promptSaving:         { type: Boolean, default: false },
  promptDirty:          { type: Boolean, default: false },
  canStartFromSavedRules: { type: Boolean, default: false },
  canSaveAndStart:      { type: Boolean, default: false },
  /** 非 design3 時「儲存規則並開始分析」的額外啟用條件（已登入且已選課） */
  canStart:             { type: Boolean, default: false },
});

defineEmits(['update:modelValue', 'open-edit-modal', 'fetch-analysis-only', 'start-analysis', 'reset-prompt']);
</script>

<template>
  <div
    :class="props.design3
      ? 'w-100 min-w-0 text-start mb-0 py-4'
      : 'rounded-4 my-bgcolor-gray-4 p-4 w-100 min-w-0 text-start mb-4'"
  >
    <!-- ── design3：規則預覽 + 動作按鈕（對齊 exam／create-exam-bank 出題規則，無 stem 外框） ── -->
    <template v-if="props.design3">
      <div class="my-design-quiz-question-prompt-wrap w-100 min-w-0">
        <section class="my-design-quiz-question-prompt-block w-100 min-w-0" aria-label="分析規則">
          <header class="my-design-quiz-question-prompt-block__head">
            <div class="my-design-quiz-question-prompt-block__title-row d-flex justify-content-between align-items-center gap-2 px-3 py-2">
              <h3 class="my-design-quiz-question-prompt-block__title my-font-sm-400 my-color-gray-3 mb-0">
                分析規則
              </h3>
              <button
                type="button"
                class="btn rounded-circle d-flex justify-content-center align-items-center flex-shrink-0 my-design-quiz-question-prompt-block__edit-btn lh-1"
                title="編輯分析規則"
                aria-label="編輯分析規則"
                :disabled="props.editModalSavingDisabled"
                @click="$emit('open-edit-modal')"
              >
                <i class="fa-solid fa-pen" aria-hidden="true" />
              </button>
            </div>
          </header>
          <div class="my-design-quiz-question-prompt-block__content min-w-0 w-100">
            <EnglishExamMarkdownEditor
              :model-value="props.modelValue"
              :textarea-id="`${props.idPrefix}-rules-preview`"
              :disabled="props.editModalSavingDisabled"
              preview-only
              preview-design-dark
              preview-design-dark-embedded
            />
          </div>
        </section>
      </div>

      <div class="my-design-quiz-generate-action-row d-flex justify-content-start align-items-center flex-wrap gap-2 pb-3">
        <LogoGradientPillButton
          v-if="props.canStartFromSavedRules"
          :id-prefix="`${props.idPrefix}-start`"
          tone="generate"
          gradient-bias="work3"
          extra-class="my-design-quiz-generate-btn"
          title="使用後端已儲存之分析規則開始分析；若已修改分析規則請先按「儲存規則並開始分析」"
          aria-label="開始分析"
          :aria-busy="props.loading || props.promptSaving"
          @click="$emit('fetch-analysis-only')"
        >
          開始分析
        </LogoGradientPillButton>
        <LogoGradientPillButton
          v-if="props.canSaveAndStart"
          :id-prefix="`${props.idPrefix}-save-start`"
          tone="generate"
          gradient-bias="work3"
          extra-class="my-design-quiz-generate-btn"
          title="儲存分析規則並開始分析"
          aria-label="儲存規則並開始分析"
          :aria-busy="props.loading || props.promptSaving"
          @click="$emit('start-analysis')"
        >
          儲存規則並開始分析
        </LogoGradientPillButton>
        <LogoGradientPillButton
          v-if="!props.canStartFromSavedRules && !props.canSaveAndStart"
          :id-prefix="`${props.idPrefix}-save-start-disabled`"
          tone="generate"
          gradient-bias="work3"
          extra-class="my-design-quiz-generate-btn"
          aria-label="儲存規則並開始分析"
          disabled
        >
          儲存規則並開始分析
        </LogoGradientPillButton>
      </div>
    </template>

    <!-- ── 舊版：可直接編輯的 Markdown Editor ── -->
    <template v-else>
      <div class="d-flex flex-column gap-0 min-w-0 w-100 mb-3">
        <label
          class="form-label my-color-gray-1 flex-shrink-0 my-font-sm-400 mb-0"
          :for="`${props.idPrefix}-report-rules-md`"
        >分析規則</label>
        <EnglishExamMarkdownEditor
          :model-value="props.modelValue"
          :textarea-id="`${props.idPrefix}-report-rules-md`"
          placeholder=""
          :disabled="props.promptSectionLoading || props.loading || props.promptSaving"
          @update:model-value="$emit('update:modelValue', $event)"
        />
      </div>
      <div class="d-flex justify-content-center flex-wrap gap-3 pt-2">
        <button
          type="button"
          class="btn rounded-pill my-font-md-400 px-4 py-2 my-btn-outline-gray-1"
          title="還原為上次載入或儲存後的內容"
          aria-label="重設分析規則"
          :disabled="props.promptSectionLoading || props.loading || props.promptSaving || !props.promptDirty"
          @click="$emit('reset-prompt')"
        >
          重設
        </button>
        <button
          type="button"
          class="btn rounded-pill my-font-md-400 px-4 py-2 my-button-black"
          title="儲存規則（若有修改）並開始分析"
          aria-label="儲存規則並開始分析"
          :disabled="props.promptSectionLoading || props.loading || props.promptSaving || !props.canStart"
          :aria-busy="props.loading || props.promptSaving"
          @click="$emit('start-analysis')"
        >
          儲存規則並開始分析
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped src="../assets/css/design-quiz-shared.css"></style>
