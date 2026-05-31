<script setup>
/**
 * 主畫面 JSON 檢視 Modal（與 ExamDetailPage／CreateExamQuizBankDetailPage 詳細資訊之 JSON 分頁相同資料）
 */
import JsonTreeViewer from './JsonTreeViewer.vue';

defineProps({
  open: { type: Boolean, required: true },
  title: { type: String, default: 'JSON資料' },
  data: { default: null },
  confirmButtonClass: { type: String, default: 'my-button-black' },
});

const emit = defineEmits(['close']);

function onBackdropClick() {
  emit('close');
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="modal fade show d-block my-modal-backdrop"
      tabindex="-1"
      role="dialog"
      aria-modal="true"
      aria-labelledby="main-page-json-modal-title"
      @click.self="onBackdropClick"
    >
      <div
        class="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable"
        @click.stop
      >
        <div class="modal-content border-0 my-bgcolor-white p-4 d-flex flex-column gap-3">
          <div class="modal-header border-bottom-0 p-0">
            <h5
              id="main-page-json-modal-title"
              class="modal-title my-color-black text-break mb-0"
            >{{ title }}</h5>
            <button
              type="button"
              class="btn-close flex-shrink-0"
              aria-label="關閉"
              @click="emit('close')"
            />
          </div>
          <div
            class="modal-body p-0 min-w-0"
            style="max-height: 70vh; overflow: auto;"
            role="region"
            aria-label="JSON資料"
          >
            <JsonTreeViewer
              :data="data"
              :default-expand-depth="1"
            />
          </div>
          <div class="modal-footer border-top-0 p-0 d-flex justify-content-end w-100">
            <button
              type="button"
              class="btn rounded-pill d-flex justify-content-center align-items-center my-font-md-400 px-4 py-2"
              :class="confirmButtonClass"
              @click="emit('close')"
            >
              關閉
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
