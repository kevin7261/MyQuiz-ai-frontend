<script setup>
defineProps({
  selectedBankLabel: { type: String, default: '' },
  detailHeaderActionsDisabled: { type: Boolean, default: false },
  gridItems: { type: Array, default: () => [] },
  selectedBankTabId: { type: String, default: '' },
  deleteRagLoading: { type: Boolean, default: false },
  /** 嵌入左側清單欄上方時使用垂直排版 */
  inSidePanel: { type: Boolean, default: false },
  /** 返回鈕文字（左側清單欄預設「返回主頁」） */
  backLabel: { type: String, default: '返回主頁' },
});

const emit = defineEmits([
  'update:selectedBankLabel',
  'back',
  'switch-bank',
  'delete-bank',
  'title-focus',
  'title-blur',
]);

function onTitleInput(e) {
  emit('update:selectedBankLabel', e.target.value);
}
</script>

<template>
  <header
    class="create-exam-bank-2-detail-bar flex-shrink-0"
    :class="[
      inSidePanel ? 'my-bgcolor-gray-4' : 'px-2 py-3 border-bottom my-bgcolor-gray-4',
      { 'create-exam-bank-2-detail-bar--in-side-panel': inSidePanel },
    ]"
  >
    <template v-if="inSidePanel">
      <div class="create-exam-bank-2-detail-bar__top-row d-flex align-items-start w-100 min-w-0">
        <button
          type="button"
          class="create-exam-bank-2-detail-bar__back-btn create-exam-bank-2-detail-bar__back-btn--in-side-panel btn d-inline-flex align-items-center gap-2 my-font-sm-400 my-color-gray-1 my-button-transparent-borderless px-3 pt-3 pb-2 flex-shrink-0"
          :aria-label="backLabel"
          :disabled="detailHeaderActionsDisabled"
          @click="emit('back')"
        >
          <i class="fa-solid fa-arrow-left create-exam-bank-2-detail-bar__back-chevron flex-shrink-0" aria-hidden="true" />
          <span>{{ backLabel }}</span>
        </button>
      </div>
      <div class="create-exam-bank-2-detail-bar__title-row w-100 min-w-0 px-3 pb-2">
        <input
          :value="selectedBankLabel"
          type="text"
          class="create-exam-bank-2-detail-bar__title my-font-lg-400 my-color-black text-truncate mb-0 text-start w-100 px-0 py-2 rounded-2"
          maxlength="200"
          autocomplete="off"
          spellcheck="false"
          aria-label="題庫名稱"
          :disabled="detailHeaderActionsDisabled"
          @input="onTitleInput"
          @focus="emit('title-focus')"
          @blur="emit('title-blur')"
          @keydown.enter.prevent="$event.target.blur()"
        />
      </div>
    </template>

    <template v-else>
      <div class="create-exam-bank-2-detail-bar__start">
        <button
          type="button"
          class="create-exam-bank-2-detail-bar__back-btn btn rounded-pill d-inline-flex align-items-center my-font-sm-400 my-color-gray-1 my-button-transparent-borderless px-0 py-1 flex-shrink-0"
          :aria-label="backLabel"
          :disabled="detailHeaderActionsDisabled"
          @click="emit('back')"
        >
          {{ backLabel }}
        </button>
      </div>
      <div class="create-exam-bank-2-detail-bar__center min-w-0">
        <input
          :value="selectedBankLabel"
          type="text"
          class="create-exam-bank-2-detail-bar__title my-font-lg-400 my-color-black text-truncate mb-0 text-center w-100 px-3 py-2 rounded-2"
          maxlength="200"
          autocomplete="off"
          spellcheck="false"
          aria-label="題庫名稱"
          :disabled="detailHeaderActionsDisabled"
          @input="onTitleInput"
          @focus="emit('title-focus')"
          @blur="emit('title-blur')"
          @keydown.enter.prevent="$event.target.blur()"
        />
      </div>
      <div class="create-exam-bank-2-detail-bar__end">
        <div class="dropdown flex-shrink-0 create-exam-bank-2-bank-switch my-design-08-dropdown">
          <button
            type="button"
            class="btn rounded-pill d-inline-flex justify-content-center align-items-center flex-shrink-0 my-font-md-400 my-button-white create-exam-bank-2-detail-bar__menu-btn lh-1 dropdown-toggle my-dropdown-caret px-3 py-2"
            data-bs-toggle="dropdown"
            aria-expanded="false"
            aria-label="題庫選單"
            :disabled="detailHeaderActionsDisabled"
          >
            <i class="fa-solid fa-bars" aria-hidden="true" />
          </button>
          <ul class="dropdown-menu dropdown-menu-end create-exam-bank-2-bank-switch-menu">
            <li v-if="gridItems.length === 0">
              <span class="dropdown-item disabled">尚無題庫</span>
            </li>
            <li v-for="item in gridItems" :key="item.tabId">
              <button
                type="button"
                class="dropdown-item"
                :class="{ active: item.tabId === selectedBankTabId }"
                @click="emit('switch-bank', item.tabId, item.label)"
              >
                <span class="d-flex align-items-center gap-2">
                  <span
                    v-if="item.isExam"
                    class="rounded-circle d-inline-block flex-shrink-0 my-bgcolor-green"
                    style="width: 0.5rem; height: 0.5rem"
                    title="試卷用題庫"
                    aria-label="試卷用題庫"
                  />
                  <span class="text-truncate">{{ item.label }}</span>
                </span>
              </button>
            </li>
            <li>
              <hr class="dropdown-divider" />
            </li>
            <li>
              <button
                type="button"
                class="dropdown-item my-color-red"
                :disabled="detailHeaderActionsDisabled"
                :aria-busy="deleteRagLoading"
                @click="emit('delete-bank')"
              >
                刪除此題庫
              </button>
            </li>
          </ul>
        </div>
      </div>
    </template>
  </header>
</template>

<style scoped>
.create-exam-bank-2-detail-bar {
  display: grid;
  grid-template-columns: 1fr minmax(0, 50%) 1fr;
  align-items: center;
  gap: 0.75rem;
  border-color: var(--my-color-gray-2) !important;
  overflow: visible;
  position: relative;
  z-index: 30;
}

.create-exam-bank-2-detail-bar--in-side-panel {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0;
}

.create-exam-bank-2-detail-bar__top-row,
.create-exam-bank-2-detail-bar__back-row {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  width: 100%;
  min-width: 0;
}

.create-exam-bank-2-detail-bar__back-btn {
  color: var(--my-color-gray-1) !important;
  background-color: transparent !important;
  font-weight: var(--my-font-weight-regular);
}

.create-exam-bank-2-detail-bar__back-chevron {
  font-size: 1em;
  line-height: 1;
}
.create-exam-bank-2-detail-bar__back-btn:hover:not(:disabled),
.create-exam-bank-2-detail-bar__back-btn:focus-visible:not(:disabled),
.create-exam-bank-2-detail-bar__back-btn:active:not(:disabled) {
  color: var(--my-color-black) !important;
  font-weight: var(--my-font-weight-semibold);
  background-color: transparent !important;
}

.create-exam-bank-2-detail-bar__title-row {
  min-width: 0;
}

.create-exam-bank-2-detail-bar__start {
  justify-self: start;
  min-width: 0;
}

.create-exam-bank-2-detail-bar__center {
  justify-self: stretch;
  width: 100%;
  min-width: 0;
}

.create-exam-bank-2-detail-bar__title {
  display: block;
  border: none;
  outline: none;
  box-shadow: none;
  background: transparent;
  margin: 0;
  font-family: inherit;
  line-height: inherit;
  appearance: none;
  -webkit-appearance: none;
  transition: background-color 0.15s ease;
}

.create-exam-bank-2-detail-bar__title:hover:not(:disabled),
.create-exam-bank-2-detail-bar__title:focus:not(:disabled) {
  background-color: var(--my-color-gray-3);
}

.create-exam-bank-2-detail-bar__title:focus {
  outline: none;
  box-shadow: none;
  border: none;
}

.create-exam-bank-2-detail-bar__title:disabled {
  opacity: 1;
  color: var(--my-color-black);
  background: transparent;
}

.create-exam-bank-2-detail-bar__end {
  justify-self: end;
  min-width: 0;
}

.create-exam-bank-2-bank-switch.my-design-08-dropdown .btn.my-button-white {
  color: var(--my-color-black);
  background-color: var(--my-color-white);
  border: 1px solid var(--my-color-gray-2);
  box-shadow: none;
}

.create-exam-bank-2-bank-switch.my-design-08-dropdown .btn.my-button-white:hover:not(:disabled),
.create-exam-bank-2-bank-switch.my-design-08-dropdown .btn.my-button-white:focus-visible:not(:disabled),
.create-exam-bank-2-bank-switch.my-design-08-dropdown .btn.my-button-white:active:not(:disabled),
.create-exam-bank-2-bank-switch.my-design-08-dropdown .btn.my-button-white.show {
  color: var(--my-color-black);
  background-color: color-mix(in srgb, var(--my-color-black) 7%, var(--my-color-white));
  border-color: color-mix(in srgb, var(--my-color-black) 18%, var(--my-color-gray-2));
}

.create-exam-bank-2-detail-bar__menu-btn {
  min-width: 2.375rem;
  min-height: 2.375rem;
}

.create-exam-bank-2-bank-switch-menu {
  min-width: 10rem;
  max-height: min(60vh, 24rem);
  overflow-x: hidden;
  overflow-y: auto;
}

.create-exam-bank-2-bank-switch-menu > li {
  display: block;
  width: 100%;
}

.create-exam-bank-2-bank-switch-menu .dropdown-item {
  width: 100%;
  white-space: nowrap;
}
</style>
