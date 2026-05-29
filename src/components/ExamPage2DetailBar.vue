<script setup>
defineProps({
  selectedExamLabel: { type: String, default: '' },
  detailHeaderActionsDisabled: { type: Boolean, default: false },
  gridItems: { type: Array, default: () => [] },
  selectedExamTabId: { type: String, default: '' },
  deleteExamLoading: { type: Boolean, default: false },
  /** 嵌入左側清單欄上方時使用垂直排版（exam_3） */
  inSidePanel: { type: Boolean, default: false },
  /** 返回鈕文字（左側清單欄預設「返回主頁」） */
  backLabel: { type: String, default: '返回主頁' },
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
      inSidePanel ? 'my-bgcolor-gray-4' : 'px-2 py-3 border-bottom my-bgcolor-gray-4',
      { 'exam-2-detail-bar--in-side-panel': inSidePanel },
    ]"
  >
    <template v-if="inSidePanel">
      <div class="exam-2-detail-bar__top-row d-flex align-items-start w-100 min-w-0">
        <button
          type="button"
          class="exam-2-detail-bar__back-btn exam-2-detail-bar__back-btn--in-side-panel btn d-inline-flex align-items-center gap-2 my-font-sm-400 my-color-gray-1 my-button-transparent-borderless px-3 pt-3 pb-2 flex-shrink-0"
          :aria-label="backLabel"
          :disabled="detailHeaderActionsDisabled"
          @click="emit('back')"
        >
          <i class="fa-solid fa-arrow-left exam-2-detail-bar__back-chevron flex-shrink-0" aria-hidden="true" />
          <span>{{ backLabel }}</span>
        </button>
      </div>
      <div class="exam-2-detail-bar__title-row w-100 min-w-0 px-3 pb-2">
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
          <ul class="dropdown-menu dropdown-menu-end exam-2-exam-switch-menu my-nav-switch-dropdown-menu">
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
                class="dropdown-item my-color-red d-flex align-items-center gap-2"
                :disabled="detailHeaderActionsDisabled"
                :aria-busy="deleteExamLoading"
                @click="emit('delete-exam')"
              >
                <i class="fa-solid fa-xmark flex-shrink-0" aria-hidden="true" />
                <span>刪除此試卷</span>
              </button>
            </li>
          </ul>
        </div>
      </div>
    </template>
  </header>
</template>
