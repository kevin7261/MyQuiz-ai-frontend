<script setup>
/**
 * MessageModal — 單一「確定」訊息 Modal（列表／建立／操作失敗等；取代頁面 inline alert）
 */
defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: '提示' },
  message: { type: String, default: '' },
  confirmLabel: { type: String, default: '確定' },
  confirmButtonClass: { type: String, default: 'my-button-black' },
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
      aria-labelledby="message-modal-title"
      @click.self="close"
    >
      <div class="modal-dialog modal-dialog-centered" @click.stop>
        <div class="modal-content border-0 my-bgcolor-white p-4 d-flex flex-column gap-3">
          <div class="modal-header border-bottom-0 p-0">
            <h5 id="message-modal-title" class="modal-title my-color-black mb-0">
              {{ title }}
            </h5>
            <button
              type="button"
              class="btn-close"
              aria-label="關閉"
              @click="close"
            />
          </div>
          <div class="modal-body p-0 min-w-0">
            <div class="my-color-red my-font-sm-400 mb-0 text-break">
              {{ message }}
            </div>
          </div>
          <div class="modal-footer border-top-0 p-0 d-flex flex-wrap justify-content-end gap-2">
            <button
              type="button"
              class="btn rounded-pill d-flex justify-content-center align-items-center my-font-md-400 px-4 py-2"
              :class="confirmButtonClass"
              @click="close"
            >
              {{ confirmLabel }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
