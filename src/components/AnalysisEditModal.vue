<script setup>
/**
 * AnalysisEditModal — 編輯分析規則 Modal
 *
 * 以 Markdown Editor 修改分析規則，提供重設（還原）、取消與確定（儲存並關閉）按鈕。
 * 用於 AnswerWeaknessAnalysisPage 與 StudentAnswerAnalysisPage。
 */
import EnglishExamMarkdownEditor from './EnglishExamMarkdownEditor.vue';

defineProps({
  open:           { type: Boolean, required: true },
  /** modal h5 的 id，供 aria-labelledby 使用 */
  titleId:        { type: String,  required: true },
  /** EnglishExamMarkdownEditor 的 textarea id */
  textareaId:     { type: String,  required: true },
  /** 草稿內容（v-model） */
  modelValue:     { type: String,  default: '' },
  savingDisabled: { type: Boolean, default: false },
  resetDisabled:  { type: Boolean, default: false },
});

defineEmits(['update:modelValue', 'reset', 'apply', 'close']);
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="modal fade show d-block my-modal-backdrop"
      tabindex="-1"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
    >
      <div class="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable" @click.stop>
        <div class="modal-content border-0 my-bgcolor-white p-4 d-flex flex-column gap-3">
          <div class="modal-header border-bottom-0 p-0">
            <h5 :id="titleId" class="modal-title my-color-black">分析規則</h5>
            <button type="button" class="btn-close" aria-label="關閉" @click="$emit('close')" />
          </div>

          <div class="modal-body p-0 min-w-0">
            <EnglishExamMarkdownEditor
              :model-value="modelValue"
              :textarea-id="textareaId"
              :disabled="savingDisabled"
              prompt-code-font
              edit-design-dark
              @update:model-value="$emit('update:modelValue', $event)"
            />
          </div>

          <div class="modal-footer border-top-0 p-0 d-flex justify-content-end align-items-center flex-nowrap gap-2 w-100">
            <button
              type="button"
              class="btn rounded-pill d-inline-flex justify-content-center align-items-center my-font-md-400 my-color-gray-1 my-button-transparent-borderless px-4 py-2"
              title="還原為上次載入或儲存後的內容"
              aria-label="重設"
              :disabled="resetDisabled"
              @click="$emit('reset')"
            >
              重設
            </button>
            <button
              type="button"
              class="btn rounded-pill d-inline-flex justify-content-center align-items-center my-font-md-400 my-color-gray-4 my-button-transparent-borderless px-4 py-2"
              aria-label="取消"
              @click="$emit('close')"
            >
              取消
            </button>
            <button
              type="button"
              class="btn rounded-pill d-flex justify-content-center align-items-center my-font-md-400 my-button-white px-4 py-2"
              :disabled="savingDisabled"
              @click="$emit('apply')"
            >
              確定
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
