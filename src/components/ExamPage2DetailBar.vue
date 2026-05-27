<script setup>
defineProps({
  selectedExamLabel: { type: String, default: '' },
  detailHeaderActionsDisabled: { type: Boolean, default: false },
  gridItems: { type: Array, default: () => [] },
  selectedExamTabId: { type: String, default: '' },
  deleteExamLoading: { type: Boolean, default: false },
  /** 嵌入左側清單欄上方時使用垂直排版（exam_3） */
  inSidePanel: { type: Boolean, default: false },
  /** 返回鈕文字（exam_3 為「測驗」） */
  backLabel: { type: String, default: '返回主頁' },
  /** true 時文字後顯示 chevron-right icon */
  backTrailingChevron: { type: Boolean, default: false },
});

const emit = defineEmits([
  'update:selectedExamLabel',
  'back',
  'switch-exam',
  'delete-exam',
  'title-focus',
  'title-blur',
]);

function onTitleInput(e) {
  emit('update:selectedExamLabel', e.target.value);
}
</script>

<template>
  <header
    class="exam-2-detail-bar flex-shrink-0"
    :class="[
      inSidePanel ? 'p-3 my-bgcolor-gray-4' : 'px-2 py-3 border-bottom my-bgcolor-gray-4',
      { 'exam-2-detail-bar--in-side-panel': inSidePanel },
    ]"
  >
    <template v-if="inSidePanel">
      <div class="exam-2-detail-bar__top-row d-flex align-items-start w-100 min-w-0">
        <button
          type="button"
          class="exam-2-detail-bar__back-btn exam-2-detail-bar__back-btn--in-side-panel btn d-inline-flex align-items-center gap-2 my-font-sm-400 my-color-gray-1 my-button-transparent-borderless px-0 pt-0 pb-2 flex-shrink-0"
          :aria-label="backLabel"
          :disabled="detailHeaderActionsDisabled"
          @click="emit('back')"
        >
          <span>{{ backLabel }}</span>
          <i
            v-if="backTrailingChevron"
            class="fa-solid fa-chevron-right exam-2-detail-bar__back-chevron flex-shrink-0"
            aria-hidden="true"
          />
        </button>
      </div>
      <div class="exam-2-detail-bar__title-row w-100 min-w-0">
        <input
          :value="selectedExamLabel"
          type="text"
          class="exam-2-detail-bar__title my-font-lg-400 my-color-black text-truncate mb-0 text-start w-100 px-0 py-2 rounded-2"
          maxlength="200"
          autocomplete="off"
          spellcheck="false"
          aria-label="試卷名稱"
          :disabled="detailHeaderActionsDisabled"
          @input="onTitleInput"
          @focus="emit('title-focus')"
          @blur="emit('title-blur')"
          @keydown.enter.prevent="$event.target.blur()"
        />
      </div>
    </template>

    <template v-else>
      <div class="exam-2-detail-bar__start">
        <button
          type="button"
          class="exam-2-detail-bar__back-btn btn rounded-pill d-inline-flex align-items-center my-font-sm-400 my-color-gray-1 my-button-transparent-borderless px-0 py-1 flex-shrink-0"
          :aria-label="backLabel"
          :disabled="detailHeaderActionsDisabled"
          @click="emit('back')"
        >
          {{ backLabel }}
        </button>
      </div>
      <div class="exam-2-detail-bar__center min-w-0">
        <input
          :value="selectedExamLabel"
          type="text"
          class="exam-2-detail-bar__title my-font-lg-400 my-color-black text-truncate mb-0 text-center w-100 px-3 py-2 rounded-2"
          maxlength="200"
          autocomplete="off"
          spellcheck="false"
          aria-label="試卷名稱"
          :disabled="detailHeaderActionsDisabled"
          @input="onTitleInput"
          @focus="emit('title-focus')"
          @blur="emit('title-blur')"
          @keydown.enter.prevent="$event.target.blur()"
        />
      </div>
      <div class="exam-2-detail-bar__end">
        <div class="dropdown flex-shrink-0 exam-2-exam-switch">
          <button
            type="button"
            class="btn rounded-circle d-flex justify-content-center align-items-center flex-shrink-0 my-font-md-400 my-color-gray-1 my-button-transparent-borderless exam-2-detail-bar__menu-btn lh-1 dropdown-toggle my-dropdown-caret"
            data-bs-toggle="dropdown"
            aria-expanded="false"
            aria-label="試卷選單"
            :disabled="detailHeaderActionsDisabled"
          >
            <i class="fa-solid fa-bars" aria-hidden="true" />
          </button>
          <ul class="dropdown-menu dropdown-menu-end exam-2-exam-switch-menu">
            <li v-if="gridItems.length === 0">
              <span class="dropdown-item disabled">尚無測驗</span>
            </li>
            <li v-for="item in gridItems" :key="item.tabId">
              <button
                type="button"
                class="dropdown-item"
                :class="{ active: item.tabId === selectedExamTabId }"
                @click="emit('switch-exam', item.tabId, item.label)"
              >
                {{ item.label }}
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
                :aria-busy="deleteExamLoading"
                @click="emit('delete-exam')"
              >
                刪除此試卷
              </button>
            </li>
          </ul>
        </div>
      </div>
    </template>
  </header>
</template>

<style scoped>
.exam-2-detail-bar {
  display: grid;
  grid-template-columns: 1fr minmax(0, 50%) 1fr;
  align-items: center;
  gap: 0.75rem;
  border-color: var(--my-color-gray-2, #e5e5e5) !important;
  overflow: visible;
  position: relative;
  z-index: 30;
}

.exam-2-detail-bar--in-side-panel {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0;
}

.exam-2-detail-bar__top-row {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  width: 100%;
  min-width: 0;
}

.exam-2-detail-bar__back-chevron {
  font-size: 1em;
  line-height: 1;
}

.exam-2-detail-bar__back-btn {
  color: var(--my-color-gray-1) !important;
  background-color: transparent !important;
  font-weight: var(--my-font-weight-regular);
}
.exam-2-detail-bar__back-btn:hover:not(:disabled),
.exam-2-detail-bar__back-btn:focus-visible:not(:disabled),
.exam-2-detail-bar__back-btn:active:not(:disabled) {
  color: var(--my-color-black) !important;
  font-weight: var(--my-font-weight-semibold);
  background-color: transparent !important;
}

.exam-2-detail-bar__title-row {
  min-width: 0;
}

.exam-2-detail-bar__start {
  justify-self: start;
  min-width: 0;
}

.exam-2-detail-bar__center {
  justify-self: stretch;
  width: 100%;
  min-width: 0;
}

.exam-2-detail-bar__title {
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

.exam-2-detail-bar__title:hover:not(:disabled),
.exam-2-detail-bar__title:focus:not(:disabled) {
  background-color: var(--my-color-gray-3, #f5f5f5);
}

.exam-2-detail-bar__title:focus {
  outline: none;
  box-shadow: none;
  border: none;
}

.exam-2-detail-bar__title:disabled {
  opacity: 1;
  color: var(--my-color-black, #000);
  background: transparent;
}

.exam-2-detail-bar__end {
  justify-self: end;
  min-width: 0;
}

.exam-2-detail-bar__menu-btn {
  width: 2.375rem;
  height: 2.375rem;
  min-width: 2.375rem;
  min-height: 2.375rem;
  padding: 0;
}

.exam-2-exam-switch-menu {
  min-width: 10rem;
  max-height: min(60vh, 24rem);
  overflow-x: hidden;
  overflow-y: auto;
}

.exam-2-exam-switch-menu > li {
  display: block;
  width: 100%;
}

.exam-2-exam-switch-menu .dropdown-item {
  width: 100%;
  white-space: nowrap;
}
</style>
