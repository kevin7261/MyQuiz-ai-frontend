<script setup>
/**
 * ConfirmDeleteModal — 刪除確認 Modal
 *
 * Bootstrap 5 風格 Modal（半透明背景；點背景不關閉），透過 Teleport 掛至 body。
 */
defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: '刪除確認' },
  message: { type: String, default: '' },
  deleting: { type: Boolean, default: false },
  error: { type: String, default: '' },
  confirmLabel: { type: String, default: '刪除' },
});

const emit = defineEmits(['update:modelValue', 'confirm']);

function close() {
  emit('update:modelValue', false);
}

function onConfirm() {
  emit('confirm');
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
      :aria-labelledby="'confirm-delete-modal-title'"
    >
      <div class="modal-dialog modal-dialog-centered" @click.stop>
        <div class="modal-content border-0 my-bgcolor-gray-3 p-4 d-flex flex-column gap-3">
          <div class="modal-header border-bottom-0 p-0">
            <h5 id="confirm-delete-modal-title" class="modal-title my-color-black">
              {{ title }}
            </h5>
            <button
              type="button"
              class="btn-close"
              :disabled="deleting"
              aria-label="關閉"
              @click="close"
            />
          </div>
          <div class="modal-body p-0 min-w-0">
            <p class="my-font-md-400 my-color-black mb-0 text-break">
              {{ message }}
            </p>
            <div v-if="error" class="my-color-red my-font-sm-400 mt-2 text-break">
              {{ error }}
            </div>
          </div>
          <div class="modal-footer border-top-0 p-0 d-flex flex-wrap justify-content-end gap-2">
            <button
              type="button"
              class="btn rounded-pill d-flex justify-content-center align-items-center my-font-md-400 my-button-transparent-borderless px-3 py-2"
              :disabled="deleting"
              @click="close"
            >
              取消
            </button>
            <button
              type="button"
              class="btn rounded-pill d-flex justify-content-center align-items-center my-font-md-400 my-button-red px-3 py-2"
              :disabled="deleting"
              :aria-busy="deleting"
              @click="onConfirm"
            >
              {{ confirmLabel }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
