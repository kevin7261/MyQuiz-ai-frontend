<script setup>
/**
 * QuizHistoryModal — 「先前出題」共用 Modal
 */
import QuizHistoryPanel from './QuizHistoryPanel.vue';

defineProps({
  modelValue: { type: Boolean, default: false },
  unitLabel: { type: String, default: '—' },
  quizTypeLabel: { type: String, default: '—' },
  isFollowup: { type: Boolean, default: false },
  historyList: { type: Array, default: () => [] },
  titleId: { type: String, default: 'quiz-history-modal-title' },
});

const emit = defineEmits(['update:modelValue']);

function close() {
  emit('update:modelValue', false);
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
      :aria-labelledby="titleId"
      @click.self="close"
    >
      <div
        class="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable"
        @click.stop
      >
        <div class="modal-content border-0 my-bgcolor-white p-4 d-flex flex-column gap-3">
          <div class="modal-header border-bottom-0 p-0">
            <h5 :id="titleId" class="modal-title my-color-black">
              先前出題
            </h5>
            <button
              type="button"
              class="btn-close"
              aria-label="關閉"
              @click="close"
            />
          </div>
          <div class="modal-body p-0">
            <QuizHistoryPanel
              :unit-label="unitLabel"
              :quiz-type-label="quizTypeLabel"
              :is-followup="isFollowup"
              :history-list="historyList"
            />
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
