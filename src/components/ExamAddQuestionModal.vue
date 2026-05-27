<script setup>
/**
 * ExamAddQuestionModal — 新增題目前先選單元與題型
 *
 * Props:
 *   modelValue       Boolean  是否顯示
 *   submitting       Boolean  父層建立題列中
 *   blocked          Boolean  試卷題庫載入中（停用產生題目）
 *   error            String   錯誤訊息
 *   unitOptions      Array    單元下拉選項
 *   unitSelectValue  Function 選項 value
 *   unitOptionLabel  Function 選項顯示文字
 *   quizOptionsForUnit Function(unitSelectId) → 題型選項
 *   quizPickSelectValue Function 題型選項 value
 *   quizOptionLabel  Function 題型顯示文字
 *   quizOptionFollowUp Function 題型是否顯示「追問」tag（可選）
 *
 * Emits:
 *   update:modelValue
 *   confirm  { examUnitSelectId, examQuizNamePick }
 */
import { ref, watch, computed } from 'vue';
import UnitSelectDropdown from './UnitSelectDropdown.vue';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  submitting: { type: Boolean, default: false },
  blocked: { type: Boolean, default: false },
  error: { type: String, default: '' },
  unitOptions: { type: Array, default: () => [] },
  unitSelectValue: { type: Function, required: true },
  unitOptionLabel: { type: Function, required: true },
  quizOptionsForUnit: { type: Function, required: true },
  quizPickSelectValue: { type: Function, required: true },
  quizOptionLabel: { type: Function, required: true },
  quizOptionFollowUp: { type: Function, default: null },
  /** 確認按鈕文字（exam_3 為「開始出題」） */
  confirmButtonLabel: { type: String, default: '產生題目' },
});

const emit = defineEmits(['update:modelValue', 'confirm']);

const localUnitId = ref('');
const localQuizPick = ref('');

const quizOptions = computed(() => {
  const fn = props.quizOptionsForUnit;
  if (typeof fn !== 'function') return [];
  return fn(String(localUnitId.value ?? '').trim()) ?? [];
});

const confirmDisabled = computed(() => {
  if (props.submitting || props.blocked) return true;
  if (props.unitOptions.length === 0) return true;
  if (!String(localUnitId.value ?? '').trim()) return true;
  if (quizOptions.value.length === 0) return true;
  if (!String(localQuizPick.value ?? '').trim()) return true;
  return false;
});

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      localUnitId.value = '';
      localQuizPick.value = '';
    }
  },
);

watch(localUnitId, () => {
  localQuizPick.value = '';
});

function close() {
  if (props.submitting) return;
  emit('update:modelValue', false);
}

function onConfirm() {
  if (confirmDisabled.value) return;
  emit('confirm', {
    examUnitSelectId: String(localUnitId.value ?? '').trim(),
    examQuizNamePick: String(localQuizPick.value ?? '').trim(),
  });
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="modal fade show d-block my-modal-backdrop"
      tabindex="-1"
      role="dialog"
      aria-modal="true"
      aria-labelledby="exam-add-question-modal-title"
    >
      <div
        class="modal-dialog modal-dialog-centered modal-lg exam-add-question-modal-dialog"
        @click.stop
      >
        <div class="modal-content border-0 my-bgcolor-gray-3 p-4 d-flex flex-column gap-3 exam-add-question-modal-content">
          <div class="modal-header border-bottom-0 p-0">
            <h5 id="exam-add-question-modal-title" class="modal-title my-color-black">新增題目</h5>
            <button
              type="button"
              class="btn-close"
              :disabled="submitting"
              aria-label="關閉"
              @click="close"
            />
          </div>
          <div class="modal-body p-0 d-flex flex-column gap-3">
            <div class="d-flex flex-row flex-nowrap w-100 min-w-0 align-items-start gap-3">
              <div class="min-w-0 flex-grow-1" style="flex-basis: 0">
                <div class="d-flex flex-column gap-0 w-100 min-w-0">
                  <label
                    class="my-color-gray-1 my-font-sm-400 mb-0 d-block"
                    for="exam-add-question-unit-toggle"
                  >選擇單元</label>
                  <UnitSelectDropdown
                    v-model="localUnitId"
                    in-modal
                    :options="unitOptions"
                    :option-value="unitSelectValue"
                    :option-label="unitOptionLabel"
                    placeholder="— 請選擇單元 —"
                    menu-id="exam-add-question-unit"
                    :disabled="submitting || blocked || unitOptions.length === 0"
                    :hint-when-disabled="blocked ? '試卷題庫載入中…' : unitOptions.length === 0 ? '尚無可選單元' : ''"
                    omit-empty-choice
                  />
                </div>
              </div>
              <div class="min-w-0 flex-grow-1" style="flex-basis: 0">
                <div class="d-flex flex-column gap-0 w-100 min-w-0">
                  <label
                    class="my-color-gray-1 my-font-sm-400 mb-0 d-block"
                    for="exam-add-question-quiz-toggle"
                  >選擇題型</label>
                  <UnitSelectDropdown
                    v-model="localQuizPick"
                    in-modal
                    :options="quizOptions"
                    :option-value="quizPickSelectValue"
                    :option-label="quizOptionLabel"
                    :option-follow-up="quizOptionFollowUp"
                    placeholder="— 請選擇題型 —"
                    menu-id="exam-add-question-quiz"
                    :disabled="submitting || blocked || !String(localUnitId ?? '').trim() || quizOptions.length === 0"
                    :hint-when-disabled="
                      blocked
                        ? '試卷題庫載入中…'
                        : !String(localUnitId ?? '').trim()
                          ? '請先選擇單元'
                          : quizOptions.length === 0
                            ? '此單元尚無題型'
                            : ''
                    "
                    omit-empty-choice
                  />
                </div>
              </div>
            </div>
            <div v-if="error" class="my-color-red my-font-sm-400">{{ error }}</div>
          </div>
          <div class="modal-footer border-top-0 p-0 d-flex flex-wrap justify-content-end gap-2">
            <button
              type="button"
              class="btn rounded-pill d-flex justify-content-center align-items-center my-font-md-400 my-button-transparent-borderless px-4 py-2"
              :disabled="submitting"
              @click="close"
            >
              取消
            </button>
            <button
              type="button"
              class="btn rounded-pill d-flex justify-content-center align-items-center gap-2 my-font-md-400 my-button-black px-4 py-2"
              :disabled="confirmDisabled"
              :aria-busy="submitting"
              :aria-label="confirmButtonLabel"
              @click="onConfirm"
            >
              {{ confirmButtonLabel }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* Modal 內 Bootstrap 下拉：避免選單被裁切，樣式仍用 UnitSelectDropdown */
.exam-add-question-modal-dialog,
.exam-add-question-modal-content {
  overflow: visible;
}
:deep(.my-design-08-dropdown) {
  position: relative;
}
:deep(.my-unit-select-dd-menu) {
  z-index: 2000;
}
</style>
